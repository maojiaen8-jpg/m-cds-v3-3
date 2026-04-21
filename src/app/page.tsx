"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Printer, Save, ShieldCheck, Waves } from "lucide-react";
import { supabase } from "@/lib/supabase";

type PhvStage = "pre" | "post";

type Athlete = {
  id: string;
  name: string;
  age: number | null;
  phv_stage: PhvStage | null;
  t_value: number | null;
  css: number | null;
  height: number | null;
  weight: number | null;
  dps: number | null;
  share_token: string | null;
  updated_at?: string | null;
};

type Measurement = {
  id: string;
  athlete_id: string;
  t_value: number | null;
  css: number | null;
  height: number | null;
  weight: number | null;
  dps: number | null;
  created_at: string;
};

type DraftEdits = Record<
  string,
  {
    t_value: number;
    css: number;
    height: number;
    weight: number;
    dps: number;
    age: number;
    phv_stage: PhvStage;
  }
>;

const num = (v: number | null | undefined) => (typeof v === "number" ? v : 0);

const getGap = (tValue: number | null, css: number | null) => {
  const t = num(tValue);
  const c = num(css);
  if (t <= 0 || c <= 0) {
    return { label: "--", aabi: 0 };
  }
  const aabi = (c / 4) / t;
  if (aabi > 1.05) return { label: "耐力缺口", aabi };
  if (aabi < 0.95) return { label: "速度缺口", aabi };
  return { label: "平衡", aabi };
};

const formatMetric = (value: number | null, digits = 1) =>
  typeof value === "number" ? value.toFixed(digits) : "--";

function TVTrendChart({ data }: { data: Measurement[] }) {
  const points = useMemo(() => {
    if (!data.length) return "";
    const tValues = data.map((d) => num(d.t_value));
    const min = Math.min(...tValues);
    const max = Math.max(...tValues);
    const span = Math.max(max - min, 1);
    return data
      .map((item, index) => {
        const x = (index / Math.max(data.length - 1, 1)) * 100;
        const y = 100 - ((num(item.t_value) - min) / span) * 100;
        return `${x},${y}`;
      })
      .join(" ");
  }, [data]);

  if (!data.length) {
    return <div className="empty-line">暂无历史 T-Value 数据</div>;
  }

  return (
    <div className="trend-box">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="trend-svg">
        <polyline fill="none" stroke="#f5c451" strokeWidth="1.8" points={points} />
      </svg>
      <div className="trend-legend">
        {data.map((d) => (
          <span key={d.id}>{new Date(d.created_at).toLocaleDateString()}</span>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [historyMap, setHistoryMap] = useState<Record<string, Measurement[]>>({});
  const [drafts, setDrafts] = useState<DraftEdits>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("token") ?? "";
  }, []);

  const isParentView = Boolean(token);

  const parentAthlete = useMemo(
    () => athletes.find((a) => a.share_token === token) ?? null,
    [athletes, token],
  );

  const loadData = async () => {
    setLoading(true);
    setErrorMsg("");
    const { data: athleteRows, error: athleteError } = await supabase
      .from("athletes")
      .select("id,name,age,phv_stage,t_value,css,height,weight,dps,share_token,updated_at")
      .order("name", { ascending: true });

    if (athleteError) {
      setErrorMsg(athleteError.message);
      setLoading(false);
      return;
    }

    const athletesData = (athleteRows ?? []) as Athlete[];
    setAthletes(athletesData);

    const { data: measurementsRows, error: mError } = await supabase
      .from("measurements")
      .select("id,athlete_id,t_value,css,height,weight,dps,created_at")
      .order("created_at", { ascending: true });

    if (mError) {
      setErrorMsg(mError.message);
      setLoading(false);
      return;
    }

    const grouped: Record<string, Measurement[]> = {};
    for (const row of (measurementsRows ?? []) as Measurement[]) {
      if (!grouped[row.athlete_id]) grouped[row.athlete_id] = [];
      grouped[row.athlete_id].push(row);
    }
    setHistoryMap(grouped);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleFieldChange = (
    athlete: Athlete,
    key: keyof DraftEdits[string],
    value: string,
  ) => {
    const parsed =
      key === "phv_stage"
        ? (value as PhvStage)
        : Number.isFinite(Number(value))
          ? Number(value)
          : 0;
    setDrafts((prev) => {
      const base = prev[athlete.id] ?? {
        t_value: num(athlete.t_value),
        css: num(athlete.css),
        height: num(athlete.height),
        weight: num(athlete.weight),
        dps: num(athlete.dps),
        age: num(athlete.age),
        phv_stage: (athlete.phv_stage ?? "post") as PhvStage,
      };
      return {
        ...prev,
        [athlete.id]: {
          ...base,
          [key]: parsed as never,
        },
      };
    });
  };

  const handleSave = async (athlete: Athlete) => {
    const draft = drafts[athlete.id];
    if (!draft) return;
    setSavingId(athlete.id);
    setErrorMsg("");

    const updatePayload = {
      age: draft.age,
      phv_stage: draft.phv_stage,
      t_value: draft.t_value,
      css: draft.css,
      height: draft.height,
      weight: draft.weight,
      dps: draft.dps,
    };

    const { error: updateError } = await supabase
      .from("athletes")
      .update(updatePayload)
      .eq("id", athlete.id);

    if (updateError) {
      setErrorMsg(updateError.message);
      setSavingId(null);
      return;
    }

    const { error: insertError } = await supabase.from("measurements").insert({
      athlete_id: athlete.id,
      t_value: draft.t_value,
      css: draft.css,
      height: draft.height,
      weight: draft.weight,
      dps: draft.dps,
    });

    if (insertError) {
      setErrorMsg(insertError.message);
      setSavingId(null);
      return;
    }

    await loadData();
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[athlete.id];
      return next;
    });
    setSavingId(null);
  };

  const exportGroupPdf = () => {
    window.print();
  };

  return (
    <div className="mcds-container">
      <style>{`
        .mcds-container { background: radial-gradient(circle at top, #151005, #08090d 45%, #020304 100%); color: #e6edf8; min-height: 100vh; padding: 16px; font-family: Inter, sans-serif; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 10px; flex-wrap: wrap; }
        .title { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 0.5px; }
        .gold { color: #f5c451; }
        .btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #6f5a20; background: linear-gradient(180deg, #2c220e, #171106); color: #f5d98d; padding: 8px 12px; border-radius: 10px; cursor: pointer; font-weight: 700; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .card { background: linear-gradient(180deg, rgba(18,18,24,0.95), rgba(9,9,12,0.95)); border: 1px solid #2f3542; border-radius: 14px; padding: 14px; margin-bottom: 14px; box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
        .table-wrap { overflow-x: auto; border: 1px solid #2f3542; border-radius: 14px; background: #0d1018; }
        .athlete-table { width: 100%; min-width: 1120px; border-collapse: collapse; }
        .athlete-table th, .athlete-table td { padding: 10px 8px; border-bottom: 1px solid #1a2231; text-align: center; }
        .athlete-table th { font-size: 11px; text-transform: uppercase; color: #98a5ba; letter-spacing: 0.5px; background: #111722; white-space: nowrap; }
        .athlete-table td.name { text-align: left; font-weight: 700; color: #f6f8ff; min-width: 140px; }
        .metric-input { width: 74px; background: #070a0f; color: #f8d98f; border: 1px solid #2d3547; border-radius: 8px; padding: 6px; }
        .metric-select { background: #070a0f; color: #f8d98f; border: 1px solid #2d3547; border-radius: 8px; padding: 6px; }
        .tag { padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
        .gap-endurance { background: rgba(62, 207, 142, 0.18); color: #3ecf8e; }
        .gap-speed { background: rgba(255, 107, 107, 0.2); color: #ff6b6b; }
        .gap-balance { background: rgba(245, 196, 81, 0.2); color: #f5c451; }
        .meta { color: #8f9db2; font-size: 12px; }
        .error { color: #ff8d8d; margin-bottom: 10px; }
        .dashboard-grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 10px; margin-bottom: 12px; }
        .kpi { border: 1px solid #3b3320; border-radius: 12px; background: #100f0a; padding: 12px; }
        .kpi .label { font-size: 11px; color: #ad9a65; text-transform: uppercase; }
        .kpi .value { margin-top: 6px; font-size: 24px; font-weight: 900; color: #f5d98d; }
        .trend-box { border: 1px solid #3b3320; border-radius: 12px; background: #0d0a04; padding: 12px; }
        .trend-svg { width: 100%; height: 220px; display: block; background: linear-gradient(180deg, rgba(245,196,81,0.05), transparent); border-radius: 8px; }
        .trend-legend { margin-top: 8px; display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 4px; color: #7f8ca1; font-size: 10px; }
        .empty-line { color: #6f7f98; font-size: 13px; padding: 18px; text-align: center; }
        .print-only { display: none; }
        @media (max-width: 768px) {
          .dashboard-grid { grid-template-columns: repeat(2, minmax(120px, 1fr)); }
          .metric-input { width: 64px; }
        }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; color: #000; background: #fff; }
        }
      `}</style>

      <div className="no-print">
        <header className="header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Waves size={24} color="#f5c451" />
            <h1 className="title">
              M-CDS <span className="gold">CLOUD COACH</span>
            </h1>
          </div>
          {!isParentView && (
            <button type="button" className="btn" onClick={exportGroupPdf}>
              <Printer size={16} />
              一键导出全组 PDF
            </button>
          )}
        </header>

        {errorMsg && <div className="error">错误：{errorMsg}</div>}
        {loading && <div className="meta">正在加载云端数据...</div>}

        {!loading && isParentView && !parentAthlete && (
          <div className="card">
            <div className="error">分享链接无效：未找到对应运动员。</div>
          </div>
        )}

        {!loading && isParentView && parentAthlete && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>
                家长端看板 · <span className="gold">{parentAthlete.name}</span>
              </h2>
              <div className="meta" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <ShieldCheck size={14} /> 只读模式
              </div>
            </div>
            <div className="dashboard-grid">
              <div className="kpi"><div className="label">年龄</div><div className="value">{formatMetric(parentAthlete.age, 0)}</div></div>
              <div className="kpi"><div className="label">PHV</div><div className="value">{parentAthlete.phv_stage ?? "--"}</div></div>
              <div className="kpi"><div className="label">T-Value</div><div className="value">{formatMetric(parentAthlete.t_value)}s</div></div>
              <div className="kpi"><div className="label">CSS</div><div className="value">{formatMetric(parentAthlete.css)}s</div></div>
              <div className="kpi"><div className="label">身高</div><div className="value">{formatMetric(parentAthlete.height)}cm</div></div>
              <div className="kpi"><div className="label">体重</div><div className="value">{formatMetric(parentAthlete.weight)}kg</div></div>
              <div className="kpi"><div className="label">DPS</div><div className="value">{formatMetric(parentAthlete.dps, 2)}</div></div>
              <div className="kpi">
                <div className="label">Gap Analysis</div>
                <div className="value" style={{ fontSize: 20 }}>{getGap(parentAthlete.t_value, parentAthlete.css).label}</div>
              </div>
            </div>
            <h3 style={{ marginTop: 8, marginBottom: 8 }}>历史 T-Value 趋势</h3>
            <TVTrendChart data={historyMap[parentAthlete.id] ?? []} />
          </div>
        )}

        {!loading && !isParentView && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0 }}>运动员总表（云端）</h2>
                <div className="meta">默认展示全队名单，支持直接编辑并保存到 Supabase。</div>
              </div>
              <div className="meta">当前人数：{athletes.length}</div>
            </div>
            <div className="table-wrap">
              <table className="athlete-table">
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>年龄</th>
                    <th>PHV</th>
                    <th>最新 T-Value</th>
                    <th>最新 CSS</th>
                    <th>身高</th>
                    <th>体重</th>
                    <th>DPS</th>
                    <th>潜力分析</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {athletes.map((athlete) => {
                    const draft = drafts[athlete.id];
                    const current = draft ?? {
                      age: num(athlete.age),
                      phv_stage: (athlete.phv_stage ?? "post") as PhvStage,
                      t_value: num(athlete.t_value),
                      css: num(athlete.css),
                      height: num(athlete.height),
                      weight: num(athlete.weight),
                      dps: num(athlete.dps),
                    };
                    const gap = getGap(current.t_value, current.css);
                    const gapClass =
                      gap.label === "耐力缺口"
                        ? "gap-endurance"
                        : gap.label === "速度缺口"
                          ? "gap-speed"
                          : "gap-balance";
                    return (
                      <tr key={athlete.id}>
                        <td className="name">{athlete.name}</td>
                        <td><input className="metric-input" type="number" value={current.age} onChange={(e) => handleFieldChange(athlete, "age", e.target.value)} /></td>
                        <td>
                          <select className="metric-select" value={current.phv_stage} onChange={(e) => handleFieldChange(athlete, "phv_stage", e.target.value)}>
                            <option value="pre">pre</option>
                            <option value="post">post</option>
                          </select>
                        </td>
                        <td><input className="metric-input" type="number" step="0.1" value={current.t_value} onChange={(e) => handleFieldChange(athlete, "t_value", e.target.value)} /></td>
                        <td><input className="metric-input" type="number" step="0.1" value={current.css} onChange={(e) => handleFieldChange(athlete, "css", e.target.value)} /></td>
                        <td><input className="metric-input" type="number" step="0.1" value={current.height} onChange={(e) => handleFieldChange(athlete, "height", e.target.value)} /></td>
                        <td><input className="metric-input" type="number" step="0.1" value={current.weight} onChange={(e) => handleFieldChange(athlete, "weight", e.target.value)} /></td>
                        <td><input className="metric-input" type="number" step="0.01" value={current.dps} onChange={(e) => handleFieldChange(athlete, "dps", e.target.value)} /></td>
                        <td>
                          <span className={`tag ${gapClass}`}>
                            {gap.label} {gap.aabi > 0 ? `(${gap.aabi.toFixed(2)})` : ""}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn"
                            disabled={!draft || savingId === athlete.id}
                            onClick={() => handleSave(athlete)}
                          >
                            <Save size={14} />
                            {savingId === athlete.id ? "保存中..." : "保存"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="print-only">
        <h1>M-CDS CLOUD ATHLETES REPORT</h1>
        <p>导出时间：{new Date().toLocaleString()}</p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #333" }}>姓名</th>
              <th style={{ borderBottom: "1px solid #333" }}>年龄</th>
              <th style={{ borderBottom: "1px solid #333" }}>PHV</th>
              <th style={{ borderBottom: "1px solid #333" }}>T</th>
              <th style={{ borderBottom: "1px solid #333" }}>CSS</th>
              <th style={{ borderBottom: "1px solid #333" }}>AABI</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map((a) => {
              const gap = getGap(a.t_value, a.css);
              return (
                <tr key={`p-${a.id}`}>
                  <td style={{ padding: "4px 0" }}>{a.name}</td>
                  <td style={{ textAlign: "center" }}>{formatMetric(a.age, 0)}</td>
                  <td style={{ textAlign: "center" }}>{a.phv_stage ?? "--"}</td>
                  <td style={{ textAlign: "center" }}>{formatMetric(a.t_value)}</td>
                  <td style={{ textAlign: "center" }}>{formatMetric(a.css)}</td>
                  <td style={{ textAlign: "center" }}>{gap.aabi > 0 ? gap.aabi.toFixed(2) : "--"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}