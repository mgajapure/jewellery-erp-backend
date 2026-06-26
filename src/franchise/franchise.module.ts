import { Module } from '@nestjs/common';
import { FranchiseController } from './controllers/franchise.controller';
import { FranchiseService } from './services/franchise.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [FranchiseController],
  providers: [FranchiseService],
  exports: [FranchiseService],
})
export class FranchiseModule {}
