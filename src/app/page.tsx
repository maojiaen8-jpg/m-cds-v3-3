"use client";

import React, { useEffect, useMemo, useState } from "react";
import { 
  Printer, Save, Waves, Plus, Zap, Baby, 
  Share2, Eye, X, Calculator, Lock, Users, Activity
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- 核心计算引擎 (M-CDS V3.3) ---
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
    hr: Math.round((maxHR * (zone === 'SP' ? 0.98 : 0.85)) / 6)
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
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      setRole("parent");
      loadParentData(token);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("athletes").select("*").order("name");
    if (data) setAthletes(data);
    setLoading(false);
  };

  const loadParentData = async (token: string) => {
    const { data } = await supabase.from("athletes").select("*").eq("share_token", token).single();
    if (data) setActiveAthlete(data);
  };

  const handleCoachLogin = () => {
    if (pass === "8888") {
      setRole("coach");
      loadData();
    } else {
      alert("密码错误");
    }
  };

  return (
    <div className="mcds-app">
      <style>{`
        /* 全局样式重置 */
        .mcds-app { 
          background: radial-gradient(circle at top, #1a1c24, #05070a);
          color: #e2e8f0; 
          min-height: 100vh; 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
        }

        /* 登录入口页面 */
        .entry-card {
          margin-top: 10vh;
          width: 100%;
          max-width: 360px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 32px;
          padding: 40px 30px;
          text-align: center;
          backdrop-filter: blur(10px);
        }
        .logo-anim { animation: pulse 2s infinite ease-in-out; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }
        
        .main-title { font-size: 28px; font-weight: 900; letter-spacing: -1px; margin: 20px 0 10px; font-style: italic; }
        .sub-title { font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px; }

        .role-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: 0.3s;
        }
        .role-btn:hover { background: rgba(250, 204, 21, 0.1); border-color: #facc15; }
        
        .input-gold {
          width: 100%;
          background: #000;
          border: 2px solid #2d3748;
          border-radius: 16px;
          padding: 15px;
          color: #facc15;
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
          outline: none;
        }
        .input-gold:focus { border-color: #facc15; box-shadow: 0 0 15px rgba(250, 204, 21, 0.3); }

        .btn-full {
          width: 100%;
          background: #facc15;
          color: #000;
          padding: 15px;
          border-radius: 16px;
          font-weight: 900;
          border: none;
          cursor: pointer;
          font-size: 16px;
        }

        /* 管理面板样式 */
        .dashboard { width: 100%; max-width: 1000px; }
        .glass-table { 
          background: rgba(15, 20, 28, 0.8); 
          border: 1px solid rgba(255,255,255,0.05); 
          border-radius: 24px; 
          padding: 20px; 
          overflow-x: auto; 
        }
        table { width: 100%; border-collapse: collapse; min-width: 600px; }
        th { text-align: left; font-size: 10px; color: #4a5568; text-transform: uppercase; padding: 15px 10px; }
        td { padding: 15px 10px; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .name-txt { font-weight: bold; font-size: 16px; }

        /* 弹窗样式 */
        .modal { 
          position: fixed; inset: 0; background: rgba(0,0,0,0.95); 
          z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; 
        }
        .modal-content { 
          width: 100%; max-width: 800px; background: #0a0c10; 
          border: 1px solid #333; border-radius: 30px; padding: 30px; position: relative;
        }
        .pace-tag { color: #10b981; font-family: monospace; font-weight: bold; font-size: 18px; }
        .range-tag { font-size: 10px; color: #4a5568; }

        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* 1. 初始选择入口 */}
      {role === "guest" && (
        <div className="entry-card">
          <Waves size={64} color="#facc15" className="logo-anim" style={{margin:'0 auto'}} />
          <h1 className="main-title">M-CDS <span style={{color:'#facc15'}}>ELITE</span></h1>
          <p className="sub-title">Athlete Data System</p>
          <div className="role-btn" onClick={() => setRole("coach_login")}>
            <Users size={32} color="#10b981" style={{marginBottom: '10px'}} />
            <span style={{fontWeight:'bold', fontSize:'18px'}}>教练端入口</span>
            <span style={{fontSize:'10px', color:'#4a5568', marginTop:'5px'}}>管理队员及导出计划</span>
          </div>
          <p style={{fontSize:'10px', color:'#4a5568', marginTop:'30px'}}>家长端请点击教练分享的专属链接进入</p>
        </div>
      )}

      {/* 2. 教练登录页 */}
      {role === "coach_login" && (
        <div className="entry-card">
          <Lock size={48} color="#facc15" style={{margin:'0 auto 20px'}} />
          <h2 style={{marginBottom: '30px'}}>请输入认证码</h2>
          <input 
            type="password" 
            className="input-gold" 
            placeholder="••••"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCoachLogin()}
          />
          <button className="btn-full" onClick={handleCoachLogin}>验证并进入</button>
          <button style={{background:'none', border:'none', color:'#4a5568', marginTop:'20px', cursor:'pointer'}} onClick={() => setRole("guest")}>返回</button>
        </div>
      )}

      {/* 3. 教练管理后台 */}
      {role === "coach" && (
        <div className="dashboard no-print">
          <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', marginBottom:'30px'}}>
             <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <Waves color="#facc15" />
                <span style={{fontWeight:900, fontSize:'20px'}}>COACH <span style={{color:'#facc15'}}>PANEL</span></span>
             </div>
             <button className="btn-full" style={{width:'auto', padding:'10px 20px'}} onClick={() => alert('点击姓名旁计算器查看')}>+ 新增运动员</button>
          </header>

          <div className="glass-table">
            <table>
              <thead>
                <tr>
                  <th>姓名</th><th>T-VALUE</th><th>CSS</th><th style={{textAlign:'right'}}>操作</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map(a => (
                  <tr key={a.id}>
                    <td className="name-txt">{a.name}</td>
                    <td><span style={{color:'#facc15', fontWeight:'bold'}}>{a.t_value}s</span></td>
                    <td><span style={{color:'#3b82f6', fontWeight:'bold'}}>{a.css}s</span></td>
                    <td style={{textAlign:'right'}}>
                       <div style={{display:'flex', justifyContent:'flex-end', gap:'15px'}}>
                          <Calculator size={20} color="#e2e8f0" style={{cursor:'pointer'}} onClick={() => setActiveAthlete(a)} />
                          <Share2 size={20} color="#3b82f6" style={{cursor:'pointer'}} onClick={() => {
                            const url = `${window.location.origin}?token=${a.share_token}`;
                            navigator.clipboard.writeText(url);
                            alert("链接已复制，去发给家长吧！");
                          }} />
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. 家长端 & 计算器弹窗 */}
      {(activeAthlete) && (
        <div className={role === 'coach' ? "modal" : "dashboard"}>
          <div className="modal-content">
            {role === 'coach' && <X size={32} style={{position:'absolute', top:'20px', right:'20px', cursor:'pointer'}} onClick={() => setActiveAthlete(null)} />}
            
            <div style={{textAlign:'center', marginBottom:'40px'}}>
              <Activity color="#facc15" size={40} style={{margin:'0 auto 10px'}} />
              <h1 style={{fontSize:'36px', margin:0, fontWeight:900}}>{activeAthlete.name}</h1>
              <p style={{color:'#4a5568', textTransform:'uppercase', fontSize:'10px', letterSpacing:'2px'}}>Performance Matrix V3.3</p>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', marginBottom:'30px'}}>
               <div style={{background:'#111', padding:'20px', borderRadius:'20px', textAlign:'center', border:'1px solid #222'}}>
                 <div style={{fontSize:'10px', color:'#4a5568', marginBottom:'5px'}}>T-VALUE</div>
                 <div style={{fontSize:'24px', fontWeight:900, color:'#10b981'}}>{activeAthlete.t_value}s</div>
               </div>
               <div style={{background:'#111', padding:'20px', borderRadius:'20px', textAlign:'center', border:'1px solid #222'}}>
                 <div style={{fontSize:'10px', color:'#4a5568', marginBottom:'5px'}}>CSS PACE</div>
                 <div style={{fontSize:'24px', fontWeight:900, color:'#3b82f6'}}>{activeAthlete.css}s</div>
               </div>
            </div>

            <div style={{overflowX:'auto', background:'#000', borderRadius:'20px', border:'1px solid #222'}}>
              <table style={{width:'100%', minWidth:'500px'}}>
                <thead>
                  <tr style={{background:'#111'}}>
                    <th style={{padding:'15px'}}>强度</th><th>25M</th><th>50M</th><th>100M</th><th>HR/10S</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateMCDS