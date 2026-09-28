const fs=require('fs');
const FILE='/home/user/Wangplan/index.html';
const html=fs.readFileSync(FILE,'utf8');

// --- ดึง script ของ lucide ออกมา ---
const re=/<script\b([^>]*)>([\s\S]*?)<\/script>/g;let m,i=0,body=null,start=0,end=0;
while((m=re.exec(html))){ if(i===4){ body=m[2]; start=m.index+m[0].indexOf('>')+1; end=m.index+m[0].length-'</script>'.length; } i++; }

// --- ไอคอนที่แอปใช้จริง ---
const used=[...new Set((html.match(/_LucideReact\.([A-Za-z0-9_]+)/g)||[]).map(x=>x.split('.')[1]))].sort();

// --- ตัวช่วยเดินข้ามสตริงเพื่อจับคู่วงเล็บให้ถูก ---
function scan(src,pos,open,close){
  let d=0,q=null;
  for(let k=pos;k<src.length;k++){
    const ch=src[k],pv=src[k-1];
    if(q){ if(ch===q&&pv!=='\\')q=null; continue; }
    if(ch==='"'||ch==="'"||ch==='`'){ q=ch; continue; }
    if(ch===open)d++;
    else if(ch===close){ d--; if(d===0)return k; }
  }
  return -1;
}

// --- หาจุดเริ่มของโซ่นิยามไอคอน และโซน export ---
const firstIcon=body.search(/,[A-Za-z_$][\w$]*=c\("/);
const exportsAt=body.search(/e\.[A-Za-z]+=[A-Za-z_$][\w$]*,e\./);
if(firstIcon<0||exportsAt<0) throw new Error('หาขอบเขตไม่เจอ');

const header=body.slice(0,firstIcon);              // factory c, defaults, forwardRef
const chain=body.slice(firstIcon,exportsAt);
const tail=body.slice(exportsAt);

// --- แยกทุกนิยามไอคอนในโซ่ ---
const defRe=/,([A-Za-z_$][\w$]*)=c\("([A-Za-z0-9]+)",/g;
const defs=[];let d;
while((d=defRe.exec(chain))){
  const arrStart=chain.indexOf('[',d.index+d[0].length-1);
  const arrEnd=scan(chain,arrStart,'[',']');
  const close=chain.indexOf(')',arrEnd);
  defs.push({varName:d[1],icon:d[2],text:chain.slice(d.index+1,close+1)});
}

// --- ชื่อที่แอปใช้บางตัวเป็นชื่อเดิมที่ lucide เปลี่ยนไปแล้ว ตามไปหาตัวจริงจาก export ---
const byVar=new Map(defs.map(x=>[x.varName,x]));
const wanted=new Map();          // ชื่อที่แอปเรียก -> นิยามจริง
for(const name of used){
  let def=defs.find(x=>x.icon===name);
  if(!def){
    const al=body.match(new RegExp('e\\.'+name+'=([A-Za-z_$][\\w$]*)[,;]'));
    if(al) def=byVar.get(al[1]);
  }
  if(def) wanted.set(name,def);
}
const keep=[...new Set([...wanted.values()])];
const found=[...wanted.keys()];
const missing=used.filter(x=>!found.includes(x));

// --- ประกอบใหม่: header + นิยามที่เก็บ + export ตามชื่อที่แอปเรียกจริง ---
const exportLines=[...wanted].map(([name,def])=>`e.${name}=${def.varName},e.${name}Icon=${def.varName}`).join(',');
const tailEnd=tail.slice(tail.lastIndexOf('});'));          // ปิด UMD
const newBody=header+keep.map(x=>','+x.text).join('')+';'+exportLines+tailEnd;

console.log('ไอคอนใน bundle ทั้งหมด :',defs.length);
console.log('แอปใช้จริง            :',used.length);
console.log('เก็บไว้               :',keep.length);
console.log('หาไม่เจอ              :',missing.length?missing.join(', '):'ไม่มี');
console.log();
console.log('ขนาดเดิม  :',(body.length/1024).toFixed(0),'KB');
console.log('ขนาดใหม่  :',(newBody.length/1024).toFixed(0),'KB');
console.log('ลดลง      :',((body.length-newBody.length)/1024).toFixed(0),'KB');

fs.writeFileSync('/tmp/claude-0/-home-user-Wangplan/ceafa4ba-0a19-5bd6-8517-eb2cd86ded63/scratchpad/lucide_new.js',newBody);
fs.writeFileSync('/tmp/claude-0/-home-user-Wangplan/ceafa4ba-0a19-5bd6-8517-eb2cd86ded63/scratchpad/bounds.json',JSON.stringify({start,end}));
