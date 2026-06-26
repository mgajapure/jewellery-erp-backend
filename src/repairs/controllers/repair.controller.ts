import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { RepairService } from '../services/repair.service';
import { CreateRepairDto, RepairQueryDto, UpdateRepairStatusDto } from '../dto/repair.dto';

@ApiTags('Repairs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/repairs')
export class RepairController {
  constructor(private readonly repairService: RepairService) {}

  @Post()
  @RequirePermissions(Permission.REPAIR_MANAGE)
  @ApiOperation({ summary: 'Create repair ticket' })
  async createRepair(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateRepairDto) {
    const data = await this.repairService.createRepair(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermissions(Permission.REPAIR_VIEW)
  @ApiOperation({ summary: 'List repair tickets' })
  async findRepairs(@TenantId() tenantId: string, @Query() query: RepairQueryDto) {
    const data = await this.repairService.findRepairs(tenantId, query);
    return { success: true, data };
  }

  @Get('analytics')
  @RequirePermissions(Permission.REPAIR_VIEW)
  @ApiOperation({ summary: 'Repair analytics by status and overdue count' })
  async getAnalytics(@TenantId() tenantId: string) {
    const data = await this.repairService.getAnalytics(tenantId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions(Permission.REPAIR_VIEW)
  @ApiOperation({ summary: 'Get repair ticket by ID' })
  async findRepairById(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.repairService.findRepairById(tenantId, id);
    return { success: true, data };
  }

  @Put(':id/status')
  @RequirePermissions(Permission.REPAIR_MANAGE)
  @ApiOperation({ summary: 'Update repair status (state machine enforced)' })
  async updateStatus(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateRepairStatusDto) {
    const data = await this.repairService.updateStatus(tenantId, id, dto, user.userId);
    return { success: true, data };
  }
}
