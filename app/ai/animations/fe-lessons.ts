// 前端开发动画课堂：每个学习关卡一个故事动画。
import {storyAnimation,type LessonStory} from './story';
import {feLessonsA} from './fe-lessons-a';
import {feLessonsB} from './fe-lessons-b';

export const frontendLessonStories:LessonStory[]=[...feLessonsA,...feLessonsB];
export const frontendAnimations=frontendLessonStories.map(storyAnimation);
