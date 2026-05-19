import { UserEntity } from '../../users/entities/user.entity';
export type TransactionType = 'purchase' | 'spend' | 'refund' | 'bonus';
export declare class CreditTransactionEntity {
    id: string;
    type: TransactionType;
    amount: number;
    balanceBefore: number;
    description: string | null;
    stripeSessionId: string | null;
    analysisId: string | null;
    balanceAfter: number;
    createdAt: Date;
    user: UserEntity;
    userId: string;
}
