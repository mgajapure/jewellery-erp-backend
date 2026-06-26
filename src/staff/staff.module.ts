import { Module } from '@nestjs/common';
import { StaffController } from './controllers/staff.controller';
import { StaffService } from './services/staff.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
