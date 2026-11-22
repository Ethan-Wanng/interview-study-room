// Deploys the built site to Cloudflare Workers (free *.workers.dev domain) with its D1 database.
// Usage: npm run deploy (builds first). Live at https://interview-study-room.xiaoyi-wyx.workers.dev
// Requires `wrangler login` once; target names and the D1 id live in cloudflare.deploy.json.
// Optional "domains": ["study.example.org"] there attaches custom domains (the zone must already be on this
// Cloudflare account). workers.dev is blocked in mainland China, so share the custom domain with users there.
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const target=JSON.parse(readFileSync('cloudflare.deploy.json','utf8'));
const built=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
const config={...built,name:target.name,topLevelName:target.name,workers_dev:true,
 routes:(target.domains??[]).map(pattern=>({pattern,custom_domain:true})),
 d1_databases:built.d1_databases.map(d=>({...d,database_name:target.d1.database_name,database_id:target.d1.database_id,migrations_dir:'../../drizzle'}))};
writeFileSync('dist/server/wrangler.deploy.json',JSON.stringify(config));

// 登录令牌过期后的第一个请求偶尔会被 Cloudflare 拒绝（7403），wrangler 随后会刷新令牌，所以失败时重试一次。
const run=(args,input)=>spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args,'--config','dist/server/wrangler.deploy.json'],{stdio:input?['pipe','inherit','inherit']:'inherit',input}).status;
const wrangler=(...args)=>{let status=run(args);if(status!==0){console.log('Retrying once…');status=run(args)}if(status!==0)process.exit(status??1)};
wrangler('d1','migrations','apply',target.d1.database_name,'--remote');
wrangler('deploy');
if(existsSync('../2.txt')){
 const dsKey=readFileSync('../2.txt','utf8').trim();
 if(dsKey)run(['secret','put','DEEPSEEK_API_KEY'],dsKey);
}
if(existsSync('../1.txt')){
 const gmKey=readFileSync('../1.txt','utf8').trim();
 if(gmKey)run(['secret','put','GEMINI_API_KEY'],gmKey);
}
if(process.env.GEMINI_PROXY_URL?.trim()){
 run(['secret','put','GEMINI_PROXY_URL'],process.env.GEMINI_PROXY_URL.trim());
}
if(process.env.GEMINI_PROXY_URL_2?.trim()){
 run(['secret','put','GEMINI_PROXY_URL_2'],process.env.GEMINI_PROXY_URL_2.trim());
}
