import { Module } from '@nestjs/common';
import { HelpdeskController } from './controllers/helpdesk.controller';
import { HelpdeskService } from './services/helpdesk.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [HelpdeskController],
  providers: [HelpdeskService],
  exports: [HelpdeskService],
})
export class HelpdeskModule {}
