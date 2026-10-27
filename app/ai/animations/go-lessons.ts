// Go 动画课堂：每个学习关卡一个故事动画（入门、进阶为 basic，高阶、专家为 advanced）。
import {storyAnimation} from './story';
import {goLessonsA} from './go-lessons-a';
import {goLessonsB} from './go-lessons-b';

export const goLessonStories=[...goLessonsA,...goLessonsB];
export const goAnimations=goLessonStories.map(storyAnimation);
