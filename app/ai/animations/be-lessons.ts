// 后端通用动画课堂：每个学习关卡一个故事动画。
import {storyAnimation,type LessonStory} from './story';
import {beLessonsA} from './be-lessons-a';
import {beLessonsB} from './be-lessons-b';

export const backendLessonStories:LessonStory[]=[...beLessonsA,...beLessonsB];
export const backendAnimations=backendLessonStories.map(storyAnimation);
