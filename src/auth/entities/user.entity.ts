import { Travel } from 'src/travel/entities/travel-entity';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 50 })
    user_id: string;

    @Column({ length: 255, select: false })
    user_pw: string;

    @Column({ length: 50 })
    user_email: string;

    @Column({ length: 30 })
    taste: string;

    @CreateDateColumn()
    created_at: Date;

    @OneToMany(() => Travel, (travel) => travel.user_id)
    travels: Travel[];
}
