import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient, BrevoEnvironment } from '@getbrevo/brevo';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly client: InstanceType<typeof BrevoClient>;
  private readonly fromName: string;
  private readonly fromAddress: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
     this.client = new BrevoClient({
      apiKey: config.getOrThrow<string>('BREVO_API_KEY'),
      environment: BrevoEnvironment.Default,
    });
    this.fromName = config.get<string>('EMAIL_FROM_NAME', 'OpenEdge');
    this.fromAddress = config.get<string>('EMAIL_FROM_ADDRESS', 'noreply@yourdomain.com');
    this.appUrl = config.get<string>('APP_URL', 'http://localhost:3000');
  }

  async sendVerificationCode(email: string, name: string, code: string): Promise<void> {
    await this.send(email, name, 'Verify your OpenEdge account', `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: hsl(187 100% 45% / 0.5);;">Verify your email</h1>
        <p>Hi ${name},</p>
        <p>Enter this code to verify your account. It expires in <strong>15 minutes</strong>.</p>
        <div style="font-size: 48px; font-weight: bold; letter-spacing: 12px; color: hsl(187 100% 45% / 0.5);; text-align: center; padding: 32px; background: #f5f3ff; border-radius: 12px; margin: 24px 0;">
          ${code}
        </div>
        <p style="color:#6b7280;font-size:13px;">If you didn't create an account, ignore this email.</p>
      </div>
    `);
  }

  async sendResendVerificationCode(email: string, name: string, code: string): Promise<void> {
    await this.sendVerificationCode(email, name, code);
  }

  async sendWelcome(email: string, name: string, bonusCredits: number): Promise<void> {
    await this.send(email, name, `Welcome to OpenEdge, ${name}!`, `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: hsl(187 100% 45% / 0.5);;">Welcome to OpenEdge 🎬</h1>
        <p>Hi ${name},</p>
        <p>Your account is verified. We've added <strong>${bonusCredits} free credits</strong> to get you started.</p>
        <a href="${this.appUrl}" style="display:inline-block;padding:12px 24px;background:hsl(187 100% 45% / 0.5);;color:#fff;border-radius:6px;text-decoration:none;margin-top:16px;">
          Go to Dashboard →
        </a>
        <p style="color:#6b7280;margin-top:32px;font-size:14px;">— The OpenEdge Team</p>
      </div>
    `);
  }

  async sendPasswordReset(email: string, name: string, token: string): Promise<void> {
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;
    await this.send(email, name, 'Reset your OpenEdge password', `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: hsl(187 100% 45% / 0.5);;">Password Reset</h1>
        <p>Hi ${name},</p>
        <p>Click the button below — this link expires in <strong>2 hours</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:hsl(187 100% 45% / 0.5);;color:#fff;border-radius:6px;text-decoration:none;margin-top:16px;">
          Reset Password →
        </a>
        <p style="color:#6b7280;margin-top:16px;font-size:13px;">If you didn't request this, ignore this email.</p>
        <p style="color:#6b7280;font-size:12px;">Or copy: ${resetUrl}</p>
      </div>
    `);
  }

  async sendPasswordChanged(email: string, name: string): Promise<void> {
    await this.send(email, name, 'Your OpenEdge password was changed', `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: hsl(187 100% 45% / 0.5);;">Password Changed ✓</h1>
        <p>Hi ${name},</p>
        <p>Your password was successfully updated.</p>
        <p>If you didn't make this change, <a href="${this.appUrl}/forgot-password">reset your password immediately</a>.</p>
      </div>
    `);
  }

  async sendCreditsPurchased(email: string, name: string, credits: number, amount: string): Promise<void> {
    await this.send(email, name, `${credits} credits added to your account`, `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: hsl(187 100% 45% / 0.5);;">Credits Added ✓</h1>
        <p>Hi ${name},</p>
        <p>Your payment of <strong>${amount}</strong> was successful. <strong>${credits} credits</strong> have been added.</p>
        <a href="${this.appUrl}" style="display:inline-block;padding:12px 24px;background:hsl(187 100% 45% / 0.5);;color:#fff;border-radius:6px;text-decoration:none;margin-top:16px;">
          Start Analyzing →
        </a>
      </div>
    `);
  }

  private async send(
    to: string,
    toName: string,
    subject: string,
    html: string,
  ): Promise<void> {
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        to: [{ email: to, name: toName }],
        sender: { name: this.fromName, email: this.fromAddress },
        subject,
        htmlContent: html,
      });
      this.logger.log(`Email sent: "${subject}" → ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${String(err)}`);
    }
  }
}

