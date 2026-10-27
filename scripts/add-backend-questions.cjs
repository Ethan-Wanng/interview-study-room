// 把 scripts/data/backend-new-*.cjs 里的新增后端面试题写入 content/questions.json。
// id 由标题哈希得到（q- + 16 位十六进制），重复运行不会重复添加；新题插在对应章节的最后一题之后。
// 用法：node scripts/add-backend-questions.cjs
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const file=path.join(__dirname,'..','content','questions.json'),bank=JSON.parse(fs.readFileSync(file,'utf8'));
const dir=path.join(__dirname,'data'),items=fs.readdirSync(dir).filter(f=>/^backend-new-.*\.cjs$/.test(f)).sort().flatMap(f=>require(path.join(dir,f)));
const idOf=title=>'q-'+crypto.createHash('sha1').update('backend:'+title).digest('hex').slice(0,16);
let added=0;
for(const it of items){const id=idOf(it.title);if(bank.questions.some(q=>q.id===id))continue;
 const q={id,track:'backend',category:it.category,section:it.category,title:it.title,blocks:it.blocks,sourceParagraph:0};
 let at=-1;bank.questions.forEach((x,i)=>{if(x.category===it.category)at=i});
 if(at<0)throw new Error('未知章节：'+it.category);bank.questions.splice(at+1,0,q);added++;}
fs.writeFileSync(file,JSON.stringify(bank,null,2)+'\n');
console.log('added',added,'total',bank.questions.length);
for(const it of items)console.log(idOf(it.title),it.title);
