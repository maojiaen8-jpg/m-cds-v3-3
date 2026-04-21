"use client";

import React, { useEffect, useState } from "react";
import { 
  Printer, Save, Waves, Plus, Zap, Baby, 
  Share2, Eye, X, Calculator, Lock, Users, Activity, LogOut
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- 1. 修正后的时间格式化函数 (处理 60秒进位及严谨四舍五入) ---
const formatPace = (s: number) => {
  if (s >= 3600) return "59:59"; 
  // 四舍五入到一位小数
  let totalMs = Math.round(s * 10) / 10;
  
  if (totalMs < 60) return totalMs.toFixed(1) + 's';
  
  let m = Math.floor(totalMs / 60);
  let remainder = (totalMs % 60);
  
  // 关键：处理 59.95s 以上进位到 60.0s 的情况
  if (remainder >= 59.95) {
    m += 1;
    remainder = 0;
  }
  
  return `${m}:${remainder.toFixed(1).padStart(4, '0')}`;
};

// --- 2. 核心配置: 衰减系数矩阵 ---
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

// --- 3. 核心计算引擎 (集成衰减因子) ---
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
      zone,
      label: zone === 'SP' ? '绝对速度' : zone === 'TSP' ? '技术冲刺' : zone === 'ANP' ? '无氧功率' : zone === 'ANE' ? '无氧耐力' : zone === 'AES' ? '有氧动力' : zone === 'AEN' ? '有氧耐力' : '基础有氧',
      paces: DISTANCES.map(d => {
        // --- 严格熔断逻辑 ---
        let isNA = false;
        if (['SP', 'TSP', 'ANP', 'ANE'].includes(zone) && d > 50) isNA = true;
        if (zone === 'ANE' && (strokeKey === 'Free' || strokeKey === 'Back') && d <= 100) isNA = false;
        if ((strokeKey === 'Fly' || strokeKey === 'Breast') && d > 200) isNA = true;

        if (isNA) return { val: 'N/A', range: '--' };

        // 应用体能衰减系数
        const decay = DECAY_FACTORS[strokeKey || 'Free'][d] || 1.0;
        const seconds = b25 * (d / 25) * decay;

        return { 
          val: formatPace(seconds), 
          range: `${formatPace(seconds * 0.98)}~${formatPace(seconds * 1.02)}`
        };
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
    const { data } = await supabase.from("athletes").select("*").order("name");
    if (data) setAthletes(data);
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("密码错误"); else window.location.reload();
  };

  return (
    <div className="mcds-app">
      <style>{`
        .mcds-app { background: #05070a; color: #e2e8f0; min-height: 100vh; font-family: sans-serif; padding: 10px; display: flex; flex-direction: column; align-items: center; }
        .glass-box { width: 100%; max-width: 900px; background: rgba(15, 20, 28, 0.8); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 15px; overflow-x: auto; }
        .entry-card { width: 100%; max-width: 340px; background: #111; padding: 40px 20px; border-radius: 24px; text-align: center; margin-top: 15vh; border: 1px solid #222; }
        .input-dark { width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 12px; margin-bottom: 10px; outline: none; box-sizing: border-box; }
        .btn-gold { width: 100%; background: #facc15; color: #000; padding: 15px; border-radius: 12px; font-weight: 900; border: none; cursor: pointer; }
        
        .matrix-table { width: 100%; border-collapse: collapse; min-width: 650px; table-layout: fixed; }
        .matrix-table th { color: #718096; font-size: 10px; padding: 12px 5px; background: #0d1117; }
        .matrix-table td { border-bottom: 1px solid #1a202c; padding: 15px 5px; text-align: center; }
        .pace-tag { color: #10b981; font-family: monospace; font-weight: bold; font-size: 15px; }
        .range-tag { font-size: 9px; color: #4a5568; display: block; margin-top: 3px; }
        
        @media print {
          .no-print { display: none !important; }
          .mcds-app { background: white !important; color: black !important; padding: 0 !important; }
          .modal-content { border: none !important; background: white !important; color: black !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; }
          .pace-tag { color: black !important; }
          .matrix-table th { background: #eee !important; color: black !important; border: 1px solid #ddd !important; }
          .matrix-table td { border: 1px solid #ddd !important; color: black !important; }
        }

        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 100; overflow-y: auto; padding: 10px; display: flex; justify-content: center; }
        .modal-content { background: #0a0c10; border: 1px solid #333; border-radius: 30px; padding: 25px; width: 100%; max-width: 850px; height: fit-content; }
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
            <h3 style={{margin:0}}>队员管理</h3>
            <button className="btn-gold" style={{width:'auto', padding:'8px 15px'}} onClick={async () => {
              const n = prompt("运动员姓名:");
              if(n) await supabase.from("athletes").insert([{name:n, t_value:15, css:80, age:14, share_token:Math.random().toString(36).substring(7)}]);
              loadData();
            }}>+ 新增</button>
          </div>
          <table style={{width:'100%', minWidth:600}}>
            <thead>
              <tr style={{fontSize:10, color:'#4a5568'}}><th>姓名</th><th>T-VAL</th><th>CSS</th><th style={{textAlign:'right'}}>操作</th></tr>
            </thead>
            <tbody>
              {athletes.map(a => (
                <tr key={a.id}>
                  <td style={{fontWeight:'bold'}}>{a.name}</td>
                  <td><input className="input-dark" style={{width:55, marginBottom:0, textAlign:'center', color:'#facc15'}} defaultValue={a.t_value} onBlur={e=>supabase.from("athletes").update({t_value:parseFloat(e.target.value)}).eq("id",a.id).then(()=>loadData())} /></td>
                  <td><input className="input-dark" style={{width:55, marginBottom:0, textAlign:'center', color:'#3b82f6'}} defaultValue={a.css} onBlur={e=>supabase.from("athletes").update({css:parseFloat(e.target.value)}).eq("id",a.id).then(()=>loadData())} /></td>
                  <td style={{textAlign:'right'}}>
                    <Eye size={20} style={{marginRight:15, cursor:'pointer'}} onClick={()=>setActiveAthlete(a)} />
                    <Share2 size={20} color="#3b82f6" style={{cursor:'pointer'}} onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}?token=${a.share_token}`);alert("链接已复制");}} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeAthlete && (
        <div className={role === 'coach' ? "modal" : "glass-box"}>
          <div className="modal-content">
            {role === 'coach' && <div style={{textAlign:'right'}}><X size={32} style={{cursor:'pointer'}} onClick={()=>setActiveAthlete(null)} /></div>}
            <div style={{textAlign:'center', marginBottom:25}}>
              <h1 style={{margin:0, fontSize:32}}>{activeAthlete.name}</h1>
              <p style={{fontSize:12, color:'#facc15', marginTop:5}} suppressHydrationWarning>
                {activeAthlete.stroke === 'Fly' ? '蝶泳' : activeAthlete.stroke === 'Back' ? '仰泳' : activeAthlete.stroke === 'Breast' ? '蛙泳' : '自由泳'} | {activeAthlete.pool_type}M池 | {activeAthlete.phv_stage === 'pre' ? '发育前期' : '发育后期'} | {new Date().toLocaleDateString()}
              </p>
            </div>
            
            <div style={{overflowX:'auto'}}>
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th style={{width:'70px', textAlign:'left'}}>强度</th>
                    <th>25M</th><th>50M</th><th>100M</th><th>200M</th><th>400M</th>
                    <th style={{width:'50px'}}>HR</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateMCDS(activeAthlete).map(r => (
                    <tr key={r.zone}>
                      <td style={{textAlign:'left', fontWeight:'bold', fontSize:13}}>{r.zone}</td>
                      {r.paces.map((p, i) => (
                        <td key={i}>
                          {p.val === 'N/A' ? <span style={{color:'#222', fontSize:11}}>N/A</span> : (
                            <>
                              <div className="pace-tag">{p.val}</div>
                              <div className="range-tag">{p.range}</div>
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
            <button className="btn-gold no-print" style={{marginTop:30}} onClick={()=>window.print()}>打印职业训练报告</button>
          </div>
        </div>
      )}
    </div>
  );
}