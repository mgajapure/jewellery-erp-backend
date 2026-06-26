import { Module } from '@nestjs/common';
import { BranchController } from './controllers/branch.controller';
import { BranchService } from './services/branch.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [BranchController],
  providers: [BranchService],
  exports: [BranchService],
})
export class BranchesModule {}
