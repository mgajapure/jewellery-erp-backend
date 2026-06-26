import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

/**
 * Central listener for cross-module domain events.
 * Each handler receives a typed payload and can dispatch notifications,
 * update caches, or trigger downstream workflows.
 */
@Injectable()
export class DomainEventHandlers {
  private readonly logger = new Logger(DomainEventHandlers.name);

  // ─── Customer events ────────────────────────────────────────────────────────

  @OnEvent('customer.created')
  onCustomerCreated(payload: { tenantId: string; customerId: string; name: string }) {
    this.logger.log(`Customer created: ${payload.name} [${payload.customerId}]`);
  }

  // ─── Girvi events ───────────────────────────────────────────────────────────

  @OnEvent('girvi.created')
  onGirviCreated(payload: { tenantId: string; girviId: string; girviNumber: string; customerId: string }) {
    this.logger.log(`Girvi created: ${payload.girviNumber} for customer ${payload.customerId}`);
  }

  @OnEvent('girvi.redeemed')
  onGirviRedeemed(payload: { tenantId: string; girviId: string; girviNumber: string }) {
    this.logger.log(`Girvi redeemed: ${payload.girviNumber}`);
  }

  @OnEvent('girvi.overdue')
  onGirviOverdue(payload: { tenantId: string; girviId: string; girviNumber: string; daysOverdue: number }) {
    this.logger.warn(`Girvi overdue: ${payload.girviNumber} by ${payload.daysOverdue} days`);
  }

  // ─── Payment events ──────────────────────────────────────────────────────────

  @OnEvent('payment.recorded')
  onPaymentRecorded(payload: { tenantId: string; entityType: string; entityId: string; amount: number }) {
    this.logger.log(`Payment recorded: ₹${payload.amount} on ${payload.entityType} [${payload.entityId}]`);
  }

  // ─── Interest events ─────────────────────────────────────────────────────────

  @OnEvent('interest.calculated')
  onInterestCalculated(payload: { tenantId: string; girviId: string; interestAmount: number }) {
    this.logger.log(`Interest calculated: ₹${payload.interestAmount} for girvi ${payload.girviId}`);
  }

  // ─── Sale events ─────────────────────────────────────────────────────────────

  @OnEvent('sale.completed')
  onSaleCompleted(payload: { tenantId: string; saleId: string; billNumber: string; totalAmount: number }) {
    this.logger.log(`Sale completed: ${payload.billNumber} ₹${payload.totalAmount}`);
  }

  // ─── Purchase events ─────────────────────────────────────────────────────────

  @OnEvent('purchase.approved')
  onPurchaseApproved(payload: { tenantId: string; purchaseOrderId: string; vendorId: string }) {
    this.logger.log(`Purchase approved: PO ${payload.purchaseOrderId} from vendor ${payload.vendorId}`);
  }

  // ─── Repair events ───────────────────────────────────────────────────────────

  @OnEvent('repair.status.changed')
  onRepairStatusChanged(payload: { tenantId: string; repairId: string; ticketNumber: string; status: string }) {
    this.logger.log(`Repair ${payload.ticketNumber} → ${payload.status}`);
  }

  // ─── Custom order events ─────────────────────────────────────────────────────

  @OnEvent('custom_order.milestone.reached')
  onMilestoneReached(payload: { tenantId: string; orderId: string; milestone: string }) {
    this.logger.log(`Custom order ${payload.orderId} reached milestone: ${payload.milestone}`);
  }

  @OnEvent('custom_order.delayed')
  onOrderDelayed(payload: { tenantId: string; orderId: string; daysDelayed: number }) {
    this.logger.warn(`Custom order ${payload.orderId} delayed by ${payload.daysDelayed} days`);
  }

  // ─── Gold rate events ────────────────────────────────────────────────────────

  @OnEvent('gold_rate.threshold_breach')
  onGoldRateThresholdBreach(payload: { tenantId: string; metal: string; purity: string; rate: number; threshold: number }) {
    this.logger.warn(`Gold rate alert: ${payload.metal} ${payload.purity} = ₹${payload.rate} (threshold ₹${payload.threshold})`);
  }

  // ─── Diamond events ──────────────────────────────────────────────────────────

  @OnEvent('diamond.cert.expiring')
  onDiamondCertExpiring(payload: { tenantId: string; certId: string; certNumber: string; daysLeft: number }) {
    this.logger.warn(`Diamond cert ${payload.certNumber} expires in ${payload.daysLeft} days`);
  }

  // ─── Savings events ──────────────────────────────────────────────────────────

  @OnEvent('scheme.matured')
  onSchemeMatured(payload: { tenantId: string; schemeId: string; customerId: string }) {
    this.logger.log(`Savings scheme ${payload.schemeId} matured for customer ${payload.customerId}`);
  }

  // ─── Expense events ──────────────────────────────────────────────────────────

  @OnEvent('expense.approved')
  onExpenseApproved(payload: { tenantId: string; expenseId: string; amount: number; approvedBy: string }) {
    this.logger.log(`Expense ${payload.expenseId} approved for ₹${payload.amount} by ${payload.approvedBy}`);
  }

  @OnEvent('expense.rejected')
  onExpenseRejected(payload: { tenantId: string; expenseId: string; reason: string }) {
    this.logger.log(`Expense ${payload.expenseId} rejected: ${payload.reason}`);
  }

  // ─── Vault events ────────────────────────────────────────────────────────────

  @OnEvent('vault.assigned')
  onVaultAssigned(payload: { tenantId: string; girviId: string; slotId: string }) {
    this.logger.log(`Vault slot ${payload.slotId} assigned to Girvi ${payload.girviId}`);
  }

  // ─── KFS events ──────────────────────────────────────────────────────────────

  @OnEvent('kfs.generated')
  onKfsGenerated(payload: { tenantId: string; girviId: string; kfsUrl: string }) {
    this.logger.log(`KFS generated for Girvi ${payload.girviId}`);
  }
}
