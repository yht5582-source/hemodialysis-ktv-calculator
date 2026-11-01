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

// 殘腎 Kru
{
  const none = K.prescribe({ ...base, sessions: 2 });
  const withKru = K.prescribe({ ...base, sessions: 2, kru: 3 });
  near(withKru.kruAdd, (3 * 10080) / (none.v * 1000), 1e-9, "Kru 項 = Kru × 10080/V");
  near(withKru.std, none.std + withKru.kruAdd, 1e-9, "stdKt/V 加上 Kru");
  near(withKru.stdDialysis, none.std, 1e-9, "透析部分不變");
  ok(none.kruAdd === 0 && K.prescribe({ ...base, sessions: 2, kru: 0 }).kruAdd === 0, "留空或 0 不加");
  ok(withKru.value === withKru.std && withKru.value > none.value, "每週兩次判讀含 Kru");
  ok(withKru.requiredHours < none.requiredHours, "含 Kru 所需時間較短");
  const atReq = K.prescribe({ ...base, sessions: 2, kru: 1, hours: K.prescribe({ ...base, sessions: 2, kru: 1 }).requiredHours });
  near(atReq.std, 2.295, 1e-6, "含 Kru 的 requiredHours 代回 = 2.295");
  ok(none.warnings.some((w) => w.includes("未填 Kru")), "非每週三次未填 Kru 提示");
  ok(!withKru.warnings.some((w) => w.includes("未填 Kru")), "已填不提示");
  ok(withKru.warnings.some((w) => w.includes("3 個月內")), "已填提示實測時效");
  const thrice = K.prescribe({ ...base, kru: 3 });
  const plain = K.prescribe(base);
  ok(thrice.metric === "sp" && thrice.value === plain.value && thrice.status === plain.status, "每週三次判讀不受 Kru 影響");
  ok(thrice.std > plain.std, "每週三次顯示的 stdKt/V 含 Kru");
  ok(thrice.warnings.some((w) => w.includes("Kru ≥2")), "每週三次 Kru ≥2 提示");
  ok(!K.prescribe({ ...base, kru: 1.5 }).warnings.some((w) => w.includes("Kru ≥2")), "Kru <2 不提示");
  ok(!plain.warnings.some((w) => w.includes("Kru")), "每週三次未填不提示");
  ok(!K.prescribe({ ...base, kru: 21 }).ok && !K.prescribe({ ...base, kru: -1 }).ok && !K.prescribe({ ...base, kru: NaN }).ok, "Kru 超出範圍 → 錯誤");
}

// 達標時間過短提醒
{
  const short = (w) => w.includes("達標所需時間僅");
  const small = { ...base, weight: 50, qb: 350 };
  const r = K.prescribe(small);
  ok(r.requiredHours < 3 && r.warnings.some(short), "所需時間 <3 小時 → 提醒");
  ok(r.warnings.find(short).includes(`${Math.round(r.requiredHours * 60)} 分鐘`), "提醒顯示分鐘數");
  ok(!r.warnings.find(short).includes("Kru 下降"), "未計 Kru 不提 Kru 下降");
  ok(K.prescribe(base).requiredHours >= 3 && !K.prescribe(base).warnings.some(short), "所需時間 ≥3 小時不提醒");
  ok(!K.prescribe({ ...base, sessions: 2 }).warnings.some(short), "達不到目標（Infinity）不提醒");
  const twice = K.prescribe({ ...small, sessions: 2, kru: 5 });
  ok(twice.requiredHours < 3 && twice.warnings.find(short).includes("Kru 下降"), "每週兩次含 Kru → 提醒依賴殘腎");
  const thriceKru = K.prescribe({ ...small, kru: 5 });
  ok(thriceKru.warnings.some(short) && !thriceKru.warnings.find(short).includes("Kru 下降"), "每週三次判讀不含 Kru");
}

// 教學內容：文字中的數字要與計算核心一致
{
  const T = require("./teach.js");
  const byId = Object.fromEntries(T.CASES.map((c) => [c.id, c]));
  const text = (c) => JSON.stringify([c.title, c.story, c.steps, c.points]);
  const has = (id, val, name) => ok(text(byId[id]).includes(val), `${id} 含 ${val}（${name}）`);
  const rx = (id, o = {}) => K.prescribe({ ...byId[id].rx, ...o });
  const f = (x) => x.toFixed(2);

  ok(T.CASES.length === 6, "病例 6 例");
  T.CASES.forEach((c) => {
    ok(K.prescribe(c.rx).ok, `${c.id} 處方可計算`);
    ok(c.steps.length >= 3 && c.points.length >= 3 && c.src, `${c.id} 內容完整`);
    if (c.measured) ok(K.measured(c.measured).ok, `${c.id} 實測可計算`);
    (c.compare || []).forEach((row) => ok(K.prescribe({ ...c.rx, ...row.o }).ok, `${c.id} 比較列 ${row.label}`));
  });

  // 病例 1
  const c1m = K.measured(byId.c1.measured);
  has("c1", f(c1m.sp), "實測");
  has("c1", c1m.urr.toFixed(1), "URR");
  ok(c1m.status === "good", "c1 實測達標");
  has("c1", f(rx("c1").sp), "處方");
  has("c1", String(Math.round(rx("c1").requiredHours * 60)), "達標時間");
  has("c1", rx("c1").ufr.toFixed(1), "目前 UFR");
  has("c1", K.prescribe({ ...byId.c1.rx, hours: 215 / 60 }).ufr.toFixed(1), "縮時 UFR");

  // 病例 2：單一調整
  has("c2", f(rx("c2").sp), "基線");
  ok(rx("c2").status === "risk", "c2 基線未達最低");
  const levers = { h: rx("c2", { hours: 5 }).sp, qb: rx("c2", { qb: 450 }).sp, qd: rx("c2", { qd: 800 }).sp, a: rx("c2", { area: 2.1 }).sp };
  has("c2", f(levers.h), "5 h");
  has("c2", f(levers.qb), "Qb 450");
  has("c2", f(levers.qd), "Qd 800");
  has("c2", f(levers.a), "2.1 m²");
  ok(levers.h === Math.max(...Object.values(levers)), "c2 時間效果最大");
  ok(levers.qd < 1.395 && levers.a < 1.395, "c2 Qd、膜面積單獨未達標");
  has("c2", f(rx("c2", { qb: 400, hours: 4.5, area: 2.1 }).sp), "組合");
  has("c2", rx("c2").v.toFixed(1), "V");

  // 病例 3：體型與 SAstdKt/V
  const c3W = rx("c3");
  const c3w = rx("c3", { vMethod: "weight" });
  has("c3", c3w.v.toFixed(1), "體重法 V");
  has("c3", c3W.v.toFixed(1), "Watson V");
  has("c3", f(c3w.sp), "體重法 sp");
  has("c3", f(c3W.sp), "Watson sp");
  has("c3", f(c3W.std), "std");
  const bsa = T.bsaDuBois(46, 150);
  near(bsa, 1.38, 0.005, "c3 BSA");
  has("c3", (c3W.v / bsa).toFixed(1), "V/BSA");
  const sa = T.saStd(c3W.std, c3W.v, bsa);
  has("c3", f(sa), "SAstdKt/V");
  ok(sa < 2.3 && c3W.std > 2.3, "c3 校正後低於 2.3");

  // 病例 4：處方與實際
  has("c4", f(rx("c4").sp), "處方");
  const c4act = rx("c4", { qb: 250, hours: 3.5 });
  has("c4", f(c4act.sp), "實際");
  const c4m = K.measured(byId.c4.measured);
  has("c4", f(c4m.sp), "實測");
  ok(T.CASES[3].title.includes(f(c4m.sp)) && T.CASES[3].title.includes(f(rx("c4").sp)), "c4 標題數字");
  near(c4act.sp - c4m.sp, 0.05, 0.01, "c4 剩餘差距");
  const c4fix = K.measured({ pre: 66, post: 18, hours: 4, uf: 2, weight: 68, access: "catheter" });
  has("c4", f(c4fix.sp), "複測");
  has("c4", c4fix.urr.toFixed(1), "複測 URR");

  // 病例 5：Kru
  const c5 = rx("c5", { kru: null });
  ok(c5.metric === "std" && c5.status === "risk", "c5 未計殘腎未達標");
  ok(rx("c5").status === "good", "c5 含 Kru 3 達標");
  has("c5", f(c5.sp), "sp");
  has("c5", f(c5.std), "std");
  const add = (kru) => rx("c5", { kru }).std;
  near(K.kruTerm(3, 28), 1.08, 0.005, "Kru 項");
  has("c5", f(add(3)), "Kru 3");
  has("c5", f(add(1.5)), "Kru 1.5");
  has("c5", f(add(1)), "Kru 1");
  ok(add(3) > 2.3 && add(1.5) < 2.3 && add(1.5) > 2.1 && add(1) < 2.1, "c5 Kru 分級");

  // 病例 6：脫水速率
  has("c6", f(rx("c6").sp), "sp");
  has("c6", rx("c6").ufr.toFixed(1), "UFR");
  ok(rx("c6").ufr > 13, "c6 UFR >13");
  const c65 = rx("c6", { hours: 5 }).ufr;
  const c6u = rx("c6", { ufPerSession: 3 }).ufr;
  const c6x = rx("c6", { sessions: 4, ufPerSession: 2.7 }).ufr;
  has("c6", c65.toFixed(1), "5 h UFR");
  has("c6", c6u.toFixed(1), "3 L UFR");
  has("c6", c6x.toFixed(1), "每週四次 UFR");
  ok(c65 < 13 && c6u < 13 && c6x < 13, "c6 調整後 ≤13");

  // 考題
  ok(T.QUIZ.length === 20, "考題 20 題");
  ok(T.QUIZ.filter((q) => q.level === "基礎").length === 10, "基礎 10 題");
  ok(T.QUIZ.filter((q) => q.level === "高階").length === 10, "高階 10 題");
  [0, 1, 2, 3].forEach((i) => ok(T.QUIZ.filter((q) => q.a === i).length === 5, `答案 ${"ABCD"[i]} 各 5 題`));
  T.QUIZ.forEach((q, i) => {
    ok(q.o.length === 4 && new Set(q.o).size === 4, `第 ${i + 1} 題 4 個不同選項`);
    ok(q.q && q.why && q.src && q.a >= 0 && q.a < 4, `第 ${i + 1} 題完整`);
  });
  const correct = (i) => T.QUIZ[i].o[T.QUIZ[i].a];
  ok(correct(3) === "70%", "Q4 URR");
  near((1 - 21 / 70) * 100, 70, 1e-9, "Q4 計算");
  const q5 = K.measured({ pre: 70, post: 20, hours: 4, uf: 2, weight: 70, access: "av" });
  ok(correct(4) === f(q5.sp), "Q5 Daugirdas");
  ok(T.QUIZ[4].o.includes(f(-Math.log(20 / 70 - 0.032))), "Q5 漏脫水項的誘答");
  const q7t = K.measured({ pre: 70, post: 22, hours: 4, uf: 2, weight: 65, access: "av" });
  const q7d = K.measured({ pre: 55, post: 22, hours: 4, uf: 2, weight: 65, access: "av" });
  ok(T.QUIZ[6].why.includes(f(q7t.sp)) && T.QUIZ[6].why.includes(f(q7d.sp)) && q7d.sp < q7t.sp, "Q7 稀釋低估");
  ok(correct(8).includes("時間"), "Q9 時間");
  [levers.h, levers.qb, levers.a, levers.qd].forEach((v) => ok(T.QUIZ[8].why.includes(f(v)), `Q9 解析含 ${f(v)}`));
  ok(correct(10) === f(K.kruTerm(3, 28)), "Q11 Kru");
  ok(correct(14) === (T.saStd(2.43, 25.3, 1.38)).toFixed(1), "Q15 SAstdKt/V");
  ok(T.QUIZ[15].why.includes(f(c4act.sp)), "Q16 實際值");
  const q17 = K.measured({ pre: 70, post: 16, hours: 4, uf: 2, weight: 65, access: "av" });
  ok(T.QUIZ[16].why.includes(f(q7t.sp)) && T.QUIZ[16].why.includes(f(q17.sp)) && q17.sp > q7t.sp, "Q17 再循環高估");
  const q18 = K.prescribe({ ...base, sessions: 6, hours: 2.5, qb: 350, ufPerSession: 1 });
  ok(T.QUIZ[17].q.includes(f(q18.sp)) && T.QUIZ[17].q.includes(f(q18.std)) && q18.status === "good", "Q18 頻繁透析");
  ok(correct(19).includes(rx("c6").ufr.toFixed(1)) && T.QUIZ[19].q.includes(f(rx("c6").sp)), "Q20 UFR");
  ok(T.QUIZ[19].why.includes(c65.toFixed(1)), "Q20 延時 UFR");

  ok(T.MAP.left.length + T.MAP.right.length === 8, "心智圖 8 分支");
  [...T.MAP.left, ...T.MAP.right].forEach((b) => ok(b.leaves.length >= 3, `分支 ${b.title} 有內容`));
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
