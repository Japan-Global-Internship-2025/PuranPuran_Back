import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TravelService } from './travel.service';
import { Travel } from './entities/travel-entity';
import { User } from '../auth/entities/user.entity';
import { RecommendPlace } from './entities/recommend-place.entity';
import { TravelRegion } from './entities/travel-region.entity';
import { BadRequestException } from '@nestjs/common';

describe('TravelService', () => {
  let service: TravelService;
  const travelRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };
  const userRepository = {
    update: jest.fn(),
  };
  const recommendPlaceRepository = {
    find: jest.fn(),
  };
  const travelRegionRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TravelService,
        { provide: getRepositoryToken(Travel), useValue: travelRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(RecommendPlace), useValue: recommendPlaceRepository },
        { provide: getRepositoryToken(TravelRegion), useValue: travelRegionRepository },
      ],
    }).compile();

    service = module.get<TravelService>(TravelService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should save travel before updating latest travel id', async () => {
    travelRegionRepository.findOne.mockResolvedValue({ id: 10 });
    travelRepository.create.mockReturnValue({ draft: true });
    travelRepository.save.mockResolvedValue({ id: 99, draft: true });
    userRepository.update.mockResolvedValue({ affected: 1 });

    const result = await service.create(
      { id: 7 },
      { travel_region: 'Tokyo' } as any,
    );

    expect(travelRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { id: 7 },
        travel_region_id: { id: 10 },
      }),
    );
    expect(travelRepository.save).toHaveBeenCalledWith({ draft: true });
    expect(userRepository.update).toHaveBeenCalledWith(7, { lastest_travel_id: 99 });
    expect(result).toEqual({ id: 99, draft: true });
  });

  it('should reject when travel region is missing', async () => {
    travelRegionRepository.findOne.mockResolvedValue(null);

    await expect(service.create({ id: 7 }, { travel_region: 'Missing' } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(userRepository.update).not.toHaveBeenCalled();
    expect(travelRepository.save).not.toHaveBeenCalled();
  });

  it('should load recommendations by the travel region id', async () => {
    travelRepository.findOne.mockResolvedValue({
      id: 3,
      travel_region_id: { id: 10 },
    });
    recommendPlaceRepository.find.mockResolvedValue([{ id: 1, title: 'A' }]);

    const result = await service.getRecommendations(3, 7);

    expect(travelRepository.findOne).toHaveBeenCalledWith({
      where: { id: 3, user: 7 },
      relations: { travel_region_id: true },
    });
    expect(recommendPlaceRepository.find).toHaveBeenCalledWith({
      where: { travelRegion: { id: 10 } },
      relations: { travelRegion: true },
    });
    expect(result).toEqual([{ id: 1, title: 'A' }]);
  });
});
