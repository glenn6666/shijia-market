// 十甲發市場：員工權限（老闆簽章）＋修改紀錄＋還原
// 權限設定存在同步資料 L.perm，由老闆私鑰（用老闆密碼加密，存 perm.key.json）做 ECDSA 簽章；員工端只有公鑰，竄改的設定會被忽略。
// 注意：純前端網站無法完全阻止懂技術的人改程式碼繞過，這是防「不小心改錯」用的。
(function(g){
const PUB={kty:'EC',crv:'P-256',x:'gECClnRipGQ_7re4ILEnoNXR8LYnI2Mbnyt78mEGmkI',y:'pMZ3owJ2iyjDe3s9dBWrSwuYqPb1_hdd0Wk5ZFNvb_s'};
const SEP='\u0001',te=new TextEncoder();
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)),tob64=u=>btoa(String.fromCharCode(...new Uint8Array(u)));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// 區塊：資料類別 → 權限區塊
const SEC={stall:'攤位建檔（含租金、移除／復原）',pay:'繳費登記（含刪除）',meter:'水電錶登記（含拍照）',jr:'日帳流水帳',dep:'已收保證金'};
const CAT={stall:'stall',stallNew:'stall',rent:'stall',pay:'pay',payDel:'pay',meter:'meter',photo:'meter',jr:'jr',jrDel:'jr',dep:'dep',perm:'perm'};
const CLBL={stall:'攤位資料',stallNew:'新增攤位',rent:'租金費率',pay:'繳費',payDel:'刪除原表繳費',meter:'水電錶讀數',photo:'電錶照片',jr:'流水帳',jrDel:'刪除原表流水帳',dep:'保證金',perm:'權限設定'};
const DEF={stall:'edit',pay:'edit',meter:'edit',jr:'edit',dep:'edit'};
let OWNER=null,LASTOK=null;// OWNER: 老闆私鑰（只在記憶體）
const canonCfg=c=>JSON.stringify({p:Object.keys(SEC).reduce((o,k)=>(o[k]=c.p&&c.p[k]=='view'?'view':'edit',o),{}),t:+c.t||0});
let pubKey=null;const pk=async()=>pubKey||(pubKey=await crypto.subtle.importKey('jwk',PUB,{name:'ECDSA',namedCurve:'P-256'},false,['verify']));
async function verify(L){const r=(L.perm||[])[0];if(!r||!r.cfg||!r.sig)return null;
 try{const ok=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},await pk(),b64(r.sig),te.encode(canonCfg(r.cfg)));return ok?JSON.parse(canonCfg(r.cfg)):false;}catch(e){return false;}}
// 目前生效的權限：簽章正確才採用；簽章錯（被竄改）沿用這台上次驗過的，否則用預設
async function current(L){const v=await verify(L);if(v){LASTOK=v;try{localStorage.sjf_perm_ok=JSON.stringify(v);}catch(e){}return {cfg:v,state:'ok'};}
 if(!LASTOK)try{LASTOK=JSON.parse(localStorage.sjf_perm_ok||'null');}catch(e){}
 return {cfg:LASTOK||{p:DEF,t:0},state:v===false?'bad':'none'};}
async function ownerUnlock(pw){const E=await (await fetch('perm.key.json',{cache:'no-store'})).json();
 const km=await crypto.subtle.importKey('raw',te.encode(pw),'PBKDF2',false,['deriveKey']);
 const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(E.salt),iterations:E.it,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
 const jwk=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(E.iv)},k,b64(E.ct))));
 OWNER=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);return true;}
async function sign(p){const cfg=JSON.parse(canonCfg({p,t:Date.now()}));const s=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},OWNER,te.encode(canonCfg(cfg)));return [{cfg,sig:tob64(s)}];}
const isOwner=()=>!!OWNER;
// 比對兩份快照，列出變動（不含紀錄本身）
function diff(prev,next){const out=[],keys=new Set([...Object.keys(prev||{}),...Object.keys(next||{})]);
 for(const k of keys){const c=k.slice(0,k.indexOf(SEP));if(c=='log')continue;const o=prev?prev[k]:undefined,n=next[k];if(o===n)continue;out.push({c,k,o:o??null,n:n??null});}return out;}
function blocked(ch,cfg){if(OWNER)return [];const s=new Set();ch.forEach(x=>{const sec=CAT[x.c];if(sec=='perm')s.add('權限設定（只有老闆能改）');else if(cfg.p[sec]=='view')s.add(SEC[sec]);});return [...s];}
// 從異動推出攤位與說明
function stallOf(x,lk){const k=x.k.slice(x.k.indexOf(SEP)+1),v=JSON.parse(x.n||x.o||'null');
 switch(x.c){case 'meter':return v[0];case 'rent':return v[1];case 'stallNew':return v.id;case 'stall':return k;case 'pay':return v.st;case 'photo':return k.split('|')[0];case 'dep':return k;
  case 'payDel':case 'jrDel':return lk?lk(x.c,k):'';default:return '';}}
const ME={meter:['攤位','年','月','電1讀數','電1費率','電2讀數','電2費率','水1讀數','水1費率','水2讀數','水2費率','備註'],rent:['生效','攤位','姓名','類別','日租','月租','冰庫','停車','清潔']};
function fields(x){const o=JSON.parse(x.o||'null'),n=JSON.parse(x.n||'null');if(x.c=='payDel'||x.c=='jrDel')return o?'取消刪除（還原）':'刪除';
 if(!o)return '新增 '+brief(x.c,n);if(!n)return '刪除 '+brief(x.c,o);
 const out=[];if(Array.isArray(o)){o.forEach((v,i)=>{if(JSON.stringify(v)!==JSON.stringify(n[i]))out.push(`${(ME[x.c]||[])[i]||i}：${v}→${n[i]}`);});}
 else{const ks=new Set([...Object.keys(o),...Object.keys(n)]);ks.forEach(k=>{if(JSON.stringify(o[k])!==JSON.stringify(n[k]))out.push(`${k}：${o[k]??'（空）'}→${n[k]??'（空）'}`);});}
 return out.join('；')||'（無差異）';}
function brief(c,v){if(Array.isArray(v))return v.map((x,i)=>ME[c]&&ME[c][i]?ME[c][i]+' '+x:x).join('，');if(v&&typeof v=='object'){if(c=='pay')return `${v.y}/${v.m} ${v.item||''} ${v.pay||''} ${v.amt}`;if(c=='jr')return `${v.date} ${v.item||''} ${v.amt}`;if(c=='perm')return Object.entries(v.cfg?.p||{}).map(([k,s])=>(SEC[k]||k).split('（')[0]+'：'+(s=='view'?'只能看':'可編輯')).join('，');return Object.entries(v).filter(([k])=>k!='_ts').map(([k,x])=>k+' '+x).join('，');}return String(v??'');}
function mkLog(ch,op,undo){const t=Date.now();return ch.map((x,i)=>Object.assign({id:t.toString(36)+i.toString(36)+Math.random().toString(36).slice(2,5),t,op:op||'（未填）',role:OWNER?'老闆':'員工'},x,undo?{u:undo}:{}));}
// 還原：把該筆紀錄改回舊值（舊值是空 → 刪掉新增的）
function revert(L,S,e){const m=S.toMap(L),cur=m[e.k]===undefined?null:JSON.stringify(m[e.k]);
 if(e.o===null)delete m[e.k];else m[e.k]=JSON.parse(e.o);const N=S.fromMap(m,L._ts||{});N._ts=L._ts;N._del=L._del;N.log=L.log;N.perm=e.c=='perm'?N.perm:L.perm;return {N,changed:cur!==e.n};}
const canUndo=(e,op)=>OWNER||(e.op===op&&Date.now()-e.t<864e5);
g.SJFAudit={SEC,CAT,CLBL,DEF,current,ownerUnlock,sign,isOwner,diff,blocked,stallOf,fields,mkLog,revert,canUndo,esc};
})(window);
