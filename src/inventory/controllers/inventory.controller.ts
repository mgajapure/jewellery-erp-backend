import {
  Body,
  Controller,
  Delete,
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
import { InventoryService } from '../services/inventory.service';
import {
  CreateCategoryDto,
  CreateInventoryItemDto,
  InventoryQueryDto,
  StockAdjustmentDto,
  UpdateInventoryItemDto,
} from '../dto/inventory.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ── Categories ──────────────────────────────────────────────────────────────

  @Post('categories')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Create inventory category (gold/silver/diamond/gem)' })
  createCategory(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCategoryDto,
  ) {
    return this.inventoryService.createCategory(tenantId, dto, user.id);
  }

  @Get('categories')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'List all inventory categories' })
  listCategories(@TenantId() tenantId: string) {
    return this.inventoryService.listCategories(tenantId);
  }

  // ── Items ───────────────────────────────────────────────────────────────────

  @Post()
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Add inventory item (SKU auto-generated)' })
  createItem(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateInventoryItemDto,
  ) {
    return this.inventoryService.createItem(tenantId, dto, user.id);
  }

  @Get()
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'List inventory with filters (metal type, purity, low stock, search)' })
  findAll(@TenantId() tenantId: string, @Query() query: InventoryQueryDto) {
    return this.inventoryService.findAll(tenantId, query);
  }

  @Get('low-stock')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get items at or below reorder level' })
  getLowStock(@TenantId() tenantId: string) {
    return this.inventoryService.getLowStockAlerts(tenantId);
  }

  @Get('sku/:sku')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Lookup item by SKU or barcode scan' })
  findBySku(@TenantId() tenantId: string, @Param('sku') sku: string) {
    return this.inventoryService.findBySku(tenantId, sku);
  }

  @Get(':id')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get inventory item details with adjustment history' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.inventoryService.findById(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Update inventory item details' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.update(tenantId, id, dto, user.id);
  }

  @Post(':id/adjust-stock')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Adjust stock quantity (positive=add, negative=reduce) with audit trail' })
  adjustStock(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: StockAdjustmentDto,
  ) {
    return this.inventoryService.adjustStock(tenantId, id, dto, user.id);
  }

  @Post('revalue')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Revalue all gold/silver items at current market rate' })
  revalue(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() body: { goldRatePerGram: number },
  ) {
    return this.inventoryService.revalueAtCurrentRate(tenantId, body.goldRatePerGram, user.id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Soft-delete inventory item' })
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.inventoryService.softDelete(tenantId, id, user.id);
  }
}
