import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { VaultService } from '../services/vault.service';
import {
  AssignSlotDto,
  CreateSafeDto,
  CreateSlotsDto,
  CreateTrayDto,
  CreateVaultDto,
} from '../dto/vault.dto';

@ApiTags('Vault')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/vault')
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  // ── Vault CRUD ────────────────────────────────────────────────────────────

  @Post('vaults')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Create a vault' })
  createVault(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateVaultDto,
  ) {
    return this.vaultService.createVault(tenantId, dto, user.id);
  }

  @Get('vaults')
  @RequirePermissions(Permission.GIRVI_VIEW)
  @ApiOperation({ summary: 'List all vaults with full hierarchy' })
  listVaults(@TenantId() tenantId: string) {
    return this.vaultService.listVaults(tenantId);
  }

  @Get('vaults/:id')
  @RequirePermissions(Permission.GIRVI_VIEW)
  @ApiOperation({ summary: 'Get vault with safes, trays and slots' })
  getVault(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.vaultService.getVault(tenantId, id);
  }

  // ── Safe CRUD ─────────────────────────────────────────────────────────────

  @Post('safes')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Add a safe to a vault' })
  createSafe(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSafeDto,
  ) {
    return this.vaultService.createSafe(tenantId, dto, user.id);
  }

  // ── Tray CRUD ─────────────────────────────────────────────────────────────

  @Post('trays')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Add a tray to a safe' })
  createTray(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTrayDto,
  ) {
    return this.vaultService.createTray(tenantId, dto, user.id);
  }

  // ── Slot CRUD ─────────────────────────────────────────────────────────────

  @Post('slots')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Bulk create slots in a tray' })
  createSlots(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSlotsDto,
  ) {
    return this.vaultService.createSlots(tenantId, dto, user.id);
  }

  @Get('slots')
  @RequirePermissions(Permission.GIRVI_VIEW)
  @ApiOperation({ summary: 'List slots in a tray' })
  listSlots(
    @TenantId() tenantId: string,
    @Query('trayId') trayId: string,
  ) {
    return this.vaultService.listSlots(tenantId, trayId);
  }

  @Get('slots/available')
  @RequirePermissions(Permission.GIRVI_VIEW)
  @ApiOperation({ summary: 'Find available slots (optionally filter by vault)' })
  findAvailableSlots(
    @TenantId() tenantId: string,
    @Query('vaultId') vaultId?: string,
  ) {
    return this.vaultService.findAvailableSlots(tenantId, vaultId);
  }

  // ── Occupancy ─────────────────────────────────────────────────────────────

  @Get('occupancy')
  @RequirePermissions(Permission.GIRVI_VIEW)
  @ApiOperation({ summary: 'Vault occupancy summary — total, occupied, available' })
  getOccupancy(@TenantId() tenantId: string) {
    return this.vaultService.getOccupancySummary(tenantId);
  }

  // ── Assignment ────────────────────────────────────────────────────────────

  @Post('assign')
  @RequirePermissions(Permission.GIRVI_UPDATE)
  @ApiOperation({ summary: 'Assign a slot to a girvi' })
  assignSlot(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AssignSlotDto,
  ) {
    return this.vaultService.assignSlot(tenantId, dto.girviId, dto.slotId, user.id);
  }

  @Post('release/:girviId')
  @RequirePermissions(Permission.GIRVI_UPDATE)
  @ApiOperation({ summary: 'Release vault slot for a girvi (on redemption)' })
  releaseSlot(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Param('girviId') girviId: string,
  ) {
    return this.vaultService.releaseSlot(tenantId, girviId, user.id);
  }

  @Get('assignment/:girviId')
  @RequirePermissions(Permission.GIRVI_VIEW)
  @ApiOperation({ summary: 'Get current vault assignment for a girvi' })
  getAssignment(
    @TenantId() tenantId: string,
    @Param('girviId') girviId: string,
  ) {
    return this.vaultService.getAssignment(tenantId, girviId);
  }

  @Get('search')
  @RequirePermissions(Permission.GIRVI_VIEW)
  @ApiOperation({ summary: 'Search vault by girvi ID or girvi number' })
  search(
    @TenantId() tenantId: string,
    @Query('girviId') girviId: string,
  ) {
    return this.vaultService.searchByGirvi(tenantId, girviId);
  }
}
