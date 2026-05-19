import { RawBodyRequest } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { CreditBalanceResponse, CreditPackage, CreateCheckoutDto, CheckoutSessionResponse, TransactionListResponse } from './dto/credits.dto';
export declare class CreditsController {
    private readonly creditsService;
    constructor(creditsService: CreditsService);
    getBalance(req: {
        user: {
            id: string;
        };
    }): Promise<CreditBalanceResponse>;
    getPackages(): CreditPackage[];
    getTransactions(req: {
        user: {
            id: string;
        };
    }, page?: number, limit?: number): Promise<TransactionListResponse>;
    createCheckout(req: {
        user: {
            id: string;
        };
    }, dto: CreateCheckoutDto): Promise<CheckoutSessionResponse>;
    stripeWebhook(sig: string, req: RawBodyRequest<Request>): Promise<{
        received: boolean;
    }>;
}
