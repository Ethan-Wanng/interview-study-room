import { assertSameOrigin, AuthError, sessionUser } from '@/lib/site-auth';
import { studyCatalog } from '@/db/catalog';
import { searchForTutor } from '@/lib/site-search';
import { shouldSearchTutorLinks } from '@/lib/ai-prompts';
import {
 TUTOR_LIMITS,
 type TutorContext,
 type TutorLesson,
 type TutorMessage,
 type TutorPlayground,
 type TutorQuiz,
} from '@/lib/tutor-types';

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store' };
const str = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;

function lessonOf(v: unknown): TutorLesson | null {
 if (!v || typeof v !== 'object') return null;
 const o = v as Record<string, unknown>;
 if (!str(o.title, 200) || !str(o.body, TUTOR_LIMITS.lesson) || !Array.isArray(o.steps) || o.steps.length > 20 || !o.steps.every(s => str(s, 1000))) {
  return null;
 }
 if ((o.code !== undefined && !str(o.code, TUTOR_LIMITS.lesson)) || (o.expect !== undefined && !str(o.expect, 4000)) || (o.solution !== undefined && !str(o.solution, TUTOR_LIMITS.lesson))) {
  return null;
 }
 return {
  title: o.title as string,
  body: o.body as string,
  steps: o.steps as string[],
  code: o.code as string | undefined,
  expect: o.expect as string | undefined,
  solution: o.solution as string | undefined,
 };
}

function quizOf(v: unknown): TutorQuiz | null {
 if (!v || typeof v !== 'object') return null;
 const o = v as Record<string, unknown>;
 if (!str(o.type, 20) || !str(o.q, 4000) || !str(o.answer, 12000) || !str(o.explain, 6000)) return null;
 if ((o.code !== undefined && !str(o.code, 6000)) || (o.given !== undefined && !str(o.given, 8000)) || (o.correct !== undefined && typeof o.correct !== 'boolean')) {
  return null;
 }
 if (o.options !== undefined && (!Array.isArray(o.options) || o.options.length > 8 || !o.options.every(x => str(x, 600)))) return null;
 return {
  type: o.type as string,
  q: o.q as string,
  code: o.code as string | undefined,
  options: o.options as string[] | undefined,
  answer: o.answer as string,
  explain: o.explain as string,
  given: o.given as string | undefined,
  correct: o.correct as boolean | undefined,
 };
}

function playgroundOf(v: unknown): TutorPlayground | null {
 if (!v || typeof v !== 'object') return null;
 const o = v as Record<string, unknown>;
 if (!str(o.lang, 40) || !str(o.code, 50_000)) return null;
 if ((o.output !== undefined && !str(o.output, 12_000)) || (o.error !== undefined && !str(o.error, 12_000))) return null;
 return {
  lang: o.lang as string,
  code: o.code as string,
  output: o.output as string | undefined,
  error: o.error as string | undefined,
 };
}

function contextOf(v: unknown): TutorContext | null {
 if (!v || typeof v !== 'object') return null;
 const o = v as Record<string, unknown>;
 if (o.kind === 'practice' || o.kind === 'lesson' || o.kind === 'task' || o.kind === 'support') {
  const lesson = lessonOf(o.lesson);
  return lesson && { kind: o.kind, lesson };
 }
 if (o.kind === 'hint' || o.kind === 'explain' || o.kind === 'recite') {
  const quiz = quizOf(o.quiz);
  return quiz && { kind: o.kind, quiz };
 }
 if (o.kind === 'playground') {
  const playground = playgroundOf(o.playground);
  return playground && { kind: 'playground', playground };
 }
 if (o.kind === 'site') return str(o.page, 300) ? { kind: 'site', page: o.page as string } : null;
 return null;
}

function parseInput(body: unknown): { context: TutorContext; messages: TutorMessage[] } | null {
 if (!body || typeof body !== 'object') return null;
 const { context: c, messages: m } = body as Record<string, unknown>;
 const context = contextOf(c);
 if (!context || !Array.isArray(m) || !m.length || m.length > TUTOR_LIMITS.messages) return null;
 const messages = m.map(x => (x && typeof x === 'object' ? (x as Record<string, unknown>) : {}));
 const valid = messages.every(
  x => (x.role === 'user' || x.role === 'model') && typeof x.text === 'string' && x.text.length <= TUTOR_LIMITS.text,
 );
 if (!valid) return null;
 return {
  context,
  messages: messages.map(x => ({
   role: x.role as TutorMessage['role'],
   text: x.text as string,
  })),
 };
}

export async function POST(req: Request) {
 try {
  assertSameOrigin(req);
  const user = await sessionUser(req.headers);
  if (!user) {
   return Response.json({ error: 'auth', message: '请重新登录网站。' }, { status: 401, headers: noCache });
  }
  let body: unknown;
  try {
   body = JSON.parse(await req.text());
  } catch {
   return Response.json({ error: 'invalid', message: '请求内容无效。' }, { status: 400, headers: noCache });
  }
  const input = parseInput(body);
  if (!input) {
   return Response.json({ error: 'invalid', message: '请求内容无效。' }, { status: 400, headers: noCache });
  }
  if (!shouldSearchTutorLinks(input.context, input.messages)) {
   return Response.json({ links: '' }, { headers: noCache });
  }

  const last = input.messages[input.messages.length - 1]?.text ?? '';
  let links = '';
  try {
   const bank = await studyCatalog().then(b => b.questions).catch(() => []);
   const prev = input.messages.filter(m => m.role === 'user').slice(-2, -1)[0]?.text ?? '';
   links = searchForTutor(last, bank) || (prev ? searchForTutor(prev + ' ' + last, bank) : '');
  } catch {
   links = '';
  }
  return Response.json({ links }, { headers: noCache });
 } catch (e) {
  if (e instanceof AuthError) {
   return Response.json({ error: 'auth', message: e.message }, { status: e.status, headers: noCache });
  }
  return Response.json({ links: '' }, { headers: noCache });
 }
}
