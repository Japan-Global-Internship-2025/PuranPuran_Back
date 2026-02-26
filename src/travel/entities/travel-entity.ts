import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { Spending } from 'src/spending/entities/spending.entity';
import { DailyPlanner } from 'src/planner/entities/daily-planner.entity';

@Entity()
export class Travel {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.travels, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

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

    @Column({ type: 'simple-json', nullable: true })
    places: string[]; // 총 여행 플래너: 방문할 장소 리스트

    @OneToMany(() => Spending, (spending) => spending.travel)
    spendings: Spending[];

    @OneToMany(() => DailyPlanner, (dailyPlanner) => dailyPlanner.travel)
    dailyPlanners: DailyPlanner[];

    @CreateDateColumn()
    created_at: Date;
}
