import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, UsePipes, ValidationPipe, ParseIntPipe } from '@nestjs/common';
import { SpendingService } from './spending.service';
import { CreateSpendingDto } from './dto/create-receipt.dto';
import { UpdateSpendingDto } from './dto/update-receipt.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('지출(支出) API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/spending')
export class SpendingController {
    constructor(private readonly spendingService: SpendingService) { }

    @Post('receipt/upload')
    @ApiOperation({ summary: '영수증 이미지 업로드 및 분석' })
    @ApiConsumes('multipart/form-data') // 중요: 파일 업로드 형식 명시
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { // 이 이름이 FileInterceptor('file')의 이름과 일치해야 함
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file')) // 프론트에서 보낼 필드명
    @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false }))
    async uploadReceipt(@UploadedFile() file: Express.Multer.File) {
        console.log('영수증 업로드 API 호출, 파일명:', file.originalname);
        return this.spendingService.analyzeReceipt(file);
    }

    @ApiOperation({ summary: '여행 ID에 따른 영수증 저장' })
    @Post('receipt/:travel_id')
    create(@Param('travel_id') travel_id: string, @Body() createSpendingDto: CreateSpendingDto) {
        return this.spendingService.create(createSpendingDto, +travel_id);
    }

    @ApiOperation({ summary: '영수증 목록 조회' })
    @Get('receipt/:travel_id')
    findAll(@Param('travel_id') travel_id: number) {
        return this.spendingService.findAll(travel_id);
    }

    @ApiOperation({ summary: '단일 영수증 조회' })
    @Get('receipt/:travel_id/:id')
    findOne(@Param('travel_id') travel_id: number, @Param('id') id: number) {
        return this.spendingService.findOne(travel_id, id);
    }

    @ApiOperation({ summary: '영수증 수정' })
    @Patch('receipt/:id')
    update(@Param('id') id: string, @Body() updateSpendingDto: UpdateSpendingDto) {
        return this.spendingService.update(+id, updateSpendingDto);
    }

    @ApiOperation({ summary: '영수증 삭제' })
    @Delete('receipt/:id')
    remove(@Param('id') id: string) {
        return this.spendingService.remove(+id);
    }

    @ApiOperation({ summary: '특정 날짜의 영수증 정보 조회' })
    @Get('receipt/:travel_id/date/:date')
    selectedDayInfo(@Param('travel_id', ParseIntPipe) travel_id: number, @Param('date') date: string) {
        console.log(`특정 날짜의 영수증 정보 조회 API 호출, travel_id: ${travel_id}, date: ${date}`);
        return this.spendingService.selectedDayInfo(travel_id, new Date(date));
    }

    @ApiOperation({ summary: '총 지출 금액 조회' })
    @Get(':travel_id/total')
    totalSpending(@Param('travel_id', ParseIntPipe) travel_id: number) {
        console.log(`총 지출 금액 조회 API 호출, travel_id: ${travel_id}`);
        return this.spendingService.totalSpending(travel_id);
    }

    @ApiOperation({ summary: '카테고리별 지출 금액 조회' })
    @Get(':travel_id/category')
    categorySpending(@Param('travel_id', ParseIntPipe) travel_id: number) {
        console.log(`카테고리별 지출 금액 조회 API 호출, travel_id: ${travel_id}`);
        return this.spendingService.categorySpending(travel_id);
    }

    @ApiOperation({ summary: '최근 3개의 영수증 조회' })
    @Get(':travel_id/recent')
    recentReceipts(@Param('travel_id', ParseIntPipe) travel_id: number) {
        console.log(`최근 3개의 영수증 조회 API 호출, travel_id: ${travel_id}`);
        return this.spendingService.recentReceipts(travel_id);
    }
}
