import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserEntity } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';
import {
  SignupDto, LoginDto, ForgotPasswordDto, ResetPasswordDto,
  VerifyEmailDto, ResendVerificationDto,
  AuthTokenResponse, UserProfileResponse, MessageResponse,
} from './dto/auth.dto';

const SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRES_HOURS = 2;
const SIGNUP_BONUS_CREDITS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
  ) {}

  async signup(dto: SignupDto): Promise<MessageResponse> {
    const existing = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('An account with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const code = this.generateVerificationCode();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15);

    const user = this.users.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
      credits: 0,           // no credits until verified
      emailVerified: false,
      verificationCode: code,
      verificationCodeExpires: expires,
    });

    await this.users.save(user);
    this.logger.log(`New user registered (pending verification): ${user.email}`);

    await this.email.sendVerificationCode(user.email, user.name, code);

    return { message: 'Account created. Check your email for a 6-digit verification code.' };
  }

  // Add verify method
  async verifyEmail(dto: VerifyEmailDto): Promise<AuthTokenResponse> {
    const user = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });

    if (!user) throw new BadRequestException('Invalid email or code');
    if (user.emailVerified) throw new BadRequestException('Email already verified');
    if (!user.verificationCode || user.verificationCode !== dto.code) {
      throw new BadRequestException('Invalid verification code');
    }
    if (!user.verificationCodeExpires || new Date() > user.verificationCodeExpires) {
      throw new BadRequestException('Verification code has expired. Request a new one.');
    }

    user.emailVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    user.credits = SIGNUP_BONUS_CREDITS;
    await this.users.save(user);

    this.logger.log(`Email verified: ${user.email} — ${SIGNUP_BONUS_CREDITS} credits added`);
    await this.email.sendWelcome(user.email, user.name, SIGNUP_BONUS_CREDITS);

    return { accessToken: this.signToken(user), user: this.toProfile(user) };
  }

  // Add resend method
  async resendVerification(dto: ResendVerificationDto): Promise<MessageResponse> {
    const user = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });

    // Always return success — don't reveal if email exists
    if (!user || user.emailVerified) {
      return { message: 'If that email exists and is unverified, a new code has been sent.' };
    }

    const code = this.generateVerificationCode();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15);

    user.verificationCode = code;
    user.verificationCodeExpires = expires;
    await this.users.save(user);

    await this.email.sendResendVerificationCode(user.email, user.name, code);
    this.logger.log(`Verification code resent: ${user.email}`);

    return { message: 'If that email exists and is unverified, a new code has been sent.' };
  }

  // Add login guard — block unverified users
  async login(dto: LoginDto): Promise<AuthTokenResponse> {
    const user = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in. Check your inbox for the 6-digit code.');
    }

    return { accessToken: this.signToken(user), user: this.toProfile(user) };
  }

  // Private helper
  private generateVerificationCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  async getMe(userId: string): Promise<UserProfileResponse> {
    const user = await this.findUserOrThrow(userId);
    return this.toProfile(user);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponse> {
    const user = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });

    // Always return success — do not reveal if email exists
    if (!user) {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + RESET_TOKEN_EXPIRES_HOURS);

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    await this.users.save(user);

    await this.email.sendPasswordReset(user.email, user.name, token);
    this.logger.log(`Password reset requested for: ${user.email}`);

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponse> {
    const user = await this.users.findOne({
      where: { resetPasswordToken: dto.token },
    });

    if (!user || !user.resetPasswordExpires) {
      throw new BadRequestException('Reset token is invalid or has expired');
    }

    if (new Date() > user.resetPasswordExpires) {
      throw new BadRequestException('Reset token has expired. Please request a new one.');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.users.save(user);

    await this.email.sendPasswordChanged(user.email, user.name);
    this.logger.log(`Password reset completed for: ${user.email}`);

    return { message: 'Password updated successfully. You can now log in.' };
  }

  async findUserOrThrow(userId: string): Promise<UserEntity> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private signToken(user: UserEntity): string {
    return this.jwt.sign({ sub: user.id, email: user.email });
  }

  toProfile(user: UserEntity): UserProfileResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      credits: user.credits,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
