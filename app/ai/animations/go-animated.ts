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
// 后端通用的其他章节：微服务、设计模式与算法、Linux/操作系统/网络、项目。由 scripts/sync-animated-ids.mjs 生成，不要手改。
export const beAnimated=new Set<string>([
 // @generated-be-start
 'q-2e484a0c5a039b1a','q-669b0d23e22f2dcb','q-ebaa8dd0a05023df','q-6a1455420566ee2f','q-04ce9a49b93dbe18','q-2d67e0ad5ef2d569','q-46d4c04882c43212',
 'q-e5ca6c952345f596','q-5965ea1a549e9829','q-65908ecd4d784c67','q-b13c09da3854131b','q-0adefd5c99137f6a','q-10fca5eeb2dea1df','q-25b0b292f35ec07f',
 'q-6eab38b038a5a8b0','q-4bb9271918ffa37c','q-57fb9e7af5c408c6','q-dbb76e7d3cfdb787','q-d0eb3a11efa1228e','q-7934b553b7e39e8d','q-38541cc7f4c6e66a',
 'q-0385c889a7b8ea8e','q-d7c77c0dfce33a1a','q-b653f56b58554795','q-faeefd41b5278301','q-d8f795112d612596','q-ed48de08e02103b9','q-5601d4e91be3e0b5',
 'q-8eed302c69b3eb2e','q-cd319686c5f3c235','q-c90bd2a4838c6555','q-e994dda5397d9993','q-42228e55cc58156f','q-08815d2a347da9a6','q-41b371208c8a2b18',
 'q-c7bff07bdc346cf3','q-b8e7fa67643486dd','q-dd0a574cb5397142','q-467a0dc0db3571c5','q-cb0c4508f2549bbd','q-3d7048a20ee437b3','q-6cfed07bfb92e432',
 'q-8fcc9f406b2f5246','q-95b656f5b11cb77f','q-b47c07d071d43bf2','q-45ddd805046a1bb9','q-edec811e0206d842','q-669134ea42957fa7','q-101b88ee52b7f990',
 'q-cfbeeb3c8e1b795c','q-0fc17c67c73985e3','q-7e9b9c3a30161c07','q-a05df95decf82b88','q-f63a9898d9719658','q-3679d212a21d6fd0','q-cb838566450dfa2f',
 'q-338e4cf75022dc37','q-7fe202eb59a13335','q-4682e872ed62f6cb','q-d6725d35240da255','q-48b7e0cab640bde1','q-fc7ea79fe2b6761b','q-4c426a32d66c1d34',
 'q-e50ed379a12e63dd','q-e6c72f010b0cee81','q-79e3ddc50f8c1d3d','q-c9408c92e3b633e8','q-cab215c3ebd54bc6','q-d4f4d2117fb88f36','q-fdd9d1567fb96ff8',
 'q-9b6c6aae2bfba860','q-81119323c2239050','q-051a5cf2e2d57304','q-809c5b34d0dfaf47','q-fbd8a4dce2890044','q-f46b7545e229dd20','q-a8b7c63e068c6143',
 'q-8651521ae8627b69','q-64d6c9192640528c','q-81c178be884a95ad','q-d52b9b98efc875aa','q-8fc0261d8b859786','q-31ed7ebd242ddb79','q-064ae81801a23ffa',
 'q-eedf93d3b0d049a4','q-076449b355ef6734','q-4e7ba0cd44f8f0c2','q-94fc03cdda96b367','q-b515960b47d0fb77','q-5507ee2fe6c6f2a9','q-a8f1e56596cf95da',
 'q-ebbd68878265c297','q-f5db80a74a10c0eb','q-945fd8838f586e85','q-d17fdfcf3be09b46','q-785843ed24adfb0e','q-20647881755f1bcc','q-775f4016dac8d309',
 'q-c68cdee90c65dfe4','q-abf6ed0c4ad00169','q-adac1ec35e7f941e','q-e589589dbad27964','q-d1acf4f9a611ff20','q-3815bab197131d92','q-c2e4202d9e1de1d3',
 'q-120d31b841b7fb71','q-57c6a0543894c09a','q-d9be8db39304efb7','q-bcb204b094576be8','q-c27a84be9ecfdf3e','q-79ca7d2d3eb09607','q-91a8f84073b3f1fe',
 'q-c6f65211e594ea8c','q-2c9515ac92903960','q-4d79d9e36de19dab','q-1ff0f10ea03551b5','q-4c5f1e650374e6f3','q-08fb60683f76a0f5','q-7eaa08c3883d24fd',
 'q-9cafb41f379b66d3','q-266a817d33c39176','q-5e4b02fba660c3d1','q-e48ceda1aa7e7e69','q-2e7aa8f204997b7d','q-739c25e2560d6269','q-ea946e5279f32359',
 'q-d3b1f758513041ee','q-a78e03291e96f652','q-98fad1e1370931ad','q-688fc3aa9df825fa','q-712d081146d2d5cd','q-bae3ef9bd253e77c','q-7314d29f4c8ca639',
 'q-7effdfe28efadfc5','q-a5f621cc1a466d2b','q-7138fcef812a175d','q-86c77d0e210b4bb1','q-d8a0de319df7b53f','q-e515334b28bfcf33','q-bb52f073482e6b98',
 'q-d3c8669e41992c81','q-89147ac59229e9fa','q-520bd2250793bc5e','q-0b3b2ad9786d85b5','q-06d4d7964ebf2ecc',
 // @generated-be-end
]);
// 一道题的动画在哪个分包里：ai / go / db / be；没有动画返回 null。
export const animationGroup=(id:string):'ai'|'go'|'db'|'be'|null=>id.startsWith('ai-q-')?'ai':goAnimated.has(id)?'go':dbAnimated.has(id)?'db':beAnimated.has(id)?'be':null;
export const hasInterviewAnimation=(id:string)=>animationGroup(id)!==null;
