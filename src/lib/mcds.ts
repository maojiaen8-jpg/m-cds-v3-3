import { MCDS_CONFIG } from "@/lib/constants";

export type PoolLength = 25 | 50;
export type Stroke = "自由泳" | "仰泳" | "蝶泳" | "蛙泳";
export type ZoneId = "SP" | "TSP" | "ANP" | "ANE" | "AES" | "AEN" | "BAE";

export type AthleteInput = {
  name: string;
  age: number;
  isPostPhv: boolean;
  poolLength: PoolLength;
  stroke: Stroke;
  distance: number;
  tValue: number;
  css100: number;
};

export type ZoneCardData = {
  id: ZoneId;
  title: string;
  pacePer100Seconds: number;
  paceTarget: string;
  range: {
    min: number;
    max: number;
  };
  hr10sRef: string;
  ri: string;
  logicBasis: string;
};

export type MCDSTuning = {
  anpCompensationSeconds: number;
  poolFactor: number;
  paceRangeRatio: number;
};

function resolveTuning(tuning?: Partial<MCDSTuning>): MCDSTuning {
  return {
    anpCompensationSeconds: tuning?.anpCompensationSeconds ?? MCDS_CONFIG.defaultCompensationSeconds,
    poolFactor: tuning?.poolFactor ?? MCDS_CONFIG.poolFactor,
    paceRangeRatio: tuning?.paceRangeRatio ?? MCDS_CONFIG.paceRangeRatio
  };
}

const STROKE_FACTORS: Record<Stroke, { factor: number; maxDist: number }> = {
  自由泳: { factor: 1.0, maxDist: 400 },
  仰泳: { factor: 1.06, maxDist: 400 },
  蝶泳: { factor: 1.12, maxDist: 200 },
  蛙泳: { factor: 1.18, maxDist: 200 }
};

const INTENSITY_CONFIG: Record<
  ZoneId,
  {
    hrPct: number;
    allowedDists: readonly number[];
    getRI: (distance: number) => string;
  }
> = {
  SP: {
    hrPct: 0.98,
    allowedDists: [25, 50],
    getRI: (d) => (d <= 25 ? "3min" : "5min")
  },
  TSP: {
    hrPct: 0.95,
    allowedDists: [25, 50],
    getRI: (d) => (d <= 25 ? "60s" : "90s")
  },
  ANP: {
    hrPct: 0.92,
    allowedDists: [25, 50],
    getRI: (d) => (d <= 25 ? "45s" : "60s")
  },
  ANE: {
    hrPct: 0.88,
    allowedDists: [25, 50, 100, 200],
    getRI: (d) => (d <= 50 ? "20s" : d <= 100 ? "30s" : "45s")
  },
  AES: {
    hrPct: 0.82,
    allowedDists: [25, 50, 100, 200, 400],
    getRI: (d) => (d <= 100 ? "20s" : d <= 200 ? "30s" : "40s")
  },
  AEN: {
    hrPct: 0.75,
    allowedDists: [25, 50, 100, 200, 400],
    getRI: (d) => (d <= 100 ? "15s" : d <= 200 ? "20s" : "30s")
  },
  BAE: {
    hrPct: 0.65,
    allowedDists: [25, 50, 100, 200, 400],
    getRI: (d) => (d <= 100 ? "10s" : "15s")
  }
};

function formatPace(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minute = Math.floor(safeSeconds / 60);
  const rest = safeSeconds - minute * 60;
  const restText = rest.toFixed(1).padStart(4, "0");
  return `${minute}:${restText}`;
}

function calcPaceRange(seconds: number, paceRangeRatio: number): { min: number; max: number } {
  const ratio = paceRangeRatio;
  return {
    min: seconds * (1 - ratio),
    max: seconds * (1 + ratio)
  };
}

function estimateHr10s(zone: ZoneId, age: number): string {
  const cfg = INTENSITY_CONFIG[zone];
  const maxHR = 220 - age;
  return `${((maxHR * cfg.hrPct) / 6).toFixed(1)} 次/10s`;
}

function calcRi(zone: ZoneId, distance: number): string {
  return INTENSITY_CONFIG[zone].getRI(distance);
}

export function getRiRecommendation(zone: ZoneId, distance: number): string {
  return calcRi(zone, distance);
}

function calculateLegacyPace25(input: AthleteInput, zone: ZoneId, tuning: MCDSTuning): number {
  const poolFactor = input.poolLength === 50 ? tuning.poolFactor : 1.0;
  const strokeFactor = STROKE_FACTORS[input.stroke].factor;
  const stage = input.isPostPhv ? "post" : "pre";

  let base25 = 0;
  switch (zone) {
    case "SP":
      base25 = input.tValue * poolFactor;
      break;
    case "TSP":
      base25 = (input.tValue + 0.8) * poolFactor;
      break;
    case "ANP":
      base25 = (input.tValue + tuning.anpCompensationSeconds) * poolFactor;
      break;
    case "ANE":
      base25 = input.tValue * 1.18 * poolFactor;
      break;
    case "AES":
      base25 =
        (stage === "pre" ? (input.css100 / 4) * 1.015 : input.tValue * 1.28) *
        poolFactor;
      break;
    case "AEN":
      base25 =
        (stage === "pre" ? (input.css100 / 4) * 1.055 : input.tValue * 1.38) *
        poolFactor;
      break;
    case "BAE":
      base25 =
        (stage === "pre" ? (input.css100 / 4) * 1.18 : input.tValue * 1.55) *
        poolFactor;
      break;
    default:
      base25 = input.tValue;
  }
  return base25 * strokeFactor;
}

function isDistanceValid(zone: ZoneId, stroke: Stroke, distance: number): boolean {
  const allowed = INTENSITY_CONFIG[zone].allowedDists.includes(distance);
  const strokeLimit = distance <= STROKE_FACTORS[stroke].maxDist;
  return allowed && strokeLimit;
}

function calcZonePacePer100(input: AthleteInput, zone: ZoneId, tuning: MCDSTuning): number {
  const pace25 = calculateLegacyPace25(input, zone, tuning);
  return pace25 * (100 / 25);
}

export function paceForDistanceFromPace100(
  pacePer100Seconds: number,
  distance: number
): number {
  return pacePer100Seconds * (distance / 100);
}

export function formatPaceValue(seconds: number): string {
  return formatPace(seconds);
}

export function getHr10sReference(zone: ZoneId): string {
  const hrPct = INTENSITY_CONFIG[zone].hrPct;
  return `${Math.round(hrPct * 100)}% MaxHR`;
}

export function buildZoneDashboard(
  input: AthleteInput,
  tuningOverride?: Partial<MCDSTuning>
): ZoneCardData[] {
  const tuning = resolveTuning(tuningOverride);
  const zones: Array<{ id: ZoneId; title: string; basis: string }> = [
    { id: "SP", title: "绝对速度 (Sprint)", basis: "SP = T-Value × Pool × Stroke" },
    { id: "TSP", title: "技术冲刺 (Tech-Sprint)", basis: "TSP = (T-Value + 0.8) × Pool × Stroke" },
    {
      id: "ANP",
      title: "无氧功率 (Anaerobic)",
      basis: `ANP = (T-Value + ${tuning.anpCompensationSeconds.toFixed(1)}) × Pool × Stroke`
    },
    { id: "ANE", title: "无氧耐力 (An-Endurance)", basis: "ANE = T-Value × 1.18 × Pool × Stroke" },
    {
      id: "AES",
      title: "有氧动力 (Aerobic Power)",
      basis: input.isPostPhv
        ? "Post: T-Value × 1.28 × Pool × Stroke"
        : "Pre: CSS/4 × 1.015 × Pool × Stroke"
    },
    {
      id: "AEN",
      title: "有氧耐力 (Aerobic Endurance)",
      basis: input.isPostPhv
        ? "Post: T-Value × 1.38 × Pool × Stroke"
        : "Pre: CSS/4 × 1.055 × Pool × Stroke"
    },
    {
      id: "BAE",
      title: "基础有氧 (Base Aerobic)",
      basis: input.isPostPhv
        ? "Post: T-Value × 1.55 × Pool × Stroke"
        : "Pre: CSS/4 × 1.18 × Pool × Stroke"
    }
  ];

  return zones.map((zone) => {
    const pace = calcZonePacePer100(input, zone.id, tuning);
    const range = calcPaceRange(pace, tuning.paceRangeRatio);
    const valid = isDistanceValid(zone.id, input.stroke, input.distance);
    return {
      id: zone.id,
      title: zone.title,
      pacePer100Seconds: pace,
      paceTarget: valid ? formatPace(pace) : "N/A",
      range,
      hr10sRef: estimateHr10s(zone.id, input.age),
      ri: valid ? calcRi(zone.id, input.distance) : "N/A",
      logicBasis: zone.basis
    };
  });
}

export function shouldShowDistanceWarning(stroke: Stroke, distance: number): boolean {
  return (stroke === "蝶泳" || stroke === "蛙泳") && distance > 200;
}
