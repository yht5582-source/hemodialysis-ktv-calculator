# 血液透析 Kt/V 達標計算器

以繁體中文呈現的單頁式血液透析處方估算工具。使用者可調整體重、人工腎臟膜面積與效率、血流速、透析液流速及透析時間，即時觀察估算的尿素清除率、Kt/V 與達標所需時間。

[開啟線上計算器](https://yht5582-source.github.io/hemodialysis-ktv-calculator/)

> [!IMPORTANT]
> 處方模擬區計算的是依處方參數推估的理論 Kt/V，**不是以透析前後 BUN 求得的實際 delivered spKt/V**（實測值請用頁面下方的 BUN 計算區）。結果僅適合處方模擬、教學或初步比較，不得取代透析充分性檢驗、臨床判斷或個別化醫囑。

## 主要功能

- **處方模擬**：由膜面積／效率（或已知 KoA）、Qb、Qd、血比容、時間估算尿素清除率 `K`，並算出 spKt/V、eKt/V、stdKt/V。
- **分布體積 V**：體重 × 0.58，或 Watson 公式（性別、年齡、身高、體重）。
- **依頻率判讀**：每週三次看單次 spKt/V（目標 1.4、最低 1.2）；每週 2 次或 ≥4 次改看 stdKt/V（目標 2.3、最低 2.1）。
- **達標差距**：達目標所需時間、目前時間下所需 Qb。
- **實測 spKt/V**：輸入透析前後 BUN、時間、脫水量、透析後體重，以 Daugirdas 第二代公式計算 spKt/V、URR、eKt/V。
- 提示：Qb > Qd、導管高血流、脫水速率 >13 mL/kg/h、以體重法估算 V。
- 所有計算都在瀏覽器本機完成，不會將輸入資料傳送至伺服器。

## 計算方式

| 項目 | 公式 |
| --- | --- |
| 血液水流量 | `Qbw = Qb × [0.93 × (1 − Hct) + 0.72 × Hct]` |
| KoA（估算） | `膜面積 × 460（標準）／540（高效）／380（保守）`；可改填已知 KoA |
| 清除率 K（逆流） | `Z = Qbw/Qd`，`E = exp[KoA/Qbw × (1 − Z)]`，`K = Qbw × (E − 1)/(E − Z)`；`Qbw = Qd` 時 `K = Qbw × KoA/(Qbw + KoA)` |
| V | `體重 × 0.58`，或 Watson：男 `2.447 − 0.09516×年齡 + 0.1074×身高 + 0.3362×體重`；女 `−2.097 + 0.1069×身高 + 0.2466×體重` |
| 處方 spKt/V | `K × t ÷ V` |
| eKt/V | `spKt/V × t/(t + Tp)`，Tp：AVF/AVG 30.7 分、導管 18.5 分（FHN 修正 Tattersall） |
| stdKt/V | `S = [10080(1 − e^−eKt/V)/t] ÷ [(1 − e^−eKt/V)/eKt/V + 10080/(N·t) − 1]`，再除以 `1 − (0.74/N) × 每週脫水/V`（KDOQI 2015） |
| 實測 spKt/V | `−ln(R − 0.008t) + (4 − 3.5R) × UF/W`（Daugirdas 1993） |
| URR | `(1 − R) × 100%`，最低 65% |

判讀以四捨五入到兩位小數的數值為準（畫面顯示 1.40 即為達標），達標所需時間與 Qb 也用同一標準。

KoA 係數是本工具的簡化假設，不是特定廠牌的實測 KoA；廠商 in vitro KoA 通常高於實際 in vivo 值。

## 使用方式

### 線上使用

前往 <https://yht5582-source.github.io/hemodialysis-ktv-calculator/>，修改任一輸入後，結果會立即更新。

### 本機使用

本專案不需要安裝套件或執行建置程序。下載 repository 後可直接開啟 `index.html`，也可以在專案目錄啟動靜態伺服器：

```bash
python3 -m http.server 8000
```

接著開啟 <http://localhost:8000/>。

## 專案結構

```text
.
├── .nojekyll   # 停用 GitHub Pages 的 Jekyll 處理
├── index.html  # 頁面結構、輸入欄位與結果區
├── styles.css  # 響應式版面與視覺樣式
├── app.js      # 計算核心（/*ENGINE-START*/…/*ENGINE-END*/）與畫面處理
├── tests.cjs   # 計算核心測試：node tests.cjs
└── README.md   # 專案說明
```

## 技術架構

- HTML5
- CSS3
- 原生 JavaScript
- GitHub Pages
- 無後端、資料庫、套件管理器或外部執行期相依套件

## 臨床限制

本工具未納入下列會影響實際透析充分性的因素：

- 透析前後 BUN 與抽血時機
- 超濾量與透析中體重變化
- 心肺再循環與透析後尿素反彈
- 血管通路再循環、針位與實際有效血流量
- 治療中斷、凝血、人工腎臟效能衰減與透析液因素
- 個別體液組成差異（V 為公式估算）
- 殘餘腎功能
- 症狀、容量控制、血壓、電解質、營養及其他充分性指標

正式品質監測應依標準採血流程計算 delivered spKt/V，並由透析照護團隊綜合病人狀況判讀。請勿在此工具輸入姓名、病歷號或其他可識別個人的醫療資訊。

## 參考資料

- [KDOQI Clinical Practice Guideline for Hemodialysis Adequacy: 2015 Update. Am J Kidney Dis 2015](https://pubmed.ncbi.nlm.nih.gov/26498416/)
- [Daugirdas JT. Second generation logarithmic estimates of single-pool variable volume Kt/V. J Am Soc Nephrol 1993](https://pubmed.ncbi.nlm.nih.gov/8305648/)
- [Daugirdas JT et al. Standard Kt/V urea including fluid removal and residual kidney clearance. Kidney Int 2010](https://pubmed.ncbi.nlm.nih.gov/20107428/)
- [Watson PE et al. Total body water volumes for adult males and females. Am J Clin Nutr 1980](https://pubmed.ncbi.nlm.nih.gov/6986753/)
- [FHN Trial MOP ch.19：尿素動力學與通路別反彈校正](https://repository.niddk.nih.gov/public/study_document/Documents/MOP/Chapter19_Kinetic_Modeling_Noct_archive.pdf)
- [National Kidney Foundation：KDOQI 2015 Hemodialysis Adequacy Guideline Update](https://www.kidney.org/news-stories/kdoqi-2015-hemodialysis-adequacy-guideline-update)
- [KDOQI Clinical Practice Guideline for Hemodialysis Adequacy: 2015 Update](https://www.kidney.org/sites/default/files/KDOQI-Clinical-Practice-Guideline-Hemodialysis-Update_Public-Review-Draft-FINAL_20150204.pdf)
- [National Kidney Foundation：Hemodialysis](https://www.kidney.org/kidney-topics/hemodialysis)

## 授權

此 repository 目前未提供 `LICENSE` 檔案。除非另有明確授權，原始碼的使用、修改與散布權利均由著作權人保留。
