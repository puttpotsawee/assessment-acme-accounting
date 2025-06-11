import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { getModelToken } from '@nestjs/sequelize';
import { Ticket, TicketCategory, TicketStatus, TicketType } from '../../db/models/Ticket';
import { Company } from '../../db/models/Company';
import { User, UserRole } from '../../db/models/User';
import { ConflictException } from '@nestjs/common';
import { log } from 'console';
import { assign } from 'lodash';

describe('TicketsService', () => {
  let service: TicketsService;
  const mockTicketModel = {
    create: jest.fn(),
    findAll: jest.fn(),
  };

  const mockUserModel = {
    findAll: jest.fn(),
  };

  const mockCompanyModel = {
    findAll: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: getModelToken(Ticket),
          useValue: mockTicketModel,
        },
        {
          provide: getModelToken(User),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Company),
          useValue: mockCompanyModel,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('findAll', () => {
    it('should return all tickets', async () => {
      const mockTickets = [{ id: 1 }, { id: 2 }];
      mockTicketModel.findAll = jest.fn().mockResolvedValue(mockTickets);

      const tickets = await service.findAll();
      expect(tickets).toEqual(mockTickets);
      expect(mockTicketModel.findAll).toHaveBeenCalledWith({ include: [Company, User] });
    });
  });
  describe('create', () => { 
    it('should throw ConflictException for invalid ticket type', async () => {
      await expect(service.create('invalidType' as any, 1)).rejects.toThrow(ConflictException);
    });
    it('should create ticket with staus open', async () => {
      const companyId = 1;
      const user = { id: 1, role: UserRole.accountant };
      mockUserModel.findAll = jest.fn().mockResolvedValue([user]);
      const type = TicketType.managementReport;
      await service.create(type, companyId);
      expect(mockTicketModel.create).toHaveBeenCalledTimes(1);
      expect(mockTicketModel.create).toHaveBeenCalledWith(expect.objectContaining(
        {
          companyId,
          status: TicketStatus.open,
        }
      ));
    })
    it('should create with first assignee when multiple is found', async () => {
      const companyId = 1;
      const users = [{ id: 99, role: UserRole.accountant }, { id: 2, role: UserRole.accountant }];
      mockUserModel.findAll = jest.fn().mockResolvedValue(users);
      const type = TicketType.managementReport;
      await service.create(type, companyId);
      expect(mockTicketModel.create).toHaveBeenCalledTimes(1);
      expect(mockTicketModel.create).toHaveBeenCalledWith(expect.objectContaining(
        {
          assigneeId: users[0].id,
        }
      ));
    })
    describe('add category', () => {
      it('should create Accounting category when type is managementReport', async () => {
        const companyId = 1;
        const user = { id: 1, role: 'accountant' };
        mockUserModel.findAll = jest.fn().mockResolvedValue([user]);
        const type = TicketType.managementReport;
        const category = TicketCategory.accounting;
        await service.create(type, companyId);
        expect(mockTicketModel.create).toHaveBeenCalledTimes(1);
        expect(mockTicketModel.create).toHaveBeenCalledWith({
          companyId,
          assigneeId: user.id,
          type,
          category,
          status: TicketStatus.open,
        });
      })
      it('should create Corporate category when type is registrationAddressChange', async () => {
        const companyId = 1;
        const user = { id: 1, role: UserRole.accountant };
        mockUserModel.findAll = jest.fn().mockResolvedValue([user]);
        mockTicketModel.findAll = jest.fn().mockResolvedValue([]);
        const type = TicketType.registrationAddressChange;
        const category = TicketCategory.corporate;
        await service.create(type, companyId);
        expect(mockTicketModel.create).toHaveBeenCalledTimes(1);
        expect(mockTicketModel.create).toHaveBeenCalledWith({
          companyId,
          assigneeId: user.id,
          type,
          category,
          status: TicketStatus.open,
        });
      })
    })
    describe('userRole', () => {
      it('should be Accountant when ticket is managementReport', async () => {
        const companyId = 1;
        const userRole = UserRole.accountant;
        const user = { id: 1, role: userRole };
        mockUserModel.findAll = jest.fn().mockResolvedValue([user]);
        const type = TicketType.managementReport;
        await service.create(type, companyId);
        expect(mockUserModel.findAll).toHaveBeenCalledWith({
          where: { companyId, role: userRole },
          order: [['createdAt', 'DESC']],
        });
      })
      it('should be Secretary when ticket is not managementReport', async () => {
        const companyId = 1;
        const userRole = UserRole.corporateSecretary;
        const user = { id: 1, role: userRole };
        mockUserModel.findAll = jest.fn().mockResolvedValue([user]);
        mockTicketModel.findAll = jest.fn().mockResolvedValue([]);
        const type = TicketType.registrationAddressChange;
        await service.create(type, companyId);
        expect(mockUserModel.findAll).toHaveBeenCalledWith({
          where: { companyId, role: userRole },
          order: [['createdAt', 'DESC']],
        });
      })
      it('should assign a director if ticket is registrationAddressChange and no secretary in the company', async () => {
        const companyId = 1;
        const userRole = UserRole.director;
        const user = { id: 1, role: userRole };
        mockTicketModel.findAll = jest.fn().mockResolvedValue([]);
        mockUserModel.findAll = jest.fn().mockImplementation((args) => {
          if (args.where?.role === userRole) {
            return Promise.resolve([user]);
          }
          return Promise.resolve([]);
        });
        const type = TicketType.registrationAddressChange;
        await service.create(type, companyId);
        expect(mockTicketModel.create).toHaveBeenCalledWith(expect.objectContaining({
          assigneeId: user.id,
        }));
      })
    })
    describe('finding user', () => {
      it('should throw ConflictException if no user found', async () => {
        const companyId = 1;
        const type = TicketType.managementReport;
        mockUserModel.findAll = jest.fn().mockResolvedValue([]);
        await expect(service.create(type, companyId)).rejects.toThrow(
          new ConflictException(`Cannot find user with role ${UserRole.accountant} to create a ticket`),
        );
      });
      it('should throw ConflictException if multiple users found for Secretary role', async () => {
        const companyId = 1;
        const type = TicketType.registrationAddressChange;
        const users = [{ id: 1, role: UserRole.corporateSecretary }, { id: 2, role: UserRole.corporateSecretary }];
        mockUserModel.findAll = jest.fn().mockResolvedValue(users);
        await expect(service.create(type, companyId)).rejects.toThrow(
          new ConflictException(`Multiple users with role ${UserRole.corporateSecretary}. Cannot create a ticket`),
        );
      })
    })
    describe('with duplicate', () => {
      it('should throw duplication error if registrationAddressChange exists', async () => {
        const companyId = 1;
        const type = TicketType.registrationAddressChange;
        const user = { id: 1, role: UserRole.corporateSecretary };
        mockTicketModel.findAll = jest.fn().mockResolvedValue([{ type, companyId }]);
        await expect(service.create(type, companyId)).rejects.toThrow(
          new ConflictException(`Ticket of type ${type} already exists for this company`),
        );
        expect(mockTicketModel.findAll).toHaveBeenCalledWith(expect.objectContaining({
          where: { type, companyId },
        }));
      })
    })
    describe('type strikeOff', () => {
      it('throw error if multiple directors exists', async () => {
        const companyId = 1;
        const type = TicketType.strikeOff;
        const users = [
          { id: 1, role: UserRole.director },
          { id: 2, role: UserRole.director },
        ];
        mockUserModel.findAll = jest.fn().mockResolvedValue(users);
        await expect(service.create(type, companyId)).rejects.toThrow(
          new ConflictException(`Multiple users with role ${UserRole.director}. Cannot create a ticket`),
        );
      })
    })
  })
  describe('_resolveAllTickets', () => {
    it('should resolve all tickets', async () => {
      const companyId = 33;
      const mockTickets = [
        { id: 1, companyId, type: TicketType.managementReport, status: TicketStatus.open, category: TicketCategory.accounting, save: jest.fn() },
        { id: 2, companyId, type: TicketType.registrationAddressChange, status: TicketStatus.open, category: TicketCategory.corporate, save: jest.fn() },
      ];
      mockTicketModel.findAll = jest.fn().mockResolvedValue(mockTickets);

      await service._resolveAllTickets(companyId);
      for (const ticket of mockTickets) {
        expect(ticket.status).toBe(TicketStatus.resolved);
        expect(ticket.save).toHaveBeenCalled();
      }
    });
  })
});
