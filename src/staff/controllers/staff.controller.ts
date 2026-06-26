import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { StaffService } from '../services/staff.service';
import { CreateStaffDto, StaffQueryDto, UpdateStaffDto } from '../dto/staff.dto';

@ApiTags('Staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Create staff member' })
  async createStaff(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateStaffDto) {
    const data = await this.staffService.createStaff(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'List staff members with filters' })
  async findStaff(@TenantId() tenantId: string, @Query() query: StaffQueryDto) {
    const data = await this.staffService.findStaff(tenantId, query);
    return { success: true, data };
  }

  @Get('devices/pending')
  @RequirePermissions(Permission.DEVICE_APPROVE)
  @ApiOperation({ summary: 'List devices pending owner approval' })
  async getPendingDevices(@TenantId() tenantId: string) {
    const data = await this.staffService.getPendingDevices(tenantId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Get staff member by ID with devices' })
  async findStaffById(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.staffService.findStaffById(tenantId, id);
    return { success: true, data };
  }

  @Put(':id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Update staff role or branch assignment' })
  async updateStaff(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateStaffDto) {
    const data = await this.staffService.updateStaff(tenantId, id, dto, user.userId);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Deactivate staff member (soft delete)' })
  async deactivateStaff(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.staffService.deactivateStaff(tenantId, id, user.userId);
    return { success: true, data };
  }

  @Put('devices/:deviceId/approve')
  @RequirePermissions(Permission.DEVICE_APPROVE)
  @ApiOperation({ summary: 'Approve device for staff member login' })
  async approveDevice(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('deviceId') deviceId: string) {
    const data = await this.staffService.approveDevice(tenantId, deviceId, user.userId);
    return { success: true, data };
  }
}
