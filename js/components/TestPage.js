// Test Page Component (Universal Runner for Vocab, Similar Shapes, Polyphonic, Mixed)
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
                        第 {{ currentGroupIndex + 1 }} {{ isGroupedUI ? '組' : '題' }} / 共 {{ totalGroups }} {{ isGroupedUI ? '組' : '題' }}
                    </span>
                </div>

                <div class="test-header-marks"></div><!-- spacer -->
            </div>

            <!-- ── BODY ── Universal Layout ── -->
            <div class="test-body" :class="{ 'question-display': currentGroupQuestions.length === 1 }">
                <div class="similar-group-page" style="width: 100%;">
                    <div
                        v-for="(q, qi) in currentGroupQuestions"
                        :key="q.id"
                        class="test-card similar-slot"
                        :class="{'vocab-card-fallback': currentGroupQuestions.length === 1}"
                    >
                        <div class="question-header-bar" style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
                            <div class="question-word" style="flex:1; text-align:center;" v-html="getDisplay(q)"></div>
                            <button @click="toggleStar" class="btn btn-icon star-btn" :title="currentGroupQuestions[0].isStarred ? '取消標記' : '標記此組'">
                                {{ currentGroupQuestions[0].isStarred ? '★' : '☆' }}
                            </button>
                        </div>

                        <handwriting-canvas
                            :ref="el => { if (el) questionCanvases[q.id] = el; else delete questionCanvases[q.id]; }"
                            :canvas-size="currentCanvasSize"
                            :is-active="true"
                        ></handwriting-canvas>

                        <div class="card-actions canvas-tools" style="position: relative; width: 100%; min-height: 40px; margin-bottom: 0;">
                            <!-- Center controls -->
                            <div style="display: flex; justify-content: center; gap: 8px; width: 100%;">
                                <button @click="undoCanvas(q.id)" class="btn btn-secondary btn-icon" title="復原上一筆">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path></svg>
                                </button>
                                <button @click="clearCanvas(q.id)" class="btn btn-secondary btn-icon" title="清除全部">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                </button>
                            </div>
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
                >← 上一{{ isGroupedUI ? '組' : '題' }}</button>
                
                <div v-else style="flex:1"></div>

                <button @click="nextGroup" class="btn btn-primary">
                    {{ isLast ? '✔ 完成' : '下一' + (isGroupedUI ? '組' : '題') + ' →' }}
                </button>
            </div>

        </div>
    `,
    components: { HandwritingCanvas },
    data() {
        return {
            sessionId: '',
            questions: [],        // Full populated list
            currentGroupIndex: 0,
            groupKeys: [],
            currentCanvasSize: 300,
            questionCanvases: {}, // Map of q.id -> HandwritingCanvas component
            answersData: {}, // Map of questionId -> strokes array
        };
    },
    computed: {
        modeLabel() {
            if (this.questions.length === 0) return '測驗';
            if (this.questions[0].lessonTitle === '標記題目') return '練習標記';

            const type = this.questions[0].questionMode || this.questions[0].type || 'vocab';
            if (type === 'similar_shapes' || type === 'similar_char') return '形近字測驗';
            if (type === 'polyphonic' || type === 'polyphonic_zhuyin') return '多音字測驗';
            return '生字測驗';
        },
        totalGroups() { return this.groupKeys.length; },
        currentGroupId() { return this.groupKeys[this.currentGroupIndex]; },
        currentGroupQuestions() {
            return this.questions.filter(q => q.groupId === this.currentGroupId);
        },
        isGroupedUI() {
            return this.currentGroupQuestions.length > 1;
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

        // Intial measurements
        this.adjustCanvasSize();
        setTimeout(() => { this.adjustCanvasSize(); }, 100);
        this.$nextTick(() => { this.adjustCanvasSize(); });
    },
    watch: {
        currentGroupIndex() {
            this.adjustCanvasSize();
            this.loadCurrentStrokes();
            this.checkStarStatusForCurrentGroup();
            this._saveState();
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
                const parsedQuestions = JSON.parse(this.$route.params.questions);
                const seen = new Set();
                this.groupKeys = [];

                // Add reactive properties and normalize groups
                this.questions = parsedQuestions.map((q, idx) => {
                    const normalizedGroupId = q.groupId !== undefined ? q.groupId : ('vocab-' + q.id);
                    if (!seen.has(normalizedGroupId)) {
                        seen.add(normalizedGroupId);
                        this.groupKeys.push(normalizedGroupId);
                    }
                    return {
                        ...q,
                        groupId: normalizedGroupId,
                        isStarred: false
                    };
                });

                // Restore previous state if session matches
                const saved = PersistenceService.restore('testPageState', this.sessionId);
                if (saved) {
                    this.currentGroupIndex = saved.currentGroupIndex || 0;
                    this.answersData = saved.answersData || {};
                }

                // Initial updates
                this.checkStarStatusForCurrentGroup();
                this.$nextTick(() => this.loadCurrentStrokes());
            } catch (error) {
                console.error('Error parsing questions:', error);
                AppToast.show('測驗資料錯誤');
                this.$router.push({ name: 'home' });
            }
        },

        getDisplay(q) { return TestEngine.getQuestionDisplay(q); },
        goHome() { this.$router.push({ name: 'home' }); },

        // ── marks ──
        async checkStarStatusForCurrentGroup() {
            for (const q of this.currentGroupQuestions) {
                try {
                    q.isStarred = await StorageService.isStarred(q);
                } catch (e) { console.error(e); }
            }
        },
        async toggleStar() {
            try {
                // Toggle the entire group
                const newState = await StorageService.toggleStar(this.currentGroupQuestions);
                // Update UI for all cards in the group
                this.currentGroupQuestions.forEach(q => q.isStarred = newState);
            } catch (e) {
                console.error('Error toggling group star state:', e);
            }
        },

        // ── canvas sizing ──
        adjustCanvasSize() {
            const W = window.innerWidth, H = window.innerHeight;
            const isLandscape = W > H;
            const shellH = this.$el ? this.$el.offsetHeight : H;
            const headerH = this.$el?.querySelector('.test-header')?.offsetHeight || 60;
            const footerH = this.$el?.querySelector('.test-footer')?.offsetHeight || 80;
            const availableBodyH = shellH - headerH - footerH;

            const itemsCount = this.currentGroupQuestions.length;
            const cols = isLandscape ? Math.min(itemsCount, 3) : (itemsCount > 1 ? 2 : 1);
            const rows = Math.ceil(itemsCount / cols);

            const bodyPadding = 40;
            const groupPadding = 24;
            const gapH = (rows - 1) * 12;
            const cardPadding = 24;
            // Slightly taller word display if it's a standalone test element
            const cardWordH = itemsCount === 1 ? 80 : 48;
            const cardGaps = 16;
            const canvasMargins = 10;
            const cardActionsH = 40;

            const perRowOverhead = cardPadding + cardWordH + cardGaps + canvasMargins + cardActionsH + 5;
            const totalOverhead = bodyPadding + groupPadding + gapH + (rows * perRowOverhead);

            const availableCanvasH = (availableBodyH - totalOverhead) / rows;
            const availableCanvasW = (W - bodyPadding - groupPadding - (cols - 1) * 12) / cols - cardPadding;

            // Allow much larger max canvas size if it is the only card on screen
            const maxCanvasSize = itemsCount === 1 ? 600 : 380;
            this.currentCanvasSize = Math.min(maxCanvasSize, Math.max(120, Math.min(availableCanvasW, availableCanvasH)));
        },

        // ── canvas ops ──
        undoCanvas(qid) { const c = this.questionCanvases[qid]; if (c) c.undo(); },
        clearCanvas(qid) { const c = this.questionCanvases[qid]; if (c) c.clear(); },

        // ── save ──
        async saveGroupAnswers() {
            const qs = this.currentGroupQuestions;
            for (const q of qs) {
                const c = this.questionCanvases[q.id];
                if (!c) continue;

                // Save strokes for navigation persistence
                this.answersData[q.id] = c.getStrokes();

                if (c.isEmpty() && !q.isStarred) continue;
                try {
                    const blob = c.isEmpty() ? null : await c.getBlob();
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

        // ── navigation ──
        async prevGroup() {
            await this.saveGroupAnswers();
            if (this.currentGroupIndex > 0) {
                this.currentGroupIndex--;
            }
        },
        async nextGroup() {
            await this.saveGroupAnswers();
            if (this.isLast) { this.completeTest(); return; }
            this.currentGroupIndex++;
        },
        completeTest() {
            this.$router.push({ name: 'review', params: { sessionId: this.sessionId } });
            PersistenceService.clear('testPageState');
        },

        _saveState() {
            PersistenceService.save('testPageState', {
                currentGroupIndex: this.currentGroupIndex,
                answersData: this.answersData
            }, this.sessionId);
        }
    }
};

window.TestPage = TestPage;

/* SIGNATURE_START
   [​‌‌‌‌​‌‌‍​​‌​​​‌​‍​‌‌‌​‌​‌‍​‌‌‌​​‌​‍​‌‌​‌‌​​‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​‌​​​‍​‌‌‌​‌​​‍​‌‌‌​‌​​‍​‌‌‌​​​​‍​‌‌‌​​‌‌‍​​‌‌‌​‌​‍​​‌​‌‌‌‌‍​​‌​‌‌‌‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌‌​‌​‌‍​‌‌​​​‌​‍​​‌​‌‌‌​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​‌‌​‌‍​​‌​‌‌‌‌‍​‌‌‌​​‌‌‍​‌‌​​​‌‌‍​‌‌‌​​‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌​‌‌‍​‌‌​​‌​‌‍​​‌​‌‌‌‌‍​‌​​​​‌‌‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌​‌‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌​‌​‌‌‌‍​‌‌‌​​‌​‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌‌‍​​‌​​​‌​‍​​‌​‌‌​​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​​​​‌‍​‌‌‌​‌​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌​‌‌‌‌‍​‌‌‌​​‌​‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌​​​‌​​‍​‌‌​‌​​‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​​​​‌‍​‌‌​‌‌​​‍​​‌​​​​​‍​‌​‌​​‌‌‍​‌‌​‌​​‌‍​‌‌​​‌‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌‌​‌​​‍​‌‌‌​‌​‌‍​‌‌‌​​‌​‍​‌‌​​‌​‌‍​​‌​​​‌​‍​​‌​‌‌​​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​‌‌‌​‍​‌‌​‌‌‌‌‍​‌‌‌​‌​​‍​‌‌​​‌​‌‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌​‌‌​‌‌‍​‌​‌​​‌‌‍​‌​‌‌​​‌‍​‌​‌​​‌‌‍​‌​‌​‌​​‍​‌​​​‌​‌‍​‌​​‌‌​‌‍​​‌‌‌​‌​‍​​‌​​​​​‍​‌​​‌​​‌‍​‌‌​​‌‌​‍​​‌​​​​​‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌‌​​‌‌‍​​‌​​​​​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​​‌​​‍​‌‌​​‌​‌‍​​‌​​​​​‍​‌‌​‌​​‌‍​‌‌‌​​‌‌‍​​‌​​​​​‍​‌‌​​​​‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌‌​​‍​‌‌‌‌​​‌‍​‌‌‌‌​‌​‍​‌‌​​‌​‌‍​‌‌​​‌​​‍​​‌​‌‌​​‍​​‌​​​​​‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌‌​​‌​‌‍​​‌​​​​​‍​‌‌​‌​​​‍​‌‌‌​‌​​‍​‌‌‌​‌​​‍​‌‌‌​​​​‍​‌‌‌​​‌‌‍​​‌‌‌​‌​‍​​‌​‌‌‌‌‍​​‌​‌‌‌‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌‌​‌​‌‍​‌‌​​​‌​‍​​‌​‌‌‌​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​‌‌​‌‍​​‌​‌‌‌‌‍​‌‌‌​​‌‌‍​‌‌​​​‌‌‍​‌‌‌​​‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌​‌‌‍​‌‌​​‌​‌‍​​‌​‌‌‌‌‍​‌​​​​‌‌‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌​‌‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌​‌​‌‌‌‍​‌‌‌​​‌​‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌‌‍​​‌​​​​​‍​‌‌​​‌‌​‍​‌‌​‌‌‌‌‍​‌‌‌​​‌​‍​​‌​​​​​‍​‌‌‌​​​​‍​‌‌‌​​‌​‍​‌‌​‌‌‌‌‍​‌‌​‌​‌​‍​‌‌​​‌​‌‍​‌‌​​​‌‌‍​‌‌‌​‌​​‍​​‌​​​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌​‍​‌‌​‌‌‌‌‍​​‌​‌‌‌​‍​‌​‌‌‌​‌‍​​‌​​​‌​‍​‌‌‌‌‌​‌‍​‌‌‌‌‌​​‍​‌​‌​​‌‌‍​‌​​‌​​‌‍​‌​​​‌‌‌‍​​‌‌‌​‌​‍​‌​​​​‌‌‍​‌​​​​‌​‍​‌‌​​‌​‌‍​‌‌​​‌​‌‍​‌‌‌​‌​​‍​‌​​‌‌​‌‍​‌‌​‌‌​​‍​‌‌‌​​‌‌‍​​‌‌​​‌​‍​‌‌‌‌​​​‍​‌‌​‌‌‌​‍​​‌​‌‌‌‌‍​‌​‌‌​‌​‍​‌​​‌‌‌‌‍​‌‌​‌‌​‌‍​‌‌‌​‌​​‍​‌‌‌‌​​‌‍​‌​​‌‌‌‌‍​‌​‌‌​‌​‍​‌‌​‌​​​‍​‌​​‌​‌‌‍​‌​​​​‌‌‍​‌‌​‌​‌‌‍​‌‌‌​‌​​‍​‌​‌​​​​‍​‌‌​‌‌​​‍​‌​​‌‌‌​‍​​‌‌‌​​‌‍​‌‌‌​‌​​‍​‌​‌​‌‌​‍​‌​‌​‌‌​‍​​‌‌​‌​​‍​‌‌‌​‌‌​‍​​‌‌​​‌‌‍​‌​‌​‌​‌‍​‌​​​​​‌‍​​‌‌‌​​​‍​‌‌‌​​​‌‍​‌​​‌​​‌‍​‌‌‌​‌‌‌‍​‌​‌​‌‌‌‍​​‌‌​​​​‍​‌‌‌‌​‌​‍​‌‌​‌​‌‌‍​‌‌​​​​‌‍​‌‌​‌‌​‌‍​​‌‌​​​‌‍​‌‌‌​‌‌​‍​‌‌‌​​​‌‍​‌​​​​​‌‍​‌​​‌​​‌‍​‌‌​‌​​‌‍​‌​​‌​​​‍​‌​​​​‌​‍​‌​‌‌​‌​‍​‌‌‌‌​​​‍​‌​​​​‌​‍​‌​‌‌​‌​‍​‌​‌​​‌​‍​‌​‌​​‌‌‍​‌​​‌​‌‌‍​​‌‌​‌‌​‍​‌​​‌‌‌​‍​‌​​​‌‌​‍​‌​​‌​‌​‍​‌​‌‌​​‌‍​‌‌‌​​‌​‍​‌​​‌‌​​‍​‌​​‌​​​‍​‌‌‌​​‌​‍​​‌‌​​​‌‍​​‌‌‌​​‌‍​​‌‌​​‌‌‍​‌​​‌​‌​‍​‌​‌​​‌​‍​‌‌‌‌​​‌‍​‌​‌‌​​‌‍​‌‌​‌‌‌​‍​​‌‌​‌​‌‍​‌‌​‌‌‌​‍​‌‌‌​​‌​‍​‌​​​​​‌‍​​‌​‌​‌‌‍​‌​​​​‌​‍​‌​​​‌​​‍​‌‌‌​‌‌‌‍​​‌‌‌‌​‌‍​​‌‌‌‌​‌‍]
   SIGNATURE_END */
