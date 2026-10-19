(function(){
const $=s=>document.querySelector(s),fmt=n=>n==null?'—':'NT$'+Math.round(n).toLocaleString(),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const COL={paid:'#3c9a4f',unpaid:'#d64541',part:'#f39c34',over:'#3b7dd8',empty:'#a8a29a',nodata:'#ffffff'},LBL={paid:'已繳清',unpaid:'未繳',part:'部分繳',over:'溢繳',empty:'空攤／無應收',nodata:'無資料'};
let P,R,byId;
function b64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
async function unlock(pw){const E=await (await fetch('data.enc.json',{cache:'no-store'})).json();
 const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(E.salt),iterations:E.it,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
 const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(E.iv)},key,b64(E.ct));
 const txt=await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text();return JSON.parse(txt);}
$('#gf').onsubmit=async e=>{e.preventDefault();$('#gerr').textContent='解密中…';try{P=await unlock($('#pw').value);sessionStorage.k=$('#pw').value;start();}catch(x){$('#gerr').textContent='密碼錯誤';}};
if(sessionStorage.k){unlock(sessionStorage.k).then(p=>{P=p;start();}).catch(()=>sessionStorage.removeItem('k'));}
$('#lock').onclick=()=>{sessionStorage.removeItem('k');location.reload();};
function status(o){if(!o)return'nodata';if(o.due==null||o.due===0)return o.paid>0?'over':'empty';if(o.paid<=0)return'unpaid';if(o.bal===0)return'paid';return o.bal<0?'over':'part';}
function start(){R=MarketCalc.compute(P.data);byId={};R.forEach(o=>byId[o.id.toUpperCase()]=o);
 const c=P.data.cust;R.forEach(o=>{const x=c[o.id.toUpperCase()+'|'+o.name];o.cust=x;if(!o.tel&&x)o.tel=x.tel;});
 $('#gate').hidden=true;$('#app').hidden=false;$('#ymlbl').textContent=P.data.ym[0]+' 年 '+P.data.ym[1]+' 月';ov();map();list();
 document.querySelectorAll('nav a').forEach(a=>a.onclick=()=>go(a.dataset.p));$('#menu').onclick=()=>$('#side').classList.toggle('open');}
function go(p){document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.dataset.p==p));document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!='p-'+p);
 $('#ttl').textContent=document.querySelector('nav a[data-p='+p+']').textContent.slice(2).trim();$('#side').classList.remove('open');}
function ov(){const ar=R.filter(o=>o.ar),due=ar.reduce((a,o)=>a+o.due,0),paid=R.reduce((a,o)=>a+o.paid,0),bal=R.reduce((a,o)=>a+(o.bal||0),0),pc=due?paid/due*100:0;
 const un=R.filter(o=>o.bal&&o.bal!==0).sort((a,b)=>b.bal-a.bal);
 $('#p-ov').innerHTML=`<div class="kpis"><div class="card kpi">本月應收<div class="v">${fmt(due)}</div><div class="s">${ar.length} 筆應收攤位</div></div>
 <div class="card kpi">本月已收<div class="v">${fmt(paid)}</div><div class="s">依銷帳年月歸月</div></div><div class="card kpi">本月餘款<div class="v">${fmt(bal)}</div><div class="s">負數＝溢繳</div></div>
 <div class="card kpi">收款率<div class="v">${pc.toFixed(1)}%</div><div class="bar"><i style="width:${Math.min(pc,100)}%"></i></div></div></div>
 <div class="card"><h3 style="margin-top:0">未收款／餘款不為 0 的攤位（${un.length}）</h3><input id="ovq" placeholder="搜尋攤號或租戶"><div style="overflow:auto"><table><thead><tr><th>攤位</th><th>租戶</th><th class="n">應收</th><th class="n">已收</th><th class="n">餘款</th></tr></thead><tbody id="ovt"></tbody></table></div></div>`;
 const draw=q=>{$('#ovt').innerHTML=un.filter(o=>!q||(o.id+o.name).toUpperCase().includes(q.toUpperCase())).map(row).join('');bindRows('#ovt');};draw('');$('#ovq').oninput=e=>draw(e.target.value);}
function row(o){return `<tr class="click" data-id="${esc(o.id)}"><td>${esc(o.id)}</td><td>${esc(o.name)}</td><td class="n">${fmt(o.due)}</td><td class="n">${fmt(o.paid)}</td><td class="n">${fmt(o.bal)}</td></tr>`;}
function bindRows(s){document.querySelectorAll(s+' tr.click').forEach(t=>t.onclick=()=>card(t.dataset.id));}
function list(){$('#p-list').innerHTML=`<div class="card"><input id="lq" placeholder="搜尋攤號或租戶（含停車位、庫、臨時等未在平面圖上的攤位）"><div style="overflow:auto"><table><thead><tr><th>攤位</th><th>租戶</th><th class="n">應收</th><th class="n">已收</th><th class="n">餘款</th></tr></thead><tbody id="lt"></tbody></table></div></div>`;
 const draw=q=>{$('#lt').innerHTML=R.filter(o=>!q||(o.id+o.name).toUpperCase().includes(q.toUpperCase())).map(row).join('');bindRows('#lt');};draw('');$('#lq').oninput=e=>draw(e.target.value);}
let cur='m2';
function map(){const leg=Object.keys(COL).map(k=>`<span style="--c:${COL[k]}">${LBL[k]}</span>`).join('');
 $('#p-map').innerHTML=`<div class="tabs"><button data-m="m2">A／L／C 區・東光1–9</button><button data-m="m1">十甲／東光／新庫／F／E 區</button><input id="mq" placeholder="搜尋攤號或租戶" style="max-width:260px"></div><div class="legend">${leg}</div><div class="mapwrap" id="mw"></div><p class="muted" style="font-size:12px">圖塊依平面圖 PDF 位置重畫；白色＝圖上有此攤號但試算表沒有資料。停車位、庫、臨時攤位不在平面圖上，請用「攤位清單」查。</p>`;
 document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{cur=b.dataset.m;drawMap();});$('#mq').onchange=$('#mq').oninput=e=>find(e.target.value);drawMap();}
function drawMap(){document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.m==cur));const [w,h]=P.size[cur];
 $('#mw').innerHTML=`<svg viewBox="0 0 ${w} ${h}"><image href="${P.img[cur]}" width="${w}" height="${h}"/>`+P.tiles[cur].map(t=>{const o=byId[t.id.toUpperCase()],s=status(o);
 return `<circle class="tile" data-id="${esc(t.id)}" cx="${t.x}" cy="${t.y}" r="${t.r+4}" fill="${COL[s]}"><title>${esc(t.id)} ${esc(o?o.name:'無資料')} ${LBL[s]}</title></circle>`}).join('')+'</svg>';
 document.querySelectorAll('.tile').forEach(c=>c.onclick=()=>card(c.dataset.id));}
function find(q){q=q.trim().toUpperCase();if(!q)return;const hit=t=>{const o=byId[t.id.toUpperCase()];return t.id.toUpperCase()==q||t.id.toUpperCase()==q.replace(/^A(\d{1,2})$/,(m,n)=>'A'+n.padStart(3,'0'))||(o&&o.name&&o.name.toUpperCase().includes(q)&&q.length>=2);};
 let m=['m1','m2'].find(k=>P.tiles[k].some(hit));if(!m)return;if(m!=cur){cur=m;drawMap();}
 document.querySelectorAll('.tile').forEach(c=>{const t=P.tiles[cur].find(x=>x.id==c.dataset.id);if(hit(t)){c.classList.remove('flash');void c.getBBox();c.classList.add('flash');c.scrollIntoView({block:'center',inline:'center',behavior:'smooth'});}});}
function card(id){const o=byId[id.toUpperCase()];let h;
 if(!o){h=`<h2>${esc(id)}</h2><p class="muted">平面圖上有此攤號，但試算表「02攤位建檔資料庫」沒有這個攤位。</p>`;}
 else{const s=status(o),r=o.rent,rd=o.read,q=(k,n)=>rd[k][0]||rd[k][1]?`<div><b>${n}</b>${rd[k][0]} → ${rd[k][1]}（${rd[k][2]} 度 × ${o.rate[k]}）</div>`:'';
 const hs=o.hist.slice().sort((a,b)=>(+b.y-+a.y)||(+b.m-+a.m)||String(b.d).localeCompare(a.d)).slice(0,24);
 h=`<h2 style="margin:0 30px 4px 0">${esc(o.id)} <span class="st" style="background:${COL[s]};${s=='nodata'?'color:#000':''}">${LBL[s]}</span></h2><p class="muted" style="margin-top:0">${esc(o.name||'（無租客）')}${o.note?'・'+esc(o.note):''}</p>
 <div class="grid2"><div><b>電話</b>${esc(o.tel||'—')}</div><div><b>車牌</b>${esc(o.cust&&o.cust.plate||'—')}</div><div><b>合約</b>${esc(o.hist.find(p=>p.cs)?'':'未登錄')}</div><div><b>租金生效年月</b>${r.ym||'—'}</div>
 <div><b>月租</b>${fmt(r.mon)}</div><div><b>日租</b>${fmt(r.day)}</div><div><b>冰庫</b>${fmt(r.ice)}</div><div><b>停車</b>${fmt(r.park)}</div><div><b>清潔費</b>${fmt(r.clean)}</div><div><b>電費／水費</b>${fmt(o.elec)}／${fmt(o.water)}</div>
 ${q('e1','電錶1')}${q('e2','電錶2')}${q('w1','水錶1')}${q('w2','水錶2')}</div>
 <div class="kpis" style="grid-template-columns:repeat(3,1fr);margin:12px 0"><div class="card kpi">本月應收<div class="v" style="font-size:18px">${fmt(o.due)}</div></div><div class="card kpi">本月已收<div class="v" style="font-size:18px">${fmt(o.paid)}</div></div><div class="card kpi">本月餘款<div class="v" style="font-size:18px">${fmt(o.bal)}</div></div></div>
 <h3>繳費紀錄（最近 ${hs.length} 筆／共 ${o.hist.length} 筆）</h3><div style="overflow:auto"><table><thead><tr><th>銷帳年月</th><th>日期</th><th>姓名</th><th class="n">實收</th><th>方式</th><th>經手人</th></tr></thead><tbody>${hs.map(p=>`<tr><td>${esc(p.y)}/${esc(p.m)}</td><td>${esc(p.d)}</td><td>${esc(p.nm)}</td><td class="n">${fmt(p.amt||0)}</td><td>${esc(p.pay||'')}${p.bill?' #'+esc(p.bill):''}</td><td>${esc(p.who||'')}</td></tr>`).join('')}</tbody></table></div>`;}
 $('#mbody').innerHTML=h;$('#modal').hidden=false;}
$('#mx').onclick=()=>$('#modal').hidden=true;$('#modal').onclick=e=>{if(e.target.id=='modal')$('#modal').hidden=true;};
})();
