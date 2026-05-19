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
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const brevo_1 = require("@getbrevo/brevo");
let EmailService = EmailService_1 = class EmailService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(EmailService_1.name);
        this.client = new brevo_1.BrevoClient({
            apiKey: config.getOrThrow('BREVO_API_KEY'),
            environment: brevo_1.BrevoEnvironment.Default,
        });
        this.fromName = config.get('EMAIL_FROM_NAME', 'OpenEdge');
        this.fromAddress = config.get('EMAIL_FROM_ADDRESS', 'noreply@yourdomain.com');
        this.appUrl = config.get('APP_URL', 'http://localhost:3000');
    }
    async sendVerificationCode(email, name, code) {
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
    async sendResendVerificationCode(email, name, code) {
        await this.sendVerificationCode(email, name, code);
    }
    async sendWelcome(email, name, bonusCredits) {
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
    async sendPasswordReset(email, name, token) {
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
    async sendPasswordChanged(email, name) {
        await this.send(email, name, 'Your OpenEdge password was changed', `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: hsl(187 100% 45% / 0.5);;">Password Changed ✓</h1>
        <p>Hi ${name},</p>
        <p>Your password was successfully updated.</p>
        <p>If you didn't make this change, <a href="${this.appUrl}/forgot-password">reset your password immediately</a>.</p>
      </div>
    `);
    }
    async sendCreditsPurchased(email, name, credits, amount) {
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
    async send(to, toName, subject, html) {
        try {
            await this.client.transactionalEmails.sendTransacEmail({
                to: [{ email: to, name: toName }],
                sender: { name: this.fromName, email: this.fromAddress },
                subject,
                htmlContent: html,
            });
            this.logger.log(`Email sent: "${subject}" → ${to}`);
        }
        catch (err) {
            this.logger.error(`Failed to send email to ${to}: ${String(err)}`);
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service%20copy.js.map