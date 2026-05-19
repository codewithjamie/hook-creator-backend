import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  SignupDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  AuthTokenResponse,
  UserProfileResponse,
  MessageResponse,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { VerifyEmailDto, ResendVerificationDto } from './dto/auth.dto';


@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({ status: 201, type: MessageResponse })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  signup(@Body() dto: SignupDto): Promise<MessageResponse> {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email with 6-digit code' })
  @ApiResponse({ status: 200, type: AuthTokenResponse })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<AuthTokenResponse> {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend verification code' })
  @ApiResponse({ status: 200, type: MessageResponse })
  resendVerification(@Body() dto: ResendVerificationDto): Promise<MessageResponse> {
    return this.authService.resendVerification(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Log in' })
  @ApiResponse({ status: 200, type: AuthTokenResponse })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto): Promise<AuthTokenResponse> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile + credit balance' })
  @ApiResponse({ status: 200, type: UserProfileResponse })
  getMe(@Request() req: { user: { id: string } }): Promise<UserProfileResponse> {
    return this.authService.getMe(req.user.id);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({ status: 200, type: MessageResponse })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponse> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({ status: 200, type: MessageResponse })
  @ApiResponse({ status: 400, description: 'Token invalid or expired' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponse> {
    return this.authService.resetPassword(dto);
  }
}
