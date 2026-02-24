import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Travel } from '../../travel/entities/travel-entity';

export enum Currency {
    KRW = 'KRW',
    JPY = 'JPY',
    USD = 'USD',
}

export enum PaymentMethod {
    CASH = 'CASH',
    CARD = 'CARD',
    OTHER = 'OTHER',
}

export enum Category {
    FOOD = '식비',
    LEISURE = '여가',
    SHOPPING = '쇼핑',
    OTHER = '기타',
}

@Entity('receipts')
export class Receipt {
    @PrimaryGeneratedColumn()
    id: number;

    // 여행 엔티티와 N:1 연결
    @ManyToOne(() => Travel, (travel) => travel.receipts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'travel_id' })
    travel: Travel;

    @Column()
    travel_id: number;

    @Column({ length: 100 })
    title: string; // 영수증 제목 (가게 이름)

    @Column({ type: 'datetime' })
    date: Date; // 결제 날짜 및 시간

    @Column({ type: 'enum', enum: Category, default: Category.OTHER })
    category: Category; // 영수증 카테고리

    @Column({ type: 'int' })
    total_amount: number; // 총액

    @Column({ type: 'int', })
    total_krw: number; // 총액 (KRW 환산)

    @Column({ type: 'enum', enum: Currency, default: Currency.JPY })
    currency: Currency;

    @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
    payment_method: PaymentMethod;

    @CreateDateColumn()
    created_at: Date;
}

