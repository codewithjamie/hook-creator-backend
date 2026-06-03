import {
  Injectable,
  Logger,
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager} from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as Stripe from 'stripe';
import { UserEntity } from '../users/entities/user.entity';
import { CreditTransactionEntity } from './entities/credit-transaction.entity';
import { EmailService } from '../email/email.service';
import {
  CreditBalanceResponse,
  CreditPackage,
  CreateCheckoutDto,
  CheckoutSessionResponse,
  CreditTransactionResponse,
  TransactionListResponse,
} from './dto/credits.dto';


export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pkg_starter',
    name: 'Starter',
    credits: 10,
    priceUsd: 499,
    label: '$4.99',
    description: 'Perfect for trying out OpenEdge',
  },
  {
    id: 'pkg_pro',
    name: 'Pro',
    credits: 50,
    priceUsd: 2499,
    label: '$24.99',
    description: 'Best value for regular creators',
    popular: true,
  },
  {
    id: 'pkg_studio',
    name: 'Studio',
    credits: 100,
    priceUsd: 4999,
    label: '$49.99',
    description: 'For agencies and power users',
  },
];

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);
  private readonly stripe: any;
  private readonly webhookSecret: string;
  private readonly appUrl: string;

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(CreditTransactionEntity)
    private readonly transactions: Repository<CreditTransactionEntity>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly email: EmailService,
  ) {
    this.stripe = new (Stripe as any)(config.getOrThrow<string>('STRIPE_SECRET_KEY'));
    this.webhookSecret = config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
    this.appUrl = config.get<string>('APP_URL', 'http://localhost:3000');
  }

  async getBalance(userId: string): Promise<CreditBalanceResponse> {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    return { userId, credits: user.credits };
  }

  getPackages(): CreditPackage[] {
    return CREDIT_PACKAGES;
  }

  async getTransactions(
    userId: string,
    page: number,
    limit: number,
  ): Promise<TransactionListResponse> {
    const [items, total] = await this.transactions.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map(this.toTransactionResponse),
      total,
      page,
      limit,
    };
  }

  async createCheckout(
    userId: string,
    dto: CreateCheckoutDto,
  ): Promise<CheckoutSessionResponse> {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === dto.packageId);
    if (!pkg) throw new BadRequestException(`Unknown package: ${dto.packageId}`);

    const user = await this.users.findOneOrFail({ where: { id: userId } });

    // Ensure Stripe customer exists
    const customerId = await this.ensureStripeCustomer(user);

    const successUrl =
      dto.successUrl ?? `${this.appUrl}/dashboard?credits=success`;
    const cancelUrl =
      dto.cancelUrl ?? `${this.appUrl}/dashboard?credits=cancelled`;

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: pkg.priceUsd,
            product_data: {
              name: `OpenEdge ${pkg.name} — ${pkg.credits} Credits`,
              description: pkg.description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        packageId: pkg.id,
        credits: String(pkg.credits),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    this.logger.log(`Checkout session created for user ${userId}: ${session.id}`);

    return { url: session.url!, sessionId: session.id };
  }

  async handleWebhook(sig: string, rawBody: Buffer): Promise<{ received: boolean }> {
    let event: ReturnType<typeof this.stripe.webhooks.constructEvent>;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, sig, this.webhookSecret);
    } catch (err) {
      this.logger.error(`Stripe webhook signature verification failed: ${String(err)}`);
      throw new HttpException('Invalid webhook signature', HttpStatus.BAD_REQUEST);
    }

    if (event.type === 'checkout.session.completed') {
      await this.handleCheckoutComplete(event.data.object);
    }

    return { received: true };
  }

  /**
   * Deduct credits from a user — called by AnalyzeService.
   * Runs in a transaction to prevent race conditions.
   */
  async spendCredits(
    userId: string,
    amount: number,
    description: string,
    analysisId?: string,
  ): Promise<number> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const user = await manager.findOne(UserEntity, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) throw new NotFoundException('User not found');
      if (user.credits < amount) {
        throw new HttpException(
          `Insufficient credits. You have ${user.credits} but need ${amount}.`,
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      const balanceBefore = user.credits;
      user.credits -= amount;
      await manager.save(user);

      const tx = manager.create(CreditTransactionEntity, {
        userId,
        type: 'spend',
        amount: -amount,
        balanceBefore,
        balanceAfter: user.credits,
        description,
        analysisId: analysisId ?? null,
      });
      await manager.save(tx);

      return user.credits;
    });
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async handleCheckoutComplete(session: any): Promise<void> {
    const { userId, packageId, credits } = session.metadata ?? {};
    if (!userId || !packageId || !credits) {
      this.logger.error('Checkout session missing metadata', session.id);
      return;
    }

    const creditAmount = parseInt(credits, 10);

    await this.dataSource.transaction(async (manager: EntityManager) => {
      const user = await manager.findOne(UserEntity, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) return;

      const balanceBefore = user.credits;
      user.credits += creditAmount;
      await manager.save(user);

      const tx = manager.create(CreditTransactionEntity, {
        userId,
        type: 'purchase',
        amount: creditAmount,
        balanceBefore,
        balanceAfter: user.credits,
        description: `Purchased ${creditAmount} credits (${packageId})`,
        stripeSessionId: session.id,
      });
      await manager.save(tx);
    });

    const user = await this.users.findOne({ where: { id: userId } });
    if (user) {
      const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
      await this.email.sendCreditsPurchased(
        user.email,
        user.name,
        creditAmount,
        pkg?.label ?? `${creditAmount} credits`,
      );
    }

    this.logger.log(`Credits added: ${creditAmount} → user ${userId}`);
  }

  private async ensureStripeCustomer(user: UserEntity): Promise<string> {
    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });

    user.stripeCustomerId = customer.id;
    await this.users.save(user);

    return customer.id;
  }

  private toTransactionResponse(tx: CreditTransactionEntity): CreditTransactionResponse {
    return {
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      description: tx.description,
      createdAt: tx.createdAt,
    };
  }
}
