import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123' })
  @IsString()
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token from the reset email link' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewStrongPass456', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class UserProfileResponse {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() name: string;
  @ApiProperty() credits: number;
  @ApiProperty() emailVerified: boolean;
  @ApiProperty() createdAt: Date;
}

export class AuthTokenResponse {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  user: UserProfileResponse;
}

export class MessageResponse {
  @ApiProperty()
  message: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '482910', description: '6-digit code from email' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;
}