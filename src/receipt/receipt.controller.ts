import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, UsePipes, ValidationPipe } from '@nestjs/common';
import { ReceiptService } from './receipt.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('영수증 API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('receipt')
export class ReceiptController {
    constructor(private readonly receiptService: ReceiptService) { }

    @Post('upload')
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
        return this.receiptService.analyzeReceipt(file);
    }

    @ApiOperation({ summary: '여행 ID에 따른 영수증 저장' })
    @Post(':travel_id')
    create(@Param('travel_id') travel_id: string, @Body() createReceiptDto: CreateReceiptDto) {
        return this.receiptService.create(createReceiptDto, +travel_id);
    }

    @ApiOperation({ summary: '영수증 목록 조회' })
    @Get(':travel_id')
    findAll(@Param('travel_id') travel_id: number) {
        return this.receiptService.findAll(travel_id);
    }

    @ApiOperation({ summary: '단일 영수증 조회' })
    @Get(':travel_id/:id')
    findOne(@Param('travel_id') travel_id: number, @Param('id') id: number) {
        return this.receiptService.findOne(travel_id, id);
    }

    @ApiOperation({ summary: '영수증 수정' })
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateReceiptDto: UpdateReceiptDto) {
        return this.receiptService.update(+id, updateReceiptDto);
    }

    @ApiOperation({ summary: '영수증 삭제' })
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.receiptService.remove(+id);
    }
}
