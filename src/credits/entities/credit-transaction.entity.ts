import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export type TransactionType = 'purchase' | 'spend' | 'refund' | 'bonus';

@Entity('credit_transactions')
export class CreditTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['purchase', 'spend', 'refund', 'bonus'] })
  type: TransactionType;

  @Column()
  amount: number;

  @Column()
  balanceBefore: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  stripeSessionId: string | null;

  @Column({ type: 'text', nullable: true })
  analysisId: string | null;

  @Column()
  balanceAfter: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => UserEntity, (u: UserEntity) => u.creditTransactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  userId: string;
}
