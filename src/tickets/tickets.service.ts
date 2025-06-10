import { Injectable, ConflictException } from '@nestjs/common';
import { Company } from '../../db/models/Company';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';

@Injectable()
export class TicketsService {
  async findAll(): Promise<Ticket[]> {
    return await Ticket.findAll({ include: [Company, User] });
  }

  async create(type: TicketType, companyId: number): Promise<Ticket> {
    if (!Object.values(TicketType).includes(type)) {
      throw new ConflictException(`Invalid ticket type: ${type}`);
    }

    const category =
      type === TicketType.managementReport
        ? TicketCategory.accounting
        : TicketCategory.corporate;

    const userRole =
      type === TicketType.managementReport
        ? UserRole.accountant
        : UserRole.corporateSecretary;

    const assignees = await User.findAll({
      where: { companyId, role: userRole },
      order: [['createdAt', 'DESC']],
    });

    if (!assignees.length)
      throw new ConflictException(
        `Cannot find user with role ${userRole} to create a ticket`,
      );

    if (userRole === UserRole.corporateSecretary && assignees.length > 1)
      throw new ConflictException(
        `Multiple users with role ${userRole}. Cannot create a ticket`,
      );

    const assignee = assignees[0];

    return Ticket.create({
      companyId,
      assigneeId: assignee.id,
      category,
      type,
      status: TicketStatus.open,
    });
  }
}
