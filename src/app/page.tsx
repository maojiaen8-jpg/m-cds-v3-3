"use client";

import React, { useEffect, useState } from "react";
import { 
  Printer, Save, Waves, Plus, Zap, Baby, 
  Share2, Eye, X, Calculator, Lock, Users, Activity, LogOut, Trash2
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- 1. 时间格式化 (解决 1:60.0 问题) ---
const formatPace = (s: number) => {
  if (s >= 3600) return "59:59"; 
  let totalMs = Math.round(s * 10) / 10;
  if (totalMs < 60) return totalMs.toFixed(1) + 's';
  let m = Math.floor(totalMs / 60);
  let remainder = (totalMs % 60);
  if (remainder >= 59.95) { m += 1; remainder = 0; }
  return `${m}:${remainder.toFixed(1).padStart(4, '0')}`;
};

// --- 2. 衰减与泳姿配置 ---
const DECAY_FACTORS: Record<string, Record<number, number>> = {
  'Free':   { 25: 1.0, 50: 1.0, 100: 1.01, 200: 1.02, 400: 1.03 },
  'Back':   { 25: 1.0, 50: 1.0, 100: 1.01, 200: 1.02, 400: 1.03 },
  'Fly':    { 25: 1.0, 50: 1.0, 100: 1.03, 200: 1.07, 400: 1.15 },
  'Breast': { 25: 1.0, 50: 1.0, 100: 1.025, 200: 1.06, 400: 1.12 }
};

const STROKE_FACTORS: Record<string, {name:string, factor:number}> = { 
  'Free': {name:'自由泳', factor:1.0}, 
  'Back': {name:'仰泳', factor:1.06}, 
  'Fly': {name:'蝶泳', factor:1.12}, 
  'Breast': {name:'蛙泳', factor:1.18} 
};

// --- 3. 核心计算引擎 ---
const calculateMCDS = (athlete: any) => {
  if (!athlete) return [];
  const { t_value: t, css, phv_stage: stage, age, stroke: strokeKey, pool_type: pool } = athlete;
  const sFactor = STROKE_FACTORS[strokeKey || 'Free'].factor;
  const pFactor = pool === '50' ? 1.035 : 1.0;
  const maxHR = 220 - age;
  const DISTANCES = [25, 50, 100, 200, 400];

  return ['SP', 'TSP', 'ANP', 'ANE', 'AES', 'AEN', 'BAE'].map(zone => {
    const getBase25 = () => {
      let b25 = 0;
      if (zone === 'SP') b25 = t;
      else if (zone === 'TSP') b25 = t + 0.8;
      else if (zone === 'ANP') b25 = t + 2.5;
      else if (zone === 'ANE') b25 = t * 1.18;
      else if (zone === 'AES') b25 = (stage === 'pre' ? (css / 4 * 1.015) : (t * 1.28));
      else if (zone === 'AEN') b25 = (stage === 'pre' ? (css / 4 * 1.055) : (t * 1.38));
      else if (zone === 'BAE') b25 = (stage === 'pre' ? (css / 4 * 1.18) : (t * 1.55));
      return b25 * sFactor * pFactor;
    };
    const b25 = getBase25();
    return {
      zone, label: zone,
      paces: DISTANCES.map(d => {
        let isNA = false;
        if (['SP', 'TSP', 'ANP', 'ANE'].includes(zone) && d > 50) isNA = true;
        if (zone === 'ANE' && (strokeKey === 'Free' || strokeKey === 'Back') && d <= 100) isNA = false;
        if ((strokeKey === 'Fly' || strokeKey === 'Breast') && d > 200) isNA = true;
        if (isNA) return { val: 'N/A', range: '--' };
        const decay = DECAY_FACTORS[strokeKey || 'Free'][d] || 1.0;
        const seconds = b25 * (d / 25) * decay;
        return { val: formatPace(seconds), range: `${formatPace(seconds * 0.98)}~${formatPace(seconds * 1.02)}` };
      }),
      hr: Math.round((maxHR * (zone === 'SP' ? 0.98 : zone.startsWith('A') ? 0.85 : 0.75)) / 6)
    };
  });
};

export default function Page() {
  const [role, setRole] = useState<"guest" | "coach_login" | "coach" | "parent">("guest");
  const [athletes, setAthletes] = useState<any[]>([]);
  const [activeAthlete, setActiveAthlete] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const token = new URLSearchParams(window.location.search).get("token");
      if (token) {
        setRole("parent");
        const { data } = await supabase.from("athletes").select("*").eq("share_token", token).single();
        if (data) setActiveAthlete(data);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) { setRole("coach"); loadData(); }
      }
    };
    init();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("athletes").select("*").order("name");
    if (data) setAthletes(data);
    setLoading(false);
  };

  const updateAthlete = async (id: string, updates: any) => {
    await supabase.from("athletes").update(updates).eq("id", id);
    loadData();
  };

  const deleteAthlete = async (id: string, name: string) => {
    if (window.confirm(`确定要彻底删除运动员 [${name}] 吗？此操作不可撤销。`)) {
      const { error } = await supabase.from("athletes").delete().eq("id", id);
      if (error) alert("删除失败: " + error.message);
      else loadData();
    }
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("密码错误"); else window.location.reload();
  };

  return (
    <div className="mcds-app">
      <style>{`
        .mcds-app { background: #05070a; color: #e2e8f0; min-height: 100vh; font-family: sans-serif; padding: 10px; display: flex; flex-direction: column; align-items: center; }
        .entry-card { width: 100%; max-width: 340px; background: #111; padding: 40px 20px; border-radius: 24px; text-align: center; margin-top: 15vh; border: 1px solid #222; }
        .input-dark { width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 12px; margin-bottom: 10px; outline: none; box-sizing: border-box; }
        .btn-gold { width: 100%; background: #facc15; color: #000; padding: 15px; border-radius: 12px; font-weight: 900; border: none; cursor: pointer; }
        .glass-box { width: 100%; max-width: 1100px; background: rgba(15, 20, 28, 0.8); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 15px; overflow-x: auto; }
        .admin-table { width: 100%; border-collapse: collapse; min-width: 850px; }
        .admin-table th { color: #4a5568; font-size: 10px; padding: 12px 10px; text-align: left; text-transform: uppercase; border-bottom: 1px solid #1a202c; }
        .admin-table td { border-bottom: 1px solid rgba(255,255,255,0.03); padding: 12px 10px; }
        .in-gold { background: #000; border: 1px solid #333; color: #facc15; padding: 8px; border-radius: 8px; width: 60px; text-align: center; font-weight: bold; }
        .sel-dark { background: #000; border: 1px solid #333; color: #e2e8f0; padding: 8px; border-radius: 8px; font-size: 12px; }
        .pace-tag { color: #10b981; font-family: monospace; font-weight: bold; font-size: 15px; }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 100; overflow-y: auto; padding: 10px; display: flex; justify-content: center; }
        .modal-content { background: #0a0c10; border: 1px solid #333; border-radius: 30px; padding: 25px; width: 100%; max-width: 850px; height: fit-content; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {role === "guest" && (
        <div className="entry-card">
          <Waves size={50} color="#facc15" style={{margin:'0 auto 20px'}} />
          <h2 style={{fontWeight:900}}>M-CDS ELITE V3.3</h2>
          <button className="btn-gold" onClick={()=>setRole("coach_login")}>教练员入口</button>
        </div>
      )}

      {role === "coach_login" && (
        <div className="entry-card">
          <Lock size={40} color="#facc15" style={{margin:'0 auto 20px'}} />
          <input type="email" placeholder="邮箱" className="input-dark" value={email} onChange={e=>setEmail(e.target.value)} />
          <input type="password" placeholder="密码" className="input-dark" value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="btn-gold" onClick={handleLogin}>进入系统</button>
        </div>
      )}

      {role === "coach" && (
        <div className="glass-box no-print">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
            <h3 style={{margin:0}}>队员管理系统</h3>
            <button className="btn-gold" style={{width:'auto', padding:'8px 15px'}} onClick={async () => {
              const n = prompt("运动员姓名:");
              if(n) await supabase.from("athletes").insert([{name:n, t_value:15, css:80, age:14, stroke:'Free', phv_stage:'post', share_token:Math.random().toString(36).substring(7)}]);
              loadData();
            }}>+ 新增</button>
          </div>
          <table className="admin-table">
            <thead>
              <tr><th>姓名</th><th>PHV分期</th><th>专项泳姿</th><th>T-VAL</th><th>CSS</th><th style={{textAlign:'right'}}>操作</th></tr>
            </thead>
            <tbody>
              {athletes.map(a => (
                <tr key={a.id}>
                  <td style={{fontWeight:'bold', fontSize:16}}>{a.name}</td>
                  <td>
                    <select className="sel-dark" defaultValue={a.phv_stage} onChange={e=>updateAthlete(a.id, {phv_stage:e.target.value})}>
                      <option value="pre">发育前期(Pre)</option><option value="post">发育后期(Post)</option>
                    </select>
                  </td>
                  <td>
                    <select className="sel-dark" defaultValue={a.stroke || 'Free'} onChange={e=>updateAthlete(a.id, {stroke:e.target.value})}>
                      {Object.keys(STROKE_FACTORS).map(k=><option key={k} value={k}>{STROKE_FACTORS[k].name}</option>)}
                    </select>
                  </td>
                  <td><input className="in-gold" defaultValue={a.t_value} onBlur={e=>updateAthlete(a.id, {t_value:parseFloat(e.target.value)})} /></td>
                  <td><input className="in-gold" style={{color:'#3b82f6'}} defaultValue={a.css} onBlur={e=>updateAthlete(a.id, {css:parseFloat(e.target.value)})} /></td>
                  <td style={{textAlign:'right'}}>
                    <div style={{display:'flex', justifyContent:'flex-end', gap:'15px'}}>
                      <Eye size={22} style={{cursor:'pointer'}} onClick={()=>setActiveAthlete(a)} title="查看计算器" />
                      <Share2 size={22} color="#3b82f6" style={{cursor:'pointer'}} onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}?token=${a.share_token}`);alert("链接已复制");}} title="分享" />
                      <Trash2 size={22} color="#f87171" style={{cursor:'pointer'}} onClick={()=>deleteAthlete(a.id, a.name)} title="彻底删除" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={()=>{supabase.auth.signOut(); window.location.reload();}} style={{background:'none', border:'none', color:'#4a5568', marginTop:30, cursor:'pointer'}}>退出登录</button>
        </div>
      )}

      {activeAthlete && (
        <div className={role === 'coach' ? "modal" : "glass-box"}>
          <div className="modal-content">
            {role === 'coach' && <div style={{textAlign:'right'}}><X size={32} style={{cursor:'pointer'}} onClick={()=>setActiveAthlete(null)} /></div>}
            <div style={{textAlign:'center', marginBottom:25}}>
              <h1 style={{margin:0, fontSize:32}}>{activeAthlete.name}</h1>
              <p style={{fontSize:14, color:'#facc15', marginTop:10}} suppressHydrationWarning>
                {STROKE_FACTORS[activeAthlete.stroke || 'Free'].name} | {activeAthlete.phv_stage === 'pre' ? '发育前期' : '发育后期'} | {new Date().toLocaleDateString()}
              </p>
            </div>
            <div style={{overflowX:'auto', background:'#000', borderRadius:'20px', padding:'10px', border:'1px solid #222'}}>
              <table style={{width:'100%', minWidth:'600px', borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{color:'#718096', fontSize:10, textTransform:'uppercase'}}>
                    <th style={{padding:12, textAlign:'left'}}>Zone</th><th>25M</th><th>50M</th><th>100M</th><th>200M</th><th>400M</th><th>HR</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateMCDS(activeAthlete).map(r => (
                    <tr key={r.zone} style={{textAlign:'center', borderBottom:'1px solid #111'}}>
                      <td style={{padding:12, textAlign:'left', fontWeight:'bold', fontSize:13}}>{r.zone}</td>
                      {r.paces.map((p, i) => (
                        <td key={i}>
                          {p.val === 'N/A' ? <span style={{color:'#222'}}>—</span> : (
                            <>
                              <div className="pace-tag">{p.val}</div>
                              <div style={{fontSize:8, color:'#4a5568'}}>{p.range}</div>
                            </>
                          )}
                        </td>
                      ))}
                      <td style={{color:'#f87171', fontWeight:900, fontSize:18}}>{r.hr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn-gold no-print" style={{marginTop:30}} onClick={()=>window.print()}>打印今日课表</button>
          </div>
        </div>
      )}
    </div>
  );
}