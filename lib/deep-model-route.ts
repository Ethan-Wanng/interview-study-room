import { prepareCustomAi } from '@/db/ai-config';
import type { RuntimeAiConfig } from '@/lib/ai-config';
import { AuthError } from '@/lib/site-auth';
import { consumeSiteAiQuota } from '@/lib/site-ai-quota';
import { parseThinkingLevel, type ThinkingLevel } from '@/lib/thinking';
import type { AiTokenUsage } from '@/lib/jd-research-types';

const DEEP_SITE_MODELS = new Set(['deepseek-flash', 'deepseek-flash-think', 'deepseek-v4-pro']);

/** Normalize client-supplied model selector to a server deep-model key. */
export function parseRequestedDeepModel(raw: unknown): string {
 const m = typeof raw === 'string' ? raw.trim() : '';
 if (m === 'custom') return 'custom';
 if (m === 'deepseek') return 'deepseek-flash-think';
 if (DEEP_SITE_MODELS.has(m)) return m;
 return 'auto';
}

/** Resolve a readable initial model label for deep AI status indicators. */
export function resolveDeepModelLabel(model: string, custom?: RuntimeAiConfig): string {
 if (model === 'custom' && custom) return `${custom.provider}/${custom.model || custom.provider}`;
 if (model === 'deepseek-v4-pro') return 'DeepSeek V4 Pro';
 if (model === 'deepseek-flash') return 'DeepSeek V4.1 Flash';
 return 'DeepSeek V4.1 Flash（深度思考）';
}

/** Resolve active custom API or site DeepSeek quota & thinking settings for deep AI routes. */
export async function prepareDeepModelExecution(
 req: Request,
 user: { id: string; is_guest: number },
 rawModel: unknown,
 rawThinkingLevel: unknown,
 opts?: { chargeSiteQuota?: boolean },
): Promise<{
 model: string;
 displayLabel: string;
 thinkingLevel: ThinkingLevel;
 custom?: RuntimeAiConfig;
 refund: () => Promise<void>;
}> {
 const requested = parseRequestedDeepModel(rawModel);
 const thinkingLevel = parseThinkingLevel(rawThinkingLevel);

 if (!user.is_guest && (requested === 'custom' || requested === 'auto')) {
  const customRes = await prepareCustomAi(user.id, 'tutor');
  if (customRes.mode === 'blocked' && requested === 'custom') {
   throw new AuthError(customRes.message, 429);
  }
  if (customRes.mode === 'custom') {
   return {
    model: 'custom',
    displayLabel: resolveDeepModelLabel('custom', customRes.config),
    thinkingLevel,
    custom: customRes.config,
    refund: customRes.refund,
   };
  }
  if (requested === 'custom') {
   throw new AuthError('请先在「AI 设置」中配置并启用专属 API，或切换到站内模型。', 400);
  }
 }

 const siteModel = requested === 'auto' ? 'deepseek-flash-think' : requested;
 if (opts?.chargeSiteQuota !== false) {
  const siteQ = await consumeSiteAiQuota(req, user, 'deepseek');
  if (!siteQ.ok) throw new AuthError(siteQ.message, siteQ.status);
  return {
   model: siteModel,
   displayLabel: resolveDeepModelLabel(siteModel),
   thinkingLevel,
   refund: siteQ.refund,
  };
 }

 return {
  model: siteModel,
  displayLabel: resolveDeepModelLabel(siteModel),
  thinkingLevel,
  refund: async () => {},
 };
}

/** Sum two optional token usage objects. */
export function combineTokenUsage(a?: AiTokenUsage, b?: AiTokenUsage): AiTokenUsage | undefined {
 if (!a && !b) return undefined;
 return {
  totalTokens: (a?.totalTokens || 0) + (b?.totalTokens || 0),
  inputTokens: (a?.inputTokens || 0) + (b?.inputTokens || 0),
  cachedTokens: (a?.cachedTokens || 0) + (b?.cachedTokens || 0),
  outputTokens: (a?.outputTokens || 0) + (b?.outputTokens || 0),
  thoughtTokens: (a?.thoughtTokens || 0) + (b?.thoughtTokens || 0),
 };
}
