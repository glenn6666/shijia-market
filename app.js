(function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],U=s=>String(s||'').toUpperCase();
const fmt=n=>n==null||n===''?'—':(n<0?'-':'')+'NT$'+Math.abs(Math.round(n)).toLocaleString(),num=n=>n==null||n===''?'':(+n).toLocaleString();
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const COL={paid:'#7cc68a',unpaid:'#ec8a86',part:'#f6bd72',over:'#86aee8',empty:'#d6d1c9',nodata:'#ffffff'},LBL={paid:'已繳清',unpaid:'未繳',part:'部分繳',over:'溢繳',empty:'空攤／無應收',nodata:'無資料'};
const ZONE={a:['#e6eef7','#7d9cc0','A區攤位'],fe:['#e3f0e6','#7fae8b','F／E區攤位'],out:['#f5e6d3','#c8a57c','外圍／其他攤位'],pub:['#dcd8ea','#8f88b5','公共設施']};
const LKEY='sjf_local_v2';
let P,B,L,D,R,byId,KEY,Y=115,M=4,mapMode='pay';
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)),tob64=u=>{let s='';const a=new Uint8Array(u);for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode.apply(null,a.subarray(i,i+8192));return btoa(s);};
async function unlock(pw){const E=await (await fetch('data.enc.json',{cache:'no-store'})).json();
 const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(E.salt),iterations:E.it,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(E.iv)},key,b64(E.ct));KEY=key;
 return JSON.parse(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text());}
// 本機異動：以同一把金鑰加密後存 localStorage
async function loadLocal(){const s=localStorage.getItem(LKEY);if(!s)return {};try{const o=JSON.parse(s);const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(o.iv)},KEY,b64(o.ct));return JSON.parse(new TextDecoder().decode(pt));}catch(e){toast('本機異動無法解密（可能密碼不同），已略過');return {};}}
async function saveLocal(){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},KEY,new TextEncoder().encode(JSON.stringify(L)));
 try{localStorage.setItem(LKEY,JSON.stringify({iv:tob64(iv),ct:tob64(ct),t:Date.now()}));}catch(e){alert('瀏覽器儲存空間不足，請先匯出備份');}refresh();}
function cnt(){return (L.pay||[]).length+(L.payDel||[]).length+(L.meter||[]).length+(L.jr||[]).length+(L.jrDel||[]).length+(L.rent||[]).length+Object.keys(L.stall||{}).length+(L.stallNew||[]).length;}
function toast(t){const e=$('#toast');e.textContent=t;e.hidden=false;clearTimeout(e._t);e._t=setTimeout(()=>e.hidden=true,2500);}
$('#gf').onsubmit=async e=>{e.preventDefault();$('#gerr').textContent='解密中…';try{P=await unlock($('#pw').value);sessionStorage.k=$('#pw').value;start();}catch(x){console.error(x);$('#gerr').textContent='密碼錯誤';}};
if(sessionStorage.k){unlock(sessionStorage.k).then(p=>{P=p;start();}).catch(()=>sessionStorage.removeItem('k'));}
$('#lock').onclick=()=>{sessionStorage.removeItem('k');location.reload();};
function status(o){if(!o)return'nodata';if(o.due==null||o.due===0)return o.paid>0?'over':'empty';if(o.paid<=0)return'unpaid';if(o.bal===0)return'paid';return o.bal<0?'over':'part';}
let page='ov';
async function start(){B=P.data;L=await loadLocal();[Y,M]=B.ym;
 $('#yy').innerHTML=Array.from({length:20},(_,i)=>`<option>${111+i}</option>`).join('');$('#mm').innerHTML=Array.from({length:12},(_,i)=>`<option>${i+1}</option>`).join('');
 $('#yy').value=Y;$('#mm').value=M;$('#yy').onchange=$('#mm').onchange=()=>{Y=+$('#yy').value;M=+$('#mm').value;refresh();};
 $('#gate').hidden=true;$('#app').hidden=false;$$('nav a').forEach(a=>a.onclick=()=>go(a.dataset.p));$('#menu').onclick=()=>$('#side').classList.toggle('open');refresh();go('ov');}
function refresh(){D=MarketCalc.merge(B,L);R=MarketCalc.compute(D,Y,M);byId={};const c=B.cust;
 R.forEach(o=>{byId[U(o.id)]=o;o.cust=c[U(o.id)+'|'+o.name];if(!o.tel&&o.cust)o.tel=o.cust.tel;});
 const n=cnt();$('#localbar').innerHTML=`⚠️ 新增／修改的資料<b>只存在這台裝置的這個瀏覽器</b>（已加密），換手機／電腦或清除瀏覽器資料就看不到。${n?`目前有 <b>${n}</b> 筆本機異動，請到「匯出／匯入」定期備份。`:'目前沒有本機異動。'}`;
 render(page);}
const PAGES={ov,map,stall,pay,meter,jr,pl,ar,data};
function go(p){page=p;$$('nav a').forEach(a=>a.classList.toggle('on',a.dataset.p==p));$$('main section').forEach(s=>s.hidden=s.id!='p-'+p);
 $('#ttl').textContent=$('nav a[data-p='+p+']').textContent.slice(2).trim();$('#side').classList.remove('open');render(p);}
function render(p){PAGES[p]();}
const ymTxt=()=>`${Y} 年 ${M} 月`;
function tbl(head,rows,cls){return `<div class="tbl"><table class="${cls||''}"><thead><tr>${head.map(h=>`<th class="${/^(應收|已收|餘款|金額|實收|月租|冰庫|停車|清潔|日租|電費|水費|度數|金額計算)/.test(h)?'n':''}">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;}
function stRow(o,extra){return `<tr class="click" data-id="${esc(o.id)}"><td>${esc(o.id)}</td><td>${esc(o.name)}</td><td class="n">${fmt(o.due)}</td><td class="n">${fmt(o.paid)}</td><td class="n">${fmt(o.bal)}</td>${extra||''}</tr>`;}
function bindRows(root){$$(root+' tr.click').forEach(t=>t.onclick=e=>{if(e.target.closest('button'))return;card(t.dataset.id);});}
function sums(){const ar=R.filter(o=>o.ar);return {n:ar.length,due:ar.reduce((a,o)=>a+o.due,0),paid:R.reduce((a,o)=>a+o.paid,0),bal:R.reduce((a,o)=>a+(o.bal||0),0)};}
// ── 總覽
function ov(){const s=sums(),pc=s.due?s.paid/s.due*100:0,un=R.filter(o=>o.bal).sort((a,b)=>b.bal-a.bal).slice(0,15);const st={};R.forEach(o=>{if(o.ar||o.paid){const k=status(o);st[k]=(st[k]||0)+1;}});
 $('#p-ov').innerHTML=`<div class="kpis"><div class="card kpi">本月應收<div class="v">${fmt(s.due)}</div><div class="s">${s.n} 筆應收攤位・${ymTxt()}</div></div>
 <div class="card kpi">本月已收<div class="v">${fmt(s.paid)}</div><div class="s">依銷帳年月歸月</div></div><div class="card kpi">本月餘款<div class="v">${fmt(s.bal)}</div><div class="s">負數＝溢繳</div></div>
 <div class="card kpi">收款率<div class="v">${pc.toFixed(1)}%</div><div class="bar"><i style="width:${Math.min(pc,100)}%"></i></div></div></div>
 <div class="card" style="margin-bottom:12px">${Object.keys(LBL).filter(k=>st[k]).map(k=>`<span class="st" style="background:${COL[k]};color:#222;margin-right:6px">${LBL[k]} ${st[k]}</span>`).join('')}</div>
 <div class="card"><h3 style="margin-top:0">餘款最多的 15 攤（完整清單見「未收款」）</h3>${tbl(['攤位','租戶','應收','已收','餘款'],un.map(o=>stRow(o)))}</div>`;bindRows('#p-ov');}
// ── 平面圖（依「攤位整合平面圖」重畫）
function map(){const Lo=P.layout,leg=mapMode=='pay'?Object.keys(COL).map(k=>`<span style="--c:${COL[k]}">${LBL[k]}</span>`).join(''):Object.keys(ZONE).map(k=>`<span style="--c:${ZONE[k][0]}">${ZONE[k][2]}</span>`).join('');
 const tiles=Lo.tiles.map(t=>{const z=ZONE[t.z];if(!t.id){return `<g><rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" fill="${z[0]}" stroke="${z[1]}" stroke-width=".8"/>${t.label?txt(t.label,t,t.label=='中央大道'?0:1):''}</g>`;}
  const o=byId[U(t.id)],s=status(o),fill=mapMode=='pay'?COL[s]:z[0];
  return `<g class="t" data-id="${esc(t.id)}"><rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" fill="${fill}" stroke="${z[1]}" stroke-width=".8"/>${txt(t.id,t)}<title>${esc(t.id)} ${esc(o?o.name:'無資料')}｜${LBL[s]}${o&&o.bal?'｜餘款 '+fmt(o.bal):''}</title></g>`;}).join('');
 const labs=Lo.labels.map(l=>l.v?`<text x="${l.x}" y="${l.y}" font-size="${l.sz}" fill="#5b6470" text-anchor="middle" style="writing-mode:vertical-rl;letter-spacing:${l.sz>9?6:1}px">${esc(l.s)}</text>`:`<text x="${l.x}" y="${l.y}" font-size="${l.sz}" fill="#5b6470" text-anchor="middle" letter-spacing="${l.sz>9?4:0}">${esc(l.s)}</text>`).join('');
 const onmap=new Set(Lo.tiles.filter(t=>t.id).map(t=>U(t.id))),off=R.filter(o=>!onmap.has(U(o.id))),grp={};
 off.forEach(o=>{const g=/^\d停/.test(o.id)?'停車位':/^庫A/.test(o.id)?'庫A':/^庫/.test(o.id)?'庫':/^臨時/.test(o.id)?'臨時攤位':'其他（子攤位、C/D 區等）';(grp[g]=grp[g]||[]).push(o);});
 $('#p-map').innerHTML=`<div class="row"><div class="tabs" style="margin:0"><button data-mm="pay" class="${mapMode=='pay'?'on':''}">繳費狀態</button><button data-mm="zone" class="${mapMode=='zone'?'on':''}">區域配色</button></div>
 <input id="mq" placeholder="搜尋攤號或租戶" style="max-width:240px"><span class="muted" style="font-size:13px">${ymTxt()}</span></div><div class="legend">${leg}</div>
 <div class="mapwrap card" style="padding:6px"><svg class="fp" viewBox="0 0 ${Lo.w} ${Lo.h}" xmlns="http://www.w3.org/2000/svg"><text x="512" y="22" font-size="15" text-anchor="middle" fill="#333">十甲發｜攤位整合平面圖</text><line x1="20" y1="58" x2="1004" y2="58" stroke="#2f3a4a" stroke-width="2"/>${tiles}${labs}</svg></div>
 <div class="card" style="margin-top:12px"><h3 style="margin-top:0">不在平面圖上的攤位（${off.length}）</h3>${Object.keys(grp).map(g=>`<p style="margin:8px 0 4px"><b>${g}</b>（${grp[g].length}）</p><div class="chips">${grp[g].map(o=>`<span class="chip" data-id="${esc(o.id)}" style="background:${COL[status(o)]}">${esc(o.id)}</span>`).join('')}</div>`).join('')}</div>`;
 $$('#p-map [data-mm]').forEach(b=>b.onclick=()=>{mapMode=b.dataset.mm;map();});$$('#p-map .t,#p-map .chip').forEach(c=>c.onclick=()=>card(c.dataset.id));
 $('#mq').oninput=e=>{const q=U(e.target.value.trim()).replace(/^A(\d{1,2})$/,(m,n)=>'A'+n.padStart(3,'0'));$$('#p-map .t').forEach(g=>{const o=byId[U(g.dataset.id)],hit=q&&(U(g.dataset.id)==q||(q.length>=2&&o&&U(o.name).includes(q)));g.querySelector('rect').setAttribute('stroke-width',hit?4:.8);g.querySelector('rect').setAttribute('stroke',hit?'#000':ZONE[P.layout.tiles.find(t=>t.id==g.dataset.id).z][1]);if(hit)g.scrollIntoView({block:'center',inline:'center',behavior:'smooth'});});};}
function txt(s,t,big){const fs=Math.min(t.h*0.55,(t.w-2)/Math.max(String(s).length*0.62,1),big?12:9.5);return `<text x="${t.x+t.w/2}" y="${t.y+t.h/2+fs*0.36}" font-size="${fs.toFixed(1)}" text-anchor="middle" fill="#222">${esc(s)}</text>`;}
// ── 攤位資料卡
function card(id){const o=byId[U(id)];let h;
 if(!o){h=`<h2>${esc(id)}</h2><p class="muted">平面圖上有此攤號，但試算表「02攤位建檔資料庫」沒有這個攤位。</p><button id="newst">建立這個攤位</button>`;openM(h);$('#newst').onclick=()=>editStall(null,id);return;}
 const s=status(o),r=o.rent,rd=o.read,q=(k,n)=>rd[k][0]||rd[k][1]?`<div><b>${n}</b>${rd[k][0]} → ${rd[k][1]}（${rd[k][2]} 度 × ${o.rate[k]}）</div>`:'';
 const hs=o.hist.slice().sort((a,b)=>(+b.y-+a.y)||(+b.m-+a.m)||String(b.d).localeCompare(a.d)).slice(0,24);
 h=`<h2 style="margin:0 30px 4px 0">${esc(o.id)} <span class="st" style="background:${COL[s]};color:#222">${LBL[s]}</span></h2><p class="muted" style="margin-top:0">${esc(o.name||'（無租客）')}${o.note?'・'+esc(o.note):''}・${ymTxt()}</p>
 <div class="grid2"><div><b>電話</b>${esc(o.tel||'—')}</div><div><b>車牌</b>${esc(o.cust&&o.cust.plate||'—')}</div><div><b>保證金</b>${o.cust&&o.cust.dep?fmt(o.cust.dep):'—'}</div><div><b>租金生效年月</b>${r.ym||'—'}${r.type?'（'+esc(r.type)+'）':''}</div>
 <div><b>月租</b>${fmt(r.mon)}</div><div><b>日租</b>${fmt(r.day)}</div><div><b>冰庫</b>${fmt(r.ice)}</div><div><b>停車</b>${fmt(r.park)}</div><div><b>清潔費</b>${fmt(r.clean)}</div><div><b>電費／水費</b>${fmt(o.elec)}／${fmt(o.water)}</div>
 <div><b>水電讀數月份</b>${o.pY.join('/')} → ${o.mY.join('/')}</div><div><b>合約</b>未登錄</div>${q('e1','電錶1')}${q('e2','電錶2')}${q('w1','水錶1')}${q('w2','水錶2')}</div>
 <div class="kpis" style="grid-template-columns:repeat(3,1fr);margin:12px 0"><div class="card kpi">本月應收<div class="v" style="font-size:18px">${fmt(o.due)}</div></div><div class="card kpi">本月已收<div class="v" style="font-size:18px">${fmt(o.paid)}</div></div><div class="card kpi">本月餘款<div class="v" style="font-size:18px">${fmt(o.bal)}</div></div></div>
 <div class="row"><button id="c-pay">登記繳費／銷帳</button><button id="c-ed" class="ghost">編輯攤位</button></div>
 <h3>繳費紀錄（最近 ${hs.length} 筆／共 ${o.hist.length} 筆）</h3>${tbl(['銷帳年月','日期','姓名','實收','方式','經手人'],hs.map(p=>`<tr class="${p.k[0]=='L'?'loc':''}"><td>${esc(p.y)}/${esc(p.m)}</td><td>${esc(p.d)}</td><td>${esc(p.nm)}</td><td class="n">${fmt(p.amt||0)}</td><td>${esc(p.pay||'')}${p.bill?' #'+esc(p.bill):''}</td><td>${esc(p.who||'')}</td></tr>`))}`;
 openM(h);$('#c-pay').onclick=()=>payForm(o);$('#c-ed').onclick=()=>editStall(o);}
function openM(h){$('#mbody').innerHTML=h;$('#modal').hidden=false;}
$('#mx').onclick=()=>$('#modal').hidden=true;$('#modal').onclick=e=>{if(e.target.id=='modal')$('#modal').hidden=true;};
const F=(id,label,val,type,opts)=>`<label>${label}${opts?`<select id="${id}">${opts.map(x=>`<option ${x==val?'selected':''}>${esc(x)}</option>`).join('')}</select>`:`<input id="${id}" type="${type||'text'}" value="${esc(val??'')}" ${type=='number'?'step="any"':''}>`}</label>`;
const V=id=>{const e=$('#'+id);return e?e.value.trim():'';};
// ── 攤位建檔
let stQ='';
function stall(){const rows=R.filter(o=>!stQ||U(o.id+o.name+o.tel).includes(U(stQ))).map(o=>`<tr class="click" data-id="${esc(o.id)}"><td>${esc(o.id)}</td><td>${esc(o.name)}</td><td>${esc(o.tel)}</td><td class="n">${num(o.rent.mon)}</td><td class="n">${num(o.rent.ice)}</td><td class="n">${num(o.rent.park)}</td><td class="n">${num(o.rent.clean)}</td><td class="n">${num(o.rent.day)}</td><td class="n">${num(o.elec)}</td><td class="n">${num(o.water)}</td><td class="n">${fmt(o.due)}</td><td class="n">${fmt(o.paid)}</td><td class="n">${fmt(o.bal)}</td><td><button class="sm ghost" data-ed="${esc(o.id)}">編輯</button></td></tr>`);
 $('#p-stall').innerHTML=`<div class="card"><div class="row"><input id="stq" placeholder="搜尋攤號／姓名／電話" value="${esc(stQ)}"><button id="stnew">＋ 新增攤位</button><button class="ghost" id="stcsv">匯出 CSV</button><span class="muted">${rows.length} 攤・${ymTxt()}</span></div>
 ${tbl(['攤位','租客','電話','月租','冰庫','停車','清潔','日租','電費','水費','應收','已收','餘款',''],rows)}</div><p class="muted" style="font-size:12px">租金照原表：取「攤位更新」中該攤年月範圍最大的一筆（不限 ≤ 本月）。編輯租金會新增一筆攤位更新紀錄。</p>`;
 $('#stq').oninput=e=>{stQ=e.target.value;const p=e.target.selectionStart;stall();$('#stq').focus();$('#stq').setSelectionRange(p,p);};
 $('#stnew').onclick=()=>editStall(null,'');$('#stcsv').onclick=()=>csv('攤位建檔_'+Y+'_'+M,stallSheet());$$('#p-stall [data-ed]').forEach(b=>b.onclick=()=>editStall(byId[U(b.dataset.ed)]));bindRows('#p-stall');}
function editStall(o,newId){const r=o?o.rent:{};const ymd=Y*100+M;
 openM(`<h2>${o?'編輯攤位 '+esc(o.id):'新增攤位'}</h2><div class="form">${F('e-id','攤位編號',o?o.id:newId)}${F('e-nm','租客姓名（空白＝空攤）',o?o.name:'')}${F('e-tel','電話',o?o.tel:'')}${F('e-note','備註',o?o.note:'')}</div>
 <h3>租金（新增一筆攤位更新）</h3><div class="form">${F('e-ym','年月範圍 yyyMM',r.ym&&r.ym>=ymd?r.ym:ymd,'number')}${F('e-type','日租/月租',r.type||'月租',null,['月租','日租'])}${F('e-day','攤位(日租)',r.day||0,'number')}${F('e-mon','攤位(月租)',r.mon||0,'number')}${F('e-ice','冰庫(月租)',r.ice||0,'number')}${F('e-park','停車位租金',r.park||0,'number')}${F('e-cl','清潔費',r.clean||0,'number')}</div>
 <label class="muted" style="font-size:13px"><input type="checkbox" id="e-rent" style="width:auto"> 同時儲存租金變更</label><div class="row" style="margin-top:10px"><button id="e-save">儲存到這台裝置</button></div>`);
 $('#e-save').onclick=async()=>{const id=V('e-id');if(!id)return alert('請填攤位編號');
  if(o&&U(id)==U(o.id)){(L.stall=L.stall||{})[U(id)]={name:V('e-nm'),tel:V('e-tel'),note:V('e-note')};}
  else{if(byId[U(id)])return alert('攤位編號已存在');(L.stallNew=L.stallNew||[]).push({id,name:V('e-nm'),tel:V('e-tel'),note:V('e-note')});}
  if($('#e-rent').checked||!o){(L.rent=(L.rent||[]).filter(x=>!(x[0]==+V('e-ym')&&U(x[1])==U(id)))).push([+V('e-ym'),id,V('e-nm'),V('e-type'),+V('e-day'),+V('e-mon'),+V('e-ice'),+V('e-park'),+V('e-cl')]);}
  $('#modal').hidden=true;await saveLocal();toast('已儲存（只存在這台裝置）');};}
// ── 繳費登記
let pyQ='',pyAll=false,pyPg=0;
function payForm(o,amt){const today=new Date().toISOString().slice(0,10);
 openM(`<h2>登記繳費／銷帳</h2><p class="muted">銷帳年月＝這筆錢沖哪個月的帳（本月已收依此歸月）。</p><div class="form">${F('p-st','攤位編號',o?o.id:'')}${F('p-nm','租客姓名',o?o.name:'')}${F('p-y','銷帳(年)',Y,'number')}${F('p-m','銷帳(月)',M,'number')}
 ${F('p-d','繳費日期',today,'date')}${F('p-item','繳款項目','不分項目 月結款',null,B.lk.items)}${F('p-amt','實收/退金額（退款填負數）',amt!=null?amt:(o&&o.bal>0?o.bal:''),'number')}${F('p-paym','付款方式','現金',null,B.lk.paym)}
 ${F('p-bill','票據編號','')}${F('p-bdue','票據到期日','','date')}${F('p-inv','發票','',null,['','開發票'])}${F('p-who','經手人','')}${F('p-memo','備註','')}</div><datalist id="stl">${R.map(x=>`<option value="${esc(x.id)}">`).join('')}</datalist>
 <div class="row"><button id="p-save">儲存到這台裝置</button><span class="muted" id="p-hint"></span></div>`);
 $('#p-st').setAttribute('list','stl');const hint=()=>{const x=byId[U(V('p-st'))];if(x){if(!V('p-nm')||document.activeElement.id=='p-st')$('#p-nm').value=x.name;$('#p-hint').textContent=`${ymTxt()} 應收 ${fmt(x.due)}，已收 ${fmt(x.paid)}，餘款 ${fmt(x.bal)}`;}else $('#p-hint').textContent='查無此攤位';};$('#p-st').oninput=hint;hint();
 $('#p-save').onclick=async()=>{if(!byId[U(V('p-st'))])return alert('查無此攤位');if(V('p-amt')==='')return alert('請填金額');
  const p={k:'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),st:V('p-st'),nm:V('p-nm'),y:String(+V('p-y')),m:String(+V('p-m')),d:V('p-d').replace(/-/g,'/'),item:V('p-item'),amt:+V('p-amt'),pay:V('p-paym'),bill:V('p-bill'),bdue:V('p-bdue').replace(/-/g,'/'),inv:V('p-inv'),who:V('p-who'),memo:V('p-memo'),local:1};
  (L.pay=L.pay||[]).push(p);$('#modal').hidden=true;await saveLocal();toast('已登記（只存在這台裝置）');};}
function pay(){const key=Y+'|'+M;let rows=D.pays.filter(p=>(pyAll||String(p.y)+'|'+String(p.m)==key)&&(!pyQ||U(p.st+p.nm).includes(U(pyQ))));rows=rows.slice().reverse();
 const tot=rows.reduce((a,p)=>a+(+p.amt||0),0),PG=200,pages=Math.ceil(rows.length/PG)||1;if(pyPg>=pages)pyPg=0;
 $('#p-pay').innerHTML=`<div class="card"><div class="row"><button id="py-new">＋ 新增繳費</button><input id="pyq" placeholder="攤位／姓名" value="${esc(pyQ)}"><label class="muted"><input type="checkbox" id="pyall" style="width:auto" ${pyAll?'checked':''}> 顯示全部月份</label><button class="ghost" id="pycsv">匯出 CSV</button></div>
 <p class="muted">${pyAll?'全部月份':'銷帳年月 '+ymTxt()}：${rows.length} 筆，合計 ${fmt(tot)}。黃底＝本機新增。</p>
 ${tbl(['銷帳年月','日期','攤位','姓名','繳款項目','實收','付款方式','票據','經手人','備註',''],rows.slice(pyPg*PG,pyPg*PG+PG).map(p=>`<tr class="${p.local?'loc':''}"><td>${esc(p.y)}/${esc(p.m)}</td><td>${esc(p.d)}</td><td>${esc(p.st)}</td><td>${esc(p.nm)}</td><td>${esc(p.item)}</td><td class="n">${fmt(p.amt||0)}</td><td>${esc(p.pay)}</td><td>${esc(p.bill||'')} ${esc(p.bdue||'')}</td><td>${esc(p.who)}</td><td>${esc(p.memo)}</td><td><button class="sm ghost" data-del="${p.k}">刪除</button></td></tr>`))}
 <div class="pager">${pages>1?`<button class="sm ghost" id="pg-">‹</button> 第 ${pyPg+1}/${pages} 頁 <button class="sm ghost" id="pg+">›</button>`:''}</div></div>`;
 $('#py-new').onclick=()=>payForm(null);$('#pyq').onchange=e=>{pyQ=e.target.value;pyPg=0;pay();};$('#pyall').onchange=e=>{pyAll=e.target.checked;pyPg=0;pay();};
 if($('#pg-')){$('#pg-').onclick=()=>{pyPg=Math.max(0,pyPg-1);pay();};$('#pg+').onclick=()=>{pyPg=Math.min(pages-1,pyPg+1);pay();};}
 $('#pycsv').onclick=()=>csv('繳費登記',paySheet(rows));
 $$('#p-pay [data-del]').forEach(b=>b.onclick=async()=>{const k=b.dataset.del;if(!confirm(k[0]=='L'?'刪除這筆本機新增的繳費？':'這是原試算表的紀錄，刪除只會在這台裝置隱藏它（可在匯出／匯入頁還原）。確定？'))return;
  if(k[0]=='L')L.pay=L.pay.filter(p=>p.k!=k);else (L.payDel=L.payDel||[]).push(k);await saveLocal();});}
// ── 水電錶登記
let mtQ='',mtOnly=true;
function meter(){const [my,mm]=MarketCalc.prevYM(Y,M),[py,pm]=MarketCalc.prevYM(my,mm);
 const cur={},prev={};D.meters.forEach(r=>{const k=U(r[0]);if(r[1]==my&&r[2]==mm)cur[k]=r;if(r[1]==py&&r[2]==pm)prev[k]=r;});const lk=new Set((L.meter||[]).map(r=>U(r[0])+'|'+r[1]+'|'+r[2]));
 const list=D.stalls.filter(s=>(!mtOnly||cur[U(s.id)]||prev[U(s.id)])&&(!mtQ||U(s.id+s.name).includes(U(mtQ))));
 const rows=list.map(s=>{const k=U(s.id),c=cur[k]||[s.id,my,mm,0,8,0,8,0,8,0,8,''],p=prev[k]||[0,0,0,0,0,0,0,0,0,0,0,0];
  const dl=(i)=>MarketCalc.delta(+p[i]||0,+c[i]||0);return `<tr class="${lk.has(k+'|'+my+'|'+mm)?'loc':''}" data-id="${esc(s.id)}"><td>${esc(s.id)}</td><td>${esc(s.name)}</td>
  <td class="n">${num(p[3])}</td><td><input data-i="3" value="${c[3]}"></td><td class="n d3">${dl(3)}</td><td><input data-i="4" value="${c[4]}"></td>
  <td class="n">${num(p[5])}</td><td><input data-i="5" value="${c[5]}"></td><td class="n d5">${dl(5)}</td><td><input data-i="6" value="${c[6]}"></td>
  <td class="n">${num(p[7])}</td><td><input data-i="7" value="${c[7]}"></td><td class="n d7">${dl(7)}</td><td><input data-i="8" value="${c[8]}"></td>
  <td class="n">${num(p[9])}</td><td><input data-i="9" value="${c[9]}"></td><td class="n d9">${dl(9)}</td><td><input data-i="10" value="${c[10]}"></td><td><button class="sm" data-sv>存</button></td></tr>`;});
 $('#p-meter').innerHTML=`<div class="card"><p>帳單 ${ymTxt()} 用的是 <b>${py}/${pm} → ${my}/${mm}</b> 的讀數差（水電晚一個月），費率取 ${my}/${mm} 那筆。這頁輸入的是 <b>${my} 年 ${mm} 月</b> 的讀數。</p>
 <div class="row"><input id="mtq" placeholder="攤位／姓名" value="${esc(mtQ)}"><label class="muted"><input type="checkbox" id="mtonly" style="width:auto" ${mtOnly?'checked':''}> 只顯示有抄表的攤位</label><button class="ghost" id="mtcsv">匯出 CSV</button><span class="muted">${rows.length} 攤</span></div>
 ${tbl(['攤位','租客','電1上月','電1本月','度數','電1費率','電2上月','電2本月','度數','電2費率','水1上月','水1本月','度數','水1費率','水2上月','水2本月','度數','水2費率',''],rows)}
 <p class="muted" style="font-size:12px">度數照原表：本月−上月；若為負（跳表）＝基數−1−上月＋本月（基數依上月讀數位數 100/1000/10000/100000，少算 1 度照抄）。儲存會取代該攤該月的讀數（原表同攤同月多列會相加）。</p></div>`;
 $('#mtq').onchange=e=>{mtQ=e.target.value;meter();};$('#mtonly').onchange=e=>{mtOnly=e.target.checked;meter();};$('#mtcsv').onclick=()=>csv('水電錶登記',meterSheet());
 $$('#p-meter tr[data-id]').forEach(tr=>{const id=tr.dataset.id,p=prev[U(id)]||[];tr.oninput=()=>{[3,5,7,9].forEach(i=>tr.querySelector('.d'+i).textContent=MarketCalc.delta(+p[i]||0,+tr.querySelector(`[data-i="${i}"]`).value||0));};
  tr.querySelector('[data-sv]').onclick=async()=>{const c=cur[U(id)];const row=[id,my,mm];for(let i=3;i<=10;i++)row.push(+tr.querySelector(`[data-i="${i}"]`).value||0);row.push(c?c[11]:'');
   L.meter=(L.meter||[]).filter(r=>!(U(r[0])==U(id)&&r[1]==my&&r[2]==mm));L.meter.push(row);await saveLocal();toast(id+' 讀數已存（只存在這台裝置）');};});}
// ── 日帳流水帳
function jrYM(){return (Y+1911)+'年'+String(M).padStart(2,'0')+'月';}
function jr(){const J=MarketCalc.journal(D).filter(j=>j.ym==jrYM());const sum=k=>J.filter(j=>j.pl==k).reduce((a,j)=>a+j.signed,0);const cats=Object.keys(B.lk.cat).filter(c=>c!='流水帳類別');
 $('#p-jr').innerHTML=`<div class="card"><h3 style="margin-top:0">新增一筆（${jrYM()}）</h3><div class="form">${F('j-date','日期',`${Y+1911}-${String(M).padStart(2,'0')}-01`,'date')}${F('j-cat','類別','現金支出',null,cats)}${F('j-item','明細項目','')}${F('j-amt','金額（正數）','','number')}${F('j-who','經手人','')}${F('j-memo','備註','')}${F('j-j','(1收入/2支出)','',null,['','1','2'])}</div><button id="j-add">新增到這台裝置</button></div>
 <div class="card" style="margin-top:12px"><div class="row"><b>${jrYM()}</b><span>營業收入 ${fmt(sum('營業收入')+sum('收入'))}</span><span>營業支出 ${fmt(sum('營業支出')+sum('支出'))}</span><span>淨額 ${fmt(J.reduce((a,j)=>a+j.signed,0))}</span><button class="ghost" id="jcsv">匯出 CSV</button></div>
 ${tbl(['日期','流水序號','類別','損益項目','明細項目','金額','經手人','備註','金額計算',''],J.map(j=>`<tr class="${j.local?'loc':''}"><td>${esc(j.date)}</td><td>${esc(j.seq??'')}</td><td>${esc(j.cat)}</td><td>${esc(j.pl)}</td><td>${esc(j.item)}</td><td class="n">${num(j.amt)}</td><td>${esc(j.who)}</td><td>${esc(j.memo)}</td><td class="n">${num(j.signed)}</td><td><button class="sm ghost" data-jd="${j.k}">刪除</button></td></tr>`))}</div>`;
 $('#jcsv').onclick=()=>csv('日帳流水帳_'+jrYM(),jrSheet(J));
 $('#j-add').onclick=async()=>{if(!V('j-amt')||!V('j-item'))return alert('請填明細與金額');const seq=Math.max(0,...D.jr.map(j=>+j.seq||0))+1;
  (L.jr=L.jr||[]).push({k:'L'+Date.now().toString(36),date:V('j-date').replace(/-/g,''),seq,cat:V('j-cat'),item:V('j-item'),amt:Math.abs(+V('j-amt')),who:V('j-who'),memo:V('j-memo'),j:V('j-j'),local:1});await saveLocal();toast('已新增（只存在這台裝置）');};
 $$('#p-jr [data-jd]').forEach(b=>b.onclick=async()=>{const k=b.dataset.jd;if(!confirm('刪除這筆？'+(k[0]=='L'?'':'（原表紀錄只會在這台裝置隱藏）')))return;if(k[0]=='L')L.jr=L.jr.filter(j=>j.k!=k);else (L.jrDel=L.jrDel||[]).push(k);await saveLocal();});}
// ── 損益
function pl(){const p=MarketCalc.pnl(D,Y,M);
 $('#p-pl').innerHTML=`<div class="kpis"><div class="card kpi">營業收入（應收制）<div class="v">${fmt(p.inc.合計)}</div></div><div class="card kpi">營業支出<div class="v">${fmt(p.exp)}</div><div class="s">流水帳 ${p.ym}</div></div><div class="card kpi">營業收入（其他）<div class="v">${fmt(p.oth)}</div></div><div class="card kpi">總計<div class="v">${fmt(p.total)}</div></div></div>
 <div class="card">${tbl(['項目','金額'],Object.entries(p.inc).map(([k,v])=>`<tr><td>${k}</td><td class="n">${fmt(v)}</td></tr>`))}<p class="muted" style="font-size:12px">照原「損益」表：收入＝本月「應收」攤位的總租金、清潔、停車、冰庫、臨租（日租）、電費、水費（應收制，不是實收）；支出／其他收入取日帳流水帳 ${p.ym}（支出為負數）；總計＝三者相加。原表樞紐需手動重新整理，這裡即時計算。</p></div>`;}
// ── 未收款
let arQ='';
function ar(){const un=R.filter(o=>o.bal&&(!arQ||U(o.id+o.name).includes(U(arQ)))).sort((a,b)=>b.bal-a.bal),pos=un.filter(o=>o.bal>0),neg=un.filter(o=>o.bal<0);
 $('#p-ar').innerHTML=`<div class="card"><div class="row"><input id="arq" placeholder="攤位／姓名" value="${esc(arQ)}"><span>欠款 ${pos.length} 攤，合計 ${fmt(pos.reduce((a,o)=>a+o.bal,0))}</span><span>溢繳 ${neg.length} 攤，合計 ${fmt(neg.reduce((a,o)=>a+o.bal,0))}</span><button class="ghost" id="arcsv">匯出 CSV</button></div>
 ${tbl(['攤位','租戶','應收','已收','餘款','電話',''],un.map(o=>stRow(o,`<td>${esc(o.tel||'')}</td><td>${o.bal>0?`<button class="sm" data-ar="${esc(o.id)}">銷帳</button>`:''}</td>`)))}
 <p class="muted" style="font-size:12px">照原「年月應收報表餘款」：列出本月餘款 ≠ 0 的攤位（負數＝溢繳，原表不自動結轉）。按「銷帳」會帶入餘款金額新增一筆繳費。</p></div>`;
 $('#arq').onchange=e=>{arQ=e.target.value;ar();};$('#arcsv').onclick=()=>csv('未收款_'+Y+'_'+M,[['攤位編號','租客姓名','本月應收','本月已收','本月餘款','電話']].concat(un.map(o=>[o.id,o.name,o.due,o.paid,o.bal,o.tel])));
 $$('#p-ar [data-ar]').forEach(b=>b.onclick=()=>{const o=byId[U(b.dataset.ar)];payForm(o,o.bal);});bindRows('#p-ar');}
// ── 匯出／匯入
const stallSheet=()=>[['攤位編號','租客姓名','電話','備註','攤位(日租)','攤位(月租)','冰庫(月租)','停車位租金','清潔費','電錶1度數','電錶2度數','水錶1度數','水錶2度數','電費','水費','本月應收','本月已收','本月餘款']].concat(R.map(o=>[o.id,o.name,o.tel,o.note,o.rent.day,o.rent.mon,o.rent.ice,o.rent.park,o.rent.clean,o.read.e1[2],o.read.e2[2],o.read.w1[2],o.read.w2[2],o.elec,o.water,o.due??'',o.paid,o.bal??'']));
const paySheet=rows=>[['攤位編號','租客姓名','銷帳(年)','銷帳(月)','日期','繳款項目','實收/退金額','票據編號','票據到期日','發票','付款方式','備註','經手人','來源']].concat(rows.map(p=>[p.st,p.nm,p.y,p.m,p.d,p.item,p.amt,p.bill,p.bdue,p.inv,p.pay,p.memo,p.who,p.local?'本機新增':'原試算表']));
const meterSheet=()=>[['攤位編號','年','月','電錶','電錶/1度費用','電錶/2','電錶/2度費用','水錶','水錶/1度費用','水錶/2','水錶/2度費用','備註']].concat(D.meters);
const jrSheet=J=>[['日期','流水序號','類別','損益項目','明細項目','金額','經手人','備註','年月','(1收入/2支出)','金額計算']].concat(J.map(j=>[j.date,j.seq,j.cat,j.pl,j.item,j.amt,j.who,j.memo,j.ym,j.j,j.signed]));
function dl(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);}
function csv(name,rows){dl(name+'.csv',new Blob(['\ufeff'+rows.map(r=>r.map(v=>{v=v??'';v=String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',')).join('\r\n')],{type:'text/csv'}));}
function xls(){const sh=[['攤位建檔_'+Y+'年'+M+'月',stallSheet()],['繳費登記',paySheet(D.pays)],['水電錶登記',meterSheet()],['日帳流水帳',jrSheet(MarketCalc.journal(D))],
  ['未收款_'+Y+'年'+M+'月',[['攤位編號','租客姓名','本月應收','本月已收','本月餘款']].concat(R.filter(o=>o.bal).map(o=>[o.id,o.name,o.due,o.paid,o.bal]))]];
 const x=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const body=sh.map(([n,rows])=>`<Worksheet ss:Name="${x(n.slice(0,31))}"><Table>${rows.map((r,i)=>`<Row>${r.map(v=>typeof v=='number'?`<Cell><Data ss:Type="Number">${v}</Data></Cell>`:`<Cell${i==0?' ss:StyleID="h"':''}><Data ss:Type="String">${x(v)}</Data></Cell>`).join('')}</Row>`).join('')}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane></WorksheetOptions></Worksheet>`).join('');
 dl(`十甲發市場_${Y}年${M}月_匯出.xls`,new Blob([`<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#E7EFE3" ss:Pattern="Solid"/></Style></Styles>${body}</Workbook>`],{type:'application/vnd.ms-excel'}));}
function data(){const n=cnt();
 $('#p-data').innerHTML=`<div class="card"><h3 style="margin-top:0">匯出</h3><div class="row"><button id="x-xls">匯出 Excel（全部工作表）</button><button class="ghost" id="x-st">攤位建檔 CSV</button><button class="ghost" id="x-py">繳費登記 CSV</button><button class="ghost" id="x-mt">水電錶 CSV</button><button class="ghost" id="x-jr">流水帳 CSV</button></div>
 <p class="muted" style="font-size:12px">Excel 檔為 XML 試算表格式（.xls），Excel 開啟時若跳出格式提醒按「是」即可。內容含原試算表資料＋本機異動，<b>含租戶個資，請妥善保管</b>。</p></div>
 <div class="card" style="margin-top:12px"><h3 style="margin-top:0">本機異動備份（${n} 筆）</h3><div class="row"><button id="b-exp">匯出備份檔 (.json)</button><label class="ghost" style="border:1px solid var(--line);padding:9px 14px;border-radius:10px;cursor:pointer">匯入備份檔<input type="file" id="b-imp" accept=".json" hidden></label><button class="red" id="b-clr">清除這台裝置的本機異動</button></div>
 <p class="muted" style="font-size:12px">新增／修改只存在這台裝置的瀏覽器（localStorage，已用登入密碼加密）。要換裝置或備份，請匯出備份檔，到另一台登入後匯入。匯入會<b>取代</b>目前裝置上的本機異動。備份檔本身未加密，含個資，請勿外流。</p>
 ${tbl(['類別','筆數'],[['繳費新增',(L.pay||[]).length],['繳費隱藏',(L.payDel||[]).length],['水電讀數',(L.meter||[]).length],['流水帳新增',(L.jr||[]).length],['流水帳隱藏',(L.jrDel||[]).length],['攤位修改',Object.keys(L.stall||{}).length],['攤位新增',(L.stallNew||[]).length],['租金變更',(L.rent||[]).length]].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`))}</div>`;
 $('#x-xls').onclick=xls;$('#x-st').onclick=()=>csv('攤位建檔_'+Y+'_'+M,stallSheet());$('#x-py').onclick=()=>csv('繳費登記',paySheet(D.pays));$('#x-mt').onclick=()=>csv('水電錶登記',meterSheet());$('#x-jr').onclick=()=>csv('日帳流水帳',jrSheet(MarketCalc.journal(D)));
 $('#b-exp').onclick=()=>dl('十甲發_本機異動備份_'+new Date().toISOString().slice(0,10)+'.json',new Blob([JSON.stringify({app:'sjf',v:2,at:new Date().toISOString(),L},null,1)],{type:'application/json'}));
 $('#b-imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const o=JSON.parse(await f.text());if(o.app!='sjf'||!o.L)throw 0;if(!confirm('匯入會取代這台裝置目前的本機異動，確定？'))return;L=o.L;await saveLocal();toast('已匯入');}catch(x){alert('不是有效的備份檔');}};
 $('#b-clr').onclick=async()=>{if(!confirm('確定清除這台裝置所有本機異動？（建議先匯出備份）'))return;L={};localStorage.removeItem(LKEY);refresh();toast('已清除');};}
})();
