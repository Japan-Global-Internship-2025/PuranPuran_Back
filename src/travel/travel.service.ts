import { Injectable } from '@nestjs/common';
import { CreateTravelDto } from './dto/create-travel.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Travel } from './entities/travel-entity';
import { NotFoundException } from '@nestjs/common/exceptions/not-found.exception';
import { UpdateTravelDto } from './dto/update-travel.dto';

@Injectable()
export class TravelService {
    constructor(
        @InjectRepository(Travel) private travelRepository: Repository<Travel>,

    ) { }

    async create(user: any, createTravelDto: CreateTravelDto) {
        const travel = this.travelRepository.create({ ...createTravelDto, user: user.id });
        return this.travelRepository.save(travel);
    }

    async delete(id: number, user_id: number) {
        const travel = await this.travelRepository.findOne({
            where: { id: id as any, user: user_id as any },
        });

        if (!travel) {
            throw new NotFoundException(`삭제할 여행 정보를 찾을 수 없거나 권한이 없습니다.`);
        }

        await this.travelRepository.delete(id);

        return { message: '여행 정보가 성공적으로 삭제되었습니다.' };
    }

    async update(id: number, user_id: number, updateTravelDto: UpdateTravelDto) {
        const travel = await this.travelRepository.findOne({
            where: { id: id as any, user: user_id as any },
        });
        if (!travel) {
            throw new NotFoundException(`수정할 여행 정보를 찾을 수 없거나 권한이 없습니다.`);
        }
        Object.assign(travel, updateTravelDto);
        await this.travelRepository.save(travel);
        return { message: '여행 정보가 성공적으로 수정되었습니다.' };
    }

    async findOne(id: number, user_id: number) {
        const travel = await this.travelRepository.findOne({
            where: { id: id as any, user: user_id as any },
        });
        if (!travel) {
            throw new NotFoundException('해당 여행 정보를 찾을 수 없습니다.');
        }
        return travel;
    }

    async findAll(user_id: number) {
        return this.travelRepository.find({
            where: { user: user_id as any },
        });
    }

    
}
