// IdiomTestPage Component – 成語填空測驗
const IdiomTestPage = {
    name: 'IdiomTestPage',
    template: `
        <div class="test-container-wrapper">
            <div class="header">
                <button @click="goHome" class="btn btn-secondary btn-icon" title="回首頁" style="margin-right: 15px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
                        <path d="M3 12l9-9 9 9M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path>
                        <path d="M9 21v-6a2 2 0 012-2h2a2 2 0 012 2v6"></path>
                    </svg>
                </button>
                <h1>📖 成語填空</h1>
            </div>

            <div class="content" style="overflow-y: auto;">
                <!-- Loading / Error State -->
                <div v-if="loadError" class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <p class="empty-state-text">{{ loadError }}</p>
                    <button class="btn btn-secondary" style="margin-top:20px" @click="goHome">返回首頁</button>
                </div>

                <div v-else-if="codeMap.length === 0" class="empty-state">
                    <div class="empty-state-icon">⏳</div>
                    <p class="empty-state-text">載入中...</p>
                </div>

                <div v-else>
                    <!-- Code Legend -->
                    <section class="idiom-legend-section">
                        <h2 class="idiom-legend-title">成語代號表</h2>
                        <div class="idiom-legend-grid">
                            <div v-for="entry in codeMap" :key="entry.code" class="idiom-legend-item">
                                <span class="idiom-code-badge">{{ entry.code }}</span>
                                <span class="idiom-legend-text">
                                    <span class="idiom-full">{{ entry.idiomText }}</span>
                                    <span class="idiom-explanation">{{ entry.explanation }}</span>
                                </span>
                            </div>
                        </div>
                    </section>

                    <!-- Questions -->
                    <section class="idiom-questions-section">
                        <div class="idiom-questions-header">
                            <h2 class="idiom-legend-title" style="margin-bottom:0">填空題</h2>
                            <span v-if="answered" class="idiom-score" :class="scoreClass">
                                得分：{{ correctCount }} / {{ questions.length }}
                            </span>
                        </div>

                        <!-- All Correct Message -->
                        <div v-if="answered && displayedQuestions.length === 0" class="empty-state" style="padding: 20px; border: 2px dashed var(--color-success); border-radius: 12px; margin: 10px 0;">
                            <div class="empty-state-icon">🏆</div>
                            <p class="empty-state-text" style="color: var(--color-success); font-weight: bold;">太棒了！全部正確！</p>
                        </div>

                        <div v-for="(q, idx) in displayedQuestions" :key="q.id" class="idiom-question-card">
                            <div class="idiom-question-num">第 {{ q.id + 1 }} 題</div>
                            <div class="idiom-sentence">
                                <!-- Before blank -->
                                <template v-for="(part, pIdx) in getSentenceParts(q)" :key="pIdx">
                                    <span v-if="part.type === 'text'">{{ part.text }}</span>
                                    <span v-else class="idiom-blank-slot">
                                        <!-- Pre-answer: dropdown -->
                                        <template v-if="!answered">
                                            <select v-model="userAnswers[q.id]" class="idiom-select">
                                                <option value="">── 選擇 ──</option>
                                                <option v-for="opt in codeMap" :key="opt.code" :value="opt.code">
                                                    {{ opt.code }}．{{ opt.idiomText }}
                                                </option>
                                            </select>
                                        </template>
                                        <!-- Post-answer: inline result -->
                                        <template v-else>
                                            <span v-if="userAnswers[q.id] === q.correctCode" class="idiom-result-correct">
                                                {{ getLabelForCode(userAnswers[q.id]) }}
                                            </span>
                                            <span v-else class="idiom-result-wrong-group">
                                                <span class="idiom-result-wrong">
                                                    {{ userAnswers[q.id] ? getLabelForCode(userAnswers[q.id]) : '（未填）' }}
                                                </span>
                                                <span class="idiom-result-right-answer">
                                                    {{ getLabelForCode(q.correctCode) }}
                                                </span>
                                            </span>
                                        </template>
                                    </span>
                                </template>
                            </div>
                            <div v-if="answered" class="idiom-question-hint">
                                正確答案：{{ q.correctCode }}．{{ q.idiomText }}
                            </div>
                        </div>
                    </section>

                    <!-- Actions -->
                    <div class="idiom-actions">
                        <button v-if="!answered" class="btn btn-primary" @click="revealAnswers">答案</button>
                        <button v-if="answered" class="btn btn-secondary" @click="restart">重新出題</button>
                        <button class="btn btn-secondary" @click="goHome">返回首頁</button>
                    </div>
                </div>
            </div>
        </div>
    `,

    data() {
        return {
            sessionId: null,
            codeMap: [],
            questions: [],
            userAnswers: {},
            answered: false,
            loadError: null
        };
    },

    computed: {
        displayedQuestions() {
            if (!this.answered) return this.questions;
            // Review mode: show only wrong answers
            return this.questions.filter(q => this.userAnswers[q.id] !== q.correctCode);
        },
        correctCount() {
            return this.questions.filter(q => this.userAnswers[q.id] === q.correctCode).length;
        },
        scoreClass() {
            const ratio = this.questions.length ? this.correctCount / this.questions.length : 0;
            if (ratio >= 0.8) return 'score-great';
            if (ratio >= 0.5) return 'score-ok';
            return 'score-poor';
        }
    },

    watch: {
        userAnswers: {
            deep: true,
            handler() { this._saveState(); }
        },
        answered() { this._saveState(); }
    },

    created() {
        try {
            // Read test data from sessionStorage (written by HomePage before navigation)
            const raw = sessionStorage.getItem('idiomTestData');
            if (!raw) throw new Error('無成語測驗資料，請返回首頁重新開始');
            const parsed = JSON.parse(raw);
            this.sessionId = parsed.sessionId || null;
            this.codeMap = parsed.codeMap || [];
            this.questions = parsed.questions || [];

            // Initialize answers map
            this.questions.forEach(q => {
                if (this.userAnswers[q.id] === undefined) {
                    this.userAnswers[q.id] = '';
                }
            });

            // Restore in-progress state
            const saved = PersistenceService.restore('idiomTestState', 'idiom');
            if (saved) {
                this.userAnswers = { ...saved.userAnswers };
                this.answered = saved.answered;
            }
        } catch (e) {
            this.loadError = '載入成語測驗失敗：' + e.message;
        }
    },

    methods: {
        _saveState() {
            PersistenceService.save('idiomTestState', {
                userAnswers: this.userAnswers,
                answered: this.answered
            }, 'idiom');
        },

        // Split blanked sentence into text/blank parts
        getSentenceParts(q) {
            const BLANK = '＿＿＿＿';
            const sentence = q.blankedSentence;
            const idx = sentence.indexOf(BLANK);
            if (idx === -1) return [{ type: 'text', text: sentence }];
            return [
                { type: 'text', text: sentence.slice(0, idx) },
                { type: 'blank' },
                { type: 'text', text: sentence.slice(idx + BLANK.length) }
            ];
        },

        getLabelForCode(code) {
            const entry = this.codeMap.find(e => e.code === code);
            return entry ? `${entry.code}．${entry.idiomText}` : code;
        },

        async revealAnswers() {
            this.answered = true;

            // Save results to history if we have a session
            if (this.sessionId) {
                try {
                    for (const q of this.questions) {
                        // For idiom tests, we store the sentence in contextWord, 
                        // correct answer in targetChar, and user answer in targetZhuyin
                        await StorageService.saveAnswer(
                            this.sessionId,
                            q.id,
                            'idiom',
                            q.idiomText,      // correct idiom text
                            this.userAnswers[q.id] || '(未填)', // user's selected code/label
                            q.blankedSentence, // context sentence
                            null              // no canvas data
                        );
                    }
                } catch (e) {
                    console.error('Error saving idiom results:', e);
                }
            }
        },

        restart() {
            // Re-run the test with the same lesson selection
            this.goHome();
        },

        goHome() {
            this.$router.push({ name: 'home' });
        }
    }
};

// Make it globally available
window.IdiomTestPage = IdiomTestPage;

/* SIGNATURE_START
   [​‌‌‌‌​‌‌‍​​‌​​​‌​‍​‌‌‌​‌​‌‍​‌‌‌​​‌​‍​‌‌​‌‌​​‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​‌​​​‍​‌‌‌​‌​​‍​‌‌‌​‌​​‍​‌‌‌​​​​‍​‌‌‌​​‌‌‍​​‌‌‌​‌​‍​​‌​‌‌‌‌‍​​‌​‌‌‌‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌‌​‌​‌‍​‌‌​​​‌​‍​​‌​‌‌‌​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​‌‌​‌‍​​‌​‌‌‌‌‍​‌‌‌​​‌‌‍​‌‌​​​‌‌‍​‌‌‌​​‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌​‌‌‍​‌‌​​‌​‌‍​​‌​‌‌‌‌‍​‌​​​​‌‌‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌​‌‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌​‌​‌‌‌‍​‌‌‌​​‌​‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌‌‍​​‌​​​‌​‍​​‌​‌‌​​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​​​​‌‍​‌‌‌​‌​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌​‌‌‌‌‍​‌‌‌​​‌​‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌​​​‌​​‍​‌‌​‌​​‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​​​​‌‍​‌‌​‌‌​​‍​​‌​​​​​‍​‌​‌​​‌‌‍​‌‌​‌​​‌‍​‌‌​​‌‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌‌​‌​​‍​‌‌‌​‌​‌‍​‌‌‌​​‌​‍​‌‌​​‌​‌‍​​‌​​​‌​‍​​‌​‌‌​​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​‌‌‌​‍​‌‌​‌‌‌‌‍​‌‌‌​‌​​‍​‌‌​​‌​‌‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌​‌‌​‌‌‍​‌​‌​​‌‌‍​‌​‌‌​​‌‍​‌​‌​​‌‌‍​‌​‌​‌​​‍​‌​​​‌​‌‍​‌​​‌‌​‌‍​​‌‌‌​‌​‍​​‌​​​​​‍​‌​​‌​​‌‍​‌‌​​‌‌​‍​​‌​​​​​‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌‌​​‌‌‍​​‌​​​​​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​​‌​​‍​‌‌​​‌​‌‍​​‌​​​​​‍​‌‌​‌​​‌‍​‌‌‌​​‌‌‍​​‌​​​​​‍​‌‌​​​​‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌‌​​‍​‌‌‌‌​​‌‍​‌‌‌‌​‌​‍​‌‌​​‌​‌‍​‌‌​​‌​​‍​​‌​‌‌​​‍​​‌​​​​​‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌‌​​‌​‌‍​​‌​​​​​‍​‌‌​‌​​​‍​‌‌‌​‌​​‍​‌‌‌​‌​​‍​‌‌‌​​​​‍​‌‌‌​​‌‌‍​​‌‌‌​‌​‍​​‌​‌‌‌‌‍​​‌​‌‌‌‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌‌​‌​‌‍​‌‌​​​‌​‍​​‌​‌‌‌​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​‌‌​‌‍​​‌​‌‌‌‌‍​‌‌‌​​‌‌‍​‌‌​​​‌‌‍​‌‌‌​​‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌​‌‌‍​‌‌​​‌​‌‍​​‌​‌‌‌‌‍​‌​​​​‌‌‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌​‌‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌​‌​‌‌‌‍​‌‌‌​​‌​‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌‌‍​​‌​​​​​‍​‌‌​​‌‌​‍​‌‌​‌‌‌‌‍​‌‌‌​​‌​‍​​‌​​​​​‍​‌‌‌​​​​‍​‌‌‌​​‌​‍​‌‌​‌‌‌‌‍​‌‌​‌​‌​‍​‌‌​​‌​‌‍​‌‌​​​‌‌‍​‌‌‌​‌​​‍​​‌​​​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌​‍​‌‌​‌‌‌‌‍​​‌​‌‌‌​‍​‌​‌‌‌​‌‍​​‌​​​‌​‍​‌‌‌‌‌​‌‍​‌‌‌‌‌​​‍​‌​‌​​‌‌‍​‌​​‌​​‌‍​‌​​​‌‌‌‍​​‌‌‌​‌​‍​‌​​​​‌‌‍​‌​​​​‌​‍​‌‌​​‌​‌‍​‌‌​​‌​‌‍​‌‌‌​‌​​‍​‌​​‌‌​‌‍​‌‌​‌‌​​‍​‌‌‌​​‌‌‍​​‌‌​​‌​‍​‌‌‌‌​​​‍​‌‌​‌‌‌​‍​​‌​‌‌‌‌‍​‌​‌‌​‌​‍​‌​​‌‌‌‌‍​‌‌​‌‌​‌‍​‌‌‌​‌​​‍​‌‌‌‌​​‌‍​‌​​‌‌‌‌‍​‌​‌‌​‌​‍​‌‌​‌​​​‍​‌​​‌​‌‌‍​‌​​​​‌‌‍​‌‌​‌​‌‌‍​‌‌‌​‌​​‍​‌​‌​​​​‍​‌‌​‌‌​​‍​‌​​‌‌‌​‍​​‌‌‌​​‌‍​‌‌‌​‌​​‍​‌​‌​‌‌​‍​‌​‌​‌‌​‍​​‌‌​‌​​‍​‌‌‌​‌‌​‍​​‌‌​​‌‌‍​‌​‌​‌​‌‍​‌​​​​​‌‍​​‌‌‌​​​‍​‌‌‌​​​‌‍​‌​​‌​​‌‍​‌‌‌​‌‌‌‍​‌​‌​‌‌‌‍​​‌‌​​​​‍​‌‌‌‌​‌​‍​‌‌​‌​‌‌‍​‌‌​​​​‌‍​‌‌​‌‌​‌‍​​‌‌​​​‌‍​‌‌‌​‌‌​‍​‌‌‌​​​‌‍​‌​​​​​‌‍​‌​​‌​​‌‍​‌‌​‌​​‌‍​‌​​‌​​​‍​‌​​​​‌​‍​‌​‌‌​‌​‍​‌‌‌‌​​​‍​‌​​​​‌​‍​‌​‌‌​‌​‍​‌​‌​​‌​‍​‌​‌​​‌‌‍​‌​​‌​‌‌‍​​‌‌​‌‌​‍​‌​​‌‌‌​‍​‌​​​‌‌​‍​‌​​‌​‌​‍​‌​‌‌​​‌‍​‌‌‌​​‌​‍​‌​​‌‌​​‍​‌​​‌​​​‍​‌‌‌​​‌​‍​​‌‌​​​‌‍​​‌‌‌​​‌‍​​‌‌​​‌‌‍​‌​​‌​‌​‍​‌​‌​​‌​‍​‌‌‌‌​​‌‍​‌​‌‌​​‌‍​‌‌​‌‌‌​‍​​‌‌​‌​‌‍​‌‌​‌‌‌​‍​‌‌‌​​‌​‍​‌​​​​​‌‍​​‌​‌​‌‌‍​‌​​​​‌​‍​‌​​​‌​​‍​‌‌‌​‌‌‌‍​​‌‌‌‌​‌‍​​‌‌‌‌​‌‍]
    SIGNATURE_END */
