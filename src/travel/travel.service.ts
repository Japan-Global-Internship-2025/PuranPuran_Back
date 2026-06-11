import { Injectable } from '@nestjs/common';
import { CreateTravelDto } from './dto/create-travel.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Travel } from './entities/travel-entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateTravelDto } from './dto/update-travel.dto';
import { User } from '../auth/entities/user.entity';
import { Groq } from 'groq-sdk';
import { RecommendPlace } from './entities/recommend-place.entity';
import { TravelRegion } from './entities/travel-region.entity';

@Injectable()
export class TravelService {
    constructor(
        @InjectRepository(Travel) private travelRepository: Repository<Travel>,
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(RecommendPlace) private recommendPlaceRepository: Repository<RecommendPlace>,
        @InjectRepository(TravelRegion) private travelRegionRepository: Repository<TravelRegion>,

    ) { }

    async create(user: any, createTravelDto: CreateTravelDto) {
        const region_name = createTravelDto.travel_region;
        const region_id = await this.travelRegionRepository.findOne({
            where: { region: region_name as any },
        });
        if (!region_id) {
            throw new BadRequestException('유효하지 않은 여행 지역입니다.');
        }

        if (createTravelDto.travel_name == null || createTravelDto.travel_name.trim() === '') {
            createTravelDto.travel_name = `${region_id.region_ko} 여행`;
        }
        const travel = await this.travelRepository.create({
            ...createTravelDto, 
            user: { id: user.id },
            travel_region_id: { id: region_id.id },
        });
        const savedTravel = await this.travelRepository.save(travel);

        await this.userRepository.update(user.id, { lastest_travel_id: savedTravel.id });

        return savedTravel;
    }

    async delete(id: number, user_id: number) {
        const travel = await this.travelRepository.findOne({
            where: { id: id as any, user: { id: user_id } },
        });

        if (!travel) {
            throw new NotFoundException(`삭제할 여행 정보를 찾을 수 없거나 권한이 없습니다.`);
        }

        const user = await this.userRepository.findOne({ where: { id: user_id } });
        
        await this.travelRepository.delete(id);

        // 만약 삭제한 여행이 현재 선택된 여행(lastest_travel_id)이라면
        if (user && user.lastest_travel_id === id) {
            // 나머지 여행 중 가장 최근에 생성된 여행을 찾음
            const latestRemainingTravel = await this.travelRepository.findOne({
                where: { user: { id: user_id } as any },
                order: { created_at: 'DESC' }
            });

            await this.userRepository.update(user_id, {
                lastest_travel_id: latestRemainingTravel ? latestRemainingTravel.id : null
            });
        }

        return { message: '여행 정보가 성공적으로 삭제되었습니다.' };
    }

    async update(id: number, user_id: number, updateTravelDto: UpdateTravelDto) {
        const travel = await this.travelRepository.findOne({
            where: { id: id as any, user: { id: user_id } },
        });
        if (!travel) {
            throw new NotFoundException(`수정할 여행 정보를 찾을 수 없거나 권한이 없습니다.`);
        }
        Object.assign(travel, updateTravelDto);
        await this.travelRepository.save(travel);
        return { message: '여행 정보가 성공적으로 수정되었습니다.' };
    }

    async findOne(id: number, user_id: number) {
        if (isNaN(id)) {
            throw new NotFoundException('유효하지 않은 여행 ID입니다.');
        }

        let travel = await this.travelRepository.findOne({
            where: { id: id, user: { id: user_id } },
            relations: ['travel_region_id'],
        });

        if (!travel) {
            // 여행이 없으면 가장 최근 여행을 찾음
            travel = await this.travelRepository.findOne({
                where: { user: { id: user_id } as any },
                order: { created_at: 'DESC' },
                relations: ['travel_region_id'],
            });
            
            // 여전히 없다면 에러
            if (!travel) {
                throw new NotFoundException('해당 여행 정보를 찾을 수 없습니다.');
            }
        }
        
        return travel;
    }

    async findAll(user_id: number) {
        return this.travelRepository.find({
            where: { user: { id: user_id } },
            relations: ['travel_region_id'],
        });
    }

    async getRecommendations(id: number, user_id: number) {
        const travel = await this.travelRepository.findOne({
            where: { id: id, user: { id: user_id } },
            relations: { travel_region_id: true },
        });
        if (!travel) {
            throw new NotFoundException('해당 여행 정보를 찾을 수 없습니다.');
        }

        const regionId = travel.travel_region_id?.id;

        if (!regionId) {
            throw new NotFoundException('여행 지역 정보를 찾을 수 없습니다.');
        }

        const recommendPlaces = await this.recommendPlaceRepository.find({
            where: { travelRegion: { id: regionId } },
            relations: { travelRegion: true },
        });
        return recommendPlaces;
    }

    
}
