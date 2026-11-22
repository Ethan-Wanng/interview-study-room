// AI 思考强度设置：不同模型支持的挡位和默认值各不相同，前后端统一从这里的规格表读取并校验。
export type ConcreteThinkingLevel='off'|'low'|'medium'|'high'|'xhigh'|'max';
export type ThinkingLevel='auto'|ConcreteThinkingLevel;
export const DEFAULT_THINKING_LEVEL:ThinkingLevel='auto';

const CONCRETE:ConcreteThinkingLevel[]=['off','low','medium','high','xhigh','max'];

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
  hintZh:'极限深度推理（DeepSeek V4 最高挡位，适合高难度推导）',
  hintEn:'Maximum reasoning effort on DeepSeek V4',
 },
};

export type ModelThinkingSpec={
 levels:ConcreteThinkingLevel[];
 defaultLevel:ConcreteThinkingLevel;
};

const SPEC_DS_OFF:ModelThinkingSpec={levels:['off','low','high','max'],defaultLevel:'off'};
const SPEC_DS_FLASH_THINK:ModelThinkingSpec={levels:['off','low','high','max'],defaultLevel:'low'};
const SPEC_DS_PRO:ModelThinkingSpec={levels:['off','low','high','max'],defaultLevel:'high'};
const SPEC_GM_HYDROGEN:ModelThinkingSpec={levels:['low','medium','high','xhigh'],defaultLevel:'high'};
const SPEC_GM_38_FLASH:ModelThinkingSpec={levels:['low','medium','high'],defaultLevel:'medium'};
const SPEC_GM_25_FLASH:ModelThinkingSpec={levels:['off','low','medium','high'],defaultLevel:'medium'};
const SPEC_GM_25_PRO:ModelThinkingSpec={levels:['low','medium','high'],defaultLevel:'high'};
const SPEC_OPENAI_REASONING:ModelThinkingSpec={levels:['low','medium','high'],defaultLevel:'medium'};
const SPEC_OFF_ONLY:ModelThinkingSpec={levels:['off'],defaultLevel:'off'};
const SPEC_CLAUDE:ModelThinkingSpec={levels:['off','low','medium','high'],defaultLevel:'off'};
const SPEC_QWEN:ModelThinkingSpec={levels:['off','low','medium','high'],defaultLevel:'off'};

// 根据自定义提供商与模型名称，返回该模型真实的思考挡位与出厂默认值。
export function getCustomThinkingSpec(provider:string,model?:string):ModelThinkingSpec{
 const m=(model||'').trim().toLowerCase();
 if(provider==='deepseek'){
  if(m.includes('v4-pro')||m.includes('reasoner'))return SPEC_DS_PRO;
  return SPEC_DS_PRO.defaultLevel==='high'&&!m.includes('flash')?SPEC_DS_PRO:{levels:['off','low','high','max'],defaultLevel:'high'};
 }
 if(provider==='gemini'){
  if(!m||m.includes('hydrogen'))return SPEC_GM_HYDROGEN;
  if(m.includes('2.5-pro'))return SPEC_GM_25_PRO;
  if(m.includes('2.5'))return SPEC_GM_25_FLASH;
  if(m.includes('3.8')||m.includes('3.6'))return SPEC_GM_38_FLASH;
  return SPEC_GM_HYDROGEN;
 }
 if(provider==='openai'){
  if(/^o\d|^gpt-5/.test(m))return SPEC_OPENAI_REASONING;
  return SPEC_OFF_ONLY;
 }
 if(provider==='anthropic')return SPEC_CLAUDE;
 if(provider==='qwen')return SPEC_QWEN;
 return SPEC_DS_OFF;
}

// AI 问答模型与自定义配置对应的思考规格与作用域键。
export function getTutorThinkingSpec(siteModel:string,custom?:{provider:string;model?:string}|null):{scopeKey:string;spec:ModelThinkingSpec}{
 if((siteModel==='auto'||siteModel==='custom')&&custom){
  const m=custom.model?.trim()||custom.provider;
  return {scopeKey:`custom:${custom.provider}/${m}`,spec:getCustomThinkingSpec(custom.provider,custom.model)};
 }
 if(siteModel==='gemini-4'||siteModel==='gemini-flash')return {scopeKey:'model:gemini-4-hydrogen',spec:SPEC_GM_HYDROGEN};
 if(siteModel==='deepseek-v4-pro')return {scopeKey:'tutor:deepseek-v4-pro',spec:SPEC_DS_PRO};
 if(siteModel==='deepseek-flash-think')return {scopeKey:'tutor:deepseek-flash-think',spec:SPEC_DS_FLASH_THINK};
 return {scopeKey:'tutor:deepseek-flash',spec:SPEC_DS_OFF};
}

// AI 评分模型与自定义配置对应的思考规格与作用域键。
export function getGradeThinkingSpec(gradeModel:string,custom?:{provider:string;model?:string}|null):{scopeKey:string;spec:ModelThinkingSpec}{
 if((gradeModel==='auto'||gradeModel==='custom')&&custom){
  const m=custom.model?.trim()||custom.provider;
  return {scopeKey:`custom:${custom.provider}/${m}`,spec:getCustomThinkingSpec(custom.provider,custom.model)};
 }
 if(gradeModel==='deepseek')return {scopeKey:'grade:deepseek-flash',spec:SPEC_DS_FLASH_THINK};
 return {scopeKey:'model:gemini-4-hydrogen',spec:SPEC_GM_HYDROGEN};
}

// 把任意请求挡位夹紧到某个规格允许的最接近挡位。
export function clampThinkingToSpec(level:ThinkingLevel,spec:ModelThinkingSpec):ConcreteThinkingLevel{
 if(level==='auto')return spec.defaultLevel;
 if(spec.levels.includes(level))return level;
 if(level==='max'&&spec.levels.includes('xhigh'))return 'xhigh';
 if(level==='xhigh'&&spec.levels.includes('max'))return 'max';
 if(level==='medium'){
  if(spec.levels.includes('high'))return 'high';
  if(spec.levels.includes('low'))return 'low';
 }
 const order:ConcreteThinkingLevel[]=['off','low','medium','high','xhigh','max'];
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
