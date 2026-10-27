// 已经做好动画的「面试」题 id（只是一份轻量名单，动画脚本本身按学科分包、按需加载）。
// Go：Runtime、底层原理、并发编程三个章节。
export const goAnimated=new Set([
 // Runtime
 'q-3fcd2ed322ebe27c','q-333f00e6d884d3f8','q-defad805e1383e94','q-47c68700a4e49401','q-b1c743761d552ac8','q-3ff9ea5bb93469b8','q-d41a25b004023e30',
 'q-9799fca0cc7b0d43','q-a2ed53373aac9bdd','q-320610842e622d30','q-c1b29358f7aa962f','q-cba90ec136457684','q-ee5d553586716d4b',
 // 底层原理
 'q-79fc8e4df94b1c8e','q-4ea932dd887287be','q-cdae0785b6563bf0','q-871d1d61cf54d76d','q-bad4e305aeacacde','q-52752c7219520e33','q-b69ba4003ff7b624',
 'q-1ce6cbb60fc0bad0','q-2df1131ab7d03ee5','q-83f6a75a931c18df','q-f9fb9ff3b253228d','q-17c3228b5c6651ff','q-b0c8a6a536495579','q-f637e69141a11784',
 'q-b636b1393a3a8dd4','q-0d755e9ed1b2889c','q-6748940acd480401','q-b5082c04a1ba8f9f','q-e1c5a6d1929e59e4','q-70a9b74ab21752dd','q-4553c1bda7201981',
 'q-7c836d025b71239b','q-3d511cfd7f584e24',
 // 并发编程
 'q-5b3d5534d66afe9e','q-c64065110f9663bf','q-d20ac209ee708302','q-fd0565d8def739be','q-2ade0ebaffc554bf','q-5596568ae9dcf0f1','q-f6ed8f3b8422ead0',
 'q-72b0b65f69db06ce','q-2eef6284fec88f56','q-eee62e3325e927d9','q-e55940cf9777073a','q-7aea80bce665a043','q-a4de343a97be6640','q-c7b9c710162ce3e3',
 'q-e462fc9949aeed83','q-5d35537eb1d002b0','q-663d42e7c0e290fb','q-f6132d872e9784ca','q-c9ec292e716d6fa3','q-81c523006197611b','q-05b541b03bf3f929',
]);
// 数据库与缓存：全部章节（MySQL、Redis、Elasticsearch）。
export const dbAnimated=new Set([
 'q-29a390724db3a232','q-b724a77c6e49ca6e','q-f53de83dacee392c','q-c7990f6d0727e5c2','q-51bd3b77aa3fb0b1','q-c67968a5590c5998','q-f9273f73300969a5',
 'q-fb57f5db74209f3d','q-688f9f1b3801c7e8','q-15fd859316b9b092','q-f1cc3f9a2d2ad8cc','q-cd952018025fce71','q-f6c633e90a335b42','q-bccf2c6308af43a2',
 'q-d4f5f1dfd78847c4','q-b6915aa2e0ed5bfb','q-748dcff591550a41','q-fcb3818197d74840','q-4e7895e6f2331baa','q-eeb2b187b632bc0c','q-38fbf93f4a3999f5',
 'q-6eddf08403456b92','q-30e09e7fac732f1d','q-f040a7419f630ff3','q-3338596b521f2957','q-e5b8e628fbdb3be0','q-69f69b18e3ca037a','q-5380e13be164d77c',
 'q-f0bec2c563e570d6','q-eb490c6677302d5f','q-673bae355c0f16fd','q-efbd531288490262','q-baae548966245f03','q-5f578456bdbb0143','q-93e8dfebc307c185',
 'q-117d2cac6f786ddb','q-f6cf502061f92bbc','q-50f13c1c6dc21a1d','q-583f8519476cc645','q-f2a89c6060d800c7','q-fe61f34b684b17a6','q-dc8f488334ac56de',
 'q-34abf51f2155f612','q-ce12f5e3bd470427','q-e852cae670f60f1e','q-ef1273fe7017c2a6','q-df91f29d9c73e36c','q-255ea12bba3109d1',
]);
// 一道题的动画在哪个分包里：ai / go / db；没有动画返回 null。
export const animationGroup=(id:string):'ai'|'go'|'db'|null=>id.startsWith('ai-q-')?'ai':goAnimated.has(id)?'go':dbAnimated.has(id)?'db':null;
export const hasInterviewAnimation=(id:string)=>animationGroup(id)!==null;
