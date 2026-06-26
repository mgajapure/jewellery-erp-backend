import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import {
  AddCommentDto,
  CreateTicketDto,
  EscalateTicketDto,
  ResolveTicketDto,
  TicketQueryDto,
  UpdateTicketDto,
} from '../dto/helpdesk.dto';

// SLA hours by priority
const SLA_HOURS: Record<string, number> = { LOW: 72, MEDIUM: 24, HIGH: 8, URGENT: 2 };

@Injectable()
export class HelpdeskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async nextTicketNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.helpDeskTicket.count({ where: { tenantId } });
    return `TKT-${String(count + 1).padStart(5, '0')}`;
  }

  async createTicket(tenantId: string, dto: CreateTicketDto, reportedBy: string) {
    const priority = dto.priority ?? 'MEDIUM';
    const slaHours = SLA_HOURS[priority] ?? 24;
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const ticket = await this.prisma.helpDeskTicket.create({
      data: {
        tenantId,
        ticketNumber: await this.nextTicketNumber(tenantId),
        subject: dto.subject,
        description: dto.description,
        priority: priority as never,
        reportedBy,
        slaDeadline,
      },
    });

    await this.auditService.log({ tenantId, userId: reportedBy, action: 'CREATE', module: 'HelpDesk', entityId: ticket.id, entityType: 'HelpDeskTicket', newValues: ticket });
    this.eventEmitter.emit('helpdesk.ticket.created', { tenantId, ticketId: ticket.id, ticketNumber: ticket.ticketNumber, priority });
    return ticket;
  }

  async findAll(tenantId: string, query: TicketQueryDto) {
    const where: any = {
      tenantId,
      deletedAt: null,
      ...(query.status && { status: query.status as never }),
      ...(query.priority && { priority: query.priority as never }),
      ...(query.assignedTo && { assignedTo: query.assignedTo }),
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.helpDeskTicket.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { comments: { take: 1, orderBy: { createdAt: 'desc' } } } }),
      this.prisma.helpDeskTicket.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async findOne(tenantId: string, id: string) {
    const ticket = await this.prisma.helpDeskTicket.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async updateTicket(tenantId: string, id: string, dto: UpdateTicketDto, updatedBy: string) {
    const ticket = await this.findOne(tenantId, id);
    const updated = await this.prisma.helpDeskTicket.update({
      where: { id },
      data: {
        ...(dto.subject && { subject: dto.subject }),
        ...(dto.description && { description: dto.description }),
        ...(dto.priority && { priority: dto.priority as never }),
        ...(dto.assignedTo !== undefined && { assignedTo: dto.assignedTo }),
      },
    });
    await this.auditService.log({ tenantId, userId: updatedBy, action: 'UPDATE', module: 'HelpDesk', entityId: id, entityType: 'HelpDeskTicket', oldValues: ticket, newValues: updated });
    return updated;
  }

  async addComment(tenantId: string, ticketId: string, dto: AddCommentDto, postedBy: string) {
    await this.findOne(tenantId, ticketId);
    const comment = await this.prisma.ticketComment.create({
      data: { ticketId, tenantId, comment: dto.comment, isInternal: dto.isInternal ?? false, postedBy },
    });

    await this.prisma.helpDeskTicket.update({
      where: { id: ticketId },
      data: { status: 'IN_PROGRESS' as never },
    });

    return comment;
  }

  async escalateTicket(tenantId: string, id: string, dto: EscalateTicketDto, escalatedBy: string) {
    const ticket = await this.findOne(tenantId, id);
    if (['RESOLVED', 'CLOSED'].includes(ticket.status)) throw new BadRequestException('Cannot escalate a resolved or closed ticket');

    const updated = await this.prisma.helpDeskTicket.update({
      where: { id },
      data: { status: 'ESCALATED' as never, ...(dto.escalateTo && { assignedTo: dto.escalateTo }) },
    });

    await this.prisma.ticketComment.create({
      data: { ticketId: id, tenantId, comment: `Escalated: ${dto.reason}`, isInternal: true, postedBy: escalatedBy },
    });

    this.eventEmitter.emit('helpdesk.ticket.escalated', { tenantId, ticketId: id, ticketNumber: ticket.ticketNumber, reason: dto.reason });
    await this.auditService.log({ tenantId, userId: escalatedBy, action: 'UPDATE', module: 'HelpDesk', entityId: id, entityType: 'HelpDeskTicket', oldValues: { status: ticket.status }, newValues: { status: 'ESCALATED' } });
    return updated;
  }

  async resolveTicket(tenantId: string, id: string, dto: ResolveTicketDto, resolvedBy: string) {
    const ticket = await this.findOne(tenantId, id);
    if (ticket.status === 'CLOSED') throw new BadRequestException('Ticket already closed');

    const updated = await this.prisma.helpDeskTicket.update({
      where: { id },
      data: {
        status: 'RESOLVED' as never,
        resolvedAt: new Date(),
        ...(dto.csatScore && { csatScore: dto.csatScore }),
      },
    });

    await this.prisma.ticketComment.create({
      data: { ticketId: id, tenantId, comment: `Resolved: ${dto.resolution}`, isInternal: false, postedBy: resolvedBy },
    });

    this.eventEmitter.emit('helpdesk.ticket.resolved', { tenantId, ticketId: id, ticketNumber: ticket.ticketNumber });
    await this.auditService.log({ tenantId, userId: resolvedBy, action: 'UPDATE', module: 'HelpDesk', entityId: id, entityType: 'HelpDeskTicket', oldValues: { status: ticket.status }, newValues: { status: 'RESOLVED' } });
    return updated;
  }

  async closeTicket(tenantId: string, id: string, closedBy: string) {
    const ticket = await this.findOne(tenantId, id);
    const updated = await this.prisma.helpDeskTicket.update({
      where: { id },
      data: { status: 'CLOSED' as never, closedAt: new Date() },
    });
    await this.auditService.log({ tenantId, userId: closedBy, action: 'UPDATE', module: 'HelpDesk', entityId: id, entityType: 'HelpDeskTicket', oldValues: { status: ticket.status }, newValues: { status: 'CLOSED' } });
    return updated;
  }

  async getAnalytics(tenantId: string) {
    const [byStatus, byPriority, slaBreached] = await Promise.all([
      this.prisma.helpDeskTicket.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
        orderBy: { _count: { status: 'desc' } },
      }),
      this.prisma.helpDeskTicket.groupBy({
        by: ['priority'],
        where: { tenantId, deletedAt: null },
        _count: true,
        orderBy: { _count: { priority: 'desc' } },
      }),
      this.prisma.helpDeskTicket.count({
        where: { tenantId, deletedAt: null, slaDeadline: { lt: new Date() }, status: { notIn: ['RESOLVED', 'CLOSED'] as never[] } },
      }),
    ]);

    return {
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
      byPriority: byPriority.map(p => ({ priority: p.priority, count: p._count })),
      slaBreached,
    };
  }

  // Check for SLA breaches every 15 minutes
  @Cron('0 */15 * * * *')
  async checkSlaBreaches() {
    const breached = await this.prisma.helpDeskTicket.findMany({
      where: {
        deletedAt: null,
        slaDeadline: { lt: new Date() },
        status: { notIn: ['RESOLVED', 'CLOSED'] as never[] },
      },
      select: { id: true, tenantId: true, ticketNumber: true, priority: true, slaDeadline: true },
    });

    for (const ticket of breached) {
      this.eventEmitter.emit('helpdesk.sla.breached', { tenantId: ticket.tenantId, ticketId: ticket.id, ticketNumber: ticket.ticketNumber, priority: ticket.priority });
    }
  }
}
