import { Module } from '@nestjs/common';
import { GirviSchedulerService } from './services/girvi-scheduler.service';
import { GirviModule } from '../girvi/girvi.module';

@Module({
  imports: [GirviModule],
  providers: [GirviSchedulerService],
})
export class JobsModule {}
