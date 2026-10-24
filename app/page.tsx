import {redirect} from 'next/navigation';
// 首页默认进入「学习」；面试题背诵在 /interview。
export default function Home(){redirect('/learn')}
