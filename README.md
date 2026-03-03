# 國字注音練習 App

一個基於 Vue.js 的國字注音練習應用，專為 iPad 手寫輸入優化。

## 功能特點

- **課文選擇**: 支援多課文選擇，依年級、學期、版本分類
- **測驗類型**: 
  - 看注音寫國字 / 看國字寫注音 (生字與詞語練習)
  - 形近字/多音字測驗 (Polyphonic/Similar Shapes)
  - 成語練習 (Idiom Practice)
  - 混合題型與易錯字複習
- **手寫輸入**: 支援觸控螢幕和 Apple Pencil 手寫
- **答案保存**: 使用 IndexedDB 本地儲存所有手寫答案
- **歷史紀錄**: 家長可查看所有測驗紀錄和手寫答案

## 技術架構

- **前端框架**: Vue 3 (CDN)
- **路由**: 自訂 Hash-based Router
- **儲存**: IndexedDB
- **樣式**: Pure CSS (iPad 優化)
- **繪圖**: HTML5 Canvas

## 檔案結構

```text
國字注音練習/
├── index.html              # 主頁面
├── words.json              # 字詞資料
├── css/
│   └── style.css           # 樣式
├── js/
│   ├── app.js              # Vue 應用主程式
│   ├── editor.js           # 詞庫編輯器邏輯
│   ├── services/
│   │   ├── storageService.js   # IndexedDB 服務
│   │   ├── dataService.js      # 資料載入服務
│   │   └── testEngine.js       # 測驗生成引擎
│   └── components/
│       ├── HandwritingCanvas.js     # 手寫畫布元件
│       ├── LessonSelector.js        # 課文選擇器
│       ├── HomePage.js              # 首頁
│       ├── TestPage.js              # 基本測驗頁面
│       ├── PolyphonicTestPage.js    # 多音字/形近字測驗
│       ├── IdiomTestPage.js         # 成語測驗頁面
│       ├── QuestionableListPage.js  # 易錯字複習
│       └── ReviewPage.js            # 歷史紀錄頁面
├── editor.html             # 詞庫編輯器介面
├── editor_server.py        # 詞庫編輯器後端伺服器
├── verify_order.py         # 詞庫排序檢查工具
├── signer.py               # 專案數位簽章工具
└── plans/
    ├── architecture.md     # 架構設計文件
    └── data_structure.md   # 資料結構說明
```

## 使用方式

1. **啟動應用**
   - 在瀏覽器中開啟 `index.html`
   - 或使用本地伺服器 (推薦): `python -m http.server 8000`
   - 訪問 `http://localhost:8000`

2. **選擇課文**
   - 展開年級、學期、版本
   - 勾選要練習的課文
   - 可選擇多個課文

3. **設定測驗**
   - 選擇測驗類型（基本生字、多音字/形近字、成語練習等）
   - 點擊「開始測驗」

4. **進行測驗**
   - 在畫布上手寫答案
   - 點擊「清除」可重寫
   - 點擊「下一題」儲存並繼續

5. **查看紀錄**
   - 首頁點擊「查看歷史紀錄」
   - 查看所有測驗記錄及其手寫答案

## 資料格式 (words.json)

新版 `words.json` 的核心結構如下（完整說明請見 `plans/data_structure.md`）：

```json
[
  {
    "publisher": "康軒",
    "tw_year": "114",
    "books": [
      {
        "grade": "二年級",
        "semester": "下學期",
        "lessons": [
          {
            "chapter": "第一課",
            "title": "春天的顏色",
            "parts": {
              "vocabulary_and_sentences": [ ... ],
              "phonetic_analysis": {
                "similar_shapes": [ ... ],
                "multiple_phonetics": [ ... ]
              },
              "key_sentences": { ... },
              "extended_idioms": [ ... ]
            }
          }
        ]
      }
    ]
  }
]
```

## 瀏覽器支援

- Chrome/Edge (推薦)
- Safari (iPad)
- Firefox

需要支援:
- ES6+
- IndexedDB
- Canvas API
- Touch Events

## iPad 優化

- 觸控事件處理
- Apple Pencil 支援
- 適當的按鈕尺寸 (44x44px)
- 防止意外縮放
- 流暢的繪圖體驗

## 詞庫編輯與貢獻

本專案提供一個編輯器與排序檢查工具，方便您管理或客製化自己的 `words.json` 詞庫。

1. **開啟編輯器**
   - 執行 `python3 editor_server.py`
   - 開啟 `http://localhost:8001/editor.html` (預設埠 8001)

2. **排序檢查**
   - 確保詞庫排序正確：執行 `python3 verify_order.py`

## Development

This project was developed with AI assistance:
- **AI Assistant**: Claude (Anthropic) & Gemini (Google)
- **Development Approach**: Iterative architecture design and implementation
- **Code Review**: AI-assisted debugging and optimization

## License

MIT License - see [`LICENSE`](LICENSE) file for details.
