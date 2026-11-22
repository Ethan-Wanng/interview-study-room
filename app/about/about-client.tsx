'use client';
import '../ai/ai.css';
import './about.css';
import {ArrowRight,BookOpen,Calendar,Code2,Cpu,GraduationCap,HeartHandshake,History,Layers,Sparkles,User} from 'lucide-react';
import SiteHeader from '../components/site-header';
import {PROJECT_STARTED} from '@/lib/project';
import TitleTip from '../components/title-tip';
import {useI18n} from '../components/i18n';

export type AboutStats={
 startedAt:string;
 daysActive:number;
 subjectsCount:number;
 levelsCount:number;
 interviewCount:number;
 releaseCount:number;
 latestVersion:string;
};

export default function AboutClient({
 username,
 stats,
}:{
 username:string;
 stats:AboutStats;
}){
 const {locale}=useI18n();
 const L=(zh:string,en:string)=>locale==='en'?en:zh;

 const whyCards=[
  {
   num:'01',
   title:L('最初的起点：一份不想“看完就忘”的面试文档','Origin: Turning Static Interview Notes Into Recall'),
   body:L(
    '最早它只是为了解决一个很现实的痛点——手头有一份整理好的 305 道 Go 与后端面试题文档，直接从头读到尾不仅容易走神、看过就忘，遇到专业名词还得反复切出去查资料。于是就想做一个每天定量学几题、按 1/3/7/14/30/60 天遗忘规律安排复习、点一下高亮词就能看大白话解释的小自习室。',
    'It started from a simple frustration: reading a 305-question study document top to bottom makes it easy to forget everything. So the first version turned it into daily study targets, 1/3/7/14/30/60-day spaced repetition, and clickable glossary terms.'
   ),
  },
  {
   num:'02',
   title:L('从“背八股”走到“看得懂、写得出”','From Memorizing Answers to Truly Understanding'),
   body:L(
    '后来发现，光有文字题库对初学者还不够友好：很多底层概念（Attention、KV Cache、MVCC、Goroutine 调度、Rust 所有权与 Python 异步）抽象难懂，光看答案很容易“以为自己懂了”。于是陆续补上了逐关学习卡片、SVG 动画课堂、配音旁白、阶段训练、150 分实战模拟卷与答题断点续答，并打造了六语言（含 MySQL）在线代码操场与支持随题收录、就地运行、全屏翻页的仿真笔记本。',
    'Plain text was not enough for deep concepts like Attention, KV Cache, MVCC, Goroutine scheduling, or Rust ownership. We expanded into interactive lesson cards, narrated animations, timed exams with save/resume, a 6-language Code Playground (including MySQL), and an interactive Study Notebook.'
   ),
  },
  {
   num:'03',
   title:L('让每个人都有一位耐心的“AI 教练”','An Always-Available, Patient AI Tutor'),
   body:L(
    '背题最怕“写完了不知道哪里扣分、卡住了没人问、笔记越记越乱”。站点接入了流式 AI 评分与 AI 老师：不仅会在答案上逐句划词批注错因、展示思考过程，还支持 AI 问答内直接运行代码、划选文字一键记笔记、不完整代码自动补全运行与报错注释修复，以及笔记本 AI 润色/规范化和个人专属 API Key 绑定。',
    'Studying alone often means not knowing what you missed or ending up with messy notes. Streaming AI grading highlights mistakes inline on your answer, powers inline code execution & auto-completion, selection-to-note capture, notebook AI polishing, and private user API keys.'
   ),
  },
  {
   num:'04',
   title:L('免费开放：甚至教你亲手搭建这个网站','Free & Accessible — Learn to Build It Yourself'),
   body:L(
    '这个项目从第一天起就没有做付费墙，支持游客直接体验、也支持邮箱与第三方账号跨设备同步进度。我们还专门写了一门 19 关的《复刻面试自习室》项目实战课，手把手拆解前后端与数据库设计，希望每一位学友都能既用它准备面试，也能看懂并做出属于自己的全栈项目。',
    'Built without paywalls from day one, supporting guest mode and cloud sync across devices. We also wrote a 19-level hands-on course breaking down the full architecture so you can build your own study room from scratch.'
   ),
  },
 ];

 const milestones=[
  {
   date:'2026-09-11',
   title:L('项目第一行代码提交（v0 起步）','First Commit & Initial Launch'),
   body:L(
    '在 Git 仓库提交首个版本（0b28770）：上线 305 道 Go 与后端面试题、每日新学/复习目标、固定间隔复习队列与关键词弹窗释义，随后很快加入独立账号、游客模式与十一时段主题。',
    'Initial commit (0b28770) launched the 305-question interview notebook with daily goals, spaced review, and term popups, followed quickly by accounts, guest access, and 11 time-of-day themes.'
   ),
  },
  {
   date:'2026-09-12 ~ 09-23',
   title:L('训练中心、模拟考试与后台题库体系','Practice Hub, Timed Exams & Admin Bank'),
   body:L(
    '补齐选择、填空、简答、代码四种题型，上线综合考试、模拟面试与每日 30/60 分钟随机训练；并搭建管理后台与幂等题库导入 API，实现题目可持续校对和扩展。',
    'Added four question formats, timed exams, mock interviews, and daily practice, plus an admin console and idempotent question ingestion workflows.'
   ),
  },
  {
   date:'2026-10-22 ~ 10-30',
   title:L('全学科版图与 SVG 动画课堂上线','Full Subject Map & Animated Classroom'),
   body:L(
    '推出 AI 开发、Go 开发、后端通用、前端开发与英语（单词记忆 + 雅思）学习路线，上线 80+ 面试题分镜动画与“懒人听学”全集模式。',
    'Expanded into AI, Go, Backend, Frontend, and English tracks, introducing interactive SVG animation classrooms and hands-free Lazy listening mode.'
   ),
  },
  {
   date:'2026-11-01 ~ 11-04',
   title:L('两大实战项目课与流式 AI 评分','Hands-On Project Courses & Streaming AI'),
   body:L(
    '上线《复刻面试自习室》《智能 AI 客服实战》两大项目实战课（含在线演练沙盒），开启流式 AI 评分、本地克隆旁白音色与 Rust 开发先行关卡。',
    'Launched two hands-on project courses with an AI support sandbox, streaming AI grading, narrated voiceovers, and the Rust track.'
   ),
  },
  {
   date:'2026-11-09 ~ 11-18',
   title:L('五语言模板、液态玻璃与三大新栏目','Five-Language Support, Liquid Glass & Community'),
   body:L(
    '全部核心代码题覆盖 Python / Go / Java / JS-TS / Rust 五语言模板与参考答案；推出全站搜索、AI 老师、原文划词批注、iOS 26 液态玻璃界面，以及「代码操场」「项目关于」和「分享故事」。',
    'Added five-language starters and solutions, global search, docked AI tutor, inline answer annotations, Liquid Glass UI, and Code Playground, About, and Stories.'
   ),
  },
  {
   date:'2026-11-19 ~ 11-21',
   title:L('Rust / Python 完整路线与仿真笔记本上线','Rust / Python Complete Tracks & Study Notebooks'),
   body:L(
    '上线 AI 开发第 13 关《Harness 工程与 Skills》与学习→操场双向联动；补齐「Rust 开发」全 15 关与「Python 开发」全 15 关及 6 套 150 分模拟试卷；全新上线「笔记」（/notes）模块，支持多本自定义命名笔记本、全屏 3D 仿真翻页、答题/学习/面试/操场随手收录并原路返回，以及划词排版与 AI 辅助。',
    'Launched AI Level 13 (Harness Engineering & Skills), two-way Learn-Playground sync, full 15-level Rust and Python tracks with 6 formal 150-point papers, and the Study Notebooks (/notes) module featuring fullscreen 3D page-turning, one-click capture with source return links, and selection formatting + AI assistance.'
   ),
  },
  {
   date:'2026-11-22 ~ 11-23',
   title:L('MySQL 沙盒、全站代码就地运行、答题续答与多端体验升级','MySQL Sandbox, Inline Code Execution, Quiz Resume & Multi-Device Polish'),
   body:L(
    '答题全面支持自动暂存、未提交草稿保留、断点续答与云同步；代码操场扩展至六语言（新增浏览器 WASM MySQL 8.0 兼容沙盒与 7 套面试 SQL 示例），并在 AI 问答、答题、学习卡片与笔记中支持代码就地直接运行——不完整片段自动由 AI 补全执行、报错一键 AI 修复，关闭运行窗口自动恢复原代码；新增 AI 问答划词记笔记、笔记本 AI 润色预览与跨本移页调序，并系统优化移动端操场/学习/面试排版、电脑端导航栏跟随 AI 侧栏避让及移动端动画全屏。',
    'Added auto-save, draft preservation, resume, and cloud sync across all quizzes; expanded Playground to 6 languages with a browser WASM MySQL 8.0 compat sandbox and 7 SQL examples; enabled direct inline code execution with AI auto-completion and restore-on-close across AI Q&A, quizzes, lessons, and notes; added AI Q&A selection-to-note, notebook AI polish and reorder/move, plus responsive mobile and fullscreen animation fixes.'
   ),
  },
 ];

 const techStack=[
  'Next.js App Router / vinext',
  'React 19',
  'TypeScript',
  'Cloudflare Workers',
  'Cloudflare D1 (SQLite)',
  'Drizzle ORM',
  'SQLite WASM (MySQL Compat)',
  'iOS 26 Liquid Glass CSS',
  'DeepSeek & Gemini Streaming',
 ];

 return (
  <div className="ab-shell">
   <SiteHeader active="about" username={username}/>
   <main className="ab-main">
    <section className="ai-card ab-hero">
     <div className="ai-title">
      <span className="eyebrow">ABOUT PROJECT</span>
      <h1>
       {L('关于「面试自习室」','About Interview Study Room')}
       <TitleTip>
        <p>{L('这里记录了这个项目的诞生缘起、起始日期、设计理念与一路演进的功能里程碑。','Learn about why we built this project, when it started, and its evolution milestones.')}</p>
       </TitleTip>
      </h1>
     </div>
     <p className="ab-hero-lead">
      {L(
       '「面试自习室」（Interview Study Room）是一个从 2026 年 9 月 11 日开始编写的全栈学习与面试复习网站。它最初诞生于“把一份静态面试题文档变成真正能每天学、按遗忘规律复习的小工具”的念头，如今已经成长为覆盖多学科闯关（含 Rust 与 Python 全 15 关）、动画课堂、答题断点续答、AI 批注阅卷、六语言（含 MySQL）代码操场、全站代码就地运行、仿真笔记本与学友故事的完整自习空间。',
       'Interview Study Room is a full-stack study and interview prep platform started on September 11, 2026. Born from the wish to turn static interview notes into an active spaced-repetition tool, it has grown into a multi-subject workspace with full Rust & Python tracks, animations, quiz save/resume, AI grading, a 6-language playground (including MySQL), inline code execution, interactive notebooks, and learner stories.'
      )}
     </p>
     <div className="ab-meta-row">
      <a className="ab-meta-pill link" href="https://github.com/Ethan-Wanng" target="_blank" rel="noreferrer">
       <User size={16}/>
       <span>{L('作者：Ethan-Wanng','Author: Ethan-Wanng')}</span>
      </a>
      <span className="ab-meta-pill">
       <Calendar size={16}/>
       <span>{L(`始建于 ${PROJECT_STARTED}（已持续迭代 ${stats.daysActive} 天）`,`Started ${PROJECT_STARTED} (${stats.daysActive} days active)`)}</span>
      </span>
      <a className="ab-meta-pill link" href="/releases">
       <History size={16}/>
       <span>{L(`当前版本 v${stats.latestVersion}`,`Current v${stats.latestVersion}`)}</span>
      </a>
     </div>
    </section>

    <section className="ab-stats" aria-label={L('项目真实数据','Project statistics')}>
     <div className="ai-card ab-stat">
      <span>{L('开始开发日期','Started On')}</span>
      <strong>{stats.startedAt}</strong>
      <small>{L(`第 ${stats.daysActive} 天持续维护中`,`Day ${stats.daysActive} of active development`)}</small>
     </div>
     <div className="ai-card ab-stat">
      <span>{L('学习路线与关卡','Subjects & Levels')}</span>
      <strong>{stats.subjectsCount} / {stats.levelsCount}</strong>
      <small>{L('涵盖技术、语言与两大实战项目','Tech, languages & 2 hands-on projects')}</small>
     </div>
     <div className="ai-card ab-stat">
      <span>{L('公开题库总量','Public Question Bank')}</span>
      <strong>{stats.interviewCount}+</strong>
      <small>{L('面试问答与多题型训练题实时统计','Live count of interview & practice items')}</small>
     </div>
     <div className="ai-card ab-stat">
      <span>{L('累计迭代版本','Published Releases')}</span>
      <strong>{stats.releaseCount}</strong>
      <small>{L(`当前版本 v${stats.latestVersion}`,`Current v${stats.latestVersion}`)}</small>
     </div>
    </section>

    <section className="ab-section">
     <div className="ab-section-head">
      <h2><Sparkles size={19}/>{L('为什么写这个项目','Why We Built This')}</h2>
      <span>{L('从痛点出发，一路做给自己和更多学友用','Built to solve real learning bottlenecks')}</span>
     </div>
     <div className="ab-why-grid">
      {whyCards.map(c=>(
       <article key={c.num} className="ai-card ab-why-card">
        <span className="ab-why-num">REASON {c.num}</span>
        <h3>{c.title}</h3>
        <p>{c.body}</p>
       </article>
      ))}
     </div>
    </section>

    <section className="ab-section">
     <div className="ab-section-head">
      <h2><History size={19}/>{L('从什么时候开始写 · 演进时间线','When It Started · Development Timeline')}</h2>
      <a href="/releases" style={{fontSize:'.85rem',color:'var(--primary)',fontWeight:650,textDecoration:'none'}}>
       {L('查看全部版本更新日志 →','View full changelog →')}
      </a>
     </div>
     <div className="ai-card ab-timeline">
      {milestones.map(m=>(
       <div key={m.date} className="ab-tl-item">
        <span className="ab-tl-date">{m.date}</span>
        <div className="ab-tl-body">
         <h3>{m.title}</h3>
         <p>{m.body}</p>
        </div>
       </div>
      ))}
     </div>
    </section>

    <section className="ab-section">
     <div className="ab-section-head">
      <h2><Layers size={19}/>{L('技术栈与工程架构','Architecture & Tech Stack')}</h2>
     </div>
     <div className="ai-card ab-arch-card">
      <div className="ab-arch-info">
       <h3><Cpu size={18}/> {L('全栈边缘架构 · 高速直连体验','Full-Stack Edge Architecture')}</h3>
       <p>
        {L(
         '基于 Next.js / vinext 与 Cloudflare Workers + D1 打造轻量高效的边缘全栈服务，结合流式 AI 阅卷批注与多语言运行沙盒；如果你想学习整套系统的实现思路，欢迎配合《复刻面试自习室》课程一起实践！',
         'Built with Next.js / vinext, Cloudflare Workers + D1, streaming AI grading, and a multi-language sandbox. Follow the Rebuild This Site course to explore the full architecture.'
        )}
       </p>
       <div className="ab-tech-tags">
        {techStack.map(t=><span key={t} className="ab-tech-tag">{t}</span>)}
       </div>
      </div>
      <div className="ab-arch-actions">
       <a className="button primary" href="/learn/project">
        <GraduationCap size={16}/>{L('去学《复刻面试自习室》','Rebuild This Site Course')}
       </a>
       <a className="button secondary" href="/releases">
        <History size={16}/>{L('查看更新日志','View Changelog')}
       </a>
      </div>
     </div>
    </section>

    <section className="ab-cta-grid" aria-label={L('继续探索','Explore more')}>
     <a href="/notes" className="ai-card ab-cta-card">
      <strong><BookOpen size={17}/>{L('仿真笔记本','Study Notebooks')}</strong>
      <span>{L('统一跟随系统主题配色与 3D 全屏翻页，支持移本调序、AI 润色与代码块就地运行。','Theme-synced notebooks with fullscreen 3D page-turns, reorder/move, AI polish, and inline code execution.')}</span>
      <em>{L('打开笔记本','Open Notebooks')}<ArrowRight size={14}/></em>
     </a>
     <a href="/playground" className="ai-card ab-cta-card">
      <strong><Code2 size={17}/>{L('六语言代码操场','Code Playground')}</strong>
      <span>{L('在线编写并运行 Go、Python、Java、JS/TS、Rust 与 MySQL，各配 7 段精选示例及 AI 补全排错。','Write and run Go, Python, Java, JS/TS, Rust, and MySQL with 7 examples each and AI completion.')}</span>
      <em>{L('去写代码','Open Playground')}<ArrowRight size={14}/></em>
     </a>
     <a href="/stories" className="ai-card ab-cta-card">
      <strong><HeartHandshake size={17}/>{L('学友分享故事','Share Your Story')}</strong>
      <span>{L('看看大家如何坚持学习与拿到 Offer，也写下属于你的那一段经历。','Read stories from fellow learners and share your own journey.')}</span>
      <em>{L('去看看故事','Read & Share Stories')}<ArrowRight size={14}/></em>
     </a>
     <a href="/learn" className="ai-card ab-cta-card">
      <strong><GraduationCap size={17}/>{L('回到学习空间','Learning Space')}</strong>
      <span>{L(`${stats.subjectsCount} 门系统路线、动画课堂、阶段训练与 150 分模拟考试等你通关。`,`${stats.subjectsCount} structured tracks, animated lessons, and full mock exams.`)}</span>
      <em>{L('继续学习','Go to Learn')}<ArrowRight size={14}/></em>
     </a>
    </section>
   </main>
  </div>
 );
}
