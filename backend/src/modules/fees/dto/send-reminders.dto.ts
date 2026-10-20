import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export const REMINDER_CHANNELS = ['WHATSAPP', 'SMS', 'EMAIL'] as const;
export type ReminderChannel = (typeof REMINDER_CHANNELS)[number];

export class SendRemindersDto {
  /** Canaux choisis par l'école ; tous par défaut */
  @IsOptional() @IsArray() @IsIn(REMINDER_CHANNELS as unknown as string[], { each: true })
  channels?: ReminderChannel[];

  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsString({ each: true })
  studentIds: string[];

  @IsString() @IsNotEmpty() @MaxLength(20)
  academicYear: string;
}
