// AI 思考强度设置：不同模型支持的挡位和默认值各不相同，前后端统一从这里的规格表读取并校验。
export type ConcreteThinkingLevel='off'|'low'|'medium'|'high'|'xhigh'|'max'|'ultra';
export type ThinkingLevel='auto'|ConcreteThinkingLevel;
export const DEFAULT_THINKING_LEVEL:ThinkingLevel='auto';

const CONCRETE:ConcreteThinkingLevel[]=['off','low','medium','high','xhigh','max','ultra'];

export const isThinkingLevel=(v:unknown):v is ThinkingLevel=>
 v==='auto'||CONCRETE.includes(v as ConcreteThinkingLevel);

export const parseThinkingLevel=(v:unknown):ThinkingLevel=>
 isThinkingLevel(v)?v:DEFAULT_THINKING_LEVEL;

export type ThinkingMeta={
 id:ConcreteThinkingLevel;
 shortZh:string;
 shortEn:string;
 hintZh:string;
 hintEn:string;
};

export const THINKING_META:Record<ConcreteThinkingLevel,ThinkingMeta>={
 off:{
  id:'off',
  shortZh:'关闭',
  shortEn:'Off',
  hintZh:'关闭思考过程，直接回答（响应最快）',
  hintEn:'Disable thinking for fastest direct answers',
 },
 low:{
  id:'low',
  shortZh:'低',
  shortEn:'Low',
  hintZh:'轻度思考关键要点，延迟较低',
  hintEn:'Light reasoning with low latency',
 },
 medium:{
  id:'medium',
  shortZh:'中',
  shortEn:'Med',
  hintZh:'适度展开推理步骤，兼顾速度与准确度',
  hintEn:'Balanced reasoning depth and speed',
 },
 high:{
  id:'high',
  shortZh:'高',
  shortEn:'High',
  hintZh:'深入推演细节与边界条件，适合复杂分析',
  hintEn:'Deep reasoning for complex analysis',
 },
 xhigh:{
  id:'xhigh',
  shortZh:'极高',
  shortEn:'XHigh',
  hintZh:'最大推理预算（Gemini 4 Hydrogen 最高挡位，耗时较长）',
  hintEn:'Maximum reasoning depth on Gemini 4 Hydrogen',
 },
 max:{
  id:'max',
  shortZh:'Max',
  shortEn:'Max',
  hintZh:'极限深度推理（适合高难度推导）',
  hintEn:'Maximum reasoning effort for complex tasks',
 },
 ultra:{
  id:'ultra',
  shortZh:'Ultra',
  shortEn:'Ultra',
  hintZh:'最高档极限推理（仅部分模型支持，耗时最长）',
  hintEn:'Ultra reasoning effort (supported models only)',
 },
};

export type ModelThinkingSpec={
 levels:ConcreteThinkingLevel[];
 defaultLevel:ConcreteThinkingLevel;
 locked?:boolean;
};

const SPEC_DS_OFF:ModelThinkingSpec={levels:['off','low','high','max'],defaultLevel:'off'};
const SPEC_DS_FLASH_THINK:ModelThinkingSpec={levels:['off','low','high','max'],defaultLevel:'low'};
const SPEC_DS_PRO:ModelThinkingSpec={levels:['off','low','high','max'],defaultLevel:'high'};
const SPEC_OPENAI_REASONING:ModelThinkingSpec={levels:['low','medium','high'],defaultLevel:'medium'};
const SPEC_OFF_ONLY:ModelThinkingSpec={levels:['off'],defaultLevel:'off',locked:true};
const SPEC_CLAUDE:ModelThinkingSpec={levels:['off','low','medium','high'],defaultLevel:'off'};
const SPEC_QWEN:ModelThinkingSpec={levels:['off','low','medium','high'],defaultLevel:'off'};

// 根据自定义提供商与模型名称，返回该模型真实的思考挡位与出厂默认值。
export function getCustomThinkingSpec(provider:string,model?:string):ModelThinkingSpec{
 const m=(model||'').trim().toLowerCase();
 if(provider==='deepseek'){
  if(m.includes('v4-pro')||m.includes('reasoner'))return SPEC_DS_PRO;
  return !m.includes('flash')?SPEC_DS_PRO:SPEC_DS_FLASH_THINK;
 }
 if(provider==='openai'){
  if(/^o\d|^gpt-5/.test(m))return SPEC_OPENAI_REASONING;
  return SPEC_OFF_ONLY;
 }
 if(provider==='anthropic')return SPEC_CLAUDE;
 if(provider==='qwen')return SPEC_QWEN;
 return SPEC_DS_OFF;
}

function normalizeLocalLevel(raw?: string): ConcreteThinkingLevel | null {
 if (!raw) return null;
 const s = raw.trim().toLowerCase();
 if (s === 'off' || s === 'none' || s === 'disabled') return 'off';
 if (s === 'low' || s === 'minimal' || s === 'min') return 'low';
 if (s === 'medium' || s === 'med' || s === 'normal' || s === 'balanced') return 'medium';
 if (s === 'high') return 'high';
 if (s === 'xhigh' || s === 'extra_high' || s === 'extra-high' || s === 'very_high') return 'xhigh';
 if (s === 'max') return 'max';
 if (s === 'ultra') return 'ultra';
 return null;
}

// 本地客户端思考强度规格：完全依据桥接端探测到的当前模型真实支持档位动态生成，不硬编码猜测。
export function getLocalThinkingSpec(
 provider: string,
 model?: string,
 detectedLevels?: string[],
 detectedDefault?: string,
): ModelThinkingSpec {
 void provider;
 void model;
 if (Array.isArray(detectedLevels)) {
  const levels: ConcreteThinkingLevel[] = [];
  for (const raw of detectedLevels) {
   const norm = normalizeLocalLevel(raw);
   if (norm && !levels.includes(norm)) levels.push(norm);
  }
  if (levels.length <= 1) {
   const only = levels[0] ?? 'medium';
   return { levels: [only], defaultLevel: only, locked: true };
  }
  const defNorm = normalizeLocalLevel(detectedDefault);
  const defaultLevel =
   defNorm && levels.includes(defNorm)
    ? defNorm
    : levels.includes('medium')
      ? 'medium'
      : levels[0];
  return { levels, defaultLevel };
 }
 return { levels: ['medium'], defaultLevel: 'medium', locked: true };
}

type LocalThinkingInput = {
 enabled?: boolean;
 provider: string;
 model?: string;
 thinkingLevels?: string[];
 defaultThinkingLevel?: string;
};

// 全站统一模型选择对应的思考规格（覆盖问答、评分、笔记、重出、深度调研）。
export function getGlobalThinkingSpec(model:string,custom?:{provider:string;model?:string}|null,local?:LocalThinkingInput|null,isGuest=false):{scopeKey:string;spec:ModelThinkingSpec}{
 void isGuest;
 if((model==='local'||(model==='auto'&&local?.enabled))&&local?.enabled){
  const m=local.model?.trim()||'default';
  return {scopeKey:`local:${local.provider}/${m}`,spec:getLocalThinkingSpec(local.provider,local.model,local.thinkingLevels,local.defaultThinkingLevel)};
 }
 if((model==='auto'||model==='custom')&&custom){
  const m=custom.model?.trim()||custom.provider;
  return {scopeKey:`custom:${custom.provider}/${m}`,spec:getCustomThinkingSpec(custom.provider,custom.model)};
 }
 if(model==='deepseek-v4-pro')return {scopeKey:'tutor:deepseek-v4-pro',spec:SPEC_DS_PRO};
 if(model==='deepseek-flash-think'||model==='deepseek')return {scopeKey:'tutor:deepseek-flash-think',spec:SPEC_DS_FLASH_THINK};
 if(model==='deepseek-flash')return {scopeKey:'tutor:deepseek-flash',spec:SPEC_DS_OFF};
 return {scopeKey:'global:deepseek-auto',spec:SPEC_DS_FLASH_THINK};
}

// AI 问答模型与自定义配置对应的思考规格与作用域键（与全站统一规格共用同一份作用域）。
export function getTutorThinkingSpec(siteModel:string,custom?:{provider:string;model?:string}|null,local?:LocalThinkingInput|null):{scopeKey:string;spec:ModelThinkingSpec}{
 return getGlobalThinkingSpec(siteModel,custom,local,false);
}

// AI 评分模型与自定义配置对应的思考规格与作用域键（与全站统一规格共用同一份作用域）。
export function getGradeThinkingSpec(gradeModel:string,custom?:{provider:string;model?:string}|null,isGuest=false,local?:LocalThinkingInput|null):{scopeKey:string;spec:ModelThinkingSpec}{
 return getGlobalThinkingSpec(gradeModel,custom,local,isGuest);
}

// 把任意请求挡位夹紧到某个规格允许的最接近挡位。
export function clampThinkingToSpec(level:ThinkingLevel,spec:ModelThinkingSpec):ConcreteThinkingLevel{
 if(level==='auto')return spec.defaultLevel;
 if(spec.levels.includes(level))return level;
 if(level==='ultra'&&spec.levels.includes('max'))return 'max';
 if(level==='ultra'&&spec.levels.includes('xhigh'))return 'xhigh';
 if(level==='max'&&spec.levels.includes('xhigh'))return 'xhigh';
 if(level==='xhigh'&&spec.levels.includes('max'))return 'max';
 if(level==='medium'){
  if(spec.levels.includes('high'))return 'high';
  if(spec.levels.includes('low'))return 'low';
 }
 const order:ConcreteThinkingLevel[]=['off','low','medium','high','xhigh','max','ultra'];
 const want=order.indexOf(level);
 let best=spec.defaultLevel,bestDist=99;
 for(const cand of spec.levels){
  const d=Math.abs(order.indexOf(cand)-want);
  if(d<bestDist){best=cand;bestDist=d}
 }
 return best;
}

// 解析「model@level」标签：把真实响应的模型标识与当时使用的思考挡位拆开，用于消息角标和评分标签展示。
export function splitModelTag(model:string|undefined):{base:string;level?:ConcreteThinkingLevel}{
 const m=(model||'').trim();
 const at=m.lastIndexOf('@');
 if(at>0){
  const lv=m.slice(at+1);
  if(CONCRETE.includes(lv as ConcreteThinkingLevel)){
   return {base:m.slice(0,at),level:lv as ConcreteThinkingLevel};
  }
 }
 return {base:m};
}

export function thinkingLevelBadgeText(level:ConcreteThinkingLevel,lang:'zh'|'en'='zh'):string{
 if(level==='off')return lang==='en'?'Thinking off':'关闭思考';
 const meta=THINKING_META[level];
 return lang==='en'?meta.shortEn:meta.shortZh;
}
