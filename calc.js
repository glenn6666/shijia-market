// 照原樣移植 02攤位建檔資料庫（AJ 本月應收 / AK 本月已收 / AR 本月餘款）與 日帳流水帳、損益
// 含原表錯誤：跳表少 1 度、上月待繳恆 0、租金取「全期最新」一筆、比對不分大小寫
(function(g){
const U=s=>String(s||'').toUpperCase();
function xround(x){var s=x<0?-1:1;return s*Math.floor(Math.abs(x)+0.5+1e-9);}
function base(prev){var L=String(prev).length;return L==5?100000:L==4?10000:L==2?100:L==3?1000:0;}
function delta(prev,cur){var d=cur-prev;return d<0?base(prev)-1-prev+cur:d;}
function prevYM(y,m){return m==1?[y-1,12]:[y,m-1];}
// 合併 原始資料 B 與本機異動 L
function merge(B,L){L=L||{};const D=Object.assign({},B);
  const se=L.stall||{};D.stalls=B.stalls.map(s=>se[U(s.id)]?Object.assign({},s,se[U(s.id)]):s).concat(L.stallNew||[]);
  const rk=new Set((L.rent||[]).map(r=>r[0]+'|'+U(r[1])));D.rents=B.rents.filter(r=>!rk.has(r[0]+'|'+U(r[1]))).concat(L.rent||[]);
  const mk=new Set((L.meter||[]).map(r=>U(r[0])+'|'+r[1]+'|'+r[2]));D.meters=B.meters.filter(r=>!mk.has(U(r[0])+'|'+r[1]+'|'+r[2])).concat(L.meter||[]);
  const pd=new Set(L.payDel||[]);D.pays=B.pays.filter(p=>!pd.has(p.k)).concat((L.pay||[]).filter(p=>!pd.has(p.k)));
  const jd=new Set(L.jrDel||[]);D.jr=B.jr.filter(p=>!jd.has(p.k)).concat((L.jr||[]).filter(p=>!jd.has(p.k)));
  return D;}
// 租金：取「年月範圍 ≤ 帳單年月」的最新一筆（當期租金）；若該攤沒有 ≤ 帳單年月的紀錄，退回原表「全期最新」。
// 對最新一期（115/4）結果與原表 02 J–N 相同。
function periodRents(D,ymk){const R={},F={};const mk=r=>({ym:r[0],name:r[2],type:r[3],day:r[4],mon:r[5],ice:r[6],park:r[7],clean:r[8]});
  D.rents.forEach(r=>{const k=U(r[1]);if(!F[k]||r[0]>F[k].ym)F[k]=mk(r);if(r[0]<=ymk&&(!R[k]||r[0]>R[k].ym))R[k]=mk(r);});
  Object.keys(F).forEach(k=>{if(!R[k])R[k]=F[k];});return R;}
function meterMap(D,y,m){const M={};D.meters.forEach(r=>{if(r[1]==y&&r[2]==m){const k=U(r[0]),o=M[k]||(M[k]=[0,0,0,0,0,0,0,0]);for(let i=0;i<8;i++)o[i]+=+r[3+i]||0;}});return M;}
function compute(D,y,m){y=y||D.ym[0];m=m||D.ym[1];
  const [my,mm]=prevYM(y,m),[py,pm]=prevYM(my,mm);// 水電本月=帳單上月，水電上月=帳單上上月；費率取水電本月
  const A=meterMap(D,py,pm),Bm=meterMap(D,my,mm),RT=periodRents(D,y*100+m),Z=[0,0,0,0,0,0,0,0];
  const paid={},hist={},pk=y+'|'+m;
  D.pays.forEach(p=>{const st=U(p.st);(hist[st]=hist[st]||[]).push(p);if(String(p.y)+'|'+String(p.m)===pk){const k=st+'|'+U(p.nm);paid[k]=(paid[k]||0)+(+p.amt||0);}});
  return D.stalls.map(s=>{const id=U(s.id),r=RT[id]||{day:0,mon:0,ice:0,park:0,clean:0},a=A[id]||Z,b=Bm[id]||Z;
    const e1=delta(a[0],b[0]),e2=delta(a[2],b[2]),w1=delta(a[4],b[4]),w2=delta(a[6],b[6]),R={e1:b[1],e2:b[3],w1:b[5],w2:b[7]};
    const o={id:s.id,name:s.name,tel:s.tel,note:s.note,rent:r,read:{e1:[a[0],b[0],e1],e2:[a[2],b[2],e2],w1:[a[4],b[4],w1],w2:[a[6],b[6],w2]},rate:R,
      elec:xround(R.e1*e1+R.e2*e2),water:xround(R.w1*w1+R.w2*w2),hist:hist[id]||[],mY:[my,mm],pY:[py,pm]};
    o.paid=paid[id+'|'+U(s.name)]||0;
    if(!s.name){o.due=null;o.bal=null;o.ar=false;return o;}
    o.due=xround(r.mon+r.ice+r.park+r.clean+R.e1*e1+R.e2*e2+R.w1*w1+R.w2*w2+r.day);o.bal=o.due-o.paid;o.ar=o.due!==0;return o;});}
// 日帳流水帳：D 損益項目、I 年月、K 金額計算
function journal(D){const cat=D.lk.cat||{};return D.jr.map(j=>{const pl=j.j==='1'?'收入':j.j==='2'?'支出':(cat[j.cat]||'');const ds=String(j.date||'');
  return Object.assign({},j,{pl:pl,ym:ds?ds.slice(0,4)+'年'+ds.slice(4,6)+'月':'',signed:/支出$/.test(pl)?-(+j.amt||0):(+j.amt||0)});});}
// 損益（應收制）：C2:C9 各項加總 + 流水帳當月營業支出/營業收入
function pnl(D,y,m){const R=compute(D,y,m).filter(o=>o.ar);const S=k=>R.reduce((a,o)=>a+(+o.rent[k]||0),0);
  const inc={總租金:S('mon'),總清潔費:S('clean'),總停車:S('park'),總冰庫:S('ice'),總臨租:S('day'),總電費:R.reduce((a,o)=>a+o.elec,0),總水費:R.reduce((a,o)=>a+o.water,0)};
  inc.合計=Object.values(inc).reduce((a,b)=>a+b,0);const ym=(y+1911)+'年'+String(m).padStart(2,'0')+'月';
  const J=journal(D).filter(j=>j.ym===ym);const exp=J.filter(j=>j.pl==='營業支出').reduce((a,j)=>a+j.signed,0),oth=J.filter(j=>j.pl==='營業收入').reduce((a,j)=>a+j.signed,0);
  return {inc:inc,exp:exp,oth:oth,total:inc.合計+exp+oth,jr:J,ym:ym};}
g.MarketCalc={compute,merge,journal,pnl,xround,delta,prevYM};
})(typeof window!=='undefined'?window:globalThis);
