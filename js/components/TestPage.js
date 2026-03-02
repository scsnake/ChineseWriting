// Test Page Component
// ─────────────────────────────────────────────
// Template structure (reuse for all future question types):
//   ┌─ .test-page-shell ────────────────────────┐
//   │  .test-header   (home btn | title | marks) │
//   │  .test-body     (mode-specific content)    │
//   │  .test-footer   (prev | clear | next btn)  │
//   └───────────────────────────────────────────┘
// ─────────────────────────────────────────────
const TestPage = {
    name: 'TestPage',
    template: `
        <div class="test-page-shell">

            <!-- ── HEADER ── shared across all question types ── -->
            <div class="test-header">
                <button @click="goHome" class="btn btn-secondary btn-icon" title="回首頁">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
                        <path d="M3 12l9-9 9 9M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path>
                        <path d="M9 21v-6a2 2 0 012-2h2a2 2 0 012 2v6"></path>
                    </svg>
                </button>

                <div class="test-header-title">
                    <span class="test-mode-label">{{ modeLabel }}</span>
                    <span class="test-progress">
                        <span v-if="isSimilarMode">第 {{ currentGroupIndex + 1 }} 組 / 共 {{ totalGroups }} 組</span>
                        <span v-else>第 {{ currentIndex + 1 }} 題 / 共 {{ questions.length }} 題</span>
                    </span>
                </div>

                <!-- Per-question mark buttons (vocab only) -->
                <div class="test-header-marks" v-if="!isSimilarMode">
                    <button class="btn-star" @click="toggleStar" :class="{ active: isStarred }">
                        {{ isStarred ? '★' : '☆' }}
                    </button>
                    <button class="btn-star btn-question" @click="toggleQuestionable" :class="{ active: isQuestionable }">
                        ?
                    </button>
                </div>
                <div v-else class="test-header-marks"></div><!-- spacer -->
            </div>

            <!-- ── BODY ── swap by questionMode ── -->

            <div v-if="isSimilarMode" class="test-body similar-group-page">
                <div
                    v-for="(q, qi) in currentGroupQuestions"
                    :key="q.id"
                    class="test-card similar-slot"
                >
                    <div class="question-word" v-html="getDisplay(q)"></div>
                    <handwriting-canvas
                        :ref="el => { if (el) similarCanvases[qi] = el }"
                        :canvas-size="similarCanvasSize"
                    ></handwriting-canvas>
                    <div class="card-actions">
                        <button @click="clearSimilarCanvas(qi)" class="btn btn-secondary similar-clear-btn">
                            清除
                        </button>
                    </div>
                </div>
            </div>

            <!-- 生字 / default single-question view -->
            <div v-else class="test-body question-display">
                <div class="test-card vocab-card">
                    <div class="question-word" v-html="currentQuestionDisplay"></div>
                    <handwriting-canvas
                        ref="canvas"
                        :canvas-size="canvasSize"
                    ></handwriting-canvas>
                    
                    <div class="card-actions">
                        <button @click="clearCanvas" class="btn btn-secondary btn-clear">
                            清除
                        </button>
                    </div>
                </div>
            </div>

            <!-- ── FOOTER ── simplified, mostly for 'Prev' ── -->
            <div class="test-footer">
                <!-- Prev -->
                <button
                    v-if="isSimilarMode && currentGroupIndex > 0"
                    @click="prevGroup"
                    class="btn btn-secondary"
                >← 上一組</button>
                <button
                    v-if="!isSimilarMode && currentIndex > 0"
                    @click="prevQuestion"
                    class="btn btn-secondary"
                >← 上一題</button>
                
                <!-- Spacer to keep footer height consistent if no prev -->
                <div v-if="(isSimilarMode && currentGroupIndex === 0) || (!isSimilarMode && currentIndex === 0)" style="flex:1"></div>

                <!-- Next (Vocab) -->
                <button v-if="!isSimilarMode" @click="nextQuestion" class="btn btn-primary">
                    {{ isLast ? '✔ 完成' : '下一題 →' }}
                </button>

                <!-- Next (Similar Mode) -->
                <button v-if="isSimilarMode" @click="nextQuestion" class="btn btn-primary">
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
            currentIndex: 0,
            canvasSize: 300,
            similarCanvasSize: 200,
            isStarred: false,
            isQuestionable: false,
            similarCanvases: [],
            currentGroupIndex: 0,
            groupKeys: [],
        };
    },
    computed: {
        // ── mode detection ──
        questionMode() {
            return this.questions.length > 0 ? (this.questions[0].questionMode || 'vocab') : 'vocab';
        },
        isSimilarMode() {
            return this.questionMode === 'similar_shapes';
        },
        modeLabel() {
            const labels = {
                similar_shapes: '形近字測驗',
                vocab: '生字測驗',
            };
            return labels[this.questionMode] || '測驗';
        },

        // ── standard vocab ──
        currentQuestion() {
            return this.questions[this.currentIndex];
        },
        currentQuestionDisplay() {
            if (!this.currentQuestion) return '';
            return TestEngine.getQuestionDisplay(this.currentQuestion);
        },

        // ── similar shapes ──
        totalGroups() { return this.groupKeys.length; },
        currentGroupId() { return this.groupKeys[this.currentGroupIndex]; },
        currentGroupQuestions() {
            if (!this.isSimilarMode) return [];
            return this.questions.filter(q => q.groupId === this.currentGroupId);
        },

        // ── shared ──
        isLast() {
            return this.isSimilarMode
                ? this.currentGroupIndex === this.totalGroups - 1
                : this.currentIndex === this.questions.length - 1;
        }
    },
    mounted() {
        this.initTest();
        // Debounced resize: avoid wiping canvas content during rapid orientation changes
        this._resizeTimer = null;
        this._onResize = () => {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = setTimeout(() => this.adjustCanvasSize(), 250);
        };
        window.addEventListener('resize', this._onResize);

        // Initial size check
        this.adjustCanvasSize();
        // Give DOM a moment to settle for final measurement
        setTimeout(() => { this.adjustCanvasSize(); }, 100);

        // Re-measure after DOM is fully rendered (accurate heights)
        this.$nextTick(() => {
            this.adjustCanvasSize();
            // Debug DOM layout
            const body = this.$el.querySelector('.test-body');
            const footer = this.$el.querySelector('.test-footer');
            console.debug('[DOM layout]', {
                shellH: this.$el?.offsetHeight,
                headerH: this.$el.querySelector('.test-header')?.offsetHeight,
                bodyH: body?.offsetHeight, scrollHeight: body?.scrollHeight,
                footerH: footer?.offsetHeight,
                wordH: this.$el.querySelector('.question-word')?.offsetHeight,
                canvasContainerH: this.$el.querySelector('.canvas-container')?.offsetHeight,
                canvasSize: this.canvasSize,
            });
        });
    },
    watch: {
        currentIndex() {
            this.checkStarStatus();
        },
        currentGroupIndex() {
            this.$nextTick(() => { this.similarCanvases = []; });
        }
    },
    beforeUnmount() {
        window.removeEventListener('resize', this._onResize);
        clearTimeout(this._resizeTimer);
    },
    methods: {
        // ── init ──
        initTest() {
            this.sessionId = this.$route.params.sessionId;
            try {
                this.questions = JSON.parse(this.$route.params.questions);
                if (this.isSimilarMode) {
                    const seen = new Set();
                    this.groupKeys = [];
                    for (const q of this.questions) {
                        if (!seen.has(q.groupId)) { seen.add(q.groupId); this.groupKeys.push(q.groupId); }
                    }
                    this.currentGroupIndex = 0;
                } else {
                    this.checkStarStatus();
                }
            } catch (error) {
                console.error('Error parsing questions:', error);
                alert('測驗資料錯誤');
                this.$router.push({ name: 'home' });
            }
        },

        getDisplay(q) { return TestEngine.getQuestionDisplay(q); },
        goHome() { this.$router.push({ name: 'home' }); },

        // ── vocab mark helpers ──
        async checkStarStatus() {
            if (!this.currentQuestion) return;
            try {
                this.isStarred = await StorageService.isStarred(this.currentQuestion);
                this.isQuestionable = await StorageService.isQuestionable(this.currentQuestion);
            } catch (e) { console.error(e); }
        },
        async toggleStar() {
            if (!this.currentQuestion) return;
            try { this.isStarred = await StorageService.toggleStar(this.currentQuestion); }
            catch (e) { console.error(e); }
        },
        async toggleQuestionable() {
            if (!this.currentQuestion) return;
            try { this.isQuestionable = await StorageService.toggleQuestionable(this.currentQuestion); }
            catch (e) { console.error(e); }
        },

        // ── canvas sizing ──
        adjustCanvasSize() {
            const W = window.innerWidth, H = window.innerHeight;
            const isLandscape = W > H;

            // Measure Shell and Header/Footer for precise overhead
            const shellH = this.$el ? this.$el.offsetHeight : H;
            const headerH = this.$el?.querySelector('.test-header')?.offsetHeight || 60;
            const footerH = this.$el?.querySelector('.test-footer')?.offsetHeight || 80;

            // Available height for the scrollable body area
            const availableBodyH = shellH - headerH - footerH;

            // ── Vocab: Measure live DOM for exact fit ──
            const vocabCanvas = this.$refs.canvas;
            const vocabEmpty = !vocabCanvas || vocabCanvas.isEmpty();

            if (!this.isSimilarMode) {
                // For Vocab mode, we want the card to stay within availableBodyH
                const bodyPadding = 40; // Total vertical padding (top+bottom)
                const cardPadding = 40;
                const wordEl = this.$el?.querySelector('.vocab-card .question-word');
                const wordH = wordEl ? wordEl.offsetHeight : 60;
                const actionsEl = this.$el?.querySelector('.vocab-card .card-actions');
                const actionsH = actionsEl ? actionsEl.offsetHeight : 60;

                const overhead = bodyPadding + cardPadding + wordH + actionsH + 20; // +20 safety
                const fitH = availableBodyH - overhead;
                const fitW = Math.min(W - 60, 600) - 40; // Max width 600, minus padding

                this.canvasSize = Math.min(600, Math.max(120, Math.min(fitW, fitH)));

                console.debug('[vocab sizing]', { availableBodyH, overhead, fitH, fitW, canvasSize: this.canvasSize });
            } else {
                // ── Similar Mode ──
                // Estimate rows: Landscape (1 row), Portrait (usually 2 rows for 2-4 items)
                const itemsCount = this.currentGroupQuestions.length;
                const cols = isLandscape ? Math.min(itemsCount, 3) : (itemsCount > 1 ? 2 : 1);
                const rows = Math.ceil(itemsCount / cols);

                const bodyPadding = 24; // .similar-group-page padding
                const gapH = (rows - 1) * 12;
                const cardPadding = 24; // .test-card padding
                const cardWordH = 45; // .question-word
                const cardActionsH = 45; // .card-actions

                const perRowOverhead = cardPadding + cardWordH + cardActionsH + 10;
                const totalOverhead = bodyPadding + gapH + (rows * perRowOverhead);

                const availableCanvasH = (availableBodyH - totalOverhead) / rows;
                const availableCanvasW = (W - bodyPadding - (cols - 1) * 12) / cols - cardPadding;

                this.similarCanvasSize = Math.min(380, Math.max(120, Math.min(availableCanvasW, availableCanvasH)));

                console.debug('[similar sizing]', { availableBodyH, rows, totalOverhead, availableCanvasH, similarCanvasSize: this.similarCanvasSize });
            }

            console.debug('[adjustCanvasSize completion]', {
                W, H, isLandscape,
                canvasSize: this.canvasSize,
                similarCanvasSize: this.similarCanvasSize,
            });
        },

        // ── canvas ops ──
        clearCanvas() { this.$refs.canvas && this.$refs.canvas.clear(); },
        clearSimilarCanvas(idx) { const c = this.similarCanvases[idx]; if (c) c.clear(); },

        // ── save ──
        async saveCurrentAnswer() {
            const canvas = this.$refs.canvas;
            if (!canvas || canvas.isEmpty()) return;
            try {
                const blob = await canvas.getBlob();
                await StorageService.saveAnswer(
                    this.sessionId, this.currentIndex,
                    this.currentQuestion.type, this.currentQuestion.targetChar,
                    this.currentQuestion.targetZhuyin, this.currentQuestion.contextWord,
                    blob
                );
            } catch (e) { console.error('Error saving answer:', e); }
        },
        async saveSimilarGroupAnswers() {
            const qs = this.currentGroupQuestions;
            for (let i = 0; i < qs.length; i++) {
                const c = this.similarCanvases[i];
                if (!c || c.isEmpty()) continue;
                try {
                    const blob = await c.getBlob();
                    await StorageService.saveAnswer(
                        this.sessionId, qs[i].id,
                        qs[i].type, qs[i].targetChar,
                        qs[i].targetZhuyin, qs[i].contextWord,
                        blob
                    );
                } catch (e) { console.error('Error saving similar answer:', e); }
            }
        },

        // ── navigation ──
        async prevGroup() {
            await this.saveSimilarGroupAnswers();
            if (this.currentGroupIndex > 0) {
                this.currentGroupIndex--;
                this.$nextTick(() => { this.similarCanvases = []; this.adjustCanvasSize(); });
            }
        },
        async prevQuestion() {
            await this.saveCurrentAnswer();
            if (this.currentIndex > 0) { this.currentIndex--; this.clearCanvas(); }
        },
        async nextQuestion() {
            if (this.isSimilarMode) {
                await this.saveSimilarGroupAnswers();
                if (this.isLast) { this.completeTest(); return; }
                this.currentGroupIndex++;
                this.$nextTick(() => { this.similarCanvases = []; this.adjustCanvasSize(); });
            } else {
                try {
                    await this.saveCurrentAnswer();
                    if (this.isLast) { this.completeTest(); return; }
                    this.currentIndex++;
                    this.clearCanvas();
                } catch (e) { console.error('Error:', e); alert('發生錯誤'); }
            }
        },
        completeTest() {
            this.$router.push({ name: 'review', params: { sessionId: this.sessionId } });
        }
    }
};

window.TestPage = TestPage;
