import { Module } from '@nestjs/common';
import { GirviController } from './controllers/girvi.controller';
import { GirviService } from './services/girvi.service';
import { CustomersModule } from '../customers/customers.module';
import { VaultModule } from '../vault/vault.module';
import { InterestModule } from '../interest/interest.module';

@Module({
  imports: [CustomersModule, VaultModule, InterestModule],
  controllers: [GirviController],
  providers: [GirviService],
  exports: [GirviService],
})
export class GirviModule {}
