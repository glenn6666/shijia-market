// 十甲發市場：本機異動的逐筆合併 + Google 試算表（Apps Script）加密同步
// 雲端只收到 AES-GCM 加密後的整包（iv/ct），明文只存在瀏覽器裡。
(function(g){
const U=s=>String(s||'').toUpperCase(),SEP='\u0001';
const SPEC={pay:['a',p=>p.k],payDel:['s'],meter:['a',r=>U(r[0])+'|'+r[1]+'|'+r[2]],jr:['a',j=>j.k],jrDel:['s'],rent:['a',r=>r[0]+'|'+U(r[1])],stall:['o'],stallNew:['a',s=>U(s.id)],dep:['o'],photo:['o']};
function toMap(L){const m={};for(const c in SPEC){const[t,f]=SPEC[c],v=L&&L[c];if(!v)continue;
 if(t=='a')v.forEach(x=>m[c+SEP+f(x)]=x);else if(t=='s')v.forEach(x=>m[c+SEP+x]=1);else for(const k in v)m[c+SEP+k]=v[k];}return m;}
function fromMap(m,ts){const L={},keys=Object.keys(m).sort((a,b)=>(ts[a]||0)-(ts[b]||0));
 for(const key of keys){const i=key.indexOf(SEP),c=key.slice(0,i),k=key.slice(i+1),t=SPEC[c][0];
  if(t=='a')(L[c]=L[c]||[]).push(m[key]);else if(t=='s')(L[c]=L[c]||[]).push(k);else(L[c]=L[c]||{})[k]=m[key];}return L;}
function snap(L){const m=toMap(L),s={};for(const k in m)s[k]=JSON.stringify(m[k]);return s;}
// 跟上次快照比，有變動的紀錄蓋上新時間戳記，消失的紀錄留下刪除標記
function stamp(L,prev,now,dflt){const ts=Object.assign({},L._ts),del=Object.assign({},L._del),m=toMap(L);
 for(const k in m){const s=JSON.stringify(m[k]);if(!ts[k])ts[k]=!prev||(k in prev&&prev[k]===s)?(dflt||now):now;else if(prev&&prev[k]!==s)ts[k]=now;}
 if(prev)for(const k in prev)if(!(k in m)){del[k]=now;delete ts[k];}
 for(const k in ts)if(!(k in m))delete ts[k];
 L._ts=ts;L._del=del;return L;}
// 逐筆合併：時間較新的勝出；刪除標記比資料新才算刪除
function merge(A,B){const ma=toMap(A),mb=toMap(B),ta=A._ts||{},tb=B._ts||{},da=A._del||{},db=B._del||{},m={},ts={},del={};
 const keys=new Set([...Object.keys(ma),...Object.keys(mb),...Object.keys(da),...Object.keys(db)]);
 for(const k of keys){let v,t=-1;
  if(k in ma){v=ma[k];t=ta[k]||0;}
  if(k in mb){const t2=tb[k]||0;if(t2>t||(t2==t&&v!==undefined&&JSON.stringify(mb[k])>JSON.stringify(v))||v===undefined){v=mb[k];t=t2;}}
  const dt=Math.max(da[k]||0,db[k]||0);
  if(v!==undefined&&t>=dt){m[k]=v;ts[k]=t;}else if(dt)del[k]=dt;}
 const L=fromMap(m,ts);L._ts=ts;L._del=del;return L;}
function canon(L){const m=toMap(L),o={};Object.keys(m).sort().forEach(k=>o[k]=[m[k],(L._ts||{})[k]]);return JSON.stringify([o,Object.keys(L._del||{}).sort().map(k=>[k,L._del[k]])]);}

const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)),tob64=u=>{let s='';const a=new Uint8Array(u);for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode.apply(null,a.subarray(i,i+8192));return btoa(s);};
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
// 同步用金鑰與通行碼都由登入密碼推導（固定鹽），密碼本身不會送出
async function keys(pw){const te=new TextEncoder();
 const token=hex(await crypto.subtle.digest('SHA-256',te.encode('sjf-sync-token-v1|'+pw)));
 const km=await crypto.subtle.importKey('raw',te.encode(pw),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:te.encode('sjf-sync-salt-v1'),iterations:150000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 return {token,key};}
async function enc(key,obj){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(obj)));return {iv:tob64(iv),ct:tob64(ct)};}
async function dec(key,o){return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(o.iv)},key,b64(o.ct))));}

// o: {url, token, key, device, getL(), setL(L), base(), setBase(t), status(s,msg), fetch}
function Engine(o){const F=o.fetch||((...a)=>fetch(...a));let busy=null,again=false,timer=null;
 async function call(body){const r=await F(o.url(),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({token:o.token},body)),redirect:'follow'});
  if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();if(j.error&&!j.conflict)throw new Error(j.error);return j;}
 async function once(){for(let n=0;n<5;n++){
   const g=await call({a:'get'});let L=o.getL(),remote=null;
   if(g.blob){remote=await dec(o.key,g.blob);}
   const M=remote?merge(L,remote):L;
   if(canon(M)!==canon(L))await o.setL(M);
   const srvT=g.blob?g.blob.t:0;
   if(remote&&canon(M)===canon(remote)){o.setBase(srvT);return 'same';}
   if(!remote&&!Object.keys(toMap(M)).length&&!Object.keys(M._del||{}).length){o.setBase(0);return 'empty';}
   const blob=await enc(o.key,M);
   const s=await call({a:'save',base:srvT,dev:o.device,iv:blob.iv,ct:blob.ct});
   if(s.ok){o.setBase(s.t);return 'pushed';}
   if(!s.conflict)throw new Error(s.error||'save failed');}
  throw new Error('衝突重試太多次');}
 async function run(){if(!o.url())return o.status('off');if(busy){again=true;return busy;}
  o.status('busy');busy=(async()=>{try{do{again=false;await once();}while(again);o.status('ok');}
   catch(e){o.status(typeof navigator!='undefined'&&navigator.onLine===false?'offline':'err',String(e.message||e));}
   finally{busy=null;}})();return busy;}
 return {run,soon(ms){clearTimeout(timer);if(o.url())o.status('pending');timer=setTimeout(run,ms==null?1500:ms);},call};}
g.SJFSync={toMap,fromMap,snap,stamp,merge,canon,keys,enc,dec,Engine};
})(typeof window!='undefined'?window:globalThis);
