import { badRequest } from '../shared/errors.js';
import { processExportReportJob } from './export-report.processor.js';
import { processGenerateInvoiceJob } from './generate-invoice.processor.js';
import { processSendEmailJob } from './send-email.processor.js';
import { processSendWebhookJob } from './send-webhook.processor.js';

export async function processJob(type:string, payload:any) {
  if (type === 'GENERATE_INVOICE') return processGenerateInvoiceJob(payload);
  if (type === 'SEND_EMAIL') return processSendEmailJob(payload);
  if (type === 'SEND_WEBHOOK') return processSendWebhookJob(payload);
  if (type === 'EXPORT_REPORT') return processExportReportJob(payload);
  throw badRequest('INVALID_JOB_PAYLOAD','Unknown job type');
}
