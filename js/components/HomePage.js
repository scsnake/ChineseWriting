// Home Page Component
const HomePage = {
    name: 'HomePage',
    template: `
        <div>
            <div class="header">
                <h1>國字注音練習</h1>
            </div>
            
            <div class="content">
                <lesson-selector v-model="selectedLessons"></lesson-selector>
                
                <div class="test-config">
                    <div class="config-row">
                        <label class="config-label">📝 題數</label>
                        <input 
                            v-model.number="testCount" 
                            type="number" 
                            min="1" 
                            max="50"
                            class="config-input"
                            placeholder="輸入題數"
                        />
                    </div>
                    
                    <div class="config-row">
                        <label class="config-label">✍️ 測驗類型</label>
                        <div class="radio-group">
                            <div class="radio-item">
                                <input 
                                    type="radio" 
                                    id="type-char" 
                                    value="char" 
                                    v-model="testType"
                                />
                                <label for="type-char">看注音寫國字</label>
                            </div>
                            <div class="radio-item">
                                <input 
                                    type="radio" 
                                    id="type-zhuyin" 
                                    value="zhuyin" 
                                    v-model="testType"
                                />
                                <label for="type-zhuyin">看國字寫注音</label>
                            </div>
                            <div class="radio-item">
                                <input 
                                    type="radio" 
                                    id="type-mixed" 
                                    value="mixed" 
                                    v-model="testType"
                                />
                                <label for="type-mixed">混合題型</label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <button 
                    @click="startTest" 
                    :disabled="!canStartTest"
                    class="btn btn-primary btn-large"
                >
                    開始測驗
                </button>
                
                <button 
                    @click="goToReview" 
                    class="btn btn-secondary btn-large mt-20"
                >
                    查看歷史紀錄
                </button>
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
            testType: 'mixed'
        };
    },
    computed: {
        canStartTest() {
            return this.selectedLessons.length > 0 && this.testCount > 0;
        }
    },
    methods: {
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

        goToReview() {
            this.$router.push({ name: 'review' });
        }
    }
};

// Make it globally available
window.HomePage = HomePage;
