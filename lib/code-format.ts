import type {PlaygroundLang} from '@/lib/playground-bridge';

const SQL_UPPER_KW=/\b(select|from|where|inner join|left join|right join|full join|cross join|join|on|group by|having|order by|limit|offset|union all|union|with|recursive|as|and|or|not|in|is|null|like|between|exists|case|when|then|else|end|distinct|create table|create index|create unique index|insert into|insert ignore into|values|update|set|delete from|alter table|drop table|drop index|truncate table|primary key|foreign key|auto_increment|default|comment|engine|charset|begin|commit|rollback|show tables|show databases|show index|desc|describe|explain|over|partition by|asc|desc|on duplicate key update)\b/gi;

function formatSqlSimple(lines:string[]):string{
 return lines.map(line=>{
  const trimmed=line.trimEnd();
  if(!trimmed)return '';
  // 跳过字符串与注释，将常见 SQL 关键字规范为大写
  let out='',i=0,n=trimmed.length,seg='';
  const flush=()=>{if(seg){out+=seg.replace(SQL_UPPER_KW,m=>m.toUpperCase());seg=''}};
  while(i<n){
   const ch=trimmed[i],nxt=trimmed[i+1];
   if((ch==='-'&&nxt==='-')||ch==='#'){flush();out+=trimmed.slice(i);break}
   if(ch==="'"||ch==='"'||ch==='`'){
    flush();
    const q=ch;out+=q;i++;
    while(i<n){
     if(trimmed[i]==='\\'&&i+1<n){out+=trimmed[i]+trimmed[i+1];i+=2;continue}
     out+=trimmed[i];
     if(trimmed[i]===q){i++;break}
     i++;
    }
    continue;
   }
   seg+=ch;i++;
  }
  flush();
  return out;
 }).join('\n')+(lines.length?'\n':'');
}

// 轻量代码格式化（用于 Python / Java / JS-TS / SQL；Go 与 Rust 分别优先使用官方 gofmt 与 rustfmt）。
export function formatCodeSimple(lang:PlaygroundLang,code:string):string{
 const normalized=code.replace(/\r\n?/g,'\n').split('\n').map(l=>l.replace(/[ \t]+$/,''));
 // 折叠连续超过 2 行的空行
 const collapsed:string[]=[];
 let blanks=0;
 for(const l of normalized){
  if(l===''){blanks++;if(blanks<=1)collapsed.push(l)}
  else{blanks=0;collapsed.push(l)}
 }
 while(collapsed.length&&collapsed[0]==='')collapsed.shift();
 while(collapsed.length&&collapsed[collapsed.length-1]==='')collapsed.pop();

 if(lang==='sql'){
  return formatSqlSimple(collapsed);
 }
 if(lang==='python'){
  return collapsed.join('\n')+(collapsed.length?'\n':'');
 }

 // Java / JS-TS / 通用括号语言：按大括号层级规整缩进（跳过字符串与注释中的括号）
 const unit=lang==='ts'?'  ':'    ';
 let depth=0;
 let inBlockComment=false;
 const out:string[]=[];
 for(const raw of collapsed){
  const trimmed=raw.trim();
  if(!trimmed){out.push('');continue}
  if(inBlockComment){
   out.push(unit.repeat(depth)+trimmed);
   if(trimmed.includes('*/'))inBlockComment=false;
   continue;
  }
  const startsClose=/^[}\])]/.test(trimmed);
  const lineDepth=Math.max(0,depth-(startsClose?1:0));
  // 保持 switch case / default 对齐
  const extraOutdent=/^(case\b.*:|default\s*:)/.test(trimmed)&&lineDepth>0?1:0;
  out.push(unit.repeat(Math.max(0,lineDepth-extraOutdent))+trimmed);

  // 统计本行净括号变化（忽略引号与行注释）
  let delta=0;
  let quote='';
  for(let i=0;i<trimmed.length;i++){
   const ch=trimmed[i],nxt=trimmed[i+1];
   if(quote){
    if(ch==='\\'){i++;continue}
    if(ch===quote)quote='';
    continue;
   }
   if(ch==='/'&&nxt==='/')break;
   if(ch==='/'&&nxt==='*'){
    const end=trimmed.indexOf('*/',i+2);
    if(end>=0){i=end+1;continue}
    inBlockComment=true;break;
   }
   if(ch==="'"||ch==='"'||ch==='`'){quote=ch;continue}
   if(ch==='{'||ch==='('||ch==='[')delta++;
   else if(ch==='}'||ch===')'||ch===']')delta--;
  }
  depth=Math.max(0,depth+delta);
 }
 return out.join('\n')+(out.length?'\n':'');
}
