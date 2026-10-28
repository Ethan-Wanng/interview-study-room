// 后端通用动画课堂：每个学习关卡一个故事动画。
import {storyAnimation,type LessonStory} from './story';
import {beLessonsA} from './be-lessons-a';
import {beLessonsB} from './be-lessons-b';
import {beLessonsC} from './be-lessons-c';
import {beLessonsD} from './be-lessons-d';
import {backendLevelOrder} from '@/content/backend-journey';

// 按关卡顺序排列，动画课堂里从小白关卡开始。
const byLevel=(s:LessonStory)=>backendLevelOrder.indexOf(s.level);
export const backendLessonStories:LessonStory[]=[...beLessonsA,...beLessonsB,...beLessonsC,...beLessonsD].sort((a,b)=>byLevel(a)-byLevel(b));
export const backendAnimations=backendLessonStories.map(storyAnimation);
