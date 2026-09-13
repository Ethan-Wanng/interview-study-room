import {emptyText,type ManagedQuestion} from './catalog-types';
export function rowsToQuestions(rows:Record<string,unknown>[],subjectId:string,chapter:string,kind:'document'|'practice'):ManagedQuestion[]{
 return rows.filter(r=>String(r['题目']??r['Question']??r['title']??'').trim()).map(r=>{
 const get=(...keys:string[])=>String(keys.map(k=>r[k]).find(v=>v!==undefined)??'').trim();
 const answer=get('答案','Answer','answer'),explanation=get('解析','Explanation','explanation'),typeName=get('题型','Type','type');
 const type=({'选择题':'choice','填空题':'fill','简答题':'short','代码题':'code'} as Record<string,string>)[typeName]??typeName;
 const options=['A','B','C','D'].map(k=>get(k));const correct=get('正确选项','Correct option').toUpperCase();
 return {id:'imp-'+crypto.randomUUID(),subjectId,kind,type:['choice','fill','short','code'].includes(type)?type as ManagedQuestion['type']:'short',status:'draft',revision:0,topic:get('知识点','Topic','topic')||chapter,section:get('章节','Chapter','chapter')||chapter,accepted:type==='choice'&&'ABCD'.includes(correct)&&correct? [String('ABCD'.indexOf(correct))]:type==='fill'?get('可接受答案','Accepted answers').split('|').filter(Boolean):[],zh:{...emptyText(),title:get('题目','Question','title'),answer,explanation,options,code:get('代码','Code','code'),rubric:get('评分要点','Rubric').split(/\n|\|/).filter(Boolean),blocks:[...(answer?[{type:'text' as const,text:answer}]:[]),...(explanation?[{type:'text' as const,text:explanation}]:[])]},en:null};
 });
}
export function textToRows(text:string){
 const rows:Record<string,string>[]=[];let current:Record<string,string>|null=null,field='答案',chapter='';const explicit=/^(?:题目|问题|Question)\s*[:：]/im.test(text);
 for(const raw of text.split(/\r?\n/)){const line=raw.trim();if(!line)continue;
 const heading=line.match(/^(?:章节|Chapter)\s*[:：]\s*(.+)/i);if(heading){chapter=heading[1];continue}
 const title=line.match(/^(?:\d+[.、．)）]\s*|(?:题目|问题|Question)\s*[:：]\s*)(.+)/i);
 if(title&&(!explicit||/^(?:题目|问题|Question)\s*[:：]/i.test(line))){current={'题目':title[1],'章节':chapter};rows.push(current);field='答案';continue}
 if(!current)continue;
 const label=line.match(/^(答案|参考答案|解析|评分要点|代码|题型|正确选项|可接受答案|Answer|Explanation|Type|Rubric)\s*[:：]\s*(.*)/i);
 if(label){field=({'参考答案':'答案','answer':'答案','explanation':'解析','type':'题型','rubric':'评分要点'} as Record<string,string>)[label[1].toLowerCase()]??label[1];current[field]=label[2];continue}
 const option=line.match(/^([A-D])[.、．)）]\s*(.*)/);if(option){current[option[1]]=option[2];continue}
 current[field]=(current[field]?current[field]+'\n':'')+raw;
 }
 return rows;
}
