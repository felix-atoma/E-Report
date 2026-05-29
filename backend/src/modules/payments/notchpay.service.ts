import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

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

const NOTCHPAY_API = 'https://api.notchpay.co';

@Injectable()
export class NotchpayService {
  private readonly logger = new Logger(NotchpayService.name);
  private readonly enabled: boolean;
  private readonly publicKey: string;
  private readonly hashKey: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    this.publicKey  = config.get<string>('NOTCHPAY_PUBLIC_KEY', '');
    this.hashKey    = config.get<string>('NOTCHPAY_HASH_KEY', '');
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');

    this.enabled = !!(this.publicKey && this.publicKey.startsWith('pk_'));

    if (this.enabled) {
      const env = config.get<string>('NOTCHPAY_ENVIRONMENT', 'test');
      this.logger.log(`Notchpay provider: ${env}`);
    } else {
      this.logger.warn('Notchpay not configured — set NOTCHPAY_PUBLIC_KEY to enable online payments');
    }
  }

  get isEnabled() { return this.enabled; }

  async createTransaction(dto: InitiateMomoDto): Promise<{ url: string; reference: string }> {
    if (!this.enabled) {
      throw new BadRequestException('Le paiement en ligne n\'est pas encore configuré.');
    }

    const reference = `NVB-${uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()}`;

    const payload = {
      email: dto.parentEmail,
      amount: Math.round(dto.amount),
      currency: 'XOF',
      description: dto.description ?? `Frais scolaires — ${dto.academicYear}${dto.term ? ' / ' + dto.term : ''}`,
      callback: `${this.frontendUrl}/payment-return`,
      reference,
      metadata: {
        studentId: dto.studentId,
        institutionId: dto.institutionId,
        academicYear: dto.academicYear,
        term: dto.term ?? '',
      },
    };

    const response = await axios.post(`${NOTCHPAY_API}/payments/initialize`, payload, {
      headers: {
        Authorization: this.publicKey,
        'Content-Type': 'application/json',
      },
    });

    const authUrl: string = response.data?.transaction?.authorization_url;
    if (!authUrl) throw new BadRequestException('Notchpay did not return a payment URL');

    this.logger.log(`Notchpay transaction created: ${reference} for student ${dto.studentId}`);
    return { url: authUrl, reference };
  }

  async verifyTransaction(reference: string): Promise<{ complete: boolean; amount: number; metadata: any }> {
    if (!this.enabled) throw new BadRequestException('Notchpay not configured');

    const response = await axios.get(`${NOTCHPAY_API}/payments/${reference}`, {
      headers: { Authorization: this.publicKey },
    });

    const txn = response.data?.transaction ?? response.data;
    return {
      complete: txn?.status === 'complete',
      amount: txn?.amount ?? 0,
      metadata: txn?.metadata ?? {},
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.hashKey) return true; // skip verification if hash key not set
    const expected = crypto.createHmac('sha256', this.hashKey).update(rawBody).digest('hex');
    return expected === signature;
  }
}
