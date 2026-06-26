import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateGrnDto, CreatePoDto, CreateVendorDto, PurchaseQueryDto } from '../dto/purchase.dto';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import dayjs from 'dayjs';

@Injectable()
export class PurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── Vendor ──────────────────────────────────────────────────────────────────

  async createVendor(tenantId: string, dto: CreateVendorDto, createdBy: string) {
    const vendor = await this.prisma.vendor.create({
      data: { tenantId, ...dto },
    });

    await this.auditService.log({
      tenantId, userId: createdBy, action: 'CREATE', module: 'purchase',
      entityId: vendor.id, entityType: 'Vendor', newValues: { name: dto.name },
    });

    return vendor;
  }

  async findVendors(tenantId: string) {
    return this.prisma.vendor.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findVendorById(tenantId: string, id: string) {
    const v = await this.prisma.vendor.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!v) throw new NotFoundException('Vendor not found');
    return v;
  }

  // ── Purchase Orders ─────────────────────────────────────────────────────────

  async createPo(tenantId: string, dto: CreatePoDto, createdBy: string) {
    await this.findVendorById(tenantId, dto.vendorId);

    const totalAmount = dto.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const poNumber = `PO-${dayjs().format('YYYYMMDD')}-${Date.now().toString(36).toUpperCase()}`;

    const po = await this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        poNumber,
        vendorId: dto.vendorId,
        orderDate: new Date(),
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        totalAmount,
        notes: dto.notes,
        createdBy,
        items: {
          create: dto.items.map((i) => ({
            tenantId,
            description: i.description,
            metalType: i.metalType as never,
            purity: i.purity,
            estimatedWeight: i.estimatedWeight,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalAmount: i.unitPrice * i.quantity,
          })),
        },
      },
      include: { vendor: { select: { name: true } }, items: true },
    });

    await this.auditService.log({
      tenantId, userId: createdBy, action: 'CREATE', module: 'purchase',
      entityId: po.id, entityType: 'PurchaseOrder', newValues: { poNumber, totalAmount },
    });

    return po;
  }

  async approvePo(tenantId: string, poId: string, approvedBy: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, tenantId, deletedAt: null },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');
    if (po.status !== 'DRAFT') throw new BadRequestException(`PO is already ${po.status}`);

    const updated = await this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: 'APPROVED', approvedBy, approvedAt: new Date() },
    });

    await this.auditService.log({
      tenantId, userId: approvedBy, action: 'APPROVE', module: 'purchase',
      entityId: poId, entityType: 'PurchaseOrder', newValues: { status: 'APPROVED' },
    });

    this.eventEmitter.emit('purchase.po.approved', { tenantId, poId });
    return updated;
  }

  async findPos(tenantId: string, query: PurchaseQueryDto) {
    const where = {
      tenantId,
      deletedAt: null,
      ...(query.vendorId && { vendorId: query.vendorId }),
      ...(query.status && { status: query.status as never }),
    };

    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { vendor: { select: { name: true } }, _count: { select: { items: true, grns: true } } },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  async findPoById(tenantId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        vendor: true,
        items: true,
        grns: { include: { items: true } },
      },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');
    return po;
  }

  // ── GRN (Goods Receipt Note) ─────────────────────────────────────────────────

  async createGrn(tenantId: string, dto: CreateGrnDto, receivedBy: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: dto.purchaseOrderId, tenantId, deletedAt: null },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');
    if (po.status !== 'APPROVED') throw new BadRequestException('PO must be approved before GRN');

    const grnNumber = `GRN-${dayjs().format('YYYYMMDD')}-${Date.now().toString(36).toUpperCase()}`;

    const grn = await this.prisma.goodsReceiptNote.create({
      data: {
        tenantId,
        purchaseOrderId: dto.purchaseOrderId,
        grnNumber,
        receivedDate: new Date(),
        receivedBy,
        notes: dto.notes,
        items: {
          create: dto.items.map((i) => ({
            tenantId,
            description: i.description,
            metalType: i.metalType as never,
            purity: i.purity,
            grossWeight: i.grossWeight,
            netWeight: i.netWeight,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: { items: true, purchaseOrder: { select: { poNumber: true } } },
    });

    // Mark PO as received
    await this.prisma.purchaseOrder.update({
      where: { id: dto.purchaseOrderId },
      data: { status: 'RECEIVED' },
    });

    await this.auditService.log({
      tenantId, userId: receivedBy, action: 'CREATE', module: 'purchase',
      entityId: grn.id, entityType: 'GoodsReceiptNote', newValues: { grnNumber, poId: dto.purchaseOrderId },
    });

    this.eventEmitter.emit('purchase.grn.created', { tenantId, grnId: grn.id, poId: dto.purchaseOrderId });
    return grn;
  }

  async findGrnsByPo(tenantId: string, poId: string) {
    return this.prisma.goodsReceiptNote.findMany({
      where: { tenantId, purchaseOrderId: poId },
      include: { items: true },
      orderBy: { receivedDate: 'desc' },
    });
  }
}
