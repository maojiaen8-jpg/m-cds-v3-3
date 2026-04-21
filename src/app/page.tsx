"use client";

import React, { useEffect, useState } from "react";
import { 
  Printer, Save, Waves, Plus, Zap, Baby, 
  Share2, Eye, X, Calculator, Lock, Users, Activity, LogOut
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- 核心配置 ---
const DISTANCES = [25, 50, 100, 200, 400];
const STROKE_FACTORS: Record<string, {name:string, factor:number}> = { 
  'Free': {name:'自由泳', factor:1.0}, 
  'Back': {name:'仰泳', factor:1.06}, 
  'Fly': {name:'蝶泳', factor:1.12}, 
  'Breast': {name:'蛙泳', factor:1.18} 
};

// --- 核心计算引擎 (M-CDS V3.3 严格协议) ---
const calculateMCDS = (athlete: any) => {
  if (!athlete) return [];
  const t = athlete.t_value || 15;
  const css = athlete.css || 80;
  const stage = athlete.phv_stage || 'post';
  const age = athlete.age || 14;
  const strokeKey = athlete.stroke || 'Free';
  const pool = athlete.pool_type || '25';

  const sFactor = STROKE_FACTORS[strokeKey]?.factor || 1.0;
  const pFactor = pool === '50' ? 1.035 : 1.0;
  const maxHR = 220 - age;

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
        // --- M-CDS 协议熔断逻辑 ---
        let isNA = false;
        if (['SP', 'TSP', 'ANP', 'ANE'].includes(zone) && d > 100) isNA = true;
        if (strokeKey === 'Fly' && d > 200) isNA = true;

        if (isNA) return { val: 'N/A', range: '--' };

        const seconds = b25 * (d / 25);
        const formatPace = (s: number) => {
            if (s < 60) return s.toFixed(1) + 's';
            const m = Math.floor(s / 60);
            const remainder = (s % 60).toFixed(1);
            return `${m}:${remainder.padStart(4, '0')}`;
        };

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
  const [user, setUser] = useState<any>(null);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [activeAthlete, setActiveAthlete] = useState<any>(null);
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [pass, setPass] = useState("");
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
        if (session) { setUser(session.user); setRole("coach"); loadData(); }
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

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("失败: " + error.message);
    else window.location.reload();
  };

  const handleSave = async (athlete: any) => {
    const edit = drafts[athlete.id];
    if (!edit) return;
    const { error } = await supabase.from("athletes").update(edit).eq("id", athlete.id);
    if (!error) { alert("同步成功"); setDrafts({}); loadData(); }
  };

  const handleAdd = async () => {
    const name = prompt("姓名:");
    if (!name) return;
    const { error } = await supabase.from("athletes").insert([{
      name, age:14, t_value:15.0, css:80.0, phv_stage:'post', stroke:'Free', pool_type:'25',
      share_token: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
      coach_id: user?.id
    }]);
    if (!error) loadData();
  };

  return (
    <div className="mcds-app">
      <style>{`
        .mcds-app { background: radial-gradient(circle at top, #1a1c24, #05070a); color: #e2e8f0; min-height: 100vh; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 15px; }
        .entry-card { width: 100%; max-width: 360px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 32px; padding: 40px 30px; text-align: center; backdrop-filter: blur(10px); margin-top: 10vh; }
        .input-dark { width: 100%; background: #000; border: 1px solid #333; border-radius: 12px; padding: 12px; color: #fff; margin-bottom: 12px; outline: none; box-sizing: border-box; }
        .btn-gold { width: 100%; background: #facc15; color: #000; padding: 15px; border-radius: 16px; font-weight: 900; border: none; cursor: pointer; }
        .glass-container { width: 100%; max-width: 1000px; background: rgba(15, 20, 28, 0.8); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 15px; overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 750px; }
        td, th { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.03); text-align: left; }
        .in-gold { background: #000; border: 1px solid #333; color: #facc15; padding: 5px; border-radius: 6px; width: 55px; text-align: center; font-weight: bold; }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 10px; }
        .modal-content { width: 100%; max-width: 900px; background: #0a0c10; border: 1px solid #333; border-radius: 30px; padding: 20px; position: relative; }
        .pace-tag { color: #10b981; font-family: monospace; font-weight: bold; font-size: 15px; }
        .na-tag { color: #333; font-style: italic; font-size: 11px; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* --- 路由: 入口 --- */}
      {role === "guest" && (
        <div className="entry-card">
          <Waves size={64} color="#facc15" style={{margin:'0 auto 20px'}} />
          <h1 style={{fontSize:'28px', fontWeight:900}}>M-CDS <span style={{color:'#facc15'}}>ELITE</span></h1>
          <button className="btn-gold" onClick={() => setRole("coach_login")}>教练员入口</button>
        </div>
      )}

      {/* --- 路由: 登录 --- */}
      {role === "coach_login" && (
        <div className="entry-card">
          <Lock size={48} color="#facc15" style={{margin:'0 auto 20px'}} />
          <input type="email" placeholder="教练邮箱" className="input-dark" value={email} onChange={e=>setEmail(e.target.value)} />
          <input type="password" placeholder="密码" className="input-dark" value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="btn-gold" onClick={handleLogin}>验证身份</button>
        </div>
      )}

      {/* --- 路由: 教练工作台 --- */}
      {role === "coach" && (
        <div className="glass-container no-print">
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px', alignItems:'center'}}>
            <h2 style={{margin:0}}>数字化泳队</h2>
            <button className="btn-gold" style={{width:'auto', padding:'10px 20px'}} onClick={handleAdd}>+ 新增</button>
          </div>
          <table>
            <thead>
              <tr style={{fontSize:'10px', color:'#4a5568'}}>
                <th>姓名</th><th>T-VAL</th><th>CSS</th><th>PHV</th><th>泳姿</th><th>池长</th><th style={{textAlign:'right'}}>操作</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map(a => (
                <tr key={a.id}>
                  <td style={{fontWeight:'bold'}}>{a.name}</td>
                  <td><input className="in-gold" type="number" step="0.1" defaultValue={a.t_value} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], t_value:parseFloat(e.target.value)}})} /></td>
                  <td><input className="in-gold" type="number" step="0.1" defaultValue={a.css} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], css:parseFloat(e.target.value)}})} /></td>
                  <td>
                    <select className="in-gold" style={{width:'70px'}} defaultValue={a.phv_stage} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], phv_stage:e.target.value}})}>
                      <option value="pre">Pre</option><option value="post">Post</option>
                    </select>
                  </td>
                  <td>
                    <select className="in-gold" style={{width:'65px'}} defaultValue={a.stroke || 'Free'} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], stroke:e.target.value}})}>
                      <option value="Free">自</option><option value="Back">仰</option><option value="Fly">蝶</option><option value="Breast">蛙</option>
                    </select>
                  </td>
                  <td>
                    <select className="in-gold" style={{width:'60px'}} defaultValue={a.pool_type || '25'} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], pool_type:e.target.value}})}>
                      <option value="25">25m</option><option value="50">50m</option>
                    </select>
                  </td>
                  <td style={{textAlign:'right'}}>
                    <div style={{display:'flex', justifyContent:'flex-end', gap:'12px'}}>
                      <Calculator size={22} style={{cursor:'pointer'}} onClick={() => setActiveAthlete(a)} />
                      <Save size={22} color={drafts[a.id] ? "#facc15" : "#333"} style={{cursor:'pointer'}} onClick={() => handleSave(a)} />
                      <Share2 size={22} color="#3b82f6" style={{cursor:'pointer'}} onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}?token=${a.share_token}`);
                        alert("分享链接已复制！");
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{marginTop:'20px', textAlign:'center'}}>
             <button onClick={() => { supabase.auth.signOut(); window.location.reload(); }} style={{background:'none', border:'none', color:'#4a5568', fontSize:'12px'}}>退出系统</button>
          </div>
        </div>
      )}

      {/* --- 弹窗/家长端: 计算矩阵 --- */}
      {activeAthlete && (
        <div className={role === 'coach' ? "modal" : "glass-container"} style={role !== 'coach' ? {marginTop:'5vh', padding:'20px'} : {}}>
          <div className="modal-content">
            {role === 'coach' && <X size={32} style={{position:'absolute', top:'20px', right:'20px', cursor:'pointer'}} onClick={() => setActiveAthlete(null)} />}
            <div style={{textAlign:'center', marginBottom:'20px'}}>
              <h1 style={{fontSize:'32px', margin:0}}>{activeAthlete.name}</h1>
              <p style={{color:'#facc15', fontSize:'12px'}} suppressHydrationWarning>
                {activeAthlete.stroke === 'Fly' ? '蝶泳' : activeAthlete.stroke === 'Back' ? '仰泳' : activeAthlete.stroke === 'Breast' ? '蛙泳' : '自由泳'} | 
                {activeAthlete.pool_type}M池 | 
                {activeAthlete.phv_stage === 'pre' ? '发育前期' : '发育后期'} | 
                {new Date().toLocaleDateString()}
              </p>
            </div>
            <div style={{overflowX:'auto', background:'#000', borderRadius:'20px', border:'1px solid #222'}}>
              <table style={{width:'100%', minWidth:'600px'}}>
                <thead>
                  <tr style={{background:'#111', fontSize:'10px', color:'#718096'}}>
                    <th style={{padding:'12px'}}>ZONE</th><th>25M</th><th>50M</th><th>100M</th><th>200M</th><th>400M</th><th>HR</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateMCDS(activeAthlete).map(r => (
                    <tr key={r.zone} style={{textAlign:'center', borderBottom:'1px solid #111'}}>
                      <td style={{padding:'10px', fontWeight:'bold', textAlign:'left', fontSize:'12px'}}>{r.zone}</td>
                      {r.paces.map((p, i) => (
                        <td key={i}>
                          {p.val === 'N/A' ? <span className="na-tag">N/A</span> : (
                            <>
                              <div className="pace-tag">{p.val}</div>
                              <div style={{fontSize:'8px', color:'#4a5568'}}>{p.range}</div>
                            </>
                          )}
                        </td>
                      ))}
                      <td style={{color:'#f87171', fontWeight:900, fontSize:'16px'}}>{r.hr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn-gold no-print" style={{marginTop:'20px'}} onClick={() => window.print()}>打印今日训练单</button>
          </div>
        </div>
      )}
      {loading && <div style={{marginTop:'10px', color:'#facc15', fontSize:'12px'}}>同步云端中...</div>}
    </div>
  );
}