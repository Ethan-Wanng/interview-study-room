import type {Paper} from './types';

// 试卷按需加载，键是对应考试的 id（如 go-exam-1、go-final），进入考试时才下载这一份。
export const paperLoaders:Record<string,()=>Promise<Paper>>={
 'go-exam-1':()=>import('./go-exam-1').then(m=>m.goExam1),
 'go-exam-2':()=>import('./go-exam-2').then(m=>m.goExam2),
 'go-final':()=>import('./go-final').then(m=>m.goFinal),
 'ai-exam-1':()=>import('./ai-exam-1').then(m=>m.aiExam1),
 'ai-exam-2':()=>import('./ai-exam-2').then(m=>m.aiExam2),
 'ai-final':()=>import('./ai-final').then(m=>m.aiFinal),
 'be-exam-1':()=>import('./be-exam-1').then(m=>m.beExam1),
 'be-exam-2':()=>import('./be-exam-2').then(m=>m.beExam2),
 'be-final':()=>import('./be-final').then(m=>m.beFinal),
 'fe-exam-1':()=>import('./fe-exam-1').then(m=>m.feExam1),
 'fe-exam-2':()=>import('./fe-exam-2').then(m=>m.feExam2),
 'fe-final':()=>import('./fe-final').then(m=>m.feFinal),
 'rust-exam-1':()=>import('./rust-exam-1').then(m=>m.rustExam1),
 'rust-exam-2':()=>import('./rust-exam-2').then(m=>m.rustExam2),
 'rust-final':()=>import('./rust-final').then(m=>m.rustFinal),
 'python-exam-1':()=>import('./python-exam-1').then(m=>m.pythonExam1),
 'python-exam-2':()=>import('./python-exam-2').then(m=>m.pythonExam2),
 'python-final':()=>import('./python-final').then(m=>m.pythonFinal),
};
export const hasPaper=(examId:string)=>examId in paperLoaders;
