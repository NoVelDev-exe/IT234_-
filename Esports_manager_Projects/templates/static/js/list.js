"use strict";
/* หน้ารายการข้อมูล: teams / players / staff / gear / lib / tours / results
   แต่ละไฟล์ HTML กำหนด data-page เป็นชื่อตาราง แล้วใช้สคริปต์นี้ร่วมกัน
   แสดงผลแบบการ์ดแบ่งกล่องตามลีก (สไตล์ VCT) — ฟังก์ชันช่วยอยู่ใน common.js */
const tab=PAGE;
let q=new URLSearchParams(location.search).get("q")||"",pl="all",pt="",gt="all";
const IMG={};
const dlg=document.getElementById("dlg");

function gimg(g){const f=a=>(a.find(x=>x.img&&norm(x.name)===norm(g.name))||{}).img;return g.img||f(S.gear)||f(S.lib)||imgOf(g.name)}
const inLeague=t=>pl==="all"||leagueOf(t)===pl;
const tm=id=>{const t=S.teams.find(x=>x.id===id);if(!t)return pl==="all"&&!pt;return inLeague(t)&&(!pt||pt===id)};
const teamOf=id=>S.teams.find(x=>x.id===id);
const ownerTeam=g=>{const o=S.players.find(p=>p.id===g.owner);return o?teamOf(o.team):null};
const today=()=>{const n=new Date();return[n.getFullYear(),String(n.getMonth()+1).padStart(2,"0"),String(n.getDate()).padStart(2,"0")].join("-")};
/* ทีมเริ่มต้น (21 ทีม) ใช้กับปุ่ม "เพิ่มทีมพาร์ทเนอร์" ในหน้าทีม */
const VCT_TEAMS=[
 ...["100 Thieves","G2 Esports","LOUD","NRG","Sentinels"].map(n=>[n,"Americas"]),
 ...["EDWARD Gaming","TYLOO GAMING","Weibo Gaming","Xi Lai Gaming"].map(n=>[n,"CN"]),
 ...["FNATIC","FUT Esports","Gentle Mates","Karmine Corp","Team Heretics","Team Vitality"].map(n=>[n,"EMEA"]),
 ...["FULL SENSE","Gen.G","Paper Rex","Rex Regum Qeon","T1","ZETA DIVISION"].map(n=>[n,"Pacific"])
];
const missingVct=()=>VCT_TEAMS.filter(([n])=>!S.teams.some(t=>norm(t.name)===norm(n)));
const stCls=v=>v==="พร้อมใช้"?"ok":v==="ส่งซ่อม"?"mid":"bad";

/* ---------- ตัวกรอง ---------- */
/* คลัง: หมวดหมู่ตามแบรนด์ (แบรนด์ที่มีน้อยกว่า 3 รุ่น รวมเป็น อื่น ๆ) */
let LBR="all";const OTHER="อื่น ๆ";
const brandCount=()=>{const m={};for(const l of S.lib){const b=(l.brand||"").trim()||OTHER;m[b]=(m[b]||0)+1}return m};
const brandKey=l=>{const b=(l.brand||"").trim()||OTHER;return(brandCount()[b]||0)>=3&&b!==OTHER?b:OTHER};
function brandBar(){
 const m={};for(const l of S.lib){const k=brandKey(l);m[k]=(m[k]||0)+1}
 const ks=Object.keys(m).filter(x=>x!==OTHER).sort((a,b)=>m[b]-m[a]||a.localeCompare(b));if(m[OTHER])ks.push(OTHER);
 if(LBR!=="all"&&!m[LBR])LBR="all";
 return`<div class="fb"><div class="chips">${[["all","ทุกแบรนด์",S.lib.length],...ks.map(k=>[k,k,m[k]])].map(([v,l,n])=>`<button type="button" class="chip ${LBR===v?"on":""}" data-lbr="${esc(v)}">${esc(l)}<span class="cn">${n}</span></button>`).join("")}</div></div>`;
}

function fbar(k){
 const L=["all","Pacific","Americas","EMEA","China"];
 const teams=S.teams.filter(inLeague);
 const tf=k==="teams"?t=>t:k==="gear"?ownerTeam:r=>teamOf(r.team);
 const cnt=x=>S[k].filter(r=>x==="all"||leagueOf(tf(r))===x).length;
 let h=`<div class="fb"><div class="chips">${L.map(x=>`<button type="button" class="chip ${pl===x?"on":""}" data-pl="${x}">${x==="all"?"ทุกลีก":x}<span class="cn">${cnt(x)}</span></button>`).join("")}</div>`;
 if(k!=="teams")h+=`<select id="pt" aria-label="เลือกทีม"><option value="">ทุกทีม</option>${teams.map(t=>`<option value="${esc(t.id)}" ${t.id===pt?"selected":""}>${esc(t.name)}</option>`).join("")}</select>`;
 h+=`</div>`;
 if(k==="gear")h+=`<div class="chips tc"><button type="button" class="chip ${gt==="all"?"on":""}" data-gt="all">ทุกประเภท</button>${Object.keys(TC).map(x=>`<button type="button" class="chip ${gt===x?"on":""}" data-gt="${x}" style="--c:${TC[x]}"><i></i>${x}</button>`).join("")}</div>`;
 return h;
}

/* ---------- การ์ดแต่ละประเภท ---------- */
const cards={
 players:p=>{const t=teamOf(p.team);
  return vtile(p.id,`<span class="vav">${p.photo?`<img src="${esc(p.photo)}" alt="" loading="lazy">`:faceSvg(p.name,t?t.name:"")}</span><b>${esc(p.name)}</b><small>${esc(t?t.name:"ไม่มีทีม")}${p.role?" · "+esc(p.role):""}</small>`,{href:playerUrl(p.id)})},
 staff:s=>{const t=teamOf(s.team);
  return vtile(s.id,`<span class="vav st">${SIL}</span><b>${esc(s.name)}</b><small>${esc(s.role||"-")} · ${esc(t?t.name:"ไม่มีทีม")}</small>`)},
 gear:g=>{const o=S.players.find(x=>x.id===g.owner),im=gimg(g),c=TC[g.type]||"#9a9aa2";
  return vtile(g.id,`${im?`<img class="vim" loading="lazy" decoding="async" src="${esc(im)}" alt="">`:`<span class="vem">${GI[g.type]||"🎮"}</span>`}<b>${esc(g.name)}</b><small><i class="sdot ${stCls(g.status)}"></i>${esc(g.brand||g.type)} · ${esc(o?o.name:"ไม่มีผู้ใช้")}</small>`,{style:`--c:${c}`,cls:"ct"})},
 lib:l=>{const n=libUsers(l).length;
  return vtile(l.id,`${(l.img||imgOf(l.name))?`<img class="vim" loading="lazy" decoding="async" src="${esc(l.img||imgOf(l.name))}" alt="" onerror="this.outerHTML='<span class=vem>${GI[l.type]||"🎮"}</span>'">`:`<span class="vem">${GI[l.type]||"🎮"}</span>`}<b>${esc(l.name)}</b><small>${esc(l.brand||"-")} · ${n} คน · ${libTeams(l).length} ทีม</small>`,{style:`--c:${TC[l.type]||"#9a9aa2"}`,cls:"ct",edit:false,del:false})},
 tours:t=>{const n=S.results.filter(r=>r.tour===t.id).length,up=t.start&&t.start>=today();
  return vtile(t.id,`<div class="vtour">${tLogoHtml(t.name,"vlg lgx")}<div><b>${esc(t.name)}</b><small>${fd(t.start)}${t.place?" · "+esc(t.place):""}${t.game?" · "+esc(t.game):""}</small>
   <span class="vrow"><span class="tag ${up?"ok":""}">${up?"กำลังจะมาถึง":"แข่งแล้ว"}</span><span class="tag">฿${Number(t.prize||0).toLocaleString("th-TH")}</span><span class="tag">${n} แมตช์</span></span></div></div>`,{left:true,del:!VCT_CHAMPS.some(c=>nrm(c[0])===nrm(t.name)),href:"/bracket?t="+encodeURIComponent(t.id)})},
 results:r=>{const A=nm("teams",r.a),B=nm("teams",r.b),w=r.sa>r.sb?1:r.sa<r.sb?2:0;
  return vtile(r.id,`<div class="vmr"><div class="vms ${w===1?"win":""}">${tLogoHtml(A,"vlg")}<span>${esc(A)}</span></div>
   <div class="vsc"><span class="${w===1?"w":""}">${r.sa}</span> : <span class="${w===2?"w":""}">${r.sb}</span></div>
   <div class="vms r ${w===2?"win":""}"><span>${esc(B)}</span>${tLogoHtml(B,"vlg")}</div></div><div class="vmeta">${fd(r.date)}${w===0?' · <b class="dr0">เสมอ</b>':""}</div>`,{left:true,del:!isRealTour(r.tour),edit:!isRealTour(r.tour)})}
};

/* จัดกลุ่มตามลีกของทีม (นักแข่ง / สตาฟฟ์ / อุปกรณ์) */
function byLeague(rows,teamFn,card,unit){
 return LG.map(L=>{
  const rs=rows.filter(r=>leagueOf(teamFn(r))===L.k).sort((a,b)=>String(teamFn(a)?.name||"~").localeCompare(String(teamFn(b)?.name||"~"))||String(a.name).localeCompare(String(b.name)));
  return rs.length?lsec(lgIcon(L),L.n,rs.length,unit,rs.map(card).join("")):"";
 }).join("");
}

function groups(k,rows){
 const adm=role==="admin",clean=!q;
 if(k==="teams")return teamsByLeague(rows,{showEmpty:adm&&clean,only:pl==="all"?null:pl});
 if(k==="players")return byLeague(rows,p=>teamOf(p.team),cards.players,"คน");
 if(k==="staff")return byLeague(rows,s=>teamOf(s.team),cards.staff,"คน");
 if(k==="gear")return byLeague(rows,ownerTeam,cards.gear,"ชิ้น");
 if(k==="lib")return Object.keys(TC).map(ty=>{const rs=rows.filter(l=>(TC[l.type]?l.type:"อื่น ๆ")===ty);
  if(!rs.length&&!(adm&&clean))return"";
  return lsec(circIcon(TC[ty],GI[ty]||"🎮"),ty,rs.length,"รุ่น",rs.map(cards.lib).join(""),{})}).join("");
 if(k==="tours"){const n=today(),up=rows.filter(t=>t.start&&t.start>=n).sort((a,b)=>a.start.localeCompare(b.start)),past=rows.filter(t=>!(t.start&&t.start>=n)).sort((a,b)=>String(b.start).localeCompare(String(a.start)));
  return[["กำลังจะมาถึง","#3ddc97","🗓️",up],["แข่งไปแล้ว","#8b8b93","🏁",past]].map(([l,c,e,rs])=>rs.length?lsec(circIcon(c,e),l,rs.length,"รายการ",rs.map(cards.tours).join(""),{wide:true}):"").join("")}
 if(k==="results"){const T=[...S.tours].sort((a,b)=>String(b.start).localeCompare(String(a.start)));
  const g=[...T.map(t=>[t.id,t.name]),["","ไม่ระบุรายการ"]];
  return g.map(([id,name])=>{const rs=rows.filter(r=>(T.some(t=>t.id===r.tour)?r.tour:"")===id).sort((a,b)=>b.date.localeCompare(a.date));
   if(!rs.length)return"";
   return lsec(circIcon("#f2b705","🏆"),name,rs.length,"แมตช์",rs.map(cards.results).join(""),{wide:true,add:isRealTour(id)?"":addTile("บันทึกผล",{tour:id})})}).join("")}
 return"";
}

function summary(k){
 const b=v=>`<b>${v}</b>`,S_=S;
 if(k==="teams")return`${b(S_.teams.length)} ทีม // ${b(new Set(S_.teams.map(leagueOf).filter(Boolean)).size)} พื้นที่ // ${b(1)} ภารกิจ: แข่งขันในระดับสูงสุด`;
 if(k==="players")return`${b(S_.players.length)} คน // ${b(new Set(S_.players.map(p=>p.team).filter(Boolean)).size)} ทีม`;
 if(k==="staff")return`${b(S_.staff.length)} คน // ${b(new Set(S_.staff.map(p=>p.team).filter(Boolean)).size)} ทีม`;
 if(k==="gear")return`${b(S_.gear.length)} ชิ้น // พร้อมใช้ ${b(S_.gear.filter(g=>g.status==="พร้อมใช้").length)} // ส่งซ่อม ${b(S_.gear.filter(g=>g.status==="ส่งซ่อม").length)}`;
 if(k==="lib")return`${b(S_.lib.length)} รุ่น // ${b(new Set(S_.lib.map(l=>l.type)).size)} ประเภท`;
 if(k==="tours")return`${b(S_.tours.length)} รายการ // เงินรางวัลรวม ${b("฿"+S_.tours.reduce((a,t)=>a+Number(t.prize||0),0).toLocaleString("th-TH"))}`;
 if(k==="results"){const pl=playedResults().length,up=S_.results.length-pl;return`${b(pl)} แมตช์ที่แข่งแล้ว${up?` // ${b(up)} แมตช์ที่ยังไม่ถึงวันแข่ง`:""} // ${b(S_.tours.length)} รายการ`}
 return"";
}


/* นักแข่งชุดปี 2026 ของแต่ละทีม — ตำแหน่งอิงตัวละครที่เล่นมากที่สุดใน VCT 2026 Stage 2 จาก vlr.gg; [ชื่อในเกม, บทบาท] — ใช้กับปุ่ม "เพิ่มนักแข่งตามรายชื่อ" ในหน้านักแข่ง */
const VCT_PLAYERS={
 "100 Thieves":[["vora","Initiator · IGL"],["Asuna","Duelist"],["Cryocells","Sentinel"],["bang","Controller"],["Timotino","Duelist"]],
 "G2 Esports":[["valyn","Controller · IGL"],["jawgemo","Duelist"],["trent","Initiator"],["leaf","Controller"],["babybay","Sentinel"]],
 "LOUD":[["pANcada","Controller"],["cauanzin","Initiator"],["lukxo","Sentinel"],["Darker","Controller"],["Virtyy","Duelist"],["erde","Controller"]],
 "NRG":[["Ethan","Initiator · IGL"],["keiko","Duelist"],["mada","Duelist"],["skuba","Controller"],["brawk","Initiator"]],
 "Sentinels":[["johnqt","Controller"],["Reduxx","Controller"],["cortezia","Controller"],["JonahP","Initiator"],["Jerrwin","Duelist"]],
 "EDWARD Gaming":[["nobody","Initiator · IGL"],["ZmjjKK","Duelist"],["CHICHOO","Sentinel"],["cb",""],["Smoggy","Controller"],["Jieni7","Initiator"]],
 "TYLOO GAMING":[["sword9","IGL"],["slowly","Duelist"],["splash","Duelist"],["Scales","Sentinel"],["Erv","Controller"]],
 "Weibo Gaming":[["Satoshi","Duelist"],["chenze","Duelist"],["XiaoFei","Controller"],["mindfreak","Controller"],["Panda","Controller"],["Yoyo","Initiator"],["AcMe","Sentinel"]],
 "Xi Lai Gaming":[["WsLeo","Initiator · IGL"],["Lysoar","Controller"],["NoMan","Duelist"],["Rarga","Duelist"],["happywei","Controller"]],
 "FNATIC":[["Boaster","Controller · IGL"],["Alfajer","Duelist"],["kaajak","Duelist"],["crashies","Initiator"],["Veqaj","Flex"]],
 "FUT Esports":[["MrFaliN",""],["yetujey","Sentinel"],["KROSTALY","Initiator"],["xeus","Duelist"],["baha",""]],
 "Gentle Mates":[["starxo","Initiator"],["Minny","Duelist"],["bipo","Sentinel"],["GLYPH",""],["marteen","Duelist"]],
 "Karmine Corp":[["sheydos",""],["dos9","Controller"],["SUYGETSU","Controller"],["LewN","Duelist"],["avez","Initiator"]],
 "Team Heretics":[["Boo","Controller"],["benjyfishy","Sentinel"],["RieNs","Initiator"],["Wo0t","Sentinel"],["ComeBack",""]],
 "Team Vitality":[["Jamppi","Duelist"],["Derke","Duelist"],["Sayonara","Initiator"],["Chronicle","Sentinel"],["PROFEK","Controller"]],
 "FULL SENSE":[["Primmie","Duelist"],["JitboyS","Duelist"],["killua","Initiator"],["crws","Controller"],["Leviathan",""]],
 "Gen.G":[["Lakia","Initiator · IGL"],["ZynX",""],["t3xture","Sentinel"],["Karon","Controller"],["Ash","Duelist"]],
 "Paper Rex":[["f0rsakeN","Controller"],["invy","Initiator"],["d4v41","Controller"],["Jinggg","Duelist"],["something","Duelist"]],
 "Rex Regum Qeon":[["crazyguy","Initiator"],["Kushy","Duelist"],["Monyet","Controller"],["xffero","Sentinel"],["Jemkin","Duelist"]],
 "T1":[["Munchkin","Controller"],["carpe",""],["iZu","Initiator"],["Meteor","Duelist"],["stax","Controller"],["BuZz","Duelist"]],
 "ZETA DIVISION":[["SugarZ3ro","Controller"],["Xdll","Sentinel"],["eKo","Duelist"],["SyouTa","Sentinel"],["Absol","Duelist"]]
};
/* สถิติ VCT 2026 Stage 2 จาก vlr.gg: จำนวนแมป, Kill, Death รวมของนักแข่ง แบ่งตาม % การเลือกตัวละคร (เป็นค่าประมาณ)
   [ตัวละคร, เกม, Kill, Death] — ไม่มีข้อมูลจำนวนชนะ จึงแสดงเป็น — */
const VCT_STATS={"marteen":[["Phoenix",12,228,186],["Raze",3,58,47],["Yoru",1,18,15]],"starxo":[["Sova",9,118,134],["Fade",7,92,105]],"Minny":[["Neon",10,149,169],["Jett",4,59,67],["Waylay",1,14,16]],"bipo":[["Cypher",10,123,148],["Viper",2,25,30]],"avez":[["Fade",13,203,170],["Sova",8,125,104]],"LewN":[["Neon",20,374,300],["Raze",1,20,16]],"dos9":[["Omen",20,288,264],["Harbor",1,15,14]],"SUYGETSU":[["Viper",13,167,179],["Cypher",7,89,95],["Astra",1,13,14]],"Alfajer":[["Neon",6,111,101],["Chamber",5,94,85],["Cypher",3,57,52]],"crashies":[["Fade",8,112,114],["Viper",4,56,57],["Cypher",3,43,44]],"kaajak":[["Neon",6,97,101],["Yoru",5,82,85],["Raze",3,50,52]],"Boaster":[["Omen",15,164,233],["Astra",2,22,31],["Harbor",1,12,17]],"yetujey":[["Cypher",12,180,165],["Viper",10,151,138],["Astra",2,29,26]],"KROSTALY":[["Sova",13,179,181],["Skye",11,153,155],["Fade",3,41,42]],"xeus":[["Waylay",12,176,194],["Raze",10,148,163],["Phoenix",4,60,66]],"Wo0t":[["Chamber",6,101,85],["Jett",4,67,57],["Yoru",3,52,44]],"RieNs":[["Sova",10,150,140],["Fade",5,75,70],["Viper",3,45,42]],"Boo":[["Omen",11,150,149],["Astra",3,42,42],["Fade",3,42,42]],"benjyfishy":[["Cypher",9,122,126],["Vyse",7,95,98],["Sage",2,27,28]],"Sayonara":[["Sova",10,166,127],["Fade",7,116,88],["Viper",2,34,26]],"Chronicle":[["Chamber",6,104,83],["Vyse",6,104,83],["Viper",6,104,83]],"Derke":[["Jett",7,113,111],["Neon",7,113,111],["Raze",2,34,33]],"Jamppi":[["Phoenix",13,205,206],["Yoru",2,33,33],["Fade",2,33,33]],"PROFEK":[["Omen",12,158,169],["Astra",4,53,56],["Harbor",3,40,43]],"Asuna":[["Phoenix",20,355,292],["Omen",1,19,15]],"bang":[["Omen",13,183,175],["Harbor",7,97,93],["Viper",1,15,14]],"Cryocells":[["Cypher",16,241,207],["Viper",3,44,38],["Chamber",2,32,27]],"vora":[["Sova",12,170,156],["Fade",8,113,104],["Skye",1,15,14]],"Timotino":[["Neon",17,280,250],["Jett",4,66,59]],"trent":[["Sova",13,194,172],["Skye",12,180,160],["Fade",5,77,68]],"babybay":[["Chamber",19,290,269],["Vyse",6,92,85],["Waylay",3,46,43]],"leaf":[["Viper",16,245,227],["Sage",5,79,73],["Yoru",3,46,43]],"valyn":[["Omen",17,246,255],["Harbor",7,99,103],["Astra",6,86,89]],"jawgemo":[["Neon",21,306,340],["Raze",4,57,63],["Phoenix",2,31,34]],"lukxo":[["Chamber",23,423,323],["Yoru",4,74,57],["Viper",2,34,26]],"erde":[["Omen",14,205,191],["Sage",13,191,178],["Astra",3,46,42]],"Darker":[["Omen",14,189,206],["Phoenix",5,67,73],["Viper",5,67,73]],"brawk":[["Sova",19,286,251],["Vyse",3,46,41]],"skuba":[["Viper",9,125,116],["Cypher",6,82,76],["Omen",6,82,76]],"keiko":[["Jett",8,122,111],["Chamber",5,78,71],["Omen",4,61,56]],"mada":[["Neon",11,170,162],["Phoenix",4,61,58],["Harbor",4,61,58]],"Ethan":[["KAY/O",11,144,154],["Phoenix",4,52,55],["Omen",3,40,43]],"johnqt":[["Harbor",6,89,78],["Omen",3,46,40],["Phoenix",3,46,40]],"cortezia":[["Viper",6,88,82],["Vyse",6,88,82],["Cypher",5,74,68]],"JonahP":[["Sova",10,126,146],["Fade",9,113,131],["Skye",1,13,15]],"Jerrwin":[["Waylay",9,129,147],["Neon",8,115,130],["Raze",3,43,49]],"Reduxx":[["Omen",10,150,154],["Phoenix",9,135,138],["Jett",1,15,15]],"slowly":[["Waylay",8,153,118],["Jett",7,131,101],["Chamber",6,114,88]],"splash":[["Raze",9,163,136],["Neon",8,146,122],["Phoenix",7,125,104]],"CHICHOO":[["Cypher",12,197,170],["Viper",8,129,111],["Phoenix",1,18,15]],"Erv":[["Omen",22,301,293],["KAY/O",3,41,40],["Waylay",3,41,40]],"Lysoar":[["Omen",15,232,212],["Harbor",4,61,55],["Vyse",4,61,55]],"Scales":[["Cypher",11,165,155],["Viper",9,134,126],["Sage",6,89,84]],"happywei":[["Viper",9,125,129],["Omen",8,112,116],["Cypher",6,83,86]],"WsLeo":[["Fade",12,170,166],["Sova",7,98,96],["Skye",4,55,54]],"nobody":[["Sova",17,253,237],["Skye",3,46,43],["Fade",2,30,28]],"Rarga":[["Neon",5,81,76],["Phoenix",5,81,76],["Jett",4,62,58]],"ZmjjKK":[["Jett",12,220,196],["Neon",7,128,114],["Chamber",1,20,18]],"Smoggy":[["Omen",10,130,159],["Harbor",4,52,64],["Raze",3,40,49]],"NoMan":[["Waylay",7,91,103],["Raze",5,66,75],["Jett",4,52,59]],"Jieni7":[["KAY/O",13,176,186],["Omen",7,95,101],["Vyse",1,15,16]],"Primmie":[["Jett",6,103,84],["Waylay",6,103,84],["Deadlock",5,87,71]],"JitboyS":[["Neon",10,151,154],["Raze",8,119,121],["Phoenix",4,61,62]],"Monyet":[["Omen",12,193,176],["Astra",4,64,59],["Harbor",2,34,31]],"something":[["Yoru",9,158,131],["Sage",2,35,29],["Viper",2,35,29]],"iZu":[["Sova",13,200,175],["Fade",7,108,95],["Neon",6,92,80]],"t3xture":[["Chamber",12,219,184],["Raze",5,90,76],["Phoenix",1,17,15]],"stax":[["Omen",16,222,201],["Harbor",2,28,25]],"BuZz":[["Neon",11,191,168],["Phoenix",5,88,78],["Raze",4,70,61]],"d4v41":[["Viper",9,150,131],["Chamber",3,51,45],["Sage",2,33,29]],"Meteor":[["Yoru",12,203,178],["Chamber",11,189,166],["Jett",4,69,61]],"Karon":[["Omen",15,232,222],["Astra",3,47,45],["Harbor",1,15,14]],"eKo":[["Yoru",5,77,80],["Fade",4,61,64],["Sova",3,46,48]],"invy":[["Sova",10,150,147],["Fade",6,88,86],["Harbor",1,16,16]],"killua":[["Skye",8,111,113],["Sova",8,111,113],["Fade",7,97,99]],"crazyguy":[["Sova",15,214,227],["Fade",3,43,46],["Sage",1,14,14]],"Jemkin":[["Yoru",5,75,73],["Waylay",4,61,59],["Chamber",4,61,59]],"xffero":[["Cypher",12,171,169],["Sage",4,57,56],["Veto",1,14,13]],"Munchkin":[["Viper",8,110,113],["Cypher",6,81,83],["Sova",5,70,72]],"f0rsakeN":[["Omen",11,179,184],["Harbor",3,50,51]],"SyouTa":[["Cypher",12,188,197],["Viper",7,110,115],["Vyse",1,16,16]],"Absol":[["Neon",18,290,307],["Waylay",1,16,17],["Yoru",1,16,17]],"crws":[["Omen",9,97,124],["Astra",9,97,124],["Harbor",2,20,26]],"Ash":[["Neon",19,322,329]],"Jinggg":[["Raze",8,127,139],["Harbor",3,49,54],["Waylay",3,49,54]],"Xdll":[["Sage",9,125,139],["Sova",7,97,108],["Skye",3,42,46]],"pANcada":[["Omen",7,93,68],["Harbor",3,59,47],["Clove",1,21,7]],"cauanzin":[["Sova",19,265,292],["Fade",11,123,161],["Skye",3,22,40]],"Virtyy":[["Jett",19,289,279],["Raze",8,122,111],["Neon",5,82,67]],"cb":[["Sova",13,177,187],["Fade",6,86,87],["Skye",3,40,43]],"sword9":[["Sova",18,272,257],["Fade",8,120,115],["Skye",4,55,55]],"Satoshi":[["Jett",12,207,173],["Raze",5,74,67],["Neon",3,50,44]],"chenze":[["Jett",12,192,178],["Raze",5,78,70],["Neon",3,51,44]],"XiaoFei":[["Omen",12,151,160],["Viper",5,64,71],["Astra",3,39,40]],"mindfreak":[["Omen",12,164,163],["Viper",5,69,69],["Astra",3,41,40]],"Panda":[["Omen",12,167,171],["Viper",5,67,68],["Astra",3,39,42]],"Yoyo":[["Sova",12,165,163],["Fade",5,74,71],["Skye",3,43,43]],"AcMe":[["Cypher",12,160,158],["Killjoy",5,64,68],["Vyse",3,44,43]],"Veqaj":[["Viper",11,151,163],["Breach",4,54,54],["Jett",3,44,42]],"MrFaliN":[["Omen",16,201,213],["Viper",7,102,97],["Astra",4,57,56]],"baha":[["Omen",16,222,215],["Viper",7,102,100],["Astra",4,53,59]],"GLYPH":[["Omen",10,138,147],["Viper",4,51,57],["Astra",3,37,43]],"sheydos":[["Cypher",13,197,178],["Killjoy",5,74,71],["Vyse",3,44,45]],"ComeBack":[["Jett",11,176,163],["Raze",4,65,58],["Neon",3,47,42]],"Leviathan":[["Cypher",14,196,196],["Killjoy",6,84,82],["Vyse",4,52,59]],"Lakia":[["Sova",187,2779,2430],["Fade",77,1047,1088],["Skye",60,799,860]],"ZynX":[["Sova",11,151,146],["Fade",5,64,74],["Skye",3,43,41]],"Kushy":[["Jett",11,165,154],["Raze",5,76,74],["Neon",3,49,40]],"carpe":[["Cypher",17,221,233],["Killjoy",7,93,93],["Vyse",4,57,56]],"SugarZ3ro":[["Omen",12,168,170],["Viper",5,66,69],["Astra",3,39,43]]};
/* ผลแมปของทีมใน VCT 2026 Stage 2 [ชนะ, แข่งทั้งหมด] จากผลการแข่งบน thespike.gg — ใช้ประมาณจำนวนชนะของนักแข่งแต่ละตัวละคร */
const TEAM_MAPS={"100 Thieves":[15,21],"G2 Esports":[18,30],"LOUD":[18,31],"NRG":[14,22],"Sentinels":[9,20],"FNATIC":[7,18],"FUT Esports":[15,27],"Gentle Mates":[6,17],"Karmine Corp":[16,21],"Team Heretics":[9,18],"Team Vitality":[10,19],"FULL SENSE":[9,24],"Gen.G":[11,19],"Paper Rex":[10,18],"Rex Regum Qeon":[7,19],"T1":[18,28],"ZETA DIVISION":[8,20],"EDWARD Gaming":[12,22],"TYLOO GAMING":[21,30],"Xi Lai Gaming":[14,24]};
const teamOfRoster=n=>Object.keys(VCT_PLAYERS).find(t=>VCT_PLAYERS[t].some(([x])=>norm(x)===norm(n)));
const statsFor=n=>{const k=Object.keys(VCT_STATS).find(x=>norm(x)===norm(n));if(!k)return[];const tm=TEAM_MAPS[teamOfRoster(n)],r=tm?tm[0]/tm[1]:null;
 return VCT_STATS[k].map(([a,g,kk,d])=>({n:a,g,w:r==null?null:Math.min(g,Math.round(g*r)),k:kk,d}))};
/* นักแข่งในรายชื่อที่ยังไม่มีในระบบ (เฉพาะทีมที่เพิ่มไว้แล้ว) */
const missingPlayers=()=>{const out=[];for(const[tn,ps]of Object.entries(VCT_PLAYERS)){const t=S.teams.find(x=>norm(x.name)===norm(tn));if(!t)continue;
 for(const[n,r]of ps)if(!S.players.some(p=>p.team===t.id&&norm(p.name)===norm(n)))out.push({name:n,role:r,team:t.id})}return out};
async function seedTeamPlayers(btn,tid){
 if(role!=="admin"||saving)return;
 const t=S.teams.find(x=>x.id===tid);if(!t)return;
 const have=new Set(S.players.filter(p=>S.teams.some(x=>x.id===p.team&&norm(x.name)===norm(t.name))).map(p=>norm(p.name)));
 const miss=rosterOf(tid).filter(([n])=>!have.has(norm(n)));if(!miss.length)return;
 btn.disabled=true;let i=0;
 for(const[n,r]of miss){
  btn.textContent=`กำลังเพิ่ม ${++i}/${miss.length}…`;
  const error=await saveRecord("players",{name:n,team:tid,role:r,agents:statsFor(n).map(a=>({...a,w:a.w??0}))});
  if(error){render();return showError(error)}
 }
 render();
}
async function seedPlayers(btn){
 if(role!=="admin"||saving)return;
 const miss=missingPlayers();if(!miss.length)return;
 if(!confirm(`เพิ่มนักแข่ง ${miss.length} คนตามรายชื่อปี 2026 ใช่ไหม?`))return;
 btn.disabled=true;let i=0;
 for(const p of miss){
  btn.textContent=`กำลังเพิ่ม ${++i}/${miss.length}…`;
  const error=await saveRecord("players",{...p,agents:statsFor(p.name).map(a=>({...a,w:a.w??0}))});
  if(error){render();return showError(error)}
 }
 render();
}

/* แบนเนอร์หัวหน้าทีม + ปุ่มเพิ่มทีมพาร์ทเนอร์สำหรับแอดมิน */
function teamBanner(){
 const adm=role==="admin",n=S.teams.length,miss=missingVct();
 if(!n&&!adm)return"";
 const lg=new Set(S.teams.map(leagueOf).filter(Boolean)).size;
 const pts=n?[`${lg} ลีกทั่วโลก`,`${S.players.length} นักแข่งในระบบ`,`${S.results.length} แมตช์ที่บันทึกไว้`]:["4 ลีก: Americas · CN · EMEA · Pacific","เติมลีกและเกมให้อัตโนมัติ","แก้ไขหรือลบภายหลังได้"];
 const seed=adm&&miss.length?`<button type="button" class="btn" id="seed">${n?`เพิ่มทีมพาร์ทเนอร์ที่ยังขาด (${miss.length})`:`เพิ่มทีมพาร์ทเนอร์ VCT ทั้ง ${miss.length} ทีม`}</button>`:"";
 return`<div class="tban"><div><span class="tbt">VALORANT Champions Tour</span><h3>${n?"ทีมพาร์ทเนอร์ทั้ง 4 ลีก":"เริ่มต้นด้วยทีมพาร์ทเนอร์ VCT"}</h3><p>${n?"กดที่ทีมเพื่อดูสถิติและเปรียบเทียบกับทีมอื่น":"ยังไม่มีทีมในระบบ เพิ่มทีมพาร์ทเนอร์ทั้งหมดได้ในคลิกเดียว หรือกด “+ เพิ่มทีม” ในกล่องลีกเพื่อเพิ่มทีละทีม"}</p><ul>${pts.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>${seed}</div>`;
}
async function seedTeams(btn){
 if(role!=="admin"||saving)return;
 const miss=missingVct();if(!miss.length)return;
 if(!confirm(`เพิ่มทีมพาร์ทเนอร์ VCT ${miss.length} ทีมใช่ไหม?`))return;
 btn.disabled=true;let i=0;
 for(const[name,lg]of miss){
  btn.textContent=`กำลังเพิ่ม ${++i}/${miss.length}…`;
  const error=await saveRecord("teams",{name,region:"VCT "+lg});
  if(error){render();return showError(error)}
 }
 render();
}

/* ---------- หน้ารายละเอียดทีม (/teams?id=...) แบบหน้าทีมของ valorantesports.com ---------- */
const TID=QS.get("id")||"";
function pSum(p){const A=[...agentsWithResults(p)].sort((a,b)=>b.g-a.g),noW=A.every(a=>!a.w),g=A.reduce((s,a)=>s+a.g,0),w=A.reduce((s,a)=>s+(a.w||0),0),k=A.reduce((s,a)=>s+a.k,0),d=A.reduce((s,a)=>s+a.d,0);
 return{A,g,w:noW?null:w,k,d,main:A[0]?A[0].n:"—",wr:noW||!g?null:Math.round(w/g*1000)/10,kd:d?(k/d).toFixed(2):"—"}}
function teamDetail(t){
 document.title=t.name+" · E-Sports Team Manager";
 const L=LG.find(x=>x.k===leagueOf(t))||LG[LG.length-1];
 const st=standings(),me=st.find(x=>x.id===t.id)||{p:0,w:0,l:0,d:0,f:[]},act=st.filter(x=>x.p>0),rank=me.p?act.findIndex(x=>x.id===t.id)+1:0;
 const ms=S.results.filter(r=>r.a===t.id||r.b===t.id).sort((a,b)=>b.date.localeCompare(a.date));
 const res=ms.slice(0,5).map(r=>{const home=r.a===t.id,op=nm("teams",home?r.b:r.a),x=home?r.sa:r.sb,y=home?r.sb:r.sa,wl=x>y?"W":x<y?"L":"D";
  return`<div class="tdr"><span class="tdwl ${wl}">${wl==="W"?"ชนะ":wl==="L"?"แพ้":"เสมอ"}</span><span class="tdop">${tLogoHtml(op,"t-logo sm")}<b>${esc(op)}</b></span><b class="tdsc">${x} : ${y}</b><small>${esc(nm("tours",r.tour))} · ${fd(r.date)}</small></div>`}).join("");
 const ev=S.tours.filter(tr=>ms.some(r=>r.tour===tr.id)).sort((a,b)=>String(b.start).localeCompare(String(a.start))).map(tr=>{const m=ms.filter(r=>r.tour===tr.id);let w=0,l=0;m.forEach(r=>{const x=r.a===t.id?r.sa:r.sb,y=r.a===t.id?r.sb:r.sa;if(x>y)w++;else if(x<y)l++});
  return`<a class="tdev" href="/bracket?t=${encodeURIComponent(tr.id)}">${circIcon("#f2b705","🏆")}<span><b>${esc(tr.name)}</b><small>${fd(tr.start)}${tourPlace(tr,t.name)==="champ"?" · 🏆 แชมป์":tourPlace(tr,t.name)==="runner"?" · 🥈 รองแชมป์":""}</small></span><b>${w}-${l}</b></a>`}).join("");
 const sameTeam=new Set(S.teams.filter(x=>norm(x.name)===norm(t.name)).map(x=>x.id));sameTeam.add(t.id);
 const dbp=S.players.filter(p=>sameTeam.has(p.team));
 /* นักแข่งในรายชื่อที่ยังไม่มีในระบบ แสดงให้อัตโนมัติจากข้อมูลในตัว */
 const ps=[...dbp,...rosterOf(t.id).filter(([n])=>!dbp.some(p=>norm(p.name)===norm(n))).map(([n,r])=>({id:"",name:n,role:r,team:t.id,agents:statsFor(n)}))];
 const roster=ps.map(p=>{const x=pSum(p),tag=p.id?`a class="tdp" href="${playerUrl(p.id)}"`:'div class="tdp"';return`<${tag}><span class="tdpi">${p.photo?`<img src="${esc(p.photo)}" alt="">`:faceSvg(p.name,t.name)}</span><b>${esc(p.name)}</b><small>${esc(p.role||"")}</small><span class="tdpst"><i><b>${esc(x.main)}</b>ตัวหลัก</i><i><b>${x.g}</b>เกม</i><i><b>${x.wr==null?"—":x.wr+"%"}</b>ชนะ</i><i><b>${x.kd}</b>K/D</i></span></${p.id?"a":"div"}>`}).join("");
 /* สถิติรวมของทีมจากนักแข่งทุกคน */
 const AG={};let tg=0,tw=0,tk=0,td=0,hasW=false;ps.forEach(p=>{const x=pSum(p);tg+=x.g;tk+=x.k;td+=x.d;if(x.w!=null){tw+=x.w;hasW=true}x.A.forEach(a=>{AG[a.n]=(AG[a.n]||0)+a.g})});
 const agl=Object.entries(AG).sort((a,b)=>b[1]-a[1]),pct=v=>tg?Math.round(v/tg*1000)/10:0;
 const tstat=tg?`<div class="stats"><div class="stat"><b>${agl[0]?esc(agl[0][0]):"—"}</b><span>ตัวละครที่ทีมเล่นมากสุด</span></div><div class="stat"><b>${tg}</b><span>เกมรวมของนักแข่ง</span></div><div class="stat"><b>${hasW&&tg?pct(tw)+"%":"—"}</b><span>อัตราชนะ</span></div><div class="stat"><b>${td?(tk/td).toFixed(2):"—"}</b><span>K/D รวม</span></div></div>`:"";
 const pick=agl.slice(0,10).map(([n,v])=>`<div class="hb"><span class="hl">${esc(n)}</span><div class="ht"><i style="width:${pct(v)}%;background:var(--gold)"></i></div><b>${pct(v)}%</b></div>`).join("");
 const table=ps.length?`<div class="wrap"><table><tr><th>นักแข่ง</th><th>ตำแหน่ง</th><th>ตัวหลัก</th><th>เกม</th><th>ชนะ</th><th>K/D</th><th>ตัวละครที่เล่น</th></tr>${ps.map(p=>{const x=pSum(p);return`<tr><td>${p.id?`<a class="pl" href="${playerUrl(p.id)}"><b>${esc(p.name)}</b></a>`:`<b>${esc(p.name)}</b>`}</td><td>${esc(p.role||"—")}</td><td>${esc(x.main)}</td><td>${x.g}</td><td class="${x.wr==null?"":x.wr>=50?"w":"l"}">${x.wr==null?"—":x.wr+"%"}</td><td class="num">${x.kd}</td><td><small>${x.A.map(a=>esc(a.n)+" "+(x.g?Math.round(a.g/x.g*100):0)+"%").join(" · ")||"—"}</small></td></tr>`}).join("")}</table></div>`:"";
 const sf=S.staff.filter(x=>x.team===t.id).map(x=>`<div class="tds"><span class="tdpi sm">${faceSvg(x.name,t.name)}</span><span><b>${esc(x.name)}</b><small>${esc(x.role||"สตาฟฟ์")}</small></span></div>`).join("");
 const gearBox=ps.map(p=>{const gs=p.id?S.gear.filter(g=>g.owner===p.id).map(g=>[g.type,g.name,gimg(g),g.id]):gearOf(p.name).map(([ty,n])=>[ty,n,imgOf(n),""]);
  if(!gs.length&&!(role==="admin"&&p.id))return"";
  const slots=Object.keys(TC).flatMap(ty=>{const m=gs.filter(x=>x[0]===ty);return m.length?m:[[ty,"","",null]]}).concat(gs.filter(x=>!TC[x[0]]));
  const cell=([ty,n,u,gid])=>{
   if(gid===null)return role==="admin"&&p.id?`<div class="tdgi add"><span class="tdgim">🎲</span><small style="color:${TC[ty]}">${esc(ty)}</small><b>กำลังสุ่ม…</b></div>`:`<div class="tdgi none"><span class="tdgim">${GI[ty]||"🎮"}</span><small style="color:${TC[ty]}">${esc(ty)}</small><b>ไม่มีข้อมูล</b></div>`;
   const ed=role==="admin"&&gid;
   return`<${ed?`button type="button" class="tdgi" data-gch="${esc(gid)}" title="กดเพื่อเปลี่ยน ${esc(n)}"`:`div class="tdgi" title="${esc(n)}"`}><span class="tdgim">${u?`<img src="${esc(u)}" alt="" loading="lazy" onerror="this.outerHTML='${GI[ty]||"🎮"}'">`:(GI[ty]||"🎮")}</span><small style="color:${TC[ty]||"#9a9aa2"}">${esc(ty)}</small><b>${esc(n)}</b></${ed?"button":"div"}>`};
  const tl="";if(role==="admin"&&p.id&&slots.some(x=>x[3]===null))AUTO_GEAR.add(t.id);
  return`<div class="tdgr"><div class="tdgp"><span class="tdpi sm">${faceSvg(p.name,t.name)}</span><span><b>${esc(p.name)}</b>${tl}</span></div><div class="tdgl">${slots.map(cell).join("")}</div></div>`}).join("");
 const box=(h,b,empty)=>`<section class="tdbox"><h3>${h}</h3>${b||`<p class="lnone">${empty}</p>`}</section>`;
 /* ผลตามรายการของทีมนี้ (รายการใหม่สุดก่อน) */
 const PB={champ:'<span class="tdpb g">🏆 แชมป์</span>',runner:'<span class="tdpb s">🥈 รองแชมป์</span>'};
 const byTour=S.tours.filter(tr=>ms.some(r=>r.tour===tr.id)).sort((a,b)=>String(b.start).localeCompare(String(a.start))).map(tr=>{
  const m=ms.filter(r=>r.tour===tr.id);let w=0,l=0,d=0;
  const rows=m.map(r=>{const home=r.a===t.id,op=nm("teams",home?r.b:r.a),x=home?r.sa:r.sb,y=home?r.sb:r.sa,wl=x>y?"W":x<y?"L":"D";if(wl==="W")w++;else if(wl==="L")l++;else d++;
   return`<div class="tbr"><span class="tdwl ${wl}">${wl==="W"?"ชนะ":wl==="L"?"แพ้":"เสมอ"}</span><span class="tbo">${tLogoHtml(op,"t-logo sm")}<b>${esc(op)}</b></span><b class="tbs">${x} : ${y}</b><small>${fd(r.date)}</small></div>`}).join("");
  const pl=tourPlace(tr,t.name);
  return`<div class="trx${pl?" "+pl:""}"><a class="tbh" href="/bracket?t=${encodeURIComponent(tr.id)}">${circIcon(pl==="runner"?"#c0c6d0":"#f2b705",pl==="runner"?"🥈":"🏆")}<span><b>${esc(tr.name)}</b><small>${fd(tr.start)}${tr.place?" · "+esc(tr.place):""}</small></span>${pl?PB[pl]:""}<em>${w}-${l}${d?"-"+d:""}</em></a><div class="tbl">${rows}</div></div>`}).join("");
 const TB_CSS=`<style>.tbw{display:flex;flex-direction:column;gap:12px;width:100%}.tbw .trx{display:block;width:auto;max-width:none;background:#121214;color:inherit;border:1px solid rgba(255,255,255,.08);border-radius:10px;margin:0;padding:0;overflow:hidden}.tbw .trx.champ{border:2px solid #f2b705;box-shadow:0 0 18px rgba(242,183,5,.18)}.tbw .trx.runner{border:2px solid #c0c6d0}
 .tbh{display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(255,255,255,.03);color:inherit;text-decoration:none}.tbh:hover{background:rgba(255,255,255,.06)}.tbh span{display:flex;flex-direction:column;min-width:0}.tbh small{color:var(--mute,#a1a1aa);font-size:12px}.tbh em{margin-left:auto;font-style:normal;font-weight:800}
 .trx.champ .tbh{background:linear-gradient(90deg,rgba(242,183,5,.18),rgba(242,183,5,.03))}.trx.runner .tbh{background:linear-gradient(90deg,rgba(192,198,208,.14),rgba(192,198,208,.02))}
 .tdpb{font-size:11px;font-weight:800;border-radius:999px;padding:2px 10px;white-space:nowrap}.tdpb.g{background:#f2b705;color:#111}.tdpb.s{background:#c0c6d0;color:#111}
 .tbr{display:grid;grid-template-columns:auto 1fr auto auto;gap:12px;align-items:center;padding:8px 14px;border-top:1px solid rgba(255,255,255,.05)}.tbo{display:flex;align-items:center;gap:8px;min-width:0}.tbo b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tbr small{color:var(--mute,#a1a1aa);font-size:12px}.tbs{font-variant-numeric:tabular-nums}.tbr .tdwl{min-width:44px;text-align:center;box-sizing:border-box}
 @media(max-width:600px){.tbr{grid-template-columns:auto 1fr auto}.tbr small{display:none}}</style>`;
 return`<div class="tdtop"><a class="btn clr" href="/teams">← ทีมทั้งหมด</a><a class="btn g" href="/compare?a=${encodeURIComponent(t.id)}">เปรียบเทียบทีม</a></div>
 <header class="tdh" style="--lc:${L.c}"><span class="tdlogo">${tLogoHtml(t.name,"vlg")}</span><div><h1>${esc(t.name)}</h1><p class="tdlg">${lgIcon(L)}<span>${esc(L.n)}</span>${L.k?'<em>ทีมพาร์ทเนอร์ VCT</em>':""}</p></div>
  <div class="tdst"><div><b>${me.w}-${me.l}${me.d?"-"+me.d:""}</b><small>ชนะ-แพ้</small></div><div><b>${rank?"#"+rank:"—"}</b><small>อันดับ</small></div><div><b>${ps.length}</b><small>นักแข่ง</small></div></div></header>
 <div class="tdgrid">${box("ผลการแข่งล่าสุด",res,"ยังไม่มีผลการแข่ง")}${box("รายการแข่ง",ev,"ยังไม่มีรายการแข่ง")}</div>
 ${byTour?TB_CSS+box("ผลตามรายการ",`<div class="tbw">${byTour}</div>`,""):""}
 ${box("รายชื่อนักแข่ง",roster?`<div class="tdroster">${roster}</div>`:"","ยังไม่มีนักแข่ง")}
 ${tg?box("สถิติทีม",tstat+`<h3 class="tdsub">สัดส่วนการเลือกตัวละครของทีม</h3>${pick}`,""):""}
 ${gearBox?box(`Gear ของนักแข่ง`,gearBox,""):""}
 ${table?box("สถิตินักแข่งทั้งหมด",table,""):""}`;
}

function view(){
 if(tab==="teams"&&TID){const t=S.teams.find(x=>x.id===TID);if(t)return teamDetail(t);return'<div class="wrap"><div class="empty">ไม่พบทีมนี้ <a class="pl" href="/teams"><b>กลับไปหน้าทีม</b></a></div></div>'}
 const k=tab,e=E[k];let rows=S[k];
 if(q){const s=q.toLowerCase();rows=rows.filter(r=>e.cols.some(c=>{const v=c[2].startsWith("ref")?nm(c[2].split(":")[1],r[c[0]]):c[2]==="ag"?agStr(r[c[0]]):r[c[0]];return String(v??"").toLowerCase().includes(s)}))}
 if(k==="teams")rows=rows.filter(inLeague);
 if(k==="lib"&&LBR!=="all")rows=rows.filter(r=>brandKey(r)===LBR);
 if(k==="players"||k==="staff")rows=rows.filter(r=>tm(r.team));
 if(k==="gear")rows=rows.filter(r=>{const o=S.players.find(p=>p.id===r.owner);return((pl==="all"&&!pt)||(o&&tm(o.team)))&&(gt==="all"||r.type===gt)});
 const adm=role==="admin";
 const tools=`${k==="lib"?"":`<input id="q" type="search" placeholder="ค้นหา${e.t}" value="${esc(q)}" aria-label="ค้นหา">`}${adm?`${S[k].length&&k!=="lib"&&k!=="tours"?`<label class="sa"><input type="checkbox" id="ca"> เลือกทั้งหมด</label><button type="button" class="btn d bd" id="bd" disabled>ลบที่เลือก</button>`:""}${k==="players"&&missingPlayers().length?`<button type="button" class="btn g" id="seedp">เพิ่มนักแข่งตามรายชื่อ (${missingPlayers().length})</button>`:""}${(k==="teams"&&!missingVct().length)||k==="lib"?"":`<button type="button" class="btn" data-a="1">${e.add}</button>`}`:""}`;
 const body=groups(k,rows);
 return phero(k==="teams"?"ทีมพาร์ทเนอร์ VCT":e.t,summary(k),tools,k==="teams"?"vct":"")+(k==="teams"&&!q&&pl==="all"?teamBanner():"")+(["teams","players","staff","gear"].includes(k)?fbar(k):"")+(k==="lib"?brandBar():"")
  +(body||`<div class="wrap"><div class="empty">${q||pl!=="all"||pt||gt!=="all"?"ไม่พบรายการที่ค้นหา ลองใช้คำอื่นหรือเปลี่ยนตัวกรอง":`ยังไม่มี${e.t}${adm?` กด “${e.add}” เพื่อเริ่มต้น`:""}`}</div></div>`);
}

/* ---------- ลบ ---------- */
async function delMany(ids){
 if(role!=="admin"||saving||!ids.length)return;
 const linked=S.results.filter(r=>tab==="teams"?(ids.includes(r.a)||ids.includes(r.b)):tab==="tours"&&ids.includes(r.tour)).length;
 const np=tab==="teams"?S.players.filter(p=>ids.includes(p.team)).length:0;
 const impact=(linked?" ผลการแข่งขันที่เกี่ยวข้อง "+linked+" รายการจะถูกลบด้วย":"")+(np?" นักแข่งของทีม "+np+" คนจะถูกลบด้วย":"");
 if(!confirm("ลบ "+ids.length+" รายการใช่ไหม?"+impact))return;
 const error=await deleteRecords(tab,ids);
 if(error)return showError(error);
 render();
}

/* ---------- ฟอร์มเพิ่ม/แก้ไข ---------- */
/* ฟอร์มทีม: เลือกชื่อได้เฉพาะทีมในรายการ VCT_TEAMS, ลีกเติมให้อัตโนมัติ */
let FORM_ID=null,FORM_PRE={};
/* ใช้ใน common.js เพื่อซ่อนปุ่ม "+ เพิ่มทีม" ของลีกที่เพิ่มครบแล้ว */
function canAddTeam(region){return VCT_TEAMS.some(([n,lg])=>"VCT "+lg===region&&!S.teams.some(t=>norm(t.name)===norm(n)))}
function teamChoices(){
 const used=new Set(S.teams.filter(t=>t.id!==FORM_ID).map(t=>norm(t.name)));
 return VCT_TEAMS.filter(([n,lg])=>!used.has(norm(n))&&(!FORM_PRE.region||FORM_PRE.region==="VCT "+lg));
}
/* ตัวอย่างโลโก้ของทีมที่เลือก (ดึงจากรายการโลโก้ใน common.js อัตโนมัติ) */
/* โลโก้ของทีมที่เลือก (แสดงแค่รูป ไม่มีข้อความ) */
const logoPrev=n=>n?tLogoHtml(n,"flg"):"";
const LGS=["Americas","CN","EMEA","Pacific"];
/* ตัวเลือกทีมในลีกที่เลือก */
function teamOpts(lg,val){
 const ch=teamChoices().filter(x=>!lg||x[1]===lg);
 const cur=val&&!ch.some(([n])=>n===val)?`<option selected>${esc(val)}</option>`:"";
 return cur+(val?"":'<option value="">— เลือกทีม —</option>')+ch.map(([n])=>`<option ${n===val?"selected":""}>${esc(n)}</option>`).join("");
}
/* ---------- ฟอร์มนักแข่ง: เลือกทีม → เลือกนักแข่งจากรายชื่อ, ตำแหน่ง, ตารางสถิติตัวละคร ---------- */
const PROLES=["Duelist","Initiator","Controller","Sentinel","Flex","IGL","ตัวสำรอง"];
const AGENTS=Object.keys(ROLE);
const rosterOf=tid=>{const t=S.teams.find(x=>x.id===tid);if(!t)return[];const k=Object.keys(VCT_PLAYERS).find(n=>norm(n)===norm(t.name));return k?VCT_PLAYERS[k]:[]};
/* รายชื่อนักแข่งทั้งหมดทุกทีม จัดกลุ่มตามทีม (คนที่มีในระบบแล้วเลือกซ้ำไม่ได้) */
function playerOpts(_tid,val){
 const used=new Set(S.players.filter(p=>p.id!==FORM_ID).map(p=>p.team+"|"+norm(p.name)));
 let found=false;
 const groups=S.teams.map(t=>{const all=rosterOf(t.id);if(!all.length)return"";
  return`<optgroup label="${esc(t.name)}">${all.map(([n])=>{const u=used.has(t.id+"|"+norm(n)),sel=n===val;if(sel)found=true;return`<option value="${esc(n)}" data-team="${esc(t.id)}" ${sel?"selected":""} ${u?"disabled":""}>${esc(n)}${u?" (มีในระบบแล้ว)":""}</option>`}).join("")}</optgroup>`}).join("");
 return(val&&!found?`<option selected>${esc(val)}</option>`:"")+(val?"":'<option value="">— เลือกนักแข่ง —</option>')+groups;
}
/* รูปนักแข่งตามระบบ = รูปหน้าคนแบบวาด */
const avatarPrev=(name,tid)=>{if(!name)return"";const t=S.teams.find(x=>x.id===tid);return`<span class="fface">${faceSvg(name,t?t.name:"")}</span>`};
const agRow=(a={})=>`<div class="agr"><select class="ag-n" aria-label="ตัวละคร">${AGENTS.map(n=>`<option ${n===a.n?"selected":""}>${esc(n)}</option>`).join("")}</select>${["g","w","k","d"].map(k=>`<input class="ag-${k}" type="number" min="0" step="1" value="${a[k]??""}" placeholder="${k==="w"?"—":"0"}" aria-label="${{g:"เกมที่เล่น",w:"ชนะ",k:"Kill",d:"Death"}[k]}">`).join("")}<button type="button" class="agx" data-agdel="1" aria-label="ลบแถว">✕</button></div>`;
/* ตารางสถิติแบบอ่านอย่างเดียว (ระบบเติมให้อัตโนมัติจากข้อมูลจริง) */
const agView=list=>{const noW=list.every(a=>!a.w);return list.length?list.map(a=>`<div class="agr agv"><b>${esc(a.n)}</b><span>${a.g}</span><span>${noW||a.w==null?"—":a.w}</span><span>${a.k}</span><span>${a.d}</span></div>`).join(""):'<p class="agnone">ไม่มีข้อมูลสถิติของนักแข่งคนนี้</p>'};
function setStats(list){const w=document.getElementById("agrows"),h=document.getElementById("f_agents");if(w)w.innerHTML=agView(list);if(h)h.value=agStr(list)}
function syncAg(){if(!document.querySelector("#agrows .ag-n"))return;const h=document.getElementById("f_agents");if(!h)return;
 h.value=[...document.querySelectorAll("#agrows .agr")].map(r=>{const v=c=>Math.max(0,Math.floor(Number(r.querySelector(c).value)||0));const wv=r.querySelector(".ag-w").value.trim();return[r.querySelector(".ag-n").value,v(".ag-g"),wv===""?"-":v(".ag-w"),v(".ag-k"),v(".ag-d")].join(" ")}).join("; ")}
function field(c,val){const[k,l,ty]=c;
 if(tab==="teams"&&k==="region")return`<input id="f_region" type="hidden" value="${esc(val||"")}">`;
 if(tab==="teams"&&k==="name"){
  const m=VCT_TEAMS.find(([n])=>n===val),pre=(FORM_PRE.region||"").replace(/^VCT /,"");
  const lgs=LGS.filter(lg=>teamChoices().some(x=>x[1]===lg)||(m&&m[1]===lg));
  const sel=m?m[1]:lgs.includes(pre)?pre:lgs[0]||"";
  return`<label for="f_lg">ลีก</label><select id="f_lg">${lgs.map(lg=>`<option value="${lg}" ${lg===sel?"selected":""}>VCT ${lg}</option>`).join("")}</select>
  <label for="f_name">${l}</label><select id="f_name">${teamOpts(sel,val)}</select><div class="flogo" id="f_lgpv">${logoPrev(val)}</div>`;
 }
 if(tab==="players"){
  if(k==="team")return"";
  if(k==="name"){const tid=FORM_ID?(S.players.find(p=>p.id===FORM_ID)||{}).team||"":(FORM_PRE.team||"");
   return`<label for="f_team">ทีม <small style="color:#8b8b93">(ตามนักแข่งที่เลือก)</small></label><select id="f_team" disabled><option value="">— เลือกทีม —</option>${S.teams.map(t=>`<option value="${esc(t.id)}" ${t.id===tid?"selected":""}>${esc(t.name)}</option>`).join("")}</select>
   <label for="f_name">นักแข่ง</label><select id="f_name">${playerOpts(tid,val)}</select><label>รูปนักแข่ง</label><div class="flogo" id="f_ppv">${avatarPrev(val,tid)}</div>`}
  if(k==="role")return`<label for="f_role">ตำแหน่ง <small style="color:#8b8b93">(ตามข้อมูลจริง)</small></label><select id="f_role" disabled><option value="">— ไม่ระบุ —</option>${[...new Set([...PROLES,...(val&&!PROLES.includes(val)?[val]:[])])].map(r=>`<option ${r===val?"selected":""}>${esc(r)}</option>`).join("")}</select>`;
  if(k==="agents")return`<label>สถิติในการแข่งขัน</label><div class="agh agv"><span>ตัวละคร</span><span>เกมที่เล่น</span><span>ชนะ</span><span>Kill</span><span>Death</span></div><div id="agrows">${val&&val.length?agView(val):'<p class="agnone">เลือกนักแข่งแล้วสถิติจะขึ้นอัตโนมัติ</p>'}</div><input type="hidden" id="f_agents" value="${esc(agStr(val))}">`;
 }
 if(tab==="tours"){
  if(k==="name"){const cs=champChoices(val),isC=!val||cs.some(([n])=>nrm(n)===nrm(val));
   return`<label for="f_name">${l}</label><select id="f_name">${cs.length?`<optgroup label="VALORANT Champions">${cs.map(([n])=>`<option ${nrm(n)===nrm(val)?"selected":""}>${esc(n)}</option>`).join("")}</optgroup>`:""}<option value="${OWN}" ${isC&&cs.length?"":"selected"}>➕ รายการใหม่ (พิมพ์ชื่อเอง)</option></select><div id="f_cwrap" hidden><label for="f_custom">ชื่อรายการใหม่</label><input id="f_custom" maxlength="120" placeholder="เช่น VALORANT Masters Toronto 2025" value="${esc(isC?"":val)}"></div>`}
  if(k==="game")return`<label for="f_game">${l}</label><input id="f_game" value="VALORANT" disabled title="ล็อกเป็น VALORANT">`;
  if(k==="place"){const m=VCT_CHAMPS.find(c=>nrm(c[0])===nrm(FORM_ID?(S.tours.find(t=>t.id===FORM_ID)||{}).name:""));return`<label for="f_place">${l}</label><input id="f_place" maxlength="120" value="${esc(m?m[2]:val||"")}" disabled>`}
  if(k==="prize")return`<label for="f_prize">${l}</label><input id="f_prize" type="text" inputmode="numeric" autocomplete="off" placeholder="0" value="${esc(fmtMoney(val))}">`;
 }
 let h=`<label for="f_${k}">${l}</label>`;
 if(ty.startsWith("ref")){const src=ty.split(":")[1];h+=`<select id="f_${k}"><option value="">— ไม่ระบุ —</option>${S[src].filter(o=>!(tab==="results"&&src==="tours"&&isRealTour(o.id))).map(o=>`<option value="${esc(o.id)}" ${o.id===val?"selected":""}>${esc(o.name)}</option>`).join("")}</select>`}
 else if(ty==="img"&&(tab==="lib"||tab==="gear")){IMG[k]=val||"";h=`<label>รูปอุปกรณ์</label><div class="gpvbox"><img id="pv_${k}" class="gpv" ${val?`src="${esc(val)}"`:"hidden"} alt="รูปอุปกรณ์"><span id="pvn_${k}" class="agnone" ${val?"hidden":""}>ยังไม่มีรูปของรุ่นนี้</span></div>`}
 else if(ty==="img"){IMG[k]=val||"";h+=`<input id="f_${k}" type="file" accept="image/*"><img id="pv_${k}" class="pv" ${val?`src="${esc(val)}"`:"hidden"} alt="ตัวอย่างรูป"><button type="button" class="btn g" id="ri" data-k="${k}">ลบรูปนี้</button>`}
 else if(ty==="ag"){h+=`<input id="f_${k}" placeholder="Jett 28 18 520 390; Raze 16 9 290 240" value="${esc(agStr(val))}"><div style="font-size:12px;color:var(--mute);margin-top:4px">รูปแบบ: ชื่อ เกมที่เล่น ชนะ Kill Death คั่นแต่ละตัวด้วย ;</div>`}
 else if(ty.startsWith("sel")){h+=`<select id="f_${k}">${ty.split(":")[1].split("|").map(o=>`<option ${o===val?"selected":""}>${o}</option>`).join("")}</select>`}
 else{const sc=k==="sa"||k==="sb";h+=`<input id="f_${k}" type="${ty==="num"?"number":ty}" ${ty==="num"?`min="0" step="${sc?"1":"any"}" ${sc?"required":""}`:""} value="${esc(val??"")}">`}
 return h;
}
// รายการ VALORANT Champions ทุกปี: [ชื่อ, วันเริ่ม, สถานที่, เงินรางวัล (บาท)]
const VCT_CHAMPS=[["VALORANT Champions Istanbul 2022","2022-08-31","Istanbul, ตุรกี",33000000],["VALORANT Champions Los Angeles 2023","2023-08-06","Los Angeles, สหรัฐอเมริกา",74250000],["VALORANT Champions Seoul 2024","2024-08-01","Seoul, เกาหลีใต้",74250000],["VALORANT Champions Paris 2025","2025-09-12","Paris, ฝรั่งเศส",74250000],["VALORANT Champions Shanghai 2026","2026-09-24","Shanghai, จีน",74250000]];
const nrm=x=>String(x||"").trim().toLowerCase(),OWN="__own__";
const champChoices=cur=>VCT_CHAMPS.filter(([n])=>nrm(n)===nrm(cur)||!S.tours.some(t=>nrm(t.name)===nrm(n)));
const fmtMoney=v=>{const d=String(v??"").replace(/[^\d]/g,"").replace(/^0+(?=\d)/,"");return d?Number(d).toLocaleString("en-US"):""};
const champFill=n=>{const m=VCT_CHAMPS.find(c=>c[0]===n);if(!m)return;const set=(k,v)=>{const el=document.getElementById("f_"+k);if(el)el.value=v};set("start",m[1]);set("place",m[2]);set("prize",fmtMoney(m[3]))};
const tourYear=id=>{const t=S.tours.find(x=>x.id===id);return t&&/^\d{4}/.test(t.start||"")?t.start.slice(0,4):""};
const err=m=>{document.getElementById("err").textContent=m};

/* pre = ค่าเริ่มต้นตอนเพิ่มจากกล่องกลุ่ม เช่น {region:"VCT Pacific"} */
/* เพิ่มนักแข่ง: เลือกทีม แล้วรายชื่อนักแข่งทั้งทีมขึ้นมาครบ ติ๊กเลือกแล้วกดเพิ่มทีเดียว */
function teamRosterHtml(tid){
 if(!tid)return'<p class="agnone">เลือกทีมแล้วรายชื่อนักแข่งจะขึ้นมาครบ</p>';
 const t=S.teams.find(x=>x.id===tid),all=rosterOf(tid);
 if(!all.length)return'<p class="agnone">ทีมนี้ไม่มีรายชื่อนักแข่ง</p>';
 return all.map(([n,r])=>{const has=S.players.some(p=>p.team===tid&&norm(p.name)===norm(n)),st=statsFor(n),g=st.reduce((a,x)=>a+x.g,0),w=st.reduce((a,x)=>a+(x.w||0),0),k=st.reduce((a,x)=>a+x.k,0),d=st.reduce((a,x)=>a+x.d,0);
  return`<label class="tarow ${has?"has":""}"><input type="checkbox" class="ta-pick" value="${esc(n)}" ${has?"disabled":"checked"}><span class="taf">${faceSvg(n,t?t.name:"")}</span><span class="tan"><b>${esc(n)}</b><small>${esc(r||"ไม่ระบุตำแหน่ง")}${has?" · มีในระบบแล้ว":""}</small></span><span class="tas">${g?`${g} เกม · ชนะ ${w} · K/D ${d?(k/d).toFixed(2):"—"}`:"ไม่มีสถิติ"}</span></label>`}).join("");
}
function openTeamAdd(pre){
 const f=document.getElementById("f"),teams=S.teams.filter(t=>rosterOf(t.id).length),tid=(pre&&pre.team)||"";
 f.innerHTML=`<h2>เพิ่มนักแข่ง</h2><label for="ta_team">ทีม</label><select id="ta_team"><option value="">— เลือกทีม —</option>${teams.map(t=>`<option value="${esc(t.id)}" ${t.id===tid?"selected":""}>${esc(t.name)}</option>`).join("")}</select>
 <div id="ta_list" class="talist">${teamRosterHtml(tid)}</div><div id="err" style="color:var(--loss);font-size:14px;margin-top:8px" role="alert"></div>
 <div class="foot"><button class="btn g" type="button" id="cx">ยกเลิก</button><button class="btn" type="button" id="ok">เพิ่มนักแข่งที่เลือก</button></div>`;
 document.getElementById("cx").onclick=()=>dlg.close();
 document.getElementById("ok").onclick=async()=>{
  if(saving)return;
  const tid=document.getElementById("ta_team").value,picks=[...f.querySelectorAll(".ta-pick:checked")].map(x=>x.value);
  if(!tid)return err("กรุณาเลือกทีม");
  if(!picks.length)return err("ยังไม่ได้เลือกนักแข่ง");
  const btn=document.getElementById("ok");btn.disabled=true;let i=0;
  for(const n of picks){
   btn.textContent=`กำลังเพิ่ม ${++i}/${picks.length}…`;
   const m=rosterOf(tid).find(([x])=>x===n);
   const error=await saveRecord("players",{name:n,team:tid,role:m?m[1]:"",agents:statsFor(n).map(a=>({...a,w:a.w??0}))});
   if(error){btn.disabled=false;btn.textContent="เพิ่มนักแข่งที่เลือก";render();return err(error)}
  }
  dlg.close();render();
 };
 dlg.showModal();document.getElementById("ta_team").focus();
}

/* ---------- อุปกรณ์จริงของนักแข่ง (prosettings.net) [ประเภท, ชื่อรุ่น] ---------- */
const M="จอภาพ",MS="เมาส์",KB="คีย์บอร์ด",HS="หูฟัง",PD="เมาส์แพด";
const VCT_GEAR={
 "Asuna":[[M,"ZOWIE XL2546K"],[MS,"Razer DeathAdder V2"],[KB,"Higround Basecamp 65HE"],[HS,"Razer BlackShark V3 Pro Black"],[PD,"Artisan Ninja FX Zero Soft Black"]],
 "Cryocells":[[M,"ZOWIE XL2566X+"],[MS,"Ninjutso Sora V2 Black"],[KB,"WALLHACK K-001 Natural"],[HS,"Razer BlackShark V3 Pro Black"],[PD,"Pulsar Meiy Glass"]],
 "Timotino":[[M,"ZOWIE XL2586X"],[MS,"Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse"],[KB,"Wooting 60HE v2 Black"],[HS,"Razer BlackShark V3 Pro Black"],[PD,"Artisan Ninja FX Zero Soft Black"]],
 "bang":[[M,"ZOWIE XL2566X+"],[MS,"Logitech G Pro X Superlight Black"],[KB,"Wooting 60HE+"],[HS,"Razer BlackShark V3 Pro Black"],[PD,"Artisan Ninja FX Zero Soft Black"]],
 "vora":[[M,"Alienware AW2725DF"],[MS,"Ninjutso Sora V3"],[KB,"Wooting 80HE Black"],[PD,"Artisan Type-99 Matcha"]],
 "trent":[[M,"ZOWIE XL2566X+"],[MS,"Logitech G Pro X Superlight 2c White"],[KB,"Wooting 60HE v2 Black"],[HS,"HyperX Cloud II"],[PD,"X-raypad Aqua Control Zero"]],
 "babybay":[[M,"ZOWIE XL2566X+"],[MS,"Logitech G Pro X Superlight 2 Dex Black"],[KB,"Wooting 60HE v2 Black"],[HS,"HyperX Cloud Alpha"],[PD,"ZOWIE G-SR III"]],
 "leaf":[[M,"ZOWIE XL2566X+"],[MS,"Logitech G Pro X Superlight 2c White"],[KB,"Logitech G Pro X2 RAPID White"],[HS,"HyperX Cloud II"],[PD,"X-raypad Equate Plus V2 Kiwami Black"]],
 "valyn":[[M,"ZOWIE XL2566K"],[MS,"Logitech G Pro X Superlight 2 Cyan"],[KB,"Wooting 60HE v2 Black"],[HS,"Logitech G PRO X 2 Headset Black"],[PD,"Logitech G740"]],
 "jawgemo":[[M,"ZOWIE XL2566X+"],[MS,"Razer Prototype Mouse (Unreleased)"],[KB,"Wooting 60HE+"],[HS,"HyperX Cloud II"],[PD,"X-raypad Aqua Control+ PORON"]],
 "Darker":[[M,"ZOWIE XQ2566X"],[MS,"Razer Viper V4 Pro Green"],[KB,"IQUNIX EV63 HE"],[HS,"HyperX Cloud III"],[PD,"Artisan Ninja FX Zero Soft Black"]],
 "erde":[[M,"Alienware AW2521HF"],[MS,"Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse"],[KB,"IQUNIX EV63 HE"],[HS,"HyperX Cloud Alpha S Black"],[PD,"Artisan FX Hien XSoft Wine Red"]],
 "Ethan":[[M,"ZOWIE XL2566K"],[MS,"ZOWIE EC3-DW Black"],[KB,"ASUS ROG Falchion Ace 75 HE Black"],[HS,"ASUS ROG Pelta"],[PD,"Zowie Mousepad (Unreleased)"]],
 "keiko":[[M,"ZOWIE XL2566X+"],[MS,"WLMouse Beast X Max Black"],[KB,"Wooting 80HE+ Frost"],[HS,"HyperX Cloud II"],[PD,"Artisan FX Hien Mid Black"]],
 "mada":[[M,"ZOWIE XL2566K"],[MS,"Pulsar X2 CrazyLight"],[KB,"ASUS ROG Falchion Ace 75 HE Red"],[HS,"ASUS ROG Pelta"],[PD,"Artisan FX Hien Mid Black"]],
 "skuba":[[M,"ZOWIE XL2566K"],[MS,"Pulsar X2 CrazyLight"],[KB,"Razer Huntsman V3 Pro TKL 8KHz Black"],[PD,"ZOWIE H-TR"]],
 "brawk":[[M,"ZOWIE XL2566K"],[MS,"Razer Viper V4 Pro Black"],[KB,"ASUS ROG Falchion Ace 75 HE White"],[HS,"ASUS ROG Pelta"],[PD,"ZOWIE H-SR-SE ROUGE II"]],
 "johnqt":[[M,"ZOWIE XL2586X+"],[MS,"Logitech G Pro X Superlight 2 Black"],[KB,"Wooting 60HE+"],[HS,"Razer BlackShark V3 Pro Black"],[PD,"Artisan Ninja FX Zero Soft Black"]],
 "Reduxx":[[M,"ZOWIE XL2566X+"],[MS,"Razer Viper V4 Pro White"],[KB,"Razer Huntsman V3 Pro TKL 8KHz Green"],[HS,"Razer BlackShark V3 Pro Black"],[PD,"Pulsar eS Saturn Pro Black"]],
 "cortezia":[[M,"ZOWIE XL2566X+"],[MS,"Razer Viper V4 Pro White"],[KB,"MelGeek MADE68 Ultra"],[HS,"Razer BlackShark V3 Pro Black"],[PD,"Custom Mousepad"]],
 "JonahP":[[M,"ZOWIE XL2546"],[MS,"Razer Viper V4 Pro White"],[KB,"Wooting 60HE v2 Black"],[HS,"Razer BlackShark V3 Pro Black"],[PD,"VAXEE PD150"]],
 "Jerrwin":[[MS,"Razer Viper V4 Pro Black"],[KB,"Wooting 60HE v2 Black"],[HS,"Razer BlackShark V3 Pro Black"],[PD,"Artisan Ninja FX Zero Soft Black"]],
 "ZmjjKK":[[M,"ZOWIE XL2566X+"],[MS,"VAXEE NP-01S V3 Pink"],[KB,"Wooting 60HE+"],[HS,"HyperX Cloud III Wireless"],[PD,"Artisan Type-99 Gray"]],
 "Smoggy":[[M,"ZOWIE XL2566X+"],[MS,"Razer Prototype Mouse (Unreleased)"],[KB,"Wooting 60HE v2 Silver"],[HS,"Razer BlackShark V3 Pro Green"],[PD,"Artisan Type-99 Matcha"]],
 "CHICHOO":[[M,"ZOWIE XL2566X+"],[MS,"Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse"],[KB,"Wooting 60HE+"],[HS,"HyperX Cloud II Pink"],[PD,"Artisan Ninja FX Zero Mid Orange"]],
 "nobody":[[M,"ZOWIE XL2566X+"],[MS,"Razer Prototype Mouse (Unreleased)"],[KB,"IQUNIX EZ63 HE"],[HS,"Razer BlackShark V3 Pro Black"],[PD,"VAXEE PD151"]],
 "slowly":[[M,"ZOWIE XL2546K"],[MS,"Razer DeathAdder V4 Pro White"],[KB,"Cherry Xtrfy K5 Pro TMR"],[HS,"ASUS ROG Delta II Black"],[PD,"Pulsar eS Saturn Pro Black"]],
 "splash":[[M,"AOC 24G2Z"],[MS,"VAXEE NP-01S V3 Galapagos Green"],[KB,"Wooting 80HE Black"],[HS,"Razer BlackShark V3 Pro Green"],[PD,"VAXEE PE-K GEh Pink"]],
 "Scales":[[M,"ZOWIE XL2566K"],[MS,"Logitech G Pro X Superlight 2 Magenta"],[KB,"Wooting 60HE v2 Black"],[HS,"Razer BlackShark V3 Pro Black"],[PD,"Artisan Type-99 Soft Black"]],
 "Rarga":[[M,"SONY INZONE M10S II"],[MS,"Finalmouse Ultralight X Frostlord Medium"],[KB,"Wooting 60HE v2 Black"],[HS,"Razer BlackShark V3 Pro White"],[PD,"Artisan Ninja FX Zero Soft Orange"]],
 "happywei":[[M,"SONY INZONE M10S II"],[MS,"Logitech G Pro X Superlight 2 Magenta"],[KB,"Wooting 60HE+"],[HS,"Razer BlackShark V3 Pro Black"],[PD,"ZOWIE H-SR-SE BLUE II"]],
 "Lysoar":[[M,"SONY INZONE M10S II"],[MS,"Razer DeathAdder V4 Pro Black"],[KB,"Wooting 80HE Ghost"],[HS,"HyperX Cloud III Wireless"],[PD,"Artisan Type-99 Soft Black"]],
 "Boaster":[[M,"SONY INZONE M10S"],[MS,"Fnatic x Lamzu Thorn"],[KB,"Sony INZONE KBD-H75"],[HS,"SONY INZONE H9 II Black"],[PD,"SONY INZONE MAT-F"]],
 "Alfajer":[[M,"SONY INZONE M10S"],[MS,"Logitech G Pro X3 SUPERSTRIKE Magenta Eclipse"],[KB,"Sony INZONE KBD-H75"],[HS,"HyperX Cloud II"],[PD,"Artisan Ninja FX Zero Soft Orange"]],
 "kaajak":[[M,"SONY INZONE M10S"],[MS,"Fnatic X Lamzu Maya 8K"],[KB,"Sony INZONE KBD-H75"],[HS,"SONY INZONE H9 II Black"],[PD,"Pulsar eS Saturn Pro Red"]],
 "crashies":[[M,"SONY INZONE M10S"],[MS,"Lamzu Maya X White"],[KB,"Sony INZONE KBD-H75"],[HS,"Sennheiser GAME ZERO"],[PD,"Artisan Ninja FX Zero Soft Orange"]],
 "Veqaj":[[M,"ZOWIE XL2566K"],[MS,"Razer Viper V4 Pro White"],[KB,"Pulsar PCMK 3"],[HS,"Razer BlackShark V3 Pro Black"],[PD,"Pulsar eS Saturn Pro Black"]],
 "MrFaliN":[[M,"Alienware AW2523HF"],[MS,"Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse"],[KB,"Wooting 60HE v2 Silver"],[HS,"Bose QuietComfort 20"],[PD,"VAXEE PC"]],
 "yetujey":[[M,"ASUS TUF VG279QM"],[MS,"Razer Viper V4 Pro White"],[KB,"Wooting 60HE v2 Silver"],[HS,"Logitech G Pro X Headset"],[PD,"ZOWIE G-SR-SE ROUGE II"]],
 "xeus":[[M,"ZOWIE XL2566K"],[MS,"Logitech G Pro X Superlight 2 Black"],[KB,"Wooting 60HE v2 Silver"],[HS,"Logitech G PRO X 2 Headset Black"],[PD,"Pulsar eS Jupiter Pro"]],
 "starxo":[[M,"ASUS ROG STRIX XG248Q"],[MS,"WLMOUSE Beast x Pro Soft Lilac"],[KB,"Wooting 80HE Black"],[HS,"HyperX Cloud III Wireless Black"],[PD,"Artisan Type-99 Soft Black"]],
 "Minny":[[M,"ZOWIE XL2566K"],[MS,"Razer DeathAdder V4 Pro Black"],[KB,"IQUNIX EV63 HE"],[HS,"Razer BlackShark V2 Pro Black"],[PD,"Artisan Ninja FX Zero Soft Orange"]],
 "bipo":[[M,"ZOWIE XL2566K"],[MS,"Razer Viper V4 Pro Black"],[KB,"IQUNIX EV63 HE"],[HS,"Razer BlackShark V2 Pro Black"],[PD,"Artisan Ninja FX Zero Soft Orange"]],
 "marteen":[[M,"Alienware AW2518H"],[MS,"Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse"],[KB,"Wooting 60HE+"],[HS,"SONY INZONE H9 II"],[PD,"Pulsar eS Jupiter Pro"]],
 "sheydos":[[M,"ZOWIE XL2546K"],[MS,"Razer Viper V4 Pro Black"],[KB,"Wooting 60HE v2 Black"],[HS,"Razer BlackShark V3 Pro Black"],[PD,"Razer Gigantus V2"]],
 "dos9":[[M,"LG 25GR75FG"],[MS,"Logitech G Pro X Superlight 2 White"],[KB,"Wooting 60HE+"],[HS,"Razer BlackShark V3 Pro Green"],[PD,"Pulsar Meiy Glass"]],
 "SUYGETSU":[[M,"LG 25GR75FG"],[MS,"Endgame Gear OP1 8k V2 Black"],[KB,"WALLHACK K-001 Natural"],[HS,"Razer BlackShark V3 Pro Green"],[PD,"Artisan Ninja FX Zero Soft Black"]],
 "LewN":[[M,"LG 25GR75FG"],[MS,"Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse"],[KB,"Wooting 60HE v2 Silver"],[HS,"Razer BlackShark V3 Pro Green"],[PD,"Artisan Ninja FX Zero Soft Orange"]],
 "avez":[[M,"LG 25GR75FG"],[MS,"Logitech G Pro X Superlight 2 Black"],[KB,"Wooting 60HE+"],[HS,"Razer BlackShark V3 Pro Green"],[PD,"Razer Gigantus V2"]],
 "benjyfishy":[[M,"ZOWIE XL2586X+"],[MS,"Logitech G Pro X Superlight 2 Magenta"],[KB,"Logitech G Pro X TKL RAPID Black"],[HS,"Logitech G PRO X 2 Headset Black"],[PD,"Gamesense Radar Benjyfishy 2"]],
 "RieNs":[[M,"ZOWIE XL2586X+"],[MS,"Logitech G Pro X Superlight 2 Cyan"],[KB,"Wooting 60HE v2 Silver"],[PD,"Artisan Ninja FX Zero XSoft Black"]],
 "Wo0t":[[M,"ZOWIE XL2586X+"],[MS,"Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse"],[KB,"Wooting 80HE Ghost"],[HS,"Logitech G PRO X 2 Headset Black"],[PD,"Logitech G740"]],
 "Jamppi":[[M,"Alienware AW2523HF"],[MS,"VAXEE E1 Wireless Fluorescent Green"],[KB,"ASUS ROG Falchion Ace 75 HE White"],[HS,"Logitech G Pro X3 LIGHTSPEED Headset Magenta"],[PD,"VAXEE PD150"]],
 "Derke":[[M,"ZOWIE XL2566X+"],[MS,"Logitech G Pro X3 SUPERSTRIKE Magenta Eclipse"],[KB,"ASUS ROG Falcata"],[HS,"ASUS ROG Delta II Black"],[PD,"Logitech G640 Original"]],
 "Sayonara":[[M,"ZOWIE XL2566X+"],[MS,"Logitech G Pro X Superlight 2 Magenta"],[KB,"ASUS ROG Falchion Ace HFX Black"],[HS,"ASUS ROG Delta II Black"],[PD,"Pulsar eS Saturn Pro Black"]],
 "Chronicle":[[M,"ASUS ROG SWIFT XG27AQM"],[MS,"ATK A9 Chronicle Edition"],[KB,"ATK x QK Hex80"],[HS,"Logitech G Pro X3 LIGHTSPEED Headset Magenta"],[PD,"Pulsar Meiy Glass"]],
 "PROFEK":[[M,"ZOWIE XL2566K"],[MS,"Razer Prototype Mouse (Unreleased)"],[KB,"ASUS ROG Falchion Ace 75 HE Black"],[HS,"HyperX Cloud III Wireless"],[PD,"Artisan Hayate Otsu V2 Soft Black"]],
 "Primmie":[[M,"ZOWIE XL2566X+"],[MS,"Razer Viper V4 Pro White"],[KB,"Wooting 60HE v2 Black"],[HS,"HyperX Cloud II"],[PD,"Pulsar eS Saturn Pro Red"]],
 "JitboyS":[[M,"ZOWIE XL2566K"],[MS,"Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse"],[KB,"Wooting 80HE+ Frost"],[HS,"Razer BlackShark V2 Pro Black"],[PD,"Artisan Ninja FX Zero Soft Black"]],
 "Lakia":[[M,"ZOWIE XL2546"],[MS,"Lamzu Maya X Black"],[KB,"SteelSeries Apex Pro TKL Gen 3 Black"],[HS,"Razer BlackShark V2 HyperSpeed Black"],[PD,"X-raypad Aqua Control+ Wave Black"]],
 "ZynX":[[M,"ZOWIE XL2546K"],[MS,"Razer Viper V3 Pro White"],[KB,"Razer Huntsman V3 Pro Mini"],[HS,"Razer BlackShark V2 HyperSpeed Black"],[PD,"Pulsar eS Saturn Pro Black"]],
 "t3xture":[[M,"ZOWIE XL2546K"],[MS,"Logitech G Pro X Superlight 2 Cyan"],[KB,"SteelSeries Apex Pro TKL Gen 3 White"],[HS,"Razer BlackShark V2 HyperSpeed White"],[PD,"SteelSeries QcK Heavy Black"]],
 "Karon":[[M,"ZOWIE XL2566X+"],[MS,"Logitech G Pro X Superlight Magenta"],[KB,"Wooting 60HE+"],[HS,"Razer BlackShark V2 HyperSpeed White"],[PD,"X-raypad Aqua Control+ Wave Black"]],
 "f0rsakeN":[[M,"ZOWIE XL2566X+"],[MS,"Pulsar Susanto-X"],[KB,"Wooting 60HE v2 Silver"],[HS,"HyperX Cloud III Wireless"],[PD,"Pulsar eS Saturn Pro Red"]],
 "invy":[[M,"ZOWIE XL2586X+"],[MS,"Logitech G Pro X3 SUPERSTRIKE Magenta Eclipse"],[KB,"Wooting 60HE v2 Silver"],[HS,"HyperX Cloud III"],[PD,"Artisan Ninja FX Zero TenZ"]],
 "something":[[M,"ZOWIE XL2586X"],[MS,"Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse"],[KB,"Pulsar PCMK 3"],[HS,"HyperX Cloud III"],[PD,"Pulsar eS Saturn Pro Red"]],
 "d4v41":[[M,"ZOWIE XL2566X+"],[MS,"VAXEE ZYGEN NP-01S V2 Wireless Red"],[KB,"Arbiter Studio Polar 65"],[HS,"HyperX Cloud III Wireless"],[PD,"Pulsar d4v41 Mousepad"]],
 "Jinggg":[[M,"ZOWIE XL2566K"],[MS,"Pulsar Jinggg-x"],[KB,"Wooting 60HE v2 Silver"],[HS,"HyperX Cloud III Wireless"],[PD,"Artisan Ninja FX Zero Soft Black"]],
 "crazyguy":[[M,"ZOWIE XL2566X+"],[MS,"Razer Viper V3 Pro Green"],[KB,"Wooting 60HE v2 Silver"],[HS,"HyperX Cloud III Wireless"],[PD,"Pulsar eS Saturn Pro Black"]],
 "Kushy":[[MS,"Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse"],[KB,"Wooting 60HE v2 Silver"],[PD,"X-raypad Aqua Speed"]],
 "Monyet":[[M,"ZOWIE XL2546K"],[MS,"VAXEE NP-01S Pink"],[KB,"Wooting 80HE+ Frost"],[HS,"HyperX Cloud II Pink"],[PD,"Pulsar eS Saturn Pro Black"]],
 "xffero":[[MS,"Logitech G Pro X Superlight 2 White"],[KB,"Wooting 80HE Black"],[HS,"HyperX Cloud III"],[PD,"Artisan Type-99 Matcha"]],
 "Jemkin":[[MS,"Razer Viper V4 Pro Black"],[KB,"Wooting 80HE Black"],[HS,"SteelSeries Arctis 7"],[PD,"Pulsar eS Saturn Pro Black"]],
 "Munchkin":[[M,"ZOWIE XL2546K"],[MS,"Razer Viper V4 Pro White"],[KB,"Wooting 80HE Ghost"],[HS,"Sennheiser GAME ONE"],[PD,"X-raypad Aqua Control+ Wave Black"]],
 "carpe":[[M,"ZOWIE XL2566K"],[MS,"Razer Viper V3 Pro White"],[KB,"SteelSeries Apex Pro TKL Gen 3 Black"],[HS,"Sennheiser GAME ZERO"],[PD,"Pulsar eS Saturn Pro Red"]],
 "iZu":[[M,"ZOWIE XL2566K"],[MS,"Logitech G Pro X3 SUPERSTRIKE Midnight Black"],[KB,"Custom Keyboard"],[HS,"Razer BlackShark V3 Pro White"],[PD,"Pulsar eS Saturn Pro Black"]],
 "Meteor":[[M,"ZOWIE XL2566X+"],[MS,"Razer Viper V4 Pro Black"],[KB,"Wooting 60HE v2 Silver"],[HS,"Logitech G Pro X3 LIGHTSPEED Headset Magenta"],[PD,"Artisan Hayate Otsu V2 Soft Wine Red"]],
 "stax":[[M,"ZOWIE XL2546S"],[MS,"Pulsar STA-X"],[KB,"Custom Keyboard"],[HS,"Razer BlackShark V3 Pro Black"],[PD,"Artisan Hayate Otsu V2 Soft Wine Red"]],
 "BuZz":[[M,"ZOWIE XL2546K"],[MS,"Pulsar BUZZ-X"],[KB,"Custom Keyboard"],[HS,"HyperX Cloud III S Wireless White"],[PD,"X-raypad Aqua Control+ PORON"]],
 "SugarZ3ro":[[M,"SONY INZONE M10S"],[MS,"Razer Viper V4 Pro Black"],[KB,"Wooting 60HE v2 Black"],[HS,"Logitech G Pro X Headset"],[PD,"Pulsar eS Saturn Pro Black"]],
 "Xdll":[[M,"SONY INZONE M10S"],[MS,"Razer Viper V4 Pro White"],[KB,"Razer Huntsman V3 Pro TKL Black"],[HS,"Razer BlackShark V3 Pro White"],[PD,"Pulsar eS Saturn Pro Black"]],
 "eKo":[[MS,"ZOWIE EC2-CW"],[KB,"Logitech G Pro X Keyboard"],[HS,"Corsair Void RGB Elite White"],[PD,"SteelSeries QcK Heavy Black"]],
 "SyouTa":[[M,"ZOWIE XL2566K"],[MS,"Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse"],[KB,"Razer Huntsman V3 Pro TKL Black"],[HS,"Shure SE215 Clear"],[PD,"Pulsar eS PD170"]]
};
/* รูปจริงของแต่ละรุ่น (prosettings.net) */
const GEAR_IMG={"ZOWIE XL2546K": "https://prosettings.net/wp-content/uploads/zowie-xl2546k-187x187-fitcontain.png","Razer DeathAdder V2": "https://prosettings.net/wp-content/uploads/razer-deathadder-v2-187x187-fitcontain.png","Higround Basecamp 65HE": "https://prosettings.net/wp-content/uploads/Higround-Basecamp-65he-187x187-fitcontain.png","Razer BlackShark V3 Pro Black": "https://prosettings.net/wp-content/uploads/razer-blackshark-v3-pro-187x187-fitcontain.webp","Artisan Ninja FX Zero Soft Black": "https://prosettings.net/wp-content/uploads/artisan-ninja-fx-zero-soft-187x187-fitcontain.png","Alienware AW2725DF": "https://prosettings.net/wp-content/uploads/alienware-aw2725df-187x187-fitcontain.png","Ninjutso Sora V3": "https://prosettings.net/wp-content/uploads/Ninjutso-Sora-V3-Black-187x187-fitcontain.png","Wooting 80HE Black": "https://prosettings.net/wp-content/uploads/wooting-80he-187x187-fitcontain.png","Artisan Type-99 Matcha": "https://prosettings.net/wp-content/uploads/artisan-type-99-matcha-187x187-fitcontain.png","ZOWIE XL2566X+": "https://prosettings.net/wp-content/uploads/zowie-xl2566x-187x187-fitcontain.png","Ninjutso Sora V2 Black": "https://prosettings.net/wp-content/uploads/ninjutso-sora-v2-187x187-fitcontain.png","WALLHACK K-001 Natural": "https://prosettings.net/wp-content/uploads/Wallhack-K-001-187x187-fitcontain.png","Pulsar Meiy Glass": "https://prosettings.net/wp-content/uploads/Pulsar-Meiy-187x187-fitcontain.png","Logitech G Pro X Superlight Black": "https://prosettings.net/wp-content/uploads/logitech-g-pro-x-superlight-187x187-fitcontain.png","Wooting 60HE+": "https://prosettings.net/wp-content/uploads/wooting-60-he-1-187x187-fitcontain.png","Logitech G Pro X Superlight 2c White": "https://prosettings.net/wp-content/uploads/logitech-g-pro-x-superlight-2c-white-187x187-fitcontain.webp","Wooting 60HE v2 Black": "https://prosettings.net/wp-content/uploads/wooting-60he-v2-black-187x187-fitcontain.webp","HyperX Cloud II": "https://prosettings.net/wp-content/uploads/hyperx-cloud-ii-187x187-fitcontain.png","X-raypad Aqua Control Zero": "https://prosettings.net/wp-content/uploads/x-raypad-aqua-control-zero-187x187-fitcontain.png","Logitech G Pro X Superlight 2 Dex Black": "https://prosettings.net/wp-content/uploads/logitech-g-pro-x-superlight-2-dex-black-187x187-fitcontain.png","HyperX Cloud Alpha": "https://prosettings.net/wp-content/uploads/hyperx-cloud-alpha-187x187-fitcontain.png","ZOWIE G-SR III": "https://prosettings.net/wp-content/uploads/zowie-g-sr-iii-187x187-fitcontain.png","Logitech G Pro X2 RAPID White": "https://prosettings.net/wp-content/uploads/Logitech-G-pro-X2-Rapid-White-187x187-fitcontain.png","X-raypad Equate Plus V2 Kiwami Black": "https://prosettings.net/wp-content/uploads/x-raypad-equate-plus-v2-kiwami-187x187-fitcontain.png","ZOWIE XL2566K": "https://prosettings.net/wp-content/uploads/benq-xl2566k-187x187-fitcontain.png","Logitech G Pro X Superlight 2 Cyan": "https://prosettings.net/wp-content/uploads/logitech-g-pro-x-superlight-2-cyan-187x187-fitcontain.webp","Logitech G PRO X 2 Headset Black": "https://prosettings.net/wp-content/uploads/logitech-g-pro-x-2-headset-black-187x187-fitcontain.png","Logitech G740": "https://prosettings.net/wp-content/uploads/logitech-g740-187x187-fitcontain.png","Alienware AW2521HF": "https://prosettings.net/wp-content/uploads/alienware-2521hf-187x187-fitcontain.png","Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse": "https://prosettings.net/wp-content/uploads/logitech-g-pro-x2-superstrike-187x187-fitcontain.webp","IQUNIX EV63 HE": "https://prosettings.net/wp-content/uploads/iqunix-ev63-187x187-fitcontain.webp","HyperX Cloud Alpha S Black": "https://prosettings.net/wp-content/uploads/hyperx-cloud-alpha-s-187x187-fitcontain.png","Artisan FX Hien XSoft Wine Red": "https://prosettings.net/wp-content/uploads/artisan-fx-hien-xsoft-wine-red-187x187-fitcontain.png","ZOWIE XQ2566X": "https://prosettings.net/wp-content/uploads/ZOWIE-XQ2566X-187x187-fitcontain.png","Razer Viper V4 Pro Green": "https://prosettings.net/wp-content/uploads/Razer-Viper-V4-Pro-Green-187x187-fitcontain.png","HyperX Cloud III": "https://prosettings.net/wp-content/uploads/hyperx-cloud-iii-187x187-fitcontain.png","Razer Viper V4 Pro Black": "https://prosettings.net/wp-content/uploads/razer-viper-v4-pro-187x187-fitcontain.webp","Razer Gigantus V2": "https://prosettings.net/wp-content/uploads/razer-gigantus-v2-187x187-fitcontain.png","ZOWIE EC3-DW Black": "https://prosettings.net/wp-content/uploads/zowie-ec3-cw-187x187-fitcontain.png","ASUS ROG Falchion Ace 75 HE Black": "https://prosettings.net/wp-content/uploads/asus-rog-falchion-ace-75-he-black-187x187-fitcontain.webp","ASUS ROG Pelta": "https://prosettings.net/wp-content/uploads/asus-rog-pelta-187x187-fitcontain.png","Zowie Mousepad (Unreleased)": "https://prosettings.net/wp-content/uploads/zowie-187x187-fitcontain.png","WLMouse Beast X Max Black": "https://prosettings.net/wp-content/uploads/wlmouse-beast-x-black-187x187-fitcontain.png","Wooting 80HE+ Frost": "https://prosettings.net/wp-content/uploads/wooting-80he-frost-187x187-fitcontain.png","Artisan FX Hien Mid Black": "https://prosettings.net/wp-content/uploads/artisan-hien-fx-soft-187x187-fitcontain.png","Pulsar X2 CrazyLight": "https://prosettings.net/wp-content/uploads/pulsar-x2-crazylight-187x187-fitcontain.webp","Razer Huntsman V3 Pro TKL 8KHz Black": "https://prosettings.net/wp-content/uploads/razer-huntsman-v3-pro-tkl-187x187-fitcontain.png","ZOWIE H-TR": "https://prosettings.net/wp-content/uploads/zowie-h-tr-187x187-fitcontain.png","ASUS ROG Falchion Ace 75 HE Red": "https://prosettings.net/wp-content/uploads/ASUS-ROG-Falchion-Ace-75-HE-Red-187x187-fitcontain.png","ASUS ROG Falchion Ace 75 HE White": "https://prosettings.net/wp-content/uploads/asus-rog-falchion-ace-75-he-white-187x187-fitcontain.webp","ZOWIE H-SR-SE ROUGE II": "https://prosettings.net/wp-content/uploads/zowie-h-sr-se-rouge-ii-187x187-fitcontain.png","Razer Viper V4 Pro White": "https://prosettings.net/wp-content/uploads/razer-viper-v4-pro-white-187x187-fitcontain.webp","MelGeek MADE68 Ultra": "https://prosettings.net/wp-content/uploads/melgeek-made68-ultra-red-187x187-fitcontain.webp","Custom Mousepad": "https://prosettings.net/wp-content/uploads/custom-mousepad-187x187-fitcontain.png","Razer Huntsman V3 Pro TKL 8KHz Green": "https://prosettings.net/wp-content/uploads/razer-huntsman-v3-pro-tkl-green-187x187-fitcontain.webp","Pulsar eS Saturn Pro Black": "https://prosettings.net/wp-content/uploads/pulsar-es-saturn-pro-v2-187x187-fitcontain.webp","ZOWIE XL2546": "https://prosettings.net/wp-content/uploads/zowie-xl2546-187x187-fitcontain.png","VAXEE PD150": "https://prosettings.net/wp-content/uploads/vaxee-pd-187x187-fitcontain.png","Logitech G Pro X Superlight 2 Black": "https://prosettings.net/wp-content/uploads/logitech-g-pro-x-superlight-187x187-fitcontain.png","ZOWIE XL2586X+": "https://prosettings.net/wp-content/uploads/zowie-xl2586x-1-187x187-fitcontain.png","VAXEE NP-01S V3 Pink": "https://prosettings.net/wp-content/uploads/VAXEE-NP-01S-V3-Pink-187x187-fitcontain.png","HyperX Cloud III Wireless": "https://prosettings.net/wp-content/uploads/hyperx-cloud-iii-wireless-187x187-fitcontain.png","Artisan Type-99 Gray": "https://prosettings.net/wp-content/uploads/artisan-type-99-grey-187x187-fitcontain.webp","AOC 24G2Z": "https://prosettings.net/wp-content/uploads/aoc-24g2z-187x187-fitcontain.png","VAXEE NP-01S V3 Galapagos Green": "https://prosettings.net/wp-content/uploads/VAXEE-NP-01S-V3-Galapagos-Green-187x187-fitcontain.png","Razer BlackShark V3 Pro Green": "https://prosettings.net/wp-content/uploads/razer-blackshark-v3-pro-green-187x187-fitcontain.webp","VAXEE PE-K GEh Pink": "https://prosettings.net/wp-content/uploads/vaxee-pe-k-pink-187x187-fitcontain.webp","SONY INZONE M10S II": "https://prosettings.net/wp-content/uploads/SONY-INZONE-M10S-II-187x187-fitcontain.png","Finalmouse Ultralight X Frostlord Medium": "https://prosettings.net/wp-content/uploads/Finalmouse-Ultralight-X-Frostlord-187x187-fitcontain.png","Razer BlackShark V3 Pro White": "https://prosettings.net/wp-content/uploads/razer-blackshark-v3-pro-white-187x187-fitcontain.webp","Artisan Ninja FX Zero Soft Orange": "https://prosettings.net/wp-content/uploads/artisan-ninja-fx-zero-xsoft-orange-187x187-fitcontain.png","ASUS TUF VG279QM": "https://prosettings.net/wp-content/uploads/asus-tuf-vg279qm-187x187-fitcontain.png","Wooting 60HE v2 Silver": "https://prosettings.net/wp-content/uploads/wooting-60he-v2-silver-regular-187x187-fitcontain.webp","Logitech G Pro X Headset": "https://prosettings.net/wp-content/uploads/logitech-g-pro-x-wired-187x187-fitcontain.png","ZOWIE G-SR-SE ROUGE II": "https://prosettings.net/wp-content/uploads/zowie-g-sr-se-rouge-ii-187x187-fitcontain.png","ASUS ROG STRIX XG248Q": "https://prosettings.net/wp-content/uploads/asus-rog-strix-xg248q-187x187-fitcontain.png","WLMOUSE Beast x Pro Soft Lilac": "https://prosettings.net/wp-content/uploads/wlmouse-beast-x-pro-soft-lilac-187x187-fitcontain.webp","HyperX Cloud III Wireless Black": "https://prosettings.net/wp-content/uploads/hyperx-cloud-iii-wireless-black-187x187-fitcontain.png","Artisan Type-99 Soft Black": "https://prosettings.net/wp-content/uploads/artisan-type-99-black-187x187-fitcontain.png","Logitech G Pro X3 SUPERSTRIKE Magenta Eclipse": "https://prosettings.net/wp-content/uploads/Logitech-G-Pro-X3-SUPERSTRIKE-Magenta-187x187-fitcontain.png","ASUS ROG Falcata": "https://prosettings.net/wp-content/uploads/asus-rog-falcata-187x187-fitcontain.webp","ASUS ROG Delta II Black": "https://prosettings.net/wp-content/uploads/asus-rog-delta-ii-187x187-fitcontain.png","Logitech G640 Original": "https://prosettings.net/wp-content/uploads/logitech-g640-187x187-fitcontain.png","ASUS ROG SWIFT XG27AQM": "https://prosettings.net/wp-content/uploads/asus-rog-swift-xg27aqm-187x187-fitcontain.png","ATK A9 Chronicle Edition": "https://prosettings.net/cdn-cgi/image/dpr=1%2Cf=auto%2Cfit=contain%2Cheight=187%2Cq=85%2Cwidth=187/wp-content/uploads/ATK-A9-Chronicle.png","ATK x QK Hex80": "https://prosettings.net/wp-content/uploads/ATK-x-QK-Hex80-187x187-fitcontain.png","Logitech G Pro X3 LIGHTSPEED Headset Magenta": "https://prosettings.net/wp-content/uploads/G-Pro-X3-Lightspeed-Headset-Magenta-187x187-fitcontain.png","Lamzu Maya X Black": "https://prosettings.net/wp-content/uploads/lamzu-maya-x-black-187x187-fitcontain.png","SteelSeries Apex Pro TKL Gen 3 Black": "https://prosettings.net/wp-content/uploads/steelseries-apex-pro-tkl-gen-3-187x187-fitcontain.png","Razer BlackShark V2 HyperSpeed Black": "https://prosettings.net/wp-content/uploads/razer-blackshark-v2-hyperspeed-187x187-fitcontain.png","X-raypad Aqua Control+ Wave Black": "https://prosettings.net/wp-content/uploads/x-raypad-aqua-control-wave-black-187x187-fitcontain.png","VAXEE ZYGEN NP-01S V2 Wireless Red": "https://prosettings.net/wp-content/uploads/vaxee-np-01s-v2-wireless-red-187x187-fitcontain.webp","Arbiter Studio Polar 65": "https://prosettings.net/wp-content/uploads/arbiter-studio-polar-65-187x187-fitcontain.png","Pulsar d4v41 Mousepad": "https://prosettings.net/wp-content/uploads/Pulsar-d4v41-187x187-fitcontain.png","ZOWIE XL2546S": "https://prosettings.net/wp-content/uploads/zowie-xl2546s-187x187-fitcontain.png","Pulsar STA-X": "https://prosettings.net/wp-content/uploads/Pulsar-STA-X-187x187-fitcontain.png","Custom Keyboard": "https://prosettings.net/wp-content/uploads/custom-keyboard-187x187-fitcontain.png","Artisan Hayate Otsu V2 Soft Wine Red": "https://prosettings.net/wp-content/uploads/artisan-hayate-otsu-mid-187x187-fitcontain.png","Pulsar Jinggg-x": "https://prosettings.net/wp-content/uploads/Pulsar-Jingg-X-187x187-fitcontain.png","Alienware AW2518H": "https://prosettings.net/wp-content/uploads/alienware-aw2518h-187x187-fitcontain.png","SONY INZONE H9 II": "https://prosettings.net/wp-content/uploads/sony-inzone-h9-ii-187x187-fitcontain.webp","SONY INZONE H9 II Black": "https://prosettings.net/wp-content/uploads/sony-inzone-h9-ii-187x187-fitcontain.webp","Pulsar eS Jupiter Pro": "https://prosettings.net/wp-content/uploads/Pulsar-eS-Jupiter-Pro-Gear-Img-187x187-fitcontain.png","Logitech G Pro X Superlight 2 Magenta": "https://prosettings.net/wp-content/uploads/logitech-g-pro-x-superlight-magenta-187x187-fitcontain.png","Logitech G Pro X TKL RAPID Black": "https://prosettings.net/wp-content/uploads/logitech-g-pro-x-tkl-rapid-black-187x187-fitcontain.png","Gamesense Radar Benjyfishy 2": "https://prosettings.net/wp-content/uploads/Gamesense-Radar-Benjyfishy-2-187x187-fitcontain.png","ZOWIE XL2586X": "https://prosettings.net/wp-content/uploads/zowie-xl2586x-187x187-fitcontain.png","Pulsar PCMK 3": "https://prosettings.net/wp-content/uploads/pulsar-pcmk-3-he-60-187x187-fitcontain.webp","Pulsar eS Saturn Pro Red": "https://prosettings.net/wp-content/uploads/pulsar-es-saturn-pro-red-xl-sq-187x187-fitcontain.webp","Pulsar BUZZ-X": "https://prosettings.net/wp-content/uploads/Pulsar-Buzz-X-187x187-fitcontain.png","HyperX Cloud III S Wireless White": "https://prosettings.net/wp-content/uploads/HyperX-Cloud-III-S-Wireless-White-187x187-fitcontain.png","X-raypad Aqua Control+ PORON": "https://prosettings.net/wp-content/uploads/x-raypad-aqua-control-poron-187x187-fitcontain.webp","Razer Prototype Mouse (Unreleased)": "https://prosettings.net/wp-content/uploads/razer-187x187-fitcontain.png","IQUNIX EZ63 HE": "https://prosettings.net/wp-content/uploads/iqunix-ez63-187x187-fitcontain.webp","VAXEE PD151": "https://prosettings.net/wp-content/uploads/vaxee-pd151-187x187-fitcontain.webp","HyperX Cloud II Pink": "https://prosettings.net/wp-content/uploads/hyperx-cloud-ii-pink-187x187-fitcontain.png","Artisan Ninja FX Zero Mid Orange": "https://prosettings.net/wp-content/uploads/artisan-ninja-fx-zero-xsoft-orange-187x187-fitcontain.png","Razer DeathAdder V4 Pro White": "https://prosettings.net/wp-content/uploads/razer-deathadder-v4-pro-white-187x187-fitcontain.webp","Cherry Xtrfy K5 Pro TMR": "https://prosettings.net/wp-content/uploads/cherry-xtrfy-k5-pro-tmr-187x187-fitcontain.webp","Razer DeathAdder V4 Pro Black": "https://prosettings.net/wp-content/uploads/razer-deathadder-v4-pro-black-187x187-fitcontain.webp","Wooting 80HE Ghost": "https://prosettings.net/wp-content/uploads/wooting-80he-ghost-187x187-fitcontain.png","SONY INZONE M10S": "https://prosettings.net/wp-content/uploads/sony-inzone-m10s-187x187-fitcontain.png","Lamzu Maya X White": "https://prosettings.net/wp-content/uploads/lamzu-maya-x-white-187x187-fitcontain.png","Sony INZONE KBD-H75": "https://prosettings.net/wp-content/uploads/sony-inzone-kbd-h75-187x187-fitcontain.webp","Sennheiser GAME ZERO": "https://prosettings.net/wp-content/uploads/sennheiser-game-zero-187x187-fitcontain.png","Fnatic X Lamzu Maya 8K": "https://prosettings.net/wp-content/uploads/lamzu-x-fnatic-maya-8k-187x187-fitcontain.png","LG 25GR75FG": "https://prosettings.net/wp-content/uploads/lg-25gr75fg-187x187-fitcontain.webp","Logitech G Pro X Superlight 2 White": "https://prosettings.net/wp-content/uploads/logitech-g-pro-x-superlight-white-187x187-fitcontain.png","Endgame Gear OP1 8k V2 Black": "https://prosettings.net/wp-content/uploads/endgame-gear-op1-8k-black-187x187-fitcontain.png","Razer Viper V3 Pro White": "https://prosettings.net/wp-content/uploads/viper-v3-pro-white-187x187-fitcontain.png","Razer Huntsman V3 Pro Mini": "https://prosettings.net/wp-content/uploads/razer-huntsman-v3-pro-mini-187x187-fitcontain.png","SteelSeries Apex Pro TKL Gen 3 White": "https://prosettings.net/wp-content/uploads/steelseries-apex-pro-tkl-gen-3-white-187x187-fitcontain.png","Razer BlackShark V2 HyperSpeed White": "https://prosettings.net/wp-content/uploads/Razer-BlackShark-V2-HyperSpeed-White-187x187-fitcontain.png","SteelSeries QcK Heavy Black": "https://prosettings.net/wp-content/uploads/steelseries-qck-heavy-187x187-fitcontain.png","Pulsar Susanto-X": "https://prosettings.net/wp-content/uploads/pulsar-susanto-x-187x187-fitcontain.webp","Artisan Ninja FX Zero TenZ": "https://prosettings.net/wp-content/uploads/Artisan-Zero-TenZ-Signature-187x187-fitcontain.png","Alienware AW2523HF": "https://prosettings.net/wp-content/uploads/alienware-aw2523hf-187x187-fitcontain.png","VAXEE PC": "https://prosettings.net/wp-content/uploads/vaxee-pc-187x187-fitcontain.png","Bose QuietComfort 20": "https://prosettings.net/wp-content/uploads/bose-quietcomfort-20-187x187-fitcontain.png","Razer Huntsman V3 Pro TKL Black": "https://prosettings.net/wp-content/uploads/razer-huntsman-v3-pro-tkl-187x187-fitcontain.png","Pulsar eS PD170": "https://prosettings.net/wp-content/uploads/pulsar-es-pd170-187x187-fitcontain.webp","Shure SE215 Clear": "https://prosettings.net/wp-content/uploads/shure-se215-187x187-fitcontain.png","Razer Viper V3 Pro Green": "https://prosettings.net/wp-content/uploads/razer-viper-v3-pro-green-187x187-fitcontain.webp","Razer BlackShark V2 Pro Black": "https://prosettings.net/wp-content/uploads/razer-blackshark-v2-pro-2023-187x187-fitcontain.png","ASUS ROG Falchion Ace HFX Black": "https://prosettings.net/wp-content/uploads/asus-rog-falchion-ace-hfx-187x187-fitcontain.png","Artisan Hayate Otsu V2 Soft Black": "https://prosettings.net/wp-content/uploads/artisan-hayate-otsu-187x187-fitcontain.png","Artisan Ninja FX Zero XSoft Black": "https://prosettings.net/wp-content/uploads/artisan-ninja-fx-zero-xsoft-187x187-fitcontain.png","Logitech G Pro X Superlight Magenta": "https://prosettings.net/wp-content/uploads/logitech-g-pro-x-superlight-magenta-187x187-fitcontain.png","Logitech G Pro X3 SUPERSTRIKE Midnight Black": "https://prosettings.net/wp-content/uploads/Logitech-G-Pro-X3-SUPERSTRIKE-187x187-fitcontain.png","Sennheiser GAME ONE": "https://prosettings.net/wp-content/uploads/sennheiser-game-one-187x187-fitcontain.png","SteelSeries Arctis 7": "https://prosettings.net/wp-content/uploads/steelseries-arctis-7-187x187-fitcontain.png","VAXEE E1 Wireless Fluorescent Green": "https://prosettings.net/wp-content/uploads/vaxee-e1-wireless-fluorescent-green-187x187-fitcontain.webp","VAXEE NP-01S Pink": "https://prosettings.net/wp-content/uploads/vaxee-np-01s-pink-187x187-fitcontain.png","X-raypad Aqua Speed": "https://prosettings.net/cdn-cgi/image/dpr=1%2Cf=auto%2Cfit=contain%2Cheight=187%2Cq=85%2Cwidth=187/wp-content/uploads/X-Raypad-Aqua-Speed.png","ZOWIE H-SR-SE BLUE II": "https://prosettings.net/wp-content/uploads/zowie-g-sr-se-blue-ii-187x187-fitcontain.webp","ZOWIE EC2-CW": "https://prosettings.net/wp-content/uploads/zowie-ec2-cw-187x187-fitcontain.png"};
const imgOf=n=>{const k=Object.keys(GEAR_IMG).find(x=>norm(x)===norm(n||""));return k?GEAR_IMG[k]:""};
const gearOf=n=>{const k=Object.keys(VCT_GEAR).find(x=>norm(x)===norm(n));return k?VCT_GEAR[k]:[]};
const GEAR_BRAND={ZOWIE:"BenQ ZOWIE",Zowie:"BenQ ZOWIE",Logitech:"Logitech G",SONY:"Sony",Fnatic:"Lamzu",WLMOUSE:"WLMouse",Custom:"อื่น ๆ"};
const brandOf=g=>{const w=g.split(" ")[0];return GEAR_BRAND[w]||w};
/* เพิ่มอุปกรณ์: เลือกทีม แล้วนักแข่งทุกคนพร้อมอุปกรณ์ขึ้นมาครบ ติ๊กแล้วกดเพิ่มทีเดียว */
function teamGearHtml(tid){
 if(!tid)return'<p class="agnone">เลือกทีมแล้วนักแข่งและอุปกรณ์จะขึ้นมาครบ</p>';
 const t=S.teams.find(x=>x.id===tid),ps=S.players.filter(p=>p.team===tid);
 if(!ps.length)return'<p class="agnone">ทีมนี้ยังไม่มีนักแข่งในระบบ</p>';
 return ps.map(p=>{const gs=gearOf(p.name);
  return`<div class="tagp"><div class="tagh"><span class="taf">${faceSvg(p.name,t?t.name:"")}</span><b>${esc(p.name)}</b><small>${esc(p.role||"")}</small></div>${gs.length?gs.map(([ty,n])=>{const has=S.gear.some(g=>g.owner===p.id&&norm(g.name)===norm(n));
   return`<label class="tarow sm ${has?"has":""}"><input type="checkbox" class="tg-pick" data-owner="${esc(p.id)}" data-type="${esc(ty)}" value="${esc(n)}" ${has?"disabled":"checked"}><span class="tgt" style="--c:${TC[ty]||"#9a9aa2"}">${GI[ty]||"🎮"} ${esc(ty)}</span><span class="tan"><b>${esc(n)}</b>${has?"<small>มีในระบบแล้ว</small>":""}</span></label>`}).join(""):'<p class="agnone">ยังไม่มีข้อมูลอุปกรณ์ของนักแข่งคนนี้</p>'}</div>`}).join("");
}
function openGearAdd(){
 const f=document.getElementById("f");
 f.innerHTML=`<h2>เพิ่มอุปกรณ์</h2><label for="tg_team">ทีม</label><select id="tg_team"><option value="">— เลือกทีม —</option>${S.teams.filter(t=>S.players.some(p=>p.team===t.id)).map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("")}</select>
 <div id="tg_list" class="talist">${teamGearHtml("")}</div><div id="err" style="color:var(--loss);font-size:14px;margin-top:8px" role="alert"></div>
 <div class="foot"><button class="btn g" type="button" id="cx">ยกเลิก</button><button class="btn" type="button" id="ok">เพิ่มอุปกรณ์ที่เลือก</button></div>`;
 document.getElementById("cx").onclick=()=>dlg.close();
 document.getElementById("ok").onclick=async()=>{
  if(saving)return;
  const picks=[...f.querySelectorAll(".tg-pick:checked")];
  if(!document.getElementById("tg_team").value)return err("กรุณาเลือกทีม");
  if(!picks.length)return err("ยังไม่ได้เลือกอุปกรณ์");
  const btn=document.getElementById("ok");btn.disabled=true;let i=0;
  for(const x of picks){
   btn.textContent=`กำลังเพิ่ม ${++i}/${picks.length}…`;
   const error=await saveRecord("gear",{name:x.value,brand:brandOf(x.value),type:x.dataset.type,owner:x.dataset.owner,status:"พร้อมใช้",cost:0,bought:"",serial:"",note:"",img:imgOf(x.value)});
   if(error){btn.disabled=false;btn.textContent="เพิ่มอุปกรณ์ที่เลือก";render();return err(error)}
  }
  dlg.close();render();
 };
 dlg.showModal();document.getElementById("tg_team").focus();
}

/* เพิ่มรุ่นเข้าคลัง: เลือกประเภท แล้วรุ่นที่โปรใช้จริงขึ้นมาครบ ติ๊กแล้วกดเพิ่มทีเดียว */
const GEAR_MODELS=(()=>{const m=new Map();for(const[pn,gs]of Object.entries(VCT_GEAR))for(const[ty,n]of gs){const k=norm(n);if(!m.has(k))m.set(k,{name:n,type:ty,brand:brandOf(n),users:[]});m.get(k).users.push(pn)}
 return[...m.values()].sort((a,b)=>b.users.length-a.users.length||a.name.localeCompare(b.name))})();
function libListHtml(ty){
 const ms=GEAR_MODELS.filter(g=>!ty||g.type===ty);
 return Object.keys(TC).filter(t=>!ty||t===ty).map(t=>{const rs=ms.filter(g=>g.type===t);if(!rs.length)return"";
  return`<div class="tagp"><div class="tagh"><b style="color:${TC[t]}">${GI[t]||"🎮"} ${esc(t)}</b><small>${rs.length} รุ่น</small></div>${rs.map(g=>{const has=S.lib.some(l=>norm(l.name)===norm(g.name));
   return`<label class="tarow sm ${has?"has":""}"><input type="checkbox" class="tl-pick" data-type="${esc(g.type)}" data-brand="${esc(g.brand)}" value="${esc(g.name)}" ${has?"disabled":"checked"}><span class="tgt" style="--c:#9a9aa2">${esc(g.brand)}</span><span class="tan"><b>${esc(g.name)}</b><small>${has?"มีในคลังแล้ว":`โปรใช้ ${g.users.length} คน · ${esc(g.users.slice(0,4).join(", "))}${g.users.length>4?" …":""}`}</small></span></label>`}).join("")}</div>`}).join("");
}
function openLibAdd(pt){
 const ty=TC[pt]?pt:"";
 const f=document.getElementById("f");
 f.innerHTML=`<h2>เพิ่มรุ่นอุปกรณ์</h2><label for="tl_type">ประเภท</label><select id="tl_type"><option value="">ทุกประเภท</option>${Object.keys(TC).map(t=>`<option ${t===ty?"selected":""}>${esc(t)}</option>`).join("")}</select>
 <div id="tl_list" class="talist">${libListHtml(ty)}</div><div id="err" style="color:var(--loss);font-size:14px;margin-top:8px" role="alert"></div>
 <div class="foot"><button class="btn g" type="button" id="cx">ยกเลิก</button><button class="btn" type="button" id="ok">เพิ่มรุ่นที่เลือก</button></div>`;
 document.getElementById("cx").onclick=()=>dlg.close();
 document.getElementById("ok").onclick=async()=>{
  if(saving)return;
  const picks=[...f.querySelectorAll(".tl-pick:checked")];
  if(!picks.length)return err("ยังไม่ได้เลือกรุ่น");
  const btn=document.getElementById("ok");btn.disabled=true;let i=0;
  for(const x of picks){
   btn.textContent=`กำลังเพิ่ม ${++i}/${picks.length}…`;
   const error=await saveRecord("lib",{name:x.value,brand:x.dataset.brand,type:x.dataset.type,img:imgOf(x.value)});
   if(error){btn.disabled=false;btn.textContent="เพิ่มรุ่นที่เลือก";render();return err(error)}
  }
  dlg.close();render();
 };
 dlg.showModal();document.getElementById("tl_type").focus();
}


const libUsers=l=>S.gear.filter(g=>norm(g.name)===norm(l.name)).map(g=>S.players.find(p=>p.id===g.owner)).filter(Boolean);
const libTeams=l=>{const m=new Map();for(const p of libUsers(l)){const t=S.teams.find(x=>x.id===p.team);if(!t)continue;if(!m.has(t.id))m.set(t.id,{t,ps:[]});m.get(t.id).ps.push(p)}return[...m.values()].sort((a,b)=>b.ps.length-a.ps.length)};
/* ดูรายละเอียดรุ่นในคลัง (ดูอย่างเดียว) */
function openLibView(id){
 const l=S.lib.find(x=>x.id===id);if(!l)return;
 const u=l.img||imgOf(l.name),us=libUsers(l),tms=libTeams(l);
 const f=document.getElementById("f");
 f.innerHTML=`<h2>${esc(l.name)}</h2><div class="gpvbox">${u?`<img class="gpv" src="${esc(u)}" alt="${esc(l.name)}" onerror="this.outerHTML='<span class=agnone>ยังไม่มีรูปของรุ่นนี้</span>'">`:'<span class="agnone">ยังไม่มีรูปของรุ่นนี้</span>'}</div>
 <dl class="lview"><dt>ยี่ห้อ</dt><dd>${esc(l.brand||"-")}</dd><dt>ประเภท</dt><dd>${GI[l.type]||"🎮"} ${esc(l.type)}</dd><dt>ใช้โดย</dt><dd>${us.length} คน · ${tms.length} ทีม</dd></dl>
 <h3 class="lvh">ทีมที่ใช้</h3><div class="lvteams">${tms.length?tms.map(({t,ps})=>`<a class="lvt" href="/teams?id=${encodeURIComponent(t.id)}">${tLogoHtml(t.name,"t-logo sm")}<span><b>${esc(t.name)}</b><small>${ps.map(p=>esc(p.name)).join(", ")}</small></span></a>`).join(""):'<p class="agnone">ยังไม่มีทีมที่ใช้รุ่นนี้</p>'}</div>
 <div class="foot"><button class="btn" type="button" id="cx">ปิด</button></div>`;
 document.getElementById("cx").onclick=()=>dlg.close();
 dlg.showModal();document.getElementById("cx").focus();
}

/* หน้าทีม: กดอุปกรณ์แล้วเลือกรุ่นใหม่ได้เลย */
function gearChoices(ty){const m=new Map();for(const g of GEAR_MODELS)if(g.type===ty)m.set(norm(g.name),{name:g.name,brand:g.brand,n:g.users.length});
 for(const l of S.lib)if(l.type===ty&&!m.has(norm(l.name)))m.set(norm(l.name),{name:l.name,brand:l.brand,n:0});return[...m.values()]}
function openGearPick(gid,nw){
 if(role!=="admin"||saving)return;const g=gid?S.gear.find(x=>x.id===gid):{name:"",type:nw.type,owner:nw.owner,status:"พร้อมใช้",cost:0,bought:"",serial:"",note:""};if(!g)return;
 const o=S.players.find(p=>p.id===g.owner),cs=gearChoices(g.type),f=document.getElementById("f");
 const list=qq=>cs.filter(c=>!qq||c.name.toLowerCase().includes(qq.toLowerCase())).map(c=>{const u=(S.lib.find(l=>norm(l.name)===norm(c.name))||{}).img||imgOf(c.name),cur=norm(c.name)===norm(g.name);
  return`<button type="button" class="gpk ${cur?"on":""}" data-gpk="${esc(c.name)}" data-br="${esc(c.brand)}" ${cur?"disabled":""}><span class="tdgim">${u?`<img src="${esc(u)}" alt="" loading="lazy" onerror="this.outerHTML='${GI[g.type]||"🎮"}'">`:(GI[g.type]||"🎮")}</span><b>${esc(c.name)}</b><small>${cur?"ใช้อยู่ตอนนี้":`${esc(c.brand)}${c.n?` · โปรใช้ ${c.n} คน`:""}`}</small></button>`}).join("")||'<p class="agnone">ไม่พบรุ่นที่ค้นหา</p>';
 f.innerHTML=`<h2>${gid?"เปลี่ยน":"เพิ่ม"}${esc(g.type)} · ${esc(o?o.name:"")}</h2><input id="gpq" type="search" placeholder="ค้นหารุ่น" aria-label="ค้นหารุ่น"><div id="gpl" class="gpgrid">${list("")}</div><div id="err" style="color:var(--loss);font-size:14px;margin-top:8px" role="alert"></div><div class="foot"><button class="btn g" type="button" id="cx">ยกเลิก</button><button class="btn" type="button" id="grnd">🎲 สุ่ม</button></div>`;
 document.getElementById("cx").onclick=()=>dlg.close();
 document.getElementById("grnd").onclick=()=>{const o=cs.filter(c=>norm(c.name)!==norm(g.name)),c=o[Math.floor(Math.random()*o.length)];const b=c&&document.querySelector(`#gpl [data-gpk="${CSS.escape(c.name)}"]`);if(b)b.click();else if(c){document.getElementById("gpq").value="";document.getElementById("gpl").innerHTML=list("");const b2=document.querySelector(`#gpl [data-gpk="${CSS.escape(c.name)}"]`);if(b2)b2.click()}};
 document.getElementById("gpq").oninput=e=>{document.getElementById("gpl").innerHTML=list(e.target.value.trim())};
 document.getElementById("gpl").onclick=async e=>{const b=e.target.closest("[data-gpk]");if(!b||saving)return;
  document.querySelectorAll("#gpl .gpk").forEach(x=>x.disabled=true);b.querySelector("small").textContent="กำลังบันทึก…";
  const n=b.dataset.gpk,error=await saveRecord("gear",{...g,name:n,brand:b.dataset.br||brandOf(n),img:(S.lib.find(l=>norm(l.name)===norm(n))||{}).img||imgOf(n)});
  if(error){render();return err(error)}dlg.close();render()};
 dlg.showModal();document.getElementById("gpq").focus();
}

/* สุ่ม / ล้าง Gear */
const randGear=ty=>{const cs=gearChoices(ty);return cs.length?cs[Math.floor(Math.random()*cs.length)]:null};
const gearRec=(owner,ty,c)=>({name:c.name,brand:c.brand||brandOf(c.name),type:ty,owner,status:"พร้อมใช้",cost:0,bought:"",serial:"",note:"",img:(S.lib.find(l=>norm(l.name)===norm(c.name))||{}).img||imgOf(c.name)});
const ownersOf=key=>key.startsWith("team:")?S.players.filter(p=>p.team===key.slice(5)).map(p=>p.id):[key];
async function gearRandom(key,onlyType){
 if(role!=="admin"||saving)return;const jobs=[];
 for(const pid of ownersOf(key))for(const ty of onlyType?[onlyType]:Object.keys(TC))if(!S.gear.some(g=>g.owner===pid&&g.type===ty))jobs.push([pid,ty]);
 if(!jobs.length)return;
 for(const[pid,ty]of jobs){const c=randGear(ty);if(!c)continue;const error=await saveRecord("gear",gearRec(pid,ty,c));if(error){render();return showError(error)}}
 render();
}
async function gearClear(key){
 if(role!=="admin"||saving)return;const os=ownersOf(key),ids=S.gear.filter(g=>os.includes(g.owner)).map(g=>g.id);if(!ids.length)return;
 const who=key.startsWith("team:")?"ทั้งทีม":(S.players.find(p=>p.id===key)||{}).name||"";
 if(!confirm(`ล้าง Gear ของ ${who} ทั้งหมด ${ids.length} ชิ้นใช่ไหม?`))return;
 const error=await deleteRecords("gear",ids);if(error)return showError(error);render();
}

/* หน้าคลัง: เลือกทีมแล้วดึงข้อมูล / สุ่ม / ล้าง Gear ของทั้งทีม */
let LTEAM="";
function libTeamBar(){
 const ts=S.teams.filter(t=>S.players.some(p=>p.team===t.id));if(!ts.length)return"";
 if(!ts.some(t=>t.id===LTEAM))LTEAM=ts[0].id;
 const t=ts.find(x=>x.id===LTEAM),ps=S.players.filter(p=>p.team===LTEAM),tot=ps.length*Object.keys(TC).length;
 const have=ps.reduce((a,p)=>a+Object.keys(TC).filter(ty=>S.gear.some(g=>g.owner===p.id&&g.type===ty)).length,0);
 const real=ps.reduce((a,p)=>a+gearOf(p.name).filter(([ty])=>!S.gear.some(g=>g.owner===p.id&&g.type===ty)).length,0);
 return`<div class="wrap"><section class="ltbar"><div class="ltl">${tLogoHtml(t.name,"t-logo sm")}<label for="lt_team">Gear ของทีม</label><select id="lt_team">${ts.map(x=>`<option value="${esc(x.id)}" ${x.id===LTEAM?"selected":""}>${esc(x.name)}</option>`).join("")}</select>
  <small>มีอุปกรณ์ ${have}/${tot} ช่อง · <a href="/teams?id=${encodeURIComponent(t.id)}">ดูหน้าทีม</a></small></div>
  <div class="ltb"><button type="button" class="btn" data-greal="team:${esc(t.id)}" ${real?"":"disabled"} title="ใส่อุปกรณ์จริงของนักแข่ง (prosettings.net) ในช่องที่ว่าง">📥 ดึงข้อมูลจริง${real?` (${real})`:""}</button><button type="button" class="btn g" data-grand="team:${esc(t.id)}" ${have<tot?"":"disabled"}>🎲 สุ่มช่องที่ว่าง</button><button type="button" class="btn g" data-gclr="team:${esc(t.id)}" ${have?"":"disabled"}>ล้าง Gear ทั้งทีม</button></div></section></div>`;
}
async function gearReal(key){
 if(role!=="admin"||saving)return;const jobs=[];
 for(const pid of ownersOf(key)){const p=S.players.find(x=>x.id===pid);if(!p)continue;for(const[ty,n]of gearOf(p.name))if(!S.gear.some(g=>g.owner===pid&&g.type===ty))jobs.push([pid,ty,n])}
 for(const[pid,ty,n]of jobs){const error=await saveRecord("gear",gearRec(pid,ty,{name:n,brand:brandOf(n)}));if(error){render();return showError(error)}}
 render();
}

/* หน้าทีม: ช่อง Gear ที่ว่าง สุ่มให้อัตโนมัติ */
const AUTO_GEAR=new Set();let autoBusy=false;
function runAutoGear(){if(tab==="lib"&&!spreadBusy)setTimeout(spreadUnused,0);if(autoBusy||saving||!AUTO_GEAR.size)return;const id=[...AUTO_GEAR][0];AUTO_GEAR.clear();autoBusy=true;
 setTimeout(async()=>{try{await gearRandom("team:"+id)}finally{autoBusy=false}},0)}

/* คลัง: รุ่นที่ยังไม่มีคนใช้ สุ่มให้นักแข่งสักคนอัตโนมัติ (ผู้ดูแล) */
let spreadBusy=false;
async function spreadUnused(){
 if(role!=="admin"||saving||spreadBusy||!S)return;
 const used=n=>S.gear.filter(g=>norm(g.name)===norm(n)).length;
 const todo=S.lib.filter(l=>!used(l.name));if(!todo.length)return;
 spreadBusy=true;
 try{for(const l of todo){
  if(used(l.name))continue;
  const isReal=g=>{const p=S.players.find(x=>x.id===g.owner);return p&&gearOf(p.name).some(([ty,n])=>ty===g.type&&norm(n)===norm(g.name))};
  const dup=S.gear.filter(g=>g.type===l.type&&S.players.some(p=>p.id===g.owner)&&used(g.name)>1);
  const pool=dup.filter(g=>!isReal(g)).length?dup.filter(g=>!isReal(g)):dup;if(!pool.length)continue;
  const g=pool[Math.floor(Math.random()*pool.length)];
  const error=await saveRecord("gear",{...g,name:l.name,brand:l.brand||brandOf(l.name),img:l.img||imgOf(l.name)});if(error)break;
 }}finally{spreadBusy=false}
 render();
}

function openForm(id,pre){
 if(role!=="admin"||saving)return;
 const e=E[tab],r=id?S[tab].find(x=>x.id===id):{...(pre||{})};
 FORM_ID=id||null;FORM_PRE=id?{}:(pre||{});
 if(tab==="players"&&!id)return openTeamAdd(pre);
 if(tab==="gear"&&!id)return openGearAdd();
 if(tab==="lib"&&!id)return openLibAdd((pre||{}).type);
 if(tab==="lib"&&id)return openLibView(id);
 if(tab==="results"&&id&&isRealTour(r&&r.tour))return;
 if(tab==="results"&&!S.tours.some(t=>!isRealTour(t.id))){alert("ผลของ VALORANT Champions ระบบใส่ให้ตามผลจริงแล้ว\nถ้าจะบันทึกผลเอง ให้เพิ่มรายการใหม่ที่หน้า \"รายการแข่ง\" ก่อน");return}
 if(tab==="teams"&&!id&&!teamChoices().length){alert(FORM_PRE.region?"ทีมของลีกนี้ในรายการถูกเพิ่มครบแล้ว":"ทีมในรายการถูกเพิ่มครบแล้ว");return}
 if(!r)return;
 const f=document.getElementById("f");
 f.innerHTML=`<h2>${id?"แก้ไข":e.add}</h2>${e.cols.map(c=>field(c,r[c[0]])).join("")}<div id="err" style="color:var(--loss);font-size:14px;margin-top:8px" role="alert"></div><div class="foot"><button class="btn g" type="button" id="cx">ยกเลิก</button><button class="btn" type="button" id="ok">บันทึก</button></div>`;
 if(tab==="lib"||tab==="gear")for(const k of["name","brand","type"]){const el=document.getElementById("f_"+k);if(el){el.disabled=true;el.title="ตามข้อมูลจริง แก้ไขไม่ได้"}}
 if(tab==="lib"||tab==="gear"){const nm=document.getElementById("f_name"),pv=document.getElementById("pv_img"),pn=document.getElementById("pvn_img"),old=r.img||"";
  const upd=()=>{const u=imgOf(nm.value)||old;IMG.img=u;if(u){pv.src=u;pv.hidden=false;pn.hidden=true}else{pv.hidden=true;pn.hidden=false}};
  pv.onerror=()=>{pv.hidden=true;pn.hidden=false};nm.addEventListener("input",upd);upd()}
 if(tab==="tours"){const nm=document.getElementById("f_name"),cu=document.getElementById("f_custom"),cw=document.getElementById("f_cwrap"),pl=document.getElementById("f_place");
  const sync=first=>{const own=nm.value===OWN;cw.hidden=!own;pl.disabled=!own;pl.title=own?"":"ตามรายการที่แข่ง แก้ไขไม่ได้";
   if(own){if(!first){pl.value="";document.getElementById("f_start").value="";document.getElementById("f_prize").value=""}cu.focus()}
   else if(!first||!id)champFill(nm.value);else{const m=VCT_CHAMPS.find(x=>x[0]===nm.value);if(m)pl.value=m[2]}};
  sync(true);nm.addEventListener("change",()=>sync(false))}
 if(tab==="results"){const tr=document.getElementById("f_tour"),dt=document.getElementById("f_date"),hint=document.createElement("div");
  hint.id="f_dhint";hint.style.cssText="font-size:12px;color:var(--mute);margin-top:4px";dt.after(hint);
  const lock=()=>{const y=tourYear(tr.value);if(!y){dt.removeAttribute("min");dt.removeAttribute("max");hint.textContent="เลือกรายการแข่งก่อน แล้ววันที่จะล็อกตามปีที่แข่ง";return}
   dt.min=y+"-01-01";dt.max=y+"-12-31";hint.textContent="ล็อกเฉพาะปี "+y+" ตามรายการที่แข่ง";
   if(!dt.value||dt.value.slice(0,4)!==y){const t=S.tours.find(x=>x.id===tr.value);dt.value=t&&t.start?t.start:y+"-01-01"}};
  lock();tr.addEventListener("change",lock)}
 document.getElementById("cx").onclick=()=>dlg.close();
 document.getElementById("ok").onclick=async()=>{
  if(saving)return;
  const invalid=f.querySelector(":invalid");if(invalid){invalid.reportValidity();return}
  const o={...r};if(id)o.id=id;
  for(const c of e.cols){const el=document.getElementById("f_"+c[0]);o[c[0]]=c[2]==="img"?(IMG[c[0]]||""):c[2]==="ag"?pa(el.value):c[2]==="num"?Number(String(el.value||0).replace(/,/g,""))||0:el.value.trim()}
  if(tab==="tours"){o.game="VALORANT";
   if(o.name===OWN){o.name=document.getElementById("f_custom").value.trim();if(!o.name)return err("กรุณากรอกชื่อรายการใหม่");
    if(S.tours.some(t=>t.id!==id&&nrm(t.name)===nrm(o.name)))return err("มีรายการชื่อนี้อยู่แล้ว");
    if(!o.start)return err("กรุณาเลือกวันเริ่มแข่ง")}
   const m=VCT_CHAMPS.find(c=>nrm(c[0])===nrm(o.name));if(m)o.place=m[2]}
  if(tab==="teams"){const m=VCT_TEAMS.find(([n])=>n===o.name);
   if(!m&&!id)return err("เลือกทีมจากรายการเท่านั้น");
   if(m)o.region="VCT "+m[1];}
  const first=e.cols[0];
  if(first[2]==="text"&&!o[first[0]])return err("กรุณากรอก"+first[1]);
  if(tab==="results"){if(!o.tour||!o.a||!o.b)return err("กรุณาเลือกรายการแข่งและทีมทั้งสองฝั่ง");{const y=tourYear(o.tour);if(y&&o.date&&o.date.slice(0,4)!==y)return err("วันที่แข่งต้องอยู่ในปี "+y+" ตามรายการที่แข่ง")}if(o.a===o.b)return err("ทีม A และทีม B ต้องไม่ใช่ทีมเดียวกัน");if(!o.date)return err("กรุณาเลือกวันที่แข่ง")}
  if(tab==="players"){
   syncAg();
   if(!document.getElementById("f_team").value)return err("กรุณาเลือกทีม");
   if(!document.getElementById("f_name").value)return err("กรุณาเลือกนักแข่ง");
   const entries=document.getElementById("f_agents").value.split(";").map(x=>x.trim()).filter(Boolean);
   const valid=entries.every(x=>{const p=x.split(/\s+/);return p.length===5&&p.slice(1).every((n,i)=>(i===1&&n==="-")||/^\d+$/.test(n)&&Number.isSafeInteger(Number(n)))&&true}),okW=entries.every(x=>{const p=x.split(/\s+/);return p[2]==="-"||Number(p[2])<=Number(p[1])});
   if(!valid||!okW)return err("จำนวนชนะต้องไม่เกินจำนวนเกมที่เล่น");
  }
  const btn=document.getElementById("ok");btn.disabled=true;
  if(tab==="players"&&Array.isArray(o.agents))o.agents=o.agents.map(a=>({...a,w:a.w??0}));
  const error=await saveRecord(tab,o);
  btn.disabled=false;
  if(error){if(!role)return showError(error);return err(error)}
  dlg.close();render();
 };
 dlg.showModal();const fi=f.querySelector("input,select");if(fi)fi.focus();
}

function onStart(){
 if(tab==="results"&&QS.get("new")==="1"){history.replaceState(null,"","/results");if(role==="admin")openForm()}
}

/* ---------- เหตุการณ์ ---------- */
function syncSel(){const n=document.querySelectorAll(".rc:checked").length,b=document.getElementById("bd");if(b){b.disabled=!n;b.textContent=n?"ลบที่เลือก ("+n+")":"ลบที่เลือก"}}

document.addEventListener("click",ev=>{
 const lbr=ev.target.closest("[data-lbr]");if(lbr){LBR=lbr.dataset.lbr;render();return}
 const gch=ev.target.closest("[data-gch]");if(gch){openGearPick(gch.dataset.gch);return}
 const gad=ev.target.closest("[data-gadd]");if(gad){gearRandom(gad.dataset.gadd,gad.dataset.gty);return}
 const grd=ev.target.closest("[data-grand]");if(grd){gearRandom(grd.dataset.grand);return}
 const gcl=ev.target.closest("[data-gclr]");if(gcl){gearClear(gcl.dataset.gclr);return}
 const grl=ev.target.closest("[data-greal]");if(grl){gearReal(grl.dataset.greal);return}
 if(ev.target.closest("#agadd")){const w=document.getElementById("agrows");if(w){w.insertAdjacentHTML("beforeend",agRow());syncAg()}return}
 const dl=ev.target.closest("[data-agdel]");if(dl){dl.closest(".agr").remove();syncAg();return}
 if(ev.target.closest("input,label,a,select"))return;
 const b=ev.target.closest("button");
 if(!b){const c=ev.target.closest(".vt[data-e]");if(c)openForm(c.dataset.e);return}
 if(b.dataset.a){let pre={};try{pre=JSON.parse(b.dataset.pre||"{}")}catch(e){}openForm(null,pre)}
 else if(b.dataset.e)openForm(b.dataset.e);
 else if(b.dataset.x)delMany([b.dataset.x]);
 else if(b.dataset.pl!==undefined){pl=b.dataset.pl;pt="";render()}
 else if(b.dataset.gt!==undefined){gt=b.dataset.gt;render()}
 else if(b.id==="seed")seedTeams(b);
 else if(b.id==="seedp")seedPlayers(b);
 else if(b.id==="tdadd")seedTeamPlayers(b,b.dataset.team);
 else if(b.id==="bd")delMany([...document.querySelectorAll(".rc:checked")].map(c=>c.dataset.id));
 else if(b.id==="ri"){IMG[b.dataset.k]="";const pv=document.getElementById("pv_"+b.dataset.k);if(pv){pv.hidden=true;pv.removeAttribute("src")}}
});

let qt;
document.addEventListener("input",ev=>{if(ev.target.id==="f_prize"){const el=ev.target,p=el.selectionStart??el.value.length,nd=el.value.slice(0,p).replace(/[^\d]/g,"").length,v=fmtMoney(el.value);el.value=v;let i=0,c=0;while(i<v.length&&c<nd){if(/\d/.test(v[i]))c++;i++}try{el.setSelectionRange(i,i)}catch(_){}return}if(ev.target.closest&&ev.target.closest("#agrows")){syncAg();return}if(ev.target.id==="q"){q=ev.target.value;if(ev.isComposing)return;clearTimeout(qt);qt=setTimeout(render,120)}});
document.addEventListener("compositionend",ev=>{if(ev.target.id==="q"){q=ev.target.value;render()}});

document.addEventListener("change",ev=>{const t=ev.target;
 if(t.id==="lt_team"){LTEAM=t.value;render();return}
 if(t.id==="tl_type"){const l=document.getElementById("tl_list");if(l)l.innerHTML=libListHtml(t.value);return}
 if(t.id==="tg_team"){const l=document.getElementById("tg_list");if(l)l.innerHTML=teamGearHtml(t.value);return}
 if(t.id==="ta_team"){const l=document.getElementById("ta_list");if(l)l.innerHTML=teamRosterHtml(t.value);return}
 if(tab==="players"&&t.closest&&t.closest("#agrows")){syncAg();return}
 if(tab==="players"&&t.id==="f_team"){const pv=document.getElementById("f_ppv");if(pv)pv.innerHTML=avatarPrev(t.value);const n=document.getElementById("f_name");if(n)n.innerHTML=playerOpts(t.value,"");const r=document.getElementById("f_role");if(r)r.value="";setStats([]);const w=document.getElementById("agrows");if(w)w.innerHTML="";return}
 if(tab==="players"&&t.id==="f_name"){const o=t.selectedOptions[0],tm=document.getElementById("f_team");if(tm&&o&&o.dataset.team)tm.value=o.dataset.team;const pv=document.getElementById("f_ppv");if(pv)pv.innerHTML=avatarPrev(t.value,tm?tm.value:"");const m=rosterOf(document.getElementById("f_team").value).find(([n])=>n===t.value),r=document.getElementById("f_role");if(r){const v=m?m[1]:"";if(v&&![...r.options].some(o=>o.value===v))r.add(new Option(v,v));r.value=v}
  setStats(statsFor(t.value));return}
 if(t.id==="f_lg"&&tab==="teams"){const n=document.getElementById("f_name");if(n)n.innerHTML=teamOpts(t.value,"");const pv=document.getElementById("f_lgpv");if(pv)pv.innerHTML="";return}
 if(t.id==="f_name"&&tab==="teams"){const pv=document.getElementById("f_lgpv");if(pv)pv.innerHTML=logoPrev(t.value);return}
 if(t.id==="pt"){pt=t.value;render();return}
 if(t.id==="ca")document.querySelectorAll(".rc").forEach(c=>c.checked=t.checked);
 if(t.id==="ca"||(t.classList&&t.classList.contains("rc")))syncSel();
 if(t.type==="file"&&t.id.startsWith("f_")&&t.files[0]){
  const k=t.id.slice(2),fr=new FileReader();
  fr.onload=()=>{const im=new Image();im.onload=()=>{const lg=k==="logo",s=Math.min(1,(lg?160:360)/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext("2d").drawImage(im,0,0,c.width,c.height);IMG[k]=lg?c.toDataURL("image/png"):c.toDataURL("image/jpeg",.82);const pv=document.getElementById("pv_"+k);if(pv){pv.src=IMG[k];pv.hidden=false}};im.src=fr.result};
  fr.readAsDataURL(t.files[0]);
 }
});