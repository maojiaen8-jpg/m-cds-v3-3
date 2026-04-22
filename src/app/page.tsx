"use client";

import React, { useEffect, useState } from "react";
import { 
  Printer, Save, Waves, Plus, Zap, Baby, 
  Share2, Eye, X, Calculator, Lock, Users, Activity, LogOut, Trash2
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- 1. 严谨的时间格式化逻辑 ---
const formatPace = (s: number) => {
  if (s >= 3600) return "59:59"; 
  let totalMs = Math.round(s * 10) / 10;
  if (totalMs < 60) return totalMs.toFixed(1) + 's';
  let m = Math.floor(totalMs / 60);
  let remainder = totalMs % 60;
  if (remainder >= 59.95) { m += 1; remainder = 0; }
  return `${m}:${remainder.toFixed(1).padStart(4, '0')}`;
};

// --- 2. 核心配置：系数矩阵 ---
const DECAY_FACTORS: Record<string, Record<number, number>> = {
  'Free':   { 25: 1.0, 50: 1.0, 100: 1.01, 200: 1.02, 400: 1.03 },
  'Back':   { 25: 1.0, 50: 1.0, 100: 1.01, 200: 1.02, 400: 1.03 },
  'Fly':    { 25: 1.0, 50: 1.0, 100: 1.03, 200: 1.07, 400: 1.15 },
  'Breast': { 25: 1.0, 50: 1.0, 100: 1.025, 200: 1.06, 400: 1.12 }
};

const STROKE_OPTIONS = [
  { key: 'Free', name: '自由泳', factor: 1.0 },
  { key: 'Back', name: '仰泳', factor: 1.06 },
  { key: 'Fly', name: '蝶泳', factor: 1.12 },
  { key: 'Breast', name: '蛙泳', factor: 1.18 }
];

const ZONE_CONFIG: Record<string, { label: string; hrPct: number }> = {
  'SP':    { label: '绝对速度', hrPct: 0.98 },
  'TSP':   { label: '技术冲刺', hrPct: 0.95 },
  'ANP':   { label: '无氧功率', hrPct: 0.92 },
  'ANE':   { label: '无氧耐力', hrPct: 0.88 },
  'AES':   { label: '有氧动力', hrPct: 0.82 },
  'AEN':   { label: '有氧耐力', hrPct: 0.75 },
  'BAE':   { label: '基础有氧', hrPct: 0.65 }
};

// --- 3. 核心计算引擎 (M-CDS V3.3) ---
const calculateMCDS = (athlete: any) => {
  if (!athlete) return [];
  const { t_value: t, css, phv_stage: stage, age, stroke: strokeKey, pool_type: pool } = athlete;
  const sFactor = STROKE_OPTIONS.find(s => s.key === (strokeKey || 'Free'))?.factor || 1.0;
  const pFactor = pool === '50' ? 1.035 : 1.0;
  const maxHR = 220 - (age || 14);
  const DISTANCES = [25, 50, 100, 200, 400];

  return Object.keys(ZONE_CONFIG).map(zone => {
    const cfg = ZONE_CONFIG[zone];
    const b25Base = () => {
      if (zone === 'SP') return t;
      if (zone === 'TSP') return t + 0.8;
      if (zone === 'ANP') return t + 2.5;
      if (zone === 'ANE') return t * 1.18;
      if (zone === 'AES') return stage === 'pre' ? (css / 4 * 1.015) : (t * 1.28);
      if (zone === 'AEN') return stage === 'pre' ? (css / 4 * 1.055) : (t * 1.38);
      return stage === 'pre' ? (css / 4 * 1.18) : (t * 1.55);
    };

    const finalB25 = b25Base() * sFactor * pFactor;

    return {
      zone, label: cfg.label,
      paces: DISTANCES.map(d => {
        // --- 熔断逻辑 ---
        let isNA = false;
        if (['SP', 'TSP', 'ANP', 'ANE'].includes(zone) && d > 100) isNA = true;
        if ((strokeKey === 'Fly' || strokeKey === 'Breast') && d > 200) isNA = true;

        if (isNA) return { val: 'N/A', range: '--' };

        const decay = DECAY_FACTORS[strokeKey || 'Free']?.[d] || 1.0;
        const seconds = finalB25 * (d / 25) * decay;
        return { 
          val: formatPace(seconds), 
          range: `${formatPace(seconds * 0.98)}~${formatPace(seconds * 1.02)}` 
        };
      }),
      hr: Math.round((maxHR * cfg.hrPct) / 6)
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

  const handleUpdate = async (id: string, updates: any) => {
    await supabase.from("athletes").update(updates).eq("id", id);
    loadData();
  };

  const handleAdd = async () => {
    const name = prompt("运动员姓名:");
    if (!name) return;
    await supabase.from("athletes").insert([{
      name, age: 14, t_value: 15, css: 80, phv_stage: 'post', stroke: 'Free', pool_type: '25',
      share_token: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
    }]);
    loadData();
  };

  return (
    <div className="mcds-app">
      <style>{`
        .mcds-app { background: #05070a; color: #e2e8f0; min-height: 100vh; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 15px; }
        .glass-card { width: 100%; max-width: 1100px; background: rgba(15, 20, 28, 0.85); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 20px; overflow-x: auto; }
        .entry-card { width: 100%; max-width: 340px; background: #111; padding: 40px 25px; border-radius: 32px; text-align: center; margin-top: 10vh; border: 1px solid #222; }
        .input-dark { width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 12px; margin-bottom: 15px; outline: none; box-sizing: border-box; }
        .btn-gold { width: 100%; background: #facc15; color: #000; padding: 15px; border-radius: 14px; font-weight: 900; border: none; cursor: pointer; }
        .admin-table { width: 100%; border-collapse: collapse; min-width: 950px; }
        .admin-table th { color: #4a5568; font-size: 10px; padding: 12px 10px; text-transform: uppercase; border-bottom: 1px solid #1a202c; text-align: left; }
        .admin-table td { padding: 12px 10px; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .in-gold { background: #000; border: 1px solid #333; color: #facc15; padding: 8px; border-radius: 8px; width: 55px; text-align: center; font-weight: bold; }
        .sel-dark { background: #000; border: 1px solid #333; color: #e2e8f0; padding: 8px; border-radius: 8px; font-size: 11px; outline: none; }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 100; overflow-y: auto; padding: 15px; display: flex; justify-content: center; }
        .modal-content { background: #0a0c10; border: 1px solid #333; border-radius: 30px; padding: 25px; width: 100%; max-width: 850px; height: fit-content; position: relative; }
        .pace-tag { color: #10b981; font-family: monospace; font-weight: bold; font-size: 16px; }
        @media print {
          .no-print { display: none !important; }
          .mcds-app { background: white !important; color: black !important; padding: 0 !important; display: block !important; }
          .modal { position: static !important; }
          .modal-content { border: none !important; color: black !important; background: white !important; max-width: 100% !important; padding: 0 !important; }
          .pace-tag { color: black !important; }
          th, td { border: 1px solid #ddd !important; color: black !important; }
        }
      `}</style>

      {role === "guest" && (
        <div className="entry-card">
          <Waves size={60} color="#facc15" style={{margin:'0 auto 20px'}} />
          <h1 style={{fontSize:24, fontWeight:900}}>M-CDS <span style={{color:'#facc15'}}>ELITE</span></h1>
          <button className="btn-gold" style={{marginTop:30}} onClick={()=>setRole("coach_login")}>教练员入口</button>
        </div>
      )}

      {role === "coach_login" && (
        <div className="entry-card">
          <Lock size={40} color="#facc15" style={{margin:'0 auto 25px'}} />
          <input type="email" placeholder="教练邮箱" className="input-dark" value={email} onChange={e=>setEmail(e.target.value)} />
          <input type="password" placeholder="密码" className="input-dark" value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="btn-gold" onClick={async () => {
             const { error } = await supabase.auth.signInWithPassword({ email, password });
             if (error) alert("失败"); else window.location.reload();
          }}>验证并登录</button>
        </div>
      )}

      {role === "coach" && (
        <div className="glass-card no-print">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:25}}>
            <h3 style={{margin:0, fontSize:20}}>队员管理系统</h3>
            <button className="btn-gold" style={{width:'auto', padding:'10px 20px'}} onClick={handleAdd}>+ 新增运动员</button>
          </div>
          <table className="admin-table">
            <thead>
              <tr><th>姓名</th><th>年龄</th><th>PHV分期</th><th>泳姿</th><th>池长</th><th>T-VAL</th><th>CSS</th><th style={{textAlign:'right'}}>操作</th></tr>
            </thead>
            <tbody>
              {athletes.map(a => (
                <tr key={a.id}>
                  <td style={{fontWeight:'bold', fontSize:16}}>{a.name}</td>
                  <td><input className="in-gold" type="number" defaultValue={a.age} onBlur={e=>handleUpdate(a.id, {age:parseInt(e.target.value)})} /></td>
                  <td>
                    <select className="sel-dark" defaultValue={a.phv_stage} onChange={e=>handleUpdate(a.id, {phv_stage:e.target.value})}>
                      <option value="pre">发育前期(Pre)</option><option value="post">发育后期(Post)</option>
                    </select>
                  </td>
                  <td>
                    <select className="sel-dark" defaultValue={a.stroke || 'Free'} onChange={e=>handleUpdate(a.id, {stroke:e.target.value})}>
                      {STROKE_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="sel-dark" defaultValue={a.pool_type || '25'} onChange={e=>handleUpdate(a.id, {pool_type:e.target.value})}>
                      <option value="25">25m</option><option value="50">50m</option>
                    </select>
                  </td>
                  <td><input className="in-gold" defaultValue={a.t_v