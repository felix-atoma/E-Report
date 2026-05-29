import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as FedaPay from 'fedapay';

export interface InitiateMomoDto {
  studentId: string;
  institutionId: string;
  academicYear: string;
  term?: string;
  amount: number;
  parentName: string;
  parentEmail: string;
  description?: string;
}

@Injectable()
export class FedaPayService {
  private readonly logger = new Logger(FedaPayService.name);
  private readonly enabled: boolean;
  private readonly frontendUrl: string;
  private readonly backendUrl: string;

  constructor(private readonly config: ConfigService) {
    const secretKey = config.get<string>('FEDAPAY_SECRET_KEY', '');
    const environment = config.get<string>('FEDAPAY_ENVIRONMENT', 'sandbox');
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    this.backendUrl  = config.get<string>('APP_URL', 'http://localhost:4000');

    this.enabled = !!(secretKey && !secretKey.includes('your_key_here'));

    if (this.enabled) {
      (FedaPay as any).FedaPay.setApiKey(secretKey);
      (FedaPay as any).FedaPay.setEnvironment(environment);
      this.logger.log(`FedaPay provider: ${environment}`);
    } else {
      this.logger.warn('FedaPay not configured — set FEDAPAY_SECRET_KEY to enable online payments');
    }
  }

  get isEnabled() { return this.enabled; }

  async createTransaction(dto: InitiateMomoDto): Promise<{ url: string; fedapayId: number }> {
    if (!this.enabled) {
      throw new BadRequestException('Le paiement en ligne n\'est pas encore configuré. Contactez l\'administration.');
    }

    const [firstname, ...rest] = dto.parentName.trim().split(' ');
    const lastname = rest.join(' ') || firstname;

    const transaction = await (FedaPay as any).Transaction.create({
      description: dto.description ?? `Frais scolaires — ${dto.academicYear}${dto.term ? ' / ' + dto.term : ''}`,
      amount: Math.round(dto.amount),
      currency: { iso: 'XOF' },
      callback_url: `${this.frontendUrl}/payment-return`,
      customer: {
        firstname,
        lastname,
        email: dto.parentEmail,
      },
      custom_metadata: {
        studentId: dto.studentId,
        institutionId: dto.institutionId,
        academicYear: dto.academicYear,
        term: dto.term ?? '',
      },
    });

    const token = await transaction.generateToken();
    this.logger.log(`FedaPay transaction created: ${transaction.id} for student ${dto.studentId}`);

    return { url: token.url, fedapayId: transaction.id };
  }

  async verifyTransaction(fedapayId: number): Promise<{ approved: boolean; amount: number; metadata: any }> {
    if (!this.enabled) throw new BadRequestException('FedaPay not configured');

    const transaction = await (FedaPay as any).Transaction.retrieve(fedapayId);
    return {
      approved: transaction.status === 'approved',
      amount: transaction.amount,
      metadata: transaction.custom_metadata ?? {},
    };
  }
}
