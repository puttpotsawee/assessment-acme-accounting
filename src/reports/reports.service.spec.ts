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
    it('should save error log in error states if error', async () => {
      const errorMessage = 'Test error'
      mockAccounts.mockRejectedValue(new Error(errorMessage));
      mockYearly.mockResolvedValue(undefined);
      mockFs.mockResolvedValue(undefined);
      await expect(service.runTasks()).rejects.toThrow(errorMessage);
      expect(service.state('error')).toBeDefined();
      expect(service.state('error').message).toBe('Error: ' + errorMessage);
      expect(service.state('error').timestamp).toBeDefined();
      expect(service.state('error').stack).toBeDefined();
      expect(service.state('accounts')).toBe('error');
      expect(service.state('yearly')).toBe('error');
      expect(service.state('fs')).toBe('error');
    })
  })
});
