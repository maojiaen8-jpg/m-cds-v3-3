"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Printer, Save, Waves, Share2, Eye, X, Calculator, Lock, Trash2, Calendar, Bell, UserCheck, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- 核心计算逻辑 (锁定不动) ---
const formatPace = (s: number) => { if (s >= 3600) return "59:59"; let t = Math.round(s * 10) / 10; if (t < 60) return t.toFixed(1) + 's'; let m = Math.floor(t / 60), r = t % 60; if (r >= 59.95) { m += 1; r = 0; } return `${m}:${r.toFixed(1).padStart(4, '0')}`; };
const calculateMCDS = (a: any) => {
  if (!a) return []; const DIST = [25, 50, 100, 200, 400], Z = { SP:0.98, TSP:0.95, ANP:0.92, ANE:0.88, AES:0.82, AEN:0.75, BAE:0.65 };
  const SF: any = { Free:1, Back:1.06, Fly:1.12, Breast:1.18 }, DF: any = { Free:{100:1.01,200:1.02,400:1.03}, Back:{100:1.01,200:1.02,400:1.03}, Fly:{100:1.03,200:1.07,400:1.15}, Breast:{100:1.025,200:1.06,400:1.12} };
  return Object.keys(Z).map(z => {
    const b25 = (z==='SP'?a.t_value: z==='TSP'?a.t_value+0.8: z==='ANP'?a.t_value+2.5: z==='ANE'?a.t_value*1.18: a.phv_stage==='pre'?(a.css/4*(z==='AES'?1.015:z==='AEN'?1.055:1.18)):(a.t_value*(z==='AES'?1.28:z==='AEN'?1.38:1.55))) * (SF[a.stroke]||1) * (a.pool_type==='50'?1.035:1);
    return { zone: z, paces: DIST.map(d => { if ((['SP','TSP','ANP','ANE'].includes(z) && d>100) || (['Fly','Breast'].includes(a.stroke) && d>200)) return { v:'N/A', r:'--' }; const s = b25 * (d/25) * ((DF[a.stroke]||DF.Free)[d] || 1); return { v: formatPace(s), r: `${formatPace(s*0.98)}~${formatPace(s*1.02)}` }; }), hr: Math.round(((220-a.age)*(Z as any)[z])/6) };
  });
};

export default function Page() {
  const [role, setRole] = useState<any>("guest");
  const [athletes, setAthletes] = useState<any[]>([]);
  const [dbSched, setDbSched] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [activeA, setActiveA] = useState<any>(null);
  const [showCal, setShowCal] = useState(false);
  const [selDay, setSelDay] = useState<number | null>(null);
  const [email, setEm] = useState(""); const [pass, setPw] = useState("");

  useEffect(() => {
    const init = async () => {
      const t = new URLSearchParams(window.location.search).get("token");
      if (t) {
        const { data: a } = await supabase.from("athletes").select("*").eq("share_token", t).single();
        if (a) { setRole("parent"); setActiveA(a); loadGlobal(); }
      } else {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s) { setRole("coach"); loadD(); loadGlobal(); }
      }
    }; init();
  }, []);

  const loadD = async () => { const { data } = await supabase.from("athletes").select("*").order("age", { ascending: false }); if (data) setAthletes(data); };
  const loadGlobal = async () => {
    const { data: s } = await supabase.from("schedules").select("*"); if(s) setDbSched(s);
    const { data: l } = await supabase.from("leave_requests").select("*"); if(l) setLeaves(l);
  };

  const handleToggleAthlete = async (day: number, aid: string) => {
    const dayData = dbSched.find(s => s.day_index === day) || { day_index: day, athlete_ids: [], content: '' };
    const newIds = dayData.athlete_ids.includes(aid) ? dayData.athlete_ids.filter((id:any) => id !== aid) : [...dayData.athlete_ids, aid];
    await supabase.from("schedules").upsert({ ...dayData, athlete_ids: newIds });
    loadGlobal();
  };

  const handleLeave = async (day: number) => {
    await supabase.from("leave_requests").insert([{ athlete_id: activeA.id, day_index: day, coach_id: activeA.coach_id }]);
    alert("请假申请已发送"); loadGlobal();
  };

  const WeekHeaders = () => <div className="cal-grid" style={{marginBottom:5}}>{['一','二','三','四','五','六','日'].map(d=><div key={d} style={{textAlign:'center', fontSize:10, color:'#facc15'}}>{d}</div>)}</div>;

  return (
    <div className="app-root">
      <style>{`
        .app-root { background: #05070a; color: #e2e8f0; min-height: 100vh; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 15px; }
        .glass { width: 100%; max-width: 1000px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 15px; overflow-x: auto; backdrop-filter: blur(10px); }
        .btn-gold { background: #facc15; color: #000; padding: 10px 16px; border-radius: 10px; font-weight: 800; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; width: 100%; }
        .cal-day { aspect-ratio: 1; border: 1px solid #222; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; position: relative; background: #0d0d0d; }
        .cal-day.active { border-color: #facc15; background: #facc1522; }
        .cal-day.scheduled { background: #10b98122; border-color: #10b98155; }
        .indicator { width: 4px; height: 4px; border-radius: 50%; background: #10b981; position: absolute; bottom: 3px; }
        .leave-tag { position: absolute; top: 0; right: 0; background: #f87171; color: white; font-size: 7px; padding: 1px 3px; border-radius: 0 5px 0 5px; }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 100; display: flex; justify-content: center; padding: 10px; overflow-y: auto; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {role === "guest" && <div className="glass" style={{marginTop:'20vh', textAlign:'center'}}><Waves size={50} color="#facc15" style={{margin:'0 auto 20px'}}/><h2>M-CDS ELITE V3.3</h2><button className="btn-gold" style={{width:'100%'}} onClick={()=>setRole("coach_login")}>进入系统</button></div>}
      
      {role === "coach_login" && <div className="glass" style={{marginTop:'15vh', width:300}}><input className="input-dark" placeholder="邮箱" onChange={e=>setEm(e.target.value)} style={{width:'100%', marginBottom:10}}/><input className="input-dark" type="password" placeholder="密码" onChange={e=>setPw(e.target.value)} style={{width:'100%', marginBottom:20}}/><button className="btn-gold" style={{width:'100%'}} onClick={async()=>{const {error}=await supabase.auth.signInWithPassword({email,password:pass}); if(error)alert("失败"); else window.location.reload();}}>登录</button></div>}

      {role === "coach" && (
        <div className="glass no-print">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
            <h3 style={{margin:0}}>全队管理 ({athletes.length}人)</h3>
            <button className="btn-gold" style={{background:'#3b82f6', color:'#fff'}} onClick={()=>setShowCal(!showCal)}><Calendar size={18}/> 排课系统</button>
          </div>

          {showCal && <div style={{padding:15, background:'#000', borderRadius:15, border:'1px solid #facc15', marginBottom:20}}>
            <WeekHeaders />
            <div className="cal-grid">{Array.from({length:28}).map((_, i) => {
              const d = dbSched.find(s=>s.day_index===i+1);
              const hasLeave = leaves.some(l=>l.day_index===i+1);
              return <div key={i} className={`cal-day ${selDay===i+1?'active':''}`} onClick={()=>setSelDay(i+1)}>D{i+1}{d?.athlete_ids.length > 0 && <div className="indicator"></div>}{hasLeave && <div className="leave-tag">请假</div>}</div>
            })}</div>
            {selDay && (
              <div style={{marginTop:15, borderTop:'1px solid #222', paddingTop:15}}>
                <div style={{display:'flex', justifyContent:'space-between'}}><b>第 {selDay} 天排课</b><button className="btn-gold" style={{padding:'5px 10px'}} onClick={()=>setSelDay(null)}>关闭</button></div>
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px, 1fr))', gap:8, marginTop:10}}>
                  {athletes.map(a => {
                    const isSet = dbSched.find(s=>s.day_index===selDay)?.athlete_ids.includes(a.id);
                    const isLeave = leaves.some(l=>l.day_index===selDay && l.athlete_id === a.id);
                    return <button key={a.id} onClick={()=>handleToggleAthlete(selDay, a.id)} style={{background: isSet? (isLeave?'#f87171':'#10b981') : '#111', color: isSet?'#000':'#666', border:'1px solid #333', padding:8, borderRadius:8, fontSize:12, fontWeight:'bold'}}>{a.name}{isLeave?'(请假)':''}</button>
                  })}
                </div>
                <textarea className="input-dark" style={{width:'100%', height:60, marginTop:15}} placeholder="训练内容..." value={dbSched.find(s=>s.day_index===selDay)?.content || ''} onChange={async(e)=>{const d=dbSched.find(s=>s.day_index===selDay)||{day_index:selDay,athlete_ids:[],content:''}; await supabase.from("schedules").upsert({...d, content:e.target.value}); loadGlobal();}} />
              </div>
            )}
          </div>}

          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead><tr style={{color:'#4a5568', fontSize:10, textAlign:'left'}}><th className="p-3">姓名</th><th>年龄</th><th>T-VAL</th><th>操作</th></tr></thead>
            <tbody>{athletes.map(a=>(<tr key={a.id} style={{borderBottom:'1px solid #111'}}><td className="p-3"><b>{a.name}</b></td><td>{a.age}岁</td><td>{a.t_value}s</td><td style={{textAlign:'right'}}><Eye size={18} onClick={()=>setActiveA(a)} style={{cursor:'pointer'}}/><Trash2 size={18} color="#f87171" style={{marginLeft:15, cursor:'pointer'}} onClick={async()=>{if(confirm('删?')){await supabase.from("athletes").delete().eq("id",a.id); loadD();}}}/></td></tr>))}</tbody>
          </table>
        </div>
      )}

      {activeA && (
        <div className={role==='coach'?'modal':'glass'}>
          <div style={{width:'100%', maxWidth:850, background:'#0a0c10', padding:20, borderRadius:24, position:'relative'}}>
            {role==='coach' && <div style={{textAlign:'right'}}><X size={30} onClick={()=>setActiveA(null)} /></div>}
            <div style={{textAlign:'center', marginBottom:15}}><h2>{activeA.name}</h2><p style={{fontSize:12, color:'#facc15'}}>{activeA.age}岁 | {activeA.stroke} | {activeA.pool_type}M池</p></div>
            
            <div style={{marginBottom:20}}>
              <h4 style={{fontSize:12, marginBottom:10}}><Calendar size={14} style={{display:'inline', marginRight:5}}/> 28天个人排课表</h4>
              <WeekHeaders />
              <div className="cal-grid">{Array.from({length:28}).map((_, i) => {
                const s = dbSched.find(d=>d.day_index===i+1);
                const isMyClass = s?.athlete_ids.includes(activeA.id);
                const iLeft = leaves.some(l=>l.day_index===i+1 && l.athlete_id===activeA.id);
                return <div key={i} className={`cal-day ${isMyClass?'scheduled':''}`} onClick={()=>{ if(isMyClass && role==='parent' && !iLeft) { if(confirm(`申请 D${i+1} 请假？`)) handleLeave(i+1); } else if(isMyClass) alert(s.content || '正常训练'); }}>D{i+1}{isMyClass && !iLeft && <div className="indicator"></div>}{iLeft && <div className="leave-tag">已请假</div>}</div>
              })}</div>
              <p style={{fontSize:9, color:'#4a5568'}}>* 绿色代表有课，点击可请假或查看内容</p>
            </div>

            <div style={{overflowX:'auto', background:'#000', borderRadius:16, padding:10, border:'1px solid #222'}}>
              <table style={{width:'100%', minWidth:600, borderCollapse:'collapse'}}>
                <thead><tr style={{color:'#718096', fontSize:9}}><th>ZONE</th><th>25M</th><th>50M</th><th>100M</th><th>200M</th><th>400M</th><th>HR</th></tr></thead>
                <tbody>{calculateMCDS(activeA).map(r => (
                  <tr key={r.zone} style={{textAlign:'center', borderBottom:'1px solid #111'}}>
                    <td style={{padding:12, textAlign:'left', fontWeight:'bold', fontSize:11}}>{r.zone}</td>
                    {r.paces.map((p, i) => (<td key={i}>{p.v==='N/A'?'--':<> <div style={{color:'#10b981', fontWeight:'bold'}}>{p.v}</div><div style={{fontSize:8, color:'#4a5568'}}>{p.r}</div></>}</td>))}
                    <td style={{color:'#f87171', fontWeight:900, fontSize:18}}>{r.hr}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}