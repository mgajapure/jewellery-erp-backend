import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(tenantId: string, query: string, limit: number = 20): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim();

    const [customers, girvils, repairTickets, jobCards, inventoryItems] = await Promise.all([
      this.prisma.customer.findMany({
        where: {
          tenantId, deletedAt: null, isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { mobile: { contains: q } },
            { customerId: { contains: q } },
          ],
        },
        take: limit,
        select: { id: true, name: true, mobile: true, customerId: true },
      }),

      this.prisma.girvi.findMany({
        where: {
          tenantId, deletedAt: null,
          OR: [
            { girviNumber: { contains: q, mode: 'insensitive' } },
            { customer: { name: { contains: q, mode: 'insensitive' } } },
            { customer: { mobile: { contains: q } } },
          ],
        },
        take: limit,
        select: { id: true, girviNumber: true, status: true, customer: { select: { name: true } } },
      }),

      this.prisma.repair.findMany({
        where: {
          tenantId, deletedAt: null,
          OR: [
            { ticketNumber: { contains: q, mode: 'insensitive' } },
            { itemDescription: { contains: q, mode: 'insensitive' } },
            { customer: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: limit,
        select: { id: true, ticketNumber: true, status: true, customer: { select: { name: true } } },
      }),

      this.prisma.jobCard.findMany({
        where: {
          tenantId, deletedAt: null,
          OR: [
            { jobNumber: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { karigar: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: limit,
        select: { id: true, jobNumber: true, status: true, karigar: { select: { name: true } } },
      }),

      this.prisma.inventoryItem.findMany({
        where: {
          tenantId, deletedAt: null,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: { id: true, name: true, sku: true, metalType: true, quantity: true },
      }),
    ]);

    const results: SearchResult[] = [
      ...customers.map(c => ({ type: 'Customer', id: c.id, title: c.name, subtitle: c.mobile, meta: { customerId: c.customerId } })),
      ...girvils.map(g => ({ type: 'Girvi', id: g.id, title: g.girviNumber, subtitle: g.customer.name, meta: { status: g.status } })),
      ...repairTickets.map(r => ({ type: 'Repair', id: r.id, title: r.ticketNumber, subtitle: r.customer.name, meta: { status: r.status } })),
      ...jobCards.map(j => ({ type: 'JobCard', id: j.id, title: j.jobNumber, subtitle: j.karigar.name, meta: { status: j.status } })),
      ...inventoryItems.map(i => ({ type: 'Inventory', id: i.id, title: i.name, subtitle: i.sku, meta: { metalType: i.metalType, quantity: i.quantity } })),
    ];

    return results.slice(0, limit);
  }

  async searchCustomers(tenantId: string, query: string) {
    return this.prisma.customer.findMany({
      where: {
        tenantId, deletedAt: null, isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { mobile: { contains: query } },
          { customerId: { contains: query, mode: 'insensitive' } },
          { aadhaarNumber: { contains: query } },
        ],
      },
      take: 10,
      select: { id: true, name: true, mobile: true, customerId: true, kycStatus: true, photoUrl: true },
      orderBy: { name: 'asc' },
    });
  }

  async searchByQr(tenantId: string, qrCode: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, qrCode, deletedAt: null },
    });
    if (customer) return { type: 'Customer', data: customer };

    const inventoryItem = await this.prisma.inventoryItem.findFirst({
      where: { tenantId, sku: qrCode, deletedAt: null },
    });
    if (inventoryItem) return { type: 'Inventory', data: inventoryItem };

    return null;
  }
}
