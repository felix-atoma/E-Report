import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { UpsertGradeDto } from './upsert-grade.dto';

export class BulkGradesDto {
  @ApiProperty({ type: [UpsertGradeDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertGradeDto)
  grades: UpsertGradeDto[];
}
