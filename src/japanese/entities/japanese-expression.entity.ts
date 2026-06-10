import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class JapaneseExpression {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  category!: string;

  @Column({ type: 'text' })
  japanese!: string;

  @Column({ type: 'text' })
  pronunciation!: string;

  @Column({ type: 'text' })
  korean_translation!: string;

  @Column({ type: 'text'})
  audio_url!: string; // 발음 오디오 URL

}
