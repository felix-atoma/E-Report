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
  /** Override the callback path (default: /payment-return) */
  callbackPath?: string;
}

const NOTCHPAY_API = 'https://api.notchpay.co';

/**
 * Stateless Notchpay client — each school supplies its own public/hash key
 * (configured in Settings) so fee payments settle directly into that
 * school's own Notchpay account, never a platform-wide one.
 */
@Injectable()
export class NotchpayService {
  private readonly logger = new Logger(NotchpayService.name);
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  async createTransaction(publicKey: string, dto: InitiateMomoDto): Promise<{ url: string; reference: string }> {
    const reference = `NVB-${uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()}`;

    const payload = {
      email: dto.parentEmail,
      amount: Math.round(dto.amount),
      currency: 'XOF',
      description: dto.description ?? `Frais scolaires — ${dto.academicYear}${dto.term ? ' / ' + dto.term : ''}`,
      callback: `${this.frontendUrl}${dto.callbackPath ?? '/payment-return'}`,
      reference,
      metadata: {
        studentId: dto.studentId,
        institutionId: dto.institutionId,
        academicYear: dto.academicYear,
        term: dto.term ?? '',
      },
    };

    let response: any;
    try {
      response = await axios.post(`${NOTCHPAY_API}/payments/initialize`, payload, {
        headers: {
          Authorization: publicKey,
          'Content-Type': 'application/json',
        },
      });
    } catch (err: any) {
      const apiMsg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? 'Unknown error';
      this.logger.error(`Notchpay API error: ${JSON.stringify(err?.response?.data ?? err?.message)}`);
      throw new BadRequestException(`Notchpay: ${apiMsg}`);
    }

    this.logger.debug(`Notchpay response: ${JSON.stringify(response.data)}`);

    // authorization_url can sit at transaction.authorization_url or directly at authorization_url
    const authUrl: string =
      response.data?.transaction?.authorization_url ??
      response.data?.authorization_url ??
      response.data?.data?.authorization_url;

    if (!authUrl) {
      this.logger.error(`Notchpay unexpected response: ${JSON.stringify(response.data)}`);
      const apiMsg = response.data?.message ?? response.data?.error ?? 'No authorization_url in response';
      throw new BadRequestException(`Notchpay: ${apiMsg}`);
    }

    this.logger.log(`Notchpay transaction created: ${reference} for student ${dto.studentId}`);
    return { url: authUrl, reference };
  }

  async verifyTransaction(publicKey: string, reference: string): Promise<{ complete: boolean; amount: number; metadata: any }> {
    const response = await axios.get(`${NOTCHPAY_API}/payments/${reference}`, {
      headers: { Authorization: publicKey },
    });

    const txn = response.data?.transaction ?? response.data;
    return {
      complete: txn?.status === 'complete',
      amount: txn?.amount ?? 0,
      metadata: txn?.metadata ?? {},
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string, hashKey: string): boolean {
    if (!hashKey) return true; // skip verification if school hasn't set a hash key
    const expected = crypto.createHmac('sha256', hashKey).update(rawBody).digest('hex');
    return expected === signature;
  }
}
