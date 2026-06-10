import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { JapaneseExpression } from './entities/japanese-expression.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class JapaneseService {
  constructor(
    @InjectRepository(JapaneseExpression)
    private expressionRepository: Repository<JapaneseExpression>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getDailyExpression(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['currentExpression'],
    });

    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }

    const today = new Date().toISOString().split('T')[0];

    // 만약 오늘 이미 업데이트했거나, 이미 할당된 표현이 오늘 날짜라면 그대로 반환
    if (user.expressionUpdatedAt === today && user.currentExpression) {
      return user.currentExpression;
    }

    // 새로운 표현 할당
    return this.refreshExpression(userId);
  }

  async refreshExpression(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['currentExpression'],
    });

    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }

    // 현재 보고 있는 것과 다른 랜덤 표현 선택
    let randomExpression: JapaneseExpression | null = null;
    
    const count = await this.expressionRepository.count();
    if (count === 0) {
      // 데이터가 없으면 시딩 시도 (여기서는 간단히 에러)
      throw new NotFoundException('등록된 일본어 표현이 없습니다.');
    }

    if (user.currentExpression) {
      randomExpression = await this.expressionRepository
        .createQueryBuilder('expression')
        .where('expression.id != :id', { id: user.currentExpression.id })
        .orderBy('RAND()') // MySQL 기준
        .getOne();
    }

    // 만약 하나뿐이거나 위에서 못 찾았으면 그냥 아무거나 하나
    if (!randomExpression) {
      randomExpression = await this.expressionRepository
        .createQueryBuilder('expression')
        .orderBy('RAND()')
        .getOne();
    }

    if (!randomExpression) {
      throw new NotFoundException('일본어 표현을 가져올 수 없습니다.');
    }

    const today = new Date().toISOString().split('T')[0];
    await this.userRepository.update(userId, {
      currentExpression: randomExpression,
      expressionUpdatedAt: today,
    });

    return randomExpression;
  }

  // 초기 데이터 시딩용 (간단히)
  async seedInitialData() {
    const count = await this.expressionRepository.count();
    if (count > 0) return;

    const initialData = [
      {
        category: '인사',
        japanese: 'こんにちは',
        pronunciation: '곤니치와',
        korean_translation: '안녕하세요 (낮 인사)',
        example_sentence: '皆さん, こんにちは！',
        example_translation: '여러분, 안녕하세요!',
      },
      {
        category: '식사',
        japanese: 'いただきます',
        pronunciation: '이타다키마스',
        korean_translation: '잘 먹겠습니다',
        example_sentence: 'ご飯を食べる前に、いただきますと言います。',
        example_translation: '밥을 먹기 전에, "잘 먹겠습니다"라고 말합니다.',
      },
      {
        category: '감사',
        japanese: 'ありがとうございます',
        pronunciation: '아리가토 고자이마스',
        korean_translation: '감사합니다',
        example_sentence: '手伝ってくれて、ありがとうございます。',
        example_translation: '도와주셔서 감사합니다.',
      },
      {
        category: '질문',
        japanese: 'トイレはどこですか？',
        pronunciation: '토이레와 도코데스카?',
        korean_translation: '화장실은 어디인가요?',
        example_sentence: 'すみません、トイレはどこですか？',
        example_translation: '실례합니다, 화장실은 어디인가요?',
      },
      {
        category: '쇼핑',
        japanese: 'これはいくらですか？',
        pronunciation: '코레와 이쿠라데스카?',
        korean_translation: '이것은 얼마인가요?',
        example_sentence: 'あの、これはいくらですか？',
        example_translation: '저기, 이것은 얼마인가요?',
      },
    ];

    await this.expressionRepository.save(initialData);
  }
}
