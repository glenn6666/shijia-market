// 十甲發市場：修改紀錄（篩選、還原）＋老闆權限設定頁
(function(g){
const A=window.SJFAudit,S=window.SJFSync,esc=A.esc,U=s=>String(s||'').toUpperCase();
const F={from:'',to:'',op:'',st:'',sec:''};
const ts=t=>{const d=new Date(t),z=n=>String(n).padStart(2,'0');return `${d.getFullYear()-1911}/${z(d.getMonth()+1)}/${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;};
const ymd=t=>{const d=new Date(t);return d.getFullYear()*1e4+(d.getMonth()+1)*100+d.getDate();};
function render(o){const el=o.el,L=o.L(),P=o.perm(),own=A.isOwner(),op=localStorage.sjf_op||'';
 const lk=(c,k)=>{if(c=='payDel'){const p=(o.B.pays||[]).find(x=>x.k==k);return p?p.st:'';}return '';};
 const log=(L.log||[]).slice().sort((a,b)=>b.t-a.t),undone=new Set(log.filter(e=>e.u).map(e=>e.u));
 const base=e=>{if(e.c!='meter'||(e.o&&e.n))return null;const v=JSON.parse(e.n||e.o||'null');if(!v)return null;const r=(o.B.meters||[]).find(r=>U(r[0])==U(v[0])&&r[1]==v[1]&&r[2]==v[2]);return r?JSON.stringify(r.slice(0,v.length)):null;};
 const desc=e=>{const b=base(e);return !b?A.fields(e):e.o?'改回原表 '+A.fields(Object.assign({},e,{n:b})):'修改原表 '+A.fields(Object.assign({},e,{o:b}));};
 const rows=log.map(e=>Object.assign({st:A.stallOf(e,lk)||''},e));
 const ops=[...new Set(rows.map(e=>e.op))].sort();
 const f=rows.filter(e=>(!F.from||ymd(e.t)>=+F.from.replace(/-/g,''))&&(!F.to||ymd(e.t)<=+F.to.replace(/-/g,''))&&(!F.op||e.op==F.op)&&(!F.st||U(e.st).includes(U(F.st)))&&(!F.sec||(A.CAT[e.c]||e.c)==F.sec));
 const permRows=Object.entries(A.SEC).map(([k,n])=>`<tr><td>${n}</td><td>${own?`<label><input type="radio" name="pm-${k}" value="edit" ${P.cfg.p[k]!='view'?'checked':''}> 可編輯</label>　<label><input type="radio" name="pm-${k}" value="view" ${P.cfg.p[k]=='view'?'checked':''}> 只能看</label>`:(P.cfg.p[k]=='view'?'🔒 只能看':'✏️ 可編輯')}</td></tr>`).join('');
 el.innerHTML=`<div class="card"><h3>🔑 員工權限</h3>
 <p class="muted" style="font-size:13px">員工用平常的密碼登入，除了「年度報表」其他頁面都看得到。下面設定員工能不能<b>修改</b>各區塊；老闆解鎖後不受限制。${P.cfg.t?`（目前設定：${ts(P.cfg.t)} 老闆簽章）`:'（目前是預設：全部可編輯）'}</p>
 ${P.state=='bad'?'<p class="err">⚠️ 同步收到的權限設定簽章不對（可能被改過），已忽略，沿用上一份正確的設定。</p>':''}
 <div class="tbl"><table><thead><tr><th>區塊</th><th>員工</th></tr></thead><tbody>${permRows}</tbody></table></div>
 ${own?`<button id="pm-save">儲存權限設定</button> <button class="ghost" id="pm-out">結束老闆模式</button>`:`<form id="ow-f">老闆解鎖（用年度報表那組密碼）：<input id="ow-pw" type="password" placeholder="老闆密碼" autocomplete="off"> <button>解鎖</button> <span id="ow-err" class="err"></span></form>`}</div>
 <div class="card"><h3>🧾 修改紀錄</h3><p class="muted" style="font-size:13px">每一筆新增／修改／刪除都會記下時間、誰、改了什麼，跟著雲端同步。改錯了按「還原」改回原本的值（老闆可還原全部；員工只能還原自己 24 小時內的修改）。</p>
 <div class="flt">日期 <input type="date" id="lf-from" value="${F.from}"> ～ <input type="date" id="lf-to" value="${F.to}">
 人員 <select id="lf-op"><option value="">全部</option>${ops.map(x=>`<option ${x==F.op?'selected':''}>${esc(x)}</option>`).join('')}</select>
 區塊 <select id="lf-sec"><option value="">全部</option>${Object.entries(A.SEC).map(([k,n])=>`<option value="${k}" ${k==F.sec?'selected':''}>${n.split('（')[0]}</option>`).join('')}<option value="perm" ${F.sec=='perm'?'selected':''}>權限設定</option></select>
 攤位 <input id="lf-st" value="${esc(F.st)}" size="8" placeholder="例如 A001"> <span class="muted">共 ${f.length} 筆${f.length>500?'，只顯示最新 500 筆':''}</span></div>
 <div class="tbl"><table><thead><tr><th>時間</th><th>人員</th><th>項目</th><th>攤位</th><th>內容</th><th></th></tr></thead><tbody>${f.slice(0,500).map(e=>`<tr${e.u?' class="lg-undo"':''}><td style="white-space:nowrap">${ts(e.t)}</td><td>${esc(e.op)}<small class="muted">（${esc(e.role||'')}）</small></td><td>${A.CLBL[e.c]||e.c}${e.u?'<br><small>↩︎ 還原操作</small>':''}</td><td>${esc(e.st)}</td><td style="font-size:12px;white-space:normal;min-width:260px">${esc(desc(e))}</td><td>${undone.has(e.id)?'<small class="muted">已還原</small>':A.canUndo(e,op)?`<button class="sm ghost" data-un="${e.id}">還原</button>`:''}</td></tr>`).join('')||'<tr><td colspan="6" class="muted">沒有紀錄</td></tr>'}</tbody></table></div></div>`;
 const q=s=>el.querySelector(s);
 [['from','#lf-from'],['to','#lf-to'],['op','#lf-op'],['sec','#lf-sec'],['st','#lf-st']].forEach(([k,s])=>q(s).onchange=()=>{F[k]=q(s).value;render(o);});
 if(q('#ow-f'))q('#ow-f').onsubmit=async ev=>{ev.preventDefault();q('#ow-err').textContent='解鎖中…';try{await A.ownerUnlock(q('#ow-pw').value);o.whoBadge();o.refresh();}catch(_){q('#ow-err').textContent='老闆密碼不對';}};
 if(q('#pm-out'))q('#pm-out').onclick=()=>location.reload();
 if(q('#pm-save'))q('#pm-save').onclick=async()=>{const p={};Object.keys(A.SEC).forEach(k=>p[k]=(el.querySelector(`[name="pm-${k}"]:checked`)||{}).value||'edit');
  const L=o.L();L.perm=await A.sign(p);await o.save();alert('權限設定已儲存，其他裝置同步後生效。');};
 el.querySelectorAll('[data-un]').forEach(b=>b.onclick=async()=>{const e=log.find(x=>x.id==b.dataset.un),cur=o.L();const {N,changed}=A.revert(cur,S,e);
  if(!confirm(`還原這筆修改？\n\n${ts(e.t)} ${e.op}：${A.CLBL[e.c]||e.c} ${A.stallOf(e,lk)||''}\n${desc(e)}\n\n會改回修改前的樣子。`+(changed?'\n\n⚠️ 這筆之後又被改過，還原會蓋掉後來的修改。':'')))return;
  if(e.c=='perm'&&!A.isOwner())return alert('權限設定只有老闆能還原');
  if(e.c=='perm'){const prev=JSON.parse(e.o||'null');N.perm=prev?await A.sign(prev.cfg.p):await A.sign(A.DEF);}
  o.setL(N);await o.save({undo:e.id});});}
g.SJFLog={render};
})(window);
