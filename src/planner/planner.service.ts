import { Injectable } from '@nestjs/common';
import { CreatePlannerDto } from './dto/create-planner.dto';
import { UpdatePlannerDto } from './dto/update-planner.dto';
import { PlannerItem } from './entities/planner-item.entity';
import { Repository } from 'typeorm';
import { DailyPlanner } from './entities/daily-planner.entity';
import { InjectRepository } from '@nestjs/typeorm';
import Groq from 'groq-sdk';
import { InternalServerErrorException } from '@nestjs/common/exceptions/internal-server-error.exception';
import { Travel } from '../travel/entities/travel-entity';
import { tavily } from "@tavily/core";
import { NotFoundException } from '@nestjs/common/exceptions/not-found.exception';
import { SavePlannerDto } from './dto/save-planner.dto';

import { SaveTotalPlanDto } from './dto/save-total-plan.dto';

@Injectable()
export class PlannerService {
    private groq: Groq;
    private readonly tavily;

    constructor(
        @InjectRepository(DailyPlanner)
        private dailyPlannerRepository: Repository<DailyPlanner>,
        @InjectRepository(PlannerItem)
        private plannerItemRepository: Repository<PlannerItem>,
        @InjectRepository(Travel)
        private travelRepository: Repository<Travel>,
    ) {
        this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        this.tavily = tavily({ apiKey: process.env.TAVILY_API_KEY });
    }

    // 💡 여행 전체의 대략적인 일정을 AI가 추천해줍니다.
    async generateTotalPlanSummary(travelId: number) {
        const travelInfo = await this.travelRepository.findOne({
            where: { id: travelId },
            relations: ['user'],
        });

        if (!travelInfo) {
            throw new NotFoundException('해당 여행 정보를 찾을 수 없습니다.');
        }

        const prompt = `
      다음 [여행 정보]를 바탕으로 전체 여행 기간(${travelInfo.travel_start_date.toISOString().split('T')[0]} ~ ${travelInfo.travel_end_date.toISOString().split('T')[0]}) 동안의 대략적인 일정을 짜줘.
      각 날짜별로 어디를 가면 좋을지(ex. 나고야역 주변, 사카에 등) 짧은 요약을 만들어줘.

      [여행 정보]
      - 여행 지역: ${travelInfo.travel_region}
      - 사용자 취향: ${travelInfo.user.taste}
      - 숙소 정보: ${travelInfo.lodging_info || '미정'}

      응답은 반드시 아래 구조의 JSON 배열을 포함하는 객체여야 해:
      {
        "dailyPlans": [
          {
            "plan_date": "YYYY-MM-DD",
            "daily_description": "해당 날짜의 대략적인 일정 설명 (ex. 나고야역 중심의 쇼핑과 먹거리 투어)"
          }
        ]
      }
    `;

        try {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: '너는 일본 여행 플래너야. 반드시 JSON 형식으로만 대답해.' },
                    { role: 'user', content: prompt },
                ],
                model: 'llama-3.3-70b-versatile',
                response_format: { type: 'json_object' },
            });

            return JSON.parse(chatCompletion.choices[0].message.content!);
        } catch (error) {
            console.error('전체 일정 요약 생성 실패:', error);
            throw new InternalServerErrorException('전체 일정 요약을 생성하는 중 에러가 발생했습니다.');
        }
    }

    // 💡 AI가 추천해준 혹은 사용자가 수정한 '전체 대략적 일정'을 저장합니다.
    async saveTotalPlan(travelId: number, saveTotalPlanDto: SaveTotalPlanDto) {
        const travel = await this.travelRepository.findOne({ where: { id: travelId } });
        if (!travel) throw new NotFoundException('여행 정보를 찾을 수 없습니다.');

        const savedPlans: DailyPlanner[] = [];
        for (const plan of saveTotalPlanDto.dailyPlans) {
            let dailyPlanner = await this.dailyPlannerRepository.findOne({
                where: { travel: { id: travelId } as any, plan_date: plan.plan_date }
            });

            if (dailyPlanner) {
                dailyPlanner.daily_description = plan.daily_description;
            } else {
                dailyPlanner = this.dailyPlannerRepository.create({
                    travel: { id: travelId } as any,
                    plan_date: plan.plan_date,
                    daily_description: plan.daily_description
                });
            }
            savedPlans.push(await this.dailyPlannerRepository.save(dailyPlanner));
        }
        return savedPlans;
    }

    // 💡 총 여행 플래너의 장소 리스트를 저장합니다.
    async saveTotalPlanPlaces(travelId: number, places: string[]) {
        const travel = await this.travelRepository.findOne({ where: { id: travelId } });
        if (!travel) throw new NotFoundException('여행 정보를 찾을 수 없습니다.');

        travel.places = places;
        await this.travelRepository.save(travel);
        return { message: '총 여행 플래너 장소가 성공적으로 저장되었습니다.' };
    }


    async createAIPlan(travelId: number, createPlannerDto: CreatePlannerDto) {
        const travelInfo = await this.travelRepository.findOne({
            where: { id: travelId },
            relations: ['user'], 
        });

        if (!travelInfo) {
            throw new NotFoundException('해당 여행 정보를 찾을 수 없습니다.');
        }

        // 해당 날짜의 대략적인 일정이 이미 있는지 확인합니다.
        const existingDailyPlan = await this.dailyPlannerRepository.findOne({
            where: { travel: { id: travelId } as any, plan_date: createPlannerDto.plan_date }
        });

        const searchQuery = `${travelInfo.travel_region} ${existingDailyPlan?.daily_description || ''} 맛집 및 가볼만한 곳 추천`;
        const searchResponse = await this.tavily.search(searchQuery, {
            searchDepth: "basic", 
            maxResults: 10,       
        });

        // 검색된 내용을 텍스트로 합치기
        const searchContext = searchResponse.results
            .map(r => `제목: ${r.title}, 내용: ${r.content}`)
            .join("\n");

        const prompt = this.buildPrompt(createPlannerDto, travelInfo, searchContext, existingDailyPlan?.daily_description);

        try {
            // 2. Groq API 호출
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: '너는 일본 여행 일정 짜기 전문가야. 반드시 JSON 형식으로만 대답해.' },
                    { role: 'user', content: prompt },
                ],
                model: 'llama-3.3-70b-versatile', 
                response_format: { type: 'json_object' }, 
            });

            const aiResponse = JSON.parse(chatCompletion.choices[0].message.content!);
            const items = aiResponse.itinerary;

            // 3. DB 저장 (기존 정보가 있으면 업데이트, 없으면 새로 생성)
            const newPlan = existingDailyPlan || this.dailyPlannerRepository.create({
                plan_date: createPlannerDto.plan_date,
                travel: { id: travelId } as any,
            });

            newPlan.start_time = createPlannerDto.start_time;
            newPlan.end_time = createPlannerDto.end_time;
            newPlan.ai_request = createPlannerDto.ai_request ?? null;
            newPlan.items = items.map((item, index) => ({
                ...item,
                sequence: index + 1, 
            }));

            return newPlan; 
        } catch (error) {
            console.error('AI 일정 생성 실패:', error);
            throw new InternalServerErrorException('AI 일정을 생성하는 중 에러가 발생했습니다.');
        }
    }

    // 💡 인자에 daily_description: string | undefined 이 추가되었습니다.
    private buildPrompt(createPlannerDto: CreatePlannerDto, travel: any, searchContext: string, dailyDescription?: string | null): string {
        console.log('여행 정보:', JSON.stringify(travel, null, 2));
        return `
      다음 [여행 배경 정보], [오늘의 대략적인 일정], 그리고 [오늘의 요구사항]을 바탕으로 최적의 상세 일정을 짜줘. 
      사용자의 여행 배경과 실시간 검색 데이터를 바탕으로 최적의 일정을 짜줘.
      꼭 여행 지역을 맞춰서 그 지역에서 실제로 존재하는 장소들로만 일정을 구성해줘.

      [실시간 검색 정보]
      ${searchContext}

      [여행 배경 정보]
      - 여행 지역: ${travel.travel_region}
      - 총 여행 기간: ${travel.travel_start_date.toISOString().split('T')[0]} ~ ${travel.travel_end_date.toISOString().split('T')[0]}
      - 총 여행 예산: ${travel.travel_budget}
      - 숙소 정보(위치): ${travel.lodging_info || '아직 미정'}
      - 사용자 여행 취향: ${travel.user.taste}
      - 총 여행 플래너 장소: ${travel.places ? travel.places.join(', ') : '없음'}

      [오늘의 대략적인 일정]
      - ${dailyDescription || '없음 (네가 자유롭게 추천해줘)'}

      [오늘의 요구사항]
      - 일정 날짜: ${createPlannerDto.plan_date}
      - 활동 가능 시간: ${createPlannerDto.start_time} ~ ${createPlannerDto.end_time}
      - 특별 요청사항: ${createPlannerDto.ai_request || '없음'}

      [플래닝 가이드라인]
      1. 동선 최적화: 숙소 위치(${travel.lodging_info})와 이동 시간을 고려하여 현실적인 동선으로 짤 것.
      2. 취향 반영: 사용자의 여행 취향(${travel.user.taste})을 적극 반영한 장소를 추천할 것.
      3. 대략적인 일정 준수: 오늘의 대략적인 일정(${dailyDescription || '없음'})이 있다면 그 흐름에 맞게 상세 일정을 구성할 것.
      4. 예산 고려: 총 예산을 고려하여 너무 과도한 지출이 발생하지 않는 선에서 카테고리(식사/쇼핑 등)를 분배할 것.

      응답은 반드시 아래 구조의 JSON 배열을 포함하는 객체여야 해:
      {
        "itinerary": [
          {
            "visit_time": "HH:mm",
            "place_name": "장소 이름",
            "category": "카테고리(예: 식사·인기, 쇼핑·역주변)",
            "description": "이 장소가 왜 사용자의 취향과 부합하는지 1~2문장의 짧은 설명",
            "latitude": "숫자형 위도",
            "longitude": "숫자형 경도",
            "location": "해당 장소의 주소",
            "image_url": "해당 장소의 특징을 나타내는 영어 단어 1개(예: 'sushi', 'temple')" 
          }
        ]
      }
      * 주의: 실제 존재하는 장소로 짜고, 위경도는 최대한 정확하게 알려줘.
    `;
    }


    async savePlan(travelId: number, savePlannerDto: SavePlannerDto) {
        const newPlan = this.dailyPlannerRepository.create({
            plan_date: savePlannerDto.plan_date,
            start_time: savePlannerDto.start_time,
            end_time: savePlannerDto.end_time,
            ai_request: savePlannerDto.ai_request,
            travel: { id: travelId } as any,
            items: savePlannerDto.items.map((item, index) => ({
                visit_time: item.visit_time,
                place_name: item.place_name,
                category: item.category,
                description: item.description,
                latitude: item.latitude,
                longitude: item.longitude,
                image_url: item.image_url,
                sequence: index + 1, // 프론트에서 순서를 바꿨을 수도 있으니 재정렬
            })),
        });

        // Cascade 옵션이 있다면 이거 한 방으로 DailyPlanner와 PlannerItems가 모두 저장됩니다!
        return await this.dailyPlannerRepository.save(newPlan);
    }

    async findAllByTravel(travelId: number) {
        return await this.dailyPlannerRepository.find({
            where: { travel: { id: travelId } as any },
            relations: ['items'],
            order: { plan_date: 'ASC' },
        });
    }

    async findOne(id: number) {
        const plan = await this.dailyPlannerRepository.findOne({
            where: { id },
            relations: ['items'],
        });
        if (!plan) throw new NotFoundException('일정을 찾을 수 없습니다.');
        return plan;
    }

    update(id: number, updatePlannerDto: UpdatePlannerDto) {
        return `This action updates a #${id} planner`;
    }

    remove(id: number) {
        return `This action removes a #${id} planner`;
    }
}
