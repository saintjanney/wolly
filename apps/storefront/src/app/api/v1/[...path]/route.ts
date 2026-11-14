import { NextResponse, type NextRequest } from 'next/server';
const allowed = new Set(['health/live','health/ready','capabilities']);
export async function GET(_request: NextRequest, context: {params:Promise<{path:string[]}>}) {
 const {path} = await context.params;
 const route = path.join('/');
 if(!allowed.has(route)) return NextResponse.json({error:{code:'not_implemented',message:'This API integration is not available yet.'}},{status:404});
 try {
  const origin=process.env.WOLLY_API_ORIGIN ?? 'http://127.0.0.1:8080';
  const response=await fetch(`${origin}/api/v1/${route}`,{cache:'no-store',signal:AbortSignal.timeout(5000),headers:{Accept:'application/json'}});
  const payload=await response.json();
  return NextResponse.json(payload,{status:response.status,headers:{'Cache-Control':'no-store'}});
 } catch { return NextResponse.json({error:{code:'upstream_unavailable',message:'The Go API is unavailable.'}},{status:502}); }
}
