import { Module } from '@nestjs/common';
import { CustomOrderController } from './controllers/custom-order.controller';
import { CustomOrderService } from './services/custom-order.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [CustomOrderController],
  providers: [CustomOrderService],
  exports: [CustomOrderService],
})
export class CustomOrdersModule {}
