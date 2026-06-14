import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeRateService } from './exchange-rate.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExchangeRate } from './entities/exchange-rate.entity';

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRateService,
        {
          provide: getRepositoryToken(ExchangeRate),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<ExchangeRateService>(ExchangeRateService);
    
    // global.fetch mock
    global.fetch = jest.fn() as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fallback to previous day if API returns null', async () => {
    repository.findOne.mockResolvedValue(null); // No data in DB
    
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => [] // Sunday
      })
      .mockResolvedValueOnce({
        json: async () => [] // Saturday
      })
      .mockResolvedValueOnce({
        json: async () => [{ cur_unit: 'JPY(100)', deal_bas_r: '912.45' }] // Friday
      });
      
    repository.create.mockImplementation(dto => dto);
    repository.save.mockImplementation(entity => Promise.resolve(entity));

    const rate = await service.getLatestAvailableRate('2026-06-14');
    
    expect(rate).toBe(912.45);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should handle commas in rate string', async () => {
    repository.findOne.mockResolvedValue(null);
    
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => [{ cur_unit: 'JPY(100)', deal_bas_r: '1,012.45' }]
    });
    
    repository.create.mockImplementation(dto => dto);
    repository.save.mockImplementation(entity => Promise.resolve(entity));

    const rate = await service.getLatestAvailableRate('2026-06-12');
    
    expect(rate).toBe(1012.45);
  });
});
