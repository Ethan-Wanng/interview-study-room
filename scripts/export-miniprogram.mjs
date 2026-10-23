// Exports the AI learning space content (content/ai-journey.ts + ai-quiz-extra.ts) for the WeChat mini program.
// Usage: node scripts/export-miniprogram.mjs ../ai-miniprogram/data/levels.js
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('wrangler/package.json'))('esbuild');
const out=resolve(process.argv[2]??'../ai-miniprogram/data/levels.js');
const bundle=await build({entryPoints:['content/ai-journey.ts'],bundle:true,write:false,format:'esm',platform:'neutral',target:'es2019'});
const mod=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const data={passRate:mod.aiPassRate,ranks:mod.aiRanks,types:mod.aiQuizTypes,levels:mod.aiLevels};
mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,'// 由 site/scripts/export-miniprogram.mjs 生成，请勿手动修改。\nmodule.exports = '+JSON.stringify(data)+';\n');
console.log(`Wrote ${data.levels.length} levels, ${data.levels.reduce((n,l)=>n+l.quiz.length,0)} questions to ${out}`);
