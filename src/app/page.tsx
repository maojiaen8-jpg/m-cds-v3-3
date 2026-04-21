"use client";

import React, { useEffect, useState } from "react";
import { 
  Printer, Save, Waves, Plus, Zap, Baby, 
  Share2, Eye, X, Calculator, Lock, Users, Activity, LogOut
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- 核心计算引擎 (全距离 25m - 400m) ---
const calculateMCDS = (t: number, css: number, stage: string, age: number) => {
  const DISTANCES = [25, 50, 100, 200, 400];
  const getPace = (id: string) => {
    let b25 = 0;
    if (id === 'SP') b25 = t;
    else if (id === 'TSP') b25 = t + 0.8;
    else if (id === 'ANP') b25 = t + 2.5;
    else if (id === 'ANE') b25 = t * 1.18;
    else if (id === 'AES') b25 = (stage === 'pre' ? (css / 4 * 1.015) : (t * 1.28));
    else if (id === 'AEN') b25 = (stage === 'pre' ? (css / 4 * 1.055) : (t * 1.38));
    else if (id === 'BAE') b25 = (stage === 'pre' ? (css / 4 * 1.18) : (t * 1.55));
    return b25;
  };
  const maxHR = 220 - age;
  return ['SP', 'TSP', 'ANP', 'ANE', 'AES', 'AEN', 'BAE'].map(zone => ({
    zone,
    label: zone === 'SP' ? '绝对速度' : zone === 'TSP' ? '技术冲刺' : zone === 'ANP' ? '无氧功率' : zone === 'ANE' ? '无氧耐力' : zone === 'AES' ? '有氧动力' : zone === 'AEN' ? '有氧耐力' : '基础有氧',
    paces: DISTANCES.map(d => ({
      val: (getPace(zone) * (d / 25)).toFixed(1) + 's',
      range: `${(getPace(zone) * (d / 25) * 0.98).toFixed(1)}~${(getPace(zone) * (d / 25) * 1.02).toFixed(1)}`
    })),
    hr: Math.round((maxHR * (zone === 'SP' ? 0.98 : zone.startsWith('A') ? 0.85 : 0.75)) / 6)
  }));
};

export default function Page() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"guest" | "coach_login" | "coach" | "parent">("guest");
  const [athletes, setAthletes] = useState<any[]>([]);
  const [activeAthlete, setActiveAthlete] = useState<any>(null);
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setRole("coach");
        loadAthletes();
      }
    };
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      setRole("parent");
      const loadParent = async () => {
        const { data } = await supabase.from("athletes").select("*").eq("share_token", token).single();
        if (data) setActiveAthlete(data);
      };
      loadParent();
    } else {
      checkUser();
    }
  }, []);

  const loadAthletes = async () => {
    setLoading(true);
    const { data } = await supabase.from("athletes").select("*").order("name");
    if (data) setAthletes(data);
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("登录失败: " + error.message);
    else window.location.reload();
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleSave = async (athlete: any) => {
    const edit = drafts[athlete.id];
    const { error } = await supabase.from("athletes").update(edit).eq("id", athlete.id);
    if (!error) {
      alert("同步成功！");
      setDrafts({});
      loadAthletes();
    }
  };

  const handleAdd = async () => {
    const name = prompt("姓名:");
    if (!name) return;
    const { error } = await supabase.from("athletes").insert([{
      name, age:14, t_value:15, css:80, phv_stage:'post', 
      share_token: Math.random().toString(36).substring(2),
      coach_id: user?.id
    }]);
    if (!error) loadAthletes();
  };

  return (
    <div className="mcds-app">
      <style>{`
        .mcds-app { background: radial-gradient(circle at top, #1a1c24, #05070a); color: #e2e8f0; min-height: 100vh; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 20px; }
        .entry-card { margin-top: 10vh; width: 100%; max-width: 360px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 32px; padding: 40px 30px; text-align: center; backdrop-filter: blur(10px); }
        .input-dark { width: 100%; background: #000; border: 1px solid #333; border-radius: 12px; padding: 12px; color: #fff; margin-bottom: 15px; outline: none; }
        .btn-full { width: 100%; background: #facc15; color: #000; padding: 15px; border-radius: 16px; font-weight: 900; border: none; cursor: pointer; margin-top: 10px; }
        .glass-table { width: 100%; max-width: 1000px; background: rgba(15, 20, 28, 0.8); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 20px; overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 600px; }
        td, th { padding: 15px 10px; border-bottom: 1px solid rgba(255,255,255,0.03); text-align: left; }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-content { width: 100%; max-width: 900px; background: #0a0c10; border: 1px solid #333; border-radius: 30px; padding: 20px; position: relative; }
        .pace-tag { color: #10b981; font-family: monospace; font-weight: bold; font-size: 16px; line-height: 1; }
        .range-txt { font-size: 9px; color: #4a5568; margin-top: 2px; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {role === "guest" && (
        <div className="entry-card">
          <Waves size={64} color="#facc15" style={{margin:'0 auto 20px'}} />
          <h1 style={{fontSize:'28px', fontWeight:900, margin:'0 0 40px'}}>M-CDS <span style={{color:'#facc15'}}>ELITE</span></h1>
          <button className="btn-full" onClick={() => setRole("coach_login")}>教练员入口</button>
          <p style={{fontSize:'11px', color:'#4a5568', marginTop:'20px'}}>家长请使用教练提供的专属链接</p>
        </div>
      )}

      {role === "coach_login" && (
        <div className="entry-card">
          <Lock size={48} color="#facc15" style={{margin:'0 auto 20px'}} />
          <h2 style={{marginBottom:'30px'}}>教练登录</h2>
          <input type="email" placeholder="邮箱账号" className="input-dark" value={email} onChange={e=>setEmail(e.target.value)} />
          <input type="password" placeholder="密码" className="input-dark" value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="btn-full" onClick={handleLogin}>登录系统</button>
          <button style={{background:'none', border:'none', color:'#4a5568', marginTop:'15px'}} onClick={()=>setRole("guest")}>返回</button>
        </div>
      )}

      {role === "coach" && user && (
        <div className="dashboard no-print" style={{width:'100%', maxWidth:'1000px'}}>
          <header style={{display:'flex', justifyContent:'space-between', marginBottom:'30px', alignItems:'center'}}>
            <div><h2 style={{margin:0}}>你好, 教练</h2><span style={{fontSize:'10px', color:'#4a5568'}}>{user.email}</span></div>
            <div style={{display:'flex', gap:'10px'}}><button className="btn-full" style={{width:'auto', padding:'10px 20px'}} onClick={handleAdd}>+ 新增</button><button onClick={handleLogout} style={{background:'none', border:'1px solid #333', borderRadius:'12px', padding:'10px'}}><LogOut size={18}/></button></div>
          </header>
          <div className="glass-table">
            <table>
              <thead><tr><th>姓名</th><th>T-VAL</th><th>CSS</th><th style={{textAlign:'right'}}>操作</th></tr></thead>
              <tbody>
                {athletes.map(a => (
                  <tr key={a.id}>
                    <td style={{fontWeight:'bold'}}>{a.name}</td>
                    <td><input className="input-dark" style={{width:'60px', marginBottom:0, color:'#facc15', textAlign:'center'}} type="number" step="0.1" defaultValue={a.t_value} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], t_value:parseFloat(e.target.value)}})} /></td>
                    <td><input className="input-dark" style={{width:'60px', marginBottom:0, color:'#3b82f6', textAlign:'center'}} type="number" step="0.1" defaultValue={a.css} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], css:parseFloat(e.target.value)}})} /></td>
                    <td style={{textAlign:'right'}}><div style={{display:'flex', justifyContent:'flex-end', gap:'15px'}}>
                      <Calculator size={22} style={{cursor:'pointer'}} onClick={() => setActiveAthlete(a)} />
                      <Save size={22} color={drafts[a.id] ? "#facc15" : "#333"} style={{cursor:'pointer'}} onClick={() => handleSave(a)} />
                      <Share2 size={22} color="#3b82f6" style={{cursor:'pointer'}} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?token=${a.share_token}`); alert("链接已复制！"); }} />
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeAthlete && (
        <div className={role === 'coach' ? "modal" : "entry-card"} style={role !== 'coach' ? {maxWidth:'600px', marginTop:'5vh'} : {}}>
          <div className="modal-content">
            {role === 'coach' && <X size={32} style={{position:'absolute', top:'20px', right:'20px', cursor:'pointer'}} onClick={() => setActiveAthlete(null)} />}
            <div style={{textAlign:'center', marginBottom:'30px'}}>
              <h1 style={{fontSize:'32px', margin:0}}>{activeAthlete.name}</h1>
              <p style={{color:'#4a5568', fontSize:'10px'}}>M-CDS PERFORMANCE MATRIX V3.3</p>
            </div>
            <div style={{overflowX:'auto', background:'#000', borderRadius:'20px', border:'1px solid #222'}}>
              <table style={{width:'100%', minWidth:'650px'}}>
                <thead>
                  <tr style={{background:'#111', fontSize:'10px', color:'#718096'}}>
                    <th style={{padding:'15px'}}>ZONE</th><th>25M</th><th>50M</th><th>100M</th><th>200M</th><th>400M</th><th>HR</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateMCDS(activeAthlete.t_value, activeAthlete.css, activeAthlete.phv_stage, activeAthlete.age).map(r => (
                    <tr key={r.zone} style={{textAlign:'center', borderBottom:'1px solid #111'}}>
                      <td style={{padding:'12px', fontWeight:'bold', textAlign:'left', fontSize:'13px'}}>{r.zone}</td>
                      {r.paces.map((p, i) => (
                        <td key={i}>
                          <div className="pace-tag">{p.val}</div>
                          <div className="range-txt">{p.range}</div>
                        </td>
                      ))}
                      <td style={{color:'#f87171', fontWeight:900, fontSize:'18px'}}>{r.hr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn-full no-print" style={{marginTop:'20px'}} onClick={() => window.print()}><Printer size={18} style={{verticalAlign:'middle', marginRight:'10px'}}/>打印训练单</button>
          </div>
        </div>
      )}
    </div>
  );
}