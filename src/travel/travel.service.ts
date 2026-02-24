import { Injectable } from '@nestjs/common';
import { CreateTravelDto } from './dto/create-travel.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Travel } from './entities/travel-entity';
import { NotFoundException } from '@nestjs/common/exceptions/not-found.exception';
import { UpdateTravelDto } from './dto/update-travel.dto';
import * as vision from '@google-cloud/vision';
import { OpenAI } from 'openai';

@Injectable()
export class TravelService {
    private client = new vision.ImageAnnotatorClient();
    private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    constructor(
        @InjectRepository(Travel) private travelRepository: Repository<Travel>,

    ) { }

    async create(user: any, createTravelDto: CreateTravelDto) {
        const travel = this.travelRepository.create({ ...createTravelDto, user_id: user.id });
        return this.travelRepository.save(travel);
    }

    async delete(id: number, user_id: number) {
        const travel = await this.travelRepository.findOne({
            where: { id: id as any, user_id: user_id as any },
        });

        if (!travel) {
            throw new NotFoundException(`삭제할 여행 정보를 찾을 수 없거나 권한이 없습니다.`);
        }

        await this.travelRepository.delete(id);

        return { message: '여행 정보가 성공적으로 삭제되었습니다.' };
    }

    async update(id: number, user_id: number, updateTravelDto: UpdateTravelDto) {
        const travel = await this.travelRepository.findOne({
            where: { id: id as any, user_id: user_id as any },
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
            where: { id: id as any, user_id: user_id as any },
        });
        if (!travel) {
            throw new NotFoundException('해당 여행 정보를 찾을 수 없습니다.');
        }
        return travel;
    }

    async findAll(user_id: number) {
        return this.travelRepository.find({
            where: { user_id: user_id as any },
        });
    }

    async analyzeReceipt(file: Express.Multer.File) {
        // 1. Google Vision으로 이미지 속 텍스트 추출
        const [result] = await this.client.textDetection(file.buffer);
        const rawText = result.fullTextAnnotation?.text;

        // 2. GPT-4o-mini에게 분석 요청 (핵심 프롬프트)
        const completion = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "너는 일본 영수증 분석 전문가야. 제공된 텍스트에서 '가게명, 날짜, 총액, 카테고리'를 추출해서 JSON 형식으로만 응답해."
                },
                { role: "user", content: rawText! }
            ],
            response_format: { type: "json_object" }
        });

        return JSON.parse(completion.choices[0].message.content!);
    }

}
