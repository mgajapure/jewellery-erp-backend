import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { DashboardService } from '../services/dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Dashboard summary — all KPIs (cached 2min, target < 2s)' })
  async getSummary(@TenantId() tenantId: string) {
    const data = await this.dashboardService.getDashboardSummary(tenantId);
    return { success: true, data };
  }

  @Get('sales-trend')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Daily sales trend for last N days (default 30, cached 5min)' })
  async getSalesTrend(@TenantId() tenantId: string, @Query('days') days?: string) {
    const data = await this.dashboardService.getSalesTrend(tenantId, days ? parseInt(days) : 30);
    return { success: true, data };
  }

  @Get('girvi-portfolio')
  @RequirePermissions(Permission.GIRVI_VIEW)
  @ApiOperation({ summary: 'Girvi portfolio breakdown by status with loan values' })
  async getGirviPortfolio(@TenantId() tenantId: string) {
    const data = await this.dashboardService.getGirviPortfolioBreakdown(tenantId);
    return { success: true, data };
  }

  @Get('top-karigars')
  @RequirePermissions(Permission.KARIGAR_VIEW)
  @ApiOperation({ summary: 'Top 10 karigars by completed jobs and making charges' })
  async getTopKarigars(@TenantId() tenantId: string) {
    const data = await this.dashboardService.getTopKarigars(tenantId);
    return { success: true, data };
  }
}
