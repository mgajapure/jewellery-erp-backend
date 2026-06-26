import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { SavingsService, CreateSchemeDto, RecordCollectionDto, SchemeQueryDto } from '../services/savings.service';

@ApiTags('Savings Schemes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/savings')
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Post()
  @RequirePermissions(Permission.SALES_CREATE)
  @ApiOperation({ summary: 'Enroll customer in savings/chit scheme' })
  async createScheme(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateSchemeDto) {
    const data = await this.savingsService.createScheme(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermissions(Permission.SALES_VIEW)
  @ApiOperation({ summary: 'List savings schemes' })
  async findSchemes(@TenantId() tenantId: string, @Query() query: SchemeQueryDto) {
    const data = await this.savingsService.findSchemes(tenantId, query);
    return { success: true, data };
  }

  @Get('defaulters')
  @RequirePermissions(Permission.SALES_VIEW)
  @ApiOperation({ summary: 'List schemes with missed monthly collections' })
  async getDefaulters(@TenantId() tenantId: string) {
    const data = await this.savingsService.getDefaulters(tenantId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions(Permission.SALES_VIEW)
  @ApiOperation({ summary: 'Get scheme with full collection history' })
  async findSchemeById(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.savingsService.findSchemeById(tenantId, id);
    return { success: true, data };
  }

  @Get(':id/statement')
  @RequirePermissions(Permission.SALES_VIEW)
  @ApiOperation({ summary: 'Scheme statement — collected, outstanding, maturity value with bonus' })
  async getSchemeStatement(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.savingsService.getSchemeStatement(tenantId, id);
    return { success: true, data };
  }

  @Post(':id/collections')
  @RequirePermissions(Permission.SALES_CREATE)
  @ApiOperation({ summary: 'Record monthly collection for scheme' })
  async recordCollection(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: RecordCollectionDto) {
    const data = await this.savingsService.recordCollection(tenantId, id, dto, user.userId);
    return { success: true, data };
  }
}
