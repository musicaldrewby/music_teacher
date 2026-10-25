import {identity,runAction} from '@/lib/server';
export async function POST(req:Request){try{const u=identity(req),a:any=await req.json();return Response.json(await runAction(u,a.name,a.arguments??{}));}catch(e){return Response.json({error:(e as Error).message},{status:400});}}
