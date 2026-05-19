import { AnalysisEntity } from '../../analyze/entities/analysis.entity';
import { CreditTransactionEntity } from '../../credits/entities/credit-transaction.entity';
export declare class UserEntity {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    resetPasswordToken: string | null;
    stripeCustomerId: string | null;
    credits: number;
    resetPasswordExpires: Date | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    analyses: AnalysisEntity[];
    verificationCode: string | null;
    verificationCodeExpires: Date | null;
    creditTransactions: CreditTransactionEntity[];
}
