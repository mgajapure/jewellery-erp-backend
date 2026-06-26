import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { ReportService } from '../services/report.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('girvi')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Girvi portfolio report — new, redeemed, auctioned, interest earned' })
  async getGirviReport(
    @TenantId() tenantId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.reportService.getGirviReport(tenantId, fromDate, toDate);
    return { success: true, data };
  }

  @Get('sales')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Sales report by period — revenue, GST, by category and payment mode' })
  async getSalesReport(
    @TenantId() tenantId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.reportService.getSalesReport(tenantId, fromDate, toDate);
    return { success: true, data };
  }

  @Get('karigar')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Karigar performance report — jobs, wastage, making charges' })
  async getKarigarReport(
    @TenantId() tenantId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.reportService.getKarigarReport(tenantId, fromDate, toDate);
    return { success: true, data };
  }

  @Get('stock-valuation')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Current stock valuation by metal type' })
  async getStockValuationReport(@TenantId() tenantId: string) {
    const data = await this.reportService.getStockValuationReport(tenantId);
    return { success: true, data };
  }

  @Get('gstr1')
  @RequirePermissions(Permission.REPORTS_EXPORT)
  @ApiOperation({ summary: 'GSTR-1 data — invoice list and HSN summary for GST filing' })
  async getGstr1Data(
    @TenantId() tenantId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const data = await this.reportService.getGstr1Data(tenantId, parseInt(year), parseInt(month));
    return { success: true, data };
  }
}
