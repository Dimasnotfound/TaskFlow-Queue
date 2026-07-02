export async function processSendEmailJob(_payload:any) {
  return { messageId:`email_${Date.now()}`, sentAt:new Date().toISOString() };
}
