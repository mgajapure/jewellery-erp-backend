import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { GoldRateService } from '../services/gold-rate.service';
import { CheckThresholdsDto, SetManualRateDto } from '../dto/gold-rate.dto';

@ApiTags('Gold Rates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/gold-rates')
export class GoldRateController {
  constructor(private readonly goldRateService: GoldRateService) {}

  @Get('current')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get current gold/silver rate (cached 5min)' })
  async getCurrentRate(
    @Query('metalType') metalType: string = 'GOLD',
    @Query('purity') purity: string = '24K',
  ) {
    const data = await this.goldRateService.getCurrentRate(metalType, purity);
    return { success: true, data };
  }

  @Get('history')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Rate history for chart (last N days)' })
  async getRateHistory(
    @Query('metalType') metalType: string = 'GOLD',
    @Query('purity') purity: string = '24K',
    @Query('days') days?: string,
  ) {
    const data = await this.goldRateService.getRateHistory(metalType, purity, days ? parseInt(days) : 7);
    return { success: true, data };
  }

  @Post('manual')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Set manual gold rate override (when MCX is unavailable)' })
  async setManualRate(@Body() dto: SetManualRateDto) {
    const data = await this.goldRateService.setManualRate(dto.metalType, dto.purity, dto.ratePerGram, 'MANUAL');
    return { success: true, data };
  }

  @Post('check-thresholds')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Check if current rates breach configured alert thresholds' })
  async checkThresholds(@TenantId() tenantId: string, @Body() dto: CheckThresholdsDto) {
    const data = await this.goldRateService.checkThresholdAlerts(tenantId, dto.thresholds);
    return { success: true, data };
  }
}
