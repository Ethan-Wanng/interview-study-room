'use client';
import type {PlaygroundRunResult} from './playground-runner';

// 在浏览器独立 Web Worker 中加载 sql.js (SQLite 3.45+ WASM) 并附带 MySQL 8.0 兼容转译层与常用内置函数：
// - 0 KB 主包/服务端体积：/sql/sql-wasm.js 与 /sql/sql-wasm.wasm 按需懒加载
// - 兼容 MySQL DDL（AUTO_INCREMENT、ENGINE、CHARSET、COMMENT、内联 INDEX/KEY）、SHOW/DESC/EXPLAIN、
//   LIMIT offset,count、INSERT IGNORE、ON DUPLICATE KEY UPDATE、DATE_ADD/SUB INTERVAL、35+ MySQL 函数
// - 以经典 MySQL CLI ASCII 表格（支持中文等宽对齐）输出查询结果，超时可立即 worker.terminate() 终止。
const SQL_WORKER_SOURCE=`
let __sqlPromise = null;

function __getSql(origin) {
 if (!__sqlPromise) {
  importScripts(origin + '/sql/sql-wasm.js');
  __sqlPromise = initSqlJs({ locateFile: () => origin + '/sql/sql-wasm.wasm' });
 }
 return __sqlPromise;
}

function __charWidth(cp) {
 if (
  (cp >= 0x1100 && cp <= 0x115F) ||
  (cp >= 0x2E80 && cp <= 0xA4CF && cp !== 0x303F) ||
  (cp >= 0xAC00 && cp <= 0xD7A3) ||
  (cp >= 0xF900 && cp <= 0xFAFF) ||
  (cp >= 0xFE10 && cp <= 0xFE19) ||
  (cp >= 0xFE30 && cp <= 0xFE6F) ||
  (cp >= 0xFF00 && cp <= 0xFF60) ||
  (cp >= 0xFFE0 && cp <= 0xFFE6) ||
  (cp >= 0x20000 && cp <= 0x2FFFD)
 ) return 2;
 return 1;
}

function __strWidth(s) {
 let w = 0;
 for (const ch of s) w += __charWidth(ch.codePointAt(0) || 0);
 return w;
}

function __padCell(s, width, alignRight) {
 const gap = Math.max(0, width - __strWidth(s));
 return alignRight ? (' '.repeat(gap) + s) : (s + ' '.repeat(gap));
}

function __formatTable(columns, values) {
 const MAX_ROWS = 500;
 const truncated = values.length > MAX_ROWS;
 const rows = truncated ? values.slice(0, MAX_ROWS) : values;
 const isNumCol = columns.map((_, ci) => {
  let seen = false;
  for (const r of rows) {
   const v = r[ci];
   if (v === null || v === undefined) continue;
   if (typeof v !== 'number') return false;
   seen = true;
  }
  return seen;
 });
 const strRows = rows.map(r => r.map(v => {
  if (v === null || v === undefined) return 'NULL';
  if (v instanceof Uint8Array) return '<BLOB ' + v.length + 'B>';
  return String(v).replace(/\\r?\\n/g, '\\\\n');
 }));
 const widths = columns.map((c, i) => {
  let w = __strWidth(String(c));
  for (const r of strRows) {
   const rw = __strWidth(r[i]);
   if (rw > w) w = rw;
  }
  return w;
 });
 const sep = '+' + widths.map(w => '-'.repeat(w + 2)).join('+') + '+';
 const header = '| ' + columns.map((c, i) => __padCell(String(c), widths[i], false)).join(' | ') + ' |';
 const body = strRows.map(r => '| ' + r.map((cell, i) => __padCell(cell, widths[i], isNumCol[i])).join(' | ') + ' |');
 const lines = [sep, header, sep, ...body, sep];
 const total = values.length;
 lines.push(total === 0 ? 'Empty set' : (total === 1 ? '1 row in set' : total + ' rows in set') + (truncated ? ' (showing first ' + MAX_ROWS + ')' : ''));
 return lines.join('\\n');
}

function __parseDate(val) {
 if (val === null || val === undefined) return null;
 const s = String(val).trim();
 const m = s.match(/^(\\d{4})-(\\d{1,2})-(\\d{1,2})(?:[ T](\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?)?/);
 if (!m) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
 }
 return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
}

function __pad2(n) { return String(n).padStart(2, '0'); }

function __fmtDate(d, fmt) {
 if (!d) return null;
 const y = d.getFullYear(), mo = d.getMonth() + 1, da = d.getDate();
 const h = d.getHours(), mi = d.getMinutes(), se = d.getSeconds();
 if (!fmt) return y + '-' + __pad2(mo) + '-' + __pad2(da) + ' ' + __pad2(h) + ':' + __pad2(mi) + ':' + __pad2(se);
 return String(fmt)
  .replace(/%Y/g, String(y))
  .replace(/%y/g, String(y).slice(-2))
  .replace(/%m/g, __pad2(mo))
  .replace(/%c/g, String(mo))
  .replace(/%d/g, __pad2(da))
  .replace(/%e/g, String(da))
  .replace(/%H/g, __pad2(h))
  .replace(/%k/g, String(h))
  .replace(/%i/g, __pad2(mi))
  .replace(/%s/g, __pad2(se))
  .replace(/%S/g, __pad2(se))
  .replace(/%T/g, __pad2(h) + ':' + __pad2(mi) + ':' + __pad2(se))
  .replace(/%W/g, ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()])
  .replace(/%a/g, ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()])
  .replace(/%w/g, String(d.getDay()));
}

function __registerMysqlFunctions(db) {
 const fn = (name, impl) => db.create_function(name, impl);
 fn('VERSION', () => '8.0.36-MySQL-Compat');
 fn('DATABASE', () => 'playground');
 fn('SCHEMA', () => 'playground');
 fn('UUID', () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = (Math.random() * 16) | 0;
  return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
 }));

 // 日期时间
 fn('NOW', () => __fmtDate(new Date()));
 fn('SYSDATE', () => __fmtDate(new Date()));
 fn('CURDATE', () => __fmtDate(new Date(), '%Y-%m-%d'));
 fn('CURTIME', () => __fmtDate(new Date(), '%H:%i:%s'));
 fn('YEAR', (v) => { const d = __parseDate(v); return d ? d.getFullYear() : null; });
 fn('MONTH', (v) => { const d = __parseDate(v); return d ? d.getMonth() + 1 : null; });
 fn('DAY', (v) => { const d = __parseDate(v); return d ? d.getDate() : null; });
 fn('DAYOFMONTH', (v) => { const d = __parseDate(v); return d ? d.getDate() : null; });
 fn('HOUR', (v) => { const d = __parseDate(v); return d ? d.getHours() : null; });
 fn('MINUTE', (v) => { const d = __parseDate(v); return d ? d.getMinutes() : null; });
 fn('SECOND', (v) => { const d = __parseDate(v); return d ? d.getSeconds() : null; });
 fn('DAYOFWEEK', (v) => { const d = __parseDate(v); return d ? d.getDay() + 1 : null; });
 fn('WEEKDAY', (v) => { const d = __parseDate(v); return d ? (d.getDay() + 6) % 7 : null; });
 fn('DATE_FORMAT', (v, fmt) => __fmtDate(__parseDate(v), fmt));
 fn('DATEDIFF', (a, b) => {
  const d1 = __parseDate(a), d2 = __parseDate(b);
  if (!d1 || !d2) return null;
  const u1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const u2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((u1 - u2) / 86400000);
 });
 fn('UNIX_TIMESTAMP', (...args) => {
  const d = args.length ? __parseDate(args[0]) : new Date();
  return d ? Math.floor(d.getTime() / 1000) : null;
 });
 fn('FROM_UNIXTIME', (ts, fmt) => {
  if (ts === null || ts === undefined) return null;
  const d = new Date(Number(ts) * 1000);
  return isNaN(d.getTime()) ? null : __fmtDate(d, fmt);
 });
 fn('MYSQL_DATE_ADD', (val, amount, unit) => {
  const d = __parseDate(val);
  if (!d || amount === null || amount === undefined) return null;
  const n = Number(amount);
  const u = String(unit || '').toUpperCase().replace(/S$/, '');
  const nd = new Date(d.getTime());
  if (u === 'YEAR') nd.setFullYear(nd.getFullYear() + n);
  else if (u === 'QUARTER') nd.setMonth(nd.getMonth() + n * 3);
  else if (u === 'MONTH') nd.setMonth(nd.getMonth() + n);
  else if (u === 'WEEK') nd.setDate(nd.getDate() + n * 7);
  else if (u === 'DAY') nd.setDate(nd.getDate() + n);
  else if (u === 'HOUR') nd.setHours(nd.getHours() + n);
  else if (u === 'MINUTE') nd.setMinutes(nd.getMinutes() + n);
  else if (u === 'SECOND') nd.setSeconds(nd.getSeconds() + n);
  const hasTime = typeof val === 'string' && /\\d{1,2}:\\d{1,2}/.test(val) || u === 'HOUR' || u === 'MINUTE' || u === 'SECOND';
  return hasTime ? __fmtDate(nd) : __fmtDate(nd, '%Y-%m-%d');
 });

 // 字符串
 fn('CONCAT', (...args) => {
  for (const a of args) if (a === null || a === undefined) return null;
  return args.map(String).join('');
 });
 fn('CONCAT_WS', (sep, ...args) => {
  if (sep === null || sep === undefined) return null;
  return args.filter(a => a !== null && a !== undefined).map(String).join(String(sep));
 });
 fn('LEFT', (s, n) => (s === null || s === undefined || n === null) ? null : String(s).slice(0, Math.max(0, Number(n))));
 fn('RIGHT', (s, n) => {
  if (s === null || s === undefined || n === null) return null;
  const k = Math.max(0, Number(n)), str = String(s);
  return k === 0 ? '' : str.slice(-k);
 });
 fn('LOCATE', (sub, s, pos) => {
  if (sub === null || s === null) return null;
  const start = Math.max(0, (Number(pos) || 1) - 1);
  const idx = String(s).indexOf(String(sub), start);
  return idx < 0 ? 0 : idx + 1;
 });
 fn('REVERSE', (s) => s === null ? null : [...String(s)].reverse().join(''));
 fn('REPEAT', (s, n) => (s === null || n === null) ? null : String(s).repeat(Math.max(0, Math.min(10000, Number(n)))));
 fn('LPAD', (s, len, pad) => {
  if (s === null || len === null || pad === null) return null;
  const str = String(s), n = Math.max(0, Number(len)), p = String(pad);
  if (str.length >= n) return str.slice(0, n);
  return p ? str.padStart(n, p) : str;
 });
 fn('RPAD', (s, len, pad) => {
  if (s === null || len === null || pad === null) return null;
  const str = String(s), n = Math.max(0, Number(len)), p = String(pad);
  if (str.length >= n) return str.slice(0, n);
  return p ? str.padEnd(n, p) : str;
 });
 fn('CHAR_LENGTH', (s) => s === null ? null : [...String(s)].length);
 fn('CHARACTER_LENGTH', (s) => s === null ? null : [...String(s)].length);
 fn('SPACE', (n) => n === null ? null : ' '.repeat(Math.max(0, Math.min(10000, Number(n)))));
 fn('SUBSTRING_INDEX', (s, delim, count) => {
  if (s === null || delim === null || count === null) return null;
  const str = String(s), d = String(delim), c = Number(count);
  if (!d || c === 0) return '';
  const parts = str.split(d);
  return c > 0 ? parts.slice(0, c).join(d) : parts.slice(c).join(d);
 });
 fn('FIND_IN_SET', (needle, list) => {
  if (needle === null || list === null) return null;
  const idx = String(list).split(',').indexOf(String(needle));
  return idx < 0 ? 0 : idx + 1;
 });
 fn('ELT', (n, ...args) => {
  const i = Number(n);
  return (!Number.isInteger(i) || i < 1 || i > args.length) ? null : args[i - 1];
 });
 fn('FIELD', (val, ...args) => {
  if (val === null) return 0;
  const idx = args.findIndex(a => a !== null && String(a) === String(val));
  return idx < 0 ? 0 : idx + 1;
 });

 // 条件与数学
 fn('IF', (cond, a, b) => (cond ? a : b));
 fn('ISNULL', (v) => (v === null || v === undefined ? 1 : 0));
 fn('MOD', (a, b) => (a === null || b === null || Number(b) === 0) ? null : Number(a) % Number(b));
 fn('TRUNCATE', (x, d) => {
  if (x === null || d === null) return null;
  const f = Math.pow(10, Number(d));
  return Math.trunc(Number(x) * f) / f;
 });
 fn('POW', (a, b) => (a === null || b === null) ? null : Math.pow(Number(a), Number(b)));
 fn('POWER', (a, b) => (a === null || b === null) ? null : Math.pow(Number(a), Number(b)));
 fn('SQRT', (a) => (a === null || Number(a) < 0) ? null : Math.sqrt(Number(a)));
 fn('CEIL', (a) => a === null ? null : Math.ceil(Number(a)));
 fn('CEILING', (a) => a === null ? null : Math.ceil(Number(a)));
 fn('FLOOR', (a) => a === null ? null : Math.floor(Number(a)));
 fn('RAND', () => Math.random());
 fn('PI', () => Math.PI);
 fn('LOG', (...args) => args.length === 2 ? Math.log(Number(args[1])) / Math.log(Number(args[0])) : Math.log(Number(args[0])));
 fn('LOG10', (a) => a === null ? null : Math.log10(Number(a)));
 fn('EXP', (a) => a === null ? null : Math.exp(Number(a)));
 fn('SIGN', (a) => a === null ? null : Math.sign(Number(a)));
 fn('GREATEST', (...args) => {
  for (const a of args) if (a === null || a === undefined) return null;
  return args.reduce((m, x) => (x > m ? x : m));
 });
 fn('LEAST', (...args) => {
  for (const a of args) if (a === null || a === undefined) return null;
  return args.reduce((m, x) => (x < m ? x : m));
 });
 fn('REGEXP', (pattern, text) => {
  if (pattern === null || text === null) return 0;
  try { return new RegExp(String(pattern), 'i').test(String(text)) ? 1 : 0; }
  catch { return 0; }
 });
}

// 将单引号内的 MySQL 反斜杠转义（\\' \\n \\t \\\\）转为标准 SQL，并将 # 行注释转为 --
function __normalizeLex(sql) {
 let out = '', i = 0, n = sql.length;
 while (i < n) {
  const ch = sql[i], nxt = sql[i + 1];
  if (ch === '-' && nxt === '-') {
   const end = sql.indexOf('\\n', i);
   if (end < 0) { out += sql.slice(i); break; }
   out += sql.slice(i, end + 1); i = end + 1; continue;
  }
  if (ch === '/' && nxt === '*') {
   const end = sql.indexOf('*/', i + 2);
   if (end < 0) { out += sql.slice(i); break; }
   out += sql.slice(i, end + 2); i = end + 2; continue;
  }
  if (ch === '#') {
   const end = sql.indexOf('\\n', i);
   if (end < 0) { out += '--' + sql.slice(i + 1); break; }
   out += '--' + sql.slice(i + 1, end + 1); i = end + 1; continue;
  }
  if (ch === "'") {
   out += "'"; i++;
   while (i < n) {
    if (sql[i] === '\\\\' && i + 1 < n) {
     const e = sql[i + 1];
     if (e === "'") out += "''";
     else if (e === 'n') out += '\\n';
     else if (e === 'r') out += '\\r';
     else if (e === 't') out += '\\t';
     else if (e === '\\\\') out += '\\\\';
     else out += e;
     i += 2; continue;
    }
    if (sql[i] === "'" && sql[i + 1] === "'") { out += "''"; i += 2; continue; }
    out += sql[i];
    if (sql[i] === "'") { i++; break; }
    i++;
   }
   continue;
  }
  if (ch === '"' || ch === '\`') {
   const q = ch; out += q; i++;
   while (i < n) {
    if (sql[i] === q && sql[i + 1] === q) { out += q + q; i += 2; continue; }
    out += sql[i];
    if (sql[i] === q) { i++; break; }
    i++;
   }
   continue;
  }
  out += ch; i++;
 }
 return out;
}

function __splitStatements(sql) {
 const stmts = [];
 let cur = '', i = 0, n = sql.length;
 while (i < n) {
  const ch = sql[i], nxt = sql[i + 1];
  if (ch === '-' && nxt === '-') {
   const end = sql.indexOf('\\n', i);
   if (end < 0) { cur += sql.slice(i); break; }
   cur += sql.slice(i, end + 1); i = end + 1; continue;
  }
  if (ch === '/' && nxt === '*') {
   const end = sql.indexOf('*/', i + 2);
   if (end < 0) { cur += sql.slice(i); break; }
   cur += sql.slice(i, end + 2); i = end + 2; continue;
  }
  if (ch === "'" || ch === '"' || ch === '\`') {
   const q = ch; cur += q; i++;
   while (i < n) {
    if (sql[i] === q && sql[i + 1] === q) { cur += q + q; i += 2; continue; }
    cur += sql[i];
    if (sql[i] === q) { i++; break; }
    i++;
   }
   continue;
  }
  if (ch === ';') {
   const t = cur.trim();
   if (t && !__onlyComments(t)) stmts.push(t);
   cur = ''; i++; continue;
  }
  cur += ch; i++;
 }
 const tail = cur.trim();
 if (tail && !__onlyComments(tail)) stmts.push(tail);
 return stmts;
}

function __onlyComments(s) {
 const stripped = s.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '').replace(/--[^\\n]*/g, '').trim();
 return !stripped;
}

function __stripLeadingComments(s) {
 let t = s.trim();
 while (true) {
  if (t.startsWith('--')) {
   const nl = t.indexOf('\\n');
   t = nl < 0 ? '' : t.slice(nl + 1).trim();
  } else if (t.startsWith('/*')) {
   const end = t.indexOf('*/');
   t = end < 0 ? '' : t.slice(end + 2).trim();
  } else break;
 }
 return t;
}

function __splitTopLevel(str) {
 const parts = [];
 let cur = '', depth = 0, i = 0, n = str.length;
 while (i < n) {
  const ch = str[i];
  if (ch === "'" || ch === '"' || ch === '\`') {
   const q = ch; cur += q; i++;
   while (i < n) {
    if (str[i] === q && str[i + 1] === q) { cur += q + q; i += 2; continue; }
    cur += str[i];
    if (str[i] === q) { i++; break; }
    i++;
   }
   continue;
  }
  if (ch === '(') depth++;
  else if (ch === ')') depth = Math.max(0, depth - 1);
  if (ch === ',' && depth === 0) {
   if (cur.trim()) parts.push(cur.trim());
   cur = ''; i++; continue;
  }
  cur += ch; i++;
 }
 if (cur.trim()) parts.push(cur.trim());
 return parts;
}

function __findMatchingParen(s, openIdx) {
 let depth = 0, i = openIdx, n = s.length;
 while (i < n) {
  const ch = s[i];
  if (ch === "'" || ch === '"' || ch === '\`') {
   const q = ch; i++;
   while (i < n) {
    if (s[i] === q && s[i + 1] === q) { i += 2; continue; }
    if (s[i] === q) { i++; break; }
    i++;
   }
   continue;
  }
  if (ch === '(') depth++;
  else if (ch === ')') { depth--; if (depth === 0) return i; }
  i++;
 }
 return -1;
}

function __translateCreateTable(stmt) {
 const head = stmt.match(/^CREATE\\s+(TEMPORARY\\s+)?TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?(\`[^\`]+\`|[A-Za-z_][\\w$.]*)\\s*\\(/i);
 if (!head) return [stmt];
 const openIdx = head[0].length - 1;
 const closeIdx = __findMatchingParen(stmt, openIdx);
 if (closeIdx < 0) return [stmt];
 const tableName = head[3];
 const cleanTableName = tableName.replace(/^\`|\`$/g, '');
 const inner = stmt.slice(openIdx + 1, closeIdx);
 const items = __splitTopLevel(inner);

 const colDefs = [];
 const extraIndexes = [];
 let autoIncCol = null;

 for (const rawItem of items) {
  const item = __stripLeadingComments(rawItem);
  if (!item) continue;
  // 内联 INDEX / KEY / UNIQUE KEY / UNIQUE INDEX -> 拆成独立的 CREATE INDEX 语句
  const idxM = item.match(/^(UNIQUE\\s+)?(?:FULLTEXT\\s+|SPATIAL\\s+)?(?:INDEX|KEY)\\s+(?:(\`[^\`]+\`|[A-Za-z_]\\w*)\\s+)?(?:USING\\s+\\w+\\s+)?\\((.+)\\)(?:\\s+USING\\s+\\w+)?(?:\\s+COMMENT\\s+(?:'[^']*'|"[^"]*"))?\\s*$/i);
  if (idxM) {
   const isUnique = Boolean(idxM[1]);
   const idxName = idxM[2] ? idxM[2].replace(/^\`|\`$/g, '') : ('idx_' + cleanTableName + '_' + (extraIndexes.length + 1));
   const cols = idxM[3].replace(/\\(\\s*\\d+\\s*\\)/g, '');
   extraIndexes.push('CREATE ' + (isUnique ? 'UNIQUE ' : '') + 'INDEX IF NOT EXISTS \`' + idxName + '\` ON ' + tableName + ' (' + cols + ')');
   continue;
  }
  // 检查是否有 AUTO_INCREMENT 列名
  if (/\\bAUTO_INCREMENT\\b/i.test(item)) {
   const cm = item.match(/^(\`[^\`]+\`|[A-Za-z_]\\w*)/);
   if (cm) autoIncCol = cm[1].replace(/^\`|\`$/g, '').toLowerCase();
  }
  colDefs.push(item);
 }

 // 若单独写了 PRIMARY KEY (col) 且 col 有 AUTO_INCREMENT，合并到列定义以符合 SQLite INTEGER PRIMARY KEY AUTOINCREMENT
 const finalDefs = [];
 let mergedPk = false;
 for (const def of colDefs) {
  const pkM = def.match(/^(?:CONSTRAINT\\s+(?:\`[^\`]+\`|[A-Za-z_]\\w*)\\s+)?PRIMARY\\s+KEY\\s*(?:USING\\s+\\w+\\s*)?\\(\\s*(\`[^\`]+\`|[A-Za-z_]\\w*)\\s*\\)/i);
  if (pkM && autoIncCol && pkM[1].replace(/^\`|\`$/g, '').toLowerCase() === autoIncCol) {
   mergedPk = true;
   continue;
  }
  finalDefs.push(def);
 }

 const cleanedDefs = finalDefs.map(def => {
  let d = def;
  // 去掉字段级 COMMENT / ON UPDATE / CHARSET / COLLATE / UNSIGNED / ZEROFILL / USING BTREE
  d = d.replace(/\\s+COMMENT\\s+'(?:''|[^'])*'/gi, '');
  d = d.replace(/\\s+COMMENT\\s+"(?:""|[^"])*"/gi, '');
  d = d.replace(/\\s+ON\\s+UPDATE\\s+CURRENT_TIMESTAMP(?:\\s*\\(\\s*\\d*\\s*\\))?/gi, '');
  d = d.replace(/\\s+CHARACTER\\s+SET\\s+[A-Za-z0-9_]+/gi, '');
  d = d.replace(/\\s+CHARSET\\s+[A-Za-z0-9_]+/gi, '');
  d = d.replace(/\\s+COLLATE\\s+[A-Za-z0-9_]+/gi, '');
  d = d.replace(/\\bUNSIGNED\\b/gi, '');
  d = d.replace(/\\bZEROFILL\\b/gi, '');
  d = d.replace(/\\bUSING\\s+(?:BTREE|HASH)\\b/gi, '');
  d = d.replace(/\\bENUM\\s*\\([^)]*\\)/gi, 'TEXT');
  d = d.replace(/\\bSET\\s*\\([^)]*\\)/gi, 'TEXT');
  d = d.replace(/\\bCURRENT_TIMESTAMP\\s*\\(\\s*\\d*\\s*\\)/gi, 'CURRENT_TIMESTAMP');

  if (/\\bAUTO_INCREMENT\\b/i.test(d)) {
   const cm = d.match(/^(\`[^\`]+\`|[A-Za-z_]\\w*)\\s+/);
   const colIdent = cm ? cm[1] : '';
   const isSamePk = mergedPk || /\\bPRIMARY\\s+KEY\\b/i.test(d);
   if (colIdent && isSamePk) {
    d = d.replace(/^(\`[^\`]+\`|[A-Za-z_]\\w*)\\s+(?:TINY|SMALL|MEDIUM|BIG)?INT(?:EGER)?(?:\\s*\\(\\s*\\d+\\s*\\))?/i, '$1 INTEGER');
    d = d.replace(/\\bAUTO_INCREMENT\\b/gi, '');
    if (!/\\bPRIMARY\\s+KEY\\b/i.test(d)) d = d.replace(/^(\`[^\`]+\`|[A-Za-z_]\\w*\\s+INTEGER)/i, '$1 PRIMARY KEY AUTOINCREMENT');
    else d = d.replace(/\\bPRIMARY\\s+KEY\\b/i, 'PRIMARY KEY AUTOINCREMENT');
   } else {
    d = d.replace(/\\bAUTO_INCREMENT\\b/gi, '');
   }
  }
  return d.replace(/\\s{2,}/g, ' ').trim();
 });

 const rebuilt = 'CREATE ' + (head[1] || '') + 'TABLE ' + (head[2] || '') + tableName + ' (\\n  ' + cleanedDefs.join(',\\n  ') + '\\n)';
 return [rebuilt, ...extraIndexes];
}

function __rewriteDateAddSub(s) {
 const re = /\\bDATE_(ADD|SUB)\\s*\\(/gi;
 let out = '', last = 0, m;
 while ((m = re.exec(s)) !== null) {
  const openIdx = m.index + m[0].length - 1;
  const closeIdx = __findMatchingParen(s, openIdx);
  if (closeIdx < 0) continue;
  const inner = s.slice(openIdx + 1, closeIdx);
  const args = __splitTopLevel(inner);
  if (args.length === 2) {
   const iv = args[1].match(/^INTERVAL\\s+([\\s\\S]+?)\\s+(YEAR|QUARTER|MONTH|WEEK|DAY|HOUR|MINUTE|SECOND)S?\\s*$/i);
   if (iv) {
    out += s.slice(last, m.index);
    const amount = m[1].toUpperCase() === 'SUB' ? '-(' + iv[1].trim() + ')' : '(' + iv[1].trim() + ')';
    out += "MYSQL_DATE_ADD(" + args[0] + ", " + amount + ", '" + iv[2].toUpperCase() + "')";
    last = closeIdx + 1;
    re.lastIndex = closeIdx + 1;
   }
  }
 }
 return out + s.slice(last);
}

function __translateCommonQuery(stmt) {
 let s = stmt;
 // INSERT IGNORE -> INSERT OR IGNORE
 s = s.replace(/^INSERT\\s+IGNORE\\s+INTO\\b/i, 'INSERT OR IGNORE INTO');
 // TRUNCATE [TABLE] tbl -> DELETE FROM tbl
 s = s.replace(/^TRUNCATE\\s+(?:TABLE\\s+)?(\`[^\`]+\`|[A-Za-z_][\\w$.]*)/i, 'DELETE FROM $1');
 // ALTER TABLE ADD [UNIQUE] INDEX/KEY
 const altIdx = s.match(/^ALTER\\s+TABLE\\s+(\`[^\`]+\`|[A-Za-z_][\\w$.]*)\\s+ADD\\s+(UNIQUE\\s+)?(?:INDEX|KEY)\\s+(\`[^\`]+\`|[A-Za-z_]\\w*)\\s*\\((.+)\\)\\s*$/i);
 if (altIdx) {
  return 'CREATE ' + (altIdx[2] || '') + 'INDEX IF NOT EXISTS ' + altIdx[3] + ' ON ' + altIdx[1] + ' (' + altIdx[4].replace(/\\(\\s*\\d+\\s*\\)/g, '') + ')';
 }
 const altDrop = s.match(/^ALTER\\s+TABLE\\s+(?:\`[^\`]+\`|[A-Za-z_][\\w$.]*)\\s+DROP\\s+(?:INDEX|KEY)\\s+(\`[^\`]+\`|[A-Za-z_]\\w*)\\s*$/i);
 if (altDrop) return 'DROP INDEX IF EXISTS ' + altDrop[1];
 // ON DUPLICATE KEY UPDATE -> ON CONFLICT DO UPDATE SET
 const dupIdx = s.search(/\\bON\\s+DUPLICATE\\s+KEY\\s+UPDATE\\b/i);
 if (dupIdx > 0) {
  const before = s.slice(0, dupIdx);
  const after = s.slice(dupIdx).replace(/^ON\\s+DUPLICATE\\s+KEY\\s+UPDATE\\b/i, 'ON CONFLICT DO UPDATE SET')
   .replace(/\\bVALUES\\s*\\(\\s*(\`[^\`]+\`|[A-Za-z_]\\w*)\\s*\\)/gi, 'excluded.$1');
  s = before + after;
 }
 // DATE_ADD / DATE_SUB(expr, INTERVAL <any expr incl. nested parens> UNIT)
 s = __rewriteDateAddSub(s);
 // expr +/- INTERVAL n UNIT
 s = s.replace(/(\\b(?:NOW\\(\\)|CURDATE\\(\\)|CURRENT_DATE|CURRENT_TIMESTAMP|\`[^\`]+\`|[A-Za-z_][\\w.]*|'[^']*'))\\s*([+-])\\s*INTERVAL\\s+(\\d+)\\s+(YEAR|QUARTER|MONTH|WEEK|DAY|HOUR|MINUTE|SECOND)S?\\b/gi, (_, expr, op, num, unit) => {
  return "MYSQL_DATE_ADD(" + expr + ", " + (op === '-' ? '-' : '') + num + ", '" + unit + "')";
 });
 // GROUP_CONCAT(... SEPARATOR 'sep')
 s = s.replace(/\\bGROUP_CONCAT\\s*\\(([^)]+?)\\s+SEPARATOR\\s+('(?:''|[^'])*')\\s*\\)/gi, (_, body, sep) => {
  if (/^\\s*DISTINCT\\b/i.test(body)) {
   return 'GROUP_CONCAT(' + body.trim() + ')';
  }
  return 'GROUP_CONCAT(' + body.trim() + ', ' + sep + ')';
 });
 // LIMIT offset, count -> LIMIT count OFFSET offset
 s = s.replace(/\\bLIMIT\\s+(\\d+)\\s*,\\s*(\\d+)\\b/gi, 'LIMIT $2 OFFSET $1');
 // 去掉 MySQL 锁提示与索引提示
 s = s.replace(/\\b(?:FORCE|USE|IGNORE)\\s+INDEX\\s*(?:FOR\\s+(?:JOIN|ORDER\\s+BY|GROUP\\s+BY)\\s*)?\\([^)]*\\)/gi, '');
 s = s.replace(/\\s+(?:FOR\\s+UPDATE(?:\\s+SKIP\\s+LOCKED|\\s+NOWAIT)?|FOR\\s+SHARE|LOCK\\s+IN\\s+SHARE\\s+MODE)\\s*$/i, '');
 return s.trim();
}

function __applySessionVars(stmt, vars) {
 if (!vars.size) return stmt;
 let out = '', i = 0, n = stmt.length;
 while (i < n) {
  const ch = stmt[i];
  if (ch === "'" || ch === '"' || ch === '\`') {
   const q = ch; out += q; i++;
   while (i < n) {
    if (stmt[i] === q && stmt[i + 1] === q) { out += q + q; i += 2; continue; }
    out += stmt[i];
    if (stmt[i] === q) { i++; break; }
    i++;
   }
   continue;
  }
  if (ch === '@' && stmt[i + 1] !== '@') {
   const m = stmt.slice(i).match(/^@([A-Za-z_]\\w*)/);
   if (m && vars.has(m[1].toLowerCase())) {
    const val = vars.get(m[1].toLowerCase());
    if (val === null || val === undefined) out += 'NULL';
    else if (typeof val === 'number') out += String(val);
    else out += "'" + String(val).replace(/'/g, "''") + "'";
    i += m[0].length;
    continue;
   }
  }
  out += ch; i++;
 }
 return out;
}

self.onmessage = async (ev) => {
 const { code, origin } = ev.data;
 const outputs = [];
 try {
  const SQL = await __getSql(origin);
  const db = new SQL.Database();
  __registerMysqlFunctions(db);
  db.run('PRAGMA foreign_keys = ON;');

  const normalized = __normalizeLex(code);
  const stmts = __splitStatements(normalized);
  if (!stmts.length) {
   self.postMessage({ ok: true, stdout: '', stderr: '' });
   db.close();
   return;
  }

  const sessionVars = new Map();
  let ddlDmlCount = 0;

  for (let si = 0; si < stmts.length; si++) {
   const rawStmt = stmts[si];
   const core = __stripLeadingComments(rawStmt);
   if (!core) continue;

   // MySQL 元命令 / 无副作用会话语句
   if (/^(?:CREATE\\s+DATABASE|DROP\\s+DATABASE|USE\\s+|LOCK\\s+TABLES|UNLOCK\\s+TABLES|SET\\s+(?:NAMES|CHARACTER\\s+SET|SESSION|GLOBAL|@@|sql_mode|autocommit))/i.test(core)) {
    ddlDmlCount++;
    continue;
   }

   // SET @var = expr / SET @var := expr
   const setVarM = core.match(/^SET\\s+@([A-Za-z_]\\w*)\\s*:?=\\s*([\\s\\S]+)$/i);
   if (setVarM) {
    const expr = __applySessionVars(__translateCommonQuery(setVarM[2]), sessionVars);
    const res = db.exec('SELECT ' + expr);
    const val = res[0]?.values?.[0]?.[0] ?? null;
    sessionVars.set(setVarM[1].toLowerCase(), val);
    ddlDmlCount++;
    continue;
   }

   // SHOW DATABASES
   if (/^SHOW\\s+(?:DATABASES|SCHEMAS)\\b/i.test(core)) {
    outputs.push(__formatTable(['Database'], [['playground']]));
    continue;
   }

   // SHOW TABLES
   if (/^SHOW\\s+(?:FULL\\s+)?TABLES\\b/i.test(core)) {
    const r = db.exec("SELECT name AS Tables_in_playground FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    outputs.push(__formatTable(['Tables_in_playground'], r[0]?.values ?? []));
    continue;
   }

   // DESC / DESCRIBE / SHOW COLUMNS FROM tbl
   const descM = core.match(/^(?:DESC(?:RIBE)?|SHOW\\s+(?:FULL\\s+)?COLUMNS\\s+FROM)\\s+(\`[^\`]+\`|[A-Za-z_]\\w*)/i);
   if (descM) {
    const tbl = descM[1].replace(/^\`|\`$/g, '');
    const r = db.exec('PRAGMA table_info(\`' + tbl + '\`)');
    const rows = (r[0]?.values ?? []).map(row => [
     row[1],
     row[2] || 'TEXT',
     row[3] ? 'NO' : 'YES',
     row[5] ? 'PRI' : '',
     row[4],
     '',
    ]);
    outputs.push(__formatTable(['Field', 'Type', 'Null', 'Key', 'Default', 'Extra'], rows));
    continue;
   }

   // SHOW CREATE TABLE tbl
   const showCreateM = core.match(/^SHOW\\s+CREATE\\s+TABLE\\s+(\`[^\`]+\`|[A-Za-z_]\\w*)/i);
   if (showCreateM) {
    const tbl = showCreateM[1].replace(/^\`|\`$/g, '');
    const r = db.exec("SELECT name, sql FROM sqlite_master WHERE type='table' AND lower(name)=lower('" + tbl.replace(/'/g, "''") + "')");
    outputs.push(__formatTable(['Table', 'Create Table'], r[0]?.values ?? []));
    continue;
   }

   // SHOW INDEX / INDEXES / KEYS FROM tbl
   const showIdxM = core.match(/^SHOW\\s+(?:INDEX|INDEXES|KEYS)\\s+(?:FROM|IN)\\s+(\`[^\`]+\`|[A-Za-z_]\\w*)/i);
   if (showIdxM) {
    const tbl = showIdxM[1].replace(/^\`|\`$/g, '');
    const idxList = db.exec('PRAGMA index_list(\`' + tbl + '\`)');
    const outRows = [];
    for (const row of (idxList[0]?.values ?? [])) {
     const idxName = String(row[1]);
     const unique = Number(row[2]);
     const cols = db.exec('PRAGMA index_info(\`' + idxName.replace(/\`/g, '') + '\`)');
     for (const c of (cols[0]?.values ?? [])) {
      outRows.push([tbl, unique ? 0 : 1, idxName, Number(c[0]) + 1, c[2]]);
     }
    }
    outputs.push(__formatTable(['Table', 'Non_unique', 'Key_name', 'Seq_in_index', 'Column_name'], outRows));
    continue;
   }

   // EXPLAIN [FORMAT=...] <query>
   const expM = core.match(/^EXPLAIN\\s+(?:ANALYZE\\s+)?(?:FORMAT\\s*=\\s*\\w+\\s+)?([\\s\\S]+)$/i);
   if (expM && !/^QUERY\\s+PLAN\\b/i.test(expM[1])) {
    const innerSql = __applySessionVars(__translateCommonQuery(expM[1]), sessionVars);
    const r = db.exec('EXPLAIN QUERY PLAN ' + innerSql);
    outputs.push(__formatTable(r[0]?.columns ?? ['id', 'parent', 'notused', 'detail'], r[0]?.values ?? []));
    continue;
   }

   // CREATE TABLE 专门转译（可能拆出多条 CREATE INDEX）
   if (/^CREATE\\s+(?:TEMPORARY\\s+)?TABLE\\b/i.test(core)) {
    const expanded = __translateCreateTable(core);
    for (const sub of expanded) {
     db.run(sub);
    }
    ddlDmlCount++;
    continue;
   }

   const translated = __applySessionVars(__translateCommonQuery(core), sessionVars);
   const isQuery = /^(?:SELECT|WITH|PRAGMA|VALUES|EXPLAIN)\\b/i.test(translated);
   if (isQuery) {
    const res = db.exec(translated);
    if (!res.length) {
     outputs.push('Empty set');
    } else {
     for (const table of res) {
      outputs.push(__formatTable(table.columns, table.values));
     }
    }
   } else {
    db.run(translated);
    ddlDmlCount++;
   }
  }

  if (!outputs.length && ddlDmlCount > 0) {
   outputs.push('Query OK (' + ddlDmlCount + ' statement' + (ddlDmlCount > 1 ? 's' : '') + ' executed)');
  }

  db.close();
  self.postMessage({ ok: true, stdout: outputs.join('\\n\\n') + (outputs.length ? '\\n' : ''), stderr: '' });
 } catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  self.postMessage({ ok: false, stdout: outputs.length ? outputs.join('\\n\\n') + '\\n' : '', stderr: 'SQL Error: ' + msg });
 }
};
`;

export function runSqlInWorker(
 code:string,
 opts:{signal?:AbortSignal;timeoutMs?:number}={},
):Promise<PlaygroundRunResult>{
 const timeoutMs=opts.timeoutMs??8000;
 const started=performance.now();
 if(!code.trim()){
  return Promise.resolve({
   ok:false,
   stdout:'',
   stderr:'',
   compileErrors:'请先输入要运行的 SQL 语句。',
   exitCode:1,
   durationMs:0,
   runner:'MySQL 8.0 Compat Sandbox (WASM)',
  });
 }

 return new Promise(resolve=>{
  const blob=new Blob([SQL_WORKER_SOURCE],{type:'application/javascript'});
  const url=URL.createObjectURL(blob);
  const worker=new Worker(url);
  let settled=false;

  const cleanup=()=>{
   clearTimeout(timer);
   opts.signal?.removeEventListener('abort',onAbort);
   worker.terminate();
   URL.revokeObjectURL(url);
  };

  const finish=(res:Omit<PlaygroundRunResult,'durationMs'|'runner'>)=>{
   if(settled)return;
   settled=true;
   cleanup();
   resolve({
    ...res,
    durationMs:Math.round(performance.now()-started),
    runner:'MySQL 8.0 Compat Sandbox (WASM)',
   });
  };

  const onAbort=()=>{
   finish({ok:false,stdout:'',stderr:'',compileErrors:'',exitCode:130});
  };
  if(opts.signal?.aborted){onAbort();return}
  opts.signal?.addEventListener('abort',onAbort,{once:true});

  const timer=setTimeout(()=>{
   finish({
    ok:false,
    stdout:'',
    stderr:`SQL 执行超时（超过 ${Math.round(timeoutMs/1000)} 秒），沙盒已自动中止。`,
    compileErrors:'',
    exitCode:124,
   });
  },timeoutMs);

  worker.onmessage=(e)=>{
   const d=e.data as {ok?:boolean;stdout?:string;stderr?:string};
   finish({
    ok:Boolean(d.ok),
    stdout:d.stdout??'',
    stderr:d.stderr??'',
    compileErrors:'',
    exitCode:d.ok?0:1,
   });
  };

  worker.onerror=(ev)=>{
   finish({
    ok:false,
    stdout:'',
    stderr:'',
    compileErrors:ev.message||'SQL 沙盒初始化失败，请刷新后重试。',
    exitCode:1,
   });
  };

  worker.postMessage({code,origin:window.location.origin});
 });
}
