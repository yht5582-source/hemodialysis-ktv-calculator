// node tests.cjs — 驗證 app.js 中 /*ENGINE-START*/…/*ENGINE-END*/ 的計算核心
const fs = require("fs");
const vm = require("vm");

const src = fs.readFileSync(__dirname + "/app.js", "utf8");
const engine = src.slice(src.indexOf("/*ENGINE-START*/"), src.indexOf("/*ENGINE-END*/"));
const sandbox = { module: { exports: {} } };
vm.runInNewContext(engine, sandbox);
const K = sandbox.module.exports;

let pass = 0;
let fail = 0;
function ok(cond, name) {
  if (cond) pass += 1;
  else {
    fail += 1;
    console.log("FAIL:", name);
  }
}
const near = (a, b, tol, name) => ok(Math.abs(a - b) <= tol, `${name}: ${a} ≈ ${b}`);

// 血液水流量
near(K.bloodWaterFlow(300, 33), 300 * (0.93 * 0.67 + 0.72 * 0.33), 1e-9, "Qbw Hct33");
near(K.bloodWaterFlow(400, 0), 372, 1e-9, "Qbw Hct0");

// 逆流清除：Qb=Qd 特例、對稱連續性、上限
near(K.clearance(300, 300, 900), (300 * 900) / 1200, 1e-9, "K Qb=Qd");
near(K.clearance(300, 300.0001, 900), 225, 0.01, "K 近 Qb=Qd 連續");
ok(K.clearance(300, 500, 1e6) <= 300, "K ≤ min(Qb,Qd)");
ok(K.clearance(300, 500, 972) < K.clearance(400, 500, 972), "K 隨 Qb 上升");
ok(K.clearance(300, 500, 972) < K.clearance(300, 800, 972), "K 隨 Qd 上升");
// 手算：Qb 300 Qd 500 KoA 972 → Z .6, E = exp(1.296)
{
  const e = Math.exp((972 / 300) * 0.4);
  near(K.clearance(300, 500, 972), (300 * (e - 1)) / (e - 0.6), 1e-9, "K 手算");
}
ok(K.clearance(0, 500, 900) === 0 && K.clearance(300, 500, 0) === 0, "K 非正數輸入 = 0");

// Watson（男性年齡係數 0.09516）
near(K.watson("male", 60, 170, 70), 2.447 - 0.09516 * 60 + 0.1074 * 170 + 0.3362 * 70, 1e-9, "Watson 男");
near(K.watson("female", 60, 160, 55), -2.097 + 0.1069 * 160 + 0.2466 * 55, 1e-9, "Watson 女");

// eKt/V
near(K.equilibrated(1.4, 240, "av"), (1.4 * 240) / 270.7, 1e-9, "eKt/V AV");
near(K.equilibrated(1.4, 240, "catheter"), (1.4 * 240) / 258.5, 1e-9, "eKt/V 導管");

// stdKt/V：每週三次 spKt/V 1.4 / 4 h、無脫水 → 約 2.1（文獻常見）
{
  const e = K.equilibrated(1.4, 240, "av");
  const s = K.standard(e, 240, 3, 0, 40);
  ok(s > 2.0 && s < 2.3, `stdKt/V 3x 約 2.1（${s.toFixed(3)}）`);
  ok(K.standard(e, 240, 3, 6, 40) > s, "UF 校正提高 stdKt/V");
  ok(K.standard(e, 240, 6, 0, 40) > s, "次數增加提高 stdKt/V");
  ok(Number.isNaN(K.standard(e, 240, 3, 1000, 40)), "UF 校正分母 ≤0 → NaN");
}

// 判讀以四捨五入後兩位為準（畫面顯示 1.40 就是達標）
ok(K.status(1.396, 1.4, 1.2) === "good", "1.396 顯示 1.40 → 達標");
ok(K.status(1.394, 1.4, 1.2) === "watch", "1.394 → 接近");
ok(K.status(1.195, 1.4, 1.2) === "watch", "1.195 → 1.20 接近");
ok(K.status(1.19, 1.4, 1.2) === "risk", "1.19 → 未達");

const base = {
  weight: 70,
  vMethod: "weight",
  sex: "male",
  age: 60,
  height: 165,
  area: 1.8,
  efficiency: "high",
  koaOverride: null,
  qb: 300,
  qd: 500,
  hct: 33,
  hours: 4,
  sessions: 3,
  access: "av",
  ufPerSession: 2,
};

{
  const r = K.prescribe(base);
  ok(r.ok, "預設處方可計算");
  near(r.koa, 972, 1e-9, "KoA = 1.8 × 540");
  near(r.v, 40.6, 1e-9, "V = 70 × 0.58");
  ok(r.k < K.clearance(300, 500, 972), "以 Qbw 計算 K 小於全血 Qb");
  near(r.sp, (r.k * 240) / 1000 / 40.6, 1e-9, "spKt/V = Kt/V");
  ok(r.metric === "sp" && r.target === 1.4, "每週三次看 spKt/V");
  // 達標所需時間代回應剛好 = 1.4
  const atReq = K.prescribe({ ...base, hours: r.requiredHours });
  near(atReq.sp, 1.395, 1e-6, "requiredHours 代回 = 1.395（四捨五入達標）");
  ok(atReq.status === "good", "requiredHours 代回判讀達標");
  const atQb = K.prescribe({ ...base, qb: r.requiredQb });
  near(atQb.sp, 1.395, 1e-6, "requiredQb 代回 = 1.395");
  ok(r.warnings.some((w) => w.includes("Watson")), "體重法提示 Watson");
}

{
  const r = K.prescribe({ ...base, koaOverride: 1100, area: NaN });
  ok(r.ok && r.koa === 1100, "已知 KoA 取代面積估算（面積空白亦可）");
}

{
  const r = K.prescribe({ ...base, vMethod: "watson" });
  near(r.v, K.watson("male", 60, 165, 70), 1e-9, "Watson V");
  ok(!r.warnings.some((w) => w.includes("Watson")), "Watson 不再提示");
  ok(!K.prescribe({ ...base, vMethod: "watson", age: null }).ok, "Watson 缺年齡 → 錯誤");
}

{
  const r2 = K.prescribe({ ...base, sessions: 2 });
  ok(r2.metric === "std" && r2.target === 2.3 && r2.minimum === 2.1, "每週 2 次看 stdKt/V");
  ok(r2.requiredHours === Infinity && r2.status === "risk", "每週 2 次 12 h 內難達 2.3");
  const r = K.prescribe({ ...base, sessions: 4, hours: 2.5 });
  const atReq = K.prescribe({ ...base, sessions: 4, hours: r.requiredHours });
  near(atReq.std, 2.295, 1e-6, "stdKt/V requiredHours 代回 = 2.295");
}

{
  const r = K.prescribe({ ...base, qb: 150, hours: 2 });
  ok(r.status === "risk", "低血流短時間 → 未達標");
  const tiny = K.prescribe({ ...base, weight: 120, qb: 200, area: 1.0, efficiency: "low", hours: 3 });
  ok(tiny.requiredQb === Infinity, "Qb 600 仍不足 → Infinity");
}

ok(K.prescribe({ ...base, catheter: 1, access: "catheter", qb: 450 }).warnings.some((w) => w.includes("導管")), "導管高血流提示");
ok(K.prescribe({ ...base, ufPerSession: 5, weight: 60 }).warnings.some((w) => w.includes("mL/kg/h")), "UFR >13 提示");
ok(!K.prescribe({ ...base, weight: 0 }).ok, "體重 0 → 錯誤");
ok(!K.prescribe({ ...base, sessions: 2.5 }).ok, "次數非整數 → 錯誤");
ok(!K.prescribe({ ...base, qb: NaN }).ok, "Qb 非數字 → 錯誤");

// Daugirdas II：pre 70 post 22 t 4 UF 2 W 70
{
  const r = K.measured({ pre: 70, post: 20, hours: 4, uf: 2, weight: 70, access: "av" });
  const R = 20 / 70;
  near(r.sp, -Math.log(R - 0.032) + ((4 - 3.5 * R) * 2) / 70, 1e-9, "Daugirdas II");
  near(r.urr, (1 - R) * 100, 1e-9, "URR");
  ok(r.status === "good" && r.urrOk, "此例達標");
  ok(!K.measured({ pre: 50, post: 60, hours: 4, uf: 2, weight: 70 }).ok, "post ≥ pre → 錯誤");
  ok(!K.measured({ pre: 100, post: 2, hours: 4, uf: 2, weight: 70 }).ok, "R − 0.008t ≤ 0 → 錯誤");
  const urr64 = K.measured({ pre: 100, post: 36, hours: 4, uf: 0, weight: 70 });
  ok(!urr64.urrOk, "URR 64% → 未達 65%");
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
