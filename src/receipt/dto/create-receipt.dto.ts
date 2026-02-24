import { IsEnum, IsDateString, IsNumber, IsString } from "class-validator";
import { Category, Currency, PaymentMethod } from '../entities/receipt.entity';

export class CreateReceiptDto {

    @IsString()
    title: string; // 영수증 이름

    @IsNumber()
    total_amount: number; // 영수증 금액

    @IsDateString()
    date: Date; // 영수증 날짜

    @IsEnum(Currency)
    currency: Currency;

    @IsEnum(PaymentMethod)
    payment_method: PaymentMethod;

    @IsEnum(Category)
    category: Category;
}
