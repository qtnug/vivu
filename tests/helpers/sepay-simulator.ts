import { FIXTURES } from './fixtures';

export interface SePayWebhookPayload {
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  code?: string | null;
  content: string;
  transferType?: 'in' | 'out';
  transferAmount: number;
  referenceCode: string;
  accumulated?: number;
}

export function buildSePayPayload(orderCode: string, amount: number, options?: Partial<SePayWebhookPayload>): SePayWebhookPayload {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const ref = `REF${Date.now()}${Math.floor(Math.random() * 1000)}`;

  return {
    gateway: options?.gateway || FIXTURES.SEPAY.GATEWAY,
    transactionDate: options?.transactionDate || now,
    accountNumber: options?.accountNumber || FIXTURES.SEPAY.ACCOUNT_NUMBER,
    code: options?.code !== undefined ? options.code : null,
    content: options?.content || `${orderCode} thanh toan ve xe buyt`,
    transferType: options?.transferType || 'in',
    transferAmount: amount,
    referenceCode: options?.referenceCode || ref,
  };
}
