import type {PracticeQuestion} from './practice';
type Translation=Pick<PracticeQuestion,'prompt'|'answer'|'explanation'> & {options?:string[];rubric?:string[]};
// 内置练习题已下线，英文翻译随之清空；原文见 tests/fixtures/practice-bank.en.ts。
export const practiceEnglish:Record<string,Translation>={};
