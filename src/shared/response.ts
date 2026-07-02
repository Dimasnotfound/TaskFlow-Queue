export const ok = (message:string, data:unknown, meta?:unknown) => ({ success:true, message, data, ...(meta ? { meta } : {}) });
export const fail = (message:string, code:string, details?:unknown) => ({ success:false, message, error:{ code, ...(details ? { details } : {}) } });
