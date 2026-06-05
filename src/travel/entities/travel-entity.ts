import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Spending } from '../../spending/entities/spending.entity';
import { DailyPlanner } from '../../planner/entities/daily-planner.entity';
import { TravelRegion } from './travel-region.entity';

@Entity()
export class Travel {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User, (user) => user.travels, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ length: 50 })
    travel_name!: string; // 여행 이름

    @Column({ type: 'text' })
    travel_region!: string; //여행 지역 (ex. 기후현 오가키시)

    @ManyToOne(() => TravelRegion, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'travel_region_id' })
    travel_region_id!: TravelRegion; // 여행 지역 ID (ex. 1: 도쿄, 2: 오사카)

    @Column({ type: 'datetime' })
    travel_start_date!: Date; // 여행 시작 날짜

    @Column({ type: 'datetime' })
    travel_end_date!: Date; // 여행 종료 날짜

    @Column({ type: 'int' })
    travel_budget!: number; // 여행 예산

    @Column({ type: 'simple-array', nullable: true })
    transportation!: string[]; // 여행 교통 수단 (ex. 비행기, 기차, 버스 등)

    @Column({ type: 'simple-array', nullable: true })
    walk_distance!: string[] | null; // 총 여행 도보 거리 (km)

    @Column({ type: 'text', nullable: true })
    lodging_info!: string; // 숙박 정보 (호텔 이름, 주소 등)

    @Column({ type: 'json', nullable: true })
    places!: string[]; // 총 여행 플래너: 방문할 장소 리스트

    @OneToMany(() => Spending, (spending) => spending.travel)
    spendings!: Spending[];

    @OneToMany(() => DailyPlanner, (dailyPlanner) => dailyPlanner.travel)
    dailyPlanners!: DailyPlanner[];

    @CreateDateColumn()
    created_at!: Date;
}
