const { createApp, ref, computed, onMounted, nextTick } = Vue;

createApp({
    setup() {
        const wordsData = ref([]);
        const currentSetIndex = ref(null);
        const currentBookIndex = ref(null);
        const currentLessonIndex = ref(null);
        const showImportExport = ref(false);
        const jsonText = ref('');
        const charInputs = ref([]);

        // Toast notification state
        const toastShow = ref(false);
        const toastMsg = ref('');
        const toastColor = ref('var(--success-color)');

        // Computed properties
        const currentSet = computed(() => {
            if (currentSetIndex.value === null || !wordsData.value[currentSetIndex.value]) return null;
            return wordsData.value[currentSetIndex.value];
        });

        const currentBook = computed(() => {
            if (currentSet.value === null || currentBookIndex.value === null || !currentSet.value.books[currentBookIndex.value]) return null;
            return currentSet.value.books[currentBookIndex.value];
        });

        const currentLesson = computed(() => {
            if (currentBook.value === null || currentLessonIndex.value === null || !currentBook.value.lessons[currentLessonIndex.value]) return null;
            return currentBook.value.lessons[currentLessonIndex.value];
        });

        // Helper: Show toast notification
        function showToast(msg, color = 'var(--success-color)') {
            toastMsg.value = msg;
            toastColor.value = color;
            toastShow.value = true;
            setTimeout(() => {
                toastShow.value = false;
            }, 3000);
        }

        // 載入 App 預設字庫
        const loadFromApp = async () => {
            try {
                const response = await fetch('words.json?t=' + Date.now());
                const data = await response.json();
                wordsData.value = data;
                if (wordsData.value.length > 0) {
                    currentSetIndex.value = 0;
                    if (wordsData.value[0].books.length > 0) {
                        currentBookIndex.value = 0;
                        if (wordsData.value[0].books[0].lessons.length > 0) {
                            currentLessonIndex.value = 0;
                        }
                    }
                }
                showToast('已從伺服器載入預設字庫');
            } catch (error) {
                console.error('Error loading default words.json:', error);
                showToast('無法讀取預設字庫', 'var(--danger-color)');
            }
        };

        // 處理本地檔案上傳
        const handleFileUpload = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (Array.isArray(data)) {
                        wordsData.value = data;
                        if (wordsData.value.length > 0) {
                            currentSetIndex.value = 0;
                            currentBookIndex.value = 0;
                            currentLessonIndex.value = 0;
                        }
                        showToast('成功載入本地檔案！');
                    } else {
                        throw new Error('JSON 格式不正確');
                    }
                } catch (err) {
                    alert('讀取失敗: ' + err.message);
                } finally {
                    event.target.value = '';
                }
            };
            reader.readAsText(file);
        };

        // 下載 JSON
        const downloadJson = () => {
            if (wordsData.value.length === 0) {
                alert('沒有資料可下載');
                return;
            }
            const dataStr = JSON.stringify(wordsData.value, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'words.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('下載成功');
        };

        const selectLesson = (sIndex, bIndex, lIndex) => {
            currentSetIndex.value = sIndex;
            currentBookIndex.value = bIndex;
            currentLessonIndex.value = lIndex;
        };

        const addNewSet = () => {
            const newSet = {
                publisher: "自訂",
                tw_year: (new Date().getFullYear() - 1911).toString(),
                books: []
            };
            wordsData.value.push(newSet);
            currentSetIndex.value = wordsData.value.length - 1;
            addNewBook();
        };

        const addNewBook = (sIndex = null) => {
            if (sIndex !== null) currentSetIndex.value = sIndex;
            if (currentSetIndex.value === null) return;
            const newBook = {
                grade: "新年級",
                semester: "上學期",
                lessons: []
            };
            wordsData.value[currentSetIndex.value].books.push(newBook);
            currentBookIndex.value = wordsData.value[currentSetIndex.value].books.length - 1;
            addNewLesson();
        };

        const addNewLesson = (sIndex = null, bIndex = null) => {
            if (sIndex !== null) currentSetIndex.value = sIndex;
            if (bIndex !== null) currentBookIndex.value = bIndex;

            if (currentSetIndex.value === null || currentBookIndex.value === null) return;
            const newLesson = {
                chapter: "第 X 課",
                title: "新課次",
                new_characters: []
            };
            wordsData.value[currentSetIndex.value].books[currentBookIndex.value].lessons.push(newLesson);
            currentLessonIndex.value = wordsData.value[currentSetIndex.value].books[currentBookIndex.value].lessons.length - 1;
        };

        const deleteCurrentLesson = () => {
            if (!currentLesson.value) return;
            if (confirm(`確定要刪除「${currentLesson.value.title}」嗎？`)) {
                wordsData.value[currentSetIndex.value].books[currentBookIndex.value].lessons.splice(currentLessonIndex.value, 1);
                currentLessonIndex.value = wordsData.value[currentSetIndex.value].books[currentBookIndex.value].lessons.length > 0 ? 0 : null;
                showToast('已刪除課次', 'var(--secondary-color)');
            }
        };

        const addCharacter = async () => {
            if (!currentLesson.value) return;
            currentLesson.value.new_characters.push({
                char: "",
                zhuyin: "",
                words: [],
                isManual: false
            });

            await nextTick();
            const inputs = charInputs.value;
            if (inputs && inputs.length > 0) {
                const lastInput = inputs[inputs.length - 1];
                lastInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                lastInput.focus();
            }
        };

        const deleteCharacter = (cIndex) => {
            currentLesson.value.new_characters.splice(cIndex, 1);
        };

        const updateWords = (cIndex, val) => {
            const wordsArray = val.split(',')
                .map(w => w.trim())
                .filter(w => w !== '');
            currentLesson.value.new_characters[cIndex].words = wordsArray;
        };

        const exportJson = () => {
            jsonText.value = JSON.stringify(wordsData.value, null, 2);
        };

        const importJson = () => {
            if (!jsonText.value.trim()) return;
            try {
                const parsed = JSON.parse(jsonText.value);
                if (Array.isArray(parsed)) {
                    wordsData.value = parsed;
                    showToast('匯入完成！');
                    if (wordsData.value.length > 0) {
                        currentBookIndex.value = 0;
                        currentLessonIndex.value = 0;
                    }
                    showImportExport.value = false;
                } else {
                    throw new Error('格式應為陣列');
                }
            } catch (error) {
                alert('匯入失敗：' + error.message);
            }
        };

        const copyToClipboard = () => {
            navigator.clipboard.writeText(jsonText.value);
            showToast('已複製到剪貼簿');
        };

        // --- Zhuyin Automation ---
        const autoLookup = ref(true);
        const activeInputRef = ref(null); // { cIndex, field: 'zhuyin' }
        let lastQueryTime = 0;
        const QUERY_COOLDOWN = 500; // ms

        const onCharInput = async (cIndex) => {
            if (!autoLookup.value) return;
            const charObj = currentLesson.value.new_characters[cIndex];
            const char = charObj.char;
            if (!char || char.length !== 1) return;

            // Don't override if manually edited
            if (charObj.isManual) return;

            // Soft rate limit
            const now = Date.now();
            if (now - lastQueryTime < QUERY_COOLDOWN) {
                console.log('Query suppressed due to rate limit');
                return;
            }
            lastQueryTime = now;

            try {
                const response = await fetch(`https://www.moedict.tw/a/${encodeURIComponent(char)}.json`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.h && data.h[0] && data.h[0].b) {
                        charObj.zhuyin = data.h[0].b;
                        showToast(`自動填入: ${data.h[0].b}`, 'rgba(74, 144, 226, 0.8)');
                    }
                }
            } catch (err) {
                console.warn('Moedict lookup failed', err);
            }
        };

        const markManual = (cIndex) => {
            if (currentLesson.value && currentLesson.value.new_characters[cIndex]) {
                currentLesson.value.new_characters[cIndex].isManual = true;
            }
        };

        // --- Virtual Keyboard ---
        const showKeyboard = ref(false);
        const zhuyinSymbols = [
            ['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ'],
            ['ㄉ', 'ㄊ', 'ㄋ', 'ㄌ'],
            ['ㄍ', 'ㄎ', 'ㄏ', 'ㄐ'],
            ['ㄑ', 'ㄒ', 'ㄓ', 'ㄔ'],
            ['ㄕ', 'ㄖ', 'ㄗ', 'ㄘ'],
            ['ㄙ', 'ㄚ', 'ㄛ', 'ㄜ'],
            ['ㄝ', 'ㄞ', 'ㄟ', 'ㄠ'],
            ['ㄡ', 'ㄢ', 'ㄣ', 'ㄤ'],
            ['ㄥ', 'ㄦ', 'ㄧ', 'ㄨ', 'ㄩ'],
            ['˙', 'ˊ', 'ˇ', 'ˋ']
        ];

        const setActiveInput = (cIndex, field) => {
            activeInputRef.value = { cIndex, field };
            showKeyboard.value = true;
        };

        const addSymbol = (symbol) => {
            if (!activeInputRef.value) return;
            const { cIndex, field } = activeInputRef.value;
            const charObj = currentLesson.value.new_characters[cIndex];
            if (field === 'zhuyin') {
                charObj.zhuyin += symbol;
                charObj.isManual = true;
            }
        };

        const backspace = () => {
            if (!activeInputRef.value) return;
            const { cIndex, field } = activeInputRef.value;
            const charObj = currentLesson.value.new_characters[cIndex];
            if (field === 'zhuyin' && charObj.zhuyin.length > 0) {
                charObj.zhuyin = charObj.zhuyin.slice(0, -1);
                charObj.isManual = true;
            }
        };

        onMounted(() => {
            // 可以選擇預設載入 app 的
            // loadFromApp();
        });

        return {
            wordsData,
            currentSetIndex,
            currentBookIndex,
            currentLessonIndex,
            currentSet,
            currentBook,
            currentLesson,
            showImportExport,
            jsonText,
            toastShow,
            toastMsg,
            toastColor,
            autoLookup,
            showKeyboard,
            zhuyinSymbols,
            charInputs,
            handleFileUpload,
            loadFromApp,
            downloadJson,
            selectLesson,
            addNewSet,
            addNewBook,
            addNewLesson,
            deleteCurrentLesson,
            addCharacter,
            deleteCharacter,
            updateWords,
            exportJson,
            importJson,
            copyToClipboard,
            onCharInput,
            markManual,
            setActiveInput,
            addSymbol,
            backspace
        };
    }
}).mount('#app');
