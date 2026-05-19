export declare class CreditBalanceResponse {
    credits: number;
    userId: string;
}
export declare class CreditPackage {
    id: string;
    name: string;
    credits: number;
    priceUsd: number;
    label: string;
    description: string;
    popular?: boolean;
}
export declare class CreateCheckoutDto {
    packageId: string;
    successUrl?: string;
    cancelUrl?: string;
}
export declare class CheckoutSessionResponse {
    url: string;
    sessionId: string;
}
export declare class CreditTransactionResponse {
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string | null;
    createdAt: Date;
}
export declare class TransactionListResponse {
    items: CreditTransactionResponse[];
    total: number;
    page: number;
    limit: number;
}
