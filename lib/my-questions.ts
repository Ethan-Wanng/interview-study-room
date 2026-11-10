// 私人题库（/api/my-questions）的数据格式和限制，页面和接口共用。
export type MyQuestion={id:string;subject:string;section:string;title:string;answer:string;updatedAt:number};
export type MyQuestionInput={subject?:string;section?:string;title:string;answer:string};
export const MY_LIMITS={total:1000,title:300,answer:20000,section:40,batch:100,source:12000,generate:15} as const;
export const MINE='mine';

// 参考答案是纯文本：``` 包起来的部分显示成代码块，其余按空行分段。
export function answerBlocks(answer:string):{type:'text'|'code';text:string}[]{
 const out:{type:'text'|'code';text:string}[]=[],parts=answer.replace(/\r\n/g,'\n').split(/^```[^\n]*\n?/m);
 parts.forEach((part,i)=>{if(i%2){const code=part.replace(/\n$/,'');if(code.trim())out.push({type:'code',text:code})}
  else for(const p of part.split(/\n\s*\n/))if(p.trim())out.push({type:'text',text:p.trim()})});
 return out}

// 批量粘贴：每道题以 “问：”“Q:” 或 Markdown 标题 “## ” 开头，下面到下一题之前都是答案（答案里的编号列表不会被当成新题）。
export function parseBatch(text:string):MyQuestionInput[]{
 const lines=text.replace(/\r\n/g,'\n').split('\n'),items:MyQuestionInput[]=[];let cur:MyQuestionInput|null=null,inCode=false;
 const head=/^\s*(?:#{1,4}\s+|(?:Q|q|问|问题)\s*[:：]\s*)(.+)$/;
 for(const line of lines){if(/^\s*```/.test(line))inCode=!inCode;
  const m=!inCode&&line.match(head);
  if(m){if(cur)items.push(cur);cur={title:m[1].trim(),answer:''};continue}
  if(cur)cur.answer+=(cur.answer?'\n':'')+line.replace(/^\s*(?:A|a|答|答案)\s*[:：]\s*/,'')}
 if(cur)items.push(cur);
 return items.map(x=>({...x,answer:x.answer.trim()})).filter(x=>x.title)}
