import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateCustomOrderDto, CustomOrderQueryDto, RecordMilestonePaymentDto, UpdateCustomOrderDto } from '../dto/custom-order.dto';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import dayjs from 'dayjs';

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ADVANCE_PAID', 'CANCELLED'],
  ADVANCE_PAID: ['DESIGN_APPROVED', 'CANCELLED'],
  DESIGN_APPROVED: ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['READY'],
  READY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class CustomOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createOrder(tenantId: string, dto: CreateCustomOrderDto, createdBy: string) {
    const orderNumber = `CO-${dayjs().format('YYYYMMDD')}-${Date.now().toString(36).toUpperCase()}`;
    const order = await this.prisma.customOrder.create({
      data: {
        tenantId,
        orderNumber,
        customerId: dto.customerId,
        description: dto.description,
        designPhotoUrls: dto.designPhotoUrls ?? [],
        metalType: dto.metalType as never,
        purity: dto.purity,
        estimatedWeight: dto.estimatedWeight,
        makingCharges: dto.makingCharges,
        estimatedAmount: dto.estimatedAmount,
        promisedDate: dto.promisedDate ? new Date(dto.promisedDate) : undefined,
        notes: dto.notes,
        createdBy,
      },
      include: { customer: { select: { name: true, mobile: true } } },
    });
    await this.auditService.log({ tenantId, userId: createdBy, action: 'CREATE', module: 'custom_orders', entityId: order.id, entityType: 'CustomOrder', newValues: { orderNumber } });
    return order;
  }

  async findOrders(tenantId: string, query: CustomOrderQueryDto) {
    const where: any = {
      tenantId, deletedAt: null,
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.status && { status: query.status as never }),
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customOrder.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, mobile: true } },
          milestonePayments: { orderBy: { paidAt: 'asc' } },
        },
      }),
      this.prisma.customOrder.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async findOrderById(tenantId: string, id: string) {
    const order = await this.prisma.customOrder.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { customer: true, milestonePayments: { orderBy: { paidAt: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Custom order not found');
    return order;
  }

  async updateOrder(tenantId: string, id: string, dto: UpdateCustomOrderDto, updatedBy: string) {
    const order = await this.findOrderById(tenantId, id);

    if (dto.status && dto.status !== order.status) {
      const allowed = VALID_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(`Cannot transition from ${order.status} to ${dto.status}`);
      }
    }

    const updateData: any = { ...dto };
    if (dto.status === 'DESIGN_APPROVED') updateData.designApprovedAt = new Date();
    if (dto.status === 'DELIVERED') updateData.deliveredAt = new Date();

    const updated = await this.prisma.customOrder.update({ where: { id }, data: updateData });
    await this.auditService.log({ tenantId, userId: updatedBy, action: 'UPDATE', module: 'custom_orders', entityId: id, entityType: 'CustomOrder', oldValues: { status: order.status }, newValues: dto as Record<string, unknown> });
    this.eventEmitter.emit('custom_order.status.changed', { tenantId, orderId: id, status: dto.status });
    return updated;
  }

  async recordMilestonePayment(tenantId: string, orderId: string, dto: RecordMilestonePaymentDto, recordedBy: string) {
    await this.findOrderById(tenantId, orderId);
    const payment = await this.prisma.customOrderPayment.create({
      data: {
        tenantId, customOrderId: orderId,
        milestone: dto.milestone, amount: dto.amount,
        paymentMode: dto.paymentMode as never,
        paidAt: new Date(), recordedBy,
      },
    });
    await this.auditService.log({ tenantId, userId: recordedBy, action: 'CREATE', module: 'custom_orders', entityId: orderId, entityType: 'CustomOrderPayment', newValues: { milestone: dto.milestone, amount: dto.amount } });
    return payment;
  }

  async getProfitReport(tenantId: string, orderId: string) {
    const order = await this.findOrderById(tenantId, orderId);
    const totalPaid = order.milestonePayments.reduce((s, p) => s + Number(p.amount), 0);
    const finalAmt = Number(order.finalAmount ?? order.estimatedAmount ?? 0);
    const balance = finalAmt - totalPaid;
    const estimatedCost = Number(order.makingCharges ?? 0);
    const grossProfit = finalAmt - estimatedCost;
    return { orderId, orderNumber: order.orderNumber, finalAmount: finalAmt, totalPaid, balance, estimatedCost, grossProfit };
  }

  async getDelayedOrders(tenantId: string) {
    return this.prisma.customOrder.findMany({
      where: {
        tenantId, deletedAt: null,
        status: { notIn: ['DELIVERED', 'CANCELLED'] as never[] },
        promisedDate: { lt: new Date() },
      },
      include: { customer: { select: { name: true, mobile: true } } },
      orderBy: { promisedDate: 'asc' },
    });
  }
}
