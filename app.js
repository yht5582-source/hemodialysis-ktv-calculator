/*ENGINE-START*/
const KTV = (() => {
  const TARGET_SP = 1.4;
  const MINIMUM_SP = 1.2;
  const TARGET_STD = 2.3;
  const MINIMUM_STD = 2.1;
  const URR_MINIMUM = 65;
  const WATER_FRACTION = 0.58;
  // FHN 修正 Tattersall：rebound 時間常數（分鐘）
  const TP = { av: 30.7, catheter: 18.5 };

  const EFFICIENCY = {
    standard: { label: "標準", koaPerArea: 460 },
    high: { label: "高效", koaPerArea: 540 },
    low: { label: "保守", koaPerArea: 380 },
  };

  const round2 = (x) => Math.round(x * 100) / 100;

  // 尿素分布於血漿水與紅血球水：Qbw = Qb × [0.93 × (1 − Hct) + 0.72 × Hct]
  function bloodWaterFlow(qb, hctPercent) {
    const hct = hctPercent / 100;
    return qb * (0.93 * (1 - hct) + 0.72 * hct);
  }

  // 逆流式透析器（Michaels）
  function clearance(qb, qd, koa) {
    if (!(qb > 0 && qd > 0 && koa > 0)) return 0;
    const z = qb / qd;
    if (Math.abs(z - 1) < 1e-6) return (qb * koa) / (qb + koa);
    const e = Math.exp(Math.min((koa / qb) * (1 - z), 60));
    return Math.min(Math.max((qb * (e - 1)) / (e - z), 0), Math.min(qb, qd));
  }

  function watson(sex, age, heightCm, weightKg) {
    return sex === "female"
      ? -2.097 + 0.1069 * heightCm + 0.2466 * weightKg
      : 2.447 - 0.09516 * age + 0.1074 * heightCm + 0.3362 * weightKg;
  }

  // spKt/V → eKt/V：eKt/V = spKt/V × t / (t + Tp)
  function equilibrated(sp, minutes, access) {
    return (sp * minutes) / (minutes + (TP[access] || TP.av));
  }

  // KDOQI 2015 / FHN：S 公式 + 每週 UF 校正（mL 與 mL 同單位）
  function standard(e, minutes, n, weeklyUfL, volumeL) {
    const a = -Math.expm1(-e);
    const s = (10080 * a) / minutes / (a / e + 10080 / (n * minutes) - 1);
    const den = 1 - (0.74 / n) * (weeklyUfL / volumeL);
    if (!(den > 0) || !Number.isFinite(s) || s <= 0) return NaN;
    return s / den;
  }

  function status(value, target, minimum) {
    const v = round2(value);
    if (v >= target) return "good";
    if (v >= minimum) return "watch";
    return "risk";
  }

  function validPrescription(p) {
    const errors = [];
    if (!(p.weight >= 20 && p.weight <= 250)) errors.push("體重請輸入 20–250 kg");
    if (!(p.qb >= 50 && p.qb <= 700)) errors.push("血流速請輸入 50–700 mL/min");
    if (!(p.qd >= 100 && p.qd <= 1000)) errors.push("透析液流速請輸入 100–1000 mL/min");
    if (!(p.hours >= 0.5 && p.hours <= 12)) errors.push("透析時間請輸入 0.5–12 小時");
    if (!(p.hct >= 15 && p.hct <= 55)) errors.push("血比容請輸入 15–55%");
    if (!(Number.isInteger(p.sessions) && p.sessions >= 2 && p.sessions <= 7))
      errors.push("每週次數請輸入 2–7");
    if (!(p.ufPerSession >= 0 && p.ufPerSession <= 6)) errors.push("每次脫水量請輸入 0–6 L");
    if (p.koaOverride != null) {
      if (!(p.koaOverride >= 200 && p.koaOverride <= 2500))
        errors.push("已知 KoA 請輸入 200–2500 mL/min");
    } else if (!(p.area >= 0.5 && p.area <= 3)) errors.push("膜面積請輸入 0.5–3 m²");
    if (p.vMethod === "watson") {
      if (!(p.age >= 18 && p.age <= 110)) errors.push("Watson 需年齡 18–110 歲");
      if (!(p.height >= 120 && p.height <= 220)) errors.push("Watson 需身高 120–220 cm");
    }
    return errors;
  }

  function volumeOf(p) {
    return p.vMethod === "watson"
      ? watson(p.sex, p.age, p.height, p.weight)
      : p.weight * WATER_FRACTION;
  }

  function koaOf(p) {
    return p.koaOverride != null
      ? p.koaOverride
      : p.area * (EFFICIENCY[p.efficiency] || EFFICIENCY.standard).koaPerArea;
  }

  // 每週三次看單次 spKt/V；其他頻率看 stdKt/V（KDOQI 2015 3.1、3.3）
  function doseAt(p, qb, hours) {
    const koa = koaOf(p);
    const qbw = bloodWaterFlow(qb, p.hct);
    const k = clearance(qbw, p.qd, koa);
    const v = volumeOf(p);
    const minutes = hours * 60;
    const kt = (k * minutes) / 1000;
    const sp = kt / v;
    const e = equilibrated(sp, minutes, p.access);
    const std = standard(e, minutes, p.sessions, p.ufPerSession * p.sessions, v);
    return { koa, qbw, k, v, kt, sp, e, std };
  }

  function solve(fn, target, lo, hi) {
    if (fn(hi) < target) return Infinity;
    if (fn(lo) >= target) return lo;
    for (let i = 0; i < 60; i += 1) {
      const mid = (lo + hi) / 2;
      if (fn(mid) >= target) hi = mid;
      else lo = mid;
    }
    return hi;
  }

  function prescribe(p) {
    const errors = validPrescription(p);
    if (errors.length) return { ok: false, errors };
    const d = doseAt(p, p.qb, p.hours);
    const thrice = p.sessions === 3;
    const metric = thrice ? "sp" : "std";
    const target = thrice ? TARGET_SP : TARGET_STD;
    const minimum = thrice ? MINIMUM_SP : MINIMUM_STD;
    const value = d[metric];
    const pick = (x) => {
      const v = x[metric];
      return Number.isFinite(v) ? v : -1;
    };
    // 與判讀一致：四捨五入到兩位即算達標
    const goal = target - 0.005;
    const requiredHours = solve((h) => pick(doseAt(p, p.qb, h)), goal, 0.5, 12);
    const requiredQb = solve((q) => pick(doseAt(p, q, p.hours)), goal, 50, 600);
    const warnings = [];
    if (p.qb > p.qd) warnings.push("血流速高於透析液流速，清除率主要受 Qd 限制。");
    if (p.qb > 450) warnings.push("血流速 >450 mL/min：請確認通路可提供，且再循環未增加。");
    if (p.access === "catheter" && p.qb > 400)
      warnings.push("導管通常不易維持 >400 mL/min，實際有效血流可能較低。");
    const ufr = (p.ufPerSession * 1000) / p.weight / p.hours;
    if (ufr > 13) warnings.push(`脫水速率約 ${ufr.toFixed(1)} mL/kg/h（>13），透析中低血壓風險上升。`);
    if (p.vMethod === "weight")
      warnings.push("V 以體重×0.58 估算：女性、高齡或肥胖者常高估 V、低估 Kt/V；可改用 Watson。");
    return {
      ok: true,
      ...d,
      ufr,
      metric,
      target,
      minimum,
      value,
      status: Number.isFinite(value) ? status(value, target, minimum) : "risk",
      requiredHours,
      requiredQb,
      warnings,
    };
  }

  // Daugirdas 第二代：spKt/V = −ln(R − 0.008t) + (4 − 3.5R) × UF / W
  function measured(m) {
    const errors = [];
    if (!(m.pre > 0)) errors.push("請輸入透析前 BUN");
    if (!(m.post > 0)) errors.push("請輸入透析後 BUN");
    if (m.pre > 0 && m.post > 0 && m.post >= m.pre) errors.push("透析後 BUN 應低於透析前");
    if (!(m.hours >= 0.5 && m.hours <= 12)) errors.push("透析時間請輸入 0.5–12 小時");
    if (!(m.uf >= 0 && m.uf <= 8)) errors.push("脫水量請輸入 0–8 L");
    if (!(m.weight >= 20 && m.weight <= 250)) errors.push("透析後體重請輸入 20–250 kg");
    if (errors.length) return { ok: false, errors };
    const r = m.post / m.pre;
    const inner = r - 0.008 * m.hours;
    if (!(inner > 0)) return { ok: false, errors: ["BUN 比值過低，不適用 Daugirdas 公式，請確認數值"] };
    const sp = -Math.log(inner) + ((4 - 3.5 * r) * m.uf) / m.weight;
    const e = equilibrated(sp, m.hours * 60, m.access);
    const urr = (1 - r) * 100;
    return {
      ok: true,
      r,
      urr,
      sp,
      e,
      status: status(sp, TARGET_SP, MINIMUM_SP),
      urrOk: Math.round(urr) >= URR_MINIMUM,
    };
  }

  return {
    TARGET_SP,
    MINIMUM_SP,
    TARGET_STD,
    MINIMUM_STD,
    URR_MINIMUM,
    EFFICIENCY,
    round2,
    bloodWaterFlow,
    clearance,
    watson,
    equilibrated,
    standard,
    status,
    prescribe,
    measured,
  };
})();
if (typeof module !== "undefined") module.exports = KTV;
/*ENGINE-END*/

if (typeof document !== "undefined") {
  const $ = (id) => document.getElementById(id);
  const num = (id) => {
    const raw = $(id).value.trim();
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  };

  const state = { efficiency: "high", vMethod: "weight", access: "av", sex: "male" };
  let autoName = true;

  const STATUS_TEXT = {
    sp: {
      good: ["達標", "單次 spKt/V 已達每週三次的建議目標 1.4。"],
      watch: ["接近目標", "高於最低值 1.2，但低於建議目標 1.4。"],
      risk: ["未達標", "低於最低值 1.2，建議調整時間、血流或人工腎臟。"],
    },
    std: {
      good: ["達標", "每週 stdKt/V 已達非每週三次排程的建議目標 2.3。"],
      watch: ["接近目標", "高於最低值 2.1，但低於建議目標 2.3。"],
      risk: ["未達標", "stdKt/V 低於最低值 2.1，建議增加時間或次數。"],
    },
  };

  const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "--");

  function fmtMinutes(minutes) {
    if (!Number.isFinite(minutes) || minutes < 0) return "--";
    const r = Math.round(minutes);
    if (r === 0) return "0 分鐘";
    const h = Math.floor(r / 60);
    const m = r % 60;
    return h === 0 ? `${m} 分鐘` : `${h} 小時 ${String(m).padStart(2, "0")} 分`;
  }

  function selectSegment(groupId, key, value) {
    document.querySelectorAll(`#${groupId} button`).forEach((b) => {
      const on = b.dataset[key] === value;
      b.classList.toggle("selected", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  function readPrescription() {
    const koa = num("koa");
    return {
      weight: num("weight"),
      vMethod: state.vMethod,
      sex: state.sex,
      age: num("age"),
      height: num("height"),
      area: num("surface-area"),
      efficiency: state.efficiency,
      koaOverride: koa === null ? null : koa,
      qb: num("blood-flow"),
      qd: num("dialysate-flow"),
      hct: num("hct"),
      hours: num("dialysis-time"),
      sessions: num("sessions"),
      access: state.access,
      ufPerSession: num("uf") ?? 0,
    };
  }

  function renderPrescription() {
    const p = readPrescription();
    const r = KTV.prescribe(p);
    const thrice = p.sessions === 3;
    $("target-value").textContent = thrice ? "1.4" : "2.3";
    $("target-label").textContent = thrice ? "spKt/V 目標" : "stdKt/V 目標";
    $("dialyzer-name").textContent = $("dialyzer").value || "人工腎臟";
    const area = $("surface-area");
    area.disabled = p.koaOverride != null;
    document.querySelectorAll("#efficiency-options button, .preset-grid button").forEach((b) => {
      b.disabled = p.koaOverride != null;
    });

    if (!r.ok) {
      $("status-panel").className = "status-panel risk";
      $("ktv-value").textContent = "--";
      $("ktv-caption").textContent = "spKt/V";
      $("status-label").textContent = "待修正";
      $("status-detail").textContent = r.errors.join("；") + "。";
      $("gauge-fill").style.width = "0%";
      ["clearance-value", "volume-value", "kt-value", "koa-value", "qbw-value", "ektv-value",
        "stdktv-value", "current-time", "required-time", "extra-time", "required-qb"].forEach((id) => {
        $(id).textContent = "--";
      });
      $("warnings").hidden = true;
      return;
    }

    const metricName = r.metric === "sp" ? "spKt/V" : "stdKt/V";
    const [label, detail] = STATUS_TEXT[r.metric][r.status];
    $("status-panel").className = `status-panel ${r.status}`;
    $("ktv-value").textContent = fmt(r.value);
    $("ktv-caption").textContent = `處方 ${metricName}`;
    $("status-label").textContent = label;
    $("status-detail").textContent = detail;

    const scaleMax = r.metric === "sp" ? 2 : 3;
    $("gauge-fill").style.width = `${Math.min(Math.max(r.value / scaleMax, 0), 1) * 100}%`;
    $("min-marker").style.left = `${(r.minimum / scaleMax) * 100}%`;
    $("target-marker").style.left = `${(r.target / scaleMax) * 100}%`;
    $("scale-min").style.left = `${(r.minimum / scaleMax) * 100}%`;
    $("scale-target").style.left = `${(r.target / scaleMax) * 100}%`;
    $("scale-min").textContent = `最低 ${r.minimum}`;
    $("scale-target").textContent = `目標 ${r.target}`;
    $("scale-max").textContent = scaleMax.toFixed(1);

    $("clearance-value").textContent = fmt(r.k, 0);
    $("volume-value").textContent = fmt(r.v, 1);
    $("volume-note").textContent = p.vMethod === "watson" ? "L · Watson" : "L · 體重×0.58";
    $("kt-value").textContent = fmt(r.kt, 1);
    $("koa-value").textContent = fmt(r.koa, 0);
    $("koa-note").textContent = p.koaOverride != null ? "mL/min · 手動輸入" : "mL/min · 面積×效率";
    $("qbw-value").textContent = fmt(r.qbw, 0);
    $("ektv-value").textContent = fmt(r.e);
    $("sp-inline").textContent = fmt(r.sp);
    $("stdktv-value").textContent = fmt(r.std);

    const minutes = p.hours * 60;
    const reqMin = r.requiredHours * 60;
    $("current-time").textContent = fmtMinutes(minutes);
    $("required-time").textContent = Number.isFinite(reqMin) ? fmtMinutes(reqMin) : "> 12 小時";
    const extra = reqMin - minutes;
    $("extra-label").textContent = extra > 0 ? "尚需增加" : "目標餘裕";
    $("extra-time").textContent = Number.isFinite(extra) ? fmtMinutes(Math.abs(extra)) : "--";
    $("required-qb").textContent = Number.isFinite(r.requiredQb)
      ? `${Math.ceil(r.requiredQb / 10) * 10} mL/min`
      : "> 600（需延時或換膜）";

    const w = $("warnings");
    w.innerHTML = r.warnings.map((t) => `<li>${t}</li>`).join("");
    w.hidden = r.warnings.length === 0;
  }

  function renderMeasured() {
    const m = {
      pre: num("bun-pre"),
      post: num("bun-post"),
      hours: num("m-time"),
      uf: num("m-uf") ?? 0,
      weight: num("m-weight"),
      access: state.access,
    };
    const box = $("measured-result");
    if ([m.pre, m.post, m.hours, m.weight].some((v) => v === null)) {
      box.className = "measured-result";
      box.innerHTML = "<p>輸入透析前後 BUN、時間、脫水量與透析後體重即可計算。</p>";
      return;
    }
    const r = KTV.measured(m);
    if (!r.ok) {
      box.className = "measured-result risk";
      box.innerHTML = `<p>${r.errors.join("；")}。</p>`;
      return;
    }
    const [label] = STATUS_TEXT.sp[r.status];
    box.className = `measured-result ${r.status}`;
    box.innerHTML = `
      <div class="measured-grid">
        <div><span>spKt/V</span><strong>${fmt(r.sp)}</strong><small>${label}</small></div>
        <div><span>URR</span><strong>${fmt(r.urr, 1)}%</strong><small>${r.urrOk ? "≥ 65%" : "< 65%"}</small></div>
        <div><span>eKt/V</span><strong>${fmt(r.e)}</strong><small>${state.access === "catheter" ? "導管" : "AVF/AVG"}</small></div>
      </div>
      <p>R = ${fmt(r.r, 3)}。此為每週三次的單次判讀（目標 1.4、最低 1.2）；透析後 BUN 應依標準程序（慢血流或停泵後採血）取得。</p>`;
  }

  function renderAll() {
    renderPrescription();
    renderMeasured();
  }

  document.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", renderAll);
  });

  $("dialyzer").addEventListener("input", () => {
    autoName = false;
  });

  $("surface-area").addEventListener("input", () => {
    if (autoName) $("dialyzer").value = `人工腎臟 ${$("surface-area").value} m²`;
    document.querySelectorAll(".preset-grid button").forEach((b) => {
      b.classList.toggle("selected", b.dataset.area === $("surface-area").value);
    });
  });

  document.querySelectorAll(".preset-grid button").forEach((button) => {
    button.addEventListener("click", () => {
      $("surface-area").value = button.dataset.area;
      $("dialyzer").value = `人工腎臟 ${button.dataset.area} m²`;
      autoName = true;
      state.efficiency = button.dataset.efficiency;
      selectSegment("efficiency-options", "efficiency", state.efficiency);
      document.querySelectorAll(".preset-grid button").forEach((b) => {
        b.classList.toggle("selected", b === button);
      });
      renderAll();
    });
  });

  const segments = [
    ["efficiency-options", "efficiency"],
    ["v-options", "vMethod"],
    ["access-options", "access"],
    ["sex-options", "sex"],
  ];
  segments.forEach(([groupId, key]) => {
    document.querySelectorAll(`#${groupId} button`).forEach((button) => {
      button.addEventListener("click", () => {
        state[key] = button.dataset[key];
        selectSegment(groupId, key, state[key]);
        if (key === "vMethod") $("watson-fields").hidden = state.vMethod !== "watson";
        renderAll();
      });
    });
  });

  $("copy-time").addEventListener("click", () => {
    $("m-time").value = $("dialysis-time").value;
    $("m-uf").value = $("uf").value;
    $("m-weight").value = $("weight").value;
    renderAll();
  });

  segments.forEach(([groupId, key]) => selectSegment(groupId, key, state[key]));
  renderAll();
}
