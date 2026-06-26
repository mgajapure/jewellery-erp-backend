import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { InventoryRepository } from '../../inventory/repositories/inventory.repository';
import { CreateSaleDto, SaleQueryDto } from '../dto/sale.dto';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';

// GST rates: gold 3%, diamond 18%, making charges 5%
const GST_RATES: Record<string, number> = {
  GOLD: 3,
  SILVER: 3,
  PLATINUM: 3,
  DIAMOND: 18,
  OTHER: 18,
};

@Injectable()
export class SaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryRepo: InventoryRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(tenantId: string, dto: CreateSaleDto, createdBy: string) {
    const billNumber = `BILL-${dayjs().format('YYYYMMDD')}-${Date.now().toString(36).toUpperCase()}`;

    // Resolve items and calculate GST
    const resolvedItems = await Promise.all(
      dto.items.map(async (item) => {
        const inventoryItem = await this.inventoryRepo.findById(tenantId, item.inventoryItemId);
        if (!inventoryItem) throw new NotFoundException(`Item ${item.inventoryItemId} not found`);
        if (!inventoryItem.isAvailable) throw new BadRequestException(`Item ${inventoryItem.sku} is not available`);

        const gstRate = inventoryItem.category?.gstRate
          ? Number(inventoryItem.category.gstRate)
          : (GST_RATES[inventoryItem.metalType] ?? 3);

        const hsnCode = inventoryItem.category?.hsnCode ?? undefined;
        const lineTotal = (item.unitPrice + (item.makingCharges ?? 0) + (item.stoneCharges ?? 0) + (item.wastageAmount ?? 0)) * item.quantity;
        const gstAmount = parseFloat(((lineTotal * gstRate) / 100).toFixed(2));

        return {
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          makingCharges: item.makingCharges ?? 0,
          stoneCharges: item.stoneCharges ?? 0,
          wastageAmount: item.wastageAmount ?? 0,
          gstRate,
          gstAmount,
          hsnCode,
          lineTotal,
          totalAmount: parseFloat((lineTotal + gstAmount).toFixed(2)),
        };
      }),
    );

    const subTotal = resolvedItems.reduce((s, i) => s + i.lineTotal, 0);
    const totalGst = resolvedItems.reduce((s, i) => s + i.gstAmount, 0);
    const discountAmount = dto.discountAmount ?? 0;
    // Split GST: within state = CGST+SGST 50/50; inter-state = IGST (simplified: all intra-state for now)
    const cgst = parseFloat((totalGst / 2).toFixed(2));
    const sgst = parseFloat((totalGst / 2).toFixed(2));
    const totalAmount = parseFloat((subTotal + totalGst - discountAmount).toFixed(2));

    const sale = await this.prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          billNumber,
          customerId: dto.customerId,
          status: 'COMPLETED',
          saleDate: new Date(),
          subTotal,
          discountAmount,
          cgst,
          sgst,
          igst: 0,
          totalAmount,
          paymentMode: dto.paymentMode as never,
          notes: dto.notes,
          createdBy,
          items: {
            create: resolvedItems.map((i) => ({
              tenantId,
              inventoryItemId: i.inventoryItemId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              makingCharges: i.makingCharges,
              stoneCharges: i.stoneCharges,
              wastageAmount: i.wastageAmount,
              gstRate: i.gstRate,
              gstAmount: i.gstAmount,
              hsnCode: i.hsnCode,
              totalAmount: i.totalAmount,
            })),
          },
          payments: {
            create: [{
              tenantId,
              amount: totalAmount,
              mode: dto.paymentMode as never,
              paidAt: new Date(),
            }],
          },
        },
        include: {
          items: { include: { inventoryItem: { select: { sku: true, name: true } } } },
          customer: { select: { name: true, mobile: true } },
          payments: true,
        },
      });

      // Mark inventory items as sold (quantity decrement)
      for (const item of resolvedItems) {
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: {
            quantity: { decrement: item.quantity },
            isAvailable: false,
          },
        });
      }

      return newSale;
    });

    await this.auditService.log({
      tenantId,
      userId: createdBy,
      action: 'CREATE',
      module: 'sales',
      entityId: sale.id,
      entityType: 'Sale',
      newValues: { billNumber, totalAmount, itemCount: resolvedItems.length },
    });

    this.eventEmitter.emit('sale.completed', { tenantId, saleId: sale.id, customerId: dto.customerId });
    return sale;
  }

  async findAll(tenantId: string, query: SaleQueryDto) {
    const where: Prisma.SaleWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.from && query.to && {
        saleDate: { gte: new Date(query.from), lte: new Date(query.to) },
      }),
      ...(query.search && {
        OR: [
          { billNumber: { contains: query.search, mode: 'insensitive' } },
          { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        skip,
        take,
        orderBy: { saleDate: 'desc' },
        include: {
          customer: { select: { name: true, mobile: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  async findById(tenantId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        items: {
          include: {
            inventoryItem: { select: { sku: true, name: true, purity: true, metalType: true } },
          },
        },
        customer: true,
        payments: true,
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  // GSTR-1 export data for a given month
  async getGstr1Data(tenantId: string, year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59);

    const sales = await this.prisma.sale.findMany({
      where: { tenantId, saleDate: { gte: from, lte: to }, deletedAt: null },
      include: {
        items: { select: { hsnCode: true, gstRate: true, gstAmount: true, totalAmount: true, quantity: true } },
        customer: { select: { name: true } },
      },
    });

    // HSN summary for GSTR-1
    const hsnSummary: Record<string, { taxableValue: number; igst: number; cgst: number; sgst: number; quantity: number }> = {};

    for (const sale of sales) {
      for (const item of sale.items) {
        const hsn = item.hsnCode ?? 'NA';
        if (!hsnSummary[hsn]) {
          hsnSummary[hsn] = { taxableValue: 0, igst: 0, cgst: 0, sgst: 0, quantity: 0 };
        }
        const taxable = Number(item.totalAmount) - Number(item.gstAmount);
        hsnSummary[hsn].taxableValue += taxable;
        hsnSummary[hsn].cgst += Number(item.gstAmount) / 2;
        hsnSummary[hsn].sgst += Number(item.gstAmount) / 2;
        hsnSummary[hsn].quantity += item.quantity;
      }
    }

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      totalSales: sales.length,
      totalTaxableValue: sales.reduce((s, sale) => s + Number(sale.subTotal), 0),
      totalCgst: sales.reduce((s, sale) => s + Number(sale.cgst), 0),
      totalSgst: sales.reduce((s, sale) => s + Number(sale.sgst), 0),
      totalGst: sales.reduce((s, sale) => s + Number(sale.cgst) + Number(sale.sgst), 0),
      hsnSummary,
      invoices: sales.map((s) => ({
        billNumber: s.billNumber,
        date: s.saleDate,
        customerName: s.customer?.name ?? 'Walk-in',
        taxableValue: Number(s.subTotal),
        cgst: Number(s.cgst),
        sgst: Number(s.sgst),
        total: Number(s.totalAmount),
      })),
    };
  }

  // GSTR-3B aggregate data
  async getGstr3bData(tenantId: string, year: number, month: number) {
    const gstr1 = await this.getGstr1Data(tenantId, year, month);
    return {
      period: gstr1.period,
      outwardSupplies: {
        taxableValue: gstr1.totalTaxableValue,
        cgst: gstr1.totalCgst,
        sgst: gstr1.totalSgst,
        igst: 0,
        total: gstr1.totalTaxableValue + gstr1.totalGst,
      },
    };
  }
}
