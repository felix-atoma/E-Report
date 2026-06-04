import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface CinetPayInitDto {
  studentId: string;
  institutionId: string;
  academicYear: string;
  term?: string;
  amount: number;
  parentName: string;
  parentEmail: string;
  description?: string;
}

const CINETPAY_API = 'https://api-checkout.cinetpay.com/v2';

@Injectable()
export class CinetpayService {
  private readonly logger = new Logger(CinetpayService.name);
  private readonly enabled: boolean;
  private readonly apiKey: string;
  private readonly siteId: string;
  private readonly frontendUrl: string;
  private readonly notifyUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey      = config.get<string>('CINETPAY_API_KEY', '');
    this.siteId      = config.get<string>('CINETPAY_SITE_ID', '');
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    this.notifyUrl   = config.get<string>('BACKEND_URL', 'http://localhost:4000') + '/api/payments/cinetpay/webhook';

    this.enabled = !!(this.apiKey && this.siteId);

    if (this.enabled) {
      this.logger.log('CinetPay provider: enabled');
    } else {
      this.logger.warn('CinetPay not configured — set CINETPAY_API_KEY and CINETPAY_SITE_ID to enable');
    }
  }

  get isEnabled() { return this.enabled; }

  async initiatePayment(dto: CinetPayInitDto): Promise<{ url: string; transactionId: string }> {
    if (!this.enabled) {
      throw new BadRequestException('Le paiement CinetPay n\'est pas encore configuré.');
    }

    const transactionId = `NVB-${uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()}`;

    const payload = {
      apikey:         this.apiKey,
      site_id:        this.siteId,
      transaction_id: transactionId,
      amount:         Math.round(dto.amount),
      currency:       'XOF',
      description:    dto.description ?? `Frais scolaires — ${dto.academicYear}${dto.term ? ' / ' + dto.term : ''}`,
      return_url:     `${this.frontendUrl}/payment-return?provider=cinetpay&ref=${transactionId}`,
      notify_url:     this.notifyUrl,
      customer_name:  dto.parentName,
      customer_email: dto.parentEmail,
      customer_phone_number: '',
      customer_address: '',
      customer_city: '',
      customer_country: 'TG',
      customer_state: '',
      customer_zip_code: '',
      metadata:       JSON.stringify({ studentId: dto.studentId, institutionId: dto.institutionId, academicYear: dto.academicYear, term: dto.term }),
      channels:       'ALL',
      lang:           'fr',
    };

    try {
      const res = await axios.post(`${CINETPAY_API}/payment`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      });

      const data = res.data;
      if (data.code !== '201') {
        this.logger.error('CinetPay initiation failed', data);
        throw new BadRequestException(`CinetPay: ${data.message ?? 'Erreur inconnue'}`);
      }

      return {
        url: data.data.payment_url,
        transactionId,
      };
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('CinetPay request error', err?.message);
      throw new BadRequestException('Impossible de contacter CinetPay. Réessayez plus tard.');
    }
  }

  async verifyPayment(transactionId: string): Promise<{ status: string; amount: number }> {
    if (!this.enabled) throw new BadRequestException('CinetPay non configuré');

    const payload = {
      apikey:         this.apiKey,
      site_id:        this.siteId,
      transaction_id: transactionId,
    };

    const res = await axios.post(`${CINETPAY_API}/payment/check`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    const data = res.data?.data ?? {};
    return {
      status: data.status ?? 'UNKNOWN',
      amount: Number(data.amount ?? 0),
    };
  }
}
