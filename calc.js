// 照原樣移植 02攤位建檔資料庫 AJ/AK/AR（含原表錯誤：跳表少1度、上月待繳恆0）
(function(g){
function xround(x){var s=x<0?-1:1;return s*Math.floor(Math.abs(x)+0.5+1e-9);}
function base(prev){var L=String(prev).length;return L==5?100000:L==4?10000:L==2?100:L==3?1000:0;}
function delta(prev,cur){var d=cur-prev;return d<0?base(prev)-1-prev+cur:d;}
function compute(D){
  var y=D.ym[0],m=D.ym[1],mm=m-1,my=y,pm=mm-1;// 水電：本月讀數=上月(帳單-1)，上月讀數=帳單-2
  if(mm<1){mm+=12;my--;} var pmy=my; if(pm<1){pm+=12;}
  var paid={},pk=y+'年'+m+'月',hist={};
  D.pays.forEach(function(p){var st=p.st.toUpperCase();(hist[st]=hist[st]||[]).push(p);
    if(p.y+'年'+p.m+'月'===pk){var k=st+'|'+p.nm;paid[k]=(paid[k]||0)+p.amt;}});
  return D.stalls.map(function(s){
    var id=s.id.toUpperCase(),r=D.rent[id]||{day:0,mon:0,ice:0,park:0,clean:0},
      a=D.meters[id+'|'+pm]||[0,0,0,0,0,0,0,0],b=D.meters[id+'|'+mm]||[0,0,0,0,0,0,0,0];
    var e1=delta(a[0],b[0]),e2=delta(a[2],b[2]),w1=delta(a[4],b[4]),w2=delta(a[6],b[6]);
    var R={e1:b[1],e2:b[3],w1:b[5],w2:b[7]};
    var o={id:s.id,name:s.name,tel:s.tel,note:s.note,rent:r,read:{e1:[a[0],b[0],e1],e2:[a[2],b[2],e2],w1:[a[4],b[4],w1],w2:[a[6],b[6],w2]},rate:R,
      elec:xround(R.e1*e1+R.e2*e2),water:xround(R.w1*w1+R.w2*w2),hist:hist[id]||[]};
    if(!s.name){o.due=null;o.paid=paid[id+'|']||0;o.bal=null;return o;}
    o.due=xround(r.mon+r.ice+r.park+r.clean+R.e1*e1+R.e2*e2+R.w1*w1+R.w2*w2+r.day);
    o.paid=paid[id+'|'+s.name]||0;o.bal=o.due-o.paid;o.ar=o.due!==0;return o;});
}
g.MarketCalc={compute:compute,xround:xround};
})(typeof window!=='undefined'?window:globalThis);
