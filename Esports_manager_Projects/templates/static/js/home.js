"use strict";
/* หน้าภาพรวม (/home) */
function hero(){
 const now=new Date();
 const today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");
 const T=[...S.tours].sort((a,b)=>a.start.localeCompare(b.start));
 if(!T.length)return'<header class="top"><h1>Overview</h1></header>';
 // รายการหลัก = รายการที่มีผลการแข่งล่าสุด (ถ้ายังไม่มีผลเลย ใช้รายการที่กำลังจะมาถึง)
 const last=[...playedResults()].filter(r=>T.some(t=>t.id===r.tour)).sort((a,b)=>String(b.date).localeCompare(String(a.date))||S.results.indexOf(b)-S.results.indexOf(a))[0];
 const cur=(last&&T.find(t=>t.id===last.tour))||T.find(t=>t.start&&t.start>=today)||[...T].reverse().find(t=>t.start)||T[0];
 const mon=d=>d?new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short"}).toUpperCase():"";
 // ชื่อสั้นบนไทม์ไลน์: "VALORANT Champions Berlin 2021" → "Berlin" (ปีย้ายไปอยู่บรรทัดเดือน)
 const short=n=>{const x=String(n).replace(/^VALORANT\s+/i,"").replace(/^Champions\s+/i,"").replace(/\s*\b(19|20)\d{2}\b\s*/g," ").trim();return x||n};
 const yr=d=>d?d.slice(0,4):"";
 const tl=T.map(t=>{const s=t===cur?"now":t.start&&t.start<today?"done":"next";
  return`<a class="tl ${s}" href="/bracket?t=${encodeURIComponent(t.id)}" title="${esc(t.name)}${t.place?" · "+esc(t.place):""}" style="color:inherit;text-decoration:none"><small>${t.start===today?"วันนี้":t.start?mon(t.start)+" "+yr(t.start):"ยังไม่กำหนดวัน"}</small><b>${esc(short(t.name))}</b><i>${s==="done"?"✓":""}</i></a>`}).join("");
 const top=standings(S.results.filter(r=>r.tour===cur.id)).find(t=>t.p>0)||standings().find(t=>t.p>0);
 let card=top?`<div class="hcw">${tLogoHtml(top.n,"t-logo hclg")}<div><b>${esc(top.n)}</b><span style="display:block">คะแนนรวมสูงสุด</span></div></div>`:`<b>—</b><span>คะแนนรวมสูงสุด</span>`;
 if(last&&last.tour===cur.id){const A=nm("teams",last.a),B=nm("teams",last.b),aw=last.sa>last.sb,dr=last.sa===last.sb,W=aw?A:B,L=aw?B:A,ws=Math.max(last.sa,last.sb),ls=Math.min(last.sa,last.sb);
  card=dr?`<b>${esc(A)} ${last.sa}-${last.sb} ${esc(B)}</b><span style="display:block">ผลนัดล่าสุด · ${fd(last.date)}</span>`
   :`<div class="hcw">${tLogoHtml(W,"t-logo hclg")}<div><b>${esc(W)}</b><span style="display:block">ชนะนัดล่าสุด ${ws}-${ls} ${esc(L)} ${tLogoHtml(L,"t-logo hcsm")} · ${fd(last.date)}</span></div></div>`;
  if(top)card+=`<span style="display:block;margin-top:6px;opacity:.8">คะแนนสูงสุดในรายการ: ${tLogoHtml(top.n,"t-logo hcsm")} ${esc(top.n)} (${top.pt} แต้ม)</span>`}
 return`<style>.hcw{display:flex;align-items:center;gap:14px}.hclg{width:56px;height:56px;flex:none;object-fit:contain;font-size:18px}.hcsm{width:20px;height:20px;vertical-align:-5px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;object-fit:contain}.hcsm.lgw{padding:1px;border-radius:4px}.tls a.tl{cursor:pointer;transition:background .15s}.tls a.tl:hover{background:rgba(255,255,255,.05)}.tls a.tl:focus-visible{outline:2px solid #f2b705;outline-offset:-2px}.tls a.tl small{letter-spacing:.06em}.tls a.tl b{font-size:15px}</style><div class="tls">${tl}</div><div class="hero"><div><h1>${esc(cur.name)}</h1>${cur.place?`<span class="ptag">${esc(cur.place)}</span>`:""}</div><div class="hcard">${card}</div></div>`;
}

const hb=rows=>{const mx=Math.max(1,...rows.map(r=>r.v));return rows.map(r=>`<div class="hb"><span class="hl" title="${esc(r.l)}">${esc(r.l)}</span><div class="ht"><i style="width:${Math.max(3,r.v/mx*100)}%;${r.c?"background:"+r.c:""}"></i></div><b>${r.t!==undefined?r.t:r.v}</b></div>`).join("")};

function charts(st){
 const act=st.filter(t=>t.p>0).slice(0,8);
 const wl=act.map(t=>`<div class="hb"><span class="hl" title="${esc(t.n)}">${esc(t.n)}</span><div class="ht st" role="img" aria-label="ชนะ ${t.w} เสมอ ${t.d} แพ้ ${t.l}">${t.w?`<i class="sw" style="flex:${t.w}"></i>`:""}${t.d?`<i class="sd" style="flex:${t.d}"></i>`:""}${t.l?`<i class="sl" style="flex:${t.l}"></i>`:""}</div><b>${t.w}-${t.d}-${t.l}</b></div>`).join("");
 const AG={};S.players.forEach(p=>(p.agents||[]).forEach(a=>AG[a.n]=(AG[a.n]||0)+a.g));
 const ags=Object.entries(AG).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([n,v])=>({l:n,v,t:v+" เกม"}));
 const GT={};S.gear.forEach(g=>GT[g.type]=(GT[g.type]||0)+1);
 const gts=Object.entries(GT).sort((a,b)=>b[1]-a[1]).map(([n,v])=>({l:n,v,c:TC[n]||"#9a9aa2"}));
 const cnt=s=>S.gear.filter(g=>g.status===s).length;
 const no=m=>`<p class="nodata">${m}</p>`;
 return`<div class="more"><span>สถิติและกราฟ</span></div><div class="cg">
 <div class="cc"><h3>ผลงานทีม</h3>${act.length?wl+`<p class="lgd"><span><i style="background:var(--win)"></i>ชนะ</span><span><i style="background:var(--draw)"></i>เสมอ</span><span><i style="background:var(--loss)"></i>แพ้</span></p>`:no("ยังไม่มีผลการแข่ง")}</div>
 <div class="cc"><h3>ตัวละครยอดนิยม</h3>${ags.length?hb(ags):no("ยังไม่มีสถิติตัวละคร")}</div>
 <div class="cc"><h3>อุปกรณ์ตามประเภท</h3>${gts.length?hb(gts)+`<p class="lgd"><span><i style="background:var(--win)"></i>พร้อมใช้ ${cnt("พร้อมใช้")}</span><span><i style="background:var(--draw)"></i>ส่งซ่อม ${cnt("ส่งซ่อม")}</span><span><i style="background:var(--loss)"></i>สูญหาย ${cnt("สูญหาย")}</span></p>`:no("ยังไม่มีอุปกรณ์")}</div></div>`;
}

function view(){
 const st=standings().filter(t=>t.p>0),rec=[...S.results].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
 const stats=[["ทีม",S.teams.length],["นักแข่ง",S.players.length],["อุปกรณ์ที่พร้อมใช้",S.gear.filter(g=>g.status==="พร้อมใช้").length+"/"+S.gear.length],["รายการแข่ง",S.tours.length],["แมตช์ที่แข่งแล้ว",playedResults().length]];
 return`${hero()}
 <div class="stats">${stats.map(s=>`<div class="stat"><b>${s[1]}</b><span>${s[0]}</span></div>`).join("")}</div>
 ${S.teams.length?`<div class="more"><span>ทีมพาร์ทเนอร์</span></div><p class="tsum"><b>${S.teams.length}</b> ทีม // <b>${new Set(S.teams.map(leagueOf).filter(Boolean)).size}</b> พื้นที่</p>${teamsByLeague(S.teams,{tools:false})}`:""}
 <div class="more"><span>ตารางคะแนนและผลล่าสุด</span></div><div class="grid2"><div><h2>ตารางคะแนนรวม</h2><p class="sub">รวมผลทุกการแข่งขันที่บันทึกไว้ ชนะ 3 แต้ม เสมอ 1 แต้ม แพ้ 0 แต้ม</p><div class="wrap">${st.length?rankList(st):'<div class="empty">ยังไม่มีผลการแข่งสำหรับจัดอันดับ</div>'}</div></div>
 <div><h2>ผลล่าสุด</h2><div class="wrap">${rec.length?`<table><tr><th>ทีม A</th><th>สกอร์</th><th>ทีม B</th><th>รายการ</th></tr>${rec.map(resRow).join("")}</table>`:'<div class="empty">ยังไม่มีผลการแข่ง</div>'}</div></div></div>${charts(st)}`;
}