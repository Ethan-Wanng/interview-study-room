// 轻量 TypeScript 类型剥离器（用于浏览器 Web Worker 沙盒直接执行 JS/TS 代码）：
// 完整保留字符串、模板字符串、正则、注释与行号，剥离接口、类型别名、泛型、参数/返回/变量/类字段类型注解、
// as/satisfies 断言、非空断言 !、import/export type、以及 constructor 参数属性（自动转为 this.x = x）。

type TokKind='ws'|'nl'|'comment'|'string'|'tpl_head'|'tpl_mid'|'tpl_tail'|'tpl_full'|'regex'|'ident'|'number'|'punct';
type Tok={kind:TokKind;text:string};

const KEYWORDS_BEFORE_REGEX=new Set([
 'return','throw','case','delete','void','typeof','yield','await','new','in','of','instanceof','else','do',
]);
const VALUE_PREV_NO_REGEX=new Set(['ident','number','string','tpl_full','tpl_tail']);

function canStartRegex(prev:Tok|undefined):boolean{
 if(!prev)return true;
 if(prev.kind==='ident')return KEYWORDS_BEFORE_REGEX.has(prev.text);
 if(VALUE_PREV_NO_REGEX.has(prev.kind))return false;
 if(prev.kind==='punct'){
  if([')',']','}','++','--'].includes(prev.text))return false;
  return true;
 }
 return true;
}

function tokenize(src:string):Tok[]{
 const out:Tok[]=[];
 const n=src.length;
 let i=0;
 let lastSig:Tok|undefined;
 const tplBraces:number[]=[];

 const push=(kind:TokKind,text:string)=>{
  const t:Tok={kind,text};
  out.push(t);
  if(kind!=='ws'&&kind!=='nl'&&kind!=='comment')lastSig=t;
 };

 const readTemplate=(startIdx:number,fromBrace:boolean)=>{
  let j=startIdx+1;
  while(j<n){
   const ch=src[j];
   if(ch==='\\'){j+=2;continue}
   if(ch==='`'){
    push(fromBrace?'tpl_tail':'tpl_full',src.slice(startIdx,j+1));
    return j+1;
   }
   if(ch==='$'&&src[j+1]==='{'){
    push(fromBrace?'tpl_mid':'tpl_head',src.slice(startIdx,j+2));
    tplBraces.push(1);
    return j+2;
   }
   j++;
  }
  push(fromBrace?'tpl_tail':'tpl_full',src.slice(startIdx));
  return n;
 };

 while(i<n){
  const ch=src[i];
  if(ch==='\n'){push('nl','\n');i++;continue}
  if(ch==='\r'){
   if(src[i+1]==='\n'){push('nl','\r\n');i+=2}else{push('nl','\r');i++}
   continue;
  }
  if(ch===' '||ch==='\t'){
   let j=i+1;while(j<n&&(src[j]===' '||src[j]==='\t'))j++;
   push('ws',src.slice(i,j));i=j;continue;
  }
  if(ch==='/'&&src[i+1]==='/'){
   let j=i+2;while(j<n&&src[j]!=='\n'&&src[j]!=='\r')j++;
   push('comment',src.slice(i,j));i=j;continue;
  }
  if(ch==='/'&&src[i+1]==='*'){
   let j=i+2;while(j<n&&!(src[j]==='*'&&src[j+1]==='/'))j++;
   j=Math.min(n,j+2);
   push('comment',src.slice(i,j));i=j;continue;
  }
  if(ch==="'"||ch==='"'){
   let j=i+1;
   while(j<n){
    if(src[j]==='\\'){j+=2;continue}
    if(src[j]===ch){j++;break}
    if(src[j]==='\n')break;
    j++;
   }
   push('string',src.slice(i,j));i=j;continue;
  }
  if(ch==='`'){
   i=readTemplate(i,false);continue;
  }
  if(ch==='}'&&tplBraces.length&&tplBraces[tplBraces.length-1]===1){
   tplBraces.pop();
   i=readTemplate(i,true);continue;
  }
  if(ch==='{'&&tplBraces.length){
   tplBraces[tplBraces.length-1]++;
  }else if(ch==='}'&&tplBraces.length){
   tplBraces[tplBraces.length-1]--;
  }
  if(ch==='/'&&canStartRegex(lastSig)){
   let j=i+1,inClass=false;
   while(j<n){
    const c=src[j];
    if(c==='\\'){j+=2;continue}
    if(c==='[')inClass=true;
    else if(c===']')inClass=false;
    else if(c==='/'&&!inClass){j++;break}
    else if(c==='\n')break;
    j++;
   }
   while(j<n&&/[a-z]/i.test(src[j]))j++;
   push('regex',src.slice(i,j));i=j;continue;
  }
  if(/[A-Za-z_$]/.test(ch)){
   let j=i+1;while(j<n&&/[A-Za-z0-9_$]/.test(src[j]))j++;
   push('ident',src.slice(i,j));i=j;continue;
  }
  if(/[0-9]/.test(ch)||(ch==='.'&&/[0-9]/.test(src[i+1]??''))){
   let j=i+1;while(j<n&&/[0-9A-Za-z_.xobn]/i.test(src[j]))j++;
   push('number',src.slice(i,j));i=j;continue;
  }
  const three=src.slice(i,i+3),two=src.slice(i,i+2);
  if(['===','!==','>>>','...','**=','&&=','||=','??=','<<=','>>='].includes(three)){
   push('punct',three);i+=3;continue;
  }
  if(['=>','?.','??','==','!=','<=','>=','&&','||','++','--','**','<<','>>','+=','-=','*=','/=','%=','&=','|=','^='].includes(two)){
   push('punct',two);i+=2;continue;
  }
  push('punct',ch);i++;
 }
 return out;
}

const isTrivia=(t:Tok)=>t.kind==='ws'||t.kind==='nl'||t.kind==='comment';
const blankText=(s:string)=>s.replace(/[^\r\n]/g,'');

export function stripTypeScript(src:string):string{
 const toks=tokenize(src);
 const out=toks.map(t=>t.text);

 const nextSig=(idx:number)=>{
  let k=idx+1;
  while(k<toks.length&&isTrivia(toks[k]))k++;
  return k<toks.length?k:-1;
 };
 const prevSig=(idx:number)=>{
  let k=idx-1;
  while(k>=0&&isTrivia(toks[k]))k--;
  return k;
 };
 const blank=(i:number)=>{out[i]=blankText(out[i])};
 const blankRange=(a:number,b:number)=>{for(let k=a;k<=b;k++)blank(k)};

 // 辅助：从开括号（(, [, {, <）跳到对应的闭括号
 const matchParen=(openIdx:number,openCh:string,closeCh:string):number=>{
  let depth=0;
  for(let k=openIdx;k<toks.length;k++){
   const t=toks[k];
   if(isTrivia(t)||t.kind==='string'||t.kind==='comment')continue;
   if(t.kind==='punct'){
    if(t.text===openCh)depth++;
    else if(t.text===closeCh){depth--;if(depth===0)return k}
   }
  }
  return -1;
 };

 // 判断 idx 处的 `<` 是否可能是泛型参数列表（如 `foo<T>(...)` / `<T>(x: T) =>` / `class Foo<T>`）
 const matchGeneric=(ltIdx:number):number=>{
  if(toks[ltIdx]?.kind!=='punct'||toks[ltIdx].text!=='<')return -1;
  let angle=0,paren=0,brace=0,bracket=0;
  for(let k=ltIdx;k<toks.length;k++){
   const t=toks[k];
   if(isTrivia(t)||t.kind==='string'||t.kind==='comment')continue;
   if(t.kind==='ident'&&['return','throw','if','for','while','switch','var','let','const','function'].includes(t.text)&&brace===0)return -1;
   if(t.kind==='punct'){
    if(['&&','||','===','!==','==','!=',';','++','--','+=','-='].includes(t.text)&&brace===0)return -1;
    if(t.text==='(')paren++;
    else if(t.text===')'){if(paren===0)return -1;paren--}
    else if(t.text==='{')brace++;
    else if(t.text==='}'){if(brace===0)return -1;brace--}
    else if(t.text==='[')bracket++;
    else if(t.text===']'){if(bracket===0)return -1;bracket--}
    else if(t.text==='<'&&paren===0&&brace===0&&bracket===0)angle++;
    else if(t.text==='>'&&paren===0&&brace===0&&bracket===0){
     angle--;
     if(angle===0)return k;
    }else if(t.text==='>>'&&paren===0&&brace===0&&bracket===0){
     if(angle<=2){
      if(angle===2)return k;
      return -1;
     }
     angle-=2;
    }
   }
  }
  return -1;
 };

 // 判断 `:` 后一段类型表达式在哪里结束（遇到 stopTokens 中之一，且括号深度归零）
 const scanTypeEnd=(afterColonIdx:number,stopAt:Set<string>,stopOnNl=false):number=>{
  let paren=0,brace=0,bracket=0,angle=0;
  let lastTypeTok=afterColonIdx;
  for(let k=afterColonIdx;k<toks.length;k++){
   const t=toks[k];
   if(t.kind==='nl'){
    if(stopOnNl&&paren===0&&brace===0&&bracket===0&&angle===0){
     const ns=nextSig(k);
     if(ns<0||(toks[ns].text!=='|'&&toks[ns].text!=='&'))return lastTypeTok;
    }
    continue;
   }
   if(t.kind==='ws'||t.kind==='comment')continue;
   if(paren===0&&brace===0&&bracket===0&&angle===0){
    if(t.kind==='punct'&&stopAt.has(t.text))return lastTypeTok;
    if(t.kind==='ident'&&(stopAt.has(t.text)))return lastTypeTok;
    if(t.kind==='punct'&&t.text==='{'&&stopAt.has('{_BODY}')){
     // `{ ... }` 可能是对象返回类型，也可能是函数体：若闭合 `}` 后面跟 `{`、`=>`、`|`、`&` 则是类型
     const close=matchParen(k,'{','}');
     if(close>=0){
      const after=nextSig(close);
      if(after>=0&&(toks[after].text==='{'||toks[after].text==='=>'||toks[after].text==='|'||toks[after].text==='&')){
       k=close;lastTypeTok=close;continue;
      }
     }
     return lastTypeTok;
    }
   }
   if(t.kind==='punct'){
    if(t.text==='(')paren++;
    else if(t.text===')'){if(paren===0)return lastTypeTok;paren--}
    else if(t.text==='{')brace++;
    else if(t.text==='}'){if(brace===0)return lastTypeTok;brace--}
    else if(t.text==='[')bracket++;
    else if(t.text===']'){if(bracket===0)return lastTypeTok;bracket--}
    else if(t.text==='<'&&paren===0&&brace===0&&bracket===0)angle++;
    else if(t.text==='>'&&paren===0&&brace===0&&bracket===0&&angle>0)angle--;
    else if(t.text==='>>'&&paren===0&&brace===0&&bracket===0&&angle>=2)angle-=2;
   }
   lastTypeTok=k;
  }
  return lastTypeTok;
 };

 // 判断 `(` 是否为函数/方法/箭头函数的参数列表
 const isParamParen=(openIdx:number,closeIdx:number):{isParam:boolean;isConstructor:boolean;isArrow:boolean}=>{
  const after=nextSig(closeIdx);
  let prev=prevSig(openIdx);
  // 若 `(` 前面紧跟着泛型 `<...>`（如 `function memoize<T>(...)`），回退跳过 `<...>`
  if(prev>=0&&(toks[prev].text==='>'||toks[prev].text==='>>')){
   let ang=0,par=0,bra=0,brc=0;
   for(let k=prev;k>=0;k--){
    const tk=toks[k];
    if(isTrivia(tk)||tk.kind==='string')continue;
    if(tk.text===')')par++;else if(tk.text==='('){if(par===0)break;par--}
    else if(tk.text===']')bra++;else if(tk.text==='['){if(bra===0)break;bra--}
    else if(tk.text==='}')brc++;else if(tk.text==='{'){if(brc===0)break;brc--}
    else if(par===0&&bra===0&&brc===0){
     if(tk.text==='>')ang++;
     else if(tk.text==='>>')ang+=2;
     else if(tk.text==='<'){ang--;if(ang<=0){prev=prevSig(k);break}}
    }
   }
  }
  if(prev>=0&&toks[prev].kind==='ident'&&toks[prev].text==='catch')return {isParam:true,isConstructor:false,isArrow:false};
  const prev2=prev>=0?prevSig(prev):-1;
  const isNamedDecl=(prev>=0&&toks[prev].text==='constructor')
   ||(prev>=0&&(toks[prev].text==='function'||toks[prev].text==='*'))
   ||(prev2>=0&&(toks[prev2].text==='function'||(toks[prev2].text==='*'&&toks[prevSig(prev2)]?.text==='function')));
  const isMethodDecl=prev>=0&&toks[prev].kind==='ident'&&!['if','for','while','switch','with','return','throw','await','typeof','void'].includes(toks[prev].text)
   &&(prev2<0||['{','}',';','async','static','public','private','protected','override','get','set'].includes(toks[prev2].text)||toks[prev2].kind==='nl');
  if(after>=0){
   const at=toks[after];
   if(at.text==='=>')return {isParam:true,isConstructor:false,isArrow:true};
   if(at.text===':'){
    // 检查 `: ReturnType` 后面是不是 `=>` 或 `{`
    const isDecl=isNamedDecl||isMethodDecl;
    const retEnd=scanTypeEnd(after+1,isDecl?new Set(['{_BODY}','=',';',')','}']):new Set(['=>','{_BODY}','=',';',',',')','}']),true);
    const afterRet=nextSig(retEnd);
    if(afterRet>=0&&(toks[afterRet].text==='=>'||toks[afterRet].text==='{')){
     const isCtor=prev>=0&&toks[prev].text==='constructor';
     return {isParam:true,isConstructor:isCtor,isArrow:toks[afterRet].text==='=>'};
    }
   }
   if(at.text==='{'){
    if(prev>=0&&toks[prev].text==='constructor')return {isParam:true,isConstructor:true,isArrow:false};
    if(isNamedDecl||isMethodDecl)return {isParam:true,isConstructor:false,isArrow:false};
   }
  }
  return {isParam:false,isConstructor:false,isArrow:false};
 };

 // 主遍历：按语句和结构剥离类型
 let i=0;
 let classDepth=0;
 const classBraceStack:number[]=[];
 let braceDepth=0;

 while(i<toks.length){
  const t=toks[i];
  if(isTrivia(t)){i++;continue}

  if(t.kind==='punct'){
   if(t.text==='{'){braceDepth++}
   else if(t.text==='}'){
    braceDepth=Math.max(0,braceDepth-1);
    if(classBraceStack.length&&braceDepth<classBraceStack[classBraceStack.length-1]){
     classBraceStack.pop();
     classDepth=classBraceStack.length;
    }
   }
  }

  // 1. import type / import { type X, y }
  if(t.kind==='ident'&&t.text==='import'){
   const n1=nextSig(i);
   if(n1>=0&&toks[n1].text==='type'){
    let k=n1;
    while(k<toks.length&&toks[k].text!==';'&&toks[k].kind!=='nl')k++;
    blankRange(i,k<toks.length&&toks[k].text===';'?k:k-1);
    i=k+1;continue;
   }
   // import { type A, B } from ...
   if(n1>=0&&toks[n1].text==='{'){
    const close=matchParen(n1,'{','}');
    if(close>=0){
     for(let k=n1+1;k<close;k++){
      if(toks[k].kind==='ident'&&toks[k].text==='type'){
       const after=nextSig(k);
       if(after>=0&&toks[after].kind==='ident'&&toks[after].text!=='as'&&toks[after].text!=='from'){
        blank(k);blank(after);
        const comma=nextSig(after);
        if(comma>=0&&comma<close&&toks[comma].text===',')blank(comma);
       }
      }
     }
    }
   }
   i++;continue;
  }

  // 2. export type / export interface / export declare
  if(t.kind==='ident'&&t.text==='export'){
   const n1=nextSig(i);
   if(n1>=0&&(toks[n1].text==='interface'||toks[n1].text==='type'||toks[n1].text==='declare')){
    blank(i);i=n1;continue;
   }
  }

  // 3. interface / type / declare 声明
  if(t.kind==='ident'&&t.text==='interface'){
   const prev=prevSig(i);
   if(prev<0||[';', '{', '}', 'export'].includes(toks[prev].text)||toks[prev].kind==='nl'||out[prev].trim()===''){
    let k=nextSig(i);
    while(k<toks.length&&toks[k].text!=='{')k++;
    if(k<toks.length){
     const close=matchParen(k,'{','}');
     if(close>=0){blankRange(i,close);i=close+1;continue}
    }
   }
  }

  if(t.kind==='ident'&&t.text==='type'){
   const prev=prevSig(i);
   const n1=nextSig(i);
   const stmtStart=prev<0||[';','{','}'].includes(toks[prev].text)||toks[prev].kind==='nl'||toks[prev-0]?.text==='export'||out[prev].trim()==='';
   // 确保是 `type Name = ...` 而不是变量名 `type`
   if(stmtStart&&n1>=0&&toks[n1].kind==='ident'){
    let eq=nextSig(n1);
    if(eq>=0&&toks[eq].text==='<'){const gEnd=matchGeneric(eq);if(gEnd>=0)eq=nextSig(gEnd)}
    if(eq>=0&&toks[eq].text==='='){
     const end=scanTypeEnd(eq+1,new Set([';']),true);
     const after=nextSig(end);
     blankRange(i,after>=0&&toks[after].text===';'?after:end);
     i=(after>=0&&toks[after].text===';'?after:end)+1;continue;
    }
   }
  }

  if(t.kind==='ident'&&t.text==='declare'){
   const prev=prevSig(i);
   if(prev<0||[';','{','}'].includes(toks[prev].text)||out[prev].trim()===''){
    let k=i;
    while(k<toks.length){
     if(toks[k].text==='{'){const c=matchParen(k,'{','}');if(c>=0){k=c;break}}
     if(toks[k].text===';'||toks[k].kind==='nl')break;
     k++;
    }
    blankRange(i,k);i=k+1;continue;
   }
  }

  // 4. enum / const enum 转为普通对象
  if(t.kind==='ident'&&((t.text==='const'&&toks[nextSig(i)]?.text==='enum')||t.text==='enum')){
   const enumIdx=t.text==='enum'?i:nextSig(i);
   const nameIdx=nextSig(enumIdx);
   const openIdx=nameIdx>=0?nextSig(nameIdx):-1;
   if(openIdx>=0&&toks[openIdx].text==='{'){
    const closeIdx=matchParen(openIdx,'{','}');
    if(closeIdx>=0){
     if(t.text==='const')blank(i);
     out[enumIdx]='const';
     out[nameIdx]=toks[nameIdx].text+' =';
     let numVal=0;
     let k=openIdx+1;
     while(k<closeIdx){
      if(isTrivia(toks[k])){k++;continue}
      if(toks[k].kind==='ident'){
       const eq=nextSig(k);
       if(eq>=0&&eq<closeIdx&&toks[eq].text==='='){
        out[eq]=':';
        const valIdx=nextSig(eq);
        if(valIdx>=0&&toks[valIdx].kind==='number'){numVal=Number(toks[valIdx].text)+1}
        while(k<closeIdx&&toks[k].text!==','){k++}
       }else{
        out[k]=`${toks[k].text}: ${numVal++}`;
       }
      }
      k++;
     }
     i=closeIdx+1;continue;
    }
   }
  }

  // 5. class 声明：记录 class 层级，剥离 implements ...
  if(t.kind==='ident'&&t.text==='class'){
   let k=nextSig(i);
   while(k<toks.length&&toks[k].text!=='{'){
    if(toks[k].text==='<'){const g=matchGeneric(k);if(g>=0){blankRange(k,g);k=g}}
    if(toks[k].kind==='ident'&&toks[k].text==='implements'){
     let m=k;while(m<toks.length&&toks[m].text!=='{')m++;
     blankRange(k,m-1);k=m;break;
    }
    k++;
   }
   if(k<toks.length&&toks[k].text==='{'){
    classBraceStack.push(braceDepth+1);
    classDepth=classBraceStack.length;
   }
   i++;continue;
  }

  // 6. 类成员修饰符与字段类型注解（处于类直接子层级时）
  if(classDepth>0&&braceDepth===classBraceStack[classBraceStack.length-1]){
   if(t.kind==='ident'&&['public','private','protected','readonly','override','abstract'].includes(t.text)){
    const next=nextSig(i);
    if(next>=0&&toks[next].text!=='('&&toks[next].text!==':'){
     blank(i);i++;continue;
    }
   }
   // 类字段 `name!: Type;` 或 `name?: Type = val;`
   if(t.kind==='ident'||(t.kind==='punct'&&(t.text==='!'||t.text==='?'))){
    const prev=prevSig(i);
    const atFieldStart=prev<0||toks[prev].text==='{'||toks[prev].text===';'||toks[prev].text==='}'||out[prev].trim()==='';
    if(t.kind==='ident'&&atFieldStart&&!['constructor','static','async','get','set'].includes(t.text)){
     let n1=nextSig(i);
     if(n1>=0&&(toks[n1].text==='!'||toks[n1].text==='?')){
      const n2=nextSig(n1);
      if(n2>=0&&toks[n2].text===':'){blank(n1);n1=n2}
     }
     if(n1>=0&&toks[n1].text===':'){
      // 确保不是方法后的返回类型（前面没有 `)`）
      const end=scanTypeEnd(n1+1,new Set(['=',';']),true);
      blankRange(n1,end);
      i=end+1;continue;
     }
    }
   }
  }

  // 7. 变量声明类型注解：`const x: Type = ...` / `let x!: Type;`
  if(t.kind==='ident'&&['const','let','var'].includes(t.text)){
   let k=nextSig(i);
   // 跳过解构或变量名
   if(k>=0){
    if(toks[k].text==='{'||toks[k].text==='['){
     const close=matchParen(k,toks[k].text,toks[k].text==='{'?'}':']');
     if(close>=0)k=close;
    }
    let afterName=nextSig(k);
    if(afterName>=0&&toks[afterName].text==='!'){
     const n2=nextSig(afterName);
     if(n2>=0&&toks[n2].text===':'){blank(afterName);afterName=n2}
    }
    if(afterName>=0&&toks[afterName].text===':'){
     const end=scanTypeEnd(afterName+1,new Set(['=',';','of','in',',']),true);
     blankRange(afterName,end);
    }
   }
   i++;continue;
  }

  // 8. 泛型列表 `<T>`（函数声明、调用、箭头函数）
  if(t.kind==='punct'&&t.text==='<'){
   const prev=prevSig(i);
   const gEnd=matchGeneric(i);
   if(gEnd>=0){
    const after=nextSig(gEnd);
    const prevOk=prev<0||(toks[prev].kind==='ident')||['=','(',',','return',':','?','=>','['].includes(toks[prev].text)||toks[prev].text===')'||toks[prev].text===']';
    const afterOk=after>=0&&['(','=>','{','extends','implements'].includes(toks[after].text);
    // 确保不是 `a < b` 后刚好有个 `(` 的情况：`prev` 是 `new Foo` 或标识符且 `after` 是 `(` 才剥，排除 `if/while/for/return a < b(...)` 中 `<` 后直接标识符空格
    const isBinaryLt=prev>=0&&toks[prev].kind==='ident'&&after>=0&&toks[after].text!=='('&&toks[after].text!=='=>';
    if(prevOk&&afterOk&&!isBinaryLt){
     blankRange(i,gEnd);
     i=gEnd+1;continue;
    }
   }
  }

  // 9. 函数/方法/箭头函数参数列表与返回类型
  if(t.kind==='punct'&&t.text==='('){
   const close=matchParen(i,'(',')');
   if(close>=0){
    const {isParam,isConstructor,isArrow}=isParamParen(i,close);
    if(isParam){
     const ctorAssigns:string[]=[];
     // 扫描参数列表（depth=1）：剥离参数修饰符、`?`、`: Type`
     let k=i+1,pd=0,bd=0,qd=0;
     while(k<close){
      const pt=toks[k];
      if(isTrivia(pt)){k++;continue}
      if(pt.kind==='punct'){
       if(pt.text==='(')pd++;else if(pt.text===')')pd--;
       else if(pt.text==='{')bd++;else if(pt.text==='}')bd--;
       else if(pt.text==='[')qd++;else if(pt.text===']')qd--;
       if(pd===0&&bd===0&&qd===0){
        if(pt.text==='?'){blank(k)}
        else if(pt.text===':'){
         const end=scanTypeEnd(k+1,new Set(['=',',',')']));
         blankRange(k,Math.min(end,close-1));
         k=Math.min(end,close-1)+1;continue;
        }
       }
      }else if(pd===0&&bd===0&&qd===0&&pt.kind==='ident'&&['public','private','protected','readonly'].includes(pt.text)){
       const nameTok=nextSig(k);
       if(nameTok>=0&&nameTok<close&&toks[nameTok].kind==='ident'){
        if(isConstructor&&['public','private','protected','readonly'].includes(pt.text)){
         // 若多个修饰符连用（如 private readonly x），只在最后一个前记录一次
         if(!['public','private','protected','readonly'].includes(toks[nameTok].text)){
          ctorAssigns.push(`this.${toks[nameTok].text} = ${toks[nameTok].text};`);
         }
        }
        blank(k);
       }
      }
      k++;
     }
     // 剥离返回类型 `: ReturnType`
     const afterClose=nextSig(close);
     if(afterClose>=0&&toks[afterClose].text===':'){
      const retEnd=scanTypeEnd(afterClose+1,isArrow?new Set(['=>','{_BODY}','=',';']):new Set(['{_BODY}','=',';']),true);
      blankRange(afterClose,retEnd);
      if(isConstructor&&ctorAssigns.length){
       const bodyOpen=nextSig(retEnd);
       if(bodyOpen>=0&&toks[bodyOpen].text==='{'){
        out[bodyOpen]='{ '+ctorAssigns.join(' ');
       }
      }
     }else if(isConstructor&&ctorAssigns.length&&afterClose>=0&&toks[afterClose].text==='{'){
      out[afterClose]='{ '+ctorAssigns.join(' ');
     }
    }
   }
  }

  // 10. `as Type` / `satisfies Type`
  if(t.kind==='ident'&&(t.text==='as'||t.text==='satisfies')){
   // 排除 import/export { x as y } 里的 as
   const prev=prevSig(i);
   let insideImportExport=false;
   if(prev>=0){
    for(let p=prev;p>=Math.max(0,prev-20);p--){
     if(toks[p].text==='import'||toks[p].text==='export'){insideImportExport=true;break}
     if(toks[p].text===';'||toks[p].text==='=')break;
    }
   }
   if(!insideImportExport){
    const end=scanTypeEnd(i+1,new Set([',',';',')',']','}','=','+','-','*','/','%','&&','||','??','?',':','===','!==','==','!=','<','>','<=','>=']),true);
    blankRange(i,end);
    i=end+1;continue;
   }
  }

  // 11. 非空断言 `!`（紧跟在标识符 / ) / ] 后，且后面不是 `=`）
  if(t.kind==='punct'&&t.text==='!'){
   const prev=prevSig(i),next=nextSig(i);
   const prevIsExpr=prev>=0&&(toks[prev].kind==='ident'&&!['return','throw','typeof','void','delete','await','yield','new','case'].includes(toks[prev].text)||toks[prev].text===')'||toks[prev].text===']');
   const nextOk=next<0||!['='].includes(toks[next].text);
   // 必须和前一个词在同一位置（无空格）或紧邻表达式末尾，且后接 . [ ( , ; ) } 换行或二元运算符
   const adjacent=i>0&&!isTrivia(toks[i-1]);
   const nextPostfix=next<0||['.', '?.', '[', '(', ',', ';', ')', '}', ']', '+', '-', '*', '/', '&&', '||', '??', '===', '!==', '==', '!=', '<', '>', '<=', '>='].includes(toks[next].text)||toks[next].kind==='nl';
   if(adjacent&&prevIsExpr&&nextOk&&nextPostfix){
    blank(i);
   }
  }

  i++;
 }

 return out.join('');
}
