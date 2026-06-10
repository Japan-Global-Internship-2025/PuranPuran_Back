import { Travel } from '../../travel/entities/travel-entity';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { JapaneseExpression } from '../../japanese/entities/japanese-expression.entity';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ length: 50 })
    user_id!: string;

    @Column({ length: 255, select: false })
    user_pw!: string;

    @Column({ length: 50 })
    user_email!: string;

    @Column({ length: 30 })
    taste!: string;

    @Column({ type: 'int', nullable: true })
    lastest_travel_id!: number | null;

    @CreateDateColumn()
    created_at!: Date;

    @OneToMany(() => Travel, (travel) => travel.user)
    travels!: Travel[];

    @ManyToOne(() => JapaneseExpression, { nullable: true })
    @JoinColumn({ name: 'current_expression_id' })
    currentExpression!: JapaneseExpression | null;

    @Column({ type: 'date', nullable: true })
    expressionUpdatedAt!: string | null;
}
