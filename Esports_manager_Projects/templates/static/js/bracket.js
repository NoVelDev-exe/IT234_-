"use strict";
/* หน้าผลการแข่งขันตามรายการ (/bracket?t=...) */
let bt=QS.get("t")||"";
// แชมป์จริงของ VALORANT Champions แต่ละปี
// แชมป์จริงของ VALORANT Champions แต่ละปี: [แชมป์, รองแชมป์, สกอร์แชมป์, สกอร์รอง, วันนัดชิง]
const CHAMP_FINAL={"valorant champions istanbul 2022":["LOUD","OpTic Gaming",3,1,"2022-09-18"],"valorant champions los angeles 2023":["Evil Geniuses","Paper Rex",3,1,"2023-08-26"],"valorant champions seoul 2024":["EDWARD Gaming","Team Heretics",3,2,"2024-08-25"],"valorant champions paris 2025":["NRG","FNATIC",3,2,"2025-10-05"],"valorant champions shanghai 2026":["LOUD","Team Vitality",3,1,"2026-10-18"]};
const CHAMP_REAL=Object.fromEntries(Object.entries(CHAMP_FINAL).map(([k,v])=>[k,v[0]]));
const lc=x=>String(x||"").trim().toLowerCase();

const BK_CSS=`<style>
.bchamp{position:relative;display:flex;align-items:center;gap:18px;margin:14px 0 18px;padding:18px 22px;border-radius:14px;border:2px solid #f2b705;
 background:linear-gradient(120deg,rgba(242,183,5,.18),rgba(242,183,5,.04) 55%,rgba(229,72,77,.10));box-shadow:0 0 0 1px rgba(242,183,5,.25),0 8px 30px rgba(242,183,5,.18)}
.bchamp .bclg{width:72px;height:72px;flex:none;object-fit:contain;font-size:22px}
.bchamp small{display:block;color:#f2b705;font-weight:800;letter-spacing:.12em;font-size:12px}
.bchamp b{display:block;font-size:26px;line-height:1.2}
.bchamp span{display:block;color:var(--mute,#a1a1aa);font-size:13px;margin-top:2px}
.bchamp .bclg.mono{display:flex;align-items:center;justify-content:center;border-radius:50%;background:radial-gradient(circle at 30% 30%,#ffe08a,#c98a00);color:#2a1d00;font-weight:900;font-size:24px;box-shadow:0 0 0 3px rgba(242,183,5,.35)}
.bchamp .bcsm{width:18px;height:18px;vertical-align:-4px;object-fit:contain;display:inline-flex;align-items:center;justify-content:center;font-size:8px;border-radius:4px}
.bchamp .bctag{display:inline-block;margin-top:8px;font-style:normal;font-size:11px;color:#f2b705;border:1px solid rgba(242,183,5,.4);border-radius:999px;padding:2px 10px}
.bchamp .bcup{margin-left:auto;font-size:44px;filter:drop-shadow(0 4px 10px rgba(242,183,5,.5))}
.mt .tlg{width:20px;height:20px;flex:none;object-fit:contain;font-size:9px;margin-right:8px;vertical-align:middle}
.mt .tlg.lgw{padding:1px;border-radius:4px}
.mt span{display:flex;align-items:center;min-width:0}
.mt.champ{box-shadow:inset 0 0 0 2px #f2b705;background:linear-gradient(90deg,rgba(242,183,5,.22),rgba(242,183,5,.06));border-radius:6px}
.mt.champ span::after{content:"🏆";margin-left:6px;font-size:13px}
.mt.champ.silver{box-shadow:inset 0 0 0 2px #c0c6d0;background:linear-gradient(90deg,rgba(192,198,208,.18),rgba(192,198,208,.04))}
.mt.champ.silver span::after{content:"🥈"}
.bchamp.silver{border-color:#c0c6d0;background:linear-gradient(120deg,rgba(192,198,208,.16),rgba(192,198,208,.03) 55%,rgba(229,72,77,.08));box-shadow:0 0 0 1px rgba(192,198,208,.25),0 8px 30px rgba(192,198,208,.12)}
.bchamp.silver small,.bchamp.silver .bctag{color:#d6dbe3;border-color:rgba(192,198,208,.4)}
.mc.final{position:relative;overflow:visible;outline:2px solid #f2b705;outline-offset:2px;border-radius:8px;box-shadow:0 0 18px rgba(242,183,5,.25)}
.mc .fl{position:absolute;top:-13px;left:50%;transform:translateX(-50%);z-index:2;white-space:nowrap;font-size:10px;font-weight:800;letter-spacing:.08em;color:#111;background:#f2b705;border-radius:999px;padding:1px 10px;line-height:16px}
.bk{padding-top:6px}
.bh.fd{border-color:#f2b705}.bh.fd small{color:#f2b705}
@media (max-width:600px){.bchamp{padding:14px}.bchamp b{font-size:20px}.bchamp .bclg{width:52px;height:52px}.bchamp .bcup{font-size:32px}}
</style>`;

function view(){
 const now=(d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-"))(new Date());
 // เรียงรายการใหม่สุดก่อน
 const T=[...S.tours].sort((a,b)=>String(b.start).localeCompare(String(a.start)));
 const H=phero("ผลตามรายการ",`<b>${T.length}</b> รายการ // <b>${playedResults().length}</b> แมตช์ที่แข่งแล้ว`,role==="admin"?'<a class="btn" href="/results?new=1">บันทึกผล</a>':"");
 if(!T.length)return H+'<div class="wrap"><div class="empty">ยังไม่มีรายการแข่ง</div></div>';
 if(!T.find(t=>t.id===bt))bt=(T.find(t=>S.results.some(r=>r.tour===t.id&&(!r.date||r.date<=now)))||T[0]).id;
 const tr=T.find(t=>t.id===bt),ms=S.results.filter(r=>r.tour===bt).sort((a,b)=>String(b.date).localeCompare(String(a.date))||S.results.indexOf(b)-S.results.indexOf(a));
 // แชมป์: รายการ Champions ใช้แชมป์จริง / รายการอื่น = ผู้ชนะนัดสุดท้าย (แข่งแล้วและไม่เสมอ)
 const played=ms.filter(r=>!r.date||r.date<=now),last=played[0];
 const realN=CHAMP_REAL[lc(tr.name)]||"",realT=realN?S.teams.find(t=>lc(t.name)===lc(realN)):null;
 const won=(r,id)=>(r.a===id&&r.sa>r.sb)||(r.b===id&&r.sb>r.sa);
 let champ="",champN="",fin=null,mode="champ";
 const RF=CHAMP_FINAL[lc(tr.name)],tByN=n=>S.teams.find(t=>lc(t.name)===lc(n));
 if(realN&&!realT&&RF&&tByN(RF[1])){mode="runner";champN=RF[1];champ=tByN(RF[1]).id}  // แชมป์ไม่อยู่ในระบบ → ใช้รองแชมป์ (ทีมในระบบที่ไปไกลที่สุด)
 else if(realN){champN=realN;champ=realT?realT.id:"";if(last&&champ&&won(last,champ))fin=last}
 else{const top=standings(ms).find(t=>t.p>0&&t.pt>0);if(top){mode="points";champ=top.id;champN=top.n;if(ms[0]&&won(ms[0],champ))fin=ms[0]}}  // รายการที่เพิ่มเอง: คะแนนสูงสุด = แชมป์
 const days=[...new Set(ms.map(r=>r.date))];
 const row=(id,s,cls)=>{const n=nm("teams",id);return`<div class="mt ${cls}${champ&&id===champ?" champ":""}"><span>${tLogoHtml(n,"tlg")}${esc(n)}</span><b>${s}</b></div>`};
 const mc=r=>{const w=r.sa>r.sb?1:r.sa<r.sb?2:0,isF=fin&&r===fin;
  return`<div class="mc${isF?" final":""}">${isF?'<span class="fl">นัดชิงชนะเลิศ</span>':""}${row(r.a,r.sa,w===1?"win":w===2?"out":"")}${row(r.b,r.sb,w===2?"win":w===1?"out":"")}${w===0?'<small class="dr">เสมอ</small>':""}</div>`};
 const cols=days.map((d,i)=>`<div class="bc"><div class="bh${fin&&d===fin.date?" fd":""}"><small>${fin&&d===fin.date?"รอบชิงชนะเลิศ":"วันที่แข่ง"}</small><b>${fd(d)}</b></div><div class="bm">${ms.filter(r=>r.date===d).map(mc).join("")}</div></div>`).join("");
 const sts=standings(ms).filter(t=>t.p>0);
 const chips=T.map(t=>`<button class="chip ${t.id===bt?"on":""}" data-bt="${esc(t.id)}" type="button" title="${esc(t.name)}">${esc(t.name)}</button>`).join("");
 let cb="";
 if(champN){const cn=champN,cw=champ?ms.filter(r=>won(r,champ)).length:0,cl=champ?ms.filter(r=>r.sa!==r.sb&&(r.a===champ||r.b===champ)&&!won(r,champ)).length:0;
  const inSys=n=>S.teams.some(t=>lc(t.name)===lc(n));
  // แสดงเฉพาะทีมที่อยู่ในระบบ: ถ้าคู่ชิงไม่อยู่ในระบบ จะไม่เอ่ยชื่อ
  const tp=mode==="points"?standings(ms).find(t=>t.id===champ):null;
  const det=mode==="points"?`คะแนนสูงสุดในรายการ ${tp.pt} แต้ม`:mode==="runner"?`อันดับดีที่สุดในรายการนี้ของทีมในระบบ`
   :RF&&inSys(RF[1])?`ชนะ ${tLogoHtml(RF[1],"bcsm")} ${esc(RF[1])} ${RF[2]}-${RF[3]} ในนัดชิง · ${fd(RF[4])}`
   :RF?`คว้าแชมป์ · ${fd(RF[4])}`
   :fin?`ชนะ ${esc(nm("teams",champ===fin.a?fin.b:fin.a))} ${Math.max(fin.sa,fin.sb)}-${Math.min(fin.sa,fin.sb)} ในนัดชิง · ${fd(fin.date)}`:"";
  const tags=[];
  cb=`<div class="bchamp" role="note" aria-label="แชมป์ ${esc(cn)}">${tLogoHtml(cn,"bclg")}<div><small>${mode==="runner"?"🏆 แชมป์ในระบบ 21 ทีม ·":"🏆 แชมป์"} ${esc(tr.name)}</small><b>${esc(cn)}</b><span>${det}${champ&&cw+cl?` · ${mode==="points"?"ผลรวมในรายการ":"ผลรวมในระบบ"} ชนะ ${cw} แพ้ ${cl}`:""}</span>${tags.length?`<em class="bctag">${tags.join(" · ")}</em>`:""}</div><i class="bcup" aria-hidden="true">🏆</i></div>`}
 return BK_CSS+H+`<div class="chips">${chips}</div><div class="vban"><small>${tr.game?esc(tr.game):"รายการแข่ง"}</small><h3>${esc(tr.name)}</h3><p class="binfo"><span>เริ่มแข่ง <b>${fd(tr.start)}</b></span>${tr.place?`<span>สถานที่ <b>${esc(tr.place)}</b></span>`:""}<span>เงินรางวัล <b>${Number(tr.prize||0).toLocaleString("th-TH")} บาท</b></span><span>แมตช์ <b>${ms.length}</b></span>${!champN&&sts[0]&&sts[0].pt?`<span>นำโดย <b>${esc(sts[0].n)}</b></span>`:""}</p></div>
 ${cb}${ms.length?`<div class="bk" tabindex="0" aria-label="ผลการแข่งขัน เรียงจากล่าสุด เลื่อนดูตามวันที่">${cols}</div><h2 class="sec">ตารางคะแนนรายการนี้</h2><div class="wrap">${rankList(sts)}</div>`:'<div class="wrap"><div class="empty">รายการนี้ยังไม่มีผลการแข่ง</div></div>'}`;
}

document.addEventListener("click",ev=>{
 const b=ev.target.closest("button[data-bt]");if(!b)return;
 bt=b.dataset.bt;history.replaceState(null,"","/bracket?t="+encodeURIComponent(bt));render();
});