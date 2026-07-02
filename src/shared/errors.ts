export class AppError extends Error { constructor(public statusCode:number, public code:string, message:string, public details?:unknown){ super(message); } }
export const badRequest=(code:string,msg:string,details?:unknown)=>new AppError(400,code,msg,details);
export const unauthorized=()=>new AppError(401,'UNAUTHORIZED','Unauthorized');
export const forbidden=()=>new AppError(403,'FORBIDDEN','Forbidden');
export const notFound=(code='NOT_FOUND',msg='Resource not found')=>new AppError(404,code,msg);
export const conflict=(code:string,msg:string)=>new AppError(409,code,msg);
