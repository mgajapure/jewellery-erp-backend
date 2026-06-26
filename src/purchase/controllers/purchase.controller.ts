import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { PurchaseService } from '../services/purchase.service';
import {
  CreateGrnDto,
  CreatePoDto,
  CreateVendorDto,
  PurchaseQueryDto,
} from '../dto/purchase.dto';

@ApiTags('Purchase')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  // ── Vendors ─────────────────────────────────────────────────────────────────

  @Post('vendors')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Create a vendor' })
  createVendor(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateVendorDto,
  ) {
    return this.purchaseService.createVendor(tenantId, dto, user.id);
  }

  @Get('vendors')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'List all active vendors' })
  listVendors(@TenantId() tenantId: string) {
    return this.purchaseService.findVendors(tenantId);
  }

  @Get('vendors/:id')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get vendor details' })
  findVendor(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.purchaseService.findVendorById(tenantId, id);
  }

  // ── Purchase Orders ─────────────────────────────────────────────────────────

  @Post('orders')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Create a purchase order (DRAFT state)' })
  createPo(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePoDto,
  ) {
    return this.purchaseService.createPo(tenantId, dto, user.id);
  }

  @Get('orders')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'List purchase orders with vendor / status filters' })
  findPos(@TenantId() tenantId: string, @Query() query: PurchaseQueryDto) {
    return this.purchaseService.findPos(tenantId, query);
  }

  @Get('orders/:id')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get PO details with GRNs' })
  findPo(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.purchaseService.findPoById(tenantId, id);
  }

  @Patch('orders/:id/approve')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Approve PO — required before GRN can be created' })
  approvePo(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.purchaseService.approvePo(tenantId, id, user.id);
  }

  // ── GRN ─────────────────────────────────────────────────────────────────────

  @Post('grn')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Create GRN (actual receipt vs PO) — marks PO as RECEIVED' })
  createGrn(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateGrnDto,
  ) {
    return this.purchaseService.createGrn(tenantId, dto, user.id);
  }

  @Get('orders/:poId/grn')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get all GRNs for a Purchase Order' })
  getGrns(@TenantId() tenantId: string, @Param('poId') poId: string) {
    return this.purchaseService.findGrnsByPo(tenantId, poId);
  }
}
