import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { PayrollService } from '../services/payroll.service';
import { ApprovePayrollDto, GeneratePayrollDto, PayrollQueryDto } from '../dto/payroll.dto';

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post()
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Generate payroll for a staff member (pro-rated, statutory deductions auto-calculated)' })
  async generatePayroll(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: GeneratePayrollDto) {
    const data = await this.payrollService.generatePayroll(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'List payroll records with month/year/staff filters' })
  async findAll(@TenantId() tenantId: string, @Query() query: PayrollQueryDto) {
    const data = await this.payrollService.findAll(tenantId, query);
    return { success: true, data };
  }

  @Get('summary')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Payroll summary for month — gross, PF, ESI, TDS, net totals' })
  @ApiQuery({ name: 'month', required: true })
  @ApiQuery({ name: 'year', required: true })
  async getPayrollSummary(@TenantId() tenantId: string, @Query('month') month: string, @Query('year') year: string) {
    const data = await this.payrollService.getPayrollSummary(tenantId, parseInt(month), parseInt(year));
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Get payroll record with full breakdown' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.payrollService.findOne(tenantId, id);
    return { success: true, data };
  }

  @Patch(':id/approve')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Approve payroll (DRAFT → APPROVED)' })
  async approvePayroll(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: ApprovePayrollDto) {
    const data = await this.payrollService.approvePayroll(tenantId, id, dto, user.userId);
    return { success: true, data };
  }

  @Patch(':id/paid')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Mark payroll as paid (APPROVED → PAID)' })
  async markPaid(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.payrollService.markPaid(tenantId, id, user.userId);
    return { success: true, data };
  }
}
