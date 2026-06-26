import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { GstFilingService } from '../services/gst-filing.service';
import { FiledGstReturnDto, GenerateGstReturnDto, GstReturnQueryDto } from '../dto/gst-filing.dto';

@ApiTags('GST Filing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/gst-filing')
export class GstFilingController {
  constructor(private readonly gstFilingService: GstFilingService) {}

  @Post('returns')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Generate GSTR-1 or GSTR-3B return draft for a period' })
  async generateReturn(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: GenerateGstReturnDto) {
    const data = await this.gstFilingService.generateReturn(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get('returns')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'List GST returns with return type, period, and status filters' })
  async findAll(@TenantId() tenantId: string, @Query() query: GstReturnQueryDto) {
    const data = await this.gstFilingService.findAll(tenantId, query);
    return { success: true, data };
  }

  @Get('itc-summary')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Input Tax Credit (ITC) summary for a period' })
  @ApiQuery({ name: 'month', required: true })
  @ApiQuery({ name: 'year', required: true })
  async getItcSummary(@TenantId() tenantId: string, @Query('month') month: string, @Query('year') year: string) {
    const data = await this.gstFilingService.getItcSummary(tenantId, parseInt(month), parseInt(year));
    return { success: true, data };
  }

  @Get('returns/:id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Get GST return with full JSON data for portal upload' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.gstFilingService.findOne(tenantId, id);
    return { success: true, data };
  }

  @Patch('returns/:id/file')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Mark GST return as filed on portal (DRAFT → FILED)' })
  async markFiled(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: FiledGstReturnDto) {
    const data = await this.gstFilingService.markFiled(tenantId, id, dto, user.userId);
    return { success: true, data };
  }
}
