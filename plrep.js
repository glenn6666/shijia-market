// 損益表（仿紙本：民國Y年M月15日至次月14日；營業收入取帳單月 compute，其他收入/費用取流水帳同月）
(function(G){
const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $f=v=>(v<0?'-':'')+'$'+Math.abs(Math.round(v)).toLocaleString('en-US');
function build(D,y,m){const R=MarketCalc.compute(D,y,m).filter(o=>o.ar);const tmp=o=>/^臨時/.test(o.id);
  const S=(f,w)=>R.filter(w||(()=>1)).reduce((a,o)=>a+(+f(o)||0),0);const [ny,nm]=m==12?[y+1,1]:[y,m+1];
  const per=`(${m}/15-${nm}/14)`,o0=R[0]||{mY:[0,0],pY:[0,0]},mp=`(${o0.pY[0]}/${o0.pY[1]}~${o0.mY[0]}/${o0.mY[1]} 抄表)`;
  const inc=[[`固定租金收入${per}`,S(o=>o.rent.mon,o=>!tmp(o))],[`加租租金收入${per}`,null],[`固定臨時租金收入${per}`,S(o=>o.rent.day,o=>!tmp(o))+S(o=>o.rent.day,tmp)],
    [`臨時租金收入-${m}月份`,S(o=>o.rent.mon,tmp)],[`停車位收入-${m}月份`,S(o=>o.rent.park)],[`清潔費收入${per}`,S(o=>o.rent.clean)],
    [`電費收入${mp}`,S(o=>o.elec)],[`水費收入${mp}`,S(o=>o.water)],[`冰庫收入${per}`,S(o=>o.rent.ice)]];
  const ym=(y+1911)+'年'+String(m).padStart(2,'0')+'月';const J=MarketCalc.journal(D).filter(j=>j.ym===ym&&(+j.amt||0)!==0).sort((a,b)=>(+a.seq||0)-(+b.seq||0));
  const oth=J.filter(j=>j.pl==='營業收入').map(j=>[j.item,j.signed]),exp=J.filter(j=>j.pl==='營業支出').map(j=>[j.item,-j.signed]);
  const sum=a=>a.reduce((s,x)=>s+(+x[1]||0),0);const ti=sum(inc)+sum(oth),te=sum(exp);
  return {title:`民國${y}年${m}月15日至${ny}年${nm}月14日`,inc,oth,exp,ti,te,net:ti-te,ym};}
const CSS=`.pl-pg{background:#fff;color:#000;font:12px "PMingLiU","MingLiU","Noto Serif TC",serif;width:180mm;margin:0 auto;padding:4mm 0}
.pl-pg h2{text-align:center;font-size:15px;margin:0}.pl-pg .per{text-align:center;margin:1mm 0 2mm;border-bottom:1px solid #000}
.pl-t{border-collapse:collapse;width:100%}.pl-t td{padding:1px 4px}.pl-t td.a{text-align:right;white-space:nowrap;width:35mm}
.pl-t tr.l td{border:1px solid #000}.pl-t tr.l td:first-child{padding-left:22mm}.pl-t tr.h td{font-weight:bold;padding-left:6mm}.pl-t tr.s td{padding-left:12mm;border:1px solid #000}
@media print{@page{size:A4 portrait;margin:12mm}body *{visibility:hidden}#plprint,#plprint *{visibility:visible}#plprint{position:absolute;left:0;top:0}}`;
function html(D,y,m){const b=build(D,y,m);const L=a=>a.map(([k,v])=>`<tr class="l"><td>${e(k)}</td><td class="a">${v==null?'':$f(v)}</td></tr>`).join('');
  return {b,body:`<div class="pl-pg"><h2>損益表</h2><div class="per">${b.title}</div><table class="pl-t"><tr><td colspan=2>收益：</td></tr><tr class="h"><td colspan=2>營業收入</td></tr>${L(b.inc)}
  <tr class="h"><td colspan=2>其他收入</td></tr>${L(b.oth)}<tr class="s"><td>收入合計</td><td class="a">${$f(b.ti)}</td></tr><tr><td colspan=2>費用：</td></tr>${L(b.exp)}
  <tr class="s"><td>費用合計</td><td class="a">${$f(b.te)}</td></tr><tr class="h"><td>營餘</td><td class="a">${$f(b.net)}</td></tr></table></div>`};}
function render(o){const h=html(o.D,o.Y,o.M);const d=document.createElement('div');
  d.innerHTML=`<style>${CSS}</style><div class="card"><b>損益表（${o.Y} 年 ${o.M} 月帳單＋流水帳 ${h.b.ym}）</b> <button id="plp">🖨️ 列印損益表（A4 直式）</button><p class="muted">「加租租金收入」網頁沒有資料來源，留空。月份用上方「帳務月份」選擇。</p></div><div id="plprint">${h.body}</div>`;
  o.el.appendChild(d);d.querySelector('#plp').onclick=()=>SJFPrint.printArea('#plprint','A4 portrait');}
G.SJFPL={build,html,render,CSS};
})(typeof window!=='undefined'?window:globalThis);
