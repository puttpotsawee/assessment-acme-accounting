import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import fs from 'fs/promises';

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
  describe('readFileCached', () => {
    it('should return content from cache if hit', async () => {
      const filePath = 'test.txt';
      const content = [[1,2,3,4], [5,6,7,8]];
      service['fileCache'][filePath] = content;
      const result = await service.readFileCached(filePath);
      expect(result).toBe(content);
    })
    it('should call fs.readFile if cache miss', async () => {
      const filePath = 'test.txt';
      const content = "content,col,of,csv\n1,2,3,4\n5,6,7,8";
      const fsMock = jest.spyOn(fs, 'readFile').mockResolvedValue(content);
      const result = await service.readFileCached(filePath);
      const parsedContent = [
        ['content', 'col', 'of', 'csv'], 
        ['1', '2', '3', '4'], 
        ['5', '6', '7', '8']
      ]
      expect(result).toEqual(parsedContent);
      expect(service['fileCache'][filePath]).toEqual(parsedContent);
      expect(fsMock).toHaveBeenCalledWith(filePath, 'utf-8');
    })
  })
});
