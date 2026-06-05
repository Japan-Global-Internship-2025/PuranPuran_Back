import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TravelRegion } from './travel-region.entity';

@Entity()
export class RecommendPlace {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => TravelRegion, (travelRegion) => travelRegion.id)
    @JoinColumn({ name: 'region_id' })
    travelRegion!: TravelRegion; // 여행 지역

    @Column({ length: 100 })
    title!: string; // 추천 장소

    @Column({ length: 255 })
    description!: string; // 추천 장소 설명

    @Column({ length: 100 })
    category!: string; // 추천 장소 카테고리 (ex. 관광지, 음식점, 쇼핑 등)
}
