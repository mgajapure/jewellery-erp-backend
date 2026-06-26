import { Module } from '@nestjs/common';
import { SaleController } from './controllers/sale.controller';
import { SaleService } from './services/sale.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [SaleController],
  providers: [SaleService],
  exports: [SaleService],
})
export class SalesModule {}
