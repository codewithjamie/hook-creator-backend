import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  Req,
  UseGuards,
  Request,
  HttpCode,
  RawBodyRequest,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CreditsService } from './credits.service';
import {
  CreditBalanceResponse,
  CreditPackage,
  CreateCheckoutDto,
  CheckoutSessionResponse,
  TransactionListResponse,
} from './dto/credits.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('credits')
@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current credit balance' })
  @ApiResponse({ status: 200, type: CreditBalanceResponse })
  getBalance(@Request() req: { user: { id: string } }): Promise<CreditBalanceResponse> {
    return this.creditsService.getBalance(req.user.id);
  }

  @Get('packages')
  @ApiOperation({ summary: 'List available credit packages (public)' })
  @ApiResponse({ status: 200, type: [CreditPackage] })
  getPackages(): CreditPackage[] {
    return this.creditsService.getPackages();
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List credit transaction history' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, type: TransactionListResponse })
  getTransactions(
    @Request() req: { user: { id: string } },
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<TransactionListResponse> {
    return this.creditsService.getTransactions(
      req.user.id,
      Number(page),
      Number(limit),
    );
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe checkout session — buy credits' })
  @ApiResponse({ status: 201, type: CheckoutSessionResponse })
  createCheckout(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateCheckoutDto,
  ): Promise<CheckoutSessionResponse> {
    return this.creditsService.createCheckout(req.user.id, dto);
  }

  @Post('webhook')
  @SkipThrottle()
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook receiver (internal — called by Stripe only)' })
  stripeWebhook(
    @Headers('stripe-signature') sig: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    return this.creditsService.handleWebhook(sig, req.rawBody as Buffer);
  }
}
