// 月底結帳統計表（仿 十甲發報表 樞紐表：A4 直式，每頁重複表頭，最後一列總計）
(function(G){
const COLS=[['總租金',o=>o.rent.mon],['總清潔費',o=>o.rent.clean],['總停車',o=>o.rent.park],['總冰庫',o=>o.rent.ice],['總臨租',o=>o.rent.day],['總電費',o=>o.elec],['總水費',o=>o.water],['總本月應收',o=>o.due],['總本月已收',o=>o.paid],['加總 - 本月餘款',o=>o.bal]];
const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n=v=>String(Math.round(+v||0));
function rows(D,y,m){const R=MarketCalc.compute(D,y,m).filter(o=>o.ar);// 與報表相同：只列本月應收≠0（含臨時攤）
  R.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const T=COLS.map(c=>R.reduce((s,o)=>s+(+c[1](o)||0),0));return {R,T};}
const PER=62;
function html(D,y,m){const {R,T}=rows(D,y,m);const H=`<tr><th>編號</th><th>負責人</th>${COLS.map(c=>`<th>${c[0]}</th>`).join('')}</tr>`;
  const tr=o=>`<tr><td class="id">${e(o.id)}</td><td>${e(o.name)}</td>${COLS.map(c=>`<td>${n(c[1](o))}</td>`).join('')}</tr>`;
  const tot=`<tr class="tot"><td>總計</td><td></td>${T.map(v=>`<td>${n(v)}</td>`).join('')}</tr>`;
  let pg=[];for(let i=0;i<R.length;i+=PER)pg.push(R.slice(i,i+PER));if(!pg.length)pg=[[]];
  const body=pg.map((p,i)=>`<div class="cl-pg">${i==0?`<div class="cl-ttl">${y}年${m}月</div><div class="cl-flt"><span>應繳款</span><span>應收</span></div>`:''}<table class="cl-t">${H}${p.map(tr).join('')}${i==pg.length-1?tot:''}</table></div>`).join('');
  return {body,T,count:R.length};}
const CSS=`.cl-pg{background:#fff;color:#000;font:9px "Microsoft JhengHei","PMingLiU",sans-serif;width:190mm;margin:0 auto 10px}
.cl-ttl{width:40mm;margin:0 auto 2mm;text-align:center;font-size:13px;border:1px solid #888;background:#fff2cc}
.cl-flt span{display:inline-block;width:22mm;background:#fff2cc;margin:0 2mm 3mm 0;padding:1px 3px}
.cl-t{border-collapse:collapse;width:100%}.cl-t th{font-weight:bold;border-bottom:1px solid #9bb7d4;background:#dde9f6;text-align:right;padding:0 3px;white-space:nowrap}
.cl-t th:nth-child(-n+2),.cl-t td:nth-child(-n+2){text-align:left}.cl-t td{text-align:right;padding:0 3px;line-height:1.25;white-space:nowrap}
.cl-t td.id{font-weight:bold;background:#dde9f6}.cl-t tr.tot td{font-weight:bold;border-top:1px solid #9bb7d4;background:#dde9f6}
@media print{@page{size:A4 portrait;margin:10mm}body *{visibility:hidden}#clprint,#clprint *{visibility:visible}#clprint{position:absolute;left:0;top:0}body[data-pr=jl] #clprint,body[data-pr=jl] #clprint *,body[data-pr=bl] #clprint,body[data-pr=bl] #clprint *{display:none}.cl-pg{margin:0;page-break-after:always}.cl-pg:last-child{page-break-after:auto}}`;
function render(o){const {D,el}=o;let y=o.Y,m=o.M;
  const yrs=[...new Set(D.meters.map(r=>+r[1]).concat(D.rents.map(r=>Math.floor(r[0]/100))).concat([y]))].filter(x=>x>100).sort();
  const draw=()=>{const h=html(D,y,m);el.innerHTML=`<style>${CSS}${SJFLedger.CSS}${SJFBills.CSS}</style><div class="card noprint"><b>月底結帳統計表</b>　
   <select id="cly">${yrs.map(v=>`<option ${v==y?'selected':''}>${v}</option>`).join('')}</select> 年 <select id="clm">${Array.from({length:12},(_,i)=>`<option ${i+1==m?'selected':''}>${i+1}</option>`).join('')}</select> 月
   <button id="clp">🖨️ 列印結帳統計表</button> <button id="jlp">🖨️ 列印流水帳報表</button> <button id="blp">🖨️ 列印票據報表</button><p class="muted">共 ${h.count} 列｜應收 ${h.T[7].toLocaleString()}｜已收 ${h.T[8].toLocaleString()}｜餘款 ${h.T[9].toLocaleString()}。只列本月應收不為 0 的攤位（同報表）。</p></div><div id="clprint">${h.body}</div><h3 class="noprint">流水帳報表</h3><div id="jlprint">${SJFLedger.html(D,y,m).body}</div><h3 class="noprint">票據報表（未到期）</h3><div id="blprint">${SJFBills.html(D,y,m).body}</div>`;
   el.querySelector('#cly').onchange=ev=>{y=+ev.target.value;draw();};el.querySelector('#clm').onchange=ev=>{m=+ev.target.value;draw();};const pr=w=>{document.body.dataset.pr=w;window.print();};el.querySelector('#clp').onclick=()=>pr('cl');el.querySelector('#jlp').onclick=()=>pr('jl');el.querySelector('#blp').onclick=()=>pr('bl');};
  draw();}
G.SJFClose={render,html,rows,CSS};
})(typeof window!=='undefined'?window:globalThis);
// 流水帳報表（仿樞紐表：年月篩選，依類別分組＋小計＋總計；類別順序依該類最小流水序號）
(function(G){
const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const f=v=>(v<0?'-':'')+Math.abs(Math.round(v)).toLocaleString('en-US');
function groups(D,y,m){const ym=(y+1911)+'年'+String(m).padStart(2,'0')+'月';const J=MarketCalc.journal(D).filter(j=>j.ym===ym);const g={};
  J.forEach(j=>(g[j.cat||'(空白)']=g[j.cat||'(空白)']||[]).push(j));const sq=j=>+j.seq||0;
  const C=Object.keys(g).map(k=>({cat:k,rows:g[k].sort((a,b)=>sq(a)-sq(b)),sum:g[k].reduce((a,j)=>a+j.signed,0)})).sort((a,b)=>sq(a.rows[0])-sq(b.rows[0]));
  return {ym,C,total:J.reduce((a,j)=>a+j.signed,0),n:J.length};}
const CSS=`.jl-pg{background:#fff;color:#000;font:10px "Microsoft JhengHei","PMingLiU",sans-serif;width:190mm;margin:0 auto}
.jl-h{display:flex;gap:6mm;margin-bottom:3mm}.jl-h span{background:#fff2cc;padding:1px 4px}.jl-h b{margin-left:20mm;font-size:13px}
.jl-t{border-collapse:collapse;width:100%}.jl-t th{background:#dde9f6;border-bottom:1px solid #9bb7d4;text-align:left;padding:1px 3px}
.jl-t td{padding:0 3px;line-height:1.3}.jl-t td:last-child,.jl-t th:last-child{text-align:right}.jl-t tr.sub td{font-weight:bold;background:#dde9f6}.jl-t tr.tot td{font-weight:bold;border-top:1px solid #9bb7d4;background:#dde9f6}
@media print{@page{size:A4 portrait;margin:10mm}body *{visibility:hidden}#jlprint,#jlprint *{visibility:visible}#jlprint{position:absolute;left:0;top:0}body[data-pr=cl] #jlprint,body[data-pr=cl] #jlprint *,body[data-pr=bl] #jlprint,body[data-pr=bl] #jlprint *{display:none}thead{display:table-header-group}}`;
function html(D,y,m){const g=groups(D,y,m);const rows=g.C.map(c=>c.rows.map(j=>`<tr><td>${e(c.cat)}</td><td>${e(j.seq)}</td><td>${e(j.date)}</td><td>${e(j.item)}</td><td>${j.who?e(j.who):'(空白)'}</td><td>${f(j.signed)}</td></tr>`).join('')+`<tr class="sub"><td colspan="5">${e(c.cat)} 合計</td><td>${f(c.sum)}</td></tr>`).join('');
  return {g,body:`<div class="jl-pg"><div class="jl-h"><span>年月</span><span>${g.ym}</span><b>流水帳報表</b></div><table class="jl-t"><thead><tr><th>類別</th><th>流水序號</th><th>日期</th><th>明細項目</th><th>經手人</th><th>加總 - 金額計算</th></tr></thead><tbody>${rows}<tr class="tot"><td colspan="5">總計</td><td>${f(g.total)}</td></tr></tbody></table></div>`};}
G.SJFLedger={html,groups,CSS};
})(typeof window!=='undefined'?window:globalThis);
// 票據報表（未到期票據）：付款方式含「票據」、銷帳年月 ≤ 選定月份、票據到期日 ≥ 今天日期；依銷帳年月分組小計
(function(G){
const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function pd(s){const m=/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(String(s||'').trim());if(!m)return null;const d=new Date(+m[1],m[2]-1,+m[3]);
  return d.getMonth()==m[2]-1&&d.getDate()==+m[3]?d:null;}// 格式錯或不存在的日期（如 2026/4/31、2026/815）不列入
const ds=d=>d.getFullYear()+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0');
function groups(D,y,m,today){today=today||new Date();const t0=new Date(today.getFullYear(),today.getMonth(),today.getDate());const lim=y*100+m,G={},bad=[];
  D.pays.forEach(p=>{if(!/票據/.test(p.pay||'')||!p.bill)return;const k=(+p.y)*100+(+p.m);if(!(k<=lim))return;const d=pd(p.bdue);if(!d){if(p.bdue)bad.push(p);return;}if(d<t0)return;
    (G[k]=G[k]||[]).push(Object.assign({},p,{due:d}));});
  const C=Object.keys(G).sort((a,b)=>a-b).map(k=>({y:Math.floor(k/100),m:k%100,rows:G[k],sum:G[k].reduce((a,p)=>a+(+p.amt||0),0)}));
  return {C,total:C.reduce((a,c)=>a+c.sum,0),today:t0,bad};}
const CSS=`.bl-pg{background:#fff;color:#000;font:10px "Microsoft JhengHei","PMingLiU",sans-serif;width:190mm;margin:0 auto}
.bl-h{display:flex;justify-content:flex-end;gap:6mm}.bl-h span{background:#fff2cc;padding:1px 4px}.bl-f{margin:2mm 0 4mm}.bl-f span{background:#fff2cc;padding:1px 4px;margin-right:6mm}
.bl-t{border-collapse:collapse;width:100%}.bl-t th{background:#dde9f6;border-bottom:1px solid #9bb7d4;text-align:left;padding:1px 3px}.bl-t td{padding:2px 3px}
.bl-t td:nth-child(-n+2),.bl-t td:last-child,.bl-t th:last-child{text-align:right}.bl-t tr.sub td{font-weight:bold;background:#dde9f6}.bl-t tr.tot td{font-weight:bold;border-top:1px solid #9bb7d4;background:#dde9f6}
@media print{@page{size:A4 portrait;margin:10mm}body *{visibility:hidden}#blprint,#blprint *{visibility:visible}#blprint{position:absolute;left:0;top:0}body[data-pr=cl] #blprint,body[data-pr=cl] #blprint *,body[data-pr=jl] #blprint,body[data-pr=jl] #blprint *{display:none}thead{display:table-header-group}}`;
function html(D,y,m,today){const g=groups(D,y,m,today);const rows=g.C.map(c=>c.rows.map(p=>`<tr><td>${e(p.y)}</td><td>${e(p.m)}</td><td>${e(p.st)}</td><td>${e(p.nm)}</td><td>${ds(p.due)}</td><td>${e(p.bill)}</td><td>${Math.round(+p.amt||0)}</td></tr>`).join('')+`<tr class="sub"><td colspan="6" style="text-align:left">${c.y} ${c.m} 合計</td><td>${c.sum}</td></tr>`).join('');
  return {g,body:`<div class="bl-pg"><div class="bl-h"><span>今天日期</span><span>${ds(g.today)}</span></div><div class="bl-f"><span>票據</span><span>(全部)</span></div><table class="bl-t"><thead><tr><th>銷帳(年)</th><th>銷帳(月)</th><th>攤位編號</th><th>租客姓名</th><th>票據到期日</th><th>票據編號</th><th>加總 - 總金額</th></tr></thead><tbody>${rows}<tr class="tot"><td colspan="6" style="text-align:left">總計</td><td>${g.total}</td></tr></tbody></table></div>`};}
G.SJFBills={html,groups,CSS};
})(typeof window!=='undefined'?window:globalThis);
