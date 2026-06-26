import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { SettingsService } from '../services/settings.service';
import { UpdateInterestConfigDto, UpdateSettingsDto, UpdateTenantProfileDto } from '../dto/settings.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('profile')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Get tenant profile (business details)' })
  async getProfile(@TenantId() tenantId: string) {
    const data = await this.settingsService.getTenantProfile(tenantId);
    return { success: true, data };
  }

  @Put('profile')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Update tenant profile (name, GSTIN, address, logo)' })
  async updateProfile(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: UpdateTenantProfileDto) {
    const data = await this.settingsService.updateTenantProfile(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Get all tenant settings (JSON config)' })
  async getSettings(@TenantId() tenantId: string) {
    const data = await this.settingsService.getSettings(tenantId);
    return { success: true, data };
  }

  @Put()
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Update tenant settings (key-value config merge)' })
  async updateSettings(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: UpdateSettingsDto) {
    const data = await this.settingsService.updateSettings(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get('interest')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Get interest configuration (rates, type, threshold)' })
  async getInterestConfig(@TenantId() tenantId: string) {
    const data = await this.settingsService.getInterestConfig(tenantId);
    return { success: true, data };
  }

  @Put('interest')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Update interest configuration' })
  async updateInterestConfig(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: UpdateInterestConfigDto) {
    const data = await this.settingsService.updateInterestConfig(tenantId, dto, user.userId);
    return { success: true, data };
  }
}
