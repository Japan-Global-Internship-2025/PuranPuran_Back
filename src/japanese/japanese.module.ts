import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JapaneseExpression } from './entities/japanese-expression.entity';
import { JapaneseService } from './japanese.service';
import { JapaneseController } from './japanese.controller';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JapaneseExpression, User])],
  controllers: [JapaneseController],
  providers: [JapaneseService],
  exports: [JapaneseService],
})
export class JapaneseModule {}
