// Lesson Selector Component
const LessonSelector = {
    name: 'LessonSelector',
    template: `
        <div class="lesson-selector" :data-mobile-tab="activeTab">
            <h2>📚 選擇課文</h2>

            <!-- Mobile-only tab bar -->
            <div class="mobile-tab-bar">
                <button class="mobile-tab-btn" :class="{ active: activeTab === 'lessons' }" @click="activeTab = 'lessons'">
                    📚 選課文
                    <span v-if="selectedLessons.length > 0" class="tab-badge">{{ selectedLessons.length }}</span>
                </button>
                <button class="mobile-tab-btn" :class="{ active: activeTab === 'config' }" @click="activeTab = 'config'">
                    📝 測驗設定
                </button>
            </div>

            <div class="lesson-selection-container" style="position: relative;" @mousedown="onContainerMouseDown" @touchstart="onContainerTouchStart">
                <div v-if="isBoxDragging" class="selection-box" :style="selectionBoxStyle"></div>
                <!-- Left Panel: Filters (1/3) -->
                <div class="selection-sidebar">
                    <!-- Filters group: shown in Tab 1 on mobile, always visible on desktop -->
                    <div class="sidebar-filters">
                        <div class="filter-group">
                            <label class="filter-label">出版社</label>
                            <select v-model="selectedPublisher" class="filter-select">
                                <option v-for="pub in publishers" :key="pub" :value="pub">
                                    {{ pub }}
                                </option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label class="filter-label">學年度</label>
                            <select v-model="selectedYear" class="filter-select">
                                <option v-for="year in years" :key="year" :value="year">
                                    {{ year }}
                                </option>
                            </select>
                        </div>

                        <div class="selection-stats">
                            <p>已選擇: {{ selectedLessons.length }} 課</p>
                            <button v-if="selectedLessons.length > 0" @click="clearSelection" class="btn btn-secondary btn-small">
                                清除選擇
                            </button>
                        </div>
                    </div>

                    <!-- Config group: shown in Tab 2 on mobile, always visible on desktop -->
                    <div class="sidebar-config">
                        <slot name="sidebar-extras"></slot>
                    </div>
                </div>

                <!-- Right Panel: Lesson List (2/3) -->
                <div class="selection-content">
                    <div v-if="isLoading" class="loading-hint">
                        <span class="loading-spinner"></span>
                        載入課文資料中…
                    </div>
                    <div v-else-if="groupedData.length === 0" class="empty-state-text">
                        沒有符合條件的課文
                    </div>

                    <div v-for="group in groupedData" :key="group.id" class="grade-group">
                        <div class="grade-header" :data-group-id="group.id" @click="toggleGroup(group.id)">
                            <div class="grade-header-left">
                                <input 
                                    type="checkbox" 
                                    :checked="isGroupSelected(group)"
                                    :indeterminate.prop="isGroupIndeterminate(group)"
                                    @click.stop="toggleGroupSelection(group)"
                                    class="grade-checkbox"
                                />
                                <span class="grade-title">{{ group.label }}</span>
                                <span v-if="getSelectedChaptersLabel(group)" class="selected-chapters-label">: {{ getSelectedChaptersLabel(group) }}</span>
                            </div>
                            <span class="grade-arrow" :class="{ expanded: expandedGroups[group.id] }">▶</span>
                        </div>
                        
                        <div v-show="expandedGroups[group.id]" class="lesson-list">
                            <label 
                                v-for="lesson in group.lessons" 
                                :key="lesson.id"
                                class="lesson-item"
                                :data-lesson-id="lesson.id"
                            >
                                <input 
                                    type="checkbox" 
                                    :checked="selectedLessons.includes(lesson.id)"
                                    @change="onLessonCheckboxChange($event, lesson.id)"
                                    class="lesson-checkbox"
                                />
                                <div class="lesson-label">
                                    <span class="lesson-chapter">{{ lesson.chapter }}</span>
                                    <span class="lesson-title">{{ lesson.title }}</span>
                                    <span class="lesson-feature-badges">
                                        <span v-if="lesson.hasSimilarShapes" class="lesson-badge" title="含形近字辨析">形</span>
                                        <span v-if="lesson.hasPolyphonic" class="lesson-badge" title="含多音字">音</span>
                                        <span v-if="lesson.hasIdioms" class="lesson-badge" title="含延伸成語">成</span>
                                        <span v-if="lesson.hasSentencePatterns" class="lesson-badge" title="含句型／短語練習">句</span>
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    props: {
        modelValue: {
            type: Array,
            default: () => []
        }
    },
    emits: ['update:modelValue'],
    data() {
        return {
            rawData: [],
            expandedGroups: {},
            publishers: [],
            years: [],
            selectedPublisher: '',
            selectedYear: '',
            activeTab: 'lessons',
            isLoading: true,

            // Box Drag State
            isBoxDragging: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            dragAction: 'select',
            initialSelectionState: [],
            isTouchDevice: false
        };
    },
    computed: {
        selectedLessons: {
            get() {
                return this.modelValue;
            },
            set(value) {
                this.$emit('update:modelValue', value);
            }
        },
        selectionBoxStyle() {
            return {
                left: Math.min(this.startX, this.currentX) + 'px',
                top: Math.min(this.startY, this.currentY) + 'px',
                width: Math.abs(this.currentX - this.startX) + 'px',
                height: Math.abs(this.currentY - this.startY) + 'px'
            };
        },
        // Filter raw data based on selection
        filteredRawData() {
            return this.rawData.filter(item => {
                const matchPublisher = !this.selectedPublisher || item.publisher === this.selectedPublisher;
                const matchYear = !this.selectedYear || item.tw_year === this.selectedYear;
                return matchPublisher && matchYear;
            });
        },
        // Group the filtered data
        groupedData() {
            const grouped = [];

            this.filteredRawData.forEach(group => {
                group.books.forEach(book => {
                    const key = `${group.publisher}_${group.tw_year}_${book.grade}_${book.semester}`;
                    const gradeNum = book.grade.replace('年級', '');
                    const semesterAbbr = book.semester.replace('學期', '');
                    const label = `${gradeNum}${semesterAbbr}`;

                    // Initialize expanded state if not set
                    if (this.expandedGroups[key] === undefined) {
                        this.expandedGroups[key] = false;
                    }

                    const lessons = book.lessons.map(lesson => {
                        const parts = lesson.parts || {};
                        const pa = parts.phonetic_analysis || {};
                        const ks = parts.key_sentences || {};
                        return {
                            id: DataService.createLessonId(
                                group.publisher,
                                group.tw_year,
                                book.grade,
                                book.semester,
                                lesson.chapter
                            ),
                            chapter: lesson.chapter,
                            title: lesson.title,
                            hasSimilarShapes: Array.isArray(pa.similar_shapes) && pa.similar_shapes.length > 0,
                            hasPolyphonic: Array.isArray(pa.multiple_phonetics) && pa.multiple_phonetics.length > 0,
                            hasIdioms: Array.isArray(parts.extended_idioms) && parts.extended_idioms.length > 0,
                            hasSentencePatterns:
                                (Array.isArray(ks.phrase_practice) && ks.phrase_practice.length > 0) ||
                                (Array.isArray(ks.sentence_practice) && ks.sentence_practice.length > 0)
                        };
                    });

                    // Sort lessons
                    lessons.sort((a, b) => {
                        const matchA = a.chapter.match(/第(.+?)課/);
                        const matchB = b.chapter.match(/第(.+?)課/);
                        if (matchA && matchB) {
                            return this.chineseToNumber(matchA[1]) - this.chineseToNumber(matchB[1]);
                        }
                        return 0;
                    });

                    grouped.push({
                        id: key,
                        label: label,
                        grade: book.grade,
                        semester: book.semester,
                        lessons: lessons
                    });
                });
            });

            // Sort groups
            return grouped.sort((a, b) => {
                const numA = this.chineseToNumber(a.grade.replace('年級', ''));
                const numB = this.chineseToNumber(b.grade.replace('年級', ''));
                if (numA !== numB) return numA - numB;
                const semA = a.semester.includes('上') ? 1 : 2;
                const semB = b.semester.includes('上') ? 1 : 2;
                return semA - semB;
            });
        }
    },
    async mounted() {
        this.isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
        await this.loadData();
    },
    watch: {
        selectedPublisher() { this._saveSelectorState(); },
        selectedYear() { this._saveSelectorState(); },
    },
    methods: {
        // Persist expand/filter state
        _saveSelectorState() {
            try {
                sessionStorage.setItem('selectorState', JSON.stringify({
                    expandedGroups: this.expandedGroups,
                    selectedPublisher: this.selectedPublisher,
                    selectedYear: this.selectedYear
                }));
            } catch (e) { /* ignore */ }
        },
        _restoreSelectorState() {
            try {
                const saved = sessionStorage.getItem('selectorState');
                if (!saved) return;
                const state = JSON.parse(saved);
                if (state.expandedGroups) this.expandedGroups = state.expandedGroups;
                if (state.selectedPublisher) this.selectedPublisher = state.selectedPublisher;
                if (state.selectedYear) this.selectedYear = state.selectedYear;
            } catch (e) { /* ignore */ }
        },

        // Convert Chinese numerals to numbers for sorting
        chineseToNumber(chineseNum) {
            const map = {
                '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
                '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
                '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
                '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20
            };
            return map[chineseNum] || 999;
        },

        async loadData() {
            this.isLoading = true;
            this.rawData = await DataService.getStructuredData();
            this.isLoading = false;

            // Extract Metadata
            const publishers = new Set();
            const years = new Set();

            this.rawData.forEach(item => {
                if (item.publisher) publishers.add(item.publisher);
                if (item.tw_year) years.add(item.tw_year);
            });

            this.publishers = Array.from(publishers).sort();
            // Sort years descending (newest first)
            this.years = Array.from(years).sort((a, b) => {
                const numA = parseInt(a);
                const numB = parseInt(b);
                if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
                return b.localeCompare(a);
            });

            // Set Defaults
            if (this.publishers.length > 0) {
                this.selectedPublisher = this.publishers[0];
            }
            if (this.years.length > 0) {
                this.selectedYear = this.years[0];
            }

            // Restore saved state (overrides defaults)
            this._restoreSelectorState();
        },

        toggleGroup(groupId) {
            this.expandedGroups[groupId] = !this.expandedGroups[groupId];
            this._saveSelectorState();
        },

        // --- Box Drag Selection ---
        onContainerMouseDown(e) {
            if (e.button !== 0) return; // Only left click
            if (e.target.closest('button, select, input, .grade-arrow')) return;

            // Feature disabled by request - preserving code below
            if (true) return;

            // Check global setting and touch device
            const settings = JSON.parse(localStorage.getItem('zhuyinSettings') || '{}');
            const dragEnabled = settings.enableDragSelect === true;

            // If dragging is disabled OR it's a touch device, don't start box dragging
            if (!dragEnabled || this.isTouchDevice) return;

            // Determine drag action based on initial click target
            let dragAction = 'select';
            const lessonItem = e.target.closest('.lesson-item');
            if (lessonItem && lessonItem.dataset.lessonId) {
                if (this.selectedLessons.includes(lessonItem.dataset.lessonId)) dragAction = 'unselect';
            } else {
                const groupHeader = e.target.closest('.grade-header');
                if (groupHeader && groupHeader.dataset.groupId) {
                    const g = this.groupedData.find(gr => gr.id === groupHeader.dataset.groupId);
                    if (g && this.isGroupSelected(g)) dragAction = 'unselect';
                }
            }

            this.dragAction = dragAction;
            this.startX = e.clientX;
            this.startY = e.clientY;
            this.currentX = e.clientX;
            this.currentY = e.clientY;
            this.isBoxDragging = false;
            this.initialSelectionState = [...this.selectedLessons];

            window.addEventListener('mousemove', this.onMouseMove);
            window.addEventListener('mouseup', this.endDrag);
        },

        onContainerTouchStart(e) {
            if (e.target.closest('button, select, input, .grade-arrow')) return;

            // Never allow box drag on touch devices to avoid interference with scrolling/swiping
            return;

            // eslint-disable-next-line no-unreachable
            let dragAction = 'select';
            const lessonItem = e.target.closest('.lesson-item');
            if (lessonItem && lessonItem.dataset.lessonId) {
                if (this.selectedLessons.includes(lessonItem.dataset.lessonId)) dragAction = 'unselect';
            } else {
                const groupHeader = e.target.closest('.grade-header');
                if (groupHeader && groupHeader.dataset.groupId) {
                    const g = this.groupedData.find(gr => gr.id === groupHeader.dataset.groupId);
                    if (g && this.isGroupSelected(g)) dragAction = 'unselect';
                }
            }

            this.dragAction = dragAction;
            const touch = e.touches[0];
            this.startX = touch.clientX;
            this.startY = touch.clientY;
            this.currentX = touch.clientX;
            this.currentY = touch.clientY;
            this.isBoxDragging = false;
            this.initialSelectionState = [...this.selectedLessons];

            window.addEventListener('touchmove', this.onTouchMove, { passive: false });
            window.addEventListener('touchend', this.endTouchDrag);
        },

        onMouseMove(e) {
            this.currentX = e.clientX;
            this.currentY = e.clientY;
            const dx = Math.abs(this.currentX - this.startX);
            const dy = Math.abs(this.currentY - this.startY);
            if (!this.isBoxDragging && (dx > 5 || dy > 5)) {
                this.isBoxDragging = true;
            }
            if (this.isBoxDragging) {
                this.updateSelectionFromBox();
            }
        },

        onTouchMove(e) {
            const touch = e.touches[0];
            this.currentX = touch.clientX;
            this.currentY = touch.clientY;
            const dx = Math.abs(this.currentX - this.startX);
            const dy = Math.abs(this.currentY - this.startY);
            if (!this.isBoxDragging && (dx > 5 || dy > 5)) {
                this.isBoxDragging = true;
            }
            if (this.isBoxDragging) {
                if (e.cancelable) e.preventDefault(); // Stop scrolling while boxing
                this.updateSelectionFromBox();
            }
        },

        endDrag() {
            if (this.isBoxDragging) {
                this.updateSelectionFromBox();
                setTimeout(() => { this.isBoxDragging = false; }, 50); // delay to block immediate clicks
            } else {
                this.isBoxDragging = false;
            }
            window.removeEventListener('mousemove', this.onMouseMove);
            window.removeEventListener('mouseup', this.endDrag);
        },

        endTouchDrag() {
            this.endDrag();
            window.removeEventListener('touchmove', this.onTouchMove);
            window.removeEventListener('touchend', this.endTouchDrag);
        },

        updateSelectionFromBox() {
            const boxRect = {
                left: Math.min(this.startX, this.currentX),
                top: Math.min(this.startY, this.currentY),
                right: Math.max(this.startX, this.currentX),
                bottom: Math.max(this.startY, this.currentY)
            };

            const newSelection = new Set(this.initialSelectionState);
            const elements = document.querySelectorAll('.lesson-item, .grade-header');

            elements.forEach(el => {
                const rect = el.getBoundingClientRect();
                // Check simple bounding box intersection
                if (boxRect.left < rect.right && boxRect.right > rect.left &&
                    boxRect.top < rect.bottom && boxRect.bottom > rect.top) {

                    if (el.classList.contains('lesson-item') && el.dataset.lessonId) {
                        const lessonId = el.dataset.lessonId;
                        if (this.dragAction === 'select') newSelection.add(lessonId);
                        else newSelection.delete(lessonId);
                    } else if (el.classList.contains('grade-header') && el.dataset.groupId) {
                        const groupId = el.dataset.groupId;
                        const group = this.groupedData.find(g => g.id === groupId);
                        if (group) {
                            group.lessons.forEach(l => {
                                if (this.dragAction === 'select') newSelection.add(l.id);
                                else newSelection.delete(l.id);
                            });
                        }
                    }
                }
            });

            this.selectedLessons = Array.from(newSelection);
        },

        onLessonCheckboxChange(e, lessonId) {
            if (this.isBoxDragging) {
                e.preventDefault();
                return;
            }
            this.toggleLesson(lessonId);
        },


        toggleLesson(lessonId) {
            const current = [...this.selectedLessons];
            const index = current.indexOf(lessonId);
            if (index > -1) {
                current.splice(index, 1);
            } else {
                current.push(lessonId);
            }
            this.selectedLessons = current;
        },

        isGroupSelected(group) {
            if (!group.lessons || group.lessons.length === 0) return false;
            return group.lessons.every(lesson => this.selectedLessons.includes(lesson.id));
        },

        isGroupIndeterminate(group) {
            if (!group.lessons || group.lessons.length === 0) return false;
            const selectedCount = group.lessons.filter(lesson => this.selectedLessons.includes(lesson.id)).length;
            return selectedCount > 0 && selectedCount < group.lessons.length;
        },

        toggleGroupSelection(group) {
            const allSelected = this.isGroupSelected(group);
            let newSelection = [...this.selectedLessons];

            if (allSelected) {
                // Unselect all lessons in this group
                group.lessons.forEach(lesson => {
                    const idx = newSelection.indexOf(lesson.id);
                    if (idx > -1) newSelection.splice(idx, 1);
                });
            } else {
                // Select all lessons in this group
                group.lessons.forEach(lesson => {
                    if (!newSelection.includes(lesson.id)) {
                        newSelection.push(lesson.id);
                    }
                });
            }
            this.selectedLessons = newSelection;
        },

        getSelectedChaptersLabel(group) {
            const selectedLessons = group.lessons.filter(lesson =>
                this.selectedLessons.includes(lesson.id)
            );

            if (selectedLessons.length === 0) return '';

            // Extract chapter numbers from "第X課" format
            const chapterNums = selectedLessons
                .map(lesson => {
                    const match = lesson.chapter.match(/第(.+?)課/);
                    return match ? match[1] : null;
                })
                .filter(num => num !== null);

            if (chapterNums.length === 0) return '';

            // Sort by Chinese number value
            chapterNums.sort((a, b) => this.chineseToNumber(a) - this.chineseToNumber(b));

            return `第 ${chapterNums.join('、')} 課`;
        },

        clearSelection() {
            this.selectedLessons = [];
        }
    }
};

// Make it globally available
window.LessonSelector = LessonSelector;
