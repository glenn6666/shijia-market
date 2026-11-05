// 十甲發市場：線上合約書（攤位租賃／土地租賃）
// 資料存 L.ct[k]，走既有 saveLocal + 同步；可列印 A4、下載 docx、匯出 JSON
(function(G){
const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const U=s=>String(s||'').toUpperCase();
const n=v=>Math.round(+v||0).toLocaleString('en-US');
const pad=x=>String(x).padStart(2,'0');
const TODAY=()=>{const q=/[?&]today=(\d{4})-(\d\d)-(\d\d)/.exec(location.search);return q?new Date(+q[1],q[2]-1,+q[3]):new Date();};
const rocParts=d=>{const x=d instanceof Date?d:new Date(d);return {y:x.getFullYear()-1911,m:x.getMonth()+1,d:x.getDate()};};
const fromRoc=(y,m,d)=>new Date(+y+1911,(+m||1)-1,+d||1);
const rocStr=(y,m,d)=>`${y}年${pad(m)}月${pad(d)}日`;
const daysLeft=(y,m,d)=>{const t=TODAY(),end=fromRoc(y,m,d);end.setHours(23,59,59,999);return Math.ceil((end-t)/864e5);};
// 預設租期：明年 7/1 ～ 後年 6/30（每年一簽、年中起）
function defaultPeriod(){const t=TODAY(),ry=t.getFullYear()-1911;const y1=ry+1;return {y1,m1:7,d1:1,y2:y1+1,m2:6,d2:30};}
function list(L){const ed=(L&&L.ct)||{},out=[];Object.keys(ed).forEach(k=>{const x=ed[k];if(!x||x.del)return;out.push(Object.assign({k},x));});
  return out.sort((a,b)=>(b.updated||b.created||0)-(a.updated||a.created||0));}
function byStall(L){const m={};list(L).forEach(c=>{(c.stalls||[]).forEach(s=>{const id=U(s.id);if(!id)return;(m[id]=m[id]||[]).push(c);});});return m;}
function activeOf(c){if(!c||c.del)return false;const left=daysLeft(c.y2,c.m2,c.d2);return left>=0;}
function statusOf(c){if(!c||c.del)return 'none';const left=daysLeft(c.y2,c.m2,c.d2);if(left<0)return 'expired';if(left<=60)return 'soon';return c.status==='signed'?'signed':'draft';}
const SLBL={none:'未簽約',draft:'草稿',signed:'已簽約',soon:'將到期',expired:'已到期'};
const SCOL={none:'#8a8277',draft:'#7d9cc0',signed:'#4f6f4a',soon:'#c47a1a',expired:'#c0392b'};
function bestStatus(arr){if(!arr||!arr.length)return 'none';const order=['soon','signed','draft','expired'];for(const s of order)if(arr.some(c=>statusOf(c)===s))return s;return statusOf(arr[0]);}
function expiring(L,within){within=within==null?60:within;return list(L).filter(c=>{const left=daysLeft(c.y2,c.m2,c.d2);return left>=0&&left<=within;}).sort((a,b)=>daysLeft(a.y2,a.m2,a.d2)-daysLeft(b.y2,b.m2,b.d2));}

function blank(type){const p=defaultPeriod(),t=TODAY();
  return {type:type||'stall',name:'',addr:'',tel:'',idno:'',area:'十甲發市場',
    y1:p.y1,m1:p.m1,d1:p.d1,y2:p.y2,m2:p.m2,d2:p.d2,
    h1:'',h2:'',stalls:[{id:'',rent:'',clean:'',deposit:''}],
    landNo:'',ping:'',usePing:'',useDesc:'冷凍庫安置使用',rentPerPing:'',payDay:'20',depositTotal:'',
    notes:[''],signY:t.getFullYear()-1911,signM:t.getMonth()+1,signD:t.getDate(),status:'draft',memo:'',
    created:Date.now(),updated:Date.now()};}

function fillFromStall(c,o,cust,depAmt){if(!o)return c;
  if(!c.name)c.name=o.name||'';
  if(!c.tel&&(o.tel||(cust&&cust.tel)))c.tel=o.tel||cust.tel||'';
  if(!c.addr&&cust&&cust.addr)c.addr=cust.addr;
  const st=c.stalls[0]||(c.stalls[0]={id:'',rent:'',clean:'',deposit:''});
  st.id=o.id;st.rent=o.rent&&o.rent.mon!=null?o.rent.mon:'';st.clean=o.rent&&o.rent.clean!=null?o.rent.clean:'';
  const dep=depAmt!=null?depAmt:(cust&&cust.dep);if(dep!=null&&dep!=='')st.deposit=dep;
  return c;}

function sumStalls(c){const S=c.stalls||[];return {rent:S.reduce((a,s)=>a+(+s.rent||0),0),clean:S.reduce((a,s)=>a+(+s.clean||0),0),deposit:S.reduce((a,s)=>a+(+s.deposit||0),0),ids:S.map(s=>s.id).filter(Boolean)};}

function clausesStall(){return [
  '一、攤位所在十甲發股份有限公司所屬{area}攤位號碼{stallIds}號攤位。',
  '二、租賃使用期自民國{y1}年{m1}月{d1}日起至民國{y2}年{m2}月{d2}日止，使用時段每日{h1}時起至{h2}時止。',
  '三、每月租金新台幣{rent}元整契約簽訂同時，乙方需現金預付壹個月租金。並自第一個月起每月二十日前，乙方預付一個月租金及所有費用，不得拖延或拒繳納，否則視同違約。',
  '四、每一攤位每月收清潔處理費新台幣{clean}元整，水、電費以碼表計之，如政府機關有調漲費用時，乙方同意甲方酌量調整，如抗繳乙方同意甲方即時斷水斷電。',
  '五、乙方在本約簽訂時，同時交付甲方履約保證金新台幣{deposit}元整。於租賃期滿未再續約，並無任何違約情形，甲方無息返還乙方。若乙方有任何違約事情時，本履約保證金聽憑甲方任意處置，乙方絕無異議，乙方若因任何因素半途終止租期，則沒收保證金。',
  '六、攤位營業範圍，以水溝凹槽內或標線爲界，乙方不得佔用公共空間或其他攤位，否則視同強行侵占，經勸告拍照存證，三次而未改善者，甲方得逕行取消乙方租賃權，沒收履約保證金，並依法究辦。',
  '七、乙方增加使用設施之必要時，應徵得甲方同意，始得增設，增設之一切費用由乙方自理，增設之時，不得破壞主體建物。',
  '八、攤位不得供非法使用或存放危險物品，影響公共安全，不得在攤位上賭博、酗酒、妨礙其他攤位的營業，經勸告未改善者，每月加收壹倍的租金，拒繳者甲方可終止租賃契約。',
  '九、使用場所，因天災地變等不可抗拒的情形，遭受損壞，應由甲方負責修繕，惟如因乙方之過失致使用物毀損時，乙方應負損壞的所有賠償之責，並放棄先訴抗辯權。如因法令限制或其他不可抗力等，不可歸責於甲方之事由，致甲方須提前終止契約者，乙方絕無異議。',
  '十、攤位之稅捐由甲方負擔，乙方營業上必須繳納的所有稅捐自行負責。',
  '十一、租賃期間標的出入人員之一切安全由乙方自行負責。（如發生任何意外、傷亡……等概與甲方無涉。）',
  '十二、乙方之使用權轉讓第三人時，應通知甲方取得甲方同意，否則其轉讓對甲方不生效力。甲方同意轉讓移轉得酌收手續費，每一單位新台幣壹仟元整。',
  '十三、乙方若積欠甲方所有應繳任何費用達二個月（含二個月）則視同放棄租賃權。攤位上的所有物品，三天內須空出，否則視同廢棄物，任由甲方處理，乙方不得異議。',
  '十四、使用期限屆滿時，契約自動消滅，七天內須淨空其攤位設備及物品，否則甲方得拍照存證，並寄發存證信函，限期改善，逾期甲方以廢棄物處理，乙方不得異議或提任何要求。',
  '十五、使用期滿前二週，乙方須與甲方重訂新租賃契約，乙方享有優先權，如未完成續簽手續，依第十五條處理，乙方不得主張不定期租賃或要求甲方任何之補償。',
  '十六、乙方若無承租停車位，乙方車輛不得停在甲方的停車場，亦不得臨停在機車停車格上，否則依第七條規定處理，乙方不得異議，另乙方若有承租停車位在甲方停車場者，如因地主收回甲方之租約，乙方必需配合甲方，車輛不得佔用甲方之其他停車場。',
  '十七、市場內通道禁止停機車、拖車，爲方便顧客，靠市場四週在早上六點三十分後，禁停乙方車輛，經告知而不改善，甲方可依第六條強行處置，乙方無權異議。',
  '十八、甲方如認需要，會全面管制道路交通，乙方需無異議配合。不得異議，如不配合願依第七條處理。',
  '十九、乙方如要在攤位上製作廣告招牌，須經甲方同意（平面長七尺寬一尺半）不得超過。如太大甲方拒絕乙方懸掛。',
  '二十、乙方不得私接或自行開關公共用電、消防用水及其他電力公共設施。若因上述而造成意外、電路走火、人身傷亡至無法繼續營業，乙方願負民、刑事責任及賠償甲方之一切損失之責。',
  '二十一、履約保證金簽約時現金給付，不得作爲抵扣（租金、水、電、清潔處理費或任何等費用）的抵扣之用。',
  '二十二、雙方應本誠信原則遵守本契約，倘有違約的情形，違約之一方應給付無過失之他方，最高新台幣參拾萬元整之懲罰性違約金。',
  '二十三、乙方放置於攤位的所有物品，甲方不負保管責任。',
  '二十四、乙方不得代客人倒垃圾，拍照存証後清潔費用將依第四條加倍處理。',
  '二十五、（保留）',
  '二十六、雙方同意本契約發生糾紛時，台灣台中地方法院為第一審訴訟管轄法院。',
  '以上條款經雙方同意恐口說無憑，爰立本契約書一式貳份，由雙方各執壹份存執，以昭信守。'
];}
function clausesLand(){return [
  '一、甲方同意編號{landNo}的土地共計{ping}坪租於乙方自民國{y1}年{m1}月{d1}日迄至民國{y2}年{m2}月{d2}日止使用。',
  '二、租賃{usePing}坪作為{useDesc}使用，每月租金每坪新台幣{rentPerPing}元整每月{payDay}日前乙方需繳清租金，不得藉故拖延。使用電費另計。',
  '三、乙方簽定本約時，需交履約保證金每坪新台幣貳仟元整。（保證金新台幣{depositTotal}元整）未經甲方書面之同意，乙方不得將租賃標的物全部或一部份轉租、出借、頂讓或以其它變相方法由他人使用，否則視同違約。',
  '四、乙方若當月不按期交付租金，即視同違約，甲方可未經催告收回租賃物且可自由處置，乙方不得異議，並放棄先訴抗辯權（包括民、刑事）地上物概由甲方處置。',
  '五、乙方未經甲方同意不可將車子停於冰庫通道，如是卸貨不得停留超過三十分鐘，卸貨完畢需將車子駛離，如未離開三次視同重大違規，以後車子不得進入。',
  '六、租賃期間租賃標的出入人員之一切安全由乙方負責，如發生任何意外、傷亡概與甲方無關。使用電力有所不良時，需告知由甲方處理，乙方不得私自交於其他廠商維修。如私自維修發生意外時，甲方不負任何責任，乙方需負完全責任，並需賠償一切損失。',
  '七、本約租賃期滿，如一方未擬再行續約，應於屆滿前兩個月通知對方，否則租期應改以正式通知日起算壹天為終止日。租賃期限未滿，一方擬終止時，須得對方之同意。但如礙於政府法令規定，土地無法依現狀使用……等非甲方可自主之因素，致需行終止租約時不在此限，屆時乙方同意無條件縮短期限。',
  '八、乙方使用不遵守而致妨礙甲方致使甲方有所損失時，乙方應賠償該損失或任由甲方解約絕無異議。（包括酗酒、賭博、隨地大小便）並視重大違約，任由甲方處置。'
];}
function fillTpl(tpl,c){const S=sumStalls(c);const map={
  area:c.area||'　　　　',stallIds:S.ids.length?S.ids.join('、'):'　　　　',
  y1:c.y1||'　',m1:c.m1||'　',d1:c.d1||'　',y2:c.y2||'　',m2:c.m2||'　',d2:c.d2||'　',
  h1:c.h1||'　',h2:c.h2||'　',
  rent:S.rent?n(S.rent):'　　　　',clean:S.clean?n(S.clean):'　　　',deposit:S.deposit?n(S.deposit):'　　　　　　',
  landNo:c.landNo||'　　',ping:c.ping||'　　',usePing:c.usePing||c.ping||'　　',useDesc:c.useDesc||'冷凍庫安置',
  rentPerPing:c.rentPerPing?n(c.rentPerPing):'　　　　',payDay:c.payDay||'　',
  depositTotal:c.depositTotal?n(c.depositTotal):(c.ping&&!c.depositTotal?n((+c.ping||0)*2000):'　　　　　　')
};return tpl.replace(/\{(\w+)\}/g,(_,k)=>map[k]!=null?String(map[k]):'');}

function sheetHtml(c){const land=c.type==='land';const title=land?'土地租賃契約書':'攤位租賃契約書';
  const intro=land
    ?`立約人林晉安（以下簡稱甲方）承租人 <u>${e(c.name||'　　　　　　　　')}</u>（以下簡稱乙方）茲因土地租賃事宜經雙方協議同意如左：`
    :`立契約書人十甲發股份有限公司林晉安（以下簡稱甲方）承租人 <u>${e(c.name||'　　　　　　　　')}</u>（以下簡稱乙方）茲因攤位租賃事宜經雙方同意協議簽訂如後的條款，請共同遵守：`;
  const clauses=(land?clausesLand():clausesStall()).map(t=>`<p class="ct-cl">${e(fillTpl(t,c))}</p>`).join('');
  const notes=(c.notes||[]).filter(x=>String(x||'').trim()).map((x,i)=>`<div>${i+1}. ${e(x)}</div>`).join('')||'<div>（無）</div>';
  const stallExtra=!land&&(c.stalls||[]).length>1?`<p class="ct-cl">【攤位明細】${(c.stalls||[]).filter(s=>s.id).map(s=>`${e(s.id)}（月租 ${n(s.rent)}／清潔 ${n(s.clean)}／保證金 ${n(s.deposit)}）`).join('；')}</p>`:'';
  return `<div class="ct-pg"><h2>${title}</h2><p class="ct-intro">${intro}</p>${clauses}${stallExtra}
   <p class="ct-cl"><b>備註：</b></p><div class="ct-notes">${notes}</div>
   <div class="ct-sign">
    <div><b>立契約書人</b></div>
    <div class="ct-col"><div><b>甲方：</b>十甲發股份有限公司　林晉安</div>
     <div>電話：04-22123068‧22116105</div><div>住址：台中市東區十甲路101之7號</div></div>
    <div class="ct-col"><div><b>乙方：</b>${e(c.name||'　　　　　　')}</div>
     <div>住址：${e(c.addr||'　　　　　　　　　　')}</div>
     <div>電話：${e(c.tel||'　　　　　　')}　身分證字號：${e(c.idno||'　　　　　　')}</div></div>
   </div>
   <p class="ct-date">本契約書乙式貳份，由甲、乙兩方各執壹份<br>中　華　民　國　${e(c.signY||'　　')}　年　${e(c.signM||'　　')}　月　${e(c.signD||'　　')}　日</p>
  </div>`;}

const CSS=`.ct-pg{background:#fff;color:#000;font:12.5px/1.7 "Noto Sans TC","Microsoft JhengHei","PMingLiU",sans-serif;width:180mm;max-width:100%;margin:0 auto;padding:8mm 10mm}
.ct-pg h2{text-align:center;font-size:20px;margin:0 0 6mm;letter-spacing:.3em}.ct-intro{margin:0 0 4mm;text-indent:0}
.ct-cl{margin:0 0 2.2mm;text-align:justify}.ct-notes{margin:0 0 6mm;min-height:12mm;padding-left:1em}
.ct-sign{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:6mm}.ct-col{border:1px solid #ccc;padding:3mm;min-height:28mm}
.ct-date{margin-top:8mm;text-align:center}.ct-badge{display:inline-block;padding:1px 8px;border-radius:99px;color:#fff;font-size:12px}
@media print{@page{size:A4 portrait;margin:12mm}body *{visibility:hidden}#ctprint,#ctprint *{visibility:visible}#ctprint{position:absolute;left:0;top:0;width:100%}}`;

// ── 極簡 ZIP（STORE）產生 docx
function crc32(buf){let c=~0;for(let i=0;i<buf.length;i++){c^=buf[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function u16(n){return new Uint8Array([n&255,(n>>>8)&255]);}
function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);}
function cat(arrs){const n=arrs.reduce((a,b)=>a+b.length,0),o=new Uint8Array(n);let p=0;arrs.forEach(a=>{o.set(a,p);p+=a.length;});return o;}
function zipStore(files){const enc=s=>new TextEncoder().encode(s);const locals=[],centrals=[];let offset=0;
  files.forEach(({name,data})=>{const nm=enc(name),crc=crc32(data),sz=u32(data.length);
    const local=cat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),sz,sz,u16(nm.length),u16(0),nm,data]);
    const central=cat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),sz,sz,u16(nm.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),nm]);
    locals.push(local);centrals.push(central);offset+=local.length;});
  const central=cat(centrals),local=cat(locals);
  const end=cat([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(central.length),u32(local.length),u16(0)]);
  return cat([local,central,end]);}
function xmlEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function docxBlob(c){const land=c.type==='land';const title=land?'土地租賃契約書':'攤位租賃契約書';
  const paras=[];const p=(t,opts)=>{opts=opts||{};const al=opts.center?'<w:jc w:val="center"/>':'';const b=opts.bold?'<w:b/>':'';const sz=opts.sz||24;
    paras.push(`<w:p><w:pPr>${al}<w:spacing w:after="80"/></w:pPr><w:r><w:rPr>${b}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/><w:rFonts w:ascii="Microsoft JhengHei" w:hAnsi="Microsoft JhengHei" w:eastAsia="Microsoft JhengHei"/></w:rPr><w:t xml:space="preserve">${xmlEsc(t)}</w:t></w:r></w:p>`);};
  p(title,{center:1,bold:1,sz:36});
  p(land?`立約人林晉安（以下簡稱甲方）承租人 ${c.name||'　　　　'}（以下簡稱乙方）茲因土地租賃事宜經雙方協議同意如左：`
        :`立契約書人十甲發股份有限公司林晉安（以下簡稱甲方）承租人 ${c.name||'　　　　'}（以下簡稱乙方）茲因攤位租賃事宜經雙方同意協議簽訂如後的條款，請共同遵守：`);
  (land?clausesLand():clausesStall()).forEach(t=>p(fillTpl(t,c)));
  if(!land&&(c.stalls||[]).length>1)p('【攤位明細】'+(c.stalls||[]).filter(s=>s.id).map(s=>`${s.id}（月租 ${n(s.rent)}／清潔 ${n(s.clean)}／保證金 ${n(s.deposit)}）`).join('；'));
  p('備註：',{bold:1});(c.notes||[]).filter(x=>String(x||'').trim()).forEach((x,i)=>p(`${i+1}. ${x}`));
  p('');p('立契約書人',{bold:1});
  p('甲方：十甲發股份有限公司　林晉安');p('電話：04-22123068‧22116105');p('住址：台中市東區十甲路101之7號');
  p(`乙方：${c.name||''}`);p(`住址：${c.addr||''}`);p(`電話：${c.tel||''}　身分證字號：${c.idno||''}`);
  p('');p(`本契約書乙式貳份，由甲、乙兩方各執壹份`,{center:1});
  p(`中　華　民　國　${c.signY||''}　年　${c.signM||''}　月　${c.signD||''}　日`,{center:1});
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;
  const types=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const enc=s=>new TextEncoder().encode(s);
  const bytes=zipStore([{name:'[Content_Types].xml',data:enc(types)},{name:'_rels/.rels',data:enc(rels)},{name:'word/document.xml',data:enc(doc)}]);
  return new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});}

function dl(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),8000);}
function fileName(c){const ids=sumStalls(c).ids.join('_')||(c.landNo||'合約');return `合約_${c.type==='land'?'土地':'攤位'}_${ids}_${c.y1||''}-${c.y2||''}`;}

let q='',filt='all',view=null;// view = editing key or 'new'
function render(o){const {B,L,R,el,save,byId,toast}=o;const all=list(L);
  const rows=all.filter(c=>{if(q){const hay=U([c.name,c.tel,c.idno,(c.stalls||[]).map(s=>s.id).join(' '),c.landNo,c.memo,(c.notes||[]).join(' ')].join(' '));if(!hay.includes(U(q)))return false;}
    const st=statusOf(c);if(filt==='soon')return st==='soon';if(filt==='expired')return st==='expired';if(filt==='active')return st==='signed'||st==='draft'||st==='soon';if(filt==='draft')return st==='draft';if(filt==='signed')return c.status==='signed'&&st!=='expired';return true;});
  if(view)return renderForm(o,view==='new'?blank('stall'):Object.assign({},all.find(x=>x.k===view)||blank('stall'),{k:view==='new'?null:view}));
  const soon=expiring(L,60);
  el.innerHTML=`<style>${CSS}</style>
   <div class="card noprint"><div class="row">
    <input id="ctq" placeholder="搜尋承租人／攤位／備註" value="${e(q)}">
    <select id="ctf" style="width:auto"><option value="all">全部狀態</option><option value="active">有效（未到期）</option><option value="soon">60 天內到期</option><option value="draft">草稿</option><option value="signed">已簽約</option><option value="expired">已到期</option></select>
    <button id="ctnew">＋ 新增攤位合約</button><button class="ghost" id="ctnewl">＋ 新增土地合約</button>
    <button class="ghost" id="ctexp">匯出合約 JSON</button><label class="ghost" style="border:1px solid var(--line);padding:9px 14px;border-radius:10px;cursor:pointer">匯入合約 JSON<input type="file" id="ctimp" accept=".json" hidden></label>
    <span class="muted">${rows.length}／${all.length} 份・將到期 ${soon.length}</span></div>
   <p class="muted" style="font-size:12px">一份合約可綁同一承租人的多個攤位與多筆備註；預設租期為明年 7/1 起一年（年中簽約、每年一簽）。租金／清潔／保證金可從攤位資料帶入。存檔後跟著雲端同步；也可匯出 JSON 備份到電腦。</p>
   <div class="tbl"><table><thead><tr><th>狀態</th><th>類型</th><th>承租人</th><th>攤位／土地</th><th>租期</th><th>月租／保證金</th><th>備註數</th><th></th></tr></thead>
   <tbody>${rows.map(c=>{const st=statusOf(c),S=sumStalls(c),left=daysLeft(c.y2,c.m2,c.d2);
     const tgt=c.type==='land'?`土地 ${e(c.landNo||'—')}（${e(c.ping||'')}坪）`:e(S.ids.join('、')||'—');
     const money=c.type==='land'?`每坪 ${n(c.rentPerPing)}／保證金 ${n(c.depositTotal||(+c.ping||0)*2000)}`:`月租 ${n(S.rent)}＋清潔 ${n(S.clean)}／保證金 ${n(S.deposit)}`;
     return `<tr><td><span class="ct-badge" style="background:${SCOL[st]}">${SLBL[st]}${st==='soon'?` ${left}天`:''}</span></td>
      <td>${c.type==='land'?'土地':'攤位'}</td><td>${e(c.name||'—')}</td><td>${tgt}</td>
      <td>${e(rocStr(c.y1,c.m1,c.d1))}～${e(rocStr(c.y2,c.m2,c.d2))}</td><td>${money}</td><td class="n">${(c.notes||[]).filter(x=>String(x||'').trim()).length}</td>
      <td style="white-space:nowrap"><button class="sm" data-cv="${e(c.k)}">檢視／列印</button> <button class="sm ghost" data-ce="${e(c.k)}">編輯</button> <button class="sm ghost" data-cd="${e(c.k)}">刪除</button></td></tr>`;}).join('')||'<tr><td colspan="8" class="muted">還沒有合約，按上方「新增」開始。</td></tr>'}</tbody></table></div></div>
   <div id="ctprint" class="noprint" hidden></div>`;
  const $=s=>el.querySelector(s);$('#ctf').value=filt;
  if(window.SJFLiveQ)$('#ctq')&&SJFLiveQ($('#ctq'),v=>{q=v;render(o);});
  else $('#ctq').onchange=ev=>{q=ev.target.value;render(o);};
  $('#ctf').onchange=ev=>{filt=ev.target.value;render(o);};
  $('#ctnew').onclick=()=>{view='new';render(o);};
  $('#ctnewl').onclick=()=>{view='new';renderForm(o,blank('land'));};
  $('#ctexp').onclick=()=>{const data={app:'sjf-ct',v:1,at:new Date().toISOString(),ct:L.ct||{}};dl('十甲發_合約備份_'+new Date().toISOString().slice(0,10)+'.json',new Blob([JSON.stringify(data,null,1)],{type:'application/json'}));};
  $('#ctimp').onchange=async ev=>{const f=ev.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());const src=j.ct||j;if(!src||typeof src!='object')throw 0;
    if(!confirm('匯入會合併進目前合約（同 key 以匯入檔為準），確定？'))return;
    L.ct=Object.assign({},L.ct||{},src);await save();toast&&toast('已匯入合約');}catch(x){alert('不是有效的合約 JSON');}};
  el.querySelectorAll('[data-ce]').forEach(b=>b.onclick=()=>{view=b.dataset.ce;render(o);});
  el.querySelectorAll('[data-cd]').forEach(b=>b.onclick=async()=>{if(!confirm('刪除這份合約？'))return;L.ct=Object.assign({},L.ct);L.ct[b.dataset.cd]={del:1};await save();});
  el.querySelectorAll('[data-cv]').forEach(b=>b.onclick=()=>preview(o,all.find(x=>x.k===b.dataset.cv)));}

function stallRowsHtml(c){return (c.stalls||[{id:'',rent:'',clean:'',deposit:''}]).map((s,i)=>`<tr data-si="${i}">
  <td><input data-f="id" value="${e(s.id)}" list="ct-stl" placeholder="攤位編號" style="width:7em"></td>
  <td><input data-f="rent" type="number" value="${e(s.rent)}" style="width:7em"></td>
  <td><input data-f="clean" type="number" value="${e(s.clean)}" style="width:7em"></td>
  <td><input data-f="deposit" type="number" value="${e(s.deposit)}" style="width:7em"></td>
  <td><button type="button" class="sm ghost" data-sr="${i}">帶入</button> <button type="button" class="sm ghost" data-sx="${i}">✕</button></td></tr>`).join('');}

function renderForm(o,c){const {B,L,R,el,save,byId,toast}=o;const land=c.type==='land';
  const notes=(c.notes&&c.notes.length?c.notes:['']).map((x,i)=>`<div class="row" data-ni="${i}"><input data-nf value="${e(x)}" placeholder="備註 ${i+1}" style="flex:1;min-width:200px"><button type="button" class="sm ghost" data-nx="${i}">刪</button></div>`).join('');
  el.innerHTML=`<style>${CSS}</style><div class="card"><div class="row"><button class="ghost" id="ctback">← 回列表</button>
   <b>${c.k?'編輯':'新增'}${land?'土地':'攤位'}合約</b>
   <label>狀態 <select id="ct-status" style="width:auto"><option value="draft">草稿</option><option value="signed">已簽約</option></select></label></div>
   <h3 style="margin:8px 0 4px">承租人（乙方）</h3>
   <div class="form"><label>姓名<input id="ct-name" value="${e(c.name)}"></label><label>電話<input id="ct-tel" value="${e(c.tel)}"></label>
    <label>身分證字號<input id="ct-idno" value="${e(c.idno)}"></label><label>住址<input id="ct-addr" value="${e(c.addr)}"></label></div>
   <h3 style="margin:8px 0 4px">租期（民國）</h3>
   <div class="form"><label>起年<input id="ct-y1" type="number" value="${e(c.y1)}"></label><label>月<input id="ct-m1" type="number" value="${e(c.m1)}"></label><label>日<input id="ct-d1" type="number" value="${e(c.d1)}"></label>
    <label>迄年<input id="ct-y2" type="number" value="${e(c.y2)}"></label><label>月<input id="ct-m2" type="number" value="${e(c.m2)}"></label><label>日<input id="ct-d2" type="number" value="${e(c.d2)}"></label>
    <label>簽約年<input id="ct-sy" type="number" value="${e(c.signY)}"></label><label>月<input id="ct-sm" type="number" value="${e(c.signM)}"></label><label>日<input id="ct-sd" type="number" value="${e(c.signD)}"></label></div>
   ${land?`<h3 style="margin:8px 0 4px">土地內容</h3><div class="form">
     <label>土地編號<input id="ct-land" value="${e(c.landNo)}"></label><label>總坪數<input id="ct-ping" type="number" value="${e(c.ping)}"></label>
     <label>使用坪數<input id="ct-uping" type="number" value="${e(c.usePing)}"></label><label>用途<input id="ct-udesc" value="${e(c.useDesc)}"></label>
     <label>每坪月租<input id="ct-rpp" type="number" value="${e(c.rentPerPing)}"></label><label>每月幾日前繳<input id="ct-pd" value="${e(c.payDay)}"></label>
     <label>保證金總額（空白＝坪數×2000）<input id="ct-dep" type="number" value="${e(c.depositTotal)}"></label></div>`
    :`<h3 style="margin:8px 0 4px">攤位內容（可多個）</h3>
     <div class="form"><label>所屬區域／市場<input id="ct-area" value="${e(c.area)}"></label>
      <label>使用時段起（時）<input id="ct-h1" value="${e(c.h1)}" placeholder="可空白"></label>
      <label>使用時段迄（時）<input id="ct-h2" value="${e(c.h2)}" placeholder="可空白"></label></div>
     <div class="tbl"><table><thead><tr><th>攤位</th><th>月租</th><th>清潔費</th><th>履約保證金</th><th></th></tr></thead>
     <tbody id="ct-stbody">${stallRowsHtml(c)}</tbody></table></div>
     <button type="button" class="sm ghost" id="ct-addst">＋ 再加一個攤位</button>
     <datalist id="ct-stl">${(R||[]).map(x=>`<option value="${e(x.id)}">${e(x.name||'')}</option>`).join('')}</datalist>`}
   <h3 style="margin:8px 0 4px">備註（可多筆）</h3>${notes}<button type="button" class="sm ghost" id="ct-addn">＋ 加一筆備註</button>
   <div class="form" style="margin-top:8px"><label>內部備註（不印在合約上）<input id="ct-memo" value="${e(c.memo||'')}"></label></div>
   <div class="row" style="margin-top:12px"><button id="ct-save">💾 存檔</button><button class="ghost" id="ct-prev">預覽／列印</button><button class="ghost" id="ct-docx">下載 Word</button></div>
   <p class="muted" style="font-size:12px">存檔後可在列表按「檢視／列印」產出 A4；瀏覽器列印對話框可選「另存為 PDF」存到電腦或雲端硬碟。</p>
   </div><div id="ctprint" hidden></div>`;
  const $=s=>el.querySelector(s);$('#ct-status').value=c.status==='signed'?'signed':'draft';
  $('#ctback').onclick=()=>{view=null;render(o);};
  function readForm(){const x=Object.assign({},c,{
    type:land?'land':'stall',name:$('#ct-name').value.trim(),tel:$('#ct-tel').value.trim(),idno:$('#ct-idno').value.trim(),addr:$('#ct-addr').value.trim(),
    y1:+$('#ct-y1').value||0,m1:+$('#ct-m1').value||0,d1:+$('#ct-d1').value||0,y2:+$('#ct-y2').value||0,m2:+$('#ct-m2').value||0,d2:+$('#ct-d2').value||0,
    signY:+$('#ct-sy').value||0,signM:+$('#ct-sm').value||0,signD:+$('#ct-sd').value||0,status:$('#ct-status').value,memo:$('#ct-memo').value.trim(),
    notes:[...el.querySelectorAll('[data-nf]')].map(i=>i.value.trim()),updated:Date.now()});
    if(land){x.landNo=$('#ct-land').value.trim();x.ping=$('#ct-ping').value;x.usePing=$('#ct-uping').value;x.useDesc=$('#ct-udesc').value.trim();
      x.rentPerPing=$('#ct-rpp').value;x.payDay=$('#ct-pd').value.trim();x.depositTotal=$('#ct-dep').value;x.stalls=[];}
    else{x.area=$('#ct-area').value.trim();x.h1=$('#ct-h1').value.trim();x.h2=$('#ct-h2').value.trim();
      x.stalls=[...el.querySelectorAll('#ct-stbody tr')].map(tr=>{const g=f=>((tr.querySelector(`[data-f="${f}"]`)||{}).value||'').trim();return {id:g('id'),rent:g('rent'),clean:g('clean'),deposit:g('deposit')};});}
    if(!x.created)x.created=Date.now();return x;}
  function bindStallBtns(){
    el.querySelectorAll('[data-sr]').forEach(b=>b.onclick=()=>{const tr=el.querySelector(`tr[data-si="${b.dataset.sr}"]`);if(!tr)return;
      const id=(tr.querySelector('[data-f="id"]')||{}).value;const o=(byId&&byId(U(id)))||(R||[]).find(x=>U(x.id)===U(id));
      if(!o){alert('找不到這個攤位');return;}
      const cust=(o.cust)||(B.cust&&B.cust[U(o.id)+'|'+o.name])||{};
      tr.querySelector('[data-f="rent"]').value=o.rent&&o.rent.mon!=null?o.rent.mon:'';
      tr.querySelector('[data-f="clean"]').value=o.rent&&o.rent.clean!=null?o.rent.clean:'';
      tr.querySelector('[data-f="deposit"]').value=cust.dep!=null?cust.dep:'';
      if(!$('#ct-name').value){$('#ct-name').value=o.name||'';if(o.tel||cust.tel)$('#ct-tel').value=o.tel||cust.tel||'';if(cust.addr)$('#ct-addr').value=cust.addr;}
      toast&&toast('已帶入 '+o.id);});
    el.querySelectorAll('[data-sx]').forEach(b=>b.onclick=()=>{const body=$('#ct-stbody');if(body.children.length<=1){body.querySelectorAll('input').forEach(i=>i.value='');return;}
      const tr=el.querySelector(`tr[data-si="${b.dataset.sx}"]`);if(tr)tr.remove();});}
  if(!land){bindStallBtns();$('#ct-addst').onclick=()=>{const cur=readForm();cur.stalls.push({id:'',rent:'',clean:'',deposit:''});
    $('#ct-stbody').innerHTML=stallRowsHtml(cur);bindStallBtns();};}
  el.querySelectorAll('[data-nx]').forEach(b=>b.onclick=()=>{const d=el.querySelector(`[data-ni="${b.dataset.nx}"]`);if(d)d.remove();});
  $('#ct-addn').onclick=()=>{const wrap=document.createElement('div');wrap.className='row';wrap.dataset.ni=String(Date.now());
    wrap.innerHTML=`<input data-nf placeholder="備註" style="flex:1;min-width:200px"><button type="button" class="sm ghost" data-nx>刪</button>`;
    wrap.querySelector('[data-nx]').onclick=()=>wrap.remove();$('#ct-addn').before(wrap);};
  $('#ct-save').onclick=async()=>{const x=readForm();if(!x.name){alert('請填承租人姓名');return;}
    if(!land&&!(x.stalls||[]).some(s=>s.id)){alert('請至少填一個攤位編號');return;}
    if(land&&!x.landNo){alert('請填土地編號');return;}
    const k=c.k||('c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5));
    L.ct=Object.assign({},L.ct);const {k:_,...rest}=x;L.ct[k]=rest;await save();view=null;toast&&toast('合約已存檔');};
  $('#ct-prev').onclick=()=>preview(o,readForm());
  $('#ct-docx').onclick=()=>{const x=readForm();dl(fileName(x)+'.docx',docxBlob(x));};}

function preview(o,c){if(!c)return;const {el}=o;let box=el.querySelector('#ctprint');if(!box){box=document.createElement('div');box.id='ctprint';el.appendChild(box);}
  box.hidden=false;box.innerHTML=`<style>${CSS}</style><div class="card noprint"><div class="row"><button class="ghost" id="ctpc">關閉預覽</button>
   <button id="ctp">🖨️ 列印／另存 PDF（A4）</button><button class="ghost" id="ctpd">下載 Word</button></div></div>${sheetHtml(c)}`;
  box.querySelector('#ctpc').onclick=()=>{box.hidden=true;box.innerHTML='';};
  box.querySelector('#ctp').onclick=()=>SJFPrint.printArea(box.querySelector('.ct-pg'),'A4 portrait');
  box.querySelector('#ctpd').onclick=()=>dl(fileName(c)+'.docx',docxBlob(c));
  box.scrollIntoView({behavior:'smooth',block:'start'});}

G.SJFContract={list,byStall,statusOf,bestStatus,expiring,SLBL,SCOL,blank,fillFromStall,sheetHtml,docxBlob,render,CSS,defaultPeriod,daysLeft,sumStalls};
})(typeof window!=='undefined'?window:globalThis);
