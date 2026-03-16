import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { DailyPlanner } from './daily-planner.entity';

@Entity()
export class PlannerItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sequence: number; // 순서 (1, 2, 3...)

  @Column({ type: 'time' })
  visit_time: string; // 방문 시간 (예: 12:00:00)

  @Column()
  place_name: string; // 장소 이름 (예: 오스상점가)

  @Column()
  category: string; // 카테고리 (예: 쇼핑·역주변)

  @Column()
  image_url: string; // 사진 URL

  @Column('text')
  description: string; // 짧은 설명

  // 🗺️ 지도 핀을 찍기 위한 위도/경도 (선택이지만 필수급 추천)
  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column('text', { nullable: true })
  location: string; // 장소 주소

  // 어떤 하루 일정에 속하는지
  @ManyToOne(() => DailyPlanner, planner => planner.items, { onDelete: 'CASCADE' })
  dailyPlanner: DailyPlanner;
}