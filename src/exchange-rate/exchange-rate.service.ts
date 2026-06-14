import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { Repository } from 'typeorm';
import dayjs from 'dayjs';

@Injectable()
export class ExchangeRateService {
    constructor(@InjectRepository(ExchangeRate) private readonly exchangeRateRepository: Repository<ExchangeRate>) { }

    async getRate() {
        const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        let yesterdayRate: number;
        
        const rateEntry = await this.exchangeRateRepository.findOne({
            where: { date: yesterday as any },
        });

        if (rateEntry) {
            yesterdayRate = rateEntry.rate;
        } else {
            console.log('어제 환율 정보 저장 중');
            yesterdayRate = await this.getLatestAvailableRate(yesterday);
        }
        
        console.log('어제 환율 정보:', yesterdayRate);

        const rateResponse = await fetch("https://api.exchangerate.fun/latest?base=JPY")

        const currentData = await rateResponse.json();
        const currentDataTime = currentData.timestamp;
        const currentRate = currentData.rates.KRW * 100;

        const difference = currentRate - yesterdayRate;
        const changePercentage = (difference / yesterdayRate) * 100;


        const data = {
            time: currentDataTime,
            now_rate: currentRate.toFixed(2),
            yesterday_rate: yesterdayRate.toFixed(2),
            rate_compare: changePercentage.toFixed(2),
            status: difference > 0 ? '+' : difference < 0 ? '-' : '='
        }

        console.log('환율 비교 결과:', data);

        return data;
    }

    async getExchangeRateAPI(yesterday: string): Promise<number | null> {
        const baseUrl = 'https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?';
        const apiKey = process.env.KOREAEXIM_API_KEY;
        const url = `${baseUrl}authkey=${apiKey}&searchdate=${yesterday}&data=AP01`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (!Array.isArray(data)) {
                console.error('API 응답 형식이 올바르지 않습니다:', data);
                return null;
            }

            const yen_data = data.find((item: any) => item.cur_unit == 'JPY(100)');
            if (!yen_data || !yen_data.deal_bas_r) {
                return null;
            }

            const yen_rate = yen_data.deal_bas_r.replace(/,/g, '');
            console.log(`${yesterday} JPY(100) 환율: ${yen_rate}`);

            return Number(yen_rate);
        } catch (error) {
            console.error('환율 API 호출 에러:', error);
            return null;
        }
    }

    // 데이터가 있을 때까지 과거로 가는 핵심 함수
    async getLatestAvailableRate(targetDate: string, retryCount = 0): Promise<number> {
        if (retryCount > 10) {
            console.error('환율 정보를 찾을 수 없습니다 (10회 시도 초과)');
            return 900; // 최후의 수단으로 기본값 반환 (혹은 에러 발생)
        }

        // 1. 먼저 DB에 해당 날짜 데이터가 있는지 확인
        const rateEntry = await this.exchangeRateRepository.findOne({
            where: { date: targetDate as any }
        });

        if (rateEntry) return rateEntry.rate;

        // 2. DB에 없으면 API 호출
        console.log(`${targetDate} 데이터 조회 중... (시도: ${retryCount + 1})`);
        const apiData = await this.getExchangeRateAPI(targetDate);

        // 3. API에도 데이터가 없으면 하루씩 과거로 가면서 재귀 호출
        if (apiData === null || isNaN(apiData)) {
            const dayBefore = dayjs(targetDate).subtract(1, 'day').format('YYYY-MM-DD');
            return this.getLatestAvailableRate(dayBefore, retryCount + 1);
        }

        // 4. 데이터가 있다면 JPY(100) 찾아서 DB 저장 후 반환
        const newRate = this.exchangeRateRepository.create({
            date: targetDate as any,
            rate: apiData,
        });
        await this.exchangeRateRepository.save(newRate);
        return apiData;
    }

}
