import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LocalAuthGuard } from '../../common/guards/local-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard';
import { JwtLogoutGuard } from '../../common/guards/jwt-logout.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive access + refresh tokens' })
  login(@CurrentUser() user: any) {
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.id);
  }

  @UseGuards(JwtLogoutGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke all refresh tokens (accepts expired access tokens)' })
  logout(@CurrentUser() user: any) {
    return this.authService.logout(user.id);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  refresh(@CurrentUser() user: any) {
    return this.authService.refreshTokens(user.sub, user.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  // ─── Admin 2FA login ─────────────────────────────────────────────────────
  @Public()
  @Post('admin-2fa-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request admin 2FA OTP — validates password then sends OTP' })
  requestAdminOtp(@Body() body: { email: string; password: string }) {
    return this.authService.requestAdminLoginOtp(body.email, body.password);
  }

  @Public()
  @Post('admin-2fa-verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify admin 2FA OTP — returns tokens' })
  verifyAdminOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyAdminLoginOtp(body.email, body.otp);
  }

  // ─── OTP first-login ─────────────────────────────────────────────────────
  @Public()
  @Post('login-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'First login with OTP — returns setup token' })
  loginOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.loginWithOtp(body.email, body.otp);
  }

  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set own password after OTP login' })
  setPassword(@CurrentUser() user: any, @Body() body: { password: string }) {
    return this.authService.setPassword(user.id, body.password);
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth for login' })
  googleLogin() {
    // Passport redirects — nothing to do here
  }

  @Get('google/register')
  @Public()
  @ApiOperation({ summary: 'Initiate Google OAuth for school registration' })
  googleRegister(@Res() res: Response) {
    const params = new URLSearchParams({
      client_id: this.config.get<string>('GOOGLE_CLIENT_ID', ''),
      redirect_uri: this.config.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:4000/api/auth/google/callback',
      ),
      response_type: 'code',
      scope: 'email profile',
      state: 'register',
    });
    res.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    );
  }

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback — handles login and register' })
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const googleUser = req.user;

    if (googleUser.state === 'register') {
      const params = new URLSearchParams({
        name: googleUser.name ?? '',
        email: googleUser.email ?? '',
      });
      return res.redirect(`${frontendUrl}/register-school?${params.toString()}`);
    }

    const result = await this.authService.handleGoogleLogin(googleUser);

    if ('error' in result) {
      return res.redirect(`${frontendUrl}/auth/callback?error=${result.error}`);
    }

    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      role: result.user.role,
    });
    return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
  }
}
