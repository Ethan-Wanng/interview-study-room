import {env} from 'cloudflare:workers';
import {AuthError} from './site-auth';
import {secureToken} from './auto-questions';
export function authorizeAutoQuestions(req:Request){
 const match=/^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(req.headers.get('authorization')??'');
 const token=(env as unknown as {AUTO_QUESTION_API_TOKEN?:string}).AUTO_QUESTION_API_TOKEN;
 if(!match||!secureToken(match[1],token))throw new AuthError('Token 无效。',401);
}
