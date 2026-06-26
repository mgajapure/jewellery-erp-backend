import { Module } from '@nestjs/common';
import { SavingsController } from './controllers/savings.controller';
import { SavingsService } from './services/savings.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [SavingsController],
  providers: [SavingsService],
  exports: [SavingsService],
})
export class SavingsModule {}
