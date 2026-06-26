import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  CreateJobCardDto, CreateKarigarDto, IssueMaterialDto, JobCardQueryDto,
  KarigarQueryDto, ReceiveMaterialDto, RecordKarigarPaymentDto,
} from '../dto/karigar.dto';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import dayjs from 'dayjs';

@Injectable()
export class KarigarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── Karigar Master ───────────────────────────────────────────────────────────

  async createKarigar(tenantId: string, dto: CreateKarigarDto, createdBy: string) {
    const karigar = await this.prisma.karigar.create({
      data: { tenantId, ...dto },
    });
    await this.auditService.log({ tenantId, userId: createdBy, action: 'CREATE', module: 'karigar', entityId: karigar.id, entityType: 'Karigar', newValues: { name: dto.name } });
    return karigar;
  }

  async findKarigars(tenantId: string, query: KarigarQueryDto) {
    const where = {
      tenantId,
      isActive: true,
      deletedAt: null,
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { mobile: { contains: query.search } },
          { specialization: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.karigar.findMany({ where, skip, take, orderBy: { name: 'asc' }, include: { _count: { select: { jobCards: true } } } }),
      this.prisma.karigar.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async findKarigarById(tenantId: string, id: string) {
    const k = await this.prisma.karigar.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { jobCards: { where: { status: { not: 'COMPLETED' } }, take: 10 } },
    });
    if (!k) throw new NotFoundException('Karigar not found');
    return k;
  }

  async getKarigarLedger(tenantId: string, karigarId: string) {
    const payments = await this.prisma.karigarPayment.findMany({
      where: { tenantId, jobCard: { karigarId } },
      include: { jobCard: { select: { jobNumber: true, description: true } } },
      orderBy: { paidAt: 'desc' },
    });
    const outstanding = await this.prisma.jobCard.aggregate({
      where: { tenantId, karigarId, status: { not: 'COMPLETED' } },
      _sum: { makingCharge: true },
    });
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    return { payments, totalPaid, outstanding: Number(outstanding._sum.makingCharge ?? 0) };
  }

  // ── Job Cards ────────────────────────────────────────────────────────────────

  async createJobCard(tenantId: string, dto: CreateJobCardDto, createdBy: string) {
    const jobNumber = `JOB-${dayjs().format('YYYYMMDD')}-${Date.now().toString(36).toUpperCase()}`;
    const job = await this.prisma.jobCard.create({
      data: {
        tenantId,
        jobNumber,
        karigarId: dto.karigarId,
        customOrderId: dto.customOrderId,
        description: dto.description,
        designPhotoUrls: dto.designPhotoUrls ?? [],
        metalType: dto.metalType as never,
        purity: dto.purity,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        notes: dto.notes,
        createdBy,
      },
      include: { karigar: { select: { name: true } } },
    });
    await this.auditService.log({ tenantId, userId: createdBy, action: 'CREATE', module: 'karigar', entityId: job.id, entityType: 'JobCard', newValues: { jobNumber } });
    return job;
  }

  async findJobCards(tenantId: string, query: JobCardQueryDto) {
    const where = {
      tenantId,
      deletedAt: null,
      ...(query.karigarId && { karigarId: query.karigarId }),
      ...(query.status && { status: query.status as never }),
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.jobCard.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: { karigar: { select: { name: true } } },
      }),
      this.prisma.jobCard.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async findJobById(tenantId: string, id: string) {
    const job = await this.prisma.jobCard.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        karigar: true,
        materialIssues: { orderBy: { issuedAt: 'asc' } },
        materialReceipts: { orderBy: { receivedAt: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
    if (!job) throw new NotFoundException('Job card not found');
    return job;
  }

  // ── Material Issue / Receipt ─────────────────────────────────────────────────

  async issueMaterial(tenantId: string, jobId: string, dto: IssueMaterialDto, issuedBy: string) {
    const job = await this.findJobById(tenantId, jobId);
    if (['COMPLETED', 'CANCELLED'].includes(job.status)) {
      throw new BadRequestException(`Cannot issue material for ${job.status} job`);
    }

    const [issue] = await this.prisma.$transaction([
      this.prisma.materialIssue.create({
        data: { tenantId, jobCardId: jobId, metalType: dto.metalType as never, purity: dto.purity, grossWeight: dto.grossWeight, netWeight: dto.netWeight, issuedBy, notes: dto.notes },
      }),
      this.prisma.jobCard.update({
        where: { id: jobId },
        data: { status: 'MATERIAL_ISSUED', issuedWeight: { increment: dto.netWeight } },
      }),
    ]);

    await this.auditService.log({ tenantId, userId: issuedBy, action: 'UPDATE', module: 'karigar', entityId: jobId, entityType: 'MaterialIssue', newValues: { netWeight: dto.netWeight } });
    return issue;
  }

  async receiveMaterial(tenantId: string, jobId: string, dto: ReceiveMaterialDto, receivedBy: string) {
    const job = await this.findJobById(tenantId, jobId);
    if (!['MATERIAL_ISSUED', 'IN_PROGRESS'].includes(job.status)) {
      throw new BadRequestException('Material must be issued before receipt');
    }

    const totalIssued = Number(job.issuedWeight) + dto.netWeight;
    const totalReceived = Number(job.receivedWeight) + dto.netWeight;
    const wastage = Number(job.issuedWeight) - dto.netWeight;
    const wastagePercent = Number(job.issuedWeight) > 0
      ? parseFloat(((wastage / Number(job.issuedWeight)) * 100).toFixed(2))
      : 0;

    const [receipt] = await this.prisma.$transaction([
      this.prisma.materialReceipt.create({
        data: { tenantId, jobCardId: jobId, metalType: dto.metalType as never, purity: dto.purity, grossWeight: dto.grossWeight, netWeight: dto.netWeight, receivedBy, notes: dto.notes },
      }),
      this.prisma.jobCard.update({
        where: { id: jobId },
        data: { status: 'RECEIVED', receivedWeight: { increment: dto.netWeight }, wastageWeight: wastage > 0 ? wastage : 0, wastagePercent },
      }),
    ]);

    await this.auditService.log({ tenantId, userId: receivedBy, action: 'UPDATE', module: 'karigar', entityId: jobId, entityType: 'MaterialReceipt', newValues: { netWeight: dto.netWeight, wastagePercent } });
    this.eventEmitter.emit('karigar.material.received', { tenantId, jobId, wastagePercent });
    return receipt;
  }

  async completeJob(tenantId: string, jobId: string, makingCharge: number, userId: string) {
    const job = await this.findJobById(tenantId, jobId);
    if (!['RECEIVED'].includes(job.status)) {
      throw new BadRequestException('Material must be received before completing job');
    }

    const updated = await this.prisma.jobCard.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', makingCharge, completedAt: new Date() },
    });

    await this.auditService.log({ tenantId, userId, action: 'UPDATE', module: 'karigar', entityId: jobId, entityType: 'JobCard', newValues: { status: 'COMPLETED', makingCharge } });
    return updated;
  }

  async recordPayment(tenantId: string, jobId: string, dto: RecordKarigarPaymentDto, paidBy: string) {
    await this.findJobById(tenantId, jobId);
    return this.prisma.karigarPayment.create({
      data: { tenantId, jobCardId: jobId, amount: dto.amount, paymentMode: dto.paymentMode as never, paidAt: new Date(), paidBy, notes: dto.notes },
    });
  }
}
