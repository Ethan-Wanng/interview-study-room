// esbuild 插件：测试里把 content/practice（已下线的 48 道内置练习题）替换成 tests/fixtures 中保存的原题，
// 让练习引擎（/api/practice，后台题集仍在使用）的测试继续覆盖完整流程。
import {fileURLToPath} from 'node:url';
const bank=fileURLToPath(new URL('./practice-bank.ts',import.meta.url)),en=fileURLToPath(new URL('./practice-bank.en.ts',import.meta.url));
export const practiceFixture={name:'practice-fixture',setup(b){b.onResolve({filter:/(^|\/)content\/practice(\.en)?$/},a=>({path:a.path.endsWith('.en')?en:bank}))}};
