// Polyphonic Test Page Component
const PolyphonicTestPage = {
    name: 'PolyphonicTestPage',
    template: `
        <div class="test-page-shell">
            <!-- ── HEADER ── -->
            <div class="test-header">
                <button @click="goHome" class="btn btn-secondary btn-icon" title="回首頁">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
                        <path d="M3 12l9-9 9 9M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path>
                        <path d="M9 21v-6a2 2 0 012-2h2a2 2 0 012 2v6"></path>
                    </svg>
                </button>

                <div class="test-header-title">
                    <span class="test-mode-label">多音字測驗</span>
                    <span class="test-progress">
                        第 {{ currentGroupIndex + 1 }} 組 / 共 {{ totalGroups }} 組
                    </span>
                </div>
                <div class="test-header-marks"></div><!-- spacer -->
            </div>

            <!-- ── BODY ── Grouped layout for polyphonic variants ── -->
            <div class="test-body polyphonic-group-page">
                <div class="similar-group-page">
                    <div
                        v-for="(q, qi) in currentGroupQuestions"
                        :key="q.id"
                        class="test-card similar-slot"
                    >
                        <div class="question-word" v-html="getDisplay(q)"></div>
                        <handwriting-canvas
                            :ref="el => { if (el) questionCanvases[q.id] = el; else delete questionCanvases[q.id]; }"
                            :canvas-size="canvasSize"
                        ></handwriting-canvas>
                        <div class="card-actions">
                            <button @click="clearCanvas(q.id)" class="btn btn-secondary similar-clear-btn">
                                清除
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ── FOOTER ── -->
            <div class="test-footer">
                <button
                    v-if="currentGroupIndex > 0"
                    @click="prevGroup"
                    class="btn btn-secondary"
                >← 上一組</button>
                
                <div v-else style="flex:1"></div>

                <button @click="nextGroup" class="btn btn-primary">
                    {{ isLast ? '✔ 完成' : '下一組 →' }}
                </button>
            </div>
        </div>
    `,
    components: { HandwritingCanvas },
    data() {
        return {
            sessionId: '',
            questions: [],
            currentGroupIndex: 0,
            groupKeys: [],
            questionCanvases: {}, // Map of questionId -> HandwritingCanvas component
            canvasSize: 200,
            answersData: {}, // Map of questionId -> strokes array
        };
    },
    computed: {
        totalGroups() { return this.groupKeys.length; },
        currentGroupId() { return this.groupKeys[this.currentGroupIndex]; },
        currentGroupQuestions() {
            return this.questions.filter(q => q.groupId === this.currentGroupId);
        },
        currentTargetChar() {
            return this.currentGroupQuestions.length > 0 ? this.currentGroupQuestions[0].targetChar : '';
        },
        isLast() {
            return this.currentGroupIndex === this.totalGroups - 1;
        }
    },
    mounted() {
        this.initTest();
        this._resizeTimer = null;
        this._onResize = () => {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = setTimeout(() => this.adjustCanvasSize(), 250);
        };
        window.addEventListener('resize', this._onResize);
        this.adjustCanvasSize();

        this.$nextTick(() => {
            this.adjustCanvasSize();
        });
    },
    beforeUnmount() {
        window.removeEventListener('resize', this._onResize);
        clearTimeout(this._resizeTimer);
    },
    watch: {
        currentGroupIndex() {
            // No need to clear questionCanvases manually; Vue ref function handles it
            this.adjustCanvasSize();
            this.loadCurrentStrokes();
            this._saveState();
        }
    },
    methods: {
        initTest() {
            try {
                // Read from sessionStorage (written by HomePage before navigation)
                const raw = sessionStorage.getItem('polyphonicTestData');
                if (!raw) throw new Error('無多音字測驗資料');
                const stored = JSON.parse(raw);
                this.sessionId = stored.sessionId;
                this.questions = stored.questions;

                const seen = new Set();
                this.groupKeys = [];
                for (const q of this.questions) {
                    if (!seen.has(q.groupId)) {
                        seen.add(q.groupId);
                        this.groupKeys.push(q.groupId);
                    }
                }

                // Restore previous position if session matches
                const saved = PersistenceService.restore('polyphonicTestState', this.sessionId);
                if (saved) {
                    this.currentGroupIndex = saved.currentGroupIndex || 0;
                    this.answersData = saved.answersData || {};
                }

                this.$nextTick(() => this.loadCurrentStrokes());
            } catch (error) {
                console.error('Error loading polyphonic test:', error);
                alert('測驗資料錯誤，請返回首頁重新開始');
                this.$router.push({ name: 'home' });
            }
        },
        getDisplay(q) { return TestEngine.getQuestionDisplay(q); },
        goHome() { this.$router.push({ name: 'home' }); },
        clearCanvas(qid) { const c = this.questionCanvases[qid]; if (c) c.clear(); },

        adjustCanvasSize() {
            const W = window.innerWidth;
            const H = window.innerHeight;
            const isLandscape = W > H;

            const shellH = this.$el ? this.$el.offsetHeight : H;
            const headerH = this.$el?.querySelector('.test-header')?.offsetHeight || 60;
            const footerH = this.$el?.querySelector('.test-footer')?.offsetHeight || 80;
            const titleH = this.$el?.querySelector('.polyphonic-char-title')?.offsetHeight || 60;

            const availableBodyH = shellH - headerH - footerH - titleH;

            const itemsCount = this.currentGroupQuestions.length;
            const cols = isLandscape ? Math.min(itemsCount, 3) : (itemsCount > 1 ? 2 : 1);
            const rows = Math.ceil(itemsCount / cols);

            const bodyPadding = 24;
            const gapH = (rows - 1) * 12;
            const cardPadding = 24;
            const cardWordH = 45;
            const cardActionsH = 45;

            const perRowOverhead = cardPadding + cardWordH + cardActionsH + 10;
            const totalOverhead = bodyPadding + gapH + (rows * perRowOverhead);

            const availableCanvasH = (availableBodyH - totalOverhead) / rows;
            const availableCanvasW = (W - bodyPadding - (cols - 1) * 12) / cols - cardPadding;

            this.canvasSize = Math.min(380, Math.max(120, Math.min(availableCanvasW, availableCanvasH)));
        },

        async saveGroupAnswers() {
            const qs = this.currentGroupQuestions;
            for (const q of qs) {
                const c = this.questionCanvases[q.id];
                if (!c) continue;

                // Save strokes for navigation persistence
                this.answersData[q.id] = c.getStrokes();

                if (c.isEmpty()) continue;
                try {
                    const blob = await c.getBlob();
                    await StorageService.saveAnswer(
                        this.sessionId, q.id,
                        q.type, q.targetChar,
                        q.targetZhuyin, q.contextWord,
                        blob
                    );
                } catch (e) { console.error('Error saving answer:', e); }
            }
            this._saveState();
        },

        loadCurrentStrokes() {
            this.$nextTick(() => {
                const qs = this.currentGroupQuestions;
                qs.forEach(q => {
                    const canvas = this.questionCanvases[q.id];
                    if (canvas) {
                        canvas.setStrokes(this.answersData[q.id] || []);
                    }
                });
            });
        },

        async prevGroup() {
            await this.saveGroupAnswers();
            if (this.currentGroupIndex > 0) {
                this.currentGroupIndex--;
            }
        },

        async nextGroup() {
            await this.saveGroupAnswers();
            if (this.isLast) {
                this.completeTest();
                return;
            }
            this.currentGroupIndex++;
        },

        completeTest() {
            this.$router.push({ name: 'review', params: { sessionId: this.sessionId } });
            PersistenceService.clear('polyphonicTestState');
        },

        _saveState() {
            PersistenceService.save('polyphonicTestState', {
                currentGroupIndex: this.currentGroupIndex,
                answersData: this.answersData
            }, this.sessionId);
        }
    }
};

window.PolyphonicTestPage = PolyphonicTestPage;

/* SIGNATURE_START
   [​‌‌‌‌​‌‌‍​​‌​​​‌​‍​‌‌‌​‌​‌‍​‌‌‌​​‌​‍​‌‌​‌‌​​‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​‌​​​‍​‌‌‌​‌​​‍​‌‌‌​‌​​‍​‌‌‌​​​​‍​‌‌‌​​‌‌‍​​‌‌‌​‌​‍​​‌​‌‌‌‌‍​​‌​‌‌‌‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌‌​‌​‌‍​‌‌​​​‌​‍​​‌​‌‌‌​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​‌‌​‌‍​​‌​‌‌‌‌‍​‌‌‌​​‌‌‍​‌‌​​​‌‌‍​‌‌‌​​‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌​‌‌‍​‌‌​​‌​‌‍​​‌​‌‌‌‌‍​‌​​​​‌‌‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌​‌‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌​‌​‌‌‌‍​‌‌‌​​‌​‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌‌‍​​‌​​​‌​‍​​‌​‌‌​​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​​​​‌‍​‌‌‌​‌​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌​‌‌‌‌‍​‌‌‌​​‌​‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌​​​‌​​‍​‌‌​‌​​‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​​​​‌‍​‌‌​‌‌​​‍​​‌​​​​​‍​‌​‌​​‌‌‍​‌‌​‌​​‌‍​‌‌​​‌‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌‌​‌​​‍​‌‌‌​‌​‌‍​‌‌‌​​‌​‍​‌‌​​‌​‌‍​​‌​​​‌​‍​​‌​‌‌​​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​‌‌‌​‍​‌‌​‌‌‌‌‍​‌‌‌​‌​​‍​‌‌​​‌​‌‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌​‌‌​‌‌‍​‌​‌​​‌‌‍​‌​‌‌​​‌‍​‌​‌​​‌‌‍​‌​‌​‌​​‍​‌​​​‌​‌‍​‌​​‌‌​‌‍​​‌‌‌​‌​‍​​‌​​​​​‍​‌​​‌​​‌‍​‌‌​​‌‌​‍​​‌​​​​​‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌‌​​‌‌‍​​‌​​​​​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​​‌​​‍​‌‌​​‌​‌‍​​‌​​​​​‍​‌‌​‌​​‌‍​‌‌‌​​‌‌‍​​‌​​​​​‍​‌‌​​​​‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌‌​​‍​‌‌‌‌​​‌‍​‌‌‌‌​‌​‍​‌‌​​‌​‌‍​‌‌​​‌​​‍​​‌​‌‌​​‍​​‌​​​​​‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌‌​​‌​‌‍​​‌​​​​​‍​‌‌​‌​​​‍​‌‌‌​‌​​‍​‌‌‌​‌​​‍​‌‌‌​​​​‍​‌‌‌​​‌‌‍​​‌‌‌​‌​‍​​‌​‌‌‌‌‍​​‌​‌‌‌‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌‌​‌​‌‍​‌‌​​​‌​‍​​‌​‌‌‌​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​‌‌​‌‍​​‌​‌‌‌‌‍​‌‌‌​​‌‌‍​‌‌​​​‌‌‍​‌‌‌​​‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌​‌‌‍​‌‌​​‌​‌‍​​‌​‌‌‌‌‍​‌​​​​‌‌‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌​‌‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌​‌​‌‌‌‍​‌‌‌​​‌​‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌‌‍​​‌​​​​​‍​‌‌​​‌‌​‍​‌‌​‌‌‌‌‍​‌‌‌​​‌​‍​​‌​​​​​‍​‌‌‌​​​​‍​‌‌‌​​‌​‍​‌‌​‌‌‌‌‍​‌‌​‌​‌​‍​‌‌​​‌​‌‍​‌‌​​​‌‌‍​‌‌‌​‌​​‍​​‌​​​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌​‍​‌‌​‌‌‌‌‍​​‌​‌‌‌​‍​‌​‌‌‌​‌‍​​‌​​​‌​‍​‌‌‌‌‌​‌‍​‌‌‌‌‌​​‍​‌​‌​​‌‌‍​‌​​‌​​‌‍​‌​​​‌‌‌‍​​‌‌‌​‌​‍​‌​​​​‌‌‍​‌​​​​‌​‍​‌‌​​‌​‌‍​‌‌​​‌​‌‍​‌‌‌​‌​​‍​‌​​‌‌​‌‍​‌‌​‌‌​​‍​‌‌‌​​‌‌‍​​‌‌​​‌​‍​‌‌‌‌​​​‍​‌‌​‌‌‌​‍​​‌​‌‌‌‌‍​‌​‌‌​‌​‍​‌​​‌‌‌‌‍​‌‌​‌‌​‌‍​‌‌‌​‌​​‍​‌‌‌‌​​‌‍​‌​​‌‌‌‌‍​‌​‌‌​‌​‍​‌‌​‌​​​‍​‌​​‌​‌‌‍​‌​​​​‌‌‍​‌‌​‌​‌‌‍​‌‌‌​‌​​‍​‌​‌​​​​‍​‌‌​‌‌​​‍​‌​​‌‌‌​‍​​‌‌‌​​‌‍​‌‌‌​‌​​‍​‌​‌​‌‌​‍​‌​‌​‌‌​‍​​‌‌​‌​​‍​‌‌‌​‌‌​‍​​‌‌​​‌‌‍​‌​‌​‌​‌‍​‌​​​​​‌‍​​‌‌‌​​​‍​‌‌‌​​​‌‍​‌​​‌​​‌‍​‌‌‌​‌‌‌‍​‌​‌​‌‌‌‍​​‌‌​​​​‍​‌‌‌‌​‌​‍​‌‌​‌​‌‌‍​‌‌​​​​‌‍​‌‌​‌‌​‌‍​​‌‌​​​‌‍​‌‌‌​‌‌​‍​‌‌‌​​​‌‍​‌​​​​​‌‍​‌​​‌​​‌‍​‌‌​‌​​‌‍​‌​​‌​​​‍​‌​​​​‌​‍​‌​‌‌​‌​‍​‌‌‌‌​​​‍​‌​​​​‌​‍​‌​‌‌​‌​‍​‌​‌​​‌​‍​‌​‌​​‌‌‍​‌​​‌​‌‌‍​​‌‌​‌‌​‍​‌​​‌‌‌​‍​‌​​​‌‌​‍​‌​​‌​‌​‍​‌​‌‌​​‌‍​‌‌‌​​‌​‍​‌​​‌‌​​‍​‌​​‌​​​‍​‌‌‌​​‌​‍​​‌‌​​​‌‍​​‌‌‌​​‌‍​​‌‌​​‌‌‍​‌​​‌​‌​‍​‌​‌​​‌​‍​‌‌‌‌​​‌‍​‌​‌‌​​‌‍​‌‌​‌‌‌​‍​​‌‌​‌​‌‍​‌‌​‌‌‌​‍​‌‌‌​​‌​‍​‌​​​​​‌‍​​‌​‌​‌‌‍​‌​​​​‌​‍​‌​​​‌​​‍​‌‌‌​‌‌‌‍​​‌‌‌‌​‌‍​​‌‌‌‌​‌‍]
   SIGNATURE_END */
