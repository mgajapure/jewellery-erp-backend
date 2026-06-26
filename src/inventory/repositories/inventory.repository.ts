import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import { InventoryQueryDto } from '../dto/inventory.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(tenantId: string, data: {
    name: string;
    hsnCode?: string;
    metalType: string;
    gstRate: number;
  }) {
    return this.prisma.inventoryCategory.create({
      data: {
        tenantId,
        name: data.name,
        hsnCode: data.hsnCode,
        metalType: data.metalType as never,
        gstRate: data.gstRate,
      },
    });
  }

  async findCategories(tenantId: string) {
    return this.prisma.inventoryCategory.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { items: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createItem(tenantId: string, createdBy: string, data: {
    categoryId: string;
    branchId?: string;
    name: string;
    metalType: string;
    purity: string;
    grossWeight: number;
    netWeight: number;
    stoneWeight?: number;
    makingCharges?: number;
    wastage?: number;
    huId?: string;
    bisNumber?: string;
    photoUrls?: string[];
    purchaseCost?: number;
    quantity?: number;
    reorderLevel?: number;
    notes?: string;
  }) {
    const sku = `SKU-${data.metalType.slice(0, 2)}-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;

    return this.prisma.inventoryItem.create({
      data: {
        tenantId,
        categoryId: data.categoryId,
        branchId: data.branchId,
        sku,
        name: data.name,
        metalType: data.metalType as never,
        purity: data.purity,
        grossWeight: data.grossWeight,
        netWeight: data.netWeight,
        stoneWeight: data.stoneWeight ?? 0,
        makingCharges: data.makingCharges ?? 0,
        wastage: data.wastage ?? 0,
        huId: data.huId,
        bisNumber: data.bisNumber,
        photoUrls: data.photoUrls ?? [],
        purchaseCost: data.purchaseCost ?? 0,
        quantity: data.quantity ?? 1,
        reorderLevel: data.reorderLevel ?? 0,
        notes: data.notes,
        createdBy,
        currentValue: 0, // will be revalued by gold rate
      },
      include: { category: true },
    });
  }

  async findMany(tenantId: string, query: InventoryQueryDto) {
    const where: Prisma.InventoryItemWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.metalType && { metalType: query.metalType as never }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.purity && { purity: query.purity }),
      ...(query.lowStock && { quantity: { lte: this.prisma.inventoryItem.fields.reorderLevel as never } }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { sku: { contains: query.search, mode: 'insensitive' } },
          { huId: { contains: query.search, mode: 'insensitive' } },
          { bisNumber: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { name: true, hsnCode: true, gstRate: true } } },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  async findBySku(tenantId: string, sku: string) {
    return this.prisma.inventoryItem.findFirst({
      where: { tenantId, sku, deletedAt: null },
      include: { category: true, adjustments: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.inventoryItem.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        category: true,
        adjustments: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
  }

  async update(tenantId: string, id: string, data: Partial<{
    name: string;
    makingCharges: number;
    purchaseCost: number;
    reorderLevel: number;
    isAvailable: boolean;
    photoUrls: string[];
    notes: string;
    currentValue: number;
  }>) {
    return this.prisma.inventoryItem.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async adjustStock(tenantId: string, itemId: string, quantityChange: number, reason: string, adjustedBy: string) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findFirstOrThrow({
        where: { id: itemId, tenantId, deletedAt: null },
      });

      const newQuantity = item.quantity + quantityChange;
      if (newQuantity < 0) {
        throw new Error(`Insufficient stock. Current: ${item.quantity}, Reduction requested: ${Math.abs(quantityChange)}`);
      }

      const adjustment = await tx.stockAdjustment.create({
        data: { tenantId, itemId, quantityChange, reason, adjustedBy },
      });

      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: newQuantity },
      });

      return adjustment;
    });
  }

  async getLowStockItems(tenantId: string) {
    return this.prisma.$queryRaw<Array<{ id: string; sku: string; name: string; quantity: number; reorder_level: number }>>`
      SELECT id, sku, name, quantity, reorder_level
      FROM inventory_items
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND quantity <= reorder_level
        AND reorder_level > 0
      ORDER BY quantity ASC
    `;
  }

  async revalueByGoldRate(tenantId: string, goldRatePerGram: number): Promise<number> {
    // Revalue all active gold/silver items at new live rate
    const items = await this.prisma.inventoryItem.findMany({
      where: { tenantId, deletedAt: null, metalType: { in: ['GOLD', 'SILVER'] as never[] } },
      select: { id: true, netWeight: true, makingCharges: true },
    });

    for (const item of items) {
      const metalValue = Number(item.netWeight) * goldRatePerGram;
      const totalValue = metalValue + Number(item.makingCharges);
      await this.prisma.inventoryItem.update({
        where: { id: item.id },
        data: { currentValue: totalValue },
      });
    }

    return items.length;
  }

  async softDelete(tenantId: string, id: string, deletedBy: string) {
    return this.prisma.inventoryItem.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy, isAvailable: false },
    });
  }
}
