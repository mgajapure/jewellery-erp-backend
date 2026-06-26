import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { GirviModule } from './girvi/girvi.module';
import { InterestModule } from './interest/interest.module';
import { VaultModule } from './vault/vault.module';
import { PdfModule } from './pdf/pdf.module';
import { FilesModule } from './files/files.module';
import { ComplianceModule } from './compliance/compliance.module';
import { JobsModule } from './jobs/jobs.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { PurchaseModule } from './purchase/purchase.module';
import { KarigarModule } from './karigar/karigar.module';
import { RepairsModule } from './repairs/repairs.module';
import { CustomOrdersModule } from './custom-orders/custom-orders.module';
import { ExpensesModule } from './expenses/expenses.module';
import { BarcodeModule } from './barcode/barcode.module';
import { BranchesModule } from './branches/branches.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GoldRatesModule } from './gold-rates/gold-rates.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StaffModule } from './staff/staff.module';
import { SettingsModule } from './settings/settings.module';
import { ReportsModule } from './reports/reports.module';
import { SavingsModule } from './savings/savings.module';
import { DiamondModule } from './diamond/diamond.module';
import { SyncModule } from './sync/sync.module';
import { SearchModule } from './search/search.module';
import { EventsModule } from './events/events.module';
import { HelpdeskModule } from './helpdesk/helpdesk.module';
import { OldGoldModule } from './old-gold/old-gold.module';
import { DataImportModule } from './data-import/data-import.module';
import { PayrollModule } from './payroll/payroll.module';
import { GstFilingModule } from './gst-filing/gst-filing.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { FranchiseModule } from './franchise/franchise.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    EventEmitterModule.forRoot({ wildcard: false, maxListeners: 20 }),
    ScheduleModule.forRoot(),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: `redis://${configService.get('redis.host')}:${configService.get('redis.port')}`,
      }),
    }),
    DatabaseModule,
    AuditModule,
    AuthModule,
    CustomersModule,
    InterestModule,
    VaultModule,
    GirviModule,
    PdfModule,
    FilesModule,
    ComplianceModule,
    JobsModule,
    InventoryModule,
    SalesModule,
    PurchaseModule,
    KarigarModule,
    RepairsModule,
    CustomOrdersModule,
    ExpensesModule,
    BarcodeModule,
    BranchesModule,
    DashboardModule,
    GoldRatesModule,
    NotificationsModule,
    StaffModule,
    SettingsModule,
    ReportsModule,
    SavingsModule,
    DiamondModule,
    SyncModule,
    SearchModule,
    EventsModule,
    HelpdeskModule,
    OldGoldModule,
    DataImportModule,
    PayrollModule,
    GstFilingModule,
    LoyaltyModule,
    FranchiseModule,
    WhatsAppModule,
  ],
})
export class AppModule {}
