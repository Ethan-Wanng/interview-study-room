import {enabledProviders} from '@/lib/oauth';
import LoginClient from './login-client';
export const dynamic='force-dynamic';
export default async function Login({searchParams}:{searchParams:Promise<{error?:string;return_to?:string}>}){const q=await searchParams;return <LoginClient providers={enabledProviders()} error={q.error??''} returnTo={q.return_to??'/'}/>}
