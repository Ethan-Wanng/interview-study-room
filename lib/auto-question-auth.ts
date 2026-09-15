import {env} from 'cloudflare:workers';
import {AuthError} from './site-auth';
import {secureToken} from './auto-questions';
export function authorizeAutoQuestions(req:Request){
 const match=/^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(req.headers.get('authorization')??'');
 const token=(env as unknown as {AUTO_QUESTION_API_TOKEN?:string}).AUTO_QUESTION_API_TOKEN;
 if(!match||!secureToken(match[1],token))throw new AuthError('Token 无效。',401);
}

// Request fields can accidentally contain credentials even when headers are
// never logged. Scrub both the configured secret and copied Bearer values.
export function redactAutoQuestionSecrets(value:string){
 const token=(env as unknown as {AUTO_QUESTION_API_TOKEN?:string}).AUTO_QUESTION_API_TOKEN;
 return (token?value.split(token).join('[REDACTED]'):value).replace(/Bearer[ \t]+[A-Za-z0-9._~+\/-]+=*/gi,'[REDACTED]');
}
