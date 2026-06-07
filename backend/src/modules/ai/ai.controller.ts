import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('chat')
  @HttpCode(200)
  @ApiOperation({ summary: 'Ask the AI assistant a question about NovaBulletin' })
  async chat(
    @Body() body: { message: string; context?: string },
    @CurrentUser() user: any,
  ) {
    const answer = await this.ai.chat(body.message, user.role, body.context);
    return { answer };
  }

  @Post('report-comment')
  @HttpCode(200)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Generate an AI teacher comment for a report card' })
  async generateReportComment(
    @Body() body: {
      studentName: string;
      className: string;
      avg: number;
      mention: string;
      grades: { subject: string; score: number; coefficient: number }[];
    },
  ) {
    const comment = await this.ai.generateReportComment(body);
    return { comment };
  }
}
