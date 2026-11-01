// 示範病例、考題、心智圖。所有數字由 tests.cjs 對照 KTV 計算核心。
const TEACH = (() => {
  // DuBois：BSA = 0.007184 × W^0.425 × H^0.725
  const bsaDuBois = (weightKg, heightCm) => 0.007184 * weightKg ** 0.425 * heightCm ** 0.725;
  // KDOQI 2015 Appendix：SAstdKt/V = stdKt/V ÷ 20 × Vw/BSA
  const saStd = (std, vWatsonL, bsa) => (std / 20) * (vWatsonL / bsa);

  const RX = {
    vMethod: "watson",
    sex: "male",
    age: 60,
    height: 170,
    area: 1.8,
    efficiency: "high",
    koaOverride: null,
    qd: 500,
    hct: 33,
    hours: 4,
    sessions: 3,
    access: "av",
  };

  /*CASES-START*/
  const CASES = [
    {
      id: "c1",
      level: "基礎",
      title: "穩定的每週三次：處方與實測怎麼對照",
      tag: "判讀",
      story:
        "62 歲男性，糖尿病腎病變，透析 3 年。左前臂 AVF，每週三次、每次 4 小時，尿量很少。乾體重 65 kg、身高 168 cm，Qb 300、Qd 500，1.8 m² 高效膜，Hct 33%，每次脫水 2.5 L。本月 BUN：透析前 72、透析後 20 mg/dL。",
      rx: { ...RX, weight: 65, age: 62, height: 168, qb: 300, ufPerSession: 2.5 },
      measured: { pre: 72, post: 20, hours: 4, uf: 2.5, weight: 65, access: "av" },
      steps: [
        {
          q: "這位病人該看哪個指標？目標與最低值是多少？",
          a: "每週三次看單次 spKt/V：目標 1.4、最低 1.2（KDOQI 3.1，1B）。eKt/V 與 stdKt/V 可以參考，但不是這個排程的判定標準。",
        },
        {
          q: "實測 spKt/V 怎麼算？",
          a: "R = 20/72 = 0.278。−ln(0.278 − 0.008×4) = 1.40；(4 − 3.5×0.278) × 2.5/65 = 0.12。合計 1.52，URR 72.2%。兩者都達標。",
        },
        {
          q: "處方估算 1.56、實測 1.52，要處理嗎？",
          a: "不用。兩者接近，代表處方有確實送達。處方值是模型估算，判定仍以實測 delivered spKt/V 為準。",
        },
        {
          q: "工具顯示達目標只需約 215 分鐘，可以把時間縮到 3 小時 35 分嗎？",
          a: "不能只看這個數字。215 分鐘是模型算出的剛好達標時間，沒有留下餘裕。縮時後脫水速率會從 9.6 升到約 10.7 mL/kg/h，也要考慮容量、血壓與磷鉀控制（KDOQI 4.1.1）。",
        },
      ],
      points: [
        "每週三次：看實測 spKt/V，目標 1.4、最低 1.2。",
        "處方值用來預估與找差距，不能取代實測值。",
        "Kt/V 達標不代表可以縮短時間。",
      ],
      src: "KDOQI 2015 3.1、4.1.1",
    },
    {
      id: "c2",
      level: "基礎",
      title: "大體型男性：哪個處方參數最有效",
      tag: "調整處方",
      story:
        "45 歲男性，乾體重 105 kg、身高 180 cm，無尿。AVF，每週三次、每次 4 小時，Qb 350、Qd 500，1.8 m² 高效膜，每次脫水 3 L。Watson V 約 52.8 L，處方 spKt/V 只有 1.19。",
      rx: { ...RX, weight: 105, age: 45, height: 180, qb: 350, ufPerSession: 3 },
      compare: [
        { label: "目前處方", o: {} },
        { label: "時間延到 5 小時", o: { hours: 5 } },
        { label: "Qb 提高到 450", o: { qb: 450 } },
        { label: "Qd 提高到 800", o: { qd: 800 } },
        { label: "換 2.1 m² 膜", o: { area: 2.1 } },
        { label: "Qb 400 + 4.5 小時 + 2.1 m²", o: { qb: 400, hours: 4.5, area: 2.1 } },
      ],
      steps: [
        {
          q: "單一調整中，哪一項效果最大？為什麼？",
          a: "延長時間：spKt/V 從 1.19 升到 1.49。Kt/V 與 t 成正比。提高 Qb 到 450 只到 1.36，因為 K 會隨 Qb 上升而趨於平緩，受 KoA 與 Qd 限制。",
        },
        {
          q: "只換膜或只提高 Qd，夠嗎？",
          a: "在這個模型裡都不夠：換 2.1 m² 膜為 1.23，Qd 800 為 1.25，都高於最低值但未達 1.4。",
        },
        {
          q: "病人不願意每次透析 5 小時，怎麼辦？",
          a: "組合調整：Qb 400、4.5 小時、2.1 m² 膜，模型 spKt/V 約 1.50。也可以討論增加次數，但排程改變後要改看 stdKt/V。調整後務必再測實測值，因為模型用的 KoA 是簡化假設。",
        },
      ],
      points: [
        "時間是線性槓桿；Qb、Qd、KoA 的效益會遞減。",
        "V 大的人較難只靠 Qb 達標，常要多項一起調整。",
        "調整後用實測 BUN 驗證。",
      ],
      src: "KDOQI 2015 3.1、4.1.1；Michaels 逆流模型（本工具）",
    },
    {
      id: "c3",
      level: "高階",
      title: "瘦小高齡女性：spKt/V 很好看，就足夠嗎",
      tag: "體型與性別",
      story:
        "78 歲女性，乾體重 46 kg、身高 150 cm，無尿。AVF，每週三次、每次 3.5 小時，Qb 250、Qd 500，1.4 m² 標準膜，Hct 30%，每次脫水 1.5 L。本月 BUN：透析前 58、透析後 15 mg/dL。家屬問：既然 Kt/V 很高，可以改成 3 小時嗎？",
      rx: { ...RX, weight: 46, sex: "female", age: 78, height: 150, area: 1.4, efficiency: "standard", qb: 250, hct: 30, hours: 3.5, ufPerSession: 1.5 },
      measured: { pre: 58, post: 15, hours: 3.5, uf: 1.5, weight: 46, access: "av" },
      compare: [
        { label: "V = 體重 × 0.58", o: { vMethod: "weight" } },
        { label: "V = Watson", o: {}, sa: true },
      ],
      steps: [
        {
          q: "用體重 × 0.58 和 Watson 算出的 V 差多少？",
          a: "26.7 L 對 25.3 L，處方 spKt/V 分別為 1.51 與 1.59。對這位病人，體重法高估 V、低估 Kt/V。",
        },
        {
          q: "體表面積校正後呢？",
          a: "BSA（DuBois）約 1.38 m²，Vw/BSA 約 18.3，低於平均值 20。SAstdKt/V = 2.43 ÷ 20 × 18.3，約 2.22，反而低於 2.3。這個例子說明以 V 為分母時，小體型者的劑量可能看起來較充足。",
        },
        {
          q: "這代表 HEMO 的哪個發現？",
          a: "HEMO 次族群分析：高劑量在女性死亡率較低（RR 0.81，P = 0.02），男性則無益處趨勢（RR 1.16，P = 0.16）。這是次族群分析，不足以單獨改變目標值，但 KDOQI 已提到 V 作為分母在女性與小體型者的問題。",
        },
        {
          q: "可以縮短到 3 小時嗎？",
          a: "不建議只因 spKt/V 高就縮短。3 小時是低殘腎者的絕對下限，SAstdKt/V 已低於 2.3，應維持目前時間，並同時評估營養、症狀與個人意願。KDOQI 未規定必須依 SAstdKt/V 開立處方，這裡是臨床考量。",
        },
      ],
      points: [
        "女性與小體型者不要只看 spKt/V。",
        "SAstdKt/V = stdKt/V ÷ 20 × Vw/BSA。",
        "3 小時是下限，不是目標。",
      ],
      src: "KDOQI 2015 3.3 Rationale、Appendix #4、4.1；Depner 2004",
    },
    {
      id: "c4",
      level: "高階",
      title: "導管病人：處方 1.71，實測只有 1.12",
      tag: "排查差距",
      story:
        "66 歲男性，乾體重 68 kg、身高 165 cm，隧道式中央靜脈導管。處方 Qb 350、4 小時、每週三次、1.8 m² 高效膜。本月 BUN：透析前 68、透析後 26 mg/dL。翻閱紀錄：動脈壓警報頻繁，實際 Qb 多在 250，當次因警報提早結束，實際透析 3 小時 30 分，脫水 2 L。",
      rx: { ...RX, weight: 68, age: 66, height: 165, access: "catheter", qb: 350, ufPerSession: 2 },
      measured: { pre: 68, post: 26, hours: 3.5, uf: 2, weight: 68, access: "catheter" },
      compare: [
        { label: "開立處方", o: {} },
        { label: "實際執行（Qb 250、3.5 小時）", o: { qb: 250, hours: 3.5 } },
      ],
      steps: [
        {
          q: "第一步要做什麼？",
          a: "先確認這次數值可信：透析前血是否在給生理食鹽水或肝素前抽；透析後血是否採慢血流（100 mL/min 15 秒）或停透析液 3 分鐘法。若抽血有疑慮，先依標準程序複測。",
        },
        {
          q: "差距可以怎麼拆解？",
          a: "把實際執行值帶回模型：Qb 250、3.5 小時，模型 spKt/V 為 1.17，已很接近實測 1.12。所以主要原因是導管血流不足與治療時間被縮短，並非劑量公式出錯。",
        },
        {
          q: "剩下的 0.05 差距，還有哪些可能？",
          a: "導管或通路再循環、管路接反、透析器部分凝血、模型 KoA 高估。這是模型估算的落差，也可能只是誤差，不必過度解釋。",
        },
        {
          q: "可以直接換大膜嗎？",
          a: "順序不對。應先處理導管功能，確保血流與完整治療時間，再複測。若一個月後 BUN 為 66 → 18（4 小時），實測 spKt/V 為 1.51、URR 72.7%，就不用換膜。",
        },
      ],
      points: [
        "差距排查順序：採血 → 實際時間 → 實際血流 → 再循環 → 透析器。",
        "把實際值帶回工具，看模型能解釋多少差距。",
        "導管的反彈時間常數較短，同 spKt/V 下 eKt/V 較高，但判定仍看 spKt/V。",
      ],
      src: "KDOQI 2015 Guideline 3 Rationale（採血法）；FHN MOP ch.19（Tp）。排查清單為教學整理",
    },
    {
      id: "c5",
      level: "高階",
      title: "每週兩次：殘腎撐住的劑量",
      tag: "殘腎與排程",
      story:
        "70 歲女性，乾體重 55 kg、身高 155 cm，開始透析 4 個月，每日尿量約 1000 mL。每週兩次、每次 4 小時，Qb 280、1.6 m² 標準膜，Hct 32%，每次脫水 1 L。上個月測得殘腎尿素清除率 Kru 3 mL/min。",
      rx: { ...RX, weight: 55, sex: "female", age: 70, height: 155, area: 1.6, efficiency: "standard", qb: 280, hct: 32, sessions: 2, ufPerSession: 1, kru: 3 },
      compare: [
        { label: "Kru 留空（只算透析）", o: { kru: null } },
        { label: "Kru 3 mL/min", o: { kru: 3 } },
        { label: "Kru 1.5 mL/min", o: { kru: 1.5 } },
        { label: "Kru 1 mL/min", o: { kru: 1 } },
      ],
      steps: [
        {
          q: "單次 spKt/V 1.82 很高，可以說達標嗎？",
          a: "不行。每週兩次要看 stdKt/V（目標 2.3、最低 2.1），1.4 的目標只適用每週三次。",
        },
        {
          q: "Kru 留空時，工具顯示 stdKt/V 1.69「未達標」，判讀對嗎？",
          a: "還不完整。留空時只算透析，而 KDOQI 3.3 要求計算要包含殘腎。Kru 項 = Kru × 10080/V = 3 × 10080/28000 = 1.08，合計約 2.76，高於 2.3。",
        },
        {
          q: "哪個情況會改變決定？",
          a: "Kru 降到 1.5 時合計約 2.23（低於目標），降到 1 時約 2.05（低於最低值），都要考慮增加頻次。",
        },
        {
          q: "追蹤怎麼安排？",
          a: "Kru 要在 3 個月內有測量才可計入；處方因殘腎調整者每月量尿量；尿量突然減少或住院後要加測。KDOQI 沒有訂出適合每週兩次的 Kru 閾值，也未對每週兩次提出專門建議，須個別判斷。",
        },
      ],
      points: [
        "非每週三次改看 stdKt/V，且要加上 Kru。",
        "Kru 來自實測，不能用估計或沿用舊值。",
        "殘腎下降時，每週兩次的處方要隨之增加。",
      ],
      src: "KDOQI 2015 3.2、3.3、Rationale、Appendix #3",
    },
    {
      id: "c6",
      level: "高階",
      title: "Kt/V 超標，卻每次透析都低血壓",
      tag: "超越 Kt/V",
      story:
        "58 歲女性，乾體重 58 kg、身高 155 cm，無尿，有心衰竭。AVF，每週三次、每次 4 小時，Qb 320、1.8 m² 高效膜。體重增加多，每次脫水約 3.6 L，透析後段常低血壓、抽筋，且常提早下機。",
      rx: { ...RX, weight: 58, sex: "female", age: 58, height: 155, qb: 320, ufPerSession: 3.6 },
      compare: [
        { label: "目前處方", o: {} },
        { label: "延長到 5 小時", o: { hours: 5 } },
        { label: "控水後每次脫水 3 L", o: { ufPerSession: 3 } },
        { label: "加到每週四次（每次 2.7 L）", o: { sessions: 4, ufPerSession: 2.7 } },
      ],
      steps: [
        {
          q: "spKt/V 2.06，這次透析算充分嗎？",
          a: "小分子清除足夠，但透析的充分性不只如此。脫水速率 3.6 L ÷ 58 kg ÷ 4 h = 15.5 mL/kg/h，高於 13，且已有症狀。",
        },
        {
          q: "脫水速率 >13 的證據有多強？",
          a: "HEMO 次級分析（Flythe 2011）：相較 ≤10 mL/kg/h，>13 的全死因與心血管死亡調整後 HR 為 1.59 與 1.71；10–13 在心衰竭者也有相關。這是觀察性資料，尚無 RCT 證實降低脫水速率可改善結果。KDOQI 本身未設定具體數值。",
        },
        {
          q: "怎麼調整？",
          a: "時間延到 5 小時，脫水速率降為 12.4；控水後每次脫水 3 L 為 12.9；每週四次每次 2.7 L 為 11.6，此時改看 stdKt/V。同時限鈉、重新評估乾體重（KDOQI 4.1.1、4.2）。",
        },
        {
          q: "該把 Qb 或膜面積調低嗎？",
          a: "這並不能解決問題。脫水速率由脫水量、體重與時間決定，與 Qb 無關。延長時間的理由是容量與血流動力學穩定，不是提高 Kt/V。",
        },
      ],
      points: [
        "Kt/V 只衡量小分子清除，不代表容量控制良好。",
        "脫水速率 = 脫水量 ÷ 體重 ÷ 時間。",
        "症狀、血壓、乾體重、磷鉀都要一起評估。",
      ],
      src: "KDOQI 2015 4.1.1、4.2、4.2.1；Flythe 2011",
    },
  ];
  /*CASES-END*/

  /*QUIZ-START*/
  const QUIZ = [
    {
      level: "基礎",
      q: "每週三次血液透析，KDOQI 2015 建議的單次 spKt/V 目標與最低值是？",
      o: ["目標 1.2、最低 1.0", "目標 1.4、最低 1.2", "目標 1.7、最低 1.4", "目標 2.3、最低 2.1"],
      a: 1,
      why: "Guideline 3.1（1B）：目標 1.4，最低 delivered 1.2。2.3/2.1 是 stdKt/V 的數字。",
      src: "KDOQI 2015 3.1",
    },
    {
      level: "基礎",
      q: "每週兩次或四次以上的排程，應該用什麼判讀劑量？",
      o: ["單次 spKt/V 1.4／1.2", "URR ≥65%", "stdKt/V 2.3／2.1，計算包含脫水與殘腎", "eKt/V ≥1.05"],
      a: 2,
      why: "Guideline 3.3：非每週三次的排程建議 stdKt/V 目標 2.3、最低 2.1，計算須包含脫水與殘腎貢獻。",
      src: "KDOQI 2015 3.3",
    },
    {
      level: "基礎",
      q: "Kt/V 中的 V 代表什麼？",
      o: ["尿素分布體積，接近全身水量", "每次透析的脫水量", "每次透析使用的透析液總量", "血漿體積"],
      a: 0,
      why: "V 是尿素分布體積，近似全身水量，常以 Watson 公式或體重 × 0.58 估算。K 是清除率，t 是時間。",
      src: "KDOQI 2015 Guideline 3 Rationale",
    },
    {
      level: "基礎",
      q: "透析前 BUN 70、透析後 21 mg/dL，URR 是多少？",
      o: ["30%", "60%", "65%", "70%"],
      a: 3,
      why: "URR = (1 − 21/70) × 100% = 70%。KDOQI 2015 認為 URR 應逐步由更精確的方法取代，因為它未反映 V 變化、尿素生成與殘腎。",
      src: "KDOQI 2015 Guideline 3 Rationale",
    },
    {
      level: "基礎",
      q: "透析前 BUN 70、透析後 20 mg/dL，4 小時，脫水 2 L，透析後體重 70 kg。Daugirdas 第二代 spKt/V 約為？",
      o: ["1.25", "1.37", "1.46", "1.71"],
      a: 2,
      why: "R = 0.286；−ln(0.286 − 0.032) = 1.37；(4 − 3.5×0.286) × 2/70 = 0.09；合計 1.46。選 1.37 是漏了脫水項。",
      src: "Daugirdas 1993",
    },
    {
      level: "基礎",
      q: "透析後 BUN 的正確採血法是？",
      o: [
        "由透析器入口端，先以 100 mL/min 慢血流 15 秒，或停透析液 3 分鐘後採血",
        "每次都關機等 30 分鐘再採血",
        "維持全血流，由靜脈端採血",
        "回血結束後由對側手臂採血",
      ],
      a: 0,
      why: "KDOQI 指定慢血流法（100 mL/min 15 秒）或停透析液法（3 分鐘），由透析器入口端採樣。等 30 分鐘是 eKt/V 的做法，KDOQI 認為其優勢未被證實。",
      src: "KDOQI 2015 Guideline 3 Rationale",
    },
    {
      level: "基礎",
      q: "透析前血在沖過生理食鹽水後才抽，實測 spKt/V 會？",
      o: ["被高估", "不受影響", "URR 被高估，spKt/V 不變", "被低估"],
      a: 3,
      why: "透析前 BUN 被稀釋而偏低，R 變大，Kt/V 被低估。示例：真值 70 → 22 為 1.35，若透析前被稀釋成 55 只剩 1.08。KDOQI 規定要在給予稀釋液前採血；此誤差方向為機轉推論。",
      src: "KDOQI 2015 Guideline 3 Rationale；本工具計算",
    },
    {
      level: "基礎",
      q: "delivered dose 應多久測量一次？",
      o: ["每週", "至少每月", "每季", "每年"],
      a: 1,
      why: "KDOQI 2015 延續先前指引：至少每月測量。每季是殘腎的評估頻率。",
      src: "KDOQI 2015 Guideline 3 Rationale",
    },
    {
      level: "基礎",
      q: "105 kg 男性，Qb 350、Qd 500、4 小時、1.8 m² 高效膜，模型 spKt/V 1.19。哪一項單一調整提升最多？",
      o: ["時間延到 5 小時", "Qb 提高到 450", "換 2.1 m² 膜", "Qd 提高到 800"],
      a: 0,
      why: "模型結果分別為 1.49、1.36、1.23、1.25。Kt/V 與時間成正比，K 則隨 Qb、Qd、KoA 增加而趨於平緩。",
      src: "本工具計算（示範病例 2）",
    },
    {
      level: "基礎",
      q: "殘腎 <2 mL/min、每週三次的病人，KDOQI 建議的最短處方時間是？",
      o: ["2.5 小時", "2.75 小時", "3 小時", "4 小時"],
      a: 2,
      why: "Guideline 4.1（1D）：bare minimum 3 小時。這是下限；體重增加多、脫水速率高或血壓控制差者，應考慮更長時間或增加次數（4.1.1）。",
      src: "KDOQI 2015 4.1、4.1.1",
    },
    {
      level: "高階",
      q: "每週兩次，V 28 L，實測 Kru 3 mL/min。依 KDOQI 附錄，Kru 加到 stdKt/V 的數值約為？",
      o: ["0.11", "0.33", "0.54", "1.08"],
      a: 3,
      why: "Kru × 10080/V = 3 × 10080/28000 = 1.08。對這位病人，殘腎幾乎決定了是否達標。",
      src: "KDOQI 2015 Appendix #3",
    },
    {
      level: "高階",
      q: "把殘腎計入處方時，下列何者符合 KDOQI？",
      o: [
        "測過一次即可沿用一年",
        "Kru 要在 3 個月內測過才計入；處方受其影響者每月量尿量，尿量驟變或住院時加測",
        "只要有尿，就以 3 mL/min 計算",
        "無法留尿時，以 eGFR 代替 Kru",
      ],
      a: 1,
      why: "附錄要求 3 個月內的測量才能計入；Rationale 指出處方因殘腎調整者應每月量尿量，Kru 可能驟變時（尿量變化、住院）要額外測量。",
      src: "KDOQI 2015 3.2 Rationale、Appendix #3",
    },
    {
      level: "高階",
      q: "關於 HEMO 試驗（2002），哪項正確？",
      o: [
        "高劑量組死亡率顯著較低",
        "標準劑量組 spKt/V 約 1.05",
        "spKt/V 1.32 對 1.71，死亡相對風險 0.96，無顯著差異",
        "高劑量對男性有顯著益處",
      ],
      a: 2,
      why: "標準組 spKt/V 1.32、高劑量組 1.71；RR 0.96（95% CI 0.84–1.10，P = 0.53）。次族群顯示女性可能受益（RR 0.81），男性無益處趨勢。",
      src: "Eknoyan 2002；Depner 2004",
    },
    {
      level: "高階",
      q: "如何解讀 TiME 試驗（2019，預設 ≥4.25 小時）？",
      o: [
        "因組間時間差不足而提前中止（216 對 207 分鐘），不能視為延長時間無效的確證",
        "證明延長透析時間會增加死亡",
        "證明 4.25 小時可顯著減少住院",
        "促使 KDOQI 把最低時間改為 3.5 小時",
      ],
      a: 0,
      why: "TiME 中位追蹤 1.1 年即因組間差異不足而中止，未見死亡或住院下降。真正達成的時間差只有約 9 分鐘，檢驗力有限。",
      src: "Dember 2019",
    },
    {
      level: "高階",
      q: "stdKt/V 2.43、Watson V 25.3 L、BSA 1.38 m²。SAstdKt/V 約為？",
      o: ["1.6", "2.0", "2.4", "2.2"],
      a: 3,
      why: "2.43 ÷ 20 × (25.3/1.38) ≈ 2.2。20 是 V/BSA 的平均值；V/BSA 較低的小體型者，校正後數值會下降。",
      src: "KDOQI 2015 Appendix #4",
    },
    {
      level: "高階",
      q: "導管病人處方 spKt/V 1.71，實測 1.12。紀錄顯示 Qb 實際約 250、提早在 3.5 小時下機，採血流程正確。下一步？",
      o: [
        "直接換更大的人工腎臟",
        "處理導管功能、確保血流與完整時間後複測",
        "把此病人目標下修至 1.1",
        "改用 Watson 重算 V 即可",
      ],
      a: 1,
      why: "實際值帶回模型為 1.17，已解釋絕大部分差距。根源是血流與時間，換膜無法解決；實測值的計算也不使用 Watson V。",
      src: "本工具計算（示範病例 4）",
    },
    {
      level: "高階",
      q: "透析後血未降血流就直接採，且病人有通路再循環。實測 spKt/V 會？",
      o: ["被低估", "不受影響", "被高估，可能掩蓋劑量不足", "只影響 URR，不影響 spKt/V"],
      a: 2,
      why: "再循環讓透析後血混入剛透析完的血，BUN 假性偏低。示例：真值 70 → 22 為 1.35，若測得 16 會變成 1.73。這就是慢血流法存在的原因；誤差方向為機轉推論。",
      src: "本工具計算；KDOQI 2015 Guideline 3 Rationale（採血法）",
    },
    {
      level: "高階",
      q: "每週六次、每次 2.5 小時，模型 spKt/V 0.97、stdKt/V 3.47。如何判讀？",
      o: [
        "看 stdKt/V，已高於目標 2.3",
        "spKt/V 低於 1.2，未達標",
        "應提高到每次 spKt/V 1.4",
        "改用 URR 判讀",
      ],
      a: 0,
      why: "1.4／1.2 只適用每週三次。頻次高時單次值低屬預期，應看 stdKt/V。作為參考，FHN 六次組 stdKt/V 為 3.54，三次組 2.49。",
      src: "KDOQI 2015 3.3；Chertow 2010",
    },
    {
      level: "高階",
      q: "關於 FHN Daily（每週六次對三次），哪項正確？",
      o: [
        "全死因死亡單獨達到顯著下降",
        "兩組 stdKt/V 相近",
        "對共同主要結果沒有影響",
        "兩個複合結果都改善，但通路相關介入較多，須事先告知",
      ],
      a: 3,
      why: "死亡或左心室質量增加 HR 0.61；死亡或生理健康分數下降 HR 0.70；通路相關介入增加。KDOQI 2.2 建議事先告知通路介入與低血壓風險。",
      src: "Chertow 2010；KDOQI 2015 2.2",
    },
    {
      level: "高階",
      q: "58 kg，每次脫水 3.6 L、4 小時，spKt/V 2.06，常有透析中低血壓。最適當的處置是？",
      o: [
        "Kt/V 達標，無需調整",
        "脫水速率 15.5 mL/kg/h：考慮延長時間或加次數，並限鈉、重評乾體重",
        "縮短到 3 小時以減少不適",
        "提高 Qb",
      ],
      a: 1,
      why: "3.6 ÷ 58 ÷ 4 = 15.5 mL/kg/h。延到 5 小時可降到 12.4；縮短時間反而更高。Qb 不影響脫水速率。",
      src: "KDOQI 2015 4.1.1、4.2；Flythe 2011",
    },
  ];
  /*QUIZ-END*/

  /*MAP-START*/
  const MAP = {
    left: [
      {
        title: "公式",
        color: "teal",
        leaves: [
          "spKt/V = −ln(R − 0.008t) + (4 − 3.5R) × UF/W",
          "URR = (1 − R) × 100%；KDOQI 認為應逐步淘汰",
          "eKt/V = spKt/V × t/(t + Tp)；Tp：AV 30.7、導管 18.5",
          "stdKt/V = S ÷ [1 − (0.74/N) × UFw/V] + Kru × 10080/V",
          "SAstdKt/V = stdKt/V ÷ 20 × Vw/BSA",
        ],
      },
      {
        title: "目標",
        color: "green",
        leaves: [
          "每週三次：spKt/V 目標 1.4、最低 1.2（1B）",
          "其他排程：stdKt/V 目標 2.3、最低 2.1（Not Graded）",
          "殘腎足夠時可降低劑量，但需定期測 Kru",
          "低殘腎每週三次：至少 3 小時（1D）",
        ],
      },
      {
        title: "測量與採血",
        color: "cyan",
        leaves: [
          "至少每月測一次",
          "透析前血：給生理食鹽水或肝素之前",
          "透析後血：慢血流 100 mL/min 15 秒，或停透析液 3 分鐘",
          "前血被稀釋 → 低估；後血混入再循環 → 高估",
        ],
      },
      {
        title: "特殊族群",
        color: "rose",
        leaves: [
          "女性與小體型：HEMO 次族群 RR 0.81；可看 SAstdKt/V",
          "大體型：V 大，常需延時加多參數調整",
          "導管：實際血流常受限",
          "懷孕：頻繁長時透析（KDOQI 2.5）",
        ],
      },
    ],
    right: [
      {
        title: "實測低於處方：排查",
        color: "amber",
        leaves: [
          "1. 採血流程與時間點",
          "2. 實際透析時間（提早下機、中斷）",
          "3. 實際血流（動脈壓警報、導管功能）",
          "4. 通路再循環或管路接反",
          "5. 透析器凝血、實際 KoA 較低",
          "把實際值帶回工具，看能解釋多少差距",
        ],
      },
      {
        title: "劑量不足：調整",
        color: "teal",
        leaves: [
          "延長時間：與 Kt/V 成正比，效果最直接",
          "提高 Qb：確認通路可提供，效益遞減",
          "提高 Qd 或換大膜：幅度較小",
          "增加次數：改看 stdKt/V",
          "調整後一定要複測",
        ],
      },
      {
        title: "殘腎與排程",
        color: "green",
        leaves: [
          "Kru 計入條件：3 個月內有實測",
          "處方受殘腎影響：每月量尿量",
          "尿量驟變或住院：加測",
          "每週兩次：Kru 下降時要增加頻次",
          "每週六次：spKt/V 低屬預期，看 stdKt/V",
        ],
      },
      {
        title: "超越 Kt/V",
        color: "rose",
        leaves: [
          "脫水速率 >13 mL/kg/h：死亡 HR 1.59（觀察性）",
          "體重增加多、血壓差、高磷或高鉀：考慮延時或加次數",
          "限鈉、確實達到乾體重",
          "高劑量（1.71）未改善整體存活（HEMO）",
          "達標仍有症狀：可能需要比指引更多的透析",
        ],
      },
    ],
  };
  /*MAP-END*/

  return { RX, CASES, QUIZ, MAP, bsaDuBois, saStd };
})();
if (typeof module !== "undefined") module.exports = TEACH;

if (typeof document !== "undefined") {
  const $ = (id) => document.getElementById(id);
  const VIEWS = ["tool", "cases", "quiz", "map"];
  const LETTERS = ["A", "B", "C", "D"];
  const f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : "--");

  function showView(name, push) {
    const view = VIEWS.includes(name) ? name : "tool";
    VIEWS.forEach((v) => {
      $(`view-${v}`).hidden = v !== view;
      const tab = $(`tab-${v}`);
      tab.classList.toggle("selected", v === view);
      if (v === view) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    if (push) history.replaceState(null, "", view === "tool" ? location.pathname + location.search : `#${view}`);
  }

  /* ---------- 病例 ---------- */
  let currentCase = 0;

  function caseStatus(c) {
    const r = KTV.prescribe(c.rx);
    const m = c.measured ? KTV.measured(c.measured) : null;
    const label = { good: "達標", watch: "接近目標", risk: "未達標" };
    const name = r.metric === "sp" ? "spKt/V" : "stdKt/V";
    const cells = [
      [`處方 ${name}`, f2(r.value), label[r.status], r.status],
      ["V", `${r.v.toFixed(1)} L`, c.rx.vMethod === "watson" ? "Watson" : "體重×0.58", ""],
      ["K", `${r.k.toFixed(0)} mL/min`, `Qb ${c.rx.qb}`, ""],
      ["脫水速率", r.ufr.toFixed(1), "mL/kg/h", r.ufr > 13 ? "risk" : ""],
    ];
    if (m) {
      cells.splice(1, 0, ["實測 spKt/V", f2(m.sp), label[m.status], m.status], ["URR", `${m.urr.toFixed(1)}%`, m.urrOk ? "≥65%" : "<65%", m.urrOk ? "" : "risk"]);
    }
    return cells
      .map(([k, v, n, s]) => `<div class="case-stat ${s}"><span>${k}</span><strong>${v}</strong><small>${n}</small></div>`)
      .join("");
  }

  function compareTable(c) {
    if (!c.compare) return "";
    const hasKru = c.compare.some((x) => "kru" in x.o);
    const hasSa = c.compare.some((x) => x.sa);
    const head = hasKru
      ? "<th>情境</th><th>stdKt/V（透析）</th><th>Kru 項</th><th>合計</th>"
      : `<th>情境</th><th>K</th><th>V</th><th>spKt/V</th><th>eKt/V</th><th>stdKt/V</th>${hasSa ? "<th>SAstdKt/V</th>" : ""}<th>脫水速率</th>`;
    const rows = c.compare
      .map((row) => {
        const r = KTV.prescribe({ ...c.rx, ...row.o });
        if (hasKru) {
          return `<tr><th scope="row">${row.label}</th><td>${f2(r.stdDialysis)}</td><td>${r.kruAdd ? f2(r.kruAdd) : "—"}</td><td><b>${f2(r.std)}</b></td></tr>`;
        }
        const sa = row.sa ? TEACH.saStd(r.std, r.v, TEACH.bsaDuBois(c.rx.weight, c.rx.height)) : null;
        return `<tr><th scope="row">${row.label}</th><td>${r.k.toFixed(0)}</td><td>${r.v.toFixed(1)}</td><td><b>${f2(r.sp)}</b></td><td>${f2(r.e)}</td><td>${f2(r.std)}</td>${hasSa ? `<td>${sa ? f2(sa) : "—"}</td>` : ""}<td>${r.ufr.toFixed(1)}</td></tr>`;
      })
      .join("");
    return `<div class="table-wrap"><table class="case-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderCase() {
    const c = TEACH.CASES[currentCase];
    document.querySelectorAll("#case-picker button").forEach((b, i) => {
      b.classList.toggle("selected", i === currentCase);
      b.setAttribute("aria-pressed", String(i === currentCase));
    });
    $("case-body").innerHTML = `
      <div class="case-head">
        <div>
          <p class="eyebrow">病例 ${currentCase + 1} · ${c.level} · ${c.tag}</p>
          <h2>${c.title}</h2>
        </div>
        <button class="ghost-button" id="load-case" type="button">帶入計算工具</button>
      </div>
      <p class="case-story">${c.story}</p>
      <div class="case-stats">${caseStatus(c)}</div>
      ${compareTable(c)}
      <div class="case-steps">
        ${c.steps
          .map(
            (s, i) => `<details class="case-step"><summary><span>${i + 1}</span>${s.q}</summary><p>${s.a}</p></details>`
          )
          .join("")}
      </div>
      <div class="case-points"><h3>帶走的重點</h3><ul>${c.points.map((p) => `<li>${p}</li>`).join("")}</ul></div>
      <p class="source-line">來源：${c.src}</p>`;
    $("load-case").addEventListener("click", () => {
      window.KTVUI.load(c.rx, c.measured || null);
      showView("tool", true);
      window.scrollTo(0, 0);
    });
  }

  $("case-picker").innerHTML = TEACH.CASES.map(
    (c, i) => `<button type="button" data-i="${i}"><small>${i + 1} · ${c.level}</small>${c.tag}</button>`
  ).join("");
  $("case-picker").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    currentCase = Number(b.dataset.i);
    renderCase();
  });

  /* ---------- 考題 ---------- */
  const answers = new Map();
  let quizFilter = "全部";

  function renderScore() {
    const correct = [...answers].filter(([i, a]) => TEACH.QUIZ[i].a === a).length;
    $("quiz-score").textContent = `已答 ${answers.size}/${TEACH.QUIZ.length} · 答對 ${correct}`;
    const done = answers.size === TEACH.QUIZ.length;
    $("quiz-final").hidden = !done;
    if (done) {
      const basic = [...answers].filter(([i, a]) => TEACH.QUIZ[i].level === "基礎" && TEACH.QUIZ[i].a === a).length;
      $("quiz-final").textContent = `完成：${correct}/20（基礎 ${basic}/10、高階 ${correct - basic}/10）。答錯的題目可回頭對照示範病例與心智圖。`;
    }
  }

  function renderQuiz() {
    document.querySelectorAll("#quiz-filter button").forEach((b) => {
      const on = b.dataset.level === quizFilter;
      b.classList.toggle("selected", on);
      b.setAttribute("aria-pressed", String(on));
    });
    $("quiz-list").innerHTML = TEACH.QUIZ.map((q, i) => {
      if (quizFilter !== "全部" && q.level !== quizFilter) return "";
      const picked = answers.get(i);
      const done = picked !== undefined;
      const opts = q.o
        .map((text, j) => {
          let cls = "";
          if (done && j === q.a) cls = "correct";
          else if (done && j === picked) cls = "wrong";
          return `<button type="button" class="quiz-option ${cls}" data-q="${i}" data-o="${j}" ${done ? "disabled" : ""}><b>${LETTERS[j]}</b><span>${text}</span></button>`;
        })
        .join("");
      const feedback = done
        ? `<div class="quiz-why ${picked === q.a ? "good" : "risk"}"><strong>${picked === q.a ? "答對" : `答錯，正確答案 ${LETTERS[q.a]}`}</strong><p>${q.why}</p><small>來源：${q.src}</small></div>`
        : "";
      return `<article class="quiz-card" id="q${i}"><p class="eyebrow">第 ${i + 1} 題 · ${q.level}</p><h3>${q.q}</h3><div class="quiz-options">${opts}</div>${feedback}</article>`;
    }).join("");
    renderScore();
  }

  $("quiz-list").addEventListener("click", (e) => {
    const b = e.target.closest(".quiz-option");
    if (!b || b.disabled) return;
    answers.set(Number(b.dataset.q), Number(b.dataset.o));
    const y = window.scrollY;
    renderQuiz();
    window.scrollTo(0, y);
  });
  $("quiz-filter").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    quizFilter = b.dataset.level;
    renderQuiz();
  });
  $("quiz-reset").addEventListener("click", () => {
    answers.clear();
    renderQuiz();
    window.scrollTo(0, 0);
  });

  /* ---------- 心智圖 ---------- */
  const branch = (b) =>
    `<details class="mm-branch mm-${b.color}" open><summary>${b.title}</summary><ul>${b.leaves.map((l) => `<li>${l}</li>`).join("")}</ul></details>`;
  $("mm-left").innerHTML = TEACH.MAP.left.map(branch).join("");
  $("mm-right").innerHTML = TEACH.MAP.right.map(branch).join("");
  const setMap = (open) => document.querySelectorAll(".mm-branch").forEach((d) => {
    d.open = open;
  });
  $("mm-open").addEventListener("click", () => setMap(true));
  $("mm-close").addEventListener("click", () => setMap(false));

  /* ---------- 導覽 ---------- */
  document.querySelectorAll("#view-tabs a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      showView(a.dataset.view, true);
      window.scrollTo(0, 0);
    });
  });
  window.addEventListener("hashchange", () => showView(location.hash.slice(1), false));

  renderCase();
  renderQuiz();
  showView(location.hash.slice(1), false);
}
