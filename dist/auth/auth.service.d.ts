import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';
import { SignupDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, ResendVerificationDto, AuthTokenResponse, UserProfileResponse, MessageResponse } from './dto/auth.dto';
export declare class AuthService {
    private readonly users;
    private readonly jwt;
    private readonly email;
    private readonly logger;
    constructor(users: Repository<UserEntity>, jwt: JwtService, email: EmailService);
    signup(dto: SignupDto): Promise<MessageResponse>;
    verifyEmail(dto: VerifyEmailDto): Promise<AuthTokenResponse>;
    resendVerification(dto: ResendVerificationDto): Promise<MessageResponse>;
    login(dto: LoginDto): Promise<AuthTokenResponse>;
    private generateVerificationCode;
    getMe(userId: string): Promise<UserProfileResponse>;
    forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponse>;
    resetPassword(dto: ResetPasswordDto): Promise<MessageResponse>;
    findUserOrThrow(userId: string): Promise<UserEntity>;
    private signToken;
    toProfile(user: UserEntity): UserProfileResponse;
}
