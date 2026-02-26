import { PartialType } from '@nestjs/swagger';
import { CreateSpendingDto } from './create-receipt.dto';

export class UpdateSpendingDto extends PartialType(CreateSpendingDto) {}
