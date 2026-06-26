import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../../audit/audit.service';
import { InventoryRepository } from '../repositories/inventory.repository';
import {
  CreateCategoryDto,
  CreateInventoryItemDto,
  InventoryQueryDto,
  StockAdjustmentDto,
  UpdateInventoryItemDto,
} from '../dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepo: InventoryRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createCategory(tenantId: string, dto: CreateCategoryDto, createdBy: string) {
    const category = await this.inventoryRepo.createCategory(tenantId, {
      name: dto.name,
      hsnCode: dto.hsnCode,
      metalType: dto.metalType,
      gstRate: dto.gstRate,
    });

    await this.auditService.log({
      tenantId,
      userId: createdBy,
      action: 'CREATE',
      module: 'inventory',
      entityId: category.id,
      entityType: 'InventoryCategory',
      newValues: { name: dto.name, metalType: dto.metalType },
    });

    return category;
  }

  async listCategories(tenantId: string) {
    return this.inventoryRepo.findCategories(tenantId);
  }

  async createItem(tenantId: string, dto: CreateInventoryItemDto, createdBy: string) {
    const item = await this.inventoryRepo.createItem(tenantId, createdBy, {
      categoryId: dto.categoryId,
      branchId: dto.branchId,
      name: dto.name,
      metalType: dto.metalType,
      purity: dto.purity,
      grossWeight: dto.grossWeight,
      netWeight: dto.netWeight,
      stoneWeight: dto.stoneWeight,
      makingCharges: dto.makingCharges,
      wastage: dto.wastage,
      huId: dto.huId,
      bisNumber: dto.bisNumber,
      photoUrls: dto.photoUrls,
      purchaseCost: dto.purchaseCost,
      quantity: dto.quantity,
      reorderLevel: dto.reorderLevel,
      notes: dto.notes,
    });

    await this.auditService.log({
      tenantId,
      userId: createdBy,
      action: 'CREATE',
      module: 'inventory',
      entityId: item.id,
      entityType: 'InventoryItem',
      newValues: { sku: item.sku, name: item.name, metalType: item.metalType },
    });

    this.eventEmitter.emit('inventory.item.created', { tenantId, itemId: item.id });
    return item;
  }

  async findAll(tenantId: string, query: InventoryQueryDto) {
    return this.inventoryRepo.findMany(tenantId, query);
  }

  async findById(tenantId: string, id: string) {
    const item = await this.inventoryRepo.findById(tenantId, id);
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async findBySku(tenantId: string, sku: string) {
    const item = await this.inventoryRepo.findBySku(tenantId, sku);
    if (!item) throw new NotFoundException(`Item with SKU ${sku} not found`);
    return item;
  }

  async update(tenantId: string, id: string, dto: UpdateInventoryItemDto, updatedBy: string) {
    await this.findById(tenantId, id);
    const updated = await this.inventoryRepo.update(tenantId, id, dto);

    await this.auditService.log({
      tenantId,
      userId: updatedBy,
      action: 'UPDATE',
      module: 'inventory',
      entityId: id,
      entityType: 'InventoryItem',
      newValues: dto as Record<string, unknown>,
    });

    return updated;
  }

  async adjustStock(
    tenantId: string,
    itemId: string,
    dto: StockAdjustmentDto,
    adjustedBy: string,
  ) {
    const adjustment = await this.inventoryRepo.adjustStock(
      tenantId,
      itemId,
      dto.quantityChange,
      dto.reason,
      adjustedBy,
    );

    await this.auditService.log({
      tenantId,
      userId: adjustedBy,
      action: 'UPDATE',
      module: 'inventory',
      entityId: itemId,
      entityType: 'StockAdjustment',
      newValues: { quantityChange: dto.quantityChange, reason: dto.reason },
    });

    this.eventEmitter.emit('inventory.stock.adjusted', { tenantId, itemId, quantityChange: dto.quantityChange });
    return adjustment;
  }

  async getLowStockAlerts(tenantId: string) {
    return this.inventoryRepo.getLowStockItems(tenantId);
  }

  async revalueAtCurrentRate(tenantId: string, goldRatePerGram: number, updatedBy: string) {
    const count = await this.inventoryRepo.revalueByGoldRate(tenantId, goldRatePerGram);

    await this.auditService.log({
      tenantId,
      userId: updatedBy,
      action: 'UPDATE',
      module: 'inventory',
      entityId: tenantId,
      entityType: 'InventoryBulkRevalue',
      newValues: { goldRatePerGram, itemsUpdated: count },
    });

    return { itemsRevalued: count, goldRatePerGram };
  }

  async softDelete(tenantId: string, id: string, deletedBy: string) {
    await this.findById(tenantId, id);
    await this.inventoryRepo.softDelete(tenantId, id, deletedBy);

    await this.auditService.log({
      tenantId,
      userId: deletedBy,
      action: 'DELETE',
      module: 'inventory',
      entityId: id,
      entityType: 'InventoryItem',
    });
  }
}
