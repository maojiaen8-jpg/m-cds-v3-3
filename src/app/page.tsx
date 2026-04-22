"use client";

import React, { useEffect, useState } from "react";
import { 
  Printer, Save, Waves, Plus, Zap, Baby, 
  Share2, Eye, X, Calculator, Lock, Users, Activity, LogOut, Trash2, Calendar
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- 1. 核心计算引擎 (锁定不动) ---
const formatPace = (s: number) => {
  if (s >= 3600) return "59:59"; 
  let totalMs = Math.round(s * 10) / 10;
  if (totalMs < 60) return totalMs.toFixed(1) + 's';
  let m = Math.floor(totalMs / 60);
  let remainder = totalMs % 60;
  if (remainder >= 59.95) { m += 1; remainder = 0; }
  return `${m}:${remainder.toFixed(1).padStart(4, '0')}`;
};

const calculateMCDS = (athlete: any) => {
  if (!athlete) return [];
  const { t_value: t, css, phv_stage: stage, age, stroke: strokeKey, pool_type: pool } = athlete;
  const STROKE_FACTORS: any = { 'Free': 1.0, 'Back': 1.06, 'Fly': 1.12, 'Breast': 1.18 };
  const sFactor = STROKE_FACTORS[strokeKey || 'Free'] || 1.0;
  const pFactor = pool === '50' ? 1.035 : 1.0;
  const maxHR = 220 - (age || 14);
  const DECAY: any = { 'Free':{25:1,50:1,100:1.01,200:1.02,400:1.03}, 'Back':{25:1,50:1,100:1.01,200:1.02,400:1.03}, 'Fly':{25:1,50:1,100:1.03,200:1.07,400:1.15}, 'Breast':{25:1,50:1,100:1.025,200:1.06,400:1.12} };
  const ZONES: any = { 'SP':0.98, 'TSP':0.95, 'ANP':0.92, 'ANE':0.88, 'AES':0.82, 'AEN':0.75, 'BAE':0.65 };

  return Object.keys(ZONES).map(zone => {
    const b25 = () => {
      if (zone === 'SP') return t; if (zone === 'TSP') return t + 0.8; if (zone === 'ANP') return t + 2.5; if (zone === 'ANE') return t * 1.18;
      if (zone === 'AES') return stage === 'pre' ? (css/4*1.015) : (t*1.28); if (zone === 'AEN') return stage === 'pre' ? (css/4*1.055) : (t*1.38);
      return stage === 'pre' ? (css/4*1.18) : (t*1.55);
    }();
    return {
      zone, label: zone,
      paces: [25, 50, 100, 200, 400].map(d => {
        let isNA = (['SP','TSP','ANP','ANE'].includes(zone) && d > 100) || (['Fly','Breast'].includes(strokeKey) && d > 200);
        if (isNA) return { val: 'N/A', range: '--' };
        const s = b25 * sFactor * pFactor * (d/25) * (DECAY[strokeKey||'Free'][d] || 1);
        return { val: formatPace(s), range: `${formatPace(s*0.98)}~${formatPace(s*1.02)}` };
      }),
      hr: Math.round((maxHR * ZONES[zone]) / 6)
    };
  });
};

export default function Page() {
  const [role, setRole] = useState<any>("guest");
  const [athletes, setAthletes] = useState<any[]>([]);
  const [sched, setSched] = useState<any>({ week_1:'', week_2:'', week_3:'', week_4:'' });
  const [activeAthlete, setActiveAthlete] = useState<any>(null);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [showSched, setShowSched] = useState(false);

  useEffect(() => {
    const init = async () => {
      const token = new URLSearchParams(window.location.search).get("token");
      if (token) {
        const { data } = await supabase.from("athletes").select("*").eq("share_token", token).single();
        if (data) { setRole("parent"); setActiveAthlete(data); loadSched(data.coach_id); }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) { setRole("coach"); loadData(); loadSched(session.user.id); }
      }
    };
    init();
  }, []);

  const loadData = async () => {
    const { data } = await supabase.from("athletes").select("*").order("age", { ascending: false });
    if (data) setAthletes(data);
  };

  const loadSched = async (cid: string) => {
    const { data } = await supabase.from("schedules").select("*").eq("coach_id", cid).single();
    if (data) setSched(data);
  };

  const saveSched = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("schedules").upsert({ coach_id: user?.id, ...sched });
    alert("计划已发布！家长端将收到更新提醒。");
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("错误"); else window.location.reload();
  };

  return (
    <div className="mcds-app">
      <style>{`
        .mcds-app { background: #05070a; color: #e2e8f0; min-height: 100vh; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 15px; }
        .glass { width: 100%; max-width: 1100px; background: rgba(15, 20, 28, 0.85); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 20px; overflow-x: auto; }
        .btn-gold { background: #facc15; color: #000; padding: 12px 20px; border-radius: 12px; font-weight: 900; border: none; cursor: pointer; }
        .input-dark { background: #000; border: 1px solid #333; color: #fff; padding: 10px; border-radius: 10px; width: 100%; outline: none; }
        .admin-table { width: 100%; border-collapse: collapse; min-width: 800px; }
        .admin-table td, .admin-table th { padding: 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .pace-tag { color: #10b981; font-family: monospace; font-weight: bold; font-size: 15px; }
        .sched-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px; }
        .sched-card { background: #111; padding: 15px; border-radius: 15px; border: 1px solid #222; }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 100; display: flex; justify-content: center; padding: 15px; overflow-y: auto; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {role === "guest" && (
        <div style={{marginTop:'20vh', textAlign:'center'}} className="glass">
          <Waves size={60} color="#facc15" style={{margin:'0 auto 20px'}} />
          <h1>M-CDS ELITE</h1>
          <button className="btn-gold" onClick={()=>setRole("coach_login")}>教练登录</button>
        </div>
      )}

      {role === "coach_login" && (
        <div style={{marginTop:'15vh', width:300}} className="glass">
          <input className="input-dark" placeholder="邮箱" onChange={e=>setEmail(e.target.value)} style={{marginBottom:10}} />
          <input className="input-dark" type="password" placeholder="密码" onChange={e=>setPassword(e.target.value)} style={{marginBottom:20}} />
          <button className="btn-gold" style={{width:'100%'}} onClick={handleLogin}>进入</button>
        </div>
      )}

      {role === "coach" && (
        <div className="glass no-print">
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
            <h2>我的泳队 (年龄排序)</h2>
            <div style={{display:'flex', gap:10}}>
              <button className="btn-gold" style={{background:'#3b82f6', color:'#fff'}} onClick={()=>setShowSched(!showSched)}><Calendar size={18}/> 周期计划</button>
              <button className="btn-gold" onClick={async ()=>{const n=prompt("姓名:"); if(n) await supabase.from("athletes").insert([{name:n, age:14, t_value:15, css:80, share_token:Math.random().toString(36).substring(2)}]); loadData();}}>+ 新增</button>
            </div>
          </div>

          {showSched && (
            <div style={{marginBottom:30, padding:20, background:'#0a0c10', borderRadius:20, border:'1px solid #facc15'}}>
              <h3>4周周期化管理</h3>
              <div className="sched-grid">
                {[1,2,3,4].map(i => (
                  <div key={i} className="sched-card">
                    <label style={{fontSize:10, color:'#facc15'}}>WEEK {i}</label>
                    <textarea className="input-dark" style={{height:80, marginTop:5, fontSize:12}} value={(sched as any)[`week_${i}`]} onChange={e=>setSched({...sched, [`week_${i}`]:e.target.value})} placeholder="输入训练重点..." />
                  </div>
                ))}
              </div>
              <button className="btn-gold" style={{marginTop:15, width:'100%'}} onClick={saveSched}>发布全队计划</button>
            </div>
          )}

          <table className="admin-table">
            <thead><tr style={{color:'#4a5568', fontSize:10}}><th>姓名</th><th>年龄</th><th>T-VAL</th><th>CSS</th><th style={{textAlign:'right'}}>操作</th></tr></thead>
            <tbody>
              {athletes.map(a => (
                <tr key={a.id}>
                  <td style={{fontWeight:'bold'}}>{a.name}</td>
                  <td>{a.age}岁</td>
                  <td>{a.t_value}s</td>
                  <td>{a.css}s</td>
                  <td style={{textAlign:'right'}}>
                    <Eye size={20} style={{marginRight:15, cursor:'pointer'}} onClick={()=>setActiveAthlete(a)} />
                    <Trash2 size={20} color="#f87171" style={{cursor:'pointer'}} onClick={async ()=>{if(window.confirm('删?')){await supabase.from("athletes").delete().eq("id",a.id); loadData();}}} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeAthlete && (
        <div className={role==='coach'?'modal':'glass'}>
          <div style={{width:'100%', maxWidth:850, background:'#0a0c10', padding:25, borderRadius:30, position:'relative'}}>
            {role==='coach' && <X size={32} style={{position:'absolute', top:20, right:20, cursor:'pointer'}} onClick={()=>setActiveAthlete(null)} />}
            <div style={{textAlign:'center', marginBottom:20}}>
              <h1>{activeAthlete.name}</h1>
              <p style={{color:'#facc15'}}>{activeAthlete.age}岁 | {activeAthlete.stroke} | {activeAthlete.pool_type}M池</p>
            </div>

            {/* 4周计划展示区 */}
            <div style={{marginBottom:25}}>
              <h4 style={{display:'flex', alignItems:'center', gap:8}}><Calendar size={16} color="#facc15"/> 周期训练安排</h4>
              <div className="sched-grid">
                {[1,2,3,4].map(i => (
                  <div key={i} className="sched-card" style={{borderColor: (sched as any)[`week_${i}`] ? '#10b981' : '#222'}}>
                    <div style={{fontSize:9, color:'#718096'}}>W{i}</div>
                    <div style={{fontSize:11, marginTop:5}}>{(sched as any)[`week_${i}`] || '暂无安排'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{overflowX:'auto', background:'#000', borderRadius:20, padding:10, border:'1px solid #222'}}>
              <table style={{width:'100%', minWidth:600}}>
                <thead><tr style={{color:'#718096', fontSize:10}}><th>ZONE</th><th>25M</th><th>50M</th><th>100M</th><th>200M</th><th>400M</th><th>HR</th></tr></thead>
                <tbody>
                  {calculateMCDS(activeAthlete).map(r => (
                    <tr key={r.zone} style={{textAlign:'center', borderBottom:'1px solid #111'}}>
                      <td style={{padding:12, textAlign:'left', fontWeight:'bold'}}>{r.zone}</td>
                      {r.paces.map((p, i) => (
                        <td key={i}><div className="pace-tag">{p.val}</div><div style={{fontSize:8, color:'#4a5568'}}>{p.range}</div></td>
                      ))}
                      <td style={{color:'#f87171', fontWeight:900}}>{r.hr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn-gold no-print" style={{width:'100%', marginTop:25}} onClick={()=>window.print()}>打印报告</button>
          </div>
        </div>
      )}
    </div>
  );
}