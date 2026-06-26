import {
  Body,
  Controller,
  Get,
  Ip,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../guards/jwt.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { Permission } from '../rbac/permissions';
import { AuthService } from '../services/auth.service';
import {
  ApproveDeviceDto,
  RefreshTokenDto,
  SendOtpDto,
  SetPinDto,
  VerifyOtpDto,
  VerifyPinDto,
} from '../dto/auth.dto';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('otp/send')
  @ApiOperation({ summary: 'Send OTP to mobile number' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Public()
  @Post('otp/verify')
  @ApiOperation({ summary: 'Verify OTP and get tokens' })
  verifyOtp(@Body() dto: VerifyOtpDto, @Ip() ip: string) {
    return this.authService.verifyOtp(dto, ip);
  }

  @Public()
  @Post('token/refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @Post('pin/set')
  @ApiOperation({ summary: 'Set or update PIN' })
  setPin(
    @CurrentUser() user: { id: string },
    @TenantId() tenantId: string,
    @Body() dto: SetPinDto,
  ) {
    return this.authService.setPin(user.id, tenantId, dto.pin);
  }

  @Public()
  @Post('pin/verify')
  @ApiOperation({ summary: 'Login with PIN' })
  verifyPin(@Body() dto: VerifyPinDto & { userId: string; tenantId: string }, @Ip() ip: string) {
    return this.authService.verifyPin(dto.userId, dto.tenantId, dto, ip);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(Permission.DEVICE_APPROVE)
  @ApiBearerAuth()
  @Get('devices/pending')
  @ApiOperation({ summary: 'List pending device approvals (Owner/Manager only)' })
  getPendingDevices(@TenantId() tenantId: string) {
    return this.authService.getPendingDevices(tenantId);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(Permission.DEVICE_APPROVE)
  @ApiBearerAuth()
  @Patch('devices/approve')
  @ApiOperation({ summary: 'Approve a device' })
  approveDevice(
    @Body() dto: ApproveDeviceDto,
    @CurrentUser() user: { id: string },
    @TenantId() tenantId: string,
  ) {
    return this.authService.approveDevice(dto.deviceId, user.id, tenantId);
  }
}
