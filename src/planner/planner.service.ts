import { Injectable } from '@nestjs/common';
import { CreatePlannerDto } from './dto/create-planner.dto';
import { UpdatePlannerDto } from './dto/update-planner.dto';
import { PlannerItem } from './entities/planner-item.entity';
import { Repository, LessThan } from 'typeorm';
import { DailyPlanner } from './entities/daily-planner.entity';
import { InjectRepository } from '@nestjs/typeorm';
import Groq from 'groq-sdk';
import { InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Travel } from '../travel/entities/travel-entity';
import { tavily } from "@tavily/core";
import { SavePlannerDto } from './dto/save-planner.dto';
import axios from 'axios';

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

    // 해당 여행이 요청 사용자 소유인지 검증
    private async assertTravelOwned(travelId: number, userId: number) {
        const travel = await this.travelRepository.findOne({
            where: { id: travelId, user: { id: userId } },
        });
        if (!travel) {
            throw new NotFoundException('해당 여행 정보를 찾을 수 없거나 권한이 없습니다.');
        }
    }

    // 해당 플래너가 요청 사용자 소유인지 검증 (plannerId 기반)
    private async assertPlannerOwned(plannerId: number, userId: number) {
        const planner = await this.dailyPlannerRepository.findOne({
            where: { id: plannerId },
            relations: ['travel', 'travel.user'],
        });
        if (!planner || planner.travel?.user?.id !== userId) {
            throw new NotFoundException('일정을 찾을 수 없거나 권한이 없습니다.');
        }
    }

    private async getPixabayImage(keyword: string, placeName: string): Promise<string> {
        if (!keyword) return '';
        const apiKey = process.env.PIXABAY_API_KEY;
        if (!apiKey) {
            console.warn('PIXABAY_API_KEY가 설정되지 않았습니다.');
            return '';
        }

        try {
            const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(keyword + '_' + placeName)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=3`;
            const response = await axios.get(url);
            const hits = response.data.hits;
            if (hits && hits.length > 0) {
                return hits[0].webformatURL;
            }
            return '';
        } catch (error) {
            console.error('Pixabay 이미지 검색 실패:', error);
            return '';
        }
    }

    // 💡 여행 전체의 대략적인 일정을 AI가 추천해줍니다.
    async generateTotalPlanSummary(travelId: number, userId: number) {
        await this.assertTravelOwned(travelId, userId);
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

      응답은 반드시 한국어로 하고, 아래 구조의 JSON 배열을 포함하는 객체여야 해:
      {
        "dailyPlans": [
          {
            "plan_date": "YYYY-MM-DD",
            "place": "해당 날짜에 가면 좋을 장소나 지역 (예: 나고야역 주변)",
            "category": "카테고리(예: 관광·역주변, 쇼핑·번화가, 음식·맛집 등)",
            "daily_description": "해당 날짜의 대략적인 일정 설명 (ex. 나고야역 중심의 쇼핑과 먹거리 투어)",
            "latitude": 해당 장소의 위도 (숫자형, 예: 35.1706),
            "longitude": 해당 장소의 경도 (숫자형, 예: 136.9067)
          }
        ]
      }
      * 위경도는 place에 해당하는 실제 위치를 최대한 정확하게 넣어줘.
    `;

        try {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: '너는 일본 여행 플래너야. 반드시 JSON 형식으로만 대답해.' },
                    { role: 'user', content: prompt },
                ],
                model: 'qwen/qwen3-32b',
                response_format: { type: 'json_object' },
            });

            return JSON.parse(chatCompletion.choices[0].message.content!);
        } catch (error) {
            console.error('전체 일정 요약 생성 실패:', error);
            throw new InternalServerErrorException('전체 일정 요약을 생성하는 중 에러가 발생했습니다.');
        }
    }

    // 💡 AI가 추천해준 혹은 사용자가 수정한 '전체 대략적 일정'을 저장합니다.
    async saveTotalPlan(travelId: number, saveTotalPlanDto: SaveTotalPlanDto, userId: number) {
        await this.assertTravelOwned(travelId, userId);
        const travel = await this.travelRepository.findOne({ where: { id: travelId } });
        if (!travel) throw new NotFoundException('여행 정보를 찾을 수 없습니다.');

        const savedPlans: DailyPlanner[] = [];
        for (const plan of saveTotalPlanDto.dailyPlans) {
            let dailyPlanner = await this.dailyPlannerRepository.findOne({
                where: { travel: { id: travelId } as any, plan_date: plan.plan_date }
            });

            if (dailyPlanner) {
                dailyPlanner.daily_description = plan.daily_description;
                if (plan.latitude != null) dailyPlanner.latitude = plan.latitude;
                if (plan.longitude != null) dailyPlanner.longitude = plan.longitude;
            } else {
                dailyPlanner = this.dailyPlannerRepository.create({
                    travel: { id: travelId } as any,
                    place: plan.place,
                    category: plan.category,
                    plan_date: plan.plan_date,
                    daily_description: plan.daily_description,
                    latitude: plan.latitude,
                    longitude: plan.longitude,
                });
            }
            savedPlans.push(await this.dailyPlannerRepository.save(dailyPlanner));
        }
        return savedPlans;
    }

    // 💡 총 여행 플래너의 장소 리스트를 저장합니다.
    async saveTotalPlanPlaces(travelId: number, places: string[], userId: number) {
        await this.assertTravelOwned(travelId, userId);
        const travel = await this.travelRepository.findOne({ where: { id: travelId } });
        if (!travel) throw new NotFoundException('여행 정보를 찾을 수 없습니다.');

        travel.places = places;
        await this.travelRepository.save(travel);
        return { message: '총 여행 플래너 장소가 성공적으로 저장되었습니다.' };
    }


    async createAIPlan(travelId: number, createPlannerDto: CreatePlannerDto, userId: number) {
        await this.assertTravelOwned(travelId, userId);
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

        if (!existingDailyPlan) {
            throw new BadRequestException('전체 일정 요약(총 여행 플래너)이 먼저 생성되어야 합니다.');
        }

        // 이전 날짜들의 일정을 가져와서 중복 장소를 피하도록 합니다.
        const previousPlans = await this.dailyPlannerRepository.find({
            where: {
                travel: { id: travelId } as any,
                plan_date: LessThan(createPlannerDto.plan_date)
            },
            relations: ['items']
        });

        const visitedPlaces = previousPlans.flatMap(plan =>
            plan.items.map(item => item.place_name)
        );

        let searchResponse;
        const searchQuery = `${travelInfo.travel_region} ${existingDailyPlan?.daily_description || ''} 맛집 및 가볼만한 곳 추천`;
        try {
            searchResponse = await this.tavily.search(searchQuery, {
                searchDepth: "basic",
                maxResults: 10,
            });
        }
        catch (error) {
            console.error('Tavily 검색 실패:', error);
            searchResponse = { results: [] }; // 검색 실패 시 빈 결과로 대체
        }


        // 검색된 내용을 텍스트로 합치기
        const searchContext = searchResponse.results
            .map(r => `제목: ${r.title}, 내용: ${r.content}`)
            .join("\n");

        const prompt = this.buildPrompt(createPlannerDto, travelInfo, searchContext, existingDailyPlan?.daily_description, visitedPlaces);
        console.log('생성된 프롬프트:', prompt); // 디버깅을 위한 프롬프트 출력

        try {
            // 2. Groq API 호출
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: '너는 일본 여행 일정 짜기 전문가야. 반드시 JSON 형식으로만 대답해.' },
                    { role: 'user', content: prompt },
                ],
                model: 'qwen/qwen3-32b',
                response_format: { type: 'json_object' },
            });

            const aiResponse = JSON.parse(chatCompletion.choices[0].message.content!);
            const items = aiResponse.itinerary;

            // Pixabay에서 이미지 검색하여 가져오기
            const itemsWithImages = await Promise.all(items.map(async (item) => {
                const imageUrl = await this.getPixabayImage(item.image_url, item.place_name);
                return {
                    ...item,
                    image_url: imageUrl || 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=500&q=80' // 결과 없으면 기본 이미지
                };
            }));

            // 3. DB 저장 (기존 정보가 있으면 업데이트, 없으면 새로 생성)
            const newPlan = existingDailyPlan || this.dailyPlannerRepository.create({
                plan_date: createPlannerDto.plan_date,
                place: createPlannerDto.place,
                category: createPlannerDto.category,
                travel: { id: travelId } as any,
            });

            newPlan.start_time = createPlannerDto.start_time;
            newPlan.end_time = createPlannerDto.end_time;
            newPlan.ai_request = createPlannerDto.ai_request ?? null;
            newPlan.items = itemsWithImages.map((item, index) => ({
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
    private buildPrompt(createPlannerDto: CreatePlannerDto, travel: any, searchContext: string, dailyDescription?: string | null, visitedPlaces: string[] = []): string {
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
      - 이미 방문한 장소(중복 추천 금지): ${visitedPlaces.length > 0 ? visitedPlaces.join(', ') : '없음'}

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
      5. 중복 배제: [이미 방문한 장소] 목록에 있는 곳은 오늘 일정에서 제외할 것.
      6. 첫날은 숙소 주변에서 가볍게 시작하는 것을 추천. 마지막 날은 공항이나 역 근처에서 마무리하는 것을 추천.
      7. 장소 추천 시, 실제 존재하는 장소로만 짤 것. 그리고 위경도 정보도 최대한 정확하게 알려줄 것.

      응답은 반드시 아래 구조의 JSON 배열을 포함하는 객체여야 해:
      {
        "itinerary": [
          {
            "visit_time": "HH:mm",
            "place_name": "장소 이름",
            "category": "(예: 식사·인기, 쇼핑·역주변)",
            "description": "사용자의 취향과 부합하는지 1~2문장의 설명",
            "latitude": "숫자형 위도",
            "longitude": "숫자형 경도",
            "location": "장소의 주소",
            "image_url": "장소의 특징을 나타내는 영어 단어 1개(예: 'sushi', 'temple')" 
          }
        ]
      }
      * 주의: 실제 존재하는 장소로 짜고, 위경도는 최대한 정확하게 알려줘. 그리고 한국어로 대답해.
    `;
    }


    async savePlan(travelId: number, savePlannerDto: SavePlannerDto, userId: number) {
        await this.assertTravelOwned(travelId, userId);
        // 기존 일정이 있는지 먼저 확인 (있으면 삭제 후 재생성하여 중복 방지)
        const existingPlan = await this.dailyPlannerRepository.findOne({
            where: { travel: { id: travelId } as any, plan_date: savePlannerDto.plan_date },
        });

        if (existingPlan) {
            await this.dailyPlannerRepository.remove(existingPlan);
        }

        const newPlan = this.dailyPlannerRepository.create({
            place: savePlannerDto.place,
            category: savePlannerDto.category,
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

    async findAllByTravel(travelId: number, userId: number) {
        await this.assertTravelOwned(travelId, userId);
        const planners = await this.dailyPlannerRepository.find({
            where: { travel: { id: travelId } as any },
            relations: ['items'],
            order: { plan_date: 'ASC' },
        });

        // 각 플래너의 아이템들을 sequence 순으로 정렬
        planners.forEach(planner => {
            if (planner.items) {
                planner.items.sort((a, b) => a.sequence - b.sequence);
            }
        });

        return planners;
    }

    async findOne(id: number, userId: number) {
        await this.assertPlannerOwned(id, userId);
        const plan = await this.dailyPlannerRepository.findOne({
            where: { id },
            relations: ['items'],
        });
        if (!plan) throw new NotFoundException('일정을 찾을 수 없습니다.');

        // 아이템들을 sequence 순으로 정렬
        if (plan.items) {
            plan.items.sort((a, b) => a.sequence - b.sequence);
        }

        return plan;
    }

    async update(id: number, updatePlannerDto: UpdatePlannerDto, userId: number) {
        await this.assertPlannerOwned(id, userId);
        return `This action updates a #${id} planner`;
    }

    async remove(id: number, userId: number) {
        await this.assertPlannerOwned(id, userId);
        return `This action removes a #${id} planner`;
    }

    async getTodayPlan(plannerId: number, userId: number) {
        await this.assertPlannerOwned(plannerId, userId);
        return this.dailyPlannerRepository.findOne({
            where: { id: plannerId, plan_date: new Date().toISOString().split('T')[0] },
            relations: ['items'],
        });
    }
}
