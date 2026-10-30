// 十甲發市場：電錶拍照（加日期浮水印、壓縮、加密，上傳到 Apps Script → Google 雲端硬碟；未設定同步時先排隊存在這台裝置）
(function(g){
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)),tob64=u=>{let s='';const a=new Uint8Array(u);for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode.apply(null,a.subarray(i,i+8192));return btoa(s);};
// 讀 JPEG EXIF 的拍攝時間（DateTimeOriginal 0x9003，沒有就用 DateTime 0x0132）；回傳 Date 或 null
function exifDate(buf){try{const v=new DataView(buf);if(v.getUint16(0)!==0xFFD8)return null;let o=2;
  while(o+4<v.byteLength){const mk=v.getUint16(o),len=v.getUint16(o+2);if(mk===0xFFE1&&v.getUint32(o+4)===0x45786966){const t=o+10,le=v.getUint16(t)===0x4949;
    const u16=p=>v.getUint16(t+p,le),u32=p=>v.getUint32(t+p,le);let dt=null,dto=null;
    const str=(p,n)=>{let s='';for(let i=0;i<n-1;i++)s+=String.fromCharCode(v.getUint8(t+p+i));return s;};
    const ifd=(p,cb)=>{const n=u16(p);for(let i=0;i<n;i++){const e=p+2+i*12;cb(u16(e),u32(e+4),u32(e+8));}};
    ifd(u32(4),(tag,cnt,val)=>{if(tag===0x0132)dt=str(val,cnt);if(tag===0x8769)ifd(val,(t2,c2,v2)=>{if(t2===0x9003)dto=str(v2,c2);});});
    const s=dto||dt;if(!s)return null;const m=/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/.exec(s);return m?new Date(+m[1],m[2]-1,+m[3],+m[4],+m[5],+m[6]):null;}
   if((mk&0xFF00)!==0xFF00)break;o+=2+len;}}catch(e){}return null;}
const pad=n=>String(n).padStart(2,'0');
function fmtDT(d){return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;}
// 縮到長邊 1600px、右下角印「拍照日期時間／攤位 錶別 讀數」，輸出 JPEG
async function stamp(file,lines,opt){opt=opt||{};const buf=await file.arrayBuffer();const when=exifDate(buf),d=when||opt.now||new Date();
 const bmp=await createImageBitmap(new Blob([buf],{type:file.type||'image/jpeg'}),{imageOrientation:'from-image'}).catch(()=>null);
 let img=bmp;if(!img){img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=URL.createObjectURL(file);});}
 const W0=img.width,H0=img.height,MX=opt.max||1600,sc=Math.min(1,MX/Math.max(W0,H0)),W=Math.round(W0*sc),H=Math.round(H0*sc);
 const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(img,0,0,W,H);
 const L=['拍照 '+fmtDT(d)+(when?'':'（上傳時間）')].concat(lines||[]),fs=Math.max(18,Math.round(Math.min(W,H)*0.045));
 x.font=`bold ${fs}px "Microsoft JhengHei","PingFang TC","Noto Sans CJK TC",sans-serif`;x.textBaseline='bottom';
 const tw=Math.max(...L.map(s=>x.measureText(s).width)),lh=fs*1.25,bh=lh*L.length+fs*0.5,bw=tw+fs;
 x.fillStyle='rgba(0,0,0,.6)';x.fillRect(W-bw-fs*0.4,H-bh-fs*0.4,bw,bh);x.fillStyle='#ffeb3b';x.textAlign='left';
 L.forEach((s,i)=>{x.fillStyle=i?'#fff':'#ffeb3b';x.fillText(s,W-bw-fs*0.4+fs*0.5,H-fs*0.4-fs*0.25-lh*(L.length-1-i));});
 const blob=await new Promise(ok=>c.toBlob(ok,'image/jpeg',opt.q||0.82));return {blob,taken:d,exif:!!when,w:W,h:H};}
async function enc(key,blob){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,await blob.arrayBuffer());return {iv:tob64(iv),ct:tob64(ct)};}
async function dec(key,o){const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(o.iv)},key,b64(o.ct));return new Blob([pt],{type:'image/jpeg'});}
// 待上傳佇列（IndexedDB，內容已加密）
function db(){return new Promise((ok,no)=>{const r=indexedDB.open('sjf_photo',1);r.onupgradeneeded=()=>r.result.createObjectStore('q',{keyPath:'k'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
async function tx(mode,f){const d=await db();return new Promise((ok,no)=>{const t=d.transaction('q',mode),s=t.objectStore('q');const r=f(s);t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>no(t.error);});}
const qPut=o=>tx('readwrite',s=>s.put(o)),qAll=()=>tx('readonly',s=>s.getAll()),qDel=k=>tx('readwrite',s=>s.delete(k));
// 把佇列逐張上傳；call=Apps Script 呼叫；onDone(item,fileId)
async function flush(call,onDone){const all=await qAll()||[];let n=0;for(const it of all){const r=await call({a:'photo',name:it.name,iv:it.iv,ct:it.ct});if(!r||!r.ok||!r.id)throw new Error((r&&r.error)||'上傳失敗');await onDone(it,r.id);await qDel(it.k);n++;}return n;}
g.SJFPhoto={exifDate,stamp,fmtDT,enc,dec,qPut,qAll,qDel,flush};
})(window);
