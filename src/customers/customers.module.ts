import { Module } from '@nestjs/common';
import { CustomerController } from './controllers/customer.controller';
import { CustomerService } from './services/customer.service';
import { CustomerRepository } from './repositories/customer.repository';

@Module({
  controllers: [CustomerController],
  providers: [CustomerService, CustomerRepository],
  exports: [CustomerService],
})
export class CustomersModule {}
