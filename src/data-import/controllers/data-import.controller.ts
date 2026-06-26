import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { DataImportService } from '../services/data-import.service';
import { CreateImportJobDto, ImportQueryDto } from '../dto/data-import.dto';

@ApiTags('Data Import/Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/data-import')
export class DataImportController {
  constructor(private readonly dataImportService: DataImportService) {}

  @Get('modules')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'List supported import modules and their required columns' })
  getSupportedModules() {
    const data = this.dataImportService.getSupportedModules();
    return { success: true, data };
  }

  @Post('jobs')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Create and immediately process a data import job from uploaded CSV/Excel' })
  async createImportJob(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateImportJobDto) {
    const data = await this.dataImportService.createImportJob(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get('jobs')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'List import jobs with status and module filters' })
  async findAll(@TenantId() tenantId: string, @Query() query: ImportQueryDto) {
    const data = await this.dataImportService.findAll(tenantId, query);
    return { success: true, data };
  }

  @Get('jobs/:id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Get import job details including row-level errors' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.dataImportService.findOne(tenantId, id);
    return { success: true, data };
  }

  @Post('jobs/:id/retry')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Retry a failed or partially completed import job' })
  async retryJob(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.dataImportService.retryJob(tenantId, id, user.userId);
    return { success: true, data };
  }

  @Get('export')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Export module data as CSV download' })
  @ApiQuery({ name: 'module', required: true, description: 'Module to export: customers, inventory, expenses' })
  async exportData(@TenantId() tenantId: string, @Query('module') module: string, @Res() res: Response) {
    const csv = await this.dataImportService.exportData(tenantId, module);
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${module}-export.csv"` });
    res.send(csv);
  }
}
