import { Module } from '@nestjs/common';
import { DomainEventHandlers } from './domain-event.handlers';

@Module({
  providers: [DomainEventHandlers],
})
export class EventsModule {}
