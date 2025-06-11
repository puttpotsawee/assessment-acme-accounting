import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { after } from 'lodash';
import { mock } from 'node:test';

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('runTasks', () => {
    let mockAccounts: jest.SpyInstance;
    let mockYearly: jest.SpyInstance;
    let mockFs: jest.SpyInstance;
    beforeEach(async () => {
      mockAccounts = jest.spyOn(service, 'accounts')
      mockYearly = jest.spyOn(service, 'yearly')
      mockFs = jest.spyOn(service, 'fs')
    });
    afterEach(() => {
      mockAccounts.mockRestore();
      mockYearly.mockRestore();
      mockFs.mockRestore();
    });
    it('should call all function', async () => {
      mockAccounts.mockResolvedValue(undefined);
      mockYearly.mockResolvedValue(undefined);
      mockFs.mockResolvedValue(undefined);
      await service.runTasks();
      expect(mockAccounts).toHaveBeenCalled();
      expect(mockYearly).toHaveBeenCalled();
      expect(mockFs).toHaveBeenCalled();
    })
  })
});
