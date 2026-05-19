import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { CreditTransactionEntity } from './entities/credit-transaction.entity';
import { UserEntity } from '../users/entities/user.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CreditTransactionEntity, UserEntity]),
    EmailModule,
  ],
  controllers: [CreditsController],
  providers: [CreditsService],
  exports: [CreditsService],
})
export class CreditsModule {}
