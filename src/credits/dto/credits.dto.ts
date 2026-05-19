import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreditBalanceResponse {
  @ApiProperty({ example: 10 }) credits: number;
  @ApiProperty() userId: string;
}

export class CreditPackage {
  @ApiProperty({ example: 'pkg_starter' }) id: string;
  @ApiProperty({ example: 'Starter' }) name: string;
  @ApiProperty({ example: 10 }) credits: number;
  @ApiProperty({ example: 999, description: 'Price in USD cents' }) priceUsd: number;
  @ApiProperty({ example: '$9.99' }) label: string;
  @ApiProperty({ example: 'Great for trying out OpenEdge' }) description: string;
  @ApiPropertyOptional({ example: true }) popular?: boolean;
}

export class CreateCheckoutDto {
  @ApiProperty({ example: 'pkg_starter', description: 'ID from GET /credits/packages' })
  @IsString()
  packageId: string;

  @ApiPropertyOptional({ description: 'URL to redirect to after successful payment' })
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'URL to redirect to if payment is cancelled' })
  @IsString()
  cancelUrl?: string;
}

export class CheckoutSessionResponse {
  @ApiProperty({ description: 'Redirect user to this Stripe URL' })
  url: string;

  @ApiProperty()
  sessionId: string;
}

export class CreditTransactionResponse {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ['purchase', 'spend', 'refund', 'bonus'] }) type: string;
  @ApiProperty() amount: number;
  @ApiProperty() balanceBefore: number;
  @ApiProperty() balanceAfter: number;
  @ApiPropertyOptional() description: string | null;
  @ApiProperty() createdAt: Date;
}

export class TransactionListResponse {
  @ApiProperty({ type: [CreditTransactionResponse] }) items: CreditTransactionResponse[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
