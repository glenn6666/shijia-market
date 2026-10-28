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
// 租金：取「年月範圍 ≤ 帳單年月」的最新一筆（當期租金）；若該攤在帳單年月（含）之前沒有任何租金紀錄，月租算 0（水電照算）。
// 對最新一期（115/4）結果與原表 02 J–N 相同。
function periodRents(D,ymk){const R={},F={};const mk=r=>({ym:r[0],name:r[2],type:r[3],day:r[4],mon:r[5],ice:r[6],park:r[7],clean:r[8]});
  D.rents.forEach(r=>{const k=U(r[1]);if(!F[k]||r[0]>F[k].ym)F[k]=mk(r);if(r[0]<=ymk&&(!R[k]||r[0]>R[k].ym))R[k]=mk(r);});
  return R;}
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
// 水電錶歷史與異常：每個讀數月份一列；上月＝前一個日曆月讀數（缺月時帳單會當 0）
const MK=[['e1','電錶1',0],['e2','電錶2',2],['w1','水錶1',4],['w2','水錶2',6]];
function med(a){a=a.filter(x=>x>0).sort((x,y)=>x-y);if(!a.length)return 0;const h=a.length>>1;return a.length%2?a[h]:(a[h-1]+a[h])/2;}
function allYM(D){const s=new Set();D.meters.forEach(r=>s.add(r[1]*100+ +r[2]));return [...s].sort((a,b)=>a-b);}
function meterHist(D,id,yms){const k=U(id);yms=yms||allYM(D);const by={},cnt={};
  D.meters.forEach(r=>{if(U(r[0])!==k)return;const ym=r[1]*100+ +r[2];cnt[ym]=(cnt[ym]||0)+1;const o=by[ym]||(by[ym]=[0,0,0,0,0,0,0,0,r[11]||'']);for(let i=0;i<8;i++)o[i]+=+r[3+i]||0;});
  const have=yms.filter(y=>by[y]);if(!have.length)return {rows:[],meters:[]};
  const used=MK.filter(m=>have.some(y=>by[y][m[2]]));
  const rentRec=D.rents.filter(r=>U(r[1])===k);
  const billed=ym=>{const [y,m]=[Math.floor(ym/100),ym%100],b=m==12?(y+1)*100+1:ym+1;let best=null;rentRec.forEach(r=>{if(r[0]<=b&&(!best||r[0]>best[0]))best=r;});return !!best&&[4,5,6,7,8].some(i=>+best[i]>0);};
  const first=have[0],last=have[have.length-1],rows=[];let lastRead={};
  yms.filter(y=>y>=first&&y<=last).forEach((ym,i,arr)=>{const cur=by[ym],pv=i?by[arr[i-1]]:null,row={ym,y:Math.floor(ym/100),m:ym%100,miss:!cur,note:cur?cur[8]:'',dup:(cnt[ym]||0)>1,v:{},flags:[]};
    if(!cur){row.flags.push(['缺月','這個月份沒有任何水電讀數']);rows.push(row);return;}
    if(row.dup)row.flags.push(['重複','同一月份有 '+cnt[ym]+' 筆讀數，計算時被加總']);
    used.forEach(([key,nm,ix])=>{const c=cur[ix],rate=cur[ix+1],p=pv?pv[ix]:(i?0:null);const o={cur:c,prev:p,rate};
      if(c<0||rate<0)row.flags.push(['負值',nm+' 讀數或費率為負']);
      if(p!=null){o.use=delta(p,c);o.fee=xround(o.use*rate);
        if(!pv&&lastRead[key]!=null)row.flags.push(['上月不符',nm+' 前一月缺讀數，帳單上月以 0 計（最後讀數 '+lastRead[key]+'）']);
        if(c<p){const bs=base(p);if(bs&&p>=bs*0.9&&o.use<bs*0.2)row.flags.push(['跳表',nm+' '+p+' → '+c+'，滿表歸零，系統算 '+o.use+' 度（舊算法少 1 度）']);else row.flags.push(['倒退',nm+' '+p+' → '+c+'，讀數變小，系統當跳表算成 '+o.use+' 度']);}
        if(o.use<0)row.flags.push(['負值',nm+' 算出用量 '+o.use+' 度']);
        if(o.use>0&&!rate)row.flags.push(['費率0',nm+' 有用量但費率為 0']);}
      if(c)lastRead[key]=c;row.v[key]=o;});
    rows.push(row);});
  used.forEach(([key,nm])=>{const us=rows.filter(r=>!r.miss&&r.v[key]&&r.v[key].use!=null&&r.v[key].prev!=null&&r.v[key].cur>=r.v[key].prev).map(r=>r.v[key].use),md=med(us);
    let z=0;rows.forEach((r,i)=>{const o=r.v[key];if(!o||o.use==null)return;
      if(md>0&&o.use>3*md&&o.use-md>=20&&!r.flags.some(f=>(f[0]=='倒退'||f[0]=='跳表')&&f[1].startsWith(nm)))r.flags.push(['暴增',nm+' 用量 '+o.use+' 度，是中位數 '+md+' 的 '+(o.use/md).toFixed(1)+' 倍']);
      const isW=key[0]=='w';if(o.use===0&&o.cur>0&&us.length&&us.filter(x=>x>0).length>=us.length/2&&billed(r.ym)){z++;if(!isW||z==3)r.flags.push(['零用量',nm+(isW?' 連續 3 個月':'')+' 用量 0 但本攤有計租']);}else z=0;});});
  return {rows,meters:used.map(m=>m[0]),names:used.map(m=>m[1])};}
g.MarketCalc={compute,merge,journal,pnl,xround,delta,prevYM,meterHist,allYM};
})(typeof window!=='undefined'?window:globalThis);
