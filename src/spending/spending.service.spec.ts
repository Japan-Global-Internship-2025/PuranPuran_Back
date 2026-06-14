import { Test, TestingModule } from '@nestjs/testing';
import { SpendingService } from './spending.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Spending } from './entities/spending.entity';
import { Travel } from '../travel/entities/travel-entity';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import { NotFoundException } from '@nestjs/common';

describe('SpendingService', () => {
  let service: SpendingService;
  let spendingRepository: any;
  let travelRepository: any;
  let exchangeRateService: any;

  beforeEach(async () => {
    process.env.GROQ_API_KEY = 'test_key';
    spendingRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findOneBy: jest.fn(),
    };
    travelRepository = {
      findOne: jest.fn(),
    };
    exchangeRateService = {
      getLatestAvailableRate: jest.fn(),
      getExchangeRateAPI: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpendingService,
        {
          provide: getRepositoryToken(Spending),
          useValue: spendingRepository,
        },
        {
          provide: getRepositoryToken(Travel),
          useValue: travelRepository,
        },
        {
          provide: ExchangeRateService,
          useValue: exchangeRateService,
        },
      ],
    }).compile();

    service = module.get<SpendingService>(SpendingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create spending with converted KRW amount', async () => {
    const createDto = {
      title: 'Lunch',
      total_amount: 1000,
      date: new Date('2026-06-12'),
      category: '식비' as any,
      payment_method: 'CASH' as any,
    };
    
    travelRepository.findOne.mockResolvedValue({ id: 1, user: { id: 7 } });
    exchangeRateService.getLatestAvailableRate.mockResolvedValue(912.45);
    spendingRepository.save.mockImplementation(dto => Promise.resolve({ id: 101, ...dto }));

    const result = await service.create(createDto as any, 1, 7);

    expect(result.total_krw).toBe(Math.floor(9.1245 * 1000));
    expect(exchangeRateService.getLatestAvailableRate).toHaveBeenCalledWith('2026-06-12');
    expect(spendingRepository.save).toHaveBeenCalled();
  });

  it('should throw NotFoundException if travel is not owned by user', async () => {
    travelRepository.findOne.mockResolvedValue(null);

    await expect(service.create({} as any, 1, 7)).rejects.toThrow(NotFoundException);
  });

  it('should update spending and recalculate KRW if amount changes', async () => {
    const existingSpending = { id: 101, total_amount: 500, date: new Date('2026-06-12'), travel: { user: { id: 7 } } };
    const updateDto = { total_amount: 2000 };

    spendingRepository.findOne.mockResolvedValue(existingSpending);
    exchangeRateService.getLatestAvailableRate.mockResolvedValue(912.45);
    spendingRepository.update.mockResolvedValue({ affected: 1 });

    const result = await service.update(101, updateDto as any, 7);

    expect(spendingRepository.update).toHaveBeenCalledWith(101, expect.objectContaining({
      total_krw: Math.floor(9.1245 * 2000)
    }));
  });
});
