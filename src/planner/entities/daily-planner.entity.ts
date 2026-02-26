// src/planner/entities/daily-planner.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Travel } from '../../travel/entities/travel-entity';
import { PlannerItem } from './planner-item.entity';

@Entity()
export class DailyPlanner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  plan_date: string; // 일정 날짜 (예: 2026-10-15)

  @Column({ type: 'time', nullable: true })
  start_time: string; // 희망 시작 시간 (예: 10:00:00)

  @Column({ type: 'time', nullable: true })
  end_time: string; // 희망 종료 시간 (예: 20:00:00)

  @Column({ type: 'text', nullable: true }) // 💡 MySQL이 이해할 수 있는 'text' 타입 지정
  daily_description: string;  // 해당 날짜의 대략적인 일정 설명 (ex. 나고야역, 사카에)

  @Column({ type: 'text', nullable: true }) // 💡 MySQL이 이해할 수 있는 'text' 타입 지정
  ai_request: string | null; // 유저가 입력한 한 줄 요청사항

  // 어떤 여행에 속하는지
  @ManyToOne(() => Travel, travel => travel.dailyPlanners)
  travel: Travel;

  // 이 하루에 포함된 여러 세부 일정들 (cascade를 켜두면 한 번에 저장하기 편합니다)
  @OneToMany(() => PlannerItem, item => item.dailyPlanner, { cascade: true })
  items: PlannerItem[];
}