// 🔐 年度報表（老闆專用）：仿「年度報表.xlsx」— 年度報表／電費差價／水費差價／年度比較
// 需另一組「老闆密碼」解開 owner.enc.json（員工共用密碼解不開）；未解鎖前不計算、不顯示。
(function(G){
const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const f=v=>v==null||v===''?'':(v<0?'-':'')+Math.abs(Math.round(v)).toLocaleString('en-US');
const MN=['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
const INC=['固定租金','臨時租金','停車位收入','清潔費','電費','水費','冰庫收入','其他收入'];
const EA=[['台電(東光路136巷)',/東光路136/],['台電(十甲路101-7號)',/101-7/],['台電(十甲路101-9號)',/101-9/],['台電(十甲路61號)',/十甲路61/],['台電(十甲路71號1樓)',/十甲路71/],['台電(東光路120號)',/東光路120/]];
const WA=[['(東光路120號)',/東光路120/],['(十甲路101-7號)',/101-7/],['(十甲路71號)',/十甲路71/]];
const sum=a=>a.some(v=>v!=null)?a.reduce((s,v)=>s+(+v||0),0):null;
const ymS=(y,m)=>(y+1911)+'年'+String(m).padStart(2,'0')+'月';
// 網頁資料計算（應收制，跟損益表同一套算法）
function live(D,y){const C=G.MarketCalc,last=D.ym[0]*100+D.ym[1],met=new Set(C.allYM(D)),r0=Math.min(...D.rents.map(r=>+r[0]));
  const J=C.journal(D),jy={};J.forEach(j=>{(jy[j.ym]=jy[j.ym]||[]).push(j);});
  const rows={};INC.concat(['費用','存款餘額']).forEach(k=>rows[k]=Array(12).fill(null));
  const bonus=[],el=Array.from({length:12},()=>Array(EA.length+1).fill(null)),wa=Array.from({length:12},()=>Array(WA.length+1).fill(null)),miss=[];
  for(let m=1;m<=12;m++){const i=m-1,k=y*100+m;if(k>last)continue;
    const jm=(jy[ymS(y,m)]||[]).filter(j=>(+j.amt||0)!==0);
    if(k>=r0){const R=C.compute(D,y,m).filter(o=>o.ar),tmp=o=>/^臨時/.test(o.id),S=(g,w)=>R.filter(w||(()=>1)).reduce((a,o)=>a+(+g(o)||0),0);
      rows.固定租金[i]=S(o=>o.rent.mon,o=>!tmp(o));rows.臨時租金[i]=S(o=>o.rent.day)+S(o=>o.rent.mon,tmp);rows.停車位收入[i]=S(o=>o.rent.park);
      rows.清潔費[i]=S(o=>o.rent.clean);rows.冰庫收入[i]=S(o=>o.rent.ice);
      const [my,mm]=C.prevYM(y,m),[py,pm]=C.prevYM(my,mm);
      if(met.has(my*100+mm)&&met.has(py*100+pm)){rows.電費[i]=S(o=>o.elec);rows.水費[i]=S(o=>o.water);}else miss.push(`${m}月 電費／水費（缺 ${py}/${pm} 或 ${my}/${mm} 抄表）`);}
    else miss.push(`${m}月 租金類（網頁最早租金資料 ${Math.floor(r0/100)}/${r0%100}）`);
    if(jm.length){rows.其他收入[i]=jm.filter(j=>j.pl==='營業收入').reduce((a,j)=>a+j.signed,0);rows.費用[i]=-jm.filter(j=>j.pl==='營業支出').reduce((a,j)=>a+j.signed,0);
      jm.filter(j=>j.pl==='營業支出'&&/獎金/.test(j.item)).forEach(j=>bonus.push([m,j.item,+j.amt]));
      jm.filter(j=>j.pl==='營業支出'&&(j.cat==='電費'||/電費|台電/.test(j.item))&&!/抄|工程|顧問/.test(j.item)).forEach(j=>{const x=EA.findIndex(a=>a[1].test(j.item));const c=x<0?EA.length:x;el[i][c]=(el[i][c]||0)+(+j.amt);});
      jm.filter(j=>j.pl==='營業支出'&&/水費/.test(j.item)&&!/抄/.test(j.item)).forEach(j=>{const x=WA.findIndex(a=>a[1].test(j.item));const c=x<0?WA.length:x;wa[i][c]=(wa[i][c]||0)+(+j.amt);});}
    else miss.push(`${m}月 其他收入／費用／台電／水費帳單（流水帳 ${ymS(y,m)} 沒有資料）`);}
  return {rows,bonus,el,wa,miss};}
// 原年度報表檔（只在老闆加密檔裡）
function hist(H,y){const a=H.annual[y];if(!a)return null;const rows={};INC.concat(['費用','存款餘額']).forEach(k=>rows[k]=(a.rows[k]||Array(12).fill(null)).slice());
  const cv=(S,n)=>{const s=S&&S[y];if(!s)return Array.from({length:12},()=>Array(n+1).fill(null));return s.rows.map(r=>{const o=Array(n+1).fill(null);s.cols.forEach((c,ci)=>{if(ci==0)return;const v=r[ci];if(v==null)return;const x=(n==EA.length?EA:WA).findIndex(q=>q[0].replace(/^台電/,'')==c.replace(/^台電/,''));o[x<0?n:x]=(o[x<0?n:x]||0)+v;});return o;});};
  return {rows,bonus:a.bonus,el:cv(H.elec,EA.length),wa:cv(H.water,WA.length),miss:[],cumOverride:a.cumOverride};}
function finish(o,bank){const r=o.rows;if(bank)r.存款餘額=bank.slice();
  r.總計=MN.map((_,i)=>{const v=INC.map(k=>r[k][i]);return v.some(x=>x!=null)?v.reduce((s,x)=>s+(+x||0),0):null;});
  r.損益=MN.map((_,i)=>r.總計[i]==null&&r.費用[i]==null?null:(r.總計[i]||0)-(r.費用[i]||0));let c=0,any=false;r.累計=r.損益.map(v=>{if(v==null)return any?c:null;any=true;c+=v;return c;});
  o.elecRecv=r.電費;o.waterRecv=r.水費;return o;}
function build(D,H,y,mode){const h=H&&H.hist?hist(H.hist,y):null;let o;
  if(mode==='hist'){o=h||{rows:Object.fromEntries(INC.concat(['費用','存款餘額']).map(k=>[k,Array(12).fill(null)])),bonus:[],el:[],wa:[],miss:['原年度報表檔沒有這一年']};finish(o);}
  else{o=live(D,y);finish(o,h?h.rows.存款餘額:null);if(!h||h.rows.存款餘額.every(v=>v==null))o.miss.push('存款餘額（網頁沒有銀行資料；原年度報表檔也沒有這一年）');
    else h.rows.存款餘額.forEach((v,i)=>{if(v==null&&(y*100+i+1)<=D.ym[0]*100+D.ym[1])o.miss.push(`${i+1}月 存款餘額（原檔空白）`);});}
  o.y=y;o.mode=mode;o.cmp=h&&mode!=='hist'?(()=>{finish(h);return h;})():null;return o;}
function compareYears(D,H,mode,y1){const ys=[];for(let y=110;y<=y1;y++)ys.push(y);const T={};ys.forEach(y=>{const o=build(D,H,y,mode);T[y]=o.rows;});
  const K=INC.concat(['總計','費用','損益']);return {ys,rows:K.map(k=>[k,ys.map(y=>sum(T[y][k]))]),bank:ys.map(y=>{const b=T[y].存款餘額.filter(v=>v!=null);return b.length?b[b.length-1]:null;})};}
const CSS=`.an-pg{background:#fff;color:#000;font:10px "Microsoft JhengHei","PMingLiU",sans-serif;width:277mm;margin:0 auto 6mm;page-break-after:always}
.an-pg:last-child{page-break-after:auto}.an-pg h2{text-align:center;font-size:15px;margin:0 0 2mm}.an-t{border-collapse:collapse;width:100%}
.an-t th,.an-t td{border:1px solid #000;padding:1px 3px;white-space:nowrap}.an-t td{text-align:right}.an-t td:first-child,.an-t th:first-child{text-align:left}
.an-t tr.b td{font-weight:bold;background:#f2f2f2}.an-t .sp td{border:0;height:6px}.an-d{color:#b00}.an-note{font-size:9px;margin-top:2mm}
@media print{@page{size:A4 landscape;margin:8mm}body *{visibility:hidden}#anprint,#anprint *{visibility:visible}#anprint{position:absolute;left:0;top:0}.an-noprint{display:none}}`;
function tRow(lab,a,tot,cls){return `<tr class="${cls||''}"><td>${e(lab)}</td>${a.map(v=>`<td>${f(v)}</td>`).join('')}<td>${tot===undefined?f(sum(a)):f(tot)}</td></tr>`;}
function html(D,H,y,mode){const o=build(D,H,y,mode),r=o.rows,hd=`<tr><th></th>${MN.map(m=>`<th>${m}</th>`).join('')}<th>總計</th></tr>`;
  const bm=Array(12).fill(null),bl=Array(12).fill('');o.bonus.forEach(([m,l,v])=>{bm[m-1]=(bm[m-1]||0)+(+v||0);bl[m-1]=bl[m-1]?bl[m-1]+'／'+l:l;});
  const lastB=r.存款餘額.filter(v=>v!=null),src=mode==='hist'?'原年度報表檔':'網頁資料計算（應收制）';
  const p1=`<div class="an-pg"><h2>${y}年年度報表</h2><table class="an-t">${hd}${INC.map(k=>tRow(k,r[k])).join('')}${tRow('總計',r.總計,undefined,'b')}<tr class="sp"><td colspan=14></td></tr>
   ${tRow('費用',r.費用)}${tRow('損益',r.損益,undefined,'b')}<tr class="sp"><td colspan=14></td></tr>${tRow('累計',r.累計,r.累計.filter(v=>v!=null).pop()??null)}<tr class="sp"><td colspan=14></td></tr>
   <tr><td>備註</td>${bl.map(l=>`<td style="text-align:center;font-size:8.5px">${e(l)}</td>`).join('')}<td>獎金</td></tr>${tRow('',bm)}${tRow('存款餘額',r.存款餘額,lastB.length?lastB[lastB.length-1]:null)}</table>
   <div class="an-note">資料來源：${src}。空白＝沒有資料來源。${mode!=='hist'?'存款餘額取自原年度報表檔（網頁沒有銀行資料）。':''}</div></div>`;
  const diff=(lab,cols,M,recv)=>{const C=cols.concat(['其他']);const use=C.map((_,c)=>M.some(row=>row&&row[c]!=null));const cc=C.filter((_,c)=>use[c]);
    const rows=MN.map((mn,i)=>{const row=M[i]||[],bill=sum(row.filter((_,c)=>use[c]));return `<tr><td>${mn}</td><td>${f(recv[i])}</td>${C.map((_,c)=>use[c]?`<td>${f(row[c])}</td>`:'').join('')}<td>${f(bill)}</td><td>${recv[i]==null||bill==null?'':f(recv[i]-bill)}</td></tr>`;});
    const tot=c=>sum(MN.map((_,i)=>(M[i]||[])[c]));const tb=sum(MN.map((_,i)=>sum((M[i]||[]).filter((_,c)=>use[c]))));
    return `<div class="an-pg"><h2>${y}年${lab}</h2><table class="an-t"><tr><th></th><th>收款</th>${cc.map(c=>`<th>${e(c)}</th>`).join('')}<th>總計</th><th>金額差價</th></tr>${rows.join('')}
     <tr class="b"><td>全年統計</td><td>${f(sum(recv))}</td>${C.map((_,c)=>use[c]?`<td>${f(tot(c))}</td>`:'').join('')}<td>${f(tb)}</td><td>${sum(recv)==null||tb==null?'':f(sum(recv)-tb)}</td></tr></table>
     <div class="an-note">收款＝年度報表的${lab.slice(0,2)}列；${mode==='hist'?'帳單取自原檔':'各帳單取自日帳流水帳同月份的帳單支出（依地址歸類，抄表費／工程款不算）'}；金額差價＝收款－帳單總計。</div></div>`;};
  const p2=diff('電費差價',EA.map(a=>a[0]),o.el,o.elecRecv),p3=diff('水費差價',WA.map(a=>a[0]),o.wa,o.waterRecv);
  const Y=compareYears(D,H,mode,Math.max(y,D.ym[0]));const p4=`<div class="an-pg"><h2>年度比較（${src}）</h2><table class="an-t"><tr><th></th>${Y.ys.map(y=>`<th>${y}</th>`).join('')}<th>平均</th></tr>
   ${Y.rows.map(([k,a])=>{const v=a.filter(x=>x!=null);return `<tr class="${/總計|損益/.test(k)?'b':''}"><td>${k}</td>${a.map(x=>`<td>${f(x)}</td>`).join('')}<td>${v.length?f(v.reduce((s,x)=>s+x,0)/v.length):''}</td></tr>`;}).join('')}
   <tr><td>存款餘額(年底)</td>${Y.bank.map(x=>`<td>${f(x)}</td>`).join('')}<td></td></tr></table><div class="an-note">平均只算有資料的年度。</div></div>`;
  let cmp='';if(o.cmp){const L=[];INC.concat(['費用']).forEach(k=>o.rows[k].forEach((v,i)=>{const h=o.cmp.rows[k][i];if(v!=null&&h!=null&&Math.round(v)!==Math.round(h))L.push(`<tr><td>${MN[i]}</td><td>${k}</td><td>${f(h)}</td><td>${f(v)}</td><td class="an-d">${f(v-h)}</td></tr>`);}));
    cmp=`<div class="card an-noprint"><b>跟原年度報表檔對帳（${y}年）</b>：${L.length?`${L.length} 格不同`:'有資料的月份全部相同'}${L.length?`<div class="tbl"><table><tr><th>月</th><th>項目</th><th>原檔</th><th>網頁</th><th>差</th></tr>${L.join('')}</table></div>`:''}</div>`;}
  return {o,cmp,body:p1+p2+p3+p4};}
function xls(D,H,y,mode){const o=build(D,H,y,mode),r=o.rows,x=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const cell=v=>v==null||v===''?'<Cell/>':typeof v=='number'?`<Cell><Data ss:Type="Number">${Math.round(v)}</Data></Cell>`:`<Cell><Data ss:Type="String">${x(v)}</Data></Cell>`;
  const sh=(n,rows)=>`<Worksheet ss:Name="${x(n)}"><Table>${rows.map(a=>`<Row>${a.map(cell).join('')}</Row>`).join('')}</Table></Worksheet>`;
  const A=[[y+'年年度報表'],[''].concat(MN,['總計'])].concat(INC.map(k=>[k].concat(r[k],[sum(r[k])])),[['總計'].concat(r.總計,[sum(r.總計)]),[],['費用'].concat(r.費用,[sum(r.費用)]),['損益'].concat(r.損益,[sum(r.損益)]),[],['累計'].concat(r.累計)]);
  const bm=Array(12).fill(null),bl=Array(12).fill('');o.bonus.forEach(([m,l,v])=>{bm[m-1]=(bm[m-1]||0)+(+v||0);bl[m-1]=bl[m-1]?bl[m-1]+'／'+l:l;});
  A.push([],['備註'].concat(bl,['獎金']),[''].concat(bm,[sum(bm)]),['存款餘額'].concat(r.存款餘額));
  const dsh=(cols,M,recv)=>{const C=cols.concat(['其他']);return [['','收款'].concat(C,['總計','金額差價'])].concat(MN.map((mn,i)=>{const row=M[i]||[],b=sum(row);return [mn,recv[i]].concat(C.map((_,c)=>row[c]??null),[b,recv[i]==null||b==null?null:recv[i]-b]);}));};
  const Y=compareYears(D,H,mode,Math.max(y,D.ym[0]));
  const body=sh(y+'年度報表',A)+sh(y+'年電費差價',dsh(EA.map(a=>a[0]),o.el,o.elecRecv))+sh(y+'年水費差價',dsh(WA.map(a=>a[0]),o.wa,o.waterRecv))+sh('年度比較',[[''].concat(Y.ys)].concat(Y.rows.map(([k,a])=>[k].concat(a)),[['存款餘額(年底)'].concat(Y.bank)]));
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${body}</Workbook>`;}
G.SJFAnnual={build,html,xls,live,hist,CSS};
if(typeof document==='undefined')return;
// ── 瀏覽器：登入後在選單加「🔐 年度報表」；要老闆密碼才解開
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function dec(E,pw){const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(E.salt),iterations:E.it,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
  return {key,raw:await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(E.iv)},key,b64(E.ct))};}
const gun=async raw=>JSON.parse(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
let H=null,D=null,yy=null,mode='live';
async function loadD(){const E=await (await fetch('data.enc.json',{cache:'no-store'})).json();const {key,raw}=await dec(E,sessionStorage.k||'');const P=await gun(raw);let L={};
  try{const s=localStorage.getItem('sjf_local_v2');if(s){const o=JSON.parse(s);L=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(o.iv)},key,b64(o.ct))));}}catch(_){}
  return G.MarketCalc.merge(P.data,L);}
function page(){const el=document.getElementById('p-annual');if(!H){el.innerHTML=`<div class="card" style="max-width:420px"><b>🔐 年度報表（老闆專用）</b><p class="muted">這一頁要另外的老闆密碼，跟一般登入密碼不同。</p>
  <form id="anf"><input id="anpw" type="password" placeholder="老闆密碼" autocomplete="off"> <button>解鎖</button> <span id="anerr" class="err"></span></form></div>`;
  el.querySelector('#anf').onsubmit=async ev=>{ev.preventDefault();const pw=el.querySelector('#anpw').value;el.querySelector('#anerr').textContent='解鎖中…';
    try{const E=await (await fetch('owner.enc.json',{cache:'no-store'})).json();H=await gun((await dec(E,pw)).raw);D=await loadD();page();}catch(_){H=null;el.querySelector('#anerr').textContent='老闆密碼不對';}};return;}
  yy=yy||D.ym[0];const h=html(D,H,yy,mode);const ys=[];for(let y=110;y<=D.ym[0];y++)ys.push(y);
  el.innerHTML=`<style>${CSS}</style><div class="card an-noprint"><b>🔐 年度報表</b> 年度 <select id="any">${ys.map(y=>`<option ${y==yy?'selected':''}>${y}</option>`).join('')}</select>
   <select id="anm"><option value="live" ${mode=='live'?'selected':''}>網頁資料計算</option><option value="hist" ${mode=='hist'?'selected':''}>原年度報表檔（110–114）</option></select>
   <button id="anp">🖨️ 列印（A4 橫式）</button> <button id="anx" class="ghost">⬇️ 匯出 Excel</button> <button id="anl" class="ghost">🔒 上鎖</button>
   ${h.o.miss.length?`<details><summary>沒有資料來源、留空的欄位（${h.o.miss.length}）</summary><ul>${h.o.miss.map(m=>`<li>${e(m)}</li>`).join('')}</ul></details>`:''}</div>${h.cmp}<div id="anprint">${h.body}</div>`;
  el.querySelector('#any').onchange=ev=>{yy=+ev.target.value;page();};el.querySelector('#anm').onchange=ev=>{mode=ev.target.value;page();};
  el.querySelector('#anp').onclick=()=>window.print();el.querySelector('#anl').onclick=()=>{H=null;D=null;page();};
  el.querySelector('#anx').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([xls(D,H,yy,mode)],{type:'application/vnd.ms-excel'}));a.download=`十甲發市場_${yy}年度報表.xls`;a.click();};}
function inject(){const nav=document.querySelector('nav'),main=document.querySelector('main');if(!nav||!main||document.getElementById('p-annual'))return;
  const s=document.createElement('section');s.id='p-annual';s.hidden=true;main.appendChild(s);const a=document.createElement('a');a.textContent='🔐 年度報表';a.dataset.own='annual';nav.appendChild(a);
  a.onclick=()=>{document.querySelectorAll('nav a').forEach(x=>x.classList.toggle('on',x===a));document.querySelectorAll('main section').forEach(x=>x.hidden=x!==s);
    const t=document.getElementById('ttl');if(t)t.textContent='年度報表';const sd=document.getElementById('side');if(sd)sd.classList.remove('open');page();};}
const iv=setInterval(()=>{const ap=document.getElementById('app');if(ap&&!ap.hidden){clearInterval(iv);inject();}},300);
})(typeof window!=='undefined'?window:globalThis);
