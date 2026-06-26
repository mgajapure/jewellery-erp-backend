import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import { SendWhatsAppDto, WhatsAppQueryDto } from '../dto/whatsapp.dto';

// Intent types for the bot
const BOT_INTENTS: Record<string, RegExp> = {
  girvi_balance:   /balance|loan|girvi|my (loan|pledge)/i,
  payment_link:    /pay|payment|upi|renew/i,
  ticket_status:   /repair|ticket|status/i,
  scheme_balance:  /scheme|savings|chit/i,
  loyalty_points:  /points|loyalty|reward/i,
};

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(tenantId: string, dto: SendWhatsAppDto): Promise<{ id: string; status: string }> {
    const msg = await this.prisma.whatsAppMessage.create({
      data: { tenantId, recipient: dto.recipient, message: dto.message, template: dto.template },
    });

    // In production: call WhatsApp Business API (Meta Cloud API)
    // For now: log and mark as sent
    this.logger.log(`[WhatsApp] Sending to ${dto.recipient}: ${dto.message.slice(0, 80)}`);

    const updated = await this.prisma.whatsAppMessage.update({
      where: { id: msg.id },
      data: { status: 'SENT' as never, sentAt: new Date() },
    });

    return { id: updated.id, status: updated.status };
  }

  async sendGirviBalance(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId, deletedAt: null } });
    if (!customer?.mobile) return null;

    const activeGirvis = await this.prisma.girvi.findMany({
      where: { tenantId, customerId, deletedAt: null, status: { in: ['ACTIVE', 'PARTIAL_PAID', 'OVERDUE'] } },
      select: { girviNumber: true, principalAmount: true, status: true },
    });

    if (!activeGirvis.length) {
      return this.sendMessage(tenantId, { recipient: customer.mobile, message: `Dear ${customer.name}, you have no active loans with us.` });
    }

    const lines = activeGirvis.map(g => `${g.girviNumber}: ₹${g.principalAmount} (${g.status})`).join('\n');
    const message = `Dear ${customer.name}, your active loans:\n${lines}\nFor renewal or payment, call us or visit the store.`;
    return this.sendMessage(tenantId, { recipient: customer.mobile, message });
  }

  async handleBotWebhook(tenantId: string, payload: unknown) {
    // Parse incoming WhatsApp Business API webhook payload
    const body = payload as any;
    const entry = body?.entry?.[0]?.changes?.[0]?.value;
    if (!entry?.messages?.[0]) return { processed: false };

    const incomingMsg = entry.messages[0];
    const sender = incomingMsg.from as string;
    const text = (incomingMsg.text?.body ?? '') as string;

    this.logger.log(`[WhatsApp Bot] Incoming from ${sender}: ${text}`);

    // Match intent
    const intent = Object.entries(BOT_INTENTS).find(([, regex]) => regex.test(text))?.[0] ?? 'fallback';
    const reply = await this.generateBotReply(tenantId, sender, intent);

    if (reply) {
      await this.sendMessage(tenantId, { recipient: sender, message: reply });
    }

    return { processed: true, intent };
  }

  private async generateBotReply(tenantId: string, mobile: string, intent: string): Promise<string> {
    const customer = await this.prisma.customer.findFirst({ where: { tenantId, mobile, deletedAt: null } });

    if (!customer) {
      return 'Welcome to our Jewellery Store! We could not find your account. Please call us or visit the store.';
    }

    switch (intent) {
      case 'girvi_balance': {
        const loans = await this.prisma.girvi.findMany({
          where: { tenantId, customerId: customer.id, deletedAt: null, status: { in: ['ACTIVE', 'PARTIAL_PAID', 'OVERDUE'] } },
          select: { girviNumber: true, principalAmount: true, status: true },
        });
        if (!loans.length) return `Dear ${customer.name}, you have no active loans.`;
        return `Dear ${customer.name}, active loans:\n${loans.map(l => `${l.girviNumber}: ₹${l.principalAmount} (${l.status})`).join('\n')}`;
      }

      case 'loyalty_points': {
        const account = await this.prisma.loyaltyAccount.findFirst({ where: { tenantId, customerId: customer.id } });
        return account
          ? `Dear ${customer.name}, you have *${account.points} loyalty points* (Tier: ${account.tier}).`
          : `Dear ${customer.name}, you don't have a loyalty account yet. Make a purchase to earn points!`;
      }

      case 'payment_link':
        return `Dear ${customer.name}, to make a payment, please call us or visit the store. We accept Cash, UPI, Card, and Bank Transfer.`;

      case 'scheme_balance': {
        const schemes = await this.prisma.savingsScheme.findMany({
          where: { tenantId, customerId: customer.id, status: 'ACTIVE', deletedAt: null },
          select: { schemeName: true, monthlyAmount: true, maturityDate: true },
        });
        if (!schemes.length) return `Dear ${customer.name}, you have no active savings schemes.`;
        return `Dear ${customer.name}, active schemes:\n${schemes.map(s => `${s.schemeName}: ₹${s.monthlyAmount}/month, matures ${s.maturityDate.toLocaleDateString('en-IN')}`).join('\n')}`;
      }

      default:
        return `Dear ${customer.name}, how can we help you? You can ask about:\n• Loan balance\n• Loyalty points\n• Savings scheme\n• Payment options`;
    }
  }

  async findMessages(tenantId: string, query: WhatsAppQueryDto) {
    const where: any = {
      tenantId,
      ...(query.status && { status: query.status as never }),
      ...(query.recipient && { recipient: { contains: query.recipient } }),
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.whatsAppMessage.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.whatsAppMessage.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }
}
