import {sessionUser,createSession,rateLimit,AuthError} from '@/lib/site-auth';
import {asProvider,startUrl,checkState,fetchIdentity,accountFor,clearOauthCookie} from '@/lib/oauth';
export const dynamic='force-dynamic';
// GET /api/auth/oauth/<provider>          → redirect to the provider
// GET /api/auth/oauth/<provider>?code=…   → provider callback, signs in and returns to the saved page
const redirect=(req:Request,to:string,cookies:string[]=[])=>{const h=new Headers({location:new URL(to,req.url).toString(),'cache-control':'no-store'});for(const c of cookies)h.append('set-cookie',c);return new Response(null,{status:302,headers:h})};
const fail=(req:Request,reason:string)=>redirect(req,'/login?error='+reason,[clearOauthCookie()]);
export async function GET(req:Request){const url=new URL(req.url),p=asProvider(url.pathname.split('/').pop());if(!p)return fail(req,'unavailable');
 try{await rateLimit('oauth:'+(req.headers.get('cf-connecting-ip')??'unknown'),40);
  if(url.searchParams.has('error'))return fail(req,'cancelled');
  const code=url.searchParams.get('code');
  if(!code){const start=startUrl(req,p,url.searchParams.get('return_to')??'/');return redirect(req,start.url,[start.cookie])}
  const back=checkState(req,p,url.searchParams.get('state'));
  const id=await accountFor(p,await fetchIdentity(req,p,code),await sessionUser(req.headers));
  return redirect(req,back,[clearOauthCookie(),await createSession(id)]);
 }catch(e){if(e instanceof AuthError)return fail(req,e.status===429?'limited':e.status===404?'unavailable':'expired');console.error('OAuth sign-in failed',p,e instanceof Error?e.message:'Unknown');return fail(req,'failed')}}
