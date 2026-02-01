# 國字注音練習 App

一個基於 Vue.js 的國字注音練習應用，專為 iPad 手寫輸入優化。

## 功能特點

- **課文選擇**: 支援多課文選擇，依年級、學期、版本分類
- **測驗類型**: 
  - 看注音寫國字
  - 看國字寫注音
  - 混合題型
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

```
國字注音練習/
├── index.html              # 主頁面
├── words.json              # 字詞資料
├── css/
│   └── style.css           # 樣式
├── js/
│   ├── app.js              # Vue 應用主程式
│   ├── services/
│   │   ├── storageService.js   # IndexedDB 服務
│   │   ├── dataService.js      # 資料載入服務
│   │   └── testEngine.js       # 測驗生成引擎
│   └── components/
│       ├── HandwritingCanvas.js # 手寫畫布元件
│       ├── LessonSelector.js    # 課文選擇器
│       ├── HomePage.js          # 首頁
│       ├── TestPage.js          # 測驗頁面
│       └── ReviewPage.js        # 歷史紀錄頁面
└── plans/
    └── architecture.md     # 架構設計文件
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
   - 輸入題數
   - 選擇測驗類型（看注音寫國字、看國字寫注音、混合）
   - 點擊「開始測驗」

4. **進行測驗**
   - 在畫布上手寫答案
   - 點擊「清除」可重寫
   - 點擊「下一題」儲存並繼續

5. **查看紀錄**
   - 首頁點擊「查看歷史紀錄」
   - 查看所有測驗記錄
   - 點擊「查看」檢視手寫答案
   - 可刪除不需要的記錄

## 資料格式 (words.json)

```json
[
  {
    "grade": "一年級",
    "semester": "上學期",
    "book_type": "甲本",
    "lessons": [
      {
        "chapter": "第一課",
        "title": "拍拍手",
        "new_characters": [
          {
            "char": "右",
            "zhuyin": "ㄧㄡˋ",
            "words": ["右手", "左右"]
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

## 注意事項

- 首次使用需允許 IndexedDB 權限
- 手寫答案儲存在瀏覽器本地
- 清除瀏覽器資料會刪除所有記錄
- 建議在 iPad 或大螢幕裝置使用

## Development

This project was developed with AI assistance:
- **AI Assistant**: Claude (Anthropic)
- **Models Used**: Claude Opus 4.5, Claude Sonnet 4.5, Gemini 3 Pro
- **Development Approach**: Iterative architecture design and implementation
- **Code Review**: AI-assisted debugging and optimization

The architecture, component design, and implementation were collaboratively developed through human-AI interaction, combining educational requirements with modern web development best practices.

## License

MIT License - see [`LICENSE`](LICENSE) file for details.

This project uses Vue.js 3, which is also MIT licensed.
