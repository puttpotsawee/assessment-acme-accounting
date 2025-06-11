import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Ticket } from '../../db/models/Ticket';
import { Company } from '../../db/models/Company';
import { User } from '../../db/models/User';

@Module({
  imports: [SequelizeModule.forFeature([Ticket, Company, User])],
  controllers: [TicketsController],
  providers: [TicketsService]
})
export class TicketsModule {}
