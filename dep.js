// 已收保證金：基礎資料 B.dep（匯入自 已收保證金.xls），本機/雲端異動放 L.dep[k]（{del:1} 表示刪除），走既有 saveLocal + 同步
(function(G){
const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n=v=>Math.round(+v||0).toLocaleString('en-US');
const area=id=>{const m=/^([^0-9-]+)/.exec(String(id));return m?m[1].toUpperCase():'其他';};
function list(B,L){const ed=(L&&L.dep)||{},out=[];(B.dep||[]).forEach(r=>{const x=ed[r.k];if(x&&x.del)return;out.push(Object.assign({},r,x||{},{edited:!!x}));});
  Object.keys(ed).forEach(k=>{if(!(B.dep||[]).some(r=>r.k===k)&&!ed[k].del)out.push(Object.assign({k,edited:true},ed[k]));});return out;}
const CSS=`.dp-pg{background:#fff;color:#000;font:12px "Microsoft JhengHei","PMingLiU",sans-serif;width:150mm;margin:0 auto}
.dp-pg h3{text-align:center;margin:0 0 2mm;font-size:14px}.dp-t{border-collapse:collapse;width:100%}.dp-t th,.dp-t td{border:1px solid #000;padding:2px 4px;text-align:center;height:6.2mm}
.dp-t td.a{text-align:right}.dp-t tr.tot td{font-weight:bold}
@media print{@page{size:A4 portrait;margin:15mm}body *{visibility:hidden}#dpprint,#dpprint *{visibility:visible}#dpprint{position:absolute;left:0;top:0;width:100%}tr{page-break-inside:avoid}}`;
// 仿原表：一頁左右兩欄（編號/姓名/保證金 ×2），每欄底下合計
function sheet(R,title){const PER=40,pages=[];for(let i=0;i<R.length;i+=PER*2)pages.push(R.slice(i,i+PER*2));if(!pages.length)pages.push([]);
  const tot=R.reduce((a,r)=>a+(+r.amt||0),0);
  return pages.map((p,pi)=>{let Lc=p.filter(r=>area(r.id)!=='新庫'),Rc=p.filter(r=>area(r.id)==='新庫');if(!Lc.length||!Rc.length){const m=Math.ceil(p.length/2);Lc=p.slice(0,m);Rc=p.slice(m);}const h=Math.max(Lc.length,Rc.length);const c=r=>r?`<td>${e(r.id)}</td><td>${e(r.nm)}</td><td class="a">${n(r.amt)}</td>`:'<td></td><td></td><td></td>';
    const s=a=>a.reduce((x,r)=>x+(+r.amt||0),0);let rows='';for(let i=0;i<h;i++)rows+=`<tr>${c(Lc[i])}${c(Rc[i])}</tr>`;
    return `<div class="dp-pg" style="${pi<pages.length-1?'page-break-after:always':''}">${pi==0?`<h3>${e(title)}</h3>`:''}<table class="dp-t"><tr><th>編號</th><th>姓名</th><th>保證金</th><th>編號</th><th>姓名</th><th>保證金</th></tr>${rows}
     <tr class="tot"><td></td><td>合計</td><td class="a">${n(s(Lc))}</td><td></td><td>合計</td><td class="a">${n(s(Rc))}</td></tr>${pi==pages.length-1?`<tr class="tot"><td></td><td>總計</td><td class="a" colspan="4">${n(tot)}</td></tr>`:''}</table></div>`;}).join('');}
let q='',ar='',zero=true;
function render(o){const {B,L,el,save}=o;const all=list(B,L);const areas=[...new Set(all.map(r=>area(r.id)))].sort();
  const R=all.filter(r=>(!q||(r.id+r.nm+(r.memo||'')).toUpperCase().includes(q.toUpperCase()))&&(!ar||area(r.id)===ar)&&(zero||+r.amt));
  const tot=R.reduce((a,r)=>a+(+r.amt||0),0);
  el.innerHTML=`<style>${CSS}</style><div class="card noprint"><div class="row"><input id="dpq" placeholder="攤位／姓名／備註" value="${e(q)}">
   區域 <select id="dpa"><option value="">全部</option>${areas.map(a=>`<option ${a==ar?'selected':''}>${e(a)}</option>`).join('')}</select>
   <label><input type="checkbox" id="dpz" ${zero?'checked':''}> 含 0 元</label> <button id="dpp">🖨️ 列印（A4 直式）</button></div>
   <p>共 <b>${R.length}</b> 筆，保證金合計 <b>NT$${n(tot)}</b>（全部 ${all.length} 筆 NT$${n(all.reduce((a,r)=>a+(+r.amt||0),0))}）</p>
   <div class="row"><input id="dfi" placeholder="編號" size="8"><input id="dfn" placeholder="姓名" size="8"><input id="dfa" type="number" placeholder="保證金" style="width:8em"><input id="dfm" placeholder="備註"><input id="dfk" type="hidden">
   <button id="dfs">💾 新增／儲存</button><button id="dfc" class="ghost">清除</button></div>
   <table><tr><th>編號</th><th>姓名</th><th>保證金</th><th>備註</th><th></th></tr>${R.map(r=>`<tr><td>${e(r.id)}</td><td>${e(r.nm)}</td><td class="n">${n(r.amt)}</td><td>${e(r.memo||'')}${r.edited?' <small class="muted">(已修改)</small>':''}</td><td><button class="sm" data-de="${e(r.k)}">修改</button> <button class="sm ghost" data-dd="${e(r.k)}">刪除</button></td></tr>`).join('')}</table></div>
   <div id="dpprint">${sheet(R,'已收保證金')}</div>`;
  const $=s=>el.querySelector(s),go=()=>render(o);
  $('#dpq').onchange=ev=>{q=ev.target.value;go();};$('#dpa').onchange=ev=>{ar=ev.target.value;go();};$('#dpz').onchange=ev=>{zero=ev.target.checked;go();};$('#dpp').onclick=()=>window.print();
  $('#dfc').onclick=()=>['#dfi','#dfn','#dfa','#dfm','#dfk'].forEach(s=>$(s).value='');
  el.querySelectorAll('[data-de]').forEach(b=>b.onclick=()=>{const r=all.find(x=>x.k===b.dataset.de);$('#dfi').value=r.id;$('#dfn').value=r.nm;$('#dfa').value=r.amt;$('#dfm').value=r.memo||'';$('#dfk').value=r.k;$('#dfi').focus();});
  el.querySelectorAll('[data-dd]').forEach(b=>b.onclick=()=>{if(!confirm('刪除這筆保證金？'))return;L.dep=Object.assign({},L.dep);L.dep[b.dataset.dd]={del:1};save();});
  $('#dfs').onclick=()=>{const id=$('#dfi').value.trim(),amt=+$('#dfa').value;if(!id||!isFinite(amt)){alert('請填編號與保證金');return;}
    const k=$('#dfk').value||('u'+Date.now().toString(36));L.dep=Object.assign({},L.dep);L.dep[k]={id,nm:$('#dfn').value.trim(),amt,memo:$('#dfm').value.trim()};save();};}
G.SJFDep={list,render,sheet,CSS,area};
})(typeof window!=='undefined'?window:globalThis);
