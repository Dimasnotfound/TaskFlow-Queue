import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '../config/env.js';
import { badRequest } from '../shared/errors.js';

export async function processJob(type:string, payload:any) {
  await mkdir(join(env.STORAGE_PATH, 'invoices'), { recursive:true });
  await mkdir(join(env.STORAGE_PATH, 'reports'), { recursive:true });
  if (type === 'GENERATE_INVOICE') {
    if (!payload.invoiceId || !payload.items) throw badRequest('INVALID_JOB_PAYLOAD','invoiceId and items are required');
    const total = payload.items.reduce((sum:number, item:any) => sum + item.quantity * item.price, 0);
    const filePath = join(env.STORAGE_PATH, 'invoices', `${payload.invoiceId}.pdf`);
    await writeFile(filePath, `Invoice ${payload.invoiceId}\nTotal ${total}`);
    return { invoiceId:payload.invoiceId, total, filePath };
  }
  if (type === 'SEND_EMAIL') {
    if (!payload.to || !payload.subject) throw badRequest('INVALID_JOB_PAYLOAD','to and subject are required');
    return { messageId:`email_${Date.now()}`, sentAt:new Date().toISOString() };
  }
  if (type === 'SEND_WEBHOOK') {
    if (!payload.url) throw badRequest('INVALID_JOB_PAYLOAD','url is required');
    const res = await fetch(payload.url, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ event:payload.event, data:payload.data }), signal:AbortSignal.timeout(5000) });
    if (!res.ok) throw badRequest('WEBHOOK_DELIVERY_FAILED', `Webhook returned ${res.status}`);
    return { statusCode:res.status, deliveredAt:new Date().toISOString() };
  }
  if (type === 'EXPORT_REPORT') {
    const filePath = join(env.STORAGE_PATH, 'reports', `job-summary-${Date.now()}.csv`);
    await writeFile(filePath, 'status,count\nCOMPLETED,0\nFAILED,0\n');
    return { filePath, rows:2 };
  }
  throw badRequest('INVALID_JOB_PAYLOAD','Unknown job type');
}
