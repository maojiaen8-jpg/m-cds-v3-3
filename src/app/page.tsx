"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Printer, Save, Waves, Share2, Eye, X, Calculator, Lock, Trash2, Calendar, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- 核心工具函数 (锁死) ---
const formatPace = (s: number) => {
  if (s >= 3600) return "59:59";
  let t = Math.round(s * 10) / 10;
  if (t < 60) return t.toFixed(1) + 's';
  let m = Math.floor(t / 60), r = t % 60;
  if (r >= 59.95) { m += 1; r = 0; }
  return `${m}:${r.toFixed(1).padStart(4, '0')}`;
};

const calculateMCDS = (a: any) => {
  if (!a) return [];
  const DIST = [25, 50, 100, 200, 400], Z:any = { SP:0.98, TSP:0.95, ANP:0.92, ANE:0.88, AES:0.82, AEN:0.75, BAE:0.65 };
  const SF: any = { Free:1, Back:1.06, Fly:1.12, Breast:1.18 }, DF: any = { Free:{100:1.01,200:1.02,400:1.03}, Back:{100:1.01,200:1.02,400:1.03}, Fly:{100:1.03,200:1.07,400:1.15}, Breast:{100:1.025,200:1.06,400:1.12} };
  const RIF: any = { SP: (d:any)=>d<=25?'3min':'5min', TSP:(d:any)=>d<=25?'60s':'90s', ANP:(d:any)=>d<=25?'45s':'60s', ANE:(d:any)=>d<=50?'20s':d<=100?'30s':'45s', AES:(d:any)=>d<=100?'20s':d<=200?'30s':'40s', AEN:(d:any)=>d<=100?'15s':d<=200?'20s':'30s', BAE:(d:any)=>d<=100?'10s':d<=200?'15s':'20s' };
  return Object.keys(Z).map(z => {
    const b25 = (z==='SP'?a.t_value: z==='TSP'?a.t_value+0.8: z==='ANP'?a.t_value+2.5: z==='ANE'?a.t_value*1.18: a.phv_stage==='pre'?(a.css/4*(z==='AES'?1.015:z==='AEN'?1.055:1.18)):(a.t_value*(z==='AES'?1.28:z==='AEN'?1.38:1.55))) * (SF[a.stroke]||1) * (a.pool_type==='50'?1.035:1);
    return { zone: z, paces: DIST.map(d => {
      if ((['SP','TSP','ANP','ANE'].includes(z) && d>100) || (['Fly','Breast'].includes(a.stroke) && d>200)) return { v:'N/A' };
      const s = b25 * (d/25) * ((DF[a.stroke]||DF.Free)[d] || 1);
      return { v: formatPace(s), r: `${formatPace(s*0.98)}~${formatPace(s*1.02)}`, ri: RIF[z](d) };
    }), hr: Math.round(((220-a.age)*Z[z])/6) };
  });
};

export default function Page() {
  const [role, setRole] = useState<any>("guest");
  const [user, setUser] = useState<any>(null);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [dbSched, setDbSched] = useState<any[]>([]);
  const [activeA, setActiveA] = useState<any>(null);
  const [showCal, setShowCal] = useState(false);
  const [selDay, setSelDay] = useState<number | null>(null);
  const [tempContent, setTempContent] = useState(""); // --- 本地输入缓冲 ---
  const [email, setEm] = useState(""); const [pass, setPw] = useState("");

  useEffect(() => {
    const init = async () => {
      const t = new URLSearchParams(window.location.search).get("token");
      if (t) {
        const { data: a } = await supabase.from("athletes").select("*").eq("share_token", t).single();
        if (a) { setRole("parent"); setActiveA(a); loadGlobal(a.coach_id); }
      } else {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s) { setUser(s.user); setRole("coach"); loadD(); loadGlobal(s.user.id); }
      }
    }; init();
  }, []);

  const loadD = async () => { const { data } = await supabase.from("athletes").select("*").order("age", { ascending: false }); if (data) setAthletes(data); };
  const loadGlobal = async (cid: string) => { const { data: s } = await supabase.from("schedules").select("*").eq("coach_id", cid); if(s) setDbSched(s); };
  const handleUpdateA = async (id: string, up: any) => { await supabase.from("athletes").update(up).eq("id", id); loadD(); };

  // --- 处理日历点击，同步缓冲状态 ---
  const handleDayClick = (day: number) => {
    setSelDay(day);
    const existing = dbSched.find(s => s.day_index === day);
    setTempContent(existing?.content || "");
  };

  // --- 真正的云端保存 ---
  const handlePublishPlan = async () => {
    if (!selDay) return;
    const d = dbSched.find(s => s.day_index === selDay) || { day_index: selDay, athlete_ids: [], content: "" };
    await supabase.from("schedules").upsert({ ...d, content: tempContent, coach_id: user.id });
    loadGlobal(user.id);
    alert(`第 D${selDay} 天计划已发布`);
  };

  return (
    <div className="mcds-root">
      <style>{`
        .mcds-root { background: #05070a; color: #e2e8f0; min-height: 100vh; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 10px; }
        .glass { width: 100%; max-width: 1000px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 15px; overflow-x: auto; backdrop-filter: blur(10px); }
        .btn-gold { background: #facc15; color: #000; padding: 10px 16px; border-radius: 10px; font-weight: 800; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .in-gold { background: #000; border: 1px solid #333; color: #facc15; padding: 6px; border-radius: 6px; width: 48px; text-align: center; font-weight: bold; }
        .sel-dark { background: #000; border: 1px solid #333; color: #e2e8f0; padding: 6px; border-radius: 6px; font-size: 11px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; width: 100%; margin: 10px 0; }
        .cal-day { aspect-ratio: 1; border: 1px solid #222; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; position: relative; background: #0d0d0d; }
        .cal-day.active { background: #facc15; color: #000; }
        .indicator { width: 4px; height: 4px; border-radius: 50%; background: #10b981; position: absolute; bottom: 3px; }
        .pace { color: #10b981; font-family: monospace; font-weight: bold; font-size: 15px; }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 100; display: flex; justify-content: center; padding: 10px; overflow-y: auto; }
      `}</style>

      {role === "guest" && <div className="glass" style={{marginTop:'20vh', textAlign:'center'}}><Waves size={50} color="#facc15" style={{margin:'0 auto 20px'}}/><h2>M-CDS ELITE</h2><button className="btn-gold" style={{width:'100%'}} onClick={()=>setRole("coach_login")}>教练员入口</button></div>}
      
      {role === "coach_login" && <div className="glass" style={{marginTop:'15vh', width:300}}><input className="input-dark" style={{width:'100%', marginBottom:10, padding:10, background:'#000', border:'1px solid #333', color:'#fff', borderRadius:10}} placeholder="邮箱" onChange={e=>setEm(e.target.value)}/><input className="input-dark" style={{width:'100%', marginBottom:20, padding:10, background:'#000', border:'1px solid #333', color:'#fff', borderRadius:10}} type="password" placeholder="密码" onChange={e=>setPw(e.target.value)}/><button className="btn-gold" style={{width:'100%'}} onClick={async()=>{const {error}=await supabase.auth.signInWithPassword({email,password:pass}); if(error)alert("失败"); else window.location.reload();}}>登录</button></div>}

      {role === "coach" && (
        <div className="glass">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
            <h3 style={{margin:0}}>队内管理 (年龄倒序)</h3>
            <div style={{display:'flex', gap:8}}><button className="btn-gold" style={{background:'#3b82f6', color:'#fff'}} onClick={()=>setShowCal(!showCal)}><Calendar size={18}/></button><button className="btn-gold" onClick={async ()=>{const n=prompt("姓名:"); if(n) await supabase.from("athletes").insert([{name:n, age:14, t_value:15, css:80, stroke:'Free', phv_stage:'post', pool_type:'25', share_token:Math.random().toString(36).substring(2), coach_id:user.id}]); loadD();}}>+ 新增</button></div>
          </div>

          {showCal && <div style={{padding:15, background:'#000', borderRadius:15, border:'1px solid #facc15', marginBottom:20}}>
            <div className="cal-grid" style={{marginBottom:5}}>{['一','二','三','四','五','六','日'].map(d=><div key={d} style={{textAlign:'center', fontSize:10, color:'#facc15'}}>{d}</div>)}</div>
            <div className="cal-grid">{Array.from({length:28}).map((_, i) => { const s=dbSched.find(d=>d.day_index===i+1); return (<div key={i} className={`cal-day ${selDay===i+1?'active':''} ${s?.athlete_ids?.length>0?'scheduled':''}`} onClick={()=>handleDayClick(i+1)}>D{i+1}{s?.athlete_ids?.length>0 && <div className="indicator"></div>}</div>)})}</div>
            {selDay && (
              <div style={{marginTop:10, borderTop:'1px solid #222', paddingTop:10}}>
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(90px, 1fr))', gap:5}}>
                  {athletes.map(a => {
                    const d = dbSched.find(s=>s.day_index===selDay)||{athlete_ids:[]};
                    const isSet = d.athlete_ids?.includes(a.id);
                    return <button key={a.id} onClick={async()=>{
                      const curD = dbSched.find(s=>s.day_index===selDay)||{day_index:selDay,athlete_ids:[],content:tempContent};
                      const newIds = isSet ? curD.athlete_ids.filter((id:any)=>id!==a.id) : [...curD.athlete_ids, a.id];
                      await supabase.from("schedules").upsert({...curD, athlete_ids:newIds, coach_id:user.id}); loadGlobal(user.id);
                    }} style={{background:isSet?'#10b981':'#111', color:isSet?'#000':'#666', borderRadius:6, padding:6, fontSize:11, border:'1px solid #222'}}>{a.name}</button>
                  })}
                </div>
                <textarea style={{width:'100%', marginTop:10, height:60, background:'#0d0d0d', border:'1px solid #333', color:'#fff', borderRadius:8, padding:10, outline:'none'}} placeholder="输入今日计划内容..." value={tempContent} onChange={(e)=>setTempContent(e.target.value)} />
                <button className="btn-gold" style={{width:'100%', marginTop:10}} onClick={handlePublishPlan}><Save size={16}/> 发布今日计划</button>
              </div>
            )}
          </div>}

          <table style={{width:'100%', minWidth:850, borderCollapse:'collapse'}}>
            <thead><tr style={{color:'#4a5568', fontSize:10, textAlign:'left'}}><th>姓名</th><th>年龄</th><th>PHV</th><th>泳姿</th><th>池长</th><th>T-VAL</th><th>CSS</th><th style={{textAlign:'right'}}>操作</th></tr></thead>
            <tbody>{athletes.map(a=>(<tr key={a.id} style={{borderBottom:'1px solid #111'}}><td style={{fontWeight:'bold'}}>{a.name}</td>
              <td><input className="in-gold" type="number" defaultValue={a.age} onBlur={e=>handleUpdateA(a.id,{age:parseInt(e.target.value)})} /></td>
              <td><select className="sel-dark" defaultValue={a.phv_stage} onChange={e=>handleUpdateA(a.id,{phv_stage:e.target.value})}><option value="pre">Pre</option><option value="post">Post</option></select></td>
              <td><select className="sel-dark" style={{width:55}} defaultValue={a.stroke} onChange={e=>handleUpdateA(a.id,{stroke:e.target.value})}><option value="Free">自</option><option value="Back">仰</option><option value="Fly">蝶</option><option value="Breast">蛙</option></select></td>
              <td><select className="sel-dark" style={{width:55}} defaultValue={a.pool_type} onChange={e=>handleUpdateA(a.id,{pool_type:e.target.value})}><option value="25">25</option><option value="50">50</option></select></td>
              <td><input className="in-gold" defaultValue={a.t_value} onBlur={e=>handleUpdateA(a.id,{t_value:parseFloat(e.target.value)})} /></td>
              <td><input className="in-gold" style={{color:'#3b82f6'}} defaultValue={a.css} onBlur={e=>handleUpdateA(a.id,{css:parseFloat(e.target.value)})} /></td>
              <td style={{textAlign:'right'}}><div style={{display:'flex', gap:8, justifyContent:'flex-end'}}><Eye size={18} onClick={()=>setActiveA(a)} style={{cursor:'pointer'}}/><Trash2 size={18} color="#f87171" onClick={async()=>{if(confirm('删?')){await supabase.from("athletes").delete().eq("id",a.id); loadD();}}} style={{cursor:'pointer'}}/></div></td></tr>))}
            </tbody>
          </table>
        </div>
      )}

      {activeA && (
        <div className={role==='coach'?'modal':'glass'}>
          <div style={{width:'100%', maxWidth:850, background:'#0a0c10', padding:20, borderRadius:24, position:'relative', height:'fit-content'}}>
            {role==='coach' && <div style={{textAlign:'right'}}><X size={32} style={{cursor:'pointer'}} onClick={()=>setActiveA(null)} /></div>}
            <div style={{textAlign:'center', marginBottom:15}}><h2>{activeA.name}</h2><p style={{fontSize:12, color:'#facc15'}}>{activeA.age}岁 | {activeA.stroke} | {activeA.pool_type}M池 | {activeA.phv_stage==='pre'?'前期':'后期'}</p></div>
            
            <div style={{marginBottom:15}}>
              <div className="cal-grid" style={{marginBottom:5}}>{['一','二','三','四','五','六','日'].map(d=><div key={d} style={{textAlign:'center', fontSize:9, color:'#4a5568'}}>{d}</div>)}</div>
              <div className="cal-grid">{Array.from({length:28}).map((_, i) => {
                const s = dbSched.find(d=>d.day_index===i+1);
                const isSet = s?.athlete_ids?.includes(activeA.id);
                return <div key={i} className={`cal-day ${isSet?'scheduled':''}`} onClick={()=>isSet && alert(`今日训练重点：\n${s.content || '正常训练'}`)}>D{i+1}{isSet && <div className="indicator"></div>}</div>
              })}</div>
            </div>

            <div style={{overflowX:'auto', background:'#000', borderRadius:16, padding:10, border:'1px solid #222'}}>
              <table style={{width:'100%', minWidth:600, borderCollapse:'collapse'}}>
                <thead><tr style={{color:'#718096', fontSize:9}}><th>ZONE</th><th>25M</th><th>50M</th><th>100M</th><th>200M</th><th>400M</th><th>HR</th></tr></thead>
                <tbody>{calculateMCDS(activeA).map(r => (
                  <tr key={r.zone} style={{textAlign:'center', borderBottom:'1px solid #111'}}>
                    <td style={{padding:10, textAlign:'left', fontWeight:'bold', fontSize:12}}>{r.zone}</td>
                    {r.paces.map((p, i) => (<td key={i}>{!p.v || p.v==='N/A'?'--':<> <div className="pace">{p.v}</div><div style={{fontSize:8, color:'#4a5568'}}>RI:{p.ri}</div></>}</td>))}
                    <td style={{color:'#f87171', fontWeight:900, fontSize:18}}>{r.hr}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <button className="btn-gold no-print" style={{width:'100%', marginTop:20}} onClick={()=>window.print()}>打印今日报告</button>
          </div>
        </div>
      )}
    </div>
  );
}