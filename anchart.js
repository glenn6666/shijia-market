// 年度報表圖表（純 SVG、無外部套件）：KPI 卡＋年增率、每月收支趨勢、收入組成甜甜圈、歷年比較、水電收款 vs 帳單
(function(G){
const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const f=v=>v==null?'—':(v<0?'-':'')+Math.abs(Math.round(v)).toLocaleString('en-US');
const W=v=>v==null?'—':(Math.abs(v)>=1e4?(v/1e4).toFixed(Math.abs(v)>=1e6?0:1)+' 萬':f(v));
const MN=['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const INC=['固定租金','臨時租金','停車位收入','清潔費','電費','水費','冰庫收入','其他收入'];
const PAL=['#6366f1','#14b8a6','#f59e0b','#ec4899','#3b82f6','#06b6d4','#8b5cf6','#84cc16'];
const S=a=>a.some(v=>v!=null)?a.reduce((s,v)=>s+(+v||0),0):null;
const nice=m=>{if(m<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(m))),r=m/p;return (r<=1?1:r<=2?2:r<=5?5:10)*p;};
const CSS=`.ad{font:13px system-ui,"Microsoft JhengHei",sans-serif;color:#1f2937}.ad-k{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px}
.ad-c{border-radius:14px;padding:14px 16px;color:#fff;box-shadow:0 6px 18px rgba(30,41,59,.15);position:relative;overflow:hidden;animation:adUp .6s ease both}
.ad-c:nth-child(2){animation-delay:.08s}.ad-c:nth-child(3){animation-delay:.16s}.ad-c:nth-child(4){animation-delay:.24s}
.ad-c small{opacity:.85;font-size:12px}.ad-c b{display:block;font-size:24px;margin:4px 0 2px;letter-spacing:.5px}.ad-c i{font-style:normal;font-size:12px;background:rgba(255,255,255,.22);border-radius:99px;padding:2px 8px}
.ad-c:after{content:"";position:absolute;right:-30px;top:-30px;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,.12)}
.ad-g{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:12px}.ad-p{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:12px 14px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.ad-p h4{margin:0 0 6px;font-size:14px}.ad-p svg{width:100%;height:auto;display:block}.ad-lg{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;color:#4b5563}.ad-lg span:before{content:"";display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--c);margin-right:4px;vertical-align:-1px}
.ad svg .gr{transform-box:fill-box;transform-origin:bottom;animation:adGrow .8s cubic-bezier(.2,.8,.2,1) both}.ad svg .ln{stroke-dasharray:3000;stroke-dashoffset:3000;animation:adDraw 1.4s ease forwards .3s}
.ad svg .sl{transition:opacity .2s,transform .2s;transform-origin:center;transform-box:view-box}.ad svg .sl:hover{transform:scale(1.04)}.ad svg [data-tip]{cursor:pointer}.ad svg [data-tip]:hover{opacity:.8}
.ad svg .dn{animation:adDn 1s ease both}
@keyframes adUp{from{opacity:0;transform:translateY(10px)}}@keyframes adGrow{from{transform:scaleY(0)}}@keyframes adDraw{to{stroke-dashoffset:0}}@keyframes adDn{from{stroke-dasharray:0 999}}
#adtip{position:fixed;z-index:99;pointer-events:none;background:rgba(17,24,39,.92);color:#fff;font-size:12px;line-height:1.5;padding:6px 10px;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.25);white-space:nowrap}
@media (max-width:800px){.ad-k{grid-template-columns:repeat(2,1fr)}.ad-g{grid-template-columns:1fr}}
@media print{.ad *{animation:none!important;transition:none!important}.ad svg .ln{stroke-dashoffset:0;stroke-dasharray:none}.ad-c,.ad-p{box-shadow:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}.ad-k{grid-template-columns:repeat(4,1fr)}.ad-g{grid-template-columns:2fr 1fr}.ad-p{break-inside:avoid}#adtip{display:none}}`;
function yoy(a,b){if(a==null||b==null||!b)return '';const p=(a-b)/Math.abs(b)*100;return `${p>=0?'▲':'▼'} ${Math.abs(p).toFixed(1)}% 年增`;}
function kpis(r,p,y,n){const cut=a=>a.slice(0,n),inc=S(cut(r.總計)),ex=S(cut(r.費用)),pl=S(cut(r.損益)),pi=p&&S(cut(p.總計)),pe=p&&S(cut(p.費用)),pp=p&&S(cut(p.損益));
 const bk=r.存款餘額.filter(v=>v!=null).pop()??null,pb=p?p.存款餘額.filter(v=>v!=null).pop()??null:null;const lab=`1–${n} 月`;
 const C=(t,v,sub,bg)=>`<div class="ad-c" style="background:${bg}"><small>${t}</small><b>${W(v)}</b><i>${sub||'—'}</i></div>`;
 return `<div class="ad-k">${C(`總收入（${lab}）`,inc,yoy(inc,pi)||'去年同期無資料','linear-gradient(135deg,#6366f1,#8b5cf6)')}${C(`費用（${lab}）`,ex,yoy(ex,pe)||'去年同期無資料','linear-gradient(135deg,#f97316,#f59e0b)')}
 ${C(`損益（${lab}）`,pl,yoy(pl,pp)||(inc?`利潤率 ${(pl/inc*100).toFixed(1)}%`:''),pl!=null&&pl<0?'linear-gradient(135deg,#e11d48,#f43f5e)':'linear-gradient(135deg,#0d9488,#14b8a6)')}
 ${C('存款餘額（最新）',bk,bk!=null&&pb!=null?`${bk>=pb?'▲':'▼'} 比去年底 ${W(bk-pb)}`:'網頁沒有銀行資料時取原檔','linear-gradient(135deg,#2563eb,#06b6d4)')}</div>`;}
function trend(r,p,y){const w=760,h=300,L=58,R=16,T=16,Bm=34,cw=(w-L-R)/12,bw=cw*.62;
 const tot=r.總計.map(v=>v||0),mx=nice(Math.max(1,...tot,...r.費用.map(v=>v||0),...(p?p.總計.map(v=>v||0):[]))),mn=Math.min(0,...r.損益.map(v=>v||0)),lo=mn<0?-nice(-mn):0;
 const Yp=v=>T+(h-T-Bm)*(mx-v)/(mx-lo),x=i=>L+cw*i+cw/2;let g='';
 for(let k=0;k<=4;k++){const v=lo+(mx-lo)*k/4;g+=`<line x1="${L}" x2="${w-R}" y1="${Yp(v)}" y2="${Yp(v)}" stroke="#eef0f4"/><text x="${L-6}" y="${Yp(v)+4}" text-anchor="end" font-size="11" fill="#9ca3af">${W(v)}</text>`;}
 let bars='';MN.forEach((m,i)=>{let acc=0;INC.forEach((k,j)=>{const v=r[k][i];if(!v||v<0)return;const y1=Yp(acc+v),y0=Yp(acc);acc+=v;bars+=`<rect class="gr" style="animation-delay:${i*.05}s" x="${x(i)-bw/2}" y="${y1}" width="${bw}" height="${Math.max(0,y0-y1)}" fill="${PAL[j]}" rx="${j==0?0:0}" data-tip="${e(`${y}年${m}｜${k}：${f(v)}`)}"/>`;});
  if(r.總計[i]!=null)bars+=`<rect x="${x(i)-cw/2}" y="${T}" width="${cw}" height="${h-T-Bm}" fill="transparent" data-tip="${e(`<b>${y}年${m}</b><br>收入 ${f(r.總計[i])}<br>費用 ${f(r.費用[i])}<br>損益 ${f(r.損益[i])}${p&&p.總計[i]!=null?`<br>去年同月收入 ${f(p.總計[i])}`:''}`)}"/>`;
  g+=`<text x="${x(i)}" y="${h-Bm+16}" text-anchor="middle" font-size="11" fill="#6b7280">${m}</text>`;});
 const line=(a,c,dash,lab)=>{const pts=a.map((v,i)=>v==null?null:[x(i),Yp(v)]).filter(Boolean);if(!pts.length)return '';
  return `<path class="ln" d="${pts.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join('')}" fill="none" stroke="${c}" stroke-width="2.5" ${dash?'stroke-dasharray="5 4" style="animation:none;stroke-dashoffset:0"':''}/>`+pts.map((q,i)=>`<circle cx="${q[0]}" cy="${q[1]}" r="3.5" fill="#fff" stroke="${c}" stroke-width="2"/>`).join('');};
 const area=(()=>{const pts=r.損益.map((v,i)=>v==null?null:[x(i),Yp(v)]).filter(Boolean);if(pts.length<2)return '';return `<path d="M${pts[0][0]} ${Yp(0)}${pts.map(q=>'L'+q[0]+' '+q[1]).join('')}L${pts[pts.length-1][0]} ${Yp(0)}Z" fill="url(#adga)" opacity=".9"/>`;})();
 const svg=`<svg viewBox="0 0 ${w} ${h}"><defs><linearGradient id="adga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10b981" stop-opacity=".35"/><stop offset="1" stop-color="#10b981" stop-opacity="0"/></linearGradient></defs>${g}<line x1="${L}" x2="${w-R}" y1="${Yp(0)}" y2="${Yp(0)}" stroke="#cbd5e1"/>${bars}${area}${p?line(p.總計,'#94a3b8',1):''}${line(r.費用,'#f97316')}${line(r.損益,'#10b981')}</svg>`;
 return `<div class="ad-p"><h4>📈 每月收支趨勢（${y}年）</h4>${svg}<div class="ad-lg">${INC.map((k,j)=>`<span style="--c:${PAL[j]}">${k}</span>`).join('')}<span style="--c:#f97316">費用（線）</span><span style="--c:#10b981">損益（線）</span>${p?'<span style="--c:#94a3b8">去年收入（虛線）</span>':''}</div></div>`;}
function donut(r,y){const v=INC.map(k=>Math.max(0,S(r[k])||0)),t=v.reduce((a,b)=>a+b,0),R0=70,C=2*Math.PI*R0;let off=0,s='';
 v.forEach((x,j)=>{if(!x)return;const l=x/t*C;s+=`<circle class="dn" r="${R0}" cx="100" cy="100" fill="none" stroke="${PAL[j]}" stroke-width="30" stroke-dasharray="${l.toFixed(2)} 999" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 100 100)" data-tip="${e(`${INC[j]}：${f(x)}（${(x/t*100).toFixed(1)}%）`)}"/>`;off+=l;});
 return `<div class="ad-p"><h4>🍩 ${y}年收入組成</h4><svg viewBox="0 0 200 200" style="max-width:240px;margin:auto">${s}<text x="100" y="96" text-anchor="middle" font-size="12" fill="#6b7280">全年收入</text><text x="100" y="116" text-anchor="middle" font-size="17" font-weight="700" fill="#111827">${W(t)}</text></svg>
 <div class="ad-lg">${INC.map((k,j)=>v[j]?`<span style="--c:${PAL[j]}">${k} ${(v[j]/t*100).toFixed(1)}%</span>`:'').join('')}</div></div>`;}
function years(Y){const w=520,h=240,L=54,T=14,Bm=30,n=Y.ys.length,cw=(w-L-10)/n,get=k=>(Y.rows.find(r=>r[0]==k)||[,[]])[1],I=get('總計'),E=get('費用'),P=get('損益');
 const mx=nice(Math.max(1,...I.map(v=>v||0),...E.map(v=>v||0))),lo=Math.min(0,...P.map(v=>v||0))<0?-nice(-Math.min(...P.map(v=>v||0))):0,Yp=v=>T+(h-T-Bm)*(mx-v)/(mx-lo);let s='';
 for(let k=0;k<=4;k++){const v=lo+(mx-lo)*k/4;s+=`<line x1="${L}" x2="${w-10}" y1="${Yp(v)}" y2="${Yp(v)}" stroke="#eef0f4"/><text x="${L-6}" y="${Yp(v)+4}" text-anchor="end" font-size="10" fill="#9ca3af">${W(v)}</text>`;}
 Y.ys.forEach((y,i)=>{const x0=L+cw*i+cw*.14,bw=cw*.24;[[I[i],'#6366f1','收入'],[E[i],'#f97316','費用'],[P[i],'#10b981','損益']].forEach(([v,c,lab],j)=>{if(v==null)return;const a=Yp(Math.max(v,0)),b=Yp(Math.min(v,0));
   s+=`<rect class="gr" style="animation-delay:${i*.08+j*.04}s" x="${x0+j*bw}" y="${a}" width="${bw-2}" height="${Math.max(1,b-a)}" rx="3" fill="${c}" data-tip="${e(`${y}年 ${lab}：${f(v)}${i&&Y.rows&&v!=null&&[I,E,P][j][i-1]?`<br>${yoy(v,[I,E,P][j][i-1])}`:''}`)}"/>`;});
  s+=`<text x="${L+cw*i+cw/2}" y="${h-Bm+16}" text-anchor="middle" font-size="11" fill="#6b7280">${y}年</text>`;});
 return `<div class="ad-p"><h4>📊 歷年比較</h4><svg viewBox="0 0 ${w} ${h}">${s}<line x1="${L}" x2="${w-10}" y1="${Yp(0)}" y2="${Yp(0)}" stroke="#cbd5e1"/></svg><div class="ad-lg"><span style="--c:#6366f1">收入</span><span style="--c:#f97316">費用</span><span style="--c:#10b981">損益</span></div></div>`;}
function utility(o,y){const w=520,h=240,L=54,T=14,Bm=30,cw=(w-L-10)/12,bill=M=>MN.map((_,i)=>S((M[i]||[]).filter(v=>v!=null))),eb=bill(o.el),wb=bill(o.wa);
 const D=[['電費收款',o.elecRecv,'#3b82f6'],['電費帳單',eb,'#93c5fd'],['水費收款',o.waterRecv,'#06b6d4'],['水費帳單',wb,'#a5f3fc']];
 const mx=nice(Math.max(1,...D.flatMap(d=>d[1].map(v=>v||0)))),Yp=v=>T+(h-T-Bm)*(mx-v)/mx;let s='';
 for(let k=0;k<=4;k++){const v=mx*k/4;s+=`<line x1="${L}" x2="${w-10}" y1="${Yp(v)}" y2="${Yp(v)}" stroke="#eef0f4"/><text x="${L-6}" y="${Yp(v)+4}" text-anchor="end" font-size="10" fill="#9ca3af">${W(v)}</text>`;}
 MN.forEach((m,i)=>{const bw=cw*.2;D.forEach(([lab,a,c],j)=>{const v=a[i];if(!v)return;s+=`<rect class="gr" style="animation-delay:${i*.04}s" x="${L+cw*i+cw*.1+j*bw}" y="${Yp(v)}" width="${bw-1}" height="${Yp(0)-Yp(v)}" rx="2" fill="${c}" data-tip="${e(`${y}年${m}｜${lab}：${f(v)}${j%2&&D[j-1][1][i]!=null?`<br>差價 ${f(D[j-1][1][i]-v)}`:''}`)}"/>`;});
  s+=`<text x="${L+cw*i+cw/2}" y="${h-Bm+16}" text-anchor="middle" font-size="10" fill="#6b7280">${i+1}</text>`;});
 const de=S(o.elecRecv)!=null&&S(eb)!=null?S(o.elecRecv)-S(eb):null,dw=S(o.waterRecv)!=null&&S(wb)!=null?S(o.waterRecv)-S(wb):null;
 return `<div class="ad-p"><h4>⚡💧 水電收款 vs 帳單（全年差價：電 ${f(de)}、水 ${f(dw)}）</h4><svg viewBox="0 0 ${w} ${h}">${s}<line x1="${L}" x2="${w-10}" y1="${Yp(0)}" y2="${Yp(0)}" stroke="#cbd5e1"/></svg><div class="ad-lg">${D.map(d=>`<span style="--c:${d[2]}">${d[0]}</span>`).join('')}</div></div>`;}
// o＝本年 build 結果；p＝去年 rows（可無）；Y＝compareYears 結果；lastM＝本年有資料的最後月份
function dash(o,p,Y){const r=o.rows,n=Math.max(1,r.總計.reduce((a,v,i)=>v!=null?i+1:a,0));
 return `<div class="ad">${kpis(r,p,o.y,n)}<div class="ad-g">${trend(r,p,o.y)}${donut(r,o.y)}</div><div class="ad-g" style="grid-template-columns:1fr 1fr">${years(Y)}${utility(o,o.y)}</div></div>`;}
function bindTips(root){let t=document.getElementById('adtip');if(!t){t=document.createElement('div');t.id='adtip';t.hidden=true;document.body.appendChild(t);}
 root.addEventListener('mousemove',ev=>{const g=ev.target.closest&&ev.target.closest('[data-tip]');if(!g){t.hidden=true;return;}t.innerHTML=g.getAttribute('data-tip');t.hidden=false;
  const x=Math.min(ev.clientX+14,innerWidth-t.offsetWidth-8);t.style.left=x+'px';t.style.top=(ev.clientY+14)+'px';});root.addEventListener('mouseleave',()=>t.hidden=true);
 root.addEventListener('touchstart',ev=>{const g=ev.target.closest&&ev.target.closest('[data-tip]');if(!g)return;const q=ev.touches[0];t.innerHTML=g.getAttribute('data-tip');t.hidden=false;t.style.left=Math.min(q.clientX,innerWidth-t.offsetWidth-8)+'px';t.style.top=(q.clientY-50)+'px';},{passive:true});}
G.SJFAnChart={dash,bindTips,CSS};
})(typeof window!=='undefined'?window:globalThis);
