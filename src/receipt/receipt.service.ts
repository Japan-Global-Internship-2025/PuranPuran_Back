import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { Receipt } from './entities/receipt.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ExchangeRateService } from 'src/exchange-rate/exchange-rate.service';
import dayjs from 'dayjs';
import sharp from 'sharp';
import Groq from 'groq-sdk';

@Injectable()
export class ReceiptService {
    // private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    private groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
    });
    constructor(
        @InjectRepository(Receipt) private receiptRepository: Repository<Receipt>,
        private readonly exchangeRateService: ExchangeRateService,
    ) { }

    async create(createReceiptDto: CreateReceiptDto, travel_id: number) {
        const amount_total = createReceiptDto.total_amount;
        const nowday = dayjs().subtract(0, 'day').format('YYYY-MM-DD');
        const amount_total_krw = (await this.exchangeRateService.getExchangeRateAPI(nowday) / 100) * amount_total;
        return await this.receiptRepository.save({ ...createReceiptDto, travel_id, total_krw: amount_total_krw });
    }

    async findAll(travel_id: number) {
        return await this.receiptRepository.find({ where: { travel_id } });
    }

    async findOne(travel_id: number, id: number) {
        return await this.receiptRepository.findOneBy({ id, travel_id });
    }

    async update(id: number, updateReceiptDto: UpdateReceiptDto) {
        return await this.receiptRepository.update(id, updateReceiptDto);
    }

    async remove(id: number) {
        return await this.receiptRepository.delete(id);
    }

    async selectedDayInfo(travel_id: number, date: Date) {
        const receipts = await this.receiptRepository.find({ where: { travel_id, date } });
        const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.total_amount, 0);
        const totalAmountKrw = receipts.reduce((sum, receipt) => sum + receipt.total_krw, 0);
        return { date, totalAmount, totalAmountKrw };
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
      날짜 정보는 대부분 위에 존재해. 만약 오늘와 비교해서 6개월 이상 과거이거나 오늘보다 미래라면 다시 확인해주고, 그래도 안 나오거나 이상하면 오늘 날짜로 해.
      시간 정보는 이미지에서 찾은 그대로 HH:mm 형식으로 표기하고, 시간은 날짜 옆에 붙어 있으니 날짜와 함께 찾아.
      가격 정보가 여러개라면 각각의 줄을 확인해서 왼쪽의 글씨가 '合計', '小計', '計', 'TOTAL' 등과 같은 줄에 있는 숫자만 total_amount로 인식해. 
      만약 그런 줄이 없다면 숫자중에 '¥'가 있는 숫자 중에서 가장 큰 숫자을 total_amount로 인식해.
      마크다운(\`\`\`json)이나 다른 인사말, 설명은 절대 넣지 말고 오직 JSON 중괄호 {} 만 출력해.

      {
        "store_name": "가게 이름 (모르면 '알 수 없음')",
        'location': '가게 위치 (모르면 "알 수 없음")',
        "date": "YYYY-MM-DD 형식 (모르면 null)",
        "time": "HH:mm 형식 (모르면 null)",
        "total_amount": "총 결제 금액 (int값)",
        "category": "식비, 여가, 쇼핑, 기타 중 하나"
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
        return await this.receiptRepository.find({
            where: { travel_id },
            order: { date: 'DESC', id: 'DESC' },
            take: 3,
        });
    }

}
