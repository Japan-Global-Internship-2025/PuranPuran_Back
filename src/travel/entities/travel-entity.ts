import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { Receipt } from 'src/receipt/entities/receipt.entity';

@Entity()
export class Travel {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.travels, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user_id: string;

    @Column({ length: 50 })
    travel_name: string; // 여행 이름

    @Column({ type: 'text' })
    travel_region: string; //여행 지역 (ex. 기후현 오가키시)

    @Column({ type: 'datetime' })
    travel_start_date: Date; // 여행 시작 날짜

    @Column({ type: 'datetime' })
    travel_end_date: Date; // 여행 종료 날짜

    @Column({ type: 'int' })
    travel_budget: number; // 여행 예산

    @Column({ type: 'text', nullable: true })
    lodging_info: string; // 숙박 정보 (호텔 이름, 주소 등)

    @OneToMany(() => Receipt, (receipt) => receipt.travel)
    receipts: Receipt[];

    @CreateDateColumn()
    created_at: Date;
}
