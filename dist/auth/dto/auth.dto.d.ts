export declare class SignupDto {
    name: string;
    email: string;
    password: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class ForgotPasswordDto {
    email: string;
}
export declare class ResetPasswordDto {
    token: string;
    newPassword: string;
}
export declare class UserProfileResponse {
    id: string;
    email: string;
    name: string;
    credits: number;
    emailVerified: boolean;
    createdAt: Date;
}
export declare class AuthTokenResponse {
    accessToken: string;
    user: UserProfileResponse;
}
export declare class MessageResponse {
    message: string;
}
export declare class VerifyEmailDto {
    email: string;
    code: string;
}
export declare class ResendVerificationDto {
    email: string;
}
