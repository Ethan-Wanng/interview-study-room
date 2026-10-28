/* eslint-disable @typescript-eslint/no-require-imports -- 独立运行的 Node 脚本 */
// 按章节和标题关键词，把后端面试题分配到 23 个学习关卡，生成 content/backend-links.ts。
// 新增后端面试题后重新运行：node scripts/gen-backend-links.cjs
const fs=require('fs'),path=require('path');
const {questions}=require('../content/questions.json');
const pick=q=>{const t=q.title;
 if(q.category==='数据库与缓存'){
  if(/redo|binlog|主从|分库分表/i.test(t))return 'be-log';
  if(/查询缓存|锁全表/.test(t))return 'be-tx';
  if(/Redis|缓存|LRU|大Key|大 key|分布式锁/i.test(t))return 'be-redis';
  if(/Elasticsearch|ElasticSearch|倒排|segment|term|match|ES/.test(t))return 'be-es';
  if(/必考|准备/.test(t))return 'be-db101';
  if(/count|char|自增|唯一索引|SQL语句/i.test(t))return 'be-sql';
  if(/索引|explain|分页|like|SQL优化|B+/i.test(t))return 'be-index';
  return 'be-tx'}
 if(q.category==='微服务'){
  if(/kafka|消息|消费|位移|生产者|有序性|重平衡|topic/i.test(t))return /丢数据|重复消费|有序|幂等|位移|重平衡|堆积|高可用|Go操作|删除/i.test(t)?'be-kafka':'be-mq';
  if(/Docker|K8s|pod|LXC|Image|Layer/i.test(t))return 'be-cloud';
  return 'be-ms'}
 if(q.category==='设计模式与算法'){
  if(/模式|单例|工厂|原则|参数传递/.test(t))return 'be-algo';
  if(/链表|栈|队列|集合|二叉树|反转/.test(t))return 'be-ds';
  return 'be-algo2'}
 if(q.category==='项目')return 'be-design';
 if(q.category==='Linux、操作系统与网络'){
  if(/常用命令|学好linux|知识点那么多|2＞&1/i.test(t))return 'be-cli';
  if(/排查|超大日志|删除了文件|crontab|CPU 负载/.test(t))return 'be-trouble';
  if(/命令|su，|磁盘阵列|inode|2＞&1|环境配置|学好|面试应该怎么准备|应对技巧|进程管理/.test(t))return 'be-linux';
  if(/Keepalive/i.test(t))return 'be-network';
  if(/输入URL/i.test(t))return 'be-basics';
  if(/HTTP|websocket|URL|DNS/i.test(t))return 'be-http';
  if(/IP|ping|TCP|UDP|握手|挥手|网线|ack|SYN/i.test(t))return 'be-network';
  if(/IO|epoll|零拷贝|DMA|磁盘调度|写文件/i.test(t))return 'be-io';
  return 'be-os'}
 return null};
const order=['be-basics','be-cli','be-db101','be-sql','be-ds','be-algo2','be-index','be-tx','be-log','be-redis','be-linux','be-algo','be-network','be-http','be-os','be-io','be-trouble','be-mq','be-kafka','be-ms','be-cloud','be-es','be-design'];
const map=Object.fromEntries(order.map(k=>[k,[]]));
for(const q of questions.filter(q=>q.track==='backend')){const k=pick(q);if(!k)throw new Error('未分配：'+q.title);map[k].push(q.id)}
const body=order.map(k=>` '${k}':[${map[k].map(i=>`'${i}'`).join(',')}],`).join('\n');
fs.writeFileSync(path.join(__dirname,'..','content','backend-links.ts'),`// 后端学习关卡与后端面试题（content/questions.json 中 track 为 backend）的对应关系。由 scripts/gen-backend-links.cjs 生成，不要手改。\nexport const backendInterviewByLevel:Record<string,string[]>={\n${body}\n};\n`);
for(const k of order)console.log(k,map[k].length,map[k].map(i=>questions.find(q=>q.id===i).title.slice(0,12)).join(' | '));
