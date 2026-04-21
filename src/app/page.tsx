"use client";

import React, { useEffect, useState } from "react";
import { 
  Printer, Save, Waves, Plus, Zap, Baby, 
  Share2, Eye, X, Calculator, Lock, Users, Activity
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- 核心计算引擎 ---
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
    paces: DISTANCES.map(d => {
      const val = getPace(zone) * (d / 25);
      return { val: val.toFixed(1) + 's', range: `${(val * 0.98).toFixed(1)}~${(val * 1.02).toFixed(1)}` };
    }),
    hr: Math.round((maxHR * (zone === 'SP' ? 0.98 : zone.startsWith('A') ? 0.85 : 0.75)) / 6)
  }));
};

export default function Page() {
  const [role, setRole] = useState<"guest" | "coach_login" | "coach" | "parent">("guest");
  const [pass, setPass] = useState("");
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeAthlete, setActiveAthlete] = useState<any>(null);
  const [drafts, setDrafts] = useState<Record<string, any>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setRole("parent");
      const loadParent = async () => {
        const { data } = await supabase.from("athletes").select("*").eq("share_token", token).single();
        if (data) setActiveAthlete(data);
      };
      loadParent();
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("athletes").select("*").order("name");
    if (data) setAthletes(data);
    setLoading(false);
  };

  const handleCoachLogin = () => {
    if (pass === "8888") {
      setRole("coach");
      loadData();
    } else {
      alert("密码错误");
    }
  };

  const handleSave = async (athlete: any) => {
    const edit = drafts[athlete.id];
    if (!edit) return;
    const { error } = await supabase.from("athletes").update(edit).eq("id", athlete.id);
    if (!error) {
      alert("云端同步成功！");
      setDrafts({});
      loadData();
    }
  };

  const handleAdd = async () => {
    const name = prompt("姓名:");
    if (!name) return;
    const { error } = await supabase.from("athletes").insert([{
      name, age:14, t_value:15, css:80, phv_stage:'post', share_token: Math.random().toString(36).substring(7)
    }]);
    if (!error) loadData();
  };

  return (
    <div className="mcds-app">
      <style>{`
        .mcds-app { background: radial-gradient(circle at top, #1a1c24, #05070a); color: #e2e8f0; min-height: 100vh; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 20px; }
        .entry-card { margin-top: 10vh; width: 100%; max-width: 360px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 32px; padding: 40px 30px; text-align: center; backdrop-filter: blur(10px); }
        .role-btn { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 20px; margin-top: 20px; cursor: pointer; transition: 0.3s; }
        .role-btn:hover { background: rgba(250, 204, 21, 0.1); border-color: #facc15; }
        .input-gold { width: 100%; background: #000; border: 2px solid #2d3748; border-radius: 16px; padding: 15px; color: #facc15; text-align: center; font-size: 24px; margin-bottom: 20px; outline: none; }
        .btn-full { width: 100%; background: #facc15; color: #000; padding: 15px; border-radius: 16px; font-weight: 900; border: none; cursor: pointer; font-size: 16px; }
        .glass-table { width: 100%; max-width: 1000px; background: rgba(15, 20, 28, 0.8); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 20px; overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 600px; }
        th { text-align: left; font-size: 10px; color: #4a5568; text-transform: uppercase; padding: 15px 10px; }
        td { padding: 15px 10px; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-content { width: 100%; max-width: 800px; background: #0a0c10; border: 1px solid #333; border-radius: 30px; padding: 30px; position: relative; }
        .pace-tag { color: #10b981; font-family: monospace; font-weight: bold; font-size: 18px; }
        .in-dark { background: #000; border: 1px solid #333; color: #facc15; padding: 5px; border-radius: 6px; width: 50px; text-align: center; font-weight: bold; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {role === "guest" && (
        <div className="entry-card">
          <Waves size={64} color="#facc15" style={{margin:'0 auto'}} />
          <h1 style={{fontSize:'28px', fontWeight:900, fontStyle:'italic', margin:'20px 0'}}>M-CDS <span style={{color:'#facc15'}}>ELITE</span></h1>
          <div className="role-btn" onClick={() => setRole("coach_login")}>
            <Users size={32} color="#10b981" />
            <div style={{fontWeight:'bold', marginTop:'10px'}}>教练端入口</div>
          </div>
          <p style={{fontSize:'10px', color:'#4a5568', marginTop:'30px'}}>家长端请通过教练分享的链接进入</p>
        </div>
      )}

      {role === "coach_login" && (
        <div className="entry-card">
          <Lock size={48} color="#facc15" style={{margin:'0 auto 20px'}} />
          <h2 style={{marginBottom:'30px'}}>请输入认证码</h2>
          <input type="password" className="input-gold" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleCoachLogin()} />
          <button className="btn-full" onClick={handleCoachLogin}>进入系统</button>
        </div>
      )}

      {role === "coach" && (
        <div className="glass-table no-print">
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'30px'}}>
            <h2 style={{margin:0}}>运动员管理后台</h2>
            <button className="btn-full" style={{width:'auto', padding:'10px 20px'}} onClick={handleAdd}>+ 新增运动员</button>
          </div>
          <table>
            <thead>
              <tr><th>姓名</th><th>T-VAL</th><th>CSS</th><th style={{textAlign:'right'}}>操作</th></tr>
            </thead>
            <tbody>
              {athletes.map(a => (
                <tr key={a.id}>
                  <td style={{fontWeight:'bold'}}>{a.name}</td>
                  <td><input className="in-dark" type="number" step="0.1" defaultValue={a.t_value} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], t_value:parseFloat(e.target.value)}})} /></td>
                  <td><input className="in-dark" type="number" step="0.1" defaultValue={a.css} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], css:parseFloat(e.target.value)}})} /></td>
                  <td style={{textAlign:'right'}}>
                    <div style={{display:'flex', justifyContent:'flex-end', gap:'15px'}}>
                      <Calculator size={20} style={{cursor:'pointer'}} onClick={() => setActiveAthlete(a)} />
                      <Save size={20} color={drafts[a.id] ? "#facc15" : "#333"} style={{cursor:'pointer'}} onClick={() => handleSave(a)} />
                      <Share2 size={20} color="#3b82f6" style={{cursor:'pointer'}} onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}?token=${a.share_token}`);
                        alert("链接已复制！");
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(activeAthlete || role === "parent") && (
        <div className={role === 'coach' ? "modal" : ""}>
          <div className="modal-content">
            {role === 'coach' && <X size={32} style={{position:'absolute', top:'20px', right:'20px', cursor:'pointer'}} onClick={() => setActiveAthlete(null)} />}
            <div style={{textAlign:'center', marginBottom:'30px'}}>
              <h1 style={{fontSize:'32px', margin:0}}>{activeAthlete?.name}</h1>
              <p style={{color:'#4a5568', fontSize:'10px', letterSpacing:'2px'}}>M-CDS PERFORMANCE MATRIX V3.3</p>
            </div>
            <div style={{overflowX:'auto', background:'#000', borderRadius:'20px', border:'1px solid #222'}}>
              <table style={{width:'100%', minWidth:'500px'}}>
                <thead>
                  <tr style={{background:'#111'}}><th>强度</th><th>25M</th><th>50M</th><th>100M</th><th>HR/10S</th></tr>
                </thead>
                <tbody>
                  {activeAthlete && calculateMCDS(activeAthlete.t_value, activeAthlete.css, activeAthlete.phv_stage, activeAthlete.age).map(r => (
                    <tr key={r.zone} style={{textAlign:'center'}}>
                      <td style={{padding:'15px', fontWeight:'bold', textAlign:'left'}}>{r.zone}</td>
                      <td><div className="pace-tag">{r.paces[0].val}</div></td>
                      <td><div className="pace-tag">{r.paces[1].val}</div></td>
                      <td><div className="pace-tag">{r.paces[2].val}</div></td>
                      <td style={{color:'#f87171', fontWeight:900, fontSize:'20px'}}>{r.hr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn-full no-print" style={{marginTop:'20px'}} onClick={() => window.print()}>打印今日课表</button>
          </div>
        </div>
      )}
      {loading && <div style={{marginTop:'20px', color:'#facc15'}}>正在同步云端数据...</div>}
    </div>
  );
}