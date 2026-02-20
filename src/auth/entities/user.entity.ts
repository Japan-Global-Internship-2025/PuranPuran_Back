import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

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
}
