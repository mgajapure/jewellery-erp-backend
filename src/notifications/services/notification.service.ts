import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

interface SendOptions {
  tenantId: string;
  channel: 'SMS' | 'PUSH' | 'EMAIL' | 'WHATSAPP';
  recipient: string;
  message: string;
  template?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async send(opts: SendOptions): Promise<void> {
    const log = await this.prisma.notificationLog.create({
      data: {
        tenantId: opts.tenantId,
        channel: opts.channel as never,
        recipient: opts.recipient,
        message: opts.message,
        template: opts.template,
        status: 'PENDING',
      },
    });

    try {
      let externalId: string | undefined;

      if (opts.channel === 'SMS') {
        externalId = await this.sendSms(opts.recipient, opts.message);
      } else if (opts.channel === 'WHATSAPP') {
        externalId = await this.sendWhatsapp(opts.recipient, opts.message);
      }

      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'SENT', sentAt: new Date(), externalId, provider: this.getSmsProvider() },
      });
    } catch (err: any) {
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: err?.message ?? String(err) },
      });
      this.logger.error(`Notification failed [${opts.channel}] to ${opts.recipient}`, err);
    }
  }

  async sendBulk(tenantId: string, recipients: string[], message: string, channel: 'SMS' | 'WHATSAPP' = 'SMS') {
    const results = await Promise.allSettled(
      recipients.map(r => this.send({ tenantId, channel, recipient: r, message }))
    );
    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    return { sent, failed, total: recipients.length };
  }

  async getNotificationHistory(tenantId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.notificationLog.findMany({
        where: { tenantId },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificationLog.count({ where: { tenantId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Domain Event Listeners ──────────────────────────────────────────────────

  @OnEvent('repair.status.changed')
  async onRepairStatusChanged(event: { tenantId: string; repairId: string; status: string; customerId: string }) {
    const customer = await this.prisma.customer.findFirst({ where: { id: event.customerId }, select: { mobile: true, name: true } });
    if (!customer?.mobile) return;

    const messages: Record<string, string> = {
      ESTIMATE_SENT: `Dear ${customer.name}, repair estimate is ready. Please visit or call us to approve.`,
      READY: `Dear ${customer.name}, your jewellery repair is ready for pickup!`,
      DELIVERED: `Dear ${customer.name}, your repair has been delivered. Thank you!`,
    };

    if (messages[event.status]) {
      await this.send({ tenantId: event.tenantId, channel: 'SMS', recipient: customer.mobile, message: messages[event.status], template: `repair_${event.status.toLowerCase()}` });
    }
  }

  @OnEvent('custom_order.status.changed')
  async onCustomOrderStatusChanged(event: { tenantId: string; orderId: string; status: string }) {
    const order = await this.prisma.customOrder.findFirst({ where: { id: event.orderId }, include: { customer: { select: { mobile: true, name: true } } } });
    if (!order?.customer?.mobile) return;

    const messages: Record<string, string> = {
      READY: `Dear ${order.customer.name}, your custom order ${order.orderNumber} is ready for delivery!`,
      DESIGN_APPROVED: `Dear ${order.customer.name}, your design is approved and production has started.`,
    };

    if (messages[event.status]) {
      await this.send({ tenantId: event.tenantId, channel: 'SMS', recipient: order.customer.mobile, message: messages[event.status] });
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private getSmsProvider(): string {
    return this.configService.get('sms.provider', 'MSG91');
  }

  private async sendSms(to: string, message: string): Promise<string> {
    // Provider-agnostic: route to Msg91 or Twilio based on config
    const provider = this.getSmsProvider();
    this.logger.log(`[${provider}] Sending SMS to ${to}`);
    // Placeholder — real implementation uses HTTP call to provider
    return `sms-${Date.now()}`;
  }

  private async sendWhatsapp(to: string, message: string): Promise<string> {
    this.logger.log(`[WhatsApp] Sending to ${to}`);
    return `wa-${Date.now()}`;
  }
}
