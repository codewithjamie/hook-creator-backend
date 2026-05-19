import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../users/entities/user.entity';
import { CreditTransactionEntity } from './entities/credit-transaction.entity';
import { EmailService } from '../email/email.service';
import { CreditBalanceResponse, CreditPackage, CreateCheckoutDto, CheckoutSessionResponse, TransactionListResponse } from './dto/credits.dto';
export declare const CREDIT_PACKAGES: CreditPackage[];
export declare class CreditsService {
    private readonly users;
    private readonly transactions;
    private readonly config;
    private readonly dataSource;
    private readonly email;
    private readonly logger;
    private readonly stripe;
    private readonly webhookSecret;
    private readonly appUrl;
    constructor(users: Repository<UserEntity>, transactions: Repository<CreditTransactionEntity>, config: ConfigService, dataSource: DataSource, email: EmailService);
    getBalance(userId: string): Promise<CreditBalanceResponse>;
    getPackages(): CreditPackage[];
    getTransactions(userId: string, page: number, limit: number): Promise<TransactionListResponse>;
    createCheckout(userId: string, dto: CreateCheckoutDto): Promise<CheckoutSessionResponse>;
    handleWebhook(sig: string, rawBody: Buffer): Promise<{
        received: boolean;
    }>;
    spendCredits(userId: string, amount: number, description: string, analysisId?: string): Promise<number>;
    private handleCheckoutComplete;
    private ensureStripeCustomer;
    private toTransactionResponse;
}
