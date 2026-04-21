"use client";

import React, { useEffect, useState } from "react";
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

  // --- 样式定义 ---
  const styles = (
    <style>{`
      .mcds-app { background: radial-gradient(circle at top, #1a1c24, #05070a); color: #e2e8f0; min-height: 100vh; font-family: sans