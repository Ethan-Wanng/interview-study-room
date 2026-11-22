// 真实书页物理卷曲翻页几何引擎（类 Apple Books / 微信读书对角折线卷页算法）
// 原理：以右下角 C=(W,H) 拉向手势控制点 P=(px,py) 的垂直平分线为真实纸张折痕，
// 精确裁剪出“尚未翻过的旧页多边形”和“已卷起的纸背翻折多边形”，通过二维刚体反射矩阵
// 将纸背严丝合缝贴合在折痕上，并输出圆柱面曲率高光与投射在上下纸面的软阴影几何参数。

export type Pt={x:number;y:number};

export type CurlGeometry={
 // 0..1 进度（0 = 右下角未翻，1 = 完整翻过左侧书脊）
 progress:number;
 // 尚未翻过去的正面裁剪多边形（CSS clip-path: polygon(...)）
 frontClip:string;
 // 被卷起来翻转到背面的区域裁剪多边形（位于原页面坐标系内，配合 backMatrix 反射到折痕另一侧）
 backClip:string;
 // 将 backClip 精确镜像反射到折痕另一侧的 CSS matrix(a,b,c,d,tx,ty)
 backMatrix:string;
 // 折痕中点坐标（用于定位弧面高光带与底页阴影带）
 midX:number;
 midY:number;
 // 折痕法线角度（度，垂直于折痕并指向被揭开的新页一侧）
 angleDeg:number;
 // 卷起弧面的等效半径/厚度（像素），决定高光带宽度与投影深浅
 curlDepth:number;
 // 翻至书脊收尾时的柔和淡出透明度
 flapOpacity:number;
 // 纸面阴影强度（0..1）
 shadowOpacity:number;
};

// Sutherland-Hodgman 半平面裁剪：保留满足 sign * ((Q - M) · n) <= 0 的顶点
function clipRectHalfPlane(
 w:number,
 h:number,
 mx:number,
 my:number,
 nx:number,
 ny:number,
 keepNegativeSide:boolean,
):Pt[]{
 let poly:Pt[]=[
  {x:0,y:0},
  {x:w,y:0},
  {x:w,y:h},
  {x:0,y:h},
 ];
 const sign=keepNegativeSide?1:-1;
 const dist=(p:Pt)=>sign*((p.x-mx)*nx+(p.y-my)*ny);
 const out:Pt[]=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i];
  const b=poly[(i+1)%poly.length];
  const da=dist(a);
  const db=dist(b);
  const aIn=da<=0;
  const bIn=db<=0;
  if(aIn&&bIn){
   out.push(b);
  }else if(aIn&&!bIn){
   const t=da/(da-db);
   out.push({x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)});
  }else if(!aIn&&bIn){
   const t=da/(da-db);
   out.push({x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)});
   out.push(b);
  }
 }
 return out;
}

function toClipPolygon(pts:Pt[]):string{
 if(pts.length<3)return 'polygon(0px 0px, 0px 0px, 0px 0px)';
 return `polygon(${pts.map(p=>`${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(', ')})`;
}

// 自然的翻页缓动：起手轻挑纸角 → 中段加速顺滑卷过 → 末段空气缓冲轻柔落平
export function easePageCurl(t:number):number{
 const x=Math.max(0,Math.min(1,t));
 // 自定义五次平滑曲线，兼具轻挑起势与柔和缓冲
 return x<0.5
  ?4*x*x*x*(0.75+0.5*x)
  :1-Math.pow(-2*x+2,3.1)/2;
}

// 根据归一化进度 u (0..1) 计算自然手势轨迹上的角点位置 P=(px,py)
export function curlPointForProgress(u:number,w:number,h:number):Pt{
 const clamped=Math.max(0.002,Math.min(1,u));
 // 水平方向从右下角 W 平滑越过书脊直达 -1.03*W（此时折痕中点到达 x <= 0，整页揭开完毕）
 const px=w*(1-2.03*clamped);
 // 垂直方向呈自然弧线挑起：起手迅速抬起纸角形成优雅对角卷耳，中段弧线柔和，收尾贴平书脊
 const liftPeak=Math.min(h*0.26,w*0.28);
 const py=h-Math.sin(Math.pow(clamped,0.72)*Math.PI)*liftPeak;
 return {x:px,y:py};
}

// 由给定手势控制点 P=(px,py) 精确求解整帧的纸张卷曲几何
export function computeCurlGeometry(
 px:number,
 py:number,
 w:number,
 h:number,
 progress:number,
):CurlGeometry{
 // 防止 P 与右下角完全重合导致除零
 const safePx=Math.min(w-1.5,px);
 const safePy=Math.min(h-0.5,py);

 const vx=w-safePx;
 const vy=h-safePy;
 const d=Math.hypot(vx,vy)||1;
 const nx=vx/d;
 const ny=vy/d;

 const mx=(w+safePx)*0.5;
 const my=(h+safePy)*0.5;

 const frontPts=clipRectHalfPlane(w,h,mx,my,nx,ny,true);
 const backPts=clipRectHalfPlane(w,h,mx,my,nx,ny,false);

 // 精确二维镜面反射矩阵：将折痕右侧的 backPts 严格反射到折痕左侧
 const a=1-2*nx*nx;
 const b=-2*nx*ny;
 const c=-2*nx*ny;
 const dMat=1-2*ny*ny;
 const k=2*(mx*nx+my*ny);
 const tx=k*nx;
 const ty=k*ny;

 const angleDeg=(Math.atan2(ny,nx)*180)/Math.PI;
 // 卷曲圆弧的视觉饱满度：中段最饱满，起手和贴平书脊时自然收薄
 const arcEnvelope=Math.sin(Math.max(0,Math.min(1,progress))*Math.PI);
 const curlDepth=Math.max(18,Math.min(82,d*0.18*(0.45+0.75*arcEnvelope)));

 // 翻到最左侧装订环后柔和隐入环后，避免突兀截断
 const flapOpacity=progress>0.86?Math.max(0,1-(progress-0.86)/0.14):1;
 const shadowOpacity=Math.min(1,Math.sin(Math.pow(Math.max(0.01,Math.min(0.99,progress)),0.65)*Math.PI)*1.15);

 return {
  progress,
  frontClip:toClipPolygon(frontPts),
  backClip:toClipPolygon(backPts),
  backMatrix:`matrix(${a.toFixed(5)},${b.toFixed(5)},${c.toFixed(5)},${dMat.toFixed(5)},${tx.toFixed(2)},${ty.toFixed(2)})`,
  midX:mx,
  midY:my,
  angleDeg,
  curlDepth,
  flapOpacity,
  shadowOpacity,
 };
}
