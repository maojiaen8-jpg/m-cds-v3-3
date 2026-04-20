export const MCDS_CONFIG = {
  protocolVersion: "v3.3",
  poolFactor: 1.035,
  defaultCompensationSeconds: 2.5,
  postPhvAnpCompensationSeconds: 1.8,
  paceRangeRatio: 0.02,
  intensityZones: {
    SP: {
      label: "SP",
      title: "磷酸原速度",
      basis: "T-Value"
    },
    TSP_ANP: {
      label: "TSP/ANP",
      title: "技术冲刺",
      basis: "T-Value + 补偿值"
    },
    ANE: {
      label: "ANE",
      title: "无氧耐力",
      basis: "T-Value * 1.18"
    },
    AES: {
      label: "AES",
      title: "有氧效率速度",
      basis: "Pre-PHV: CSS*102% / Post-PHV: T-Value 比例"
    },
    AEN: {
      label: "AEN",
      title: "有氧耐力",
      basis: "Pre-PHV: CSS*100% / Post-PHV: T-Value 比例"
    },
    BAE: {
      label: "BAE",
      title: "基础有氧耐力",
      basis: "CSS*95%"
    },
    REC: {
      label: "REC",
      title: "恢复技术",
      basis: "CSS*90% 参考"
    }
  },
  prePhvCssRatios: {
    AES: 1.02,
    AEN: 1.0,
    BAE: 0.95,
    REC: 0.9
  },
  postPhvTValueRatios: {
    AES: 8.4,
    AEN: 9.0,
    REC: 10.8
  },
  aneRatio: 1.18,
  riRules: {
    anaerobic: {
      25: 180,
      50: 300
    },
    aerobic: {
      100: 10,
      200: 20,
      400: 30
    }
  }
} as const;

export const STROKE_OPTIONS = ["自由泳", "仰泳", "蝶泳", "蛙泳"] as const;
export const DISTANCE_OPTIONS = [25, 50, 100, 200, 400] as const;
export const POOL_LENGTH_OPTIONS = [25, 50] as const;
