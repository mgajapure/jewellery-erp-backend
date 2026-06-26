import { Module } from '@nestjs/common';
import { RepairController } from './controllers/repair.controller';
import { RepairService } from './services/repair.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [RepairController],
  providers: [RepairService],
  exports: [RepairService],
})
export class RepairsModule {}
