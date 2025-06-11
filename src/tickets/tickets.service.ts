import { Injectable, ConflictException } from '@nestjs/common';
import { Company } from '../../db/models/Company';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';
import { InjectModel } from '@nestjs/sequelize';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Company)
    private readonly companyModel: typeof Company,
    @InjectModel(User)
    private readonly userModel: typeof User,
    @InjectModel(Ticket)
    private readonly ticketModel: typeof Ticket,
  ) {}

  async findAll(): Promise<Ticket[]> {
    return await this.ticketModel.findAll({ include: [Company, User] });
  }

  async create(type: TicketType, companyId: number): Promise<Ticket> {
    if (!Object.values(TicketType).includes(type)) {
      throw new ConflictException(`Invalid ticket type: ${type}`);
    }

    // Validate if registrationAddress is existed for this company
    if (type === TicketType.registrationAddressChange) {
      const ticketsResult = await this.ticketModel.findAll({
        where: { companyId, type: TicketType.registrationAddressChange },
      });
      if (ticketsResult.length > 0) {
        throw new ConflictException(
          `Ticket of type ${type} already exists for this company`,
        );
      }
    }

    const category =
      type === TicketType.managementReport
        ? TicketCategory.accounting
        : TicketCategory.corporate;

    const userRole =
      type === TicketType.managementReport
        ? UserRole.accountant
        : TicketType.strikeOff ?
            UserRole.director :
            UserRole.corporateSecretary;

    let assignees = await this.userModel.findAll({
      where: { companyId, role: userRole },
      order: [['createdAt', 'DESC']],
    });
    
    if (type === TicketType.registrationAddressChange) {
      // If no corporate secretary, assign a director
      if (!assignees.length) {
        assignees = await this.userModel.findAll({
          where: { companyId, role: UserRole.director },
          order: [['createdAt', 'DESC']],
        });
      }
    }

    if (type === TicketType.strikeOff) {
        // if multiple directors exist, throw an error
      if (assignees.length > 1) {
        throw new ConflictException(
          `Multiple users with role ${UserRole.director}. Cannot create a ticket`,
        );
      }
    }

    if (!assignees.length)
      throw new ConflictException(
        `Cannot find user with role ${userRole} to create a ticket`,
      );

    if (userRole === UserRole.corporateSecretary && assignees.length > 1)
      throw new ConflictException(
        `Multiple users with role ${userRole}. Cannot create a ticket`,
      );

    const assignee = assignees[0];

    return this.ticketModel.create({
      companyId,
      assigneeId: assignee.id,
      category,
      type,
      status: TicketStatus.open,
    });
  }
}
