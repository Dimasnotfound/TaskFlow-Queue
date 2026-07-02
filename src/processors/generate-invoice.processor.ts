import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '../config/env.js';

export async function processGenerateInvoiceJob(payload:any) {
  await mkdir(join(env.STORAGE_PATH, 'invoices'), { recursive:true });
  const total = payload.items.reduce((sum:number, item:any) => sum + item.quantity * item.price, 0);
  const filePath = join(env.STORAGE_PATH, 'invoices', `${payload.invoiceId}.txt`);
  await writeFile(filePath, `Invoice ${payload.invoiceId}\nCustomer ${payload.customerName}\nTotal ${total}`);
  return { invoiceId:payload.invoiceId, total, filePath };
}
