"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const auth_dto_1 = require("./dto/auth.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const public_decorator_1 = require("../common/decorators/public.decorator");
const auth_dto_2 = require("./dto/auth.dto");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    signup(dto) {
        return this.authService.signup(dto);
    }
    verifyEmail(dto) {
        return this.authService.verifyEmail(dto);
    }
    resendVerification(dto) {
        return this.authService.resendVerification(dto);
    }
    login(dto) {
        return this.authService.login(dto);
    }
    getMe(req) {
        return this.authService.getMe(req.user.id);
    }
    forgotPassword(dto) {
        return this.authService.forgotPassword(dto);
    }
    resetPassword(dto) {
        return this.authService.resetPassword(dto);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('signup'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new account' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: auth_dto_1.MessageResponse }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Email already in use' }),
    openapi.ApiResponse({ status: 201, type: require("./dto/auth.dto").MessageResponse }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.SignupDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signup", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('verify-email'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify email with 6-digit code' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auth_dto_1.AuthTokenResponse }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid or expired code' }),
    openapi.ApiResponse({ status: 201, type: require("./dto/auth.dto").AuthTokenResponse }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_2.VerifyEmailDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('resend-verification'),
    (0, swagger_1.ApiOperation)({ summary: 'Resend verification code' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auth_dto_1.MessageResponse }),
    openapi.ApiResponse({ status: 201, type: require("./dto/auth.dto").MessageResponse }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_2.ResendVerificationDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendVerification", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    (0, swagger_1.ApiOperation)({ summary: 'Log in' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auth_dto_1.AuthTokenResponse }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials' }),
    openapi.ApiResponse({ status: 201, type: require("./dto/auth.dto").AuthTokenResponse }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user profile + credit balance' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auth_dto_1.UserProfileResponse }),
    openapi.ApiResponse({ status: 200, type: require("./dto/auth.dto").UserProfileResponse }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getMe", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('forgot-password'),
    (0, swagger_1.ApiOperation)({ summary: 'Request a password reset email' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auth_dto_1.MessageResponse }),
    openapi.ApiResponse({ status: 201, type: require("./dto/auth.dto").MessageResponse }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, swagger_1.ApiOperation)({ summary: 'Reset password using token from email' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auth_dto_1.MessageResponse }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Token invalid or expired' }),
    openapi.ApiResponse({ status: 201, type: require("./dto/auth.dto").MessageResponse }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map