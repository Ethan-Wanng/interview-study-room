export type AiProviderId='deepseek'|'openai'|'anthropic'|'gemini'|'qwen';

// 用户为自己的专属 API 设置的使用限制与配置（保存在服务端该登录用户名下，仅本人可用）。
export type UserAiSettings={
 enabled:boolean;           // 是否启用自己的专属 API（关闭则使用站点默认 DeepSeek）
 provider:AiProviderId;     // AI 提供商
 model:string;              // 模型名称
 hasKey:boolean;            // 是否已保存 API Key
 maskedKey:string;          // 脱敏显示的 Key（如 sk-0995****aeac）
 dailyLimit:number;         // 每日调用次数上限（0 表示不限，1..5000）
 maxTokens:number;          // 单次最大输出 Token 限制（256..8192）
 allowTutor:boolean;        // 允许用于「AI 老师问答 / 演练」
 allowGrade:boolean;        // 允许用于「主观题 AI 评分」
 usedToday:number;          // 今日已使用专属 API 的次数
};

// 服务端执行时使用的完整配置
export type RuntimeAiConfig={
 provider:AiProviderId;
 model?:string;
 apiKey?:string;
 maxTokens?:number;
 isCustom?:boolean;
};

export type AiProviderMeta={
 id:AiProviderId;
 name:string;
 nameEn:string;
 badge:string;
 defaultModel:string;
 models:string[];
 keyPlaceholder:string;
 keyHint:[string,string];
};

export const AI_PROVIDERS:AiProviderMeta[]=[
 {
  id:'deepseek',
  name:'DeepSeek',
  nameEn:'DeepSeek',
  badge:'DeepSeek',
  defaultModel:'deepseek-flash',
  models:['deepseek-flash','deepseek-v4-pro'],
  keyPlaceholder:'sk-...',
  keyHint:['填入 DeepSeek 开放平台的 API Key（platform.deepseek.com）','Enter your DeepSeek API key from platform.deepseek.com'],
 },
 {
  id:'openai',
  name:'OpenAI (ChatGPT)',
  nameEn:'OpenAI (ChatGPT)',
  badge:'OpenAI',
  defaultModel:'gpt-4o-mini',
  models:['gpt-4o-mini','gpt-4o','o3-mini'],
  keyPlaceholder:'sk-proj-...',
  keyHint:['填入 OpenAI 平台的 API Key（platform.openai.com）','Enter your OpenAI API key from platform.openai.com'],
 },
 {
  id:'anthropic',
  name:'Anthropic (Claude)',
  nameEn:'Anthropic (Claude)',
  badge:'Claude',
  defaultModel:'claude-sonnet-5-5',
  models:['claude-sonnet-5-5','claude-haiku-5-5','claude-opus-5-5'],
  keyPlaceholder:'sk-ant-...',
  keyHint:['填入 Anthropic Console 的 API Key（console.anthropic.com）','Enter your Anthropic API key from console.anthropic.com'],
 },
 {
  id:'gemini',
  name:'Google Gemini',
  nameEn:'Google Gemini',
  badge:'Gemini',
  defaultModel:'gemini-4-hydrogen',
  models:['gemini-4-hydrogen','gemini-3.8-flash','gemini-2.5-flash','gemini-2.5-pro'],
  keyPlaceholder:'AIzaSy...',
  keyHint:['填入 Google AI Studio 的 Gemini API Key（aistudio.google.com）','Enter your Gemini API key from aistudio.google.com'],
 },
 {
  id:'qwen',
  name:'阿里通义千问 (Qwen)',
  nameEn:'Alibaba Qwen',
  badge:'千问',
  defaultModel:'qwen-plus',
  models:['qwen-plus','qwen-turbo','qwen-max','qwen-coder-plus'],
  keyPlaceholder:'sk-...（阿里云百炼 DashScope Key）',
  keyHint:['填入阿里云百炼 DashScope 的 API Key（bailian.console.aliyun.com）','Enter your Alibaba Cloud DashScope API key'],
 },
];

export const DEFAULT_USER_AI_SETTINGS:UserAiSettings={
 enabled:false,
 provider:'deepseek',
 model:'deepseek-flash',
 hasKey:false,
 maskedKey:'',
 dailyLimit:50,
 maxTokens:2048,
 allowTutor:true,
 allowGrade:true,
 usedToday:0,
};

export function providerMeta(id?:string):AiProviderMeta{
 return AI_PROVIDERS.find(p=>p.id===id)??AI_PROVIDERS[0];
}

export function maskApiKey(key:string):string{
 const s=key.trim();
 if(!s)return '';
 if(s.length<=8)return s.slice(0,2)+'****';
 return s.slice(0,6)+'****'+s.slice(-4);
}

export const AI_CONFIG_EVENT='ai-provider-config-change';
export function notifyAiConfigChanged(){
 if(typeof window!=='undefined')window.dispatchEvent(new Event(AI_CONFIG_EVENT));
}
