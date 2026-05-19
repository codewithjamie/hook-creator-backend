import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { AnalysisEntity } from '../../analyze/entities/analysis.entity';
import { CreditTransactionEntity } from '../../credits/entities/credit-transaction.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  @Exclude()
  passwordHash: string;

  @Column({ type: 'text', nullable: true })
  resetPasswordToken: string | null;

  @Column({ type: 'text', nullable: true })
  stripeCustomerId: string | null;

  @Column({ default: 0 })
  credits: number;

  @Column({ nullable: true, type: 'timestamptz' })
  @Exclude()
  resetPasswordExpires: Date | null;

  @Column({ default: false })
  emailVerified: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => AnalysisEntity, (a: AnalysisEntity) => a.user)
  analyses: AnalysisEntity[];

  @Column({ type: 'varchar', length: 6, nullable: true })
  verificationCode: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verificationCodeExpires: Date | null;

  @OneToMany(() => CreditTransactionEntity, (t: CreditTransactionEntity) => t.user)
  creditTransactions: CreditTransactionEntity[];
}
