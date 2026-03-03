// Home Page Component
const HomePage = {
    name: 'HomePage',
    template: `
        <div class="test-container-wrapper">
            <div class="header">
                <h1>國字注音練習</h1>
            </div>
            
            <div class="content full-height">
                <lesson-selector v-model="selectedLessons">
                    <template #sidebar-extras>
                        <div class="test-config-sidebar">
                            <h3 class="config-section-title">📝 測驗設定</h3>
                            
                            <div class="config-row-sidebar">
                                <label class="config-label-small">題數</label>
                                <input 
                                    v-model.number="testCount" 
                                    type="number" 
                                    min="1" 
                                    max="50"
                                    class="config-input-small"
                                    placeholder="輸入題數"
                                />
                            </div>
                            
                            <div class="config-row-sidebar">
                                <label class="config-label-small">題型</label>
                                <div class="radio-group-sidebar">
                                    <label class="radio-item-small">
                                        <input type="radio" value="char" v-model="testType"> 看注音寫國字
                                    </label>
                                    <label class="radio-item-small">
                                        <input type="radio" value="zhuyin" v-model="testType"> 看國字寫注音
                                    </label>
                                    <label class="radio-item-small">
                                        <input type="radio" value="mixed" v-model="testType"> 混合題型
                                    </label>
                                </div>
                            </div>
                            
                            <button 
                                @click="startTest" 
                                :disabled="!canStartTest"
                                class="btn btn-primary btn-full mt-10"
                            >
                                生字測驗
                            </button>
                            
                            <button 
                                @click="startSimilarShapesTest" 
                                :disabled="selectedLessons.length === 0"
                                class="btn btn-teal btn-full mt-10"
                            >
                                🔡 形近字測驗
                            </button>
                            
                            <button 
                                @click="startPolyphonicTest" 
                                :disabled="selectedLessons.length === 0"
                                class="btn btn-info btn-full mt-10"
                            >
                                🔊 多音字測驗
                            </button>
                            
                            <button 
                                @click="startIdiomTest" 
                                :disabled="selectedLessons.length === 0"
                                class="btn btn-purple btn-full mt-10"
                            >
                                📖 成語填空
                            </button>
                            
                            <button 
                                @click="startStarredTest" 
                                class="btn btn-warning btn-full mt-10"
                            >
                                ★ 練習標記
                            </button>
                            
                            <button 
                                @click="goToQuestionableList" 
                                class="btn btn-danger btn-full mt-10"
                            >
                                ? 查看標記
                            </button>
                            
                            <button 
                                @click="goToReview" 
                                class="btn btn-secondary btn-full mt-10"
                            >
                                歷史紀錄
                            </button>

                            <button 
                                @click="openEditor" 
                                class="btn btn-editor btn-full mt-10"
                            >
                                ✏️ 編輯詞庫
                            </button>
                        </div>
                    </template>
                </lesson-selector>

                <!-- Toast Notification -->
                <transition name="toast-fade">
                    <div v-if="toast.show" class="toast">
                        {{ toast.message }}
                    </div>
                </transition>
            </div>
        </div>
    `,
    components: {
        LessonSelector
    },
    data() {
        return {
            selectedLessons: [],
            testCount: 10,
            testType: 'mixed',
            toast: {
                show: false,
                message: ''
            }
        };
    },
    computed: {
        canStartTest() {
            return this.selectedLessons.length > 0 && this.testCount > 0;
        }
    },
    mounted() {
        // Restore previous selection from sessionStorage
        try {
            const saved = sessionStorage.getItem('homepageState');
            if (saved) {
                const state = JSON.parse(saved);
                if (state.selectedLessons) this.selectedLessons = state.selectedLessons;
                if (state.testCount) this.testCount = state.testCount;
                if (state.testType) this.testType = state.testType;
            }
        } catch (e) { /* ignore */ }
    },
    watch: {
        selectedLessons(v) { this._saveState(); },
        testCount(v) { this._saveState(); },
        testType(v) { this._saveState(); },
    },
    methods: {
        _saveState() {
            try {
                sessionStorage.setItem('homepageState', JSON.stringify({
                    selectedLessons: this.selectedLessons,
                    testCount: this.testCount,
                    testType: this.testType
                }));
            } catch (e) { /* ignore */ }
        },
        async startTest() {
            if (!this.canStartTest) {
                alert('請選擇課文並輸入題數');
                return;
            }

            try {
                // Generate test questions
                const questions = await TestEngine.generateTest(
                    this.selectedLessons,
                    this.testCount,
                    this.testType
                );

                if (questions.length === 0) {
                    alert('所選課文沒有可用的字詞');
                    return;
                }

                // Create session
                const session = await StorageService.createSession(
                    this.selectedLessons,
                    this.testType,
                    questions.length
                );

                // Navigate to test page with session and questions
                this.$router.push({
                    name: 'test',
                    params: {
                        sessionId: session.id,
                        questions: JSON.stringify(questions)
                    }
                });
            } catch (error) {
                console.error('Error starting test:', error);
                alert('啟動測驗時發生錯誤');
            }
        },

        async startSimilarShapesTest() {
            if (this.selectedLessons.length === 0) {
                alert('請先選擇課文');
                return;
            }
            try {
                const questions = await TestEngine.generateSimilarShapesTest(this.selectedLessons);
                if (questions.length === 0) {
                    alert('所選課文沒有形近字資料');
                    return;
                }
                const session = await StorageService.createSession(
                    this.selectedLessons,
                    'similar_shapes',
                    questions.length
                );
                this.$router.push({
                    name: 'test',
                    params: { sessionId: session.id, questions: JSON.stringify(questions) }
                });
            } catch (error) {
                console.error('Error starting similar shapes test:', error);
                alert(error.message || '啟動測驗時發生錯誤');
            }
        },

        async startStarredTest() {
            try {
                const stars = await StorageService.getStarredItems();
                if (stars.length === 0) {
                    alert('尚無標記題目');
                    return;
                }

                // Convert starred items to questions format
                const questions = stars.map(item => ({
                    id: item.id,
                    type: item.type,
                    targetChar: item.targetChar,
                    targetZhuyin: item.targetZhuyin,
                    contextWord: item.contextWord,
                    lessonTitle: '標記題目'
                }));

                // Create session
                const session = await StorageService.createSession(
                    ['starred'],
                    'mixed',
                    questions.length
                );

                // Navigate
                this.$router.push({
                    name: 'test',
                    params: {
                        sessionId: session.id,
                        questions: JSON.stringify(questions)
                    }
                });
            } catch (error) {
                console.error('Error starting starred test:', error);
                alert('發生錯誤');
            }
        },

        async goToQuestionableList() {
            this.$router.push({ name: 'questionable' });
        },

        async goToReview() {
            this.$router.push({ name: 'review' });
        },

        openEditor() {
            window.open('editor.html', '_blank');
        },

        async startIdiomTest() {
            if (this.selectedLessons.length === 0) {
                alert('請先選擇課文');
                return;
            }
            try {
                const result = await TestEngine.generateIdiomTest(this.selectedLessons);
                if (!result || result.questions.length === 0) {
                    alert('所選課文沒有成語資料');
                    return;
                }

                // Create session
                const session = await StorageService.createSession(
                    this.selectedLessons,
                    'idiom',
                    result.questions.length
                );

                // Clear previous session state
                PersistenceService.clear('idiomTestState');
                sessionStorage.setItem('idiomTestData', JSON.stringify({
                    ...result,
                    sessionId: session.id
                }));
                this.$router.push({ name: 'idiom-test' });
            } catch (error) {
                console.error('Error starting idiom test:', error);
                alert(error.message || '啟動成語測驗時發生錯誤');
            }
        },

        async startPolyphonicTest() {
            if (this.selectedLessons.length === 0) {
                alert('請先選擇課文');
                return;
            }
            try {
                const questions = await TestEngine.generatePolyphonicTest(this.selectedLessons);
                if (questions.length === 0) {
                    alert('所選課文沒有多音字資料');
                    return;
                }
                const session = await StorageService.createSession(
                    this.selectedLessons,
                    'polyphonic',
                    questions.length
                );
                sessionStorage.setItem('polyphonicTestData', JSON.stringify({
                    sessionId: session.id,
                    questions
                }));
                this.$router.push({ name: 'polyphonic-test' });
            } catch (error) {
                console.error('Error starting polyphonic test:', error);
                alert(error.message || '啟動測驗時發生錯誤');
            }
        },

        showToast(message) {
            this.toast.message = message;
            this.toast.show = true;
            setTimeout(() => {
                this.toast.show = false;
            }, 3000);
        }
    }
};

// Make it globally available
window.HomePage = HomePage;

/* SIGNATURE_START
   [​‌‌‌‌​‌‌‍​​‌​​​‌​‍​‌‌‌​‌​‌‍​‌‌‌​​‌​‍​‌‌​‌‌​​‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​‌​​​‍​‌‌‌​‌​​‍​‌‌‌​‌​​‍​‌‌‌​​​​‍​‌‌‌​​‌‌‍​​‌‌‌​‌​‍​​‌​‌‌‌‌‍​​‌​‌‌‌‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌‌​‌​‌‍​‌‌​​​‌​‍​​‌​‌‌‌​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​‌‌​‌‍​​‌​‌‌‌‌‍​‌‌‌​​‌‌‍​‌‌​​​‌‌‍​‌‌‌​​‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌​‌‌‍​‌‌​​‌​‌‍​​‌​‌‌‌‌‍​‌​​​​‌‌‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌​‌‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌​‌​‌‌‌‍​‌‌‌​​‌​‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌‌‍​​‌​​​‌​‍​​‌​‌‌​​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​​​​‌‍​‌‌‌​‌​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌​‌‌‌‌‍​‌‌‌​​‌​‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌​​​‌​​‍​‌‌​‌​​‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​​​​‌‍​‌‌​‌‌​​‍​​‌​​​​​‍​‌​‌​​‌‌‍​‌‌​‌​​‌‍​‌‌​​‌‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌‌​‌​​‍​‌‌‌​‌​‌‍​‌‌‌​​‌​‍​‌‌​​‌​‌‍​​‌​​​‌​‍​​‌​‌‌​​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​‌‌‌​‍​‌‌​‌‌‌‌‍​‌‌‌​‌​​‍​‌‌​​‌​‌‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌​‌‌​‌‌‍​‌​‌​​‌‌‍​‌​‌‌​​‌‍​‌​‌​​‌‌‍​‌​‌​‌​​‍​‌​​​‌​‌‍​‌​​‌‌​‌‍​​‌‌‌​‌​‍​​‌​​​​​‍​‌​​‌​​‌‍​‌‌​​‌‌​‍​​‌​​​​​‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌‌​​‌‌‍​​‌​​​​​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​​‌​​‍​‌‌​​‌​‌‍​​‌​​​​​‍​‌‌​‌​​‌‍​‌‌‌​​‌‌‍​​‌​​​​​‍​‌‌​​​​‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌‌​​‍​‌‌‌‌​​‌‍​‌‌‌‌​‌​‍​‌‌​​‌​‌‍​‌‌​​‌​​‍​​‌​‌‌​​‍​​‌​​​​​‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌‌​​‌​‌‍​​‌​​​​​‍​‌‌​‌​​​‍​‌‌‌​‌​​‍​‌‌‌​‌​​‍​‌‌‌​​​​‍​‌‌‌​​‌‌‍​​‌‌‌​‌​‍​​‌​‌‌‌‌‍​​‌​‌‌‌‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌‌​‌​‌‍​‌‌​​​‌​‍​​‌​‌‌‌​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​‌‌​‌‍​​‌​‌‌‌‌‍​‌‌‌​​‌‌‍​‌‌​​​‌‌‍​‌‌‌​​‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌​‌‌‍​‌‌​​‌​‌‍​​‌​‌‌‌‌‍​‌​​​​‌‌‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌​‌‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌​‌​‌‌‌‍​‌‌‌​​‌​‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌‌‍​​‌​​​​​‍​‌‌​​‌‌​‍​‌‌​‌‌‌‌‍​‌‌‌​​‌​‍​​‌​​​​​‍​‌‌‌​​​​‍​‌‌‌​​‌​‍​‌‌​‌‌‌‌‍​‌‌​‌​‌​‍​‌‌​​‌​‌‍​‌‌​​​‌‌‍​‌‌‌​‌​​‍​​‌​​​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌​‍​‌‌​‌‌‌‌‍​​‌​‌‌‌​‍​‌​‌‌‌​‌‍​​‌​​​‌​‍​‌‌‌‌‌​‌‍​‌‌‌‌‌​​‍​‌​‌​​‌‌‍​‌​​‌​​‌‍​‌​​​‌‌‌‍​​‌‌‌​‌​‍​‌​​​​‌‌‍​‌​​​​‌​‍​‌‌​​‌​‌‍​‌‌​​‌​‌‍​‌‌‌​‌​​‍​‌​​‌‌​‌‍​‌‌​‌‌​​‍​‌‌‌​​‌‌‍​​‌‌​​‌​‍​‌‌‌‌​​​‍​‌‌​‌‌‌​‍​​‌​‌‌‌‌‍​‌​‌‌​‌​‍​‌​​‌‌‌‌‍​‌‌​‌‌​‌‍​‌‌‌​‌​​‍​‌‌‌‌​​‌‍​‌​​‌‌‌‌‍​‌​‌‌​‌​‍​‌‌​‌​​​‍​‌​​‌​‌‌‍​‌​​​​‌‌‍​‌‌​‌​‌‌‍​‌‌‌​‌​​‍​‌​‌​​​​‍​‌‌​‌‌​​‍​‌​​‌‌‌​‍​​‌‌‌​​‌‍​‌‌‌​‌​​‍​‌​‌​‌‌​‍​‌​‌​‌‌​‍​​‌‌​‌​​‍​‌‌‌​‌‌​‍​​‌‌​​‌‌‍​‌​‌​‌​‌‍​‌​​​​​‌‍​​‌‌‌​​​‍​‌‌‌​​​‌‍​‌​​‌​​‌‍​‌‌‌​‌‌‌‍​‌​‌​‌‌‌‍​​‌‌​​​​‍​‌‌‌‌​‌​‍​‌‌​‌​‌‌‍​‌‌​​​​‌‍​‌‌​‌‌​‌‍​​‌‌​​​‌‍​‌‌‌​‌‌​‍​‌‌‌​​​‌‍​‌​​​​​‌‍​‌​​‌​​‌‍​‌‌​‌​​‌‍​‌​​‌​​​‍​‌​​​​‌​‍​‌​‌‌​‌​‍​‌‌‌‌​​​‍​‌​​​​‌​‍​‌​‌‌​‌​‍​‌​‌​​‌​‍​‌​‌​​‌‌‍​‌​​‌​‌‌‍​​‌‌​‌‌​‍​‌​​‌‌‌​‍​‌​​​‌‌​‍​‌​​‌​‌​‍​‌​‌‌​​‌‍​‌‌‌​​‌​‍​‌​​‌‌​​‍​‌​​‌​​​‍​‌‌‌​​‌​‍​​‌‌​​​‌‍​​‌‌‌​​‌‍​​‌‌​​‌‌‍​‌​​‌​‌​‍​‌​‌​​‌​‍​‌‌‌‌​​‌‍​‌​‌‌​​‌‍​‌‌​‌‌‌​‍​​‌‌​‌​‌‍​‌‌​‌‌‌​‍​‌‌‌​​‌​‍​‌​​​​​‌‍​​‌​‌​‌‌‍​‌​​​​‌​‍​‌​​​‌​​‍​‌‌‌​‌‌‌‍​​‌‌‌‌​‌‍​​‌‌‌‌​‌‍]
    SIGNATURE_END */
