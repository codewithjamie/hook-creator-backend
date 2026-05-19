import { AuthService } from './auth.service';
import { SignupDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, AuthTokenResponse, UserProfileResponse, MessageResponse } from './dto/auth.dto';
import { VerifyEmailDto, ResendVerificationDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signup(dto: SignupDto): Promise<MessageResponse>;
    verifyEmail(dto: VerifyEmailDto): Promise<AuthTokenResponse>;
    resendVerification(dto: ResendVerificationDto): Promise<MessageResponse>;
    login(dto: LoginDto): Promise<AuthTokenResponse>;
    getMe(req: {
        user: {
            id: string;
        };
    }): Promise<UserProfileResponse>;
    forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponse>;
    resetPassword(dto: ResetPasswordDto): Promise<MessageResponse>;
}
