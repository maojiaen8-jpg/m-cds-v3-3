"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Printer, Save, Waves, Share2, Eye, X, Calculator, Lock, Trash2, Calendar, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- 1. 严谨的时间格式化 ---
const formatPace = (s: number) => {
  if (!s || s >= 3600) return "--";
  let t = Math.round(s * 10) / 10;
  if (t < 60) return t.toFixed(1) + 's';
  let m = Math.floor(t / 60), r = t % 60;
  if (r >= 59.95) { m += 1; r = 0; }
  return `${m}:${r.toFixed(1).padStart(4, '0')}`;
};

// --- 2. 核心计算引擎 (M-CDS V3.3 严格协议版) ---
const calculateMCDS = (a: any, activeStroke: string) => {
  if (!a) return [];
  const DIST = [25, 50, 100, 200, 400];
  const SF: any = { Free: 1.0, Back: 1.06, Fly: 1.12, Breast: 1.18 };
  
  const Z: any = { 
    SP:  { h: 0.98, ri: (d: any) => d <= 25 ? '3min' : '5min' },
    TSP: { h: 0.95, ri: (d: any) => d <= 25 ? '60s' : '90s' },
    ANP: { h: 0.92, ri: (d: any) => d <= 25 ? '45s' : '60s' },
    ANE: { h: 0.88, ri: (d: any) => d <= 50 ? '20s' : d <= 100 ? '30s' : '45s' },
    AES: { h: 0.82, ri: (d: any) => d <= 100 ? '20s' : d <= 200 ? '30s' : '40s' },
    AEN: { h: 0.75, ri: (d: any) => d <= 100 ? '15s' : d <= 200 ? '20s' : '30s' },
    BAE: { h: 0.65, ri: (d: any) => d <= 100 ? '10s' : d <= 200 ? '15s' : '20s' }
  };

  const poolF = a.pool_type === '50' ? 1.035 : 1.0;
  const strokeF = SF[activeStroke] || 1.0;

  return Object.keys(Z).map(z => {
    const cfg = Z[z];
    let b25 = 0;

    if (['SP', 'TSP', 'ANP', 'ANE'].includes(z)) {
      // 无氧类逻辑：T-Value 驱动
      const tBase = z === 'SP' ? a.t_value : z === 'TSP' ? a.t_value + 0.8 : z === 'ANP' ? a.t_value + 2.5 : a.t_value * 1.18;
      b25 = tBase * strokeF * poolF;
    } else {
      // 有氧类逻辑
      if (a.phv_stage === 'pre') {
        // Pre-PHV：CSS 驱动 + 泳姿修正 (重要修复)
        const css25 = a.css / 4;
        const cssFactor = z === 'AES' ? 1.015 : z === 'AEN' ? 1.055 : 1.18;
        b25 = css25 * cssFactor * poolF * strokeF; 
      } else {
        // Post-PHV：T-Value 转化
        const tFactor = z === 'AES' ? 1.28 : z === 'AEN' ? 1.38 : 1.55;
        b25 = a.t_value * tFactor * strokeF * poolF;
      }
    }

    return {
      zone: z,
      paces: DIST.map(d => {
        // 熔断限制逻辑
        let isNA = false;
        if (['SP', 'TSP', 'ANP'].includes(z) && d > 50) isNA = true;
        if (z === 'ANE' && d > 100) isNA = true;
        if ((activeStroke === 'Fly' || activeStroke === 'Breast') && d > 200) isNA = true;
        if (isNA) return { v: 'N/A', r: '--', ri: '--' };

        const finalSeconds = b25 * (d / 25); 

        return { 
          v: formatPace(finalSeconds), 
          r: `${formatPace(finalSeconds * 0.98)}~${formatPace(finalSeconds * 1.02)}`, 
          ri: cfg.ri(d) 
        };
      }),
      hr: Math.round(((220 - (a.age || 14)) * cfg.h) / 6)
    };
  });
};

export default function Page() {
  const [role, setRole] = useState<any>("guest");
  const [user, setUser] = useState<any>(null);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [dbSched, setDbSched] = useState<any[]>([]);
  const [activeA, setActiveA] = useState<any>(null);
  const [viewStroke, setViewStroke] = useState("Free");
  const [showCal, setShowCal] = useState(false);
  const [selDay, setSelDay] = useState<number | null>(null);
  const [tempPlan, setTempPlan] = useState("");
  const [email, setEm] = useState(""); const [pass, setPw] = useState("");

  useEffect(() => {
    const init = async () => {
      const t = new URLSearchParams(window.location.search).get("token");
      if (t) {
        const { data: a } = await supabase.from("athletes").select("*").eq("share_token", t).single();
        if (a) { setRole("parent"); setActiveA(a); setViewStroke(a.stroke || "Free"); loadS(a.coach_id); }
      } else {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s) { setUser(s.user); setRole("coach"); loadD(); loadS(s.user.id); }
      }
    }; init();
  }, []);

  const loadD = async () => { const { data } = await supabase.from("athletes").select("*").order("age", { ascending: false }); if (data) setAthletes(data); };
  const loadS = async (id: string) => { const { data } = await supabase.from("schedules").select("*").eq("coach_id", id); if (data) setDbSched(data); };
  const handleUpdateA = async (id: string, up: any) => { await supabase.from("athletes").update(up).eq("id", id); loadD(); };

  return (
    <div className="app-root">
      <style>{`
        .app-root { background: #05070a; color: #e2e8f0; min-height: 100vh; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 10px; }
        .glass { width: 100%; max-width: 1100px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 15px; overflow-x: auto; backdrop-filter: blur(10px); }
        .btn-gold { background: #facc15; color: #000; padding: 10px 16px; border-radius: 10px; font-weight: 800; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .input-dark { background: #000; border: 1px solid #333; color: #fff; padding: 8px; border-radius: 8px; width: 100%; outline: none; }
        .in-gold { background: #000; border: 1px solid #333; color: #facc15; padding: 6px; border-radius: 6px; width: 45px; text-align: center; font-weight: bold; }
        .sel-dark { background: #000; border: 1px solid #333; color: #e2e8f0; padding: 6px; border-radius: 6px; font-size: 11px; outline: none; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; width: 100%; margin: 10px 0; }
        .cal-day { aspect-ratio: 1; border: 1px solid #222; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; background: #0d0d0d; position: relative; }
        .cal-day.active { background: #facc15; color: #000; }
        .cal-day.scheduled { border-color: #10b981; }
        .pace-tag { color: #10b981; font-family: monospace; font-weight: bold; font-size: 14px; }
        .ri-txt { font-size: 8px; color: #facc1599; font-weight: bold; }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 100; display: flex; justify-content: center; padding: 10px; overflow-y: auto; }
        .stroke-tab { padding: 6px 12px; border-radius: 8px; font-size: 11px; border: 1px solid #333; cursor: pointer; }
        .stroke-tab.active { background: #facc15; color: #000; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {role === "guest" && <div className="glass" style={{marginTop:'20vh', textAlign:'center'}}><Waves size={50} color="#facc15" style={{margin:'0 auto 20px'}}/><h2>M-CDS ELITE</h2><button className="btn-gold" onClick={()=>setRole("coach_login")}>教练员入口</button></div>}
      
      {role === "coach_login" && <div className="glass" style={{marginTop:'15vh', width:300}}><input className="input-dark" placeholder="邮箱" onChange={e=>setEm(e.target.value)} style={{marginBottom:10}}/><input className="input-dark" type="password" placeholder="密码" onChange={e=>setPw(e.target.value)} style={{marginBottom:20}}/><button className="btn-gold" style={{width:'100%'}} onClick={async()=>{const {error}=await supabase.auth.signInWithPassword({email,password:pass}); if(error)alert("失败"); else window.location.reload();}}>登录</button></div>}

      {role === "coach" && (
        <div className="glass no-print">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
            <h3 style={{margin:0}}>全队管理 (年龄倒序)</h3>
            <div style={{display:'flex', gap:8}}><button className="btn-gold" style={{background:'#3b82f6', color:'#fff'}} onClick={()=>setShowCal(!showCal)}><Calendar size={18}/></button><button className="btn-gold" onClick={async ()=>{const n=prompt("姓名:"); if(n) await supabase.from("athletes").insert([{name:n, age:14, t_value:15, css:80, stroke:'Free', phv_stage:'post', pool_type:'25', share_token:Math.random().toString(36).substring(2), coach_id:user.id}]); loadD();}}>+ 新增</button></div>
          </div>

          {showCal && <div style={{padding:15, background:'#000', borderRadius:15, border:'1px solid #facc15', marginBottom:20}}>
            <div className="cal-grid" style={{marginBottom:5}}>{['一','二','三','四','五','六','日'].map(d=><div key={d} style={{textAlign:'center', fontSize:10, color:'#facc15'}}>{d}</div>)}</div>
            <div className="cal-grid">{Array.from({length:28}).map((_, i) => { const s=dbSched.find(d=>d.day_index===i+1); return (<div key={i} className={`cal-day ${selDay===i+1?'active':''} ${s?.athlete_ids?.length>0?'scheduled':''}`} onClick={()=>{setSelDay(i+1); setTempPlan(s?.content||"");}}>D{i+1}{s?.athlete_ids?.length>0 && <div style={{width:4,height:4,background:'#10b981',borderRadius:'50%',position:'absolute',bottom:3}}></div>}</div>)})}</div>
            {selDay && (
              <div style={{marginTop:10, borderTop:'1px solid #222', paddingTop:10}}>
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(85px, 1fr))', gap:5}}>
                  {athletes.map(a => {
                    const d = dbSched.find(s=>s.day_index===selDay)||{athlete_ids:[]};
                    const isSet = d.athlete_ids?.includes(a.id);
                    return <button key={a.id} onClick={async()=>{
                      const curD = dbSched.find(s=>s.day_index===selDay)||{day_index:selDay,athlete_ids:[],content:tempPlan};
                      const nIds = isSet ? curD.athlete_ids.filter((id:any)=>id!==a.id) : [...curD.athlete_ids, a.id];
                      await supabase.from("schedules").upsert({...curD, athlete_ids:nIds, coach_id:user.id}); loadS(user.id);
                    }} style={{background:isSet?'#10b981':'#111', color:isSet?'#000':'#666', borderRadius:6, padding:6, fontSize:11, border:'1px solid #222'}}>{a.name}</button>
                  })}
                </div>
                <textarea className="input-dark" style={{marginTop:10, height:50, background:'#0d0d0d'}} placeholder="输入今日计划..." value={tempPlan} onChange={e=>setTempPlan(e.target.value)} />
                <button className="btn-gold" style={{width:'100%', marginTop:10}} onClick={async()=>{const d=dbSched.find(s=>s.day_index===selDay)||{day_index:selDay,athlete_ids:[],content:""}; await supabase.from("schedules").upsert({...d, content:tempPlan, coach_id:user.id}); loadS(user.id); alert("已发布");}}>发布计划</button>
              </div>
            )}
          </div>}

          <table style={{width:'100%', borderCollapse:'collapse', minWidth:850}}>
            <thead><tr style={{color:'#4a5568', fontSize:10, textAlign:'left'}}><th>姓名</th><th>年龄</th><th>PHV</th><th>泳姿</th><th>池长</th><th>T-VAL</th><th>CSS</th><th style={{textAlign:'right'}}>操作</th></tr></thead>
            <tbody>{athletes.map(a=>(<tr key={a.id} style={{borderBottom:'1px solid #111'}}><td style={{fontWeight:'bold'}}>{a.name}</td>
              <td><input className="in-gold" type="number" defaultValue={a.age} onBlur={e=>handleUpdateA(a.id,{age:parseInt(e.target.value)})} /></td>
              <td><select className="sel-dark" defaultValue={a.phv_stage} onChange={e=>handleUpdateA(a.id,{phv_stage:e.target.value})}><option value="pre">Pre</option><option value="post">Post</option></select></td>
              <td><select className="sel-dark" style={{width:55}} defaultValue={a.stroke} onChange={e=>handleUpdateA(a.id,{stroke:e.target.value})}><option value="Free">自</option><option value="Back">仰</option><option value="Fly">蝶</option><option value="Breast">蛙</option></select></td>
              <td><select className="sel-dark" defaultValue={a.pool_type} onChange={e=>handleUpdateA(a.id,{pool_type:e.target.value})}><option value="25">25</option><option value="50">50</option></select></td>
              <td><input className="in-gold" defaultValue={a.t_value} onBlur={e=>handleUpdateA(a.id,{t_value:parseFloat(e.target.value)})} /></td>
              <td><input className="in-gold" style={{color:'#3b82f6'}} defaultValue={a.css} onBlur={e=>handleUpdateA(a.id,{css:parseFloat(e.target.value)})} /></td>
              <td style={{textAlign:'right'}}><div style={{display:'flex', gap:8, justifyContent:'flex-end'}}><Eye size={18} onClick={()=>{setActiveA(a); setViewStroke(a.stroke||"Free");}} style={{cursor:'pointer'}}/><Trash2 size={18} color="#f87171" onClick={async()=>{if(confirm('删?')){await supabase.from("athletes").delete().eq("id",a.id); loadD();}}} style={{cursor:'pointer'}}/></div></td></tr>))}
            </tbody>
          </table>
        </div>
      )}

      {activeA && (
        <div className={role==='coach'?'modal':'glass'}>
          <div style={{width:'100%', maxWidth:850, background:'#0a0c10', padding:20, borderRadius:24, position:'relative', height:'fit-content'}}>
            {role==='coach' && <div style={{textAlign:'right'}}><X size={32} style={{cursor:'pointer'}} onClick={()=>setActiveA(null)} /></div>}
            <div style={{textAlign:'center', marginBottom:15}}>
              <h2>{activeA.name}</h2>
              <div style={{display:'flex', justifyContent:'center', gap:10, margin:'10px 0'}}>
                {['Free','Back','Fly','Breast'].map(s=>(<div key={s} className={`stroke-tab ${viewStroke===s?'active':''}`} onClick={()=>setViewStroke(s)}>{s==='Free'?'自':s==='Back'?'仰':s==='Fly'?'蝶':'蛙'}</div>))}
              </div>
              <p style={{fontSize:11, color:'#4a5568'}}>{activeA.age}岁 | {activeA.pool_type}M池 | {activeA.phv_stage==='pre'?'前期':'后期'}</p>
            </div>
            
            <div style={{overflowX:'auto', background:'#000', borderRadius:16, padding:10, border:'1px solid #222'}}>
              <table style={{width:'100%', minWidth:600, borderCollapse:'collapse'}}>
                <thead><tr style={{color:'#718096', fontSize:9}}><th>ZONE</th><th>25M</th><th>50M</th><th>100M</th><th>200M</th><th>400M</th><th>HR</th></tr></thead>
                <tbody>{calculateMCDS(activeA, viewStroke).map(r => (
                  <tr key={r.zone} style={{textAlign:'center', borderBottom:'1px solid #111'}}>
                    <td style={{padding:10, textAlign:'left', fontWeight:'bold', fontSize:12}}>{r.zone}</td>
                    {r.paces.map((p, i) => (<td key={i}>{!p.v || p.v==='N/A'?'--':<> <div className="pace">{p.v}</div><div className="ri-txt">RI:{p.ri}</div></>}</td>))}
                    <td style={{color:'#f87171', fontWeight:900, fontSize:18}}>{r.hr}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <button className="btn-gold no-print" style={{width:'100%', marginTop:20}} onClick={()=>window.print()}>打印报告</button>
          </div>
        </div>
      )}
    </div>
  );
}