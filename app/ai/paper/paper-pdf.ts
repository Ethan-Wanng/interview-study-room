// 把交卷后的答卷页面导出成 PDF：先在白底浅色样式下截图，再按 A4 分页，尽量在两道题之间换页。
// 用截图而不是文字排版，是为了中文、代码块和图标都和页面一模一样，不依赖字体文件。
export async function downloadPaperPdf(el:HTMLElement,filename:string){
 const [{default:html2canvas},{jsPDF}]=await Promise.all([import('html2canvas-pro'),import('jspdf')]);
 el.classList.add('paper-print');
 try{const top=el.getBoundingClientRect().top;
  // 可以换页的位置：每道题和每个大题的顶部（相对答卷顶部，CSS 像素）。
  const breaks=[...el.querySelectorAll<HTMLElement>('.paper-q,.paper-section>h2')].map(n=>n.getBoundingClientRect().top-top).filter(y=>y>0);
  const scale=1.6,canvas=await html2canvas(el,{scale,backgroundColor:'#ffffff',useCORS:true,windowWidth:el.scrollWidth});
  const pdf=new jsPDF({unit:'pt',format:'a4',orientation:'portrait'}),pageW=pdf.internal.pageSize.getWidth(),pageH=pdf.internal.pageSize.getHeight(),margin=28;
  const px=(pageW-margin*2)/canvas.width,pageCanvasH=Math.floor((pageH-margin*2)/px);
  for(let y=0,first=true;y<canvas.height;first=false){let end=Math.min(canvas.height,y+pageCanvasH);
   if(end<canvas.height){const cut=breaks.map(b=>Math.round(b*scale)).filter(b=>b>y+pageCanvasH*0.3&&b<=end).pop();if(cut)end=cut}
   const slice=document.createElement('canvas');slice.width=canvas.width;slice.height=end-y;slice.getContext('2d')!.drawImage(canvas,0,y,canvas.width,end-y,0,0,canvas.width,end-y);
   if(!first)pdf.addPage();pdf.addImage(slice.toDataURL('image/jpeg',0.8),'JPEG',margin,margin,canvas.width*px,(end-y)*px);y=end}
  pdf.save(filename)}
 finally{el.classList.remove('paper-print')}}
