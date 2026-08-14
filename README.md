# 血液透析 Kt/V 達標計算器

以繁體中文呈現的單頁式血液透析處方估算工具。使用者可調整體重、人工腎臟膜面積與效率、血流速、透析液流速及透析時間，即時觀察估算的尿素清除率、Kt/V 與達標所需時間。

[開啟線上計算器](https://yht5582-source.github.io/hemodialysis-ktv-calculator/)

> [!IMPORTANT]
> 本工具計算的是依處方參數推估的理論 Kt/V，**不是以透析前後 BUN 求得的實際 delivered spKt/V**。結果僅適合處方模擬、教學或初步比較，不得取代透析充分性檢驗、臨床判斷或個別化醫囑。

## 主要功能

- 即時估算尿素清除率 `K`、分布體積 `V`、總清除量 `Kt` 與 `Kt/V`。
- 提供 1.4、1.6、1.8 與 2.1 m² 常用膜面積快捷選項。
- 可切換標準、高效與保守三種人工腎臟效率假設。
- 依 `spKt/V 1.4` 目標與 `1.2` 最低值顯示達標狀態。
- 推估達到目標所需的透析時間，以及目前處方的時間差距或餘裕。
- 響應式版面，可於桌面、平板及手機瀏覽器使用。
- 所有計算都在瀏覽器本機完成，不會將輸入資料傳送至伺服器。

## 輸入項目

| 輸入 | 單位 | 預設值 | 說明 |
| --- | --- | ---: | --- |
| 體重 | kg | 70 | 用於估算尿素分布體積 |
| 人工腎臟型號 | 文字 | 人工腎臟 1.8 m² | 僅作畫面標示，不影響計算 |
| 膜面積 | m² | 1.8 | 用於估算 KoA |
| 膜效率 | 類別 | 高效 | 決定每平方公尺的 KoA 假設值 |
| 血流速 `Qb` | mL/min | 300 | 估算尿素清除率的血液流量 |
| 透析液流速 `Qd` | mL/min | 500 | 估算尿素清除率的透析液流量 |
| 透析時間 | 小時 | 4 | 計算總清除量與 Kt/V |

數值欄位必須大於 0；輸入無效時，頁面會停止估算並顯示待輸入狀態。

## 計算方式

### 1. 估算 KoA

```text
KoA = 膜面積 × 膜效率係數
```

| 膜效率 | 係數 |
| --- | ---: |
| 標準 | 460 |
| 高效 | 540 |
| 保守 | 380 |

係數是本工具用於處方比較的簡化假設，不是特定人工腎臟廠牌的實測 KoA。實際效能應以產品資料、透析機設定與臨床量測為準。

### 2. 估算尿素清除率 K

工具以 `Qb`、`Qd` 與 `KoA` 套用逆流式人工腎臟清除模型，並將結果限制在 0 至 `min(Qb, Qd)` mL/min。

### 3. 估算分布體積 V

```text
V（L）= 體重（kg）× 0.58
```

### 4. 計算 Kt/V

```text
Kt（L） = K（mL/min）× 透析時間（min）÷ 1000
Kt/V    = Kt（L）÷ V（L）
```

### 5. 判讀門檻

| 估算 Kt/V | 顯示結果 |
| ---: | --- |
| ≥ 1.4 | 達標 |
| 1.2–< 1.4 | 接近目標 |
| < 1.2 | 未達標 |

上述門檻對應成人每週三次血液透析常用的處方目標與最低 delivered spKt/V；不同透析頻率、顯著殘餘腎功能或特殊臨床情境需採用不同評估方式。

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
├── app.js      # 計算公式、輸入處理與狀態判讀
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
- 個別體液組成差異；固定以體重的 58% 估算 `V`
- 殘餘腎功能與每週透析頻率
- 症狀、容量控制、血壓、電解質、營養及其他充分性指標

正式品質監測應依標準採血流程計算 delivered spKt/V，並由透析照護團隊綜合病人狀況判讀。請勿在此工具輸入姓名、病歷號或其他可識別個人的醫療資訊。

## 參考資料

- [National Kidney Foundation：KDOQI 2015 Hemodialysis Adequacy Guideline Update](https://www.kidney.org/news-stories/kdoqi-2015-hemodialysis-adequacy-guideline-update)
- [KDOQI Clinical Practice Guideline for Hemodialysis Adequacy: 2015 Update](https://www.kidney.org/sites/default/files/KDOQI-Clinical-Practice-Guideline-Hemodialysis-Update_Public-Review-Draft-FINAL_20150204.pdf)
- [National Kidney Foundation：Hemodialysis](https://www.kidney.org/kidney-topics/hemodialysis)

## 授權

此 repository 目前未提供 `LICENSE` 檔案。除非另有明確授權，原始碼的使用、修改與散布權利均由著作權人保留。
