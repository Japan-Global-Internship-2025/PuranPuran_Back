import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity()
export class TravelRegion {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ length: 50 })
    region!: string; // 여행 지역 (ex. tokyo, osaka)

    @Column({ name: 'region_ko', length: 50, comment: '한글 지명' })
    region_ko!: string; // 여행 지역 한글 (ex. 도쿄, 오사카)
}

