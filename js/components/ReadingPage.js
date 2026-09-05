// Reading Page — displays all data of selected lessons for review (no test)
const ReadingPage = {
    name: 'ReadingPage',
    template: `
        <div class="reading-page">
            <div class="header">
                <button @click="goHome" class="btn btn-secondary btn-icon" title="回首頁" style="margin-right: 15px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
                        <path d="M3 12l9-9 9 9M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path>
                        <path d="M9 21v-6a2 2 0 012-2h2a2 2 0 012 2v6"></path>
                    </svg>
                </button>
                <h1>📖 課文閱覽</h1>

                <div class="reading-toolbar">
                    <label class="reading-toggle" v-for="section in sectionToggles" :key="section.key">
                        <input type="checkbox" v-model="visibleSections[section.key]" />
                        {{ section.label }}
                    </label>
                </div>
            </div>

            <div class="content">
                <div v-if="loading" class="empty-state">
                    <div class="empty-state-icon">⏳</div>
                    <p class="empty-state-text">載入中…</p>
                </div>
                <div v-else-if="lessons.length === 0" class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <p class="empty-state-text">未選擇課文，請返回首頁選課後再進入閱讀模式。</p>
                    <button class="btn btn-secondary" style="margin-top:20px" @click="goHome">返回首頁</button>
                </div>

                <div v-else class="reading-lesson-list">
                    <article v-for="(lesson, li) in lessons" :key="lesson.lessonId" class="reading-lesson-card">
                        <header class="reading-lesson-header" @click="toggleLesson(lesson.lessonId)">
                            <span class="reading-lesson-chapter">{{ lesson.chapter }}</span>
                            <span class="reading-lesson-title">{{ lesson.title }}</span>
                            <span class="reading-lesson-meta">{{ lesson.gradeLabel }}</span>
                            <span class="reading-lesson-toggle">{{ expanded[lesson.lessonId] === false ? '＋' : '−' }}</span>
                        </header>

                        <div v-show="expanded[lesson.lessonId] !== false" class="reading-lesson-body">

                            <!-- Vocabulary -->
                            <section v-if="visibleSections.vocab && lesson.vocab.length" class="reading-section">
                                <h3 class="reading-section-title">📚 生字與詞語</h3>
                                <div class="reading-vocab-list">
                                    <div v-for="(v, vi) in lesson.vocab" :key="vi" class="reading-vocab-row">
                                        <div class="reading-vocab-char">
                                            <span class="reading-hanzi">{{ v['生字國字'] }}</span>
                                            <span class="reading-zhuyin">{{ v['生字注音'] }}</span>
                                        </div>
                                        <div class="reading-vocab-body">
                                            <div class="reading-vocab-word" v-if="v['本課詞語國字'] && v['本課詞語國字'] !== v['生字國字']">
                                                <span class="reading-word-han">{{ v['本課詞語國字'] }}</span>
                                                <span class="reading-word-zhuyin">{{ v['本課詞語注音'] }}</span>
                                            </div>
                                            <div class="reading-vocab-def" v-if="v['詞語解釋']">{{ v['詞語解釋'] }}</div>
                                            <div class="reading-vocab-example" v-if="v['造句']">
                                                <span class="reading-tag">例</span>{{ v['造句'] }}
                                            </div>
                                            <div class="reading-vocab-words" v-if="v.words && v.words.length">
                                                <span class="reading-tag">延伸</span>
                                                <span v-for="(w, wi) in v.words" :key="wi" class="reading-word-chip">{{ w }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <!-- Similar Shapes -->
                            <section v-if="visibleSections.similar && lesson.similarShapes.length" class="reading-section">
                                <h3 class="reading-section-title">🔡 形近字辨析</h3>
                                <div v-for="(group, gi) in lesson.similarShapes" :key="gi" class="reading-similar-group">
                                    <div v-for="(item, ii) in group" :key="ii" class="reading-similar-item">
                                        <span class="reading-similar-char">{{ item.character }}</span>
                                        <span class="reading-similar-phrases">
                                            <span v-for="(p, pi) in item.example_phrases" :key="pi" class="reading-word-chip">{{ p }}</span>
                                        </span>
                                    </div>
                                </div>
                            </section>

                            <!-- Multiple Phonetics -->
                            <section v-if="visibleSections.poly && lesson.multiplePhonetics.length" class="reading-section">
                                <h3 class="reading-section-title">🔊 多音字</h3>
                                <div v-for="(item, mi) in lesson.multiplePhonetics" :key="mi" class="reading-poly-item">
                                    <div class="reading-poly-head">{{ item.character }}</div>
                                    <div v-for="(variant, vi) in item.variants" :key="vi" class="reading-poly-variant">
                                        <span class="reading-poly-phonetic">{{ variant.phonetic }}</span>
                                        <span class="reading-poly-phrases">
                                            <span v-for="(p, pi) in variant.example_phrases" :key="pi" class="reading-word-chip">{{ p }}</span>
                                        </span>
                                    </div>
                                </div>
                            </section>

                            <!-- Sentence patterns -->
                            <section v-if="visibleSections.sentences && (lesson.phrasePractice.length || lesson.sentencePractice.length)" class="reading-section">
                                <h3 class="reading-section-title">📝 句型／短語練習</h3>
                                <div v-for="(it, i) in lesson.phrasePractice" :key="'p'+i" class="reading-sentence-item">
                                    <div class="reading-sentence-phrase">{{ it.phrase }}</div>
                                    <div v-if="it.structure" class="reading-sentence-struct">結構：{{ it.structure }}</div>
                                    <div v-if="it.examples && it.examples.length" class="reading-sentence-examples">
                                        <span class="reading-tag">仿</span>
                                        <span v-for="(ex, exi) in it.examples" :key="exi" class="reading-sentence-example">{{ ex }}</span>
                                    </div>
                                </div>
                                <div v-for="(it, i) in lesson.sentencePractice" :key="'s'+i" class="reading-sentence-item">
                                    <div class="reading-sentence-phrase">
                                        {{ it.phrase }}
                                        <span v-if="it.pattern_type" class="reading-pattern-badge">{{ it.pattern_type }}</span>
                                    </div>
                                    <div v-if="it.original_sentence" class="reading-sentence-orig">原句：{{ it.original_sentence }}</div>
                                    <div v-if="it.examples && it.examples.length" class="reading-sentence-examples">
                                        <span class="reading-tag">仿</span>
                                        <span v-for="(ex, exi) in it.examples" :key="exi" class="reading-sentence-example">{{ ex }}</span>
                                    </div>
                                </div>
                            </section>

                            <!-- Idioms -->
                            <section v-if="visibleSections.idioms && lesson.idioms.length" class="reading-section">
                                <h3 class="reading-section-title">📖 延伸成語</h3>
                                <div v-for="(idm, ii) in lesson.idioms" :key="ii" class="reading-idiom-item">
                                    <div class="reading-idiom-head">{{ idm.idiom }}</div>
                                    <div v-if="idm.explanation" class="reading-idiom-def">{{ idm.explanation }}</div>
                                    <div v-if="idm.example_sentence" class="reading-idiom-example">
                                        <span class="reading-tag">例</span>{{ idm.example_sentence }}
                                    </div>
                                </div>
                            </section>

                            <div v-if="lesson.isEmpty" class="reading-empty-note">
                                本課無可顯示的資料（已用上方勾選過濾）。
                            </div>
                        </div>
                    </article>
                </div>
            </div>
        </div>
    `,

    data() {
        return {
            loading: true,
            lessonIds: [],
            lessons: [],
            expanded: {},
            visibleSections: {
                vocab: true,
                similar: true,
                poly: true,
                sentences: true,
                idioms: true
            },
            sectionToggles: [
                { key: 'vocab',     label: '📚 生字' },
                { key: 'similar',   label: '🔡 形近' },
                { key: 'poly',      label: '🔊 多音' },
                { key: 'sentences', label: '📝 句型' },
                { key: 'idioms',    label: '📖 成語' }
            ]
        };
    },

    async created() {
        try {
            const stored = window.RouterState && window.RouterState.get('reading');
            const ids = stored && Array.isArray(stored.lessonIds) ? stored.lessonIds : [];
            this.lessonIds = ids;
            await this.loadLessons();

            // Restore per-lesson expand state
            try {
                const raw = sessionStorage.getItem('readingPageState');
                if (raw) {
                    const s = JSON.parse(raw);
                    if (s.expanded) this.expanded = s.expanded;
                    if (s.visibleSections) this.visibleSections = { ...this.visibleSections, ...s.visibleSections };
                }
            } catch (e) { /* ignore */ }
        } catch (e) {
            console.error('Reading page load failed:', e);
        }
    },

    watch: {
        expanded: { deep: true, handler() { this._saveState(); } },
        visibleSections: { deep: true, handler() { this._saveState(); } }
    },

    methods: {
        _saveState() {
            try {
                sessionStorage.setItem('readingPageState', JSON.stringify({
                    expanded: this.expanded,
                    visibleSections: this.visibleSections
                }));
            } catch (e) { /* ignore */ }
        },

        async loadLessons() {
            this.loading = true;
            const out = [];
            for (const lessonId of this.lessonIds) {
                const lesson = await DataService.getLessonById(lessonId);
                if (!lesson) continue;
                const info = DataService.parseLessonId(lessonId);
                const n = DataService.normalizeParts(lesson);
                const vocab = n.vocab;
                const similarShapes = n.similarShapes;
                const multiplePhonetics = n.multiplePhonetics;
                const phrasePractice = Array.isArray(n.keySentences.phrase_practice) ? n.keySentences.phrase_practice : [];
                const sentencePractice = Array.isArray(n.keySentences.sentence_practice) ? n.keySentences.sentence_practice : [];
                const idioms = n.idioms;

                out.push({
                    lessonId,
                    chapter: lesson.chapter,
                    title: lesson.title,
                    gradeLabel: `${info.publisher} ${info.twYear} ${info.grade}${info.semester}`,
                    vocab,
                    similarShapes,
                    multiplePhonetics,
                    phrasePractice,
                    sentencePractice,
                    idioms,
                    isEmpty:
                        !vocab.length && !similarShapes.length && !multiplePhonetics.length &&
                        !phrasePractice.length && !sentencePractice.length && !idioms.length
                });
            }
            this.lessons = out;
            this.loading = false;
        },

        toggleLesson(id) {
            this.expanded = {
                ...this.expanded,
                [id]: this.expanded[id] === false ? true : false
            };
        },

        goHome() {
            this.$router.push({ name: 'home' });
        }
    }
};

window.ReadingPage = ReadingPage;
