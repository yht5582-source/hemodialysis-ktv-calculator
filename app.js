const TARGET_KTV = 1.4;
const MINIMUM_KTV = 1.2;
const WATER_FRACTION = 0.58;

const EFFICIENCY_OPTIONS = {
  standard: {
    label: "標準",
    koaPerArea: 460,
  },
  high: {
    label: "高效",
    koaPerArea: 540,
  },
  low: {
    label: "保守",
    koaPerArea: 380,
  },
};

const fields = {
  weight: document.querySelector("#weight"),
  dialyzer: document.querySelector("#dialyzer"),
  surfaceArea: document.querySelector("#surface-area"),
  bloodFlow: document.querySelector("#blood-flow"),
  dialysateFlow: document.querySelector("#dialysate-flow"),
  dialysisTime: document.querySelector("#dialysis-time"),
};

const output = {
  clearance: document.querySelector("#clearance-value"),
  currentTime: document.querySelector("#current-time"),
  dialyzerName: document.querySelector("#dialyzer-name"),
  extraLabel: document.querySelector("#extra-label"),
  extraTime: document.querySelector("#extra-time"),
  gaugeFill: document.querySelector("#gauge-fill"),
  koa: document.querySelector("#koa-value"),
  kt: document.querySelector("#kt-value"),
  ktv: document.querySelector("#ktv-value"),
  requiredTime: document.querySelector("#required-time"),
  statusDetail: document.querySelector("#status-detail"),
  statusLabel: document.querySelector("#status-label"),
  statusPanel: document.querySelector("#status-panel"),
  volume: document.querySelector("#volume-value"),
};

let selectedEfficiency = "high";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatFixed(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return value.toFixed(digits);
}

function formatMinutes(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "--";
  }

  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;

  if (hours === 0) {
    return `${mins} 分鐘`;
  }

  return `${hours} 小時 ${mins.toString().padStart(2, "0")} 分`;
}

function estimateClearance(qb, qd, koa) {
  if (qb <= 0 || qd <= 0 || koa <= 0) {
    return 0;
  }

  if (Math.abs(qb - qd) < 0.001) {
    return (qb * koa) / (qb + koa);
  }

  const exponent = clamp(koa * (1 / qd - 1 / qb), -60, 60);
  const expTerm = Math.exp(exponent);
  const denominator = 1 - (qb / qd) * expTerm;

  if (Math.abs(denominator) < 0.000001) {
    return (qb * koa) / (qb + koa);
  }

  const raw = (qb * (1 - expTerm)) / denominator;
  return clamp(raw, 0, Math.min(qb, qd));
}

function statusFor(ktv) {
  if (ktv >= TARGET_KTV) {
    return {
      className: "good",
      detail: "已達成人每週三次血液透析常用目標值。",
      label: "達標",
    };
  }

  if (ktv >= MINIMUM_KTV) {
    return {
      className: "watch",
      detail: "高於最低建議值，但低於常用目標值。",
      label: "接近目標",
    };
  }

  return {
    className: "risk",
    detail: "低於最低建議值，應由照護團隊重新評估處方。",
    label: "未達標",
  };
}

function updateEfficiencyButtons() {
  document
    .querySelectorAll("#efficiency-options button")
    .forEach((button) => {
      button.classList.toggle(
        "selected",
        button.dataset.efficiency === selectedEfficiency,
      );
    });
}

function update() {
  const weightKg = toNumber(fields.weight.value);
  const areaM2 = toNumber(fields.surfaceArea.value);
  const qb = toNumber(fields.bloodFlow.value);
  const qd = toNumber(fields.dialysateFlow.value);
  const timeHours = toNumber(fields.dialysisTime.value);
  const validInputs =
    weightKg > 0 && areaM2 > 0 && qb > 0 && qd > 0 && timeHours > 0;

  if (!validInputs) {
    output.statusPanel.className = "status-panel risk";
    output.dialyzerName.textContent = fields.dialyzer.value || "人工腎臟";
    output.ktv.textContent = "--";
    output.statusLabel.textContent = "待輸入";
    output.statusDetail.textContent = "請輸入正數處方參數。";
    output.gaugeFill.style.width = "0%";
    output.clearance.textContent = "--";
    output.volume.textContent = "--";
    output.kt.textContent = "--";
    output.koa.textContent = "--";
    output.currentTime.textContent = "--";
    output.requiredTime.textContent = "--";
    output.extraLabel.textContent = "尚需增加";
    output.extraTime.textContent = "--";
    return;
  }

  const timeMinutes = timeHours * 60;
  const koa = areaM2 * EFFICIENCY_OPTIONS[selectedEfficiency].koaPerArea;
  const clearance = estimateClearance(qb, qd, koa);
  const distributionVolumeL = weightKg * WATER_FRACTION;
  const ktLiters = (clearance * timeMinutes) / 1000;
  const ktv = ktLiters / distributionVolumeL;
  const requiredMinutes = (TARGET_KTV * distributionVolumeL * 1000) / clearance;
  const extraMinutes = requiredMinutes - timeMinutes;
  const status = statusFor(ktv);

  output.statusPanel.className = `status-panel ${status.className}`;
  output.dialyzerName.textContent = fields.dialyzer.value || "人工腎臟";
  output.ktv.textContent = formatFixed(ktv, 2);
  output.statusLabel.textContent = status.label;
  output.statusDetail.textContent = status.detail;
  output.gaugeFill.style.width = `${clamp((ktv / 2) * 100, 0, 100)}%`;
  output.clearance.textContent = formatFixed(clearance, 0);
  output.volume.textContent = formatFixed(distributionVolumeL, 1);
  output.kt.textContent = formatFixed(ktLiters, 1);
  output.koa.textContent = formatFixed(koa, 0);
  output.currentTime.textContent = formatMinutes(timeMinutes);
  output.requiredTime.textContent = formatMinutes(requiredMinutes);
  output.extraLabel.textContent = extraMinutes > 0 ? "尚需增加" : "目標餘裕";
  output.extraTime.textContent = formatMinutes(Math.abs(extraMinutes));
}

Object.values(fields).forEach((field) => {
  field.addEventListener("input", update);
});

document.querySelectorAll(".preset-grid button").forEach((button) => {
  button.addEventListener("click", () => {
    fields.surfaceArea.value = button.dataset.area;
    fields.dialyzer.value = `人工腎臟 ${button.textContent.trim()}`;
    selectedEfficiency = button.dataset.efficiency;
    updateEfficiencyButtons();
    update();
  });
});

document.querySelectorAll("#efficiency-options button").forEach((button) => {
  button.addEventListener("click", () => {
    selectedEfficiency = button.dataset.efficiency;
    updateEfficiencyButtons();
    update();
  });
});

update();
