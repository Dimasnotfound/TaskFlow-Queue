import { badRequest } from '../shared/errors.js';

function assertSafeWebhookUrl(rawUrl:string) {
  const url = new URL(rawUrl);
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'];
  if (url.protocol !== 'https:' || blockedHosts.indexOf(url.hostname) >= 0) throw badRequest('INVALID_WEBHOOK_URL', 'Webhook URL is not allowed');
}

export async function processSendWebhookJob(payload:any) {
  assertSafeWebhookUrl(payload.url);
  const res = await fetch(payload.url, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ event:payload.event, data:payload.data }), signal:AbortSignal.timeout(5000) });
  if (!res.ok) throw badRequest('WEBHOOK_DELIVERY_FAILED', `Webhook returned ${res.status}`);
  return { statusCode:res.status, deliveredAt:new Date().toISOString() };
}
