import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { getModelToken } from '@nestjs/sequelize';
import { Ticket } from '../../db/models/Ticket';
import { Company } from '../../db/models/Company';
import { User } from '../../db/models/User';

describe('TicketsService', () => {
  let service: TicketsService;
  const mockTicketModel = {
    create: jest.fn(),
  };

  const mockUserModel = {
    findAll: jest.fn(),
  };

  const mockCompanyModel = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
