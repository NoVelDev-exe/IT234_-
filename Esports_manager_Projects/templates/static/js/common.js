"use strict";
/* ส่วนที่ทุกหน้าใช้ร่วมกัน: ข้อมูลอ้างอิง, การเชื่อมต่อ API, เมนู, ฟังก์ชันช่วย */
const PAGE=document.body.dataset.page;
const QS=new URLSearchParams(location.search);

const E={
 teams:{t:"ทีม",add:"เพิ่มทีม",cols:[["name","ชื่อทีม","text"],["region","ลีก / ประเทศ (เช่น VCT Pacific / ไทย (SEA))","text"]]},
 players:{t:"นักแข่ง",add:"เพิ่มนักแข่ง",cols:[["name","ชื่อในเกม (IGN)","text"],["team","ทีม","ref:teams"],["role","บทบาท","text"],["agents","ตัวละครที่เล่น","ag"]]},
 staff:{t:"โค้ชและสตาฟฟ์",add:"เพิ่มบุคลากร",cols:[["name","ชื่อเล่น / ชื่อ","text"],["team","ทีม","ref:teams"],["role","ตำแหน่ง","sel:หัวหน้าโค้ช|โค้ช|ผู้ช่วยโค้ช|โค้ชสมรรถภาพ|ผู้จัดการทีม|นักวิเคราะห์|สตาฟฟ์"]]},
 gear:{t:"อุปกรณ์",add:"เพิ่มอุปกรณ์",cols:[["name","ชื่ออุปกรณ์","text"],["brand","ยี่ห้อ / รุ่น","text"],["type","ประเภท","sel:เมาส์|คีย์บอร์ด|หูฟัง|จอภาพ|เมาส์แพด"],["owner","ผู้ใช้งาน","ref:players"],["status","สถานะ","sel:พร้อมใช้|ส่งซ่อม|สูญหาย"],["cost","ราคา (บาท)","num"],["serial","หมายเลขซีเรียล","text","h"],["img","รูปอุปกรณ์ (ว่างได้ ระบบดึงรูปจากรุ่นเดียวกันให้)","img","h"]]},
 lib:{t:"คลังอุปกรณ์",add:"เพิ่มรุ่นอุปกรณ์",cols:[["name","ชื่อรุ่น","text"],["brand","ยี่ห้อ","text"],["type","ประเภท","sel:เมาส์|คีย์บอร์ด|หูฟัง|จอภาพ|เมาส์แพด"],["img","รูปภาพประจำรุ่น (อุปกรณ์รุ่นเดียวกันทุกชิ้นจะใช้รูปนี้)","img","h"]]},
 tours:{t:"รายการแข่ง",add:"เพิ่มรายการแข่ง",cols:[["name","ชื่อรายการ","text"],["game","เกม","text"],["start","วันเริ่มแข่ง","date"],["place","สถานที่","text"],["prize","เงินรางวัล (บาท)","num"]]},
 results:{t:"ผลการแข่ง",add:"บันทึกผล",cols:[["tour","รายการแข่ง","ref:tours"],["date","วันที่แข่ง","date"],["a","ทีม A","ref:teams"],["b","ทีม B","ref:teams"],["sa","คะแนน A","num"],["sb","คะแนน B","num"]]}
};
const PAGES=[["home","ภาพรวม"],...Object.keys(E).filter(k=>k!=="staff"&&k!=="players"&&k!=="gear").map(k=>[k,E[k].t]),["bracket","ผลตามรายการ"],["compare","เปรียบเทียบทีม"]];

const LOGOS={
 "Paper Rex":"https://am-a.akamaihd.net/image?resize=48:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1630018120582_paper-rex-2021.png","Sentinels":"https://am-a.akamaihd.net/image?resize=48:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1739254422982_sent.png","Fnatic":"https://am-a.akamaihd.net/image?resize=48:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1644542427486_download37.png",
 "Gen.G Esports":"https://am-a.akamaihd.net/image?resize=48:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1775114509356_GENGLOGO_GOLD.png","EDward Gaming":"https://am-a.akamaihd.net/image?resize=48:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1735920597800_edg1.png","FULL SENSE":"https://am-a.akamaihd.net/image?resize=48:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1705915075330_FULLSENSE.png",
 "T1":"https://am-a.akamaihd.net/image?resize=48:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1677137430839_T1_infoboximage1.png","ZETA DIVISION":"https://am-a.akamaihd.net/image?resize=48:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1630017899610_zeta.png",
 "100 Thieves":"https://am-a.akamaihd.net/image?resize=640:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1644966311613_100TVAL.png","Cloud9":"https://owcdn.net/img/5f85fb0bc7a9f.png","NRG":"https://am-a.akamaihd.net/image?resize=48:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1731490666442_NRGWHT.png",
 "G2 Esports":"https://am-a.akamaihd.net/image?resize=48:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1675329807714_G2-Esports-Logo1.png","LOUD":"https://am-a.akamaihd.net/image?resize=48:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1644060140569_LOUDGreen.png","Team Heretics":"https://am-a.akamaihd.net/image?resize=48:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1674060672534_600px-Team_Heretics_2022_allmode1.png",
 "Karmine Corp":"https://am-a.akamaihd.net/image?resize=48:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1651626649159_download1.png","Team Liquid":"https://owcdn.net/img/5f85fa3dc9ddb.png",
 "TYLOO GAMING":"https://owcdn.net/img/63eb60fb08390.png","Weibo Gaming":"https://owcdn.net/img/62232bd14e5d7.png","Xi Lai Gaming":"https://owcdn.net/img/671742f863b9b.png",
 "FUT Esports":"https://owcdn.net/img/632be9976b8fe.png","Gentle Mates":"https://owcdn.net/img/6670153fa9120.png","Team Vitality":"https://owcdn.net/img/6466d79e1ed40.png",
 "Rex Regum Qeon":"https://owcdn.net/img/629f17f51e7a3.png",
 /* ทีมเดิมที่ยังไม่อยู่ในรายการใหม่ */
 "Team Secret":"https://owcdn.net/img/6132dd99395f1.png","DRX":"https://owcdn.net/img/620023405b63b.png","KIWOOM DRX":"https://owcdn.net/img/620023405b63b.png",
 "Natus Vincere":"https://owcdn.net/img/61b1be048b9f0.png","Bilibili Gaming":"https://owcdn.net/img/62fe084f981e4.png"
};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
/* จับคู่ชื่อทีมแบบไม่สนตัวพิมพ์/คำต่อท้าย เช่น "FNATIC" = "Fnatic", "Gen.G" = "Gen.G Esports" */
const LOGO_N={};for(const[k,v]of Object.entries(LOGOS)){LOGO_N[norm(k)]=v;LOGO_N[norm(k.replace(/\s+(esports|gaming)$/i,""))]=v}
const getLogo=name=>{const n=String(name||"");const own=typeof S!=="undefined"&&S&&S.teams?S.teams.find(t=>t.logo&&norm(t.name)===norm(n)):null;if(own)return own.logo;return LOGOS[n]||LOGO_N[norm(n)]||LOGO_N[norm(n.replace(/\s+(esports|gaming)$/i,""))]||""};
const mono=name=>{const w=String(name||"?").replace(/[^\p{L}\p{N}\s]/gu,"").trim().split(/\s+/).filter(Boolean);return(w.length>1?w[0][0]+w[1][0]:String(w[0]||"?").slice(0,2)).toUpperCase()};
const hue=name=>{let h=0;for(const c of String(name))h=(h*31+c.charCodeAt(0))%360;return h};
/* โลโก้สีเข้มที่มองไม่เห็นบนพื้นดำ: แสดงเป็นสีขาวแทน (เพิ่มชื่อทีมได้) */
const LOGO_LIGHT=new Set(["FUT Esports","Gentle Mates","Team Vitality"].map(norm));
const tLogoHtml=(name,cls="t-logo")=>{const src=getLogo(name);return src?`<img class="${cls}${LOGO_LIGHT.has(norm(name))?" lgw":""}" src="${src}" alt="${esc(name)}" onerror="this.style.display='none'">`:`<span class="${cls} mono" style="--h:${hue(name)}" aria-hidden="true">${esc(mono(name))}</span>`};

const TC={"เมาส์":"#e5484d","คีย์บอร์ด":"#4f8dff","หูฟัง":"#a77bff","จอภาพ":"#22c593","เมาส์แพด":"#ff6fb1"};
const GI={"เมาส์":"🖱️","คีย์บอร์ด":"⌨️","หูฟัง":"🎧","จอภาพ":"🖥️"};
const ROLE={Jett:"Duelist",Raze:"Duelist",Reyna:"Duelist",Phoenix:"Duelist",Neon:"Duelist",Yoru:"Duelist",Iso:"Duelist",Sage:"Sentinel",Cypher:"Sentinel",Killjoy:"Sentinel",Chamber:"Sentinel",Deadlock:"Sentinel",Omen:"Controller",Brimstone:"Controller",Viper:"Controller",Astra:"Controller",Harbor:"Controller",Clove:"Controller",Sova:"Initiator",Breach:"Initiator",Skye:"Initiator","KAY/O":"Initiator",Fade:"Initiator",Gekko:"Initiator",Tejo:"Initiator",Waylay:"Duelist",Vyse:"Sentinel",Deadlock:"Sentinel",Veto:"Sentinel"};
const SIL='<svg viewBox="0 0 100 110" aria-hidden="true"><circle cx="50" cy="34" r="20" fill="#0a0a0b"/><path d="M8 110c0-30 18-48 42-48s42 18 42 48z" fill="#0a0a0b"/></svg>';
const LOGO_SVG='<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M2 3l9 12-9 12h6l9-12L8 3zM28 3l-9 12 9 12h-6l-9-12 9-12z" fill="#f2b705"/></svg>';

function norm(s){return String(s||"").toLowerCase().replace(/[^a-z0-9฀-๿+]/g,"")}
function pa(s){return String(s||"").split(";").map(x=>x.trim().split(/\s+/)).filter(a=>a[0]&&a.length>=5).map(a=>({n:a[0],g:+a[1]||0,w:a[2]==="-"?null:(+a[2]||0),k:+a[3]||0,d:+a[4]||0}))}
function agStr(a){return(a||[]).map(x=>[x.n,x.g,x.w==null?"-":x.w,x.k,x.d].join(" ")).join("; ")}
const abbr=t=>t?t.name.split(" ").map(w=>w[0]).join("").slice(0,3).toUpperCase():"—";

/* ---------- สถานะและการเชื่อมต่อเซิร์ฟเวอร์ ---------- */
let S=null,saving=false,role=null,token=null;
try{role=sessionStorage.getItem("esm-role");token=sessionStorage.getItem("esm-token")}catch(e){}
if(role==="admin"&&!token)role=null;

function setSession(r,t){
 role=r||null;token=t||null;
 try{
  if(role)sessionStorage.setItem("esm-role",role);else sessionStorage.removeItem("esm-role");
  if(token)sessionStorage.setItem("esm-token",token);else sessionStorage.removeItem("esm-token");
 }catch(e){}
}

async function api(path,opts={}){
 const headers={"Content-Type":"application/json"};
 if(token)headers["X-Admin-Token"]=token;
 const res=await fetch(path,{cache:"no-store",...opts,headers});
 let data=null;try{data=await res.json()}catch(e){}
 if(!res.ok){const e=new Error((data&&data.error)||("HTTP "+res.status));e.status=res.status;throw e}
 return data;
}
async function write(fn){
 if(saving)return"กำลังบันทึกรายการก่อนหน้า";
 saving=true;
 try{const d=await fn();S=d.state;return""}
 catch(e){
  if(e.status===401){setSession(null);return e.message}
  return e.status?e.message:"บันทึกไม่สำเร็จ กรุณาตรวจว่าเซิร์ฟเวอร์ Python ยังทำงานอยู่ แล้วโหลดหน้าใหม่";
 }finally{saving=false}
}
const saveRecord=(k,o)=>write(()=>api("/api/"+k,{method:"POST",body:JSON.stringify(o)}));
const deleteRecords=(k,ids)=>write(()=>api("/api/"+k+"/delete",{method:"POST",body:JSON.stringify({ids})}));
function showError(m){alert(m);if(!role)location.href="/"}

async function logout(){
 if(token){try{await api("/api/logout",{method:"POST",body:"{}"})}catch(e){}}
 setSession(null);location.href="/";
}

/* ---------- ฟังก์ชันช่วยแสดงผล ---------- */
const nm=(k,id)=>{const r=S[k].find(x=>x.id===id);return r?r.name:"—"};
const fd=d=>d?new Date(d+"T00:00:00").toLocaleDateString("th-TH",{day:"numeric",month:"short",year:"numeric"}):"—";
const playerUrl=id=>"/player?id="+encodeURIComponent(id);

function nav(){
 const n=document.getElementById("nav");
 const brand=`<a class="brand" href="${role?"/home":"/"}">${LOGO_SVG}E-Sports <small>Team Manager</small></a>`;
 if(!role||!S){n.innerHTML=brand;return}
 n.innerHTML=brand+PAGES.map(([k,l])=>{const on=k===PAGE||(PAGE==="player"&&k==="teams");return`<a class="nb ${on?"on":""}" href="/${k}"${on?' aria-current="page"':""}>${l}${E[k]?`<span>${S[k].length}</span>`:""}</a>`}).join("")+
  '<div class="sp"></div><span class="role">'+(role==="admin"?"ADMIN":"USER")+'</span>'+
  (role==="admin"?'<a class="nb cta" href="/results?new=1">บันทึกผล</a>':'')+
  '<button class="nb" id="lo" type="button">ออกจากระบบ</button>';
 const on=n.querySelector(".nb.on");if(on)on.scrollIntoView({inline:"center",block:"nearest"});
}
const banner=()=>`<div class="mode ${role}">${role==="admin"?"โหมดผู้ดูแล — เพิ่ม แก้ไข และลบข้อมูลได้":"โหมดผู้ชม — ดูข้อมูลได้อย่างเดียว"}</div><p class="sub"></p>`;

// รายการ VALORANT Champions = ข้อมูลจริงจากระบบ (ผลแก้/ลบเองไม่ได้)
const REAL_TOURS=["valorant champions istanbul 2022","valorant champions los angeles 2023","valorant champions seoul 2024","valorant champions paris 2025","valorant champions shanghai 2026"];
const isRealTour=id=>{const t=S.tours.find(x=>x.id===id);return!!t&&REAL_TOURS.includes(String(t.name).trim().toLowerCase())};
// นัดชิงจริงของ VALORANT Champions: [แชมป์, รองแชมป์]
const VCT_FINALS={"valorant champions istanbul 2022":["LOUD","OpTic Gaming"],"valorant champions los angeles 2023":["Evil Geniuses","Paper Rex"],"valorant champions seoul 2024":["EDWARD Gaming","Team Heretics"],"valorant champions paris 2025":["NRG","FNATIC"],"valorant champions shanghai 2026":["LOUD","Team Vitality"]};
// แชมป์/รองแชมป์ตามระบบ 21 ทีม: ถ้าแชมป์จริงไม่อยู่ในระบบ รองแชมป์จริงจะเป็นแชมป์ของระบบแทน
const sysFinal=tour=>{const f=VCT_FINALS[String(tour&&tour.name||"").trim().toLowerCase()];if(!f)return null;const has=n=>S.teams.some(t=>t.name.trim().toLowerCase()===n.toLowerCase());
 return has(f[0])?[f[0],has(f[1])?f[1]:""]:has(f[1])?[f[1],""]:null};
const tourPlace=(tour,team)=>{const f=sysFinal(tour);
 if(!f){if(!tour||VCT_FINALS[String(tour.name||"").trim().toLowerCase()])return"";const top=standings(S.results.filter(r=>r.tour===tour.id)).find(t=>t.p>0&&t.pt>0);return top&&top.n.trim().toLowerCase()===String(team).trim().toLowerCase()?"champ":""}const n=String(team).trim().toLowerCase();return f[0].toLowerCase()===n?"champ":f[1]&&f[1].toLowerCase()===n?"runner":""};
// แมตช์ที่แข่งแล้ว = ผลที่วันที่แข่งไม่เกินวันนี้ (ใช้ตัวเลขเดียวกันทุกหน้า)
const playedResults=()=>{const d=new Date(),t=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");return S.results.filter(r=>!r.date||r.date<=t)};
function standings(rs=S.results){
 const m={};S.teams.forEach(t=>m[t.id]={id:t.id,f:[],n:t.name,p:0,w:0,d:0,l:0,pt:0,df:0});
 [...rs].sort((x,y)=>String(x.date).localeCompare(String(y.date))).forEach(r=>{const a=m[r.a],b=m[r.b];if(!a||!b)return;a.p++;b.p++;a.df+=r.sa-r.sb;b.df+=r.sb-r.sa;
  if(r.sa>r.sb){a.w++;b.l++;a.pt+=3;a.f.push("W");b.f.push("L")}else if(r.sa<r.sb){b.w++;a.l++;b.pt+=3;a.f.push("L");b.f.push("W")}else{a.d++;b.d++;a.pt++;b.pt++;a.f.push("D");b.f.push("D")}});
 return Object.values(m).sort((x,y)=>y.pt-x.pt||y.df-x.df);
}
function rankList(st){return st.map((t,i)=>`<div class="rk"><em>${i+1}</em><span class="lg">${tLogoHtml(t.n,"t-logo")}</span><b>${esc(t.n)}</b><span class="form" aria-label="ฟอร์ม 5 แมตช์ล่าสุด">${t.f.slice(-5).map(x=>`<i class="f${x}"></i>`).join("")}</span><u>${t.pt} pts</u></div>`).join("")}
function resRow(r){
 const A=nm("teams",r.a),B=nm("teams",r.b);
 return`<tr><td><div style="display:flex;align-items:center;gap:8px">${tLogoHtml(A,"t-logo sm")}${esc(A)}</div></td><td class="${r.sa>r.sb?"w":r.sa<r.sb?"l":""}"><b>${r.sa} : ${r.sb}</b></td><td><div style="display:flex;align-items:center;gap:8px">${tLogoHtml(B,"t-logo sm")}${esc(B)}</div></td><td>${esc(nm("tours",r.tour))}</td></tr>`;
}
/* รูปหน้าคนแบบวาด (ไม่ใช่รูปจริง) ต่างกันไปตามชื่อนักแข่ง สีเสื้อตามทีม */
function faceSvg(name,team){
 const h=hue(name),th=hue(team||name),skin=["#f1c9a5","#e0ac83","#c68863","#a86b47","#8a5536"][h%5],hair=["#1b1b1f","#3b2a20","#6b4a2b","#c9a24a","#7a2f2f","#d8d8dc"][(h>>2)%6],style=h%3;
 const hairPath=style===0?'<path d="M30 40c0-16 9-24 20-24s20 8 20 24c-4-8-10-11-20-11s-16 3-20 11z"/>':style===1?'<path d="M28 44c-2-20 8-29 22-29s24 9 22 29c-3-6-6-9-8-10-6 3-20 3-28 0-3 2-6 5-8 10z"/>':'<path d="M31 38c1-14 9-21 19-21 12 0 20 8 19 21-6-5-13-7-19-7s-13 2-19 7z"/><rect x="29" y="30" width="42" height="5" rx="2"/>';
 return`<svg viewBox="0 0 100 110" aria-hidden="true"><rect width="100" height="110" fill="hsl(${th} 30% 16%)"/><path d="M12 110c0-24 17-36 38-36s38 12 38 36z" fill="hsl(${th} 65% 45%)"/><path d="M42 72h16v10c-4 3-12 3-16 0z" fill="${skin}"/><ellipse cx="50" cy="48" rx="19" ry="23" fill="${skin}"/><g fill="${hair}">${hairPath}</g><circle cx="43" cy="50" r="2.2" fill="#1b1b1f"/><circle cx="57" cy="50" r="2.2" fill="#1b1b1f"/><path d="M44 60q6 4 12 0" stroke="#5a2e22" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
}
function pcard(p,link=true){
 const t=S.teams.find(x=>x.id===p.team);
 const b=`<span class="dp">${esc(p.role||"—")}</span><span class="dt">${esc(abbr(t))}</span><div class="di">${p.photo?`<img class="dph" src="${esc(p.photo)}" alt="${esc(p.name)}">`:faceSvg(p.name,t?t.name:"")}</div><div class="dn"><b>${esc(p.name)}</b><small>${esc(t?t.name:"ไม่มีทีม")}</small></div>`;
 return link?`<a class="dc" href="${playerUrl(p.id)}">${b}</a>`:`<div class="dc">${b}</div>`;
}

/* ---------- สไตล์ VCT: ลีก, หัวข้อหน้า, กล่องแบ่งกลุ่ม, การ์ด ---------- */
const LG=[
 {k:"Americas",n:"VCT Americas",c:"#ff5a1f",s:"shield",img:"https://am-a.akamaihd.net/image?resize=128:&f=http%3A%2F%2Fstatic.lolesports.com%2Fleagues%2F1757677856494_VCT23_INT_AMERICAS_Logo_MARK_RGB_Orange.png",d:"อเมริกาเหนือ · ใต้"},
 {k:"China",n:"VCT CN",c:"#ff3b5c",s:"star",img:"https://am-a.akamaihd.net/image?resize=128:&f=http%3A%2F%2Fstatic.lolesports.com%2Fleagues%2F1757677833011_VCT24_CN_Logo_Mark_RGB_Red.png",d:"จีน"},
 {k:"EMEA",n:"VCT EMEA",c:"#c8ff1a",s:"x",img:"https://am-a.akamaihd.net/image?resize=128:&f=http%3A%2F%2Fstatic.lolesports.com%2Fleagues%2F1757677841319_VCT23_INT_EMEA_Logo_MARK_RGB_GREEN.png",d:"ยุโรป · ตะวันออกกลาง · แอฟริกา"},
 {k:"Pacific",n:"VCT Pacific",c:"#22d3c5",s:"wave",img:"https://am-a.akamaihd.net/image?resize=128:&f=http%3A%2F%2Fstatic.lolesports.com%2Fleagues%2F1757677849568_VCT23_INT_PACIFIC_Logo_MARK_RGB_Blue.png",d:"เอเชีย-แปซิฟิก · SEA"},
 {k:"",n:"ทีมอื่น ๆ",c:"#8b8b93",s:"none",d:"ไม่ระบุลีก"}
];
/* อ่านลีกจากช่อง region เช่น "VCT Pacific / ไทย (SEA)" — ทีม SEA นับอยู่ใน Pacific */
function leagueOf(t){
 if(!t)return"";const r=String(t.region||"");
 if(/china|\bCN\b|จีน/i.test(r))return"China";
 for(const k of["Americas","EMEA","Pacific"])if(r.toLowerCase().includes(k.toLowerCase()))return k;
 if(/\bSEA\b/.test(r))return"Pacific";
 return"";
}
function lgIcon(L){
 if(L.img)return`<img class="lgimg" src="${L.img}" alt="" aria-hidden="true" onerror="this.outerHTML=lgSvg(LG.find(x=>x.k==='${L.k}'))">`;
 return lgSvg(L);
}
function lgSvg(L){
 const c=L.c,s={
  shield:`<path d="M22 4 38 10v12c0 9-7 15-16 18C13 37 6 31 6 22V10z" fill="none" stroke="${c}" stroke-width="4"/><path d="M15 17h14l-7 11z" fill="${c}"/>`,
  star:`<path d="M22 3l4.5 13.5L40 12l-9 10 9 10-13.5-4.5L22 41l-4.5-13.5L4 32l9-10-9-10 13.5 4.5z" fill="none" stroke="${c}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="22" cy="22" r="4" fill="${c}"/>`,
  x:`<path d="M9 9l26 26M35 9 9 35" stroke="${c}" stroke-width="8"/><rect x="18" y="18" width="8" height="8" fill="#111114" transform="rotate(45 22 22)"/>`,
  wave:`<circle cx="22" cy="22" r="18" fill="${c}"/><path d="M10 25c5-8 11 4 16-4s8-2 8-2" stroke="#111" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  none:`<circle cx="22" cy="22" r="16" fill="none" stroke="${c}" stroke-width="4" stroke-dasharray="5 5"/>`
 }[L.s];
 return`<svg viewBox="0 0 44 44" aria-hidden="true">${s}</svg>`;
}
const circIcon=(c,em)=>`<span class="lic" style="--c:${c}" aria-hidden="true">${em}</span>`;

/* หัวข้อหน้าแบบ "ทีมพาร์ทเนอร์ VCT": ชื่อหน้าใหญ่สีทอง + บรรทัดสรุป + เส้นคั่น + แถบเครื่องมือ */
function phero(title,sub="",tools="",cls=""){
 return`<div class="phero ${cls}"><h1>${title}</h1>${sub?`<p>${sub}</p>`:""}</div><div class="pdiv"></div>${tools?`<div class="ptools">${tools}</div>`:""}`;
}
/* กล่องกลุ่ม: ไอคอน + ชื่อกลุ่มด้านซ้าย การ์ดเรียงเป็นตารางด้านขวา */
function lsec(icon,name,n,unit,body,{add="",wide=false,desc="",color="",grid="",emptyText="ยังไม่มีข้อมูล"}={}){
 const empty=!body;
 return`<section class="lsec${empty?" lempty":""}${color?" lacc":""}"${color?` style="--lc:${color}"`:""}><div class="lside"><div class="lsi">${icon}<b>${esc(name)}</b>${desc?`<em class="lds">${esc(desc)}</em>`:""}<small>${n} ${unit}</small></div></div>
  <div class="lgrid ${wide?"w2":""} ${grid}">${body}${add}${empty?`<p class="lnone">${esc(emptyText)}</p>`:""}</div></section>`;
}
/* การ์ด 1 ใบ: ถ้าเป็นแอดมินจะมีช่องเลือก (.rc) และปุ่มแก้ไข/ลบ */
function vtile(id,inner,{href="",cls="",style="",tools=true,left=false,edit=true,del=true}={}){
 const a=tools&&role==="admin";
 const t=a&&del?`<input type="checkbox" class="rc" data-id="${esc(id)}" aria-label="เลือก"><span class="vtt">${edit?`<button type="button" data-e="${esc(id)}" aria-label="แก้ไข" title="แก้ไข">✎</button>`:""}<button type="button" class="x" data-x="${esc(id)}" aria-label="ลบ" title="ลบ">✕</button></span>`:"";
 const body=href?`<a class="vtl ${left?"lf":""}" href="${href}">${inner}</a>`:`<div class="vtl ${left?"lf":""}">${inner}</div>`;
 return`<div class="vt ${cls} ${a&&!href?"ed":""}" ${a&&!href?`data-e="${esc(id)}"`:""} ${style?`style="${style}"`:""}>${t}${body}</div>`;
}
const addTile=(label,pre={},color="")=>role==="admin"?`<button type="button" class="vadd" data-a="1" data-pre="${esc(JSON.stringify(pre))}"${color?` style="--c:${color}"`:""}><i class="vplus" aria-hidden="true">+</i>${esc(label)}</button>`:"";
const regionDetail=t=>{const r=String(t.region||"");const i=r.indexOf(" / ");return i>=0?r.slice(i+3):(/^VCT /i.test(r)?(t.game||""):r)};
function teamTile(t,tools=true){
 const n=S.players.filter(p=>p.team===t.id).length;
 const tip=[regionDetail(t),n+" นักแข่ง"].filter(Boolean).join(" · ");
 return vtile(t.id,`${tLogoHtml(t.name,"vlg")}<b title="${esc(tip)}">${esc(t.name)}</b>`,{href:"/teams?id="+encodeURIComponent(t.id),tools,cls:"tt",edit:false});
}
/* ทีมทั้งหมดแบ่งกล่องตามลีก */
function teamsByLeague(rows,{tools=true,showEmpty=false,only=null}={}){
 return LG.filter(L=>!only||L.k===only).map(L=>{
  const rs=rows.filter(t=>leagueOf(t)===L.k).sort((a,b)=>a.name.localeCompare(b.name));
  if(!rs.length&&!(showEmpty&&L.k))return"";
  return lsec(lgIcon(L),L.n,rs.length,"ทีม",rs.map(t=>teamTile(t,tools)).join(""),{color:L.c,grid:"tg",emptyText:"ยังไม่มีทีมในลีกนี้",add:tools&&showEmpty&&(typeof canAddTeam!=="function"||canAddTeam(L.k?"VCT "+(L.k==="China"?"CN":L.k):""))?addTile("เพิ่มทีม",{region:L.k?"VCT "+(L.k==="China"?"CN":L.k):""},L.c):""});
 }).join("");
}

/* ---------- สไตล์เสริม (ย้ายไปไฟล์ CSS หลักได้) ---------- */
(function(){if(document.getElementById("esm-extra"))return;const st=document.createElement("style");st.id="esm-extra";st.textContent=`
.phero.vct h1{font-size:clamp(34px,5vw,58px);font-weight:900;letter-spacing:.5px;background:linear-gradient(180deg,#f8e7b0 0%,#d4b26a 55%,#a8853d 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.lsec.lacc{display:grid;grid-template-columns:150px 1fr;background:#0d0d0f;border:1px solid #2a2a2e;border-radius:6px;overflow:hidden;margin-bottom:14px}
.lsec.lacc .lside{display:flex;align-items:center;justify-content:center;padding:16px 8px;border-right:1px solid #2a2a2e;background:radial-gradient(circle at 50% 45%,color-mix(in srgb,var(--lc) 14%,transparent),transparent 65%)}
.lsec.lacc .lsi{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
.lsec.lacc .lsi .lgimg{width:76px;height:76px;object-fit:contain;filter:drop-shadow(0 0 10px color-mix(in srgb,var(--lc) 45%,transparent))}
.lsec.lacc .lsi svg{width:68px;height:68px;filter:drop-shadow(0 0 10px color-mix(in srgb,var(--lc) 45%,transparent))}
.lsec.lacc .lsi b{font-size:15px;font-weight:800;color:#fff}
.lsec.lacc .lsi small{font-size:11px;color:#8b8b93}
.lsec.lacc .lgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:12px;align-content:center}
@media(max-width:900px){.lsec.lacc .lgrid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:640px){.lsec.lacc .lgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.lsec.lacc .vt.tt{position:relative;background:#1a1a1d;border:1px solid transparent;border-radius:4px}
.lsec.lacc .vt.tt:hover{background:#222226;border-color:color-mix(in srgb,var(--lc) 55%,transparent)}
.lsec.lacc .vt.tt .vtl{min-height:92px;gap:8px;padding:12px 6px;color:#fff;text-decoration:none}
.lsec.lacc .vt.tt .vlg,.lsec.lacc .vt.tt .mono{width:46px;height:46px;object-fit:contain}
.lsec.lacc .vt.tt .vtl b{font-size:13px}
.lsec.lacc .vt.tt .vtl b{font-size:11.5px;font-weight:700}
.lsec.lacc .vadd{min-height:92px;border:1px dashed #3a3a40;border-radius:4px;background:transparent;color:#8b8b93;font-size:12px;cursor:pointer}
@media(max-width:760px){.lsec.lacc .lsi .lgimg{width:44px;height:44px}.lsec.lacc{grid-template-columns:1fr}.lsec.lacc .lside{border-right:0;border-bottom:1px solid #2a2a2e}.lsec.lacc .lsi{flex-direction:row}.lsec.lacc .lsi svg{width:44px;height:44px}}
.lsi .lds{display:block;font-style:normal;font-size:11px;line-height:1.35;color:#8b8b93;margin:2px 0 4px;max-width:120px}
.lgrid.tg{grid-template-columns:repeat(4,minmax(0,1fr))}
@media(max-width:900px){.lgrid.tg{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:640px){.lgrid.tg{grid-template-columns:repeat(2,minmax(0,1fr))}}
.vt.tt{transition:background .15s,transform .15s}
.vt.tt:hover{background:#1c1c21;transform:translateY(-1px)}
.vt.tt .vtl{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:74px;text-align:center}
.vt.tt .vtl b{font-size:12px;line-height:1.25}
.vt.tt .vlg{width:46px;height:46px;object-fit:contain}
.lgw{background:#fff;border-radius:8px;padding:3px;box-sizing:border-box;object-fit:contain}
.agh,.agr{display:grid;grid-template-columns:1.5fr repeat(4,1fr) 28px;gap:6px;align-items:center}
.agh{font-size:11px;color:#8b8b93;margin:4px 0}
.agr{margin-bottom:6px}.agr select,.agr input{width:100%;min-width:0;box-sizing:border-box}
.agr .agx{background:none;border:0;color:#8b8b93;cursor:pointer;font-size:14px}.agr .agx:hover{color:#e5484d}
#agadd{margin-top:2px}
.agv{grid-template-columns:1.5fr repeat(4,1fr)}
.agr.agv{padding:8px 10px;border:1px solid #2a2a2e;border-radius:6px;background:#141416;font-size:13px}
.agr.agv span{text-align:center;color:#d6d6db}.agh.agv span:not(:first-child){text-align:center}
.tdtop{display:flex;justify-content:space-between;gap:8px;margin:8px 0 14px}
.tdh{display:flex;align-items:center;gap:20px;flex-wrap:wrap;padding:22px 24px;border:1px solid #2a2a2e;border-radius:8px;background:linear-gradient(110deg,#141416 40%,color-mix(in srgb,var(--lc) 22%,#141416));margin-bottom:14px}
.tdh h1{margin:0;font-size:clamp(26px,4vw,40px);color:#fff}
.tdlogo{width:104px;height:104px;display:grid;place-items:center;border-radius:10px;background:#0d0d0f;border:1px solid #2a2a2e}.tdlogo .vlg{width:80px;height:80px;object-fit:contain;font-size:22px;font-weight:900}
.tdlg{display:flex;align-items:center;gap:8px;margin:6px 0 0;color:#cfcfd5;font-size:13px}.tdlg svg,.tdlg img{width:28px;height:28px;object-fit:contain}.tdlg em{font-style:normal;font-size:11px;padding:2px 8px;border-radius:99px;background:#ffffff14;color:#d4b26a}
.tdst{display:flex;gap:22px;margin-left:auto}.tdst div{text-align:center}.tdst b{display:block;font-size:22px;color:#fff}.tdst small{color:#8b8b93;font-size:12px}
.tdgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.tdbox{padding:16px 18px;border:1px solid #2a2a2e;border-radius:8px;background:#0d0d0f;margin-bottom:14px}.tdbox h3{margin:0 0 12px;font-size:16px;color:#fff}
.tdr{display:grid;grid-template-columns:52px 1fr auto;gap:4px 10px;align-items:center;padding:8px 0;border-top:1px solid #1f1f23}.tdr:first-of-type{border-top:0}.tdr small{grid-column:2/-1;color:#8b8b93;font-size:12px}
.tdwl{font-size:12px;font-weight:700;text-align:center;border-radius:4px;padding:3px 0}.tdwl.W{background:#3ddc9722;color:#3ddc97}.tdwl.L{background:#e5484d22;color:#e5484d}.tdwl.D{background:#ffffff14;color:#cfcfd5}
.tdop{display:flex;align-items:center;gap:8px;color:#fff}.tdsc{color:#fff}
.tdev{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #1f1f23;color:#fff;text-decoration:none}.tdev:first-of-type{border-top:0}.tdev span{flex:1;display:flex;flex-direction:column}.tdev small{color:#8b8b93;font-size:12px}
.tdroster{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
.tdp{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px;border:1px solid #2a2a2e;border-radius:8px;background:#141416;color:#fff;text-decoration:none;transition:border-color .15s,transform .15s}.tdp:hover{border-color:#d4b26a;transform:translateY(-2px)}
.tdpi{width:100%;aspect-ratio:10/11;border-radius:6px;overflow:hidden;display:block}.tdpi svg,.tdpi img{width:100%;height:100%;object-fit:cover;display:block}.tdpi.sm{width:40px;height:44px;aspect-ratio:auto}
.tdp small{color:#8b8b93;font-size:12px}
.tdpst{display:grid;grid-template-columns:1fr 1fr;gap:4px;width:100%;margin-top:4px}.tdpst i{font-style:normal;display:flex;flex-direction:column;align-items:center;padding:4px;border-radius:4px;background:#0d0d0f;color:#8b8b93;font-size:10px}.tdpst i b{color:#f2b705;font-size:13px}
.tdbox h3{display:flex;align-items:center;justify-content:space-between;gap:10px}.tdaddw .btn{font-size:13px}
.tdsub{margin:16px 0 8px!important;font-size:14px!important}
.tdstaff{display:flex;flex-wrap:wrap;gap:10px}.tds{display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid #2a2a2e;border-radius:8px;background:#141416;color:#fff}.tds span:last-child{display:flex;flex-direction:column}.tds small{color:#8b8b93;font-size:12px}
@media(max-width:760px){.tdgrid{grid-template-columns:1fr}.tdst{margin-left:0}}
.talist{display:flex;flex-direction:column;gap:6px;margin-top:10px;max-height:52vh;overflow:auto}
.tarow{display:grid;grid-template-columns:20px 44px 1fr auto;align-items:center;gap:10px;padding:6px 10px;border:1px solid #2a2a2e;border-radius:6px;background:#141416;cursor:pointer;margin:0}
.tagp{padding:8px;border:1px solid #2a2a2e;border-radius:8px;background:#0f0f11}.tagh{display:flex;align-items:center;gap:10px;margin-bottom:6px}.tagh .taf{width:36px;height:40px;border-radius:6px;overflow:hidden;display:block}.tagh .taf svg{width:100%;height:100%;display:block}.tagh b{color:#fff}.tagh small{color:#8b8b93;font-size:12px}
.tarow.sm{grid-template-columns:20px 110px 1fr;margin-top:4px;padding:5px 10px}.tgt{font-size:12px;color:var(--c)}
.tarow.has{opacity:.5;cursor:default}
.lview{display:grid;grid-template-columns:90px 1fr;gap:8px 12px;margin:14px 0 4px}.lview dt{color:#8b8b93}.lview dd{margin:0;color:#e8e8ea}
.lvh{font-size:14px;color:#cfcfd4;margin:14px 0 6px}.lvteams{display:flex;flex-direction:column;gap:6px;max-height:40vh;overflow:auto}.lvt{display:flex;align-items:center;gap:10px;padding:6px 10px;border:1px solid #2a2a2e;border-radius:6px;background:#141416;text-decoration:none;color:inherit}.lvt:hover{border-color:#f2b705}.lvt .t-logo{width:32px;height:32px;flex:none}.lvt b{display:block;color:#fff;font-size:14px}.lvt small{color:#8b8b93;font-size:12px}
.tdgr{display:grid;grid-template-columns:150px 1fr;gap:12px;align-items:center;padding:10px 0;border-top:1px solid #222}.tdgr:first-child{border-top:0}.tdgp{display:flex;align-items:center;gap:8px}.tdgp b{color:#fff}.tdgl{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.tdgi{display:flex;flex-direction:column;align-items:center;text-align:center;gap:3px;padding:8px;border:1px solid #2a2a2e;border-radius:8px;background:#121214;text-decoration:none;color:inherit;min-width:0}.tdgi:hover{border-color:#f2b705}.tdgim{width:64px;height:64px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:6px;font-size:28px}.tdgim img{max-width:58px;max-height:58px;object-fit:contain}.tdgi small{font-size:11px}.tdgi b{font-size:12px;color:#e8e8ea;line-height:1.25;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
@media(max-width:700px){.tdgr{grid-template-columns:1fr}.tdgl{grid-template-columns:repeat(3,minmax(0,1fr))}}
.tdgt{display:flex;gap:6px;margin-top:4px}.tdgt.top{display:inline-flex;margin:0 0 0 12px;vertical-align:middle}.btn.sm{padding:3px 9px;font-size:12px}.tdgp>span{display:flex;flex-direction:column}
button.tdgi{cursor:pointer;font:inherit}.tdgi.add{border-style:dashed;background:transparent}.tdgi.add .tdgim{background:#1c1c20;color:#f2b705;font-size:30px;font-weight:300}.tdgi.add b{color:#f2b705}.tdgi.none{opacity:.45}.tdgi.none .tdgim{background:#1c1c20}button.tdgi:hover{border-color:#f2b705;transform:translateY(-1px)}
.gpgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-top:10px;max-height:55vh;overflow:auto}.gpk{display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;padding:8px;border:1px solid #2a2a2e;border-radius:8px;background:#121214;color:inherit;font:inherit;cursor:pointer}.gpk:hover{border-color:#f2b705}.gpk.on{border-color:#f2b705;background:#2a2410;cursor:default}.gpk b{font-size:12px;color:#e8e8ea;line-height:1.25}.gpk small{font-size:11px;color:#8b8b93}#gpq{width:100%;margin-top:4px}
.ltbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;margin:12px 0;border:1px solid #2a2a2e;border-radius:10px;background:#111113}.ltl{display:flex;flex-wrap:wrap;align-items:center;gap:10px}.ltl .t-logo{width:36px;height:36px}.ltl label{color:#cfcfd4;font-weight:700}.ltl small{color:#8b8b93;width:100%}.ltl small a{color:#f2b705}.ltb{display:flex;flex-wrap:wrap;gap:8px}.ltb .btn:disabled{opacity:.4;cursor:default}
.gpvbox{display:flex;align-items:center;justify-content:center;min-height:150px;background:#fff;border-radius:8px;padding:10px;margin-top:4px}.gpvbox .agnone{color:#555}.gpv{max-width:180px;max-height:160px;object-fit:contain;display:block}
.tarow .taf{width:44px;height:48px;border-radius:6px;overflow:hidden;display:block}.tarow .taf svg{width:100%;height:100%;display:block}
.tarow .tan{display:flex;flex-direction:column}.tarow .tan b{color:#fff}.tarow .tan small{color:#8b8b93;font-size:12px}
.tarow .tas{color:#a1a1a8;font-size:12px;white-space:nowrap}
.agnone{margin:4px 0 0;color:#8b8b93;font-size:13px}
#f_role:disabled{opacity:1;cursor:not-allowed;color:inherit}
.vav img{width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block}
.di svg,.vav svg{width:100%;height:100%;display:block}
.flogo .fface{width:72px;height:80px;border-radius:8px;overflow:hidden}
.di .dlg{width:60%;height:60%;object-fit:contain;display:block;margin:auto;opacity:.9}
.vav .tlg{width:70%;height:70%;object-fit:contain;margin:15%}
.di .dph{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.flogo:empty{display:none}
.flogo{display:flex;justify-content:center;align-items:center;gap:12px;margin-top:10px;padding:10px 12px;border:1px solid #2a2a2e;border-radius:6px;background:#141416;color:#a1a1a8;font-size:13px}
.flogo .flg{width:40px;height:40px;object-fit:contain;display:inline-grid;place-items:center;font-size:13px}
.mono{display:inline-grid;place-items:center;border-radius:6px;font-weight:800;letter-spacing:.5px;background:hsl(var(--h) 45% 18%);color:hsl(var(--h) 85% 72%)}
.vt.tt .mono{width:30px;height:30px;font-size:11px}
.lsec.lempty .lgrid{display:flex;flex-wrap:wrap;align-items:center;gap:16px}
.lsec.lempty .vadd{flex:0 0 232px}
.lsec.lempty .lnone{margin:0;color:#8b8b93;font-size:13px}
.vadd{display:flex;align-items:center;justify-content:center;gap:8px;transition:border-color .15s,color .15s,background .15s}
.vadd .vplus{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;border:1px solid currentColor;font-style:normal;font-size:13px;line-height:1}
.vadd:hover,.vadd:focus-visible{border-color:var(--c,#f2b705);color:var(--c,#f2b705);background:color-mix(in srgb,var(--c,#f2b705) 8%,transparent)}
.chip .cn{margin-left:6px;font-size:11px;opacity:.65}
.tban{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:16px 24px;flex-wrap:wrap;margin:0 0 16px;padding:20px 24px;border:1px solid #2a2a2e;border-radius:8px;background:linear-gradient(105deg,#141416 0%,#141416 42%,#4d1216 72%,#a8232a 100%)}
.tban::after{content:"";position:absolute;right:-60px;top:-80px;width:300px;height:300px;background:repeating-linear-gradient(135deg,rgba(255,255,255,.07) 0 22px,transparent 22px 44px);transform:rotate(10deg);pointer-events:none}
.tban>*{position:relative;z-index:1}
.tbt{display:inline-block;padding:2px 8px;border-radius:4px;background:#fff;color:#111;font-size:11px;font-weight:700}
.tban h3{margin:8px 0 4px;font-size:20px;color:#fff}
.tban p{margin:0 0 10px;color:#c9c9cf;font-size:13px;max-width:560px}
.tban ul{display:flex;flex-wrap:wrap;gap:6px 18px;margin:0;padding:0;list-style:none;font-size:12px;font-weight:600;color:#fff}
.tban li::before{content:"✓";display:inline-grid;place-items:center;width:16px;height:16px;margin-right:6px;border-radius:50%;background:#e5484d;font-size:10px;vertical-align:-3px}
.tban .btn{white-space:nowrap}
`;document.head.appendChild(st)})();

/* ---------- วาดหน้า ----------
   แต่ละหน้าต้องมีฟังก์ชัน view() คืนค่า HTML และอาจมี onStart() ที่จะถูกเรียกหลังวาดครั้งแรก */

/* ผลการแข่ง -> สถิตินักแข่ง: แมพที่ทีมแข่ง (คะแนน A+B) บวกเข้าตัวหลักของนักแข่งทุกคนในทีม */
function teamResMaps(tid){let g=0,w=0,m=0,mw=0;for(const r of (S&&S.results)||[]){if(r.a!==tid&&r.b!==tid)continue;const x=Number(r.a===tid?r.sa:r.sb)||0,y=Number(r.a===tid?r.sb:r.sa)||0;g+=x+y;w+=x;m++;if(x>y)mw++}return{g,w,m,mw}}
function agentsWithResults(p){const A=(p.agents||[]).map(a=>({...a}));const r=p.team?teamResMaps(p.team):{g:0,w:0};if(!r.g)return A;
 if(!A.length)return[{n:"ผลการแข่ง",g:r.g,w:r.w,k:0,d:0}];
 const i=A.reduce((b,a,j)=>a.g>A[b].g?j:b,0);A[i].g+=r.g;A[i].w=(A[i].w||0)+r.w;return A}
/* ฟุตเตอร์เครดิต (ใส่ให้ทุกหน้าอัตโนมัติ — แก้ข้อความที่นี่ที่เดียว) */
const IG_USER="novel_720";  // ← ใส่ชื่อ IG ตรงนี้ (ไม่ต้องมี @) เช่น "novel.dev" — ว่างไว้ = ไม่แสดง
const IG_SVG='<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/></svg>';
function siteFooter(){
 if(document.getElementById("sitefoot"))return;
 const ln=(u,t)=>`<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
 const f=document.createElement("footer");f.id="sitefoot";f.className="sitefoot";
 f.innerHTML=`<div class="sf1"><b>© ${new Date().getFullYear()} E-sports Team Manager</b> by <b class="sfby">NoVeL</b>${IG_USER?` <a class="sfig" href="https://www.instagram.com/${encodeURIComponent(IG_USER)}/" target="_blank" rel="noopener" aria-label="Instagram ของ NoVeL">${IG_SVG}<span>@${esc(IG_USER)}</span></a>`:""}</div>
 <div class="sf2">ข้อมูลการแข่ง ${ln("https://www.thespike.gg","thespike.gg")} · ${ln("https://www.fragster.com","fragster.com")} · สถิตินักแข่ง ${ln("https://www.vlr.gg","vlr.gg")} · อุปกรณ์ ${ln("https://prosettings.net","prosettings.net")}</div>
 <div class="sf3">VALORANT และ VALORANT Champions Tour เป็นเครื่องหมายการค้าของ Riot Games, Inc. เว็บนี้ไม่ได้เกี่ยวข้องหรือได้รับการรับรองจาก Riot Games<br>โลโก้ทีมและรูปอุปกรณ์เป็นลิขสิทธิ์ของเจ้าของ ใช้เพื่อการศึกษาเท่านั้น</div>`;
 // ถ้าหน้าเดิมมีเครดิต "by NoVeL" อยู่แล้ว ให้แทนที่ตัวเดิม (ไม่ให้ซ้ำ)
 const old=[...document.querySelectorAll("footer,body>div,body>p,body>small")].find(e=>e.id!=="sitefoot"&&/NoVeL/i.test(e.textContent)&&e.textContent.length<200);
 if(old)old.replaceWith(f);else document.body.appendChild(f);
}
function render(){
 nav();
 const v=document.getElementById("v");
 const f=document.activeElement&&document.activeElement.id==="q";
 v.innerHTML=(PAGE==="login"?"":banner())+view();
 if(f){const i=document.getElementById("q");if(i){i.focus();const n=i.value.length;i.setSelectionRange(n,n)}}
 if(typeof runAutoGear==="function")runAutoGear();
 siteFooter();
}

document.addEventListener("click",ev=>{if(ev.target.closest("#lo"))logout()});

async function start(){
 if(PAGE==="login"){if(role){location.replace("/home");return}render();return}
 if(!role){location.replace("/");return}
 const v=document.getElementById("v");
 v.textContent="กำลังโหลดข้อมูลจากเซิร์ฟเวอร์…";
 if(role==="admin"){
  try{const ss=await api("/api/session");if(!ss.admin){setSession(null);location.replace("/");return}}
  catch(e){}
 }
 try{S=await api("/api/state")}
 catch(e){v.textContent="โหลดข้อมูลไม่สำเร็จ กรุณาเปิดเซิร์ฟเวอร์ด้วยคำสั่ง python server.py แล้วโหลดหน้าใหม่";return}
 render();
 if(typeof onStart==="function")onStart();
}
window.addEventListener("DOMContentLoaded",start);