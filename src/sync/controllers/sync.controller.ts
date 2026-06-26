import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { SyncService } from '../services/sync.service';
import { PushSyncOperationDto, SyncQueryDto } from '../dto/sync.dto';

@ApiTags('Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Push offline operation from mobile device to sync queue' })
  async pushOperation(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: PushSyncOperationDto) {
    const deviceId = dto.deviceId ?? user.deviceId;
    const data = await this.syncService.pushOperation(tenantId, { ...dto, deviceId });
    return { success: true, data };
  }

  @Get('queue')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'View sync queue with status filter' })
  async findQueue(@TenantId() tenantId: string, @Query() query: SyncQueryDto) {
    const data = await this.syncService.findQueue(tenantId, query);
    return { success: true, data };
  }

  @Get('status')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Sync queue status summary by state' })
  async getSyncStatus(@TenantId() tenantId: string) {
    const data = await this.syncService.getSyncStatus(tenantId);
    return { success: true, data };
  }
}
