import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private readonly config;
    private readonly logger;
    private readonly resend;
    private readonly from;
    private readonly appUrl;
    constructor(config: ConfigService);
    sendWelcome(email: string, name: string, bonusCredits: number): Promise<void>;
    sendPasswordReset(email: string, name: string, token: string): Promise<void>;
    sendPasswordChanged(email: string, name: string): Promise<void>;
    sendCreditsPurchased(email: string, name: string, credits: number, amount: string): Promise<void>;
    sendVerificationCode(email: string, name: string, code: string): Promise<void>;
    sendResendVerificationCode(email: string, name: string, code: string): Promise<void>;
    private send;
}
