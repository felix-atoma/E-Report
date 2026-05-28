import { Body, Controller, Post } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { ChatDto } from './dto/chat.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('chat')
  async chat(@Body() dto: ChatDto, @CurrentUser() user: any) {
    const reply = await this.assistantService.chat(user?.role ?? 'STUDENT', dto);
    return { reply };
  }
}
