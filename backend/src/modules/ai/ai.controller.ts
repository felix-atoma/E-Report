import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
}
