"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const user_entity_1 = require("../users/entities/user.entity");
const email_service_1 = require("../email/email.service");
const SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRES_HOURS = 2;
const SIGNUP_BONUS_CREDITS = 10;
let AuthService = AuthService_1 = class AuthService {
    constructor(users, jwt, email) {
        this.users = users;
        this.jwt = jwt;
        this.email = email;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async signup(dto) {
        const existing = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
        if (existing)
            throw new common_1.ConflictException('An account with this email already exists');
        const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
        const code = this.generateVerificationCode();
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 15);
        const user = this.users.create({
            name: dto.name,
            email: dto.email.toLowerCase(),
            passwordHash,
            credits: 0,
            emailVerified: false,
            verificationCode: code,
            verificationCodeExpires: expires,
        });
        await this.users.save(user);
        this.logger.log(`New user registered (pending verification): ${user.email}`);
        await this.email.sendVerificationCode(user.email, user.name, code);
        return { message: 'Account created. Check your email for a 6-digit verification code.' };
    }
    async verifyEmail(dto) {
        const user = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
        if (!user)
            throw new common_1.BadRequestException('Invalid email or code');
        if (user.emailVerified)
            throw new common_1.BadRequestException('Email already verified');
        if (!user.verificationCode || user.verificationCode !== dto.code) {
            throw new common_1.BadRequestException('Invalid verification code');
        }
        if (!user.verificationCodeExpires || new Date() > user.verificationCodeExpires) {
            throw new common_1.BadRequestException('Verification code has expired. Request a new one.');
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
    async resendVerification(dto) {
        const user = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
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
    async login(dto) {
        const user = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid email or password');
        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid email or password');
        if (!user.emailVerified) {
            throw new common_1.UnauthorizedException('Please verify your email before logging in. Check your inbox for the 6-digit code.');
        }
        return { accessToken: this.signToken(user), user: this.toProfile(user) };
    }
    generateVerificationCode() {
        return crypto.randomInt(100000, 999999).toString();
    }
    async getMe(userId) {
        const user = await this.findUserOrThrow(userId);
        return this.toProfile(user);
    }
    async forgotPassword(dto) {
        const user = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
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
    async resetPassword(dto) {
        const user = await this.users.findOne({
            where: { resetPasswordToken: dto.token },
        });
        if (!user || !user.resetPasswordExpires) {
            throw new common_1.BadRequestException('Reset token is invalid or has expired');
        }
        if (new Date() > user.resetPasswordExpires) {
            throw new common_1.BadRequestException('Reset token has expired. Please request a new one.');
        }
        user.passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await this.users.save(user);
        await this.email.sendPasswordChanged(user.email, user.name);
        this.logger.log(`Password reset completed for: ${user.email}`);
        return { message: 'Password updated successfully. You can now log in.' };
    }
    async findUserOrThrow(userId) {
        const user = await this.users.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    signToken(user) {
        return this.jwt.sign({ sub: user.id, email: user.email });
    }
    toProfile(user) {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            credits: user.credits,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.UserEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map