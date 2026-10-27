// 按章节和标题关键词，把后端面试题分配到 12 个学习关卡，生成 content/backend-links.ts。
// 新增后端面试题后重新运行：node scripts/gen-backend-links.cjs
const fs=require('fs'),path=require('path');
const {questions}=require('../content/questions.json');
const pick=q=>{const t=q.title;
 if(q.category==='数据库与缓存'){
  if(/查询缓存|锁全表/.test(t))return 'be-tx';
  if(/Redis|缓存|LRU|大Key|大 key|分布式锁/i.test(t))return 'be-redis';
  if(/Elasticsearch|ElasticSearch|倒排|segment|term|match|ES/.test(t))return 'be-es';
  if(/count|char|自增|唯一索引|SQL语句|必考|准备/i.test(t))return 'be-sql';
  if(/索引|explain|分页|like|SQL优化|B\+/i.test(t))return 'be-index';
  return 'be-tx'}
 if(q.category==='微服务')return /kafka|消息|消费|位移|生产者|有序性|重平衡|topic/i.test(t)?'be-mq':'be-ms';
 if(q.category==='设计模式与算法')return 'be-algo';
 if(q.category==='项目')return 'be-design';
 if(q.category==='Linux、操作系统与网络'){
  if(/排查|命令|日志|crontab|su，|磁盘阵列|inode|2＞&1|删除了文件|环境配置|学好|面试应该怎么准备|应对技巧|进程管理|CPU 负载/.test(t))return 'be-linux';
  if(/IP|ping|TCP|UDP|HTTP|websocket|URL|DNS|握手|挥手|Keepalive|网线|ack|SYN/i.test(t))return 'be-network';
  return 'be-os'}
 return null};
const order=['be-sql','be-index','be-algo','be-tx','be-redis','be-linux','be-network','be-os','be-mq','be-ms','be-es','be-design'];
const map=Object.fromEntries(order.map(k=>[k,[]]));
for(const q of questions.filter(q=>q.track==='backend')){const k=pick(q);if(!k)throw new Error('未分配：'+q.title);map[k].push(q.id)}
const body=order.map(k=>` '${k}':[${map[k].map(i=>`'${i}'`).join(',')}],`).join('\n');
fs.writeFileSync(path.join(__dirname,'..','content','backend-links.ts'),`// 后端学习关卡与后端面试题（content/questions.json 中 track 为 backend）的对应关系。由 scripts/gen-backend-links.cjs 生成，不要手改。\nexport const backendInterviewByLevel:Record<string,string[]>={\n${body}\n};\n`);
for(const k of order)console.log(k,map[k].length,map[k].map(i=>questions.find(q=>q.id===i).title.slice(0,12)).join(' | '));
