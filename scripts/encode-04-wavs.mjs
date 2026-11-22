import {existsSync,mkdirSync,readdirSync,readFileSync,renameSync,unlinkSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {Mp3Encoder} from '@breezystack/lamejs';

const COLAB_DIR=String.raw`E:\Projects\面试自习\tts-04-colab`;
const WAV_DIR=resolve(process.argv[2]??join(COLAB_DIR,'local_wavs'));
const MANIFEST_FILE=join(COLAB_DIR,'manifest.json');
const PRE_DONE_FILE=join(COLAB_DIR,'pre_done.json');
const DONE_FILE=join(COLAB_DIR,'done_04.json');
const BACKUP_FILE=join(COLAB_DIR,'index.backup.json');
const OUT_DIR=String.raw`E:\Projects\面试自习\site\public\tts`;
const INDEX_FILE=join(OUT_DIR,'index.json');
const KBPS=48;

function readWavPcm16(file){
 const buf=readFileSync(file);
 let pos=12,rate=24000,channels=1,bits=16;
 while(pos+8<=buf.length){
  const id=buf.toString('ascii',pos,pos+4);
  const size=buf.readUInt32LE(pos+4);
  if(id==='fmt '){
   channels=buf.readUInt16LE(pos+10);
   rate=buf.readUInt32LE(pos+12);
   bits=buf.readUInt16LE(pos+22);
  }else if(id==='data'){
   const end=Math.min(buf.length,pos+8+size);
   const pcmBuf=buf.subarray(pos+8,end);
   const raw=new Int16Array(pcmBuf.buffer,pcmBuf.byteOffset,pcmBuf.byteLength>>1);
   if(channels===1)return {samples:raw,rate};
   const mono=new Int16Array(Math.floor(raw.length/channels));
   for(let i=0;i<mono.length;i++)mono[i]=raw[i*channels];
   return {samples:mono,rate};
  }
  pos+=8+size+(size%2);
 }
 throw new Error(`Invalid WAV: ${file} (bits=${bits})`);
}

function upsample(s,rate){
 const k=Math.ceil(32000/rate);
 if(k<=1)return {s,rate};
 const out=new Int16Array(s.length*k);
 for(let i=0;i<s.length;i++){
  const a=s[i],b=s[Math.min(i+1,s.length-1)];
  for(let j=0;j<k;j++)out[i*k+j]=Math.round(a+(b-a)*j/k);
 }
 return {s:out,rate:rate*k};
}

function mp3(samples,rate){
 const up=upsample(samples,rate),enc=new Mp3Encoder(1,up.rate,KBPS),parts=[];
 for(let i=0;i<up.s.length;i+=1152)parts.push(enc.encodeBuffer(up.s.subarray(i,i+1152)));
 parts.push(enc.flush());
 const out=Buffer.concat(parts.map(p=>Buffer.from(p)));
 const zeros=out.reduce((n,x)=>n+(x===0?1:0),0);
 if(out.length===0||(samples.length>rate/2&&zeros>out.length*0.5)){
  throw new Error(`MP3 encoding mostly zeros (${zeros}/${out.length})`);
 }
 return out;
}

const manifest=JSON.parse(readFileSync(MANIFEST_FILE,'utf8'));
const validHashes=new Set(manifest.items.map(it=>it.hash.toLowerCase()));

mkdirSync(OUT_DIR,{recursive:true});
mkdirSync(COLAB_DIR,{recursive:true});

const index=existsSync(INDEX_FILE)?JSON.parse(readFileSync(INDEX_FILE,'utf8')):{};
if(!existsSync(BACKUP_FILE)){
 writeFileSync(BACKUP_FILE,JSON.stringify(index),'utf8');
}

let doneList=[];
if(existsSync(DONE_FILE)){
 doneList=JSON.parse(readFileSync(DONE_FILE,'utf8'));
}else if(existsSync(PRE_DONE_FILE)){
 doneList=JSON.parse(readFileSync(PRE_DONE_FILE,'utf8'));
}
const doneSet=new Set(doneList.map(h=>String(h).toLowerCase()));

let encodedCount=0;
if(existsSync(WAV_DIR)){
 const wavFiles=readdirSync(WAV_DIR).filter(f=>/^[0-9a-f]{16}\.wav$/i.test(f)).sort();
 for(const file of wavFiles){
  const hash=file.slice(0,16).toLowerCase();
  if(!validHashes.has(hash))continue;
  const fullPath=join(WAV_DIR,file);
  try{
   const {samples,rate}=readWavPcm16(fullPath);
   const ms=Math.round(samples.length/rate*1000);
   if(ms<=0||samples.length<rate*0.2){
    console.warn(`Skipping short/empty WAV ${file} (${samples.length} samples @ ${rate}Hz)`);
    continue;
   }
   const encoded=mp3(samples,rate);
   const outMp3=join(OUT_DIR,`${hash}.mp3`);
   writeFileSync(outMp3+'.tmp',encoded);
   renameSync(outMp3+'.tmp',outMp3);
   const oldMs=index[hash];
   index[hash]=oldMs===ms?ms+1:ms;
   doneSet.add(hash);
   unlinkSync(fullPath);
   encodedCount++;
  }catch(e){
   console.error(`Failed encoding ${file}: ${e.message}`);
   throw e;
  }
 }
}

const sortedIndex=Object.fromEntries(Object.entries(index).sort(([a],[b])=>a<b?-1:1));
const tmpIdx=INDEX_FILE+'.tmp';
writeFileSync(tmpIdx,JSON.stringify(sortedIndex),'utf8');
renameSync(tmpIdx,INDEX_FILE);

const sortedDone=[...doneSet].sort();
const tmpDone=DONE_FILE+'.tmp';
writeFileSync(tmpDone,JSON.stringify(sortedDone,null,2),'utf8');
renameSync(tmpDone,DONE_FILE);

console.log(`Encoded ${encodedCount} WAVs -> public/tts (total done_04: ${sortedDone.length})`);
