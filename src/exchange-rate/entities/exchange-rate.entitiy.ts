import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ExchangeRate {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date', unique: true })
    date: Date;

    @Column({
        type: 'decimal', 
        precision: 10, scale: 2, 
        transformer: {
            to: (value: number) => value,
            from: (value: string) => parseFloat(value), // DB에서 꺼낼 때 숫자로 변환
        },
    })
    rate: number;

    @CreateDateColumn()
    created_at: Date;
}