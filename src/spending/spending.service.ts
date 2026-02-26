import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateSpendingDto } from './dto/create-receipt.dto';
import { UpdateSpendingDto } from './dto/update-receipt.dto';
import { Spending } from './entities/spending.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ExchangeRateService } from 'src/exchange-rate/exchange-rate.service';
import { Between } from 'typeorm'; // 상단에 추가 필수!
import dayjs from 'dayjs';
import sharp from 'sharp';
import Groq from 'groq-sdk';
import { NotFoundException } from '@nestjs/common/exceptions/not-found.exception';

@Injectable()
export class SpendingService {
    // private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    private groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
    });
    constructor(
        @InjectRepository(Spending) private spendingRepository: Repository<Spending>,
        private readonly exchangeRateService: ExchangeRateService,
    ) { }

    async create(createSpendingDto: CreateSpendingDto, travel_id: number) {
        const amount_total = createSpendingDto.total_amount;
        const nowday = dayjs().subtract(0, 'day').format('YYYY-MM-DD');
        const amount_total_krw = (await this.exchangeRateService.getExchangeRateAPI(nowday) / 100) * amount_total;
        return await this.spendingRepository.save({ ...createSpendingDto, travel: { id: travel_id }, total_krw: amount_total_krw });
    }

    async findAll(travel_id: number) {
        return await this.spendingRepository.find({ where: { travel: { id: travel_id } } });
    }

    async findOne(travel_id: number, id: number) {
        return await this.spendingRepository.findOneBy({ id, travel: { id: travel_id } });
    }

    async update(id: number, updateSpendingDto: UpdateSpendingDto) {
        const existingSpending = await this.spendingRepository.findOne({ where: { id } });
        if (!existingSpending) {
            throw new NotFoundException('해당 영수증을 찾을 수 없습니다.');
        }

        // 2. 만약 엔화 금액(total_amount)이 업데이트 항목에 포함되어 있다면?
        if (updateSpendingDto.total_amount !== undefined) {
            // 날짜는 업데이트하려는 날짜가 있으면 그것을 쓰고, 없으면 기존 날짜를 사용합니다.
            const targetDate = updateSpendingDto.date || existingSpending.date;
            const formattedDate = dayjs(targetDate).format('YYYY-MM-DD');

            // 환율 정보 가져오기
            const exchangeRate = await this.exchangeRateService.getExchangeRateAPI(formattedDate);
            (updateSpendingDto as any).total_krw = Math.floor((exchangeRate / 100) * updateSpendingDto.total_amount);

            console.log(`금액 변경 감지: ${updateSpendingDto.total_amount}JPY -> ${(updateSpendingDto as any).total_krw}KRW (환율: ${exchangeRate})`);
        }

        await this.spendingRepository.update(id, updateSpendingDto);

        return await this.spendingRepository.findOne({ where: { id } });
    }

    async remove(id: number) {
        return await this.spendingRepository.delete(id);
    }

    async selectedDayInfo(travel_id: number, date: Date) {
        const startOfDay = dayjs(date).startOf('day').toDate(); // 예: 2026-02-25 00:00:00
        const endOfDay = dayjs(date).endOf('day').toDate();     // 예: 2026-02-25 23:59:59

        // 2. Between 연산자를 사용하여 범위 내의 데이터 조회
        const receipts = await this.spendingRepository.find({
            where: {
                travel: { id: travel_id },
                date: Between(startOfDay, endOfDay) // 💡 범위 조회!
            }
        });

        const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.total_amount, 0);
        const totalAmountKrw = receipts.reduce((sum, receipt) => sum + receipt.total_krw, 0);

        return { receipts, date, totalAmount, totalAmountKrw };
    }

    async analyzeReceipt(file: Express.Multer.File) {
        try {
            console.log('1. 이미지 최적화 중 (AI가 잘 읽도록)...');
            const optimizedImageBuffer = await sharp(file.buffer)
                .resize({ width: 1500, withoutEnlargement: true, fit: 'inside' })
                .grayscale()
                .toBuffer();

            // 이미지를 AI가 읽을 수 있는 텍스트 형태(Base64)로 변환
            const base64Image = optimizedImageBuffer.toString('base64');
            const imageUrl = `data:${file.mimetype || 'image/jpeg'};base64,${base64Image}`;

            console.log('2. Groq Vision AI가 이미지를 직접 읽는 중...');

            const prompt = `
      다음은 일본 영수증 이미지야. 
      이미지에 있는 텍스트를 직접 읽고 분석해서 반드시 아래 JSON 형식으로만 대답해.
      스토어 이름은 이미지에서 찾은 그대로 일본어 혹은 영어로 표기만 해.
      가게 위치는 만약 위치 정보가 없거나 가게 이름과 똑같이 표시해.
      날짜 정보는 대부분 위에 존재해. 만약 6개월 이상 과거라면 다시 확인해. 만약 오늘보다 미래라면 다시 확인해주고, 그래도 이상하면 오늘 날짜로 해.
      시간 정보는 이미지에서 찾은 그대로 HH:mm 형식으로 표기하고, 시간은 날짜 옆에 붙어 있으니 날짜와 함께 찾아.
      가격 정보가 여러개라면 각각의 줄을 확인해서 왼쪽의 글씨가 '合計', '小計', '計', 'TOTAL' 등과 같은 줄에 있는 숫자만 total_amount로 인식해. 
      만약 그런 줄이 없다면 숫자중에 '¥'가 있는 숫자 중에서 가장 큰 숫자을 total_amount로 인식해.
      마크다운(\`\`\`json)이나 다른 인사말, 설명은 절대 넣지 말고 오직 JSON 중괄호 {} 만 출력해.

      {
        "title": "가게 이름 (모르면 '알 수 없음')",
        'location': '가게 위치 (모르면 "알 수 없음")',
        "date": "datetime 형식",
        "total_amount": "총 결제 금액 (int값)",
        "category": "식비, 여가, 쇼핑, 기타 중 하나",
        "payment_method": "CASH, CARD, OTHER 중 하나"
      }
      `;

            // Groq의 최신 시각(Vision) 모델 호출
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: imageUrl } },
                        ],
                    },
                ],
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            });

            const resultString = chatCompletion.choices[0]?.message?.content || '{}';
            console.log('✅ AI 원본 응답:', resultString);

            // AI가 혹시라도 마크다운(```json)을 섞어 보낼 경우를 대비해 순수 JSON만 추출
            const jsonMatch = resultString.match(/\{[\s\S]*\}/);
            const finalJsonString = jsonMatch ? jsonMatch[0] : resultString;

            return JSON.parse(finalJsonString);

        } catch (error) {
            console.error('❌ 영수증 분석 에러 상세:', error?.error?.error || error.message);
            throw new InternalServerErrorException('영수증을 분석하는 중 오류가 발생했습니다.');
        }
    }

    async recentReceipts(travel_id: number) {
        return await this.spendingRepository.find({
            where: { travel: { id: travel_id } },
            order: { date: 'DESC', id: 'DESC' },
            take: 3,
        });
    }

    async totalSpending(travel_id: number) {
        const receipts = await this.spendingRepository.find({ where: { travel: { id: travel_id } } });
        console.log(receipts);
        // const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.total_amount, 0);
        const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.total_krw, 0);
        return { totalAmount };
    }

    async categorySpending(travel_id: number) {
        const receipts = await this.spendingRepository.find({ where: { travel: { id: travel_id } } });
        const categoryTotals = receipts.reduce((totals, receipt) => {
            totals[receipt.category] = (totals[receipt.category] || 0) + receipt.total_krw;
            return totals;
        }, {});
        return categoryTotals;
    }
}
