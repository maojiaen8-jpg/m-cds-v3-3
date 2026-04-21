"use client";

import React, { useEffect, useState } from "react";
import { 
  Printer, Save, Waves, Plus, Zap, Baby, 
  Share2, Eye, X, Calculator, Lock, Users, Activity, LogOut
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- 核心计算引擎 (M-CDS V3.3) ---
const calculateMCDS = (t: number, css: number, stage: string, age: number, strokeKey: string) => {
  const DISTANCES = [25, 50, 100, 200, 400];
  const STROKE_FACTORS: Record<string, number> = { 'Free': 1.0, 'Back': 1.06, 'Fly': 1.12, 'Breast': 1.18 };
  const sFactor = STROKE_FACTORS[strokeKey] || 1.0;
  
  const getPace = (id: string) => {
    let b25 = 0;
    if (id === 'SP') b25 = t;
    else if (id === 'TSP') b25 = t + 0.8;
    else if (id === 'ANP') b25 = t + 2.5;
    else if (id === 'ANE') b25 = t * 1.18;
    else if (id === 'AES') b25 = (stage === 'pre' ? (css / 4 * 1.015) : (t * 1.28));
    else if (id === 'AEN') b25 = (stage === 'pre' ? (css / 4 * 1.055) : (t * 1.38));
    else if (id === 'BAE') b25 = (stage === 'pre' ? (css / 4 * 1.18) : (t * 1.55));
    return b25 * sFactor;
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
  const [user, setUser] = useState<any>(null);
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeAthlete, setActiveAthlete] = useState<any>(null);
  const [drafts, setDrafts] = useState<Record<string, any>>({});

  // 1. 初始化鉴权与路由
  useEffect(() => {
    const init = async () => {
      const token = new URLSearchParams(window.location.search).get("token");
      if (token) {
        setRole("parent");
        const { data } = await supabase.from("athletes").select("*").eq("share_token", token).single();
        if (data) setActiveAthlete(data);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          setRole("coach");
          loadData();
        }
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
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("登录失败: " + error.message);
    else window.location.reload();
    setLoading(false);
  };

  const handleSave = async (athlete: any) => {
    const edit = drafts[athlete.id];
    if (!edit) return;
    const { error } = await supabase.from("athletes").update(edit).eq("id", athlete.id);
    if (!error) {
      alert("同步成功！");
      setDrafts({});
      loadData();
    }
  };

  const handleAdd = async () => {
    const name = prompt("姓名:");
    if (!name) return;
    const { error } = await supabase.from("athletes").insert([{
      name, age:14, t_value:15, css:80, phv_stage:'post', stroke:'Free',
      share_token: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
      coach_id: user?.id
    }]);
    if (!error) loadData();
  };

  return (
    <div className="mcds-app">
      <style>{`
        .mcds-app { background: radial-gradient(circle at top, #1a1c24, #05070a); color: #e2e8f0; min-height: 100vh; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 20px; }
        .card-ui { width: 100%; max-width: 360px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 32px; padding: 40px 30px; text-align: center; backdrop-filter: blur(10px); margin-top: 10vh; }
        .input-dark { width: 100%; background: #000; border: 1px solid #333; border-radius: 12px; padding: 12px; color: #fff; margin-bottom: 15px; outline: none; box-sizing: border-box; }
        .btn-gold { width: 100%; background: #facc15; color: #000; padding: 15px; border-radius: 16px; font-weight: 900; border: none; cursor: pointer; font-size: 16px; }
        .glass-table { width: 100%; max-width: 1000px; background: rgba(15, 20, 28, 0.8); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 15px; overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 700px; }
        th, td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.03); text-align: left; }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 15px; }
        .modal-content { width: 100%; max-width: 900px; background: #0a0c10; border: 1px solid #333; border-radius: 30px; padding: 20px; position: relative; }
        .pace-tag { color: #10b981; font-family: monospace; font-weight: bold; font-size: 16px; }
        .in-gold { background: #000; border: 1px solid #333; color: #facc15; padding: 5px; border-radius: 6px; width: 50px; text-align: center; font-weight: bold; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* 条件渲染视图 */}
      {role === "guest" && (
        <div className="card-ui">
          <Waves size={64} color="#facc15" style={{margin:'0 auto 20px'}} />
          <h1 style={{fontSize:'28px', fontWeight:900, fontStyle:'italic'}}>M-CDS <span style={{color:'#facc15'}}>ELITE</span></h1>
          <button className="btn-gold" onClick={() => setRole("coach_login")}>教练员入口</button>
        </div>
      )}

      {role === "coach_login" && (
        <div className="card-ui">
          <Lock size={48} color="#facc15" style={{margin:'0 auto 20px'}} />
          <h2 style={{marginBottom:'30px'}}>系统登录</h2>
          <input type="email" placeholder="邮箱" className="input-dark" value={email} onChange={e=>setEmail(e.target.value)} />
          <input type="password" placeholder="密码" className="input-dark" value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="btn-gold" onClick={handleLogin}>验证并进入</button>
        </div>
      )}

      {role === "coach" && (
        <div className="glass-table no-print">
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px', alignItems:'center'}}>
            <h2 style={{margin:0}}>我的队伍</h2>
            <button className="btn-gold" style={{width:'auto', padding:'10px 20px'}} onClick={handleAdd}>+ 新增</button>
          </div>
          <table>
            <thead>
              <tr style={{fontSize:'10px', color:'#4a5568'}}>
                <th>姓名</th><th>T-VAL</th><th>CSS</th><th>PHV阶段</th><th>专项</th><th style={{textAlign:'right'}}>操作</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map(a => (
                <tr key={a.id}>
                  <td style={{fontWeight:'bold'}}>{a.name}</td>
                  <td><input className="in-gold" type="number" step="0.1" defaultValue={a.t_value} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], t_value:parseFloat(e.target.value)}})} /></td>
                  <td><input className="in-gold" type="number" step="0.1" defaultValue={a.css} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], css:parseFloat(e.target.value)}})} /></td>
                  <td>
                    <select className="in-gold" style={{width:'80px'}} defaultValue={a.phv_stage} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], phv_stage:e.target.value}})}>
                      <option value="pre">Pre-PHV</option><option value="post">Post-PHV</option>
                    </select>
                  </td>
                  <td>
                    <select className="in-gold" style={{width:'70px'}} defaultValue={a.stroke || 'Free'} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], stroke:e.target.value}})}>
                      <option value="Free">自由泳</option><option value="Back">仰泳</option><option value="Fly">蝶泳</option><option value="Breast">蛙泳</option>
                    </select>
                  </td>
                  <td style={{textAlign:'right'}}>
                    <div style={{display:'flex', justifyContent:'flex-end', gap:'12px'}}>
                      <Calculator size={20} style={{cursor:'pointer'}} onClick={() => setActiveAthlete(a)} />
                      <Save size={20} color={drafts[a.id] ? "#facc15" : "#333"} style={{cursor:'pointer'}} onClick={() => handleSave(a)} />
                      <Share2 size={20} color="#3b82f6" style={{cursor:'pointer'}} onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}?token=${a.share_token}`);
                        alert("分享链接已复制！");
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => { supabase.auth.signOut(); window.location.reload(); }} style={{background:'none', border:'none', color:'#4a5568', marginTop:'20px', cursor:'pointer'}}>退出登录</button>
        </div>
      )}

      {/* 计算器弹窗 / 家长端视图 */}
      {activeAthlete && (
        <div className={role === 'coach' ? "modal" : "glass-table"} style={role !== 'coach' ? {marginTop:'5vh'} : {}}>
          <div className="modal-content">
            {role === 'coach' && <X size={32} style={{position:'absolute', top:'20px', right:'20px', cursor:'pointer'}} onClick={() => setActiveAthlete(null)} />}
            <div style={{textAlign:'center', marginBottom:'30px'}}>
              <h1 style={{fontSize:'32px', margin:0}}>{activeAthlete.name}</h1>
              <p style={{color:'#facc15', fontSize:'12px'}} suppressHydrationWarning>{activeAthlete.stroke === 'Free' ? '自由泳' : activeAthlete.stroke === 'Back' ? '仰泳' : activeAthlete.stroke === 'Fly' ? '蝶泳' : '蛙泳'} | {activeAthlete.phv_stage === 'pre' ? '发育前期' : '发育后期'} | {new Date().toLocaleDateString()}</p>
            </div>
            <div style={{overflowX:'auto', background:'#000', borderRadius:'20px', border:'1px solid #222'}}>
              <table style={{width:'100%', minWidth:'600px'}}>
                <thead>
                  <tr style={{background:'#111', fontSize:'10px', color:'#718096'}}>
                    <th style={{padding:'12px'}}>ZONE</th><th>25M</th><th>50M</th><th>100M</th><th>200M</th><th>400M</th><th>HR</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateMCDS(activeAthlete.t_value, activeAthlete.css, activeAthlete.phv_stage, activeAthlete.age, activeAthlete.stroke || 'Free').map(r => (
                    <tr key={r.zone} style={{textAlign:'center'}}>
                      <td style={{padding:'12px', fontWeight:'bold', textAlign:'left'}}>{r.zone}</td>
                      {r.paces.map((p, i) => (
                        <td key={i}><div className="pace-tag">{p.val}</div><div style={{fontSize:'8px', color:'#4a5568'}}>{p.range}</div></td>
                      ))}
                      <td style={{color:'#f87171', fontWeight:900, fontSize:'18px'}}>{r.hr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn-gold no-print" style={{marginTop:'20px'}} onClick={() => window.print()}>打印今日课表</button>
          </div>
        </div>
      )}
    </div>
  );
}