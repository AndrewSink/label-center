import * as pdfjs from './vendor/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.mjs', import.meta.url).href;
const {PDFDocument,degrees}=window.PDFLib;
const $=id=>document.getElementById(id);
let source=null, output=null, outputBytes=null, current=1, selectedName='', task=0;
const opts={cMapUrl:new URL('./vendor/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/wasm/',import.meta.url).href};
function status(msg,error=false){$('status').textContent=msg;$('status').classList.toggle('error',error)}
function busy(on){$('download').disabled=on||!outputBytes;$('margin').disabled=on;$('drop').disabled=on;$('replace').disabled=on}
$('drop').onclick=$('replace').onclick=()=>$('file').click();
$('file').onchange=e=>{if(e.target.files[0])load(e.target.files[0]);e.target.value=''};
for(const ev of ['dragenter','dragover']) $('drop').addEventListener(ev,e=>{e.preventDefault();$('drop').classList.add('drag')});
for(const ev of ['dragleave','drop']) $('drop').addEventListener(ev,e=>{e.preventDefault();$('drop').classList.remove('drag')});
$('drop').addEventListener('drop',e=>{if(!e.dataTransfer.files.length)return;if(e.dataTransfer.files.length!==1){status('Choose one PDF at a time. Multi-page PDFs are supported.',true);return}load(e.dataTransfer.files[0])});
window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>e.preventDefault());
async function load(file){
 if(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf'){status('Please choose a PDF file.',true);return}
 if(file.size>25*1024*1024){status('Please choose a PDF smaller than 25 MB.',true);return}
 const token=++task;busy(true);outputBytes=null;source=null;selectedName=file.name;status('Opening your PDF…');
 try{
  const doc=await PDFDocument.load(await file.arrayBuffer());
  if(doc.getPageCount()>50)throw new Error('Please use a PDF with 50 pages or fewer.');
  if(doc.getForm().getFields().length)doc.getForm().flatten();
  const normalized=await PDFDocument.create();
  for(const page of doc.getPages()){
   const box=page.getCropBox(); const angle=((page.getRotation().angle%360)+360)%360;
   if(!page.node.Contents()){normalized.addPage([box.width,box.height]);continue}
   const embedded=await normalized.embedPage(page,{left:box.x,bottom:box.y,right:box.x+box.width,top:box.y+box.height});
   const swap=angle===90||angle===270;
   const p=normalized.addPage(swap?[box.height,box.width]:[box.width,box.height]);
   const xy=angle===90?[0,box.width]:angle===180?[box.width,box.height]:angle===270?[box.height,0]:[0,0];
   p.drawPage(embedded,{x:xy[0],y:xy[1],rotate:degrees(-angle)});
  }
  const normalizedBytes=await normalized.save();
  const rendered=await pdfjs.getDocument({data:normalizedBytes.slice(),...opts}).promise;
  const bounds=[];
  for(let n=1;n<=rendered.numPages;n++){
   status(`Finding label edges · page ${n} of ${rendered.numPages}…`);
   const page=await rendered.getPage(n);const unit=page.getViewport({scale:1});
   if(unit.width>3000||unit.height>3000)throw new Error('This PDF has an unusually large page. Please export it at its intended label size.');
   const scale=Math.min(2,2400/Math.max(unit.width,unit.height)); const viewport=page.getViewport({scale});
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   const ctx=canvas.getContext('2d',{willReadFrequently:true});await page.render({canvasContext:ctx,viewport,background:'rgb(255,255,255)'}).promise;
   const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);let left=canvas.width,top=canvas.height,right=-1,bottom=-1;
   for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const i=(y*canvas.width+x)*4;if(Math.min(data[i],data[i+1],data[i+2])<248){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}
   bounds.push(right<0?null:{left:Math.max(0,left/scale-2),right:Math.min(unit.width,(right+1)/scale+2),bottom:Math.max(0,unit.height-(bottom+1)/scale-2),top:Math.min(unit.height,unit.height-top/scale+2)});
   canvas.width=canvas.height=0;page.cleanup();
  }
  await rendered.destroy(); if(token!==task)return;
  source={doc:normalized,bounds};$('filename').textContent=file.name;$('filemeta').textContent=`${normalized.getPageCount()} page${normalized.getPageCount()===1?'':'s'} · ${(file.size/1024).toFixed(0)} KB`;
  $('drop').hidden=true;$('fileinfo').hidden=false;await build();
 }catch(e){if(token!==task)return;source=null;outputBytes=null;$('preview').hidden=true;$('empty').hidden=false;$('drop').hidden=false;$('fileinfo').hidden=true;$('pagination').hidden=true;$('result').textContent='A fresh sheet. A better fit.';status(/encrypt|password/i.test(e.message)?'This PDF is password-protected. Please unlock it first.':e.message.startsWith('Please')||e.message.startsWith('This PDF has')?e.message:'Couldn’t read this PDF. Try opening it in Preview or Acrobat and exporting a new PDF.',true)}
 finally{if(token===task)busy(false)}
}
async function build(){
 if(!source)return;busy(true);status('Centering your label…');outputBytes=null;
 try{
  const out=await PDFDocument.create();const margin=Number($('margin').value);let shrunk=0,blank=0;
  for(let i=0;i<source.bounds.length;i++){
   const page=out.addPage([612,792]);const b=source.bounds[i];if(!b){blank++;continue}
   const label=await out.embedPage(source.doc.getPage(i),b);
   const scale=Math.min(1,(612-2*margin)/label.width,(792-2*margin)/label.height);if(scale<.999)shrunk++;
   page.drawPage(label,{x:(612-label.width*scale)/2,y:(792-label.height*scale)/2,width:label.width*scale,height:label.height*scale});
  }
  out.setTitle('Centered shipping labels');out.setProducer('Label Center');const bytes=await out.save();
  if(output)await output.destroy();output=await pdfjs.getDocument({data:bytes.slice(),...opts}).promise;outputBytes=bytes;current=1;
  await preview();$('result').textContent=shrunk?`${shrunk} page${shrunk===1?'':'s'} reduced to fit safely`:'Original label size preserved';
  status(`Ready to print. ${out.getPageCount()} centered Letter page${out.getPageCount()===1?'':'s'}.${blank?` ${blank} blank page${blank===1?' was':'s were'} kept.`:''}`);
 }catch(e){outputBytes=null;status('Couldn’t prepare this PDF. Please try a different export.',true)}finally{busy(false)}
}
$('margin').onchange=build;
async function preview(){const p=await output.getPage(current);const viewport=p.getViewport({scale:1});const c=$('preview');c.width=viewport.width;c.height=viewport.height;await p.render({canvasContext:c.getContext('2d'),viewport}).promise;$('empty').hidden=true;c.hidden=false;$('pagination').hidden=output.numPages<=1;$('pagecount').textContent=`${current} / ${output.numPages}`;$('prev').disabled=current===1;$('next').disabled=current===output.numPages}
let paging=false;async function turn(delta){if(paging)return;paging=true;current+=delta;try{await preview()}finally{paging=false}}
$('prev').onclick=()=>{if(current>1)turn(-1)};$('next').onclick=()=>{if(current<output.numPages)turn(1)};
$('download').onclick=()=>{if(!outputBytes)return;const url=URL.createObjectURL(new Blob([outputBytes],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download=selectedName.replace(/\.pdf$/i,'')+'-centered-letter.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)};
