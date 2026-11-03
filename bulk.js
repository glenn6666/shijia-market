// 十甲發市場：大量新增／更新攤位、批量繳費匯入（純函式，可在 node 測試）
(function(g){
const U=s=>String(s??'').trim().toUpperCase(),T=s=>String(s??'').trim();
// 解析貼上的文字（Excel 複製＝Tab 分隔）或 CSV
function parseText(t){t=String(t||'').replace(/^\ufeff/,'').replace(/\r\n?/g,'\n');const tab=t.includes('\t'),rows=[];let r=[],f='',q=false;
 for(let i=0;i<t.length;i++){const c=t[i];
  if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++;}else q=false;}else f+=c;continue;}
  if(c=='"'&&f==='')q=true;else if(c==(tab?'\t':',')){r.push(f);f='';}else if(c=='\n'){r.push(f);rows.push(r);r=[];f='';}else f+=c;}
 if(f!==''||r.length){r.push(f);rows.push(r);}return rows.filter(x=>x.some(v=>T(v)!==''));}
// 讀 .xlsx 第一個工作表（不需外掛：用瀏覽器內建解壓）
async function readXlsx(buf){const u=new Uint8Array(buf),dv=new DataView(u.buffer,u.byteOffset,u.byteLength);let e=u.length-22;while(e>=0&&dv.getUint32(e,true)!=0x06054b50)e--;if(e<0)throw new Error('不是 xlsx 檔');
 const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const F={},td=new TextDecoder();
 for(let i=0;i<n;i++){const m=dv.getUint16(p+10,true),cs=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true);F[td.decode(u.subarray(p+46,p+46+nl))]={m,cs,off};p+=46+nl+xl+cl;}
 const get=async nm=>{const f=F[nm];if(!f)return null;const o=f.off,d=u.subarray(o+30+dv.getUint16(o+26,true)+dv.getUint16(o+28,true)).subarray(0,f.cs);
  if(f.m==0)return td.decode(d);return await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();};
 const dx=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(m,c)=>String.fromCharCode(c)).replace(/&amp;/g,'&');
 const ss=[],sx=await get('xl/sharedStrings.xml');if(sx)for(const m of sx.matchAll(/<si>([\s\S]*?)<\/si>/g))ss.push(dx([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x=>x[1]).join('')));
 const wb=await get('xl/workbook.xml')||'',rel=await get('xl/_rels/workbook.xml.rels')||'';let sp='xl/worksheets/sheet1.xml';
 const rid=(/<sheet [^>]*r:id="([^"]+)"/.exec(wb)||[])[1];if(rid){const t=(new RegExp('Id="'+rid+'"[^>]*Target="([^"]+)"').exec(rel)||new RegExp('Target="([^"]+)"[^>]*Id="'+rid+'"').exec(rel)||[])[1];if(t)sp=t.startsWith('/')?t.slice(1):'xl/'+t.replace(/^\.\//,'');}
 const sh=await get(sp);if(!sh)throw new Error('讀不到工作表');const rows=[];
 for(const rm of sh.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)){const r=[];for(const cm of rm[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){const a=cm[1],ref=(/r="([A-Z]+)/.exec(a)||[])[1],ty=(/t="(\w+)"/.exec(a)||[])[1],b=cm[2]||'';
   let ci=r.length;if(ref){ci=0;for(const ch of ref)ci=ci*26+ch.charCodeAt(0)-64;ci--;}
   let v=(/<v>([\s\S]*?)<\/v>/.exec(b)||[])[1];if(ty=='s')v=ss[+v];else if(ty=='inlineStr')v=[...b.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x=>x[1]).join('');if(v!=null&&ty!='s')v=dx(v);
   while(r.length<ci)r.push('');r[ci]=v??'';}rows.push(r);}
 return rows.filter(x=>x.some(v=>T(v)!==''));}
// 依表頭別名對應欄位
function mapCols(head,AL){const ix={};head.forEach((h,i)=>{const k=T(h).replace(/\s|＊|\*/g,'');for(const f in AL)if(ix[f]==null&&AL[f].some(a=>k==a||(a.length>1&&k.startsWith(a)))){ix[f]=i;break;}});return ix;}
const SAL={id:['攤位編號','攤位','攤號','編號'],name:['租客姓名','租客','租戶','姓名','名稱'],tel:['電話','手機'],note:['備註'],ym:['生效年月','年月範圍','年月'],type:['日租/月租','租別','類型'],day:['攤位(日租)','日租'],mon:['攤位(月租)','月租','租金'],ice:['冰庫(月租)','冰庫'],park:['停車位租金','停車費','停車'],clean:['清潔費','清潔'],restore:['復原']};
const STALL_HEAD=['攤位編號','租客姓名','電話','備註','生效年月','日租/月租','攤位(日租)','攤位(月租)','冰庫(月租)','停車位租金','清潔費'];
const nOK=v=>T(v)===''||isFinite(+String(v).replace(/,/g,'')),nv=v=>+String(v).replace(/,/g,'')||0;
// 攤位：rows（含表頭）→ 預覽計畫。ctx:{stalls:D.stalls, rentOf:id=>目前租金{type,day,mon,ice,park,clean}, ymk}
function planStalls(rows,ctx){if(!rows.length)return {err:'沒有資料'};const ix=mapCols(rows[0],SAL);if(ix.id==null)return {err:'找不到「攤位編號」欄（第一列要是表頭）'};
 const ex={};ctx.stalls.forEach(s=>ex[U(s.id)]=s);const seen=new Set(),out=[];
 rows.slice(1).forEach((r,i)=>{const g=f=>ix[f]==null?'':T(r[ix[f]]),id=g('id'),o={line:i+2,id,act:'',msg:[],v:{}};
  for(const f in SAL)if(f!='id')o.v[f]=g(f);
  if(!id){o.act='skip';o.msg.push('沒有攤位編號');return out.push(o);}
  if(seen.has(U(id))){o.act='skip';o.msg.push('檔案內重複，只取第一列');return out.push(o);}seen.add(U(id));
  const bad=['day','mon','ice','park','clean'].filter(f=>!nOK(o.v[f]));if(bad.length){o.act='skip';o.msg.push('金額不是數字');return out.push(o);}
  if(o.v.ym&&!/^\d{5}$/.test(o.v.ym)){o.act='skip';o.msg.push('生效年月要像 11511');return out.push(o);}
  if(o.v.type&&!/^(日租|月租)$/.test(o.v.type)){o.act='skip';o.msg.push('日租/月租 只能填 日租 或 月租');return out.push(o);}
  const s=ex[U(id)],hasRent=['type','day','mon','ice','park','clean'].some(f=>o.v[f]!=='');
  if(!s){o.act='new';o.msg.push('新增攤位');}
  else{const off=s.off&&+s.off<=ctx.ymk;const cur=ctx.rentOf(s.id)||{};const ch=[];
   if(o.v.name!==''&&o.v.name!=T(s.name))ch.push(`租客 ${s.name||'（空）'}→${o.v.name}`);if(o.v.tel!==''&&o.v.tel!=T(s.tel))ch.push('電話');if(o.v.note!==''&&o.v.note!=T(s.note))ch.push('備註');
   ['day','mon','ice','park','clean'].forEach(f=>{if(o.v[f]!==''&&nv(o.v[f])!=(+cur[f]||0))ch.push(`${({day:'日租',mon:'月租',ice:'冰庫',park:'停車',clean:'清潔'})[f]} ${+cur[f]||0}→${nv(o.v[f])}`);});
   if(o.v.type&&o.v.type!=(cur.type||'月租'))ch.push('租別→'+o.v.type);
   o.id=s.id;o.off=off;
   if(off&&!/^(是|Y|y|1|復原)$/.test(o.v.restore)){o.act='skip';o.msg.push('這攤已移除（復原欄填「是」才會復原並更新）');return out.push(o);}
   if(!ch.length&&!off){o.act='same';o.msg.push('資料都一樣，不用改');return out.push(o);}
   o.act='upd';o.msg.push((off?'復原＋':'')+(ch.join('、')||'更新'));o.rentCh=hasRent&&ch.some(c=>/日租|月租|冰庫|停車|清潔|租別/.test(c));}
  out.push(o);});return {rows:out,ix};}
// 套用到 L（呼叫端之後 saveLocal）
function applyStalls(L,plan,ctx){let n=0;const d=ctx.today;
 plan.rows.forEach(o=>{if(o.act!='new'&&o.act!='upd')return;const v=o.v,ym=+v.ym||ctx.ymk;
  if(o.act=='new'){(L.stallNew=L.stallNew||[]).push({id:o.id,name:v.name,tel:v.tel,note:v.note});
   (L.rent=(L.rent||[]).filter(x=>!(x[0]==ym&&U(x[1])==U(o.id)))).push([ym,o.id,v.name,v.type||'月租',nv(v.day),nv(v.mon),nv(v.ice),nv(v.park),nv(v.clean)]);}
  else{const s=ctx.stalls.find(x=>U(x.id)==U(o.id))||{},k=U(o.id),cur=Object.assign({name:s.name||'',tel:s.tel||'',note:s.note||''},(L.stall||{})[k]||{});
   if(v.name!=='')cur.name=v.name;if(v.tel!=='')cur.tel=v.tel;if(v.note!=='')cur.note=v.note;if(o.off){cur.off=0;cur.offAt='';}(L.stall=L.stall||{})[k]=cur;
   if(o.rentCh){const r=ctx.rentOf(o.id)||{},p=f=>v[f]!==''?nv(v[f]):(+r[f]||0);
    (L.rent=(L.rent||[]).filter(x=>!(x[0]==ym&&U(x[1])==k))).push([ym,o.id,v.name!==''?v.name:cur.name,v.type||r.type||'月租',p('day'),p('mon'),p('ice'),p('park'),p('clean')]);}}
  n++;});return n;}
// 繳費
const PAL={st:['攤位編號','攤位','攤號'],nm:['租客姓名','姓名','租客'],amt:['金額','實收','現金'],paym:['付款方式','方式'],camt:['另收票據金額','票據金額'],bill:['票據編號'],bdue:['票據到期日'],d:['繳費日期','日期'],y:['銷帳年'],m:['銷帳月'],item:['繳款項目','項目'],who:['經手人'],memo:['備註'],cr:['溢收轉下月','溢收']};
const PAY_HEAD=['攤位編號','金額','付款方式','另收票據金額','票據編號','票據到期日','繳費日期','銷帳年','銷帳月','繳款項目','經手人','備註','溢收轉下月'];
const yes=v=>/^(是|Y|y|1|要|V|v|✓)$/.test(T(v));
function normDate(s,def){s=T(s);if(!s)return def;if(/^\d{5}$/.test(s)&&+s>20000){const d=new Date(Date.UTC(1899,11,30)+(+s)*864e5);return d.toISOString().slice(0,10).replace(/-/g,'/');}
 const m=/^(\d{2,4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/.exec(s);if(!m)return null;let y=+m[1];if(y<1000)y+=1911;return y+'/'+String(m[2]).padStart(2,'0')+'/'+String(m[3]).padStart(2,'0');}
// ctx:{Y,M,dueOf:(id,y,m)=>{id,name,bal}|null, paym:[...], items:[...], today:'2026/11/03', BP:'票據'}
function planPays(rows,ctx){if(!rows.length)return {err:'沒有資料'};const ix=mapCols(rows[0],PAL);if(ix.st==null||(ix.amt==null&&ix.camt==null))return {err:'找不到「攤位編號」或「金額」欄（第一列要是表頭）'};
 const run={},out=[];
 rows.slice(1).forEach((r,i)=>{const g=f=>ix[f]==null?'':T(r[ix[f]]),o={line:i+2,st:g('st'),err:[],warn:[]};
  const y=+(g('y')||ctx.Y),m=+(g('m')||ctx.M);o.y=y;o.m=m;
  const x=o.st&&ctx.dueOf(o.st,y,m);if(!o.st)o.err.push('沒有攤位');else if(!x)o.err.push('查無此攤位（或已移除）');
  if(!nOK(g('amt'))||!nOK(g('camt')))o.err.push('金額不是數字');
  o.amt=nv(g('amt'));o.camt=nv(g('camt'));if(!o.amt&&!o.camt&&!o.err.length)o.err.push('金額是 0');
  if(!(m>=1&&m<=12)||!(y>100&&y<200))o.err.push('銷帳年月不對');
  o.paym=g('paym')||'現金';if(/^票/.test(o.paym))o.paym=ctx.BP;else if(/^現/.test(o.paym))o.paym=(ctx.paym||[]).find(p=>/現金/.test(p))||'現金';
  if(ctx.paym&&ctx.paym.length&&!ctx.paym.includes(o.paym))o.warn.push('付款方式「'+o.paym+'」不在清單');
  o.d=normDate(g('d'),ctx.today);if(!o.d){o.err.push('日期看不懂');o.d='';}
  o.item=g('item')||'不分項目 月結款';o.bill=g('bill');o.bdue=normDate(g('bdue'),'')||'';o.who=g('who');o.memo=g('memo');o.cr=yes(g('cr'));
  o.ck=/票據/.test(o.paym);if((o.ck||o.camt)&&!o.bill)o.warn.push('票據沒填編號');
  if(x){o.id=x.id;o.nm=g('nm')||x.name;const k=U(x.id)+'|'+y+'|'+m;if(run[k]==null)run[k]=+x.bal||0;o.bal=run[k];o.due=x.due;
   const tot=o.amt+o.camt;o.over=Math.max(0,tot-Math.max(o.bal,0));run[k]-=tot;
   if(o.bal<=0&&tot>0)o.warn.push('這攤本月已繳清，整筆都是溢收');else if(o.over>0)o.warn.push(`溢收 ${o.over}`+(o.cr?'（轉下月）':'（算本月）'));else if(tot<o.bal)o.warn.push(`少繳 ${o.bal-tot}`);}
  o.ok=!o.err.length;out.push(o);});return {rows:out};}
// 產生繳費紀錄（和單筆「登記繳費」相同規則：現金＋票據拆兩筆、溢收可轉下月、先從現金拆）
function buildPays(o,ctx,seq){const grp=o.camt||(o.cr&&o.over>0)?'G'+Date.now().toString(36)+seq:'';
 const mk=(amt,pay,ck,j)=>({k:'L'+Date.now().toString(36)+seq+j+Math.random().toString(36).slice(2,5),st:o.id,nm:o.nm,y:String(o.y),m:String(o.m),d:o.d,item:o.item,amt,pay,bill:ck?o.bill:'',bdue:ck?o.bdue:'',inv:'',who:o.who,memo:o.memo,local:1,...(grp?{grp}:{})});
 let P=[];if(o.amt||!o.camt)P.push(mk(o.amt,o.paym,o.ck||!o.camt,'a'));if(o.camt)P.push(mk(o.camt,ctx.BP,true,'b'));
 if(o.cr&&o.over>0){let ex=o.over;const [ny,nm]=o.m==12?[o.y+1,1]:[o.y,o.m+1],add=[];P.sort((a,b)=>(/票據/.test(a.pay)?1:0)-(/票據/.test(b.pay)?1:0));
  for(const p of P){if(ex<=0)break;const t=Math.min(ex,p.amt);if(t<=0)continue;p.amt-=t;ex-=t;add.push({...p,k:p.k+'c',amt:t,y:String(ny),m:String(nm),memo:(p.memo?p.memo+'；':'')+`溢收款轉下月（${o.y}/${o.m} 溢收）`});}
  P=P.filter(p=>p.amt).concat(add);}
 return P;}
g.SJFBulk={parseText,readXlsx,planStalls,applyStalls,planPays,buildPays,STALL_HEAD,PAY_HEAD,normDate};
})(typeof window!='undefined'?window:globalThis);
