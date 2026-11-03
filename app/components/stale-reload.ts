// 发布新版本后，旧页面里还记着旧文件名，再按需加载代码会 404（手机上切回很久以前打开的标签页最常见）。
// 遇到这种“代码文件加载失败”就自动刷新一次拿到新版本；30 秒内只刷新一次，避免网络真的断了时无限刷新。
const KEY='stale-reload-at';
const pattern=/dynamically imported module|Importing a module script failed|error loading dynamically imported|ChunkLoadError|Loading chunk|preload CSS/i;

export const isStaleChunkError=(e:unknown)=>pattern.test(e instanceof Error?e.message:String(e??''));

// 返回 true 表示已经安排刷新。
export function reloadForNewVersion(){try{const last=Number(sessionStorage.getItem(KEY));if(last&&Date.now()-last<30000)return false;sessionStorage.setItem(KEY,String(Date.now()))}catch{/* 存不了也照样刷新 */}
 location.reload();return true}
