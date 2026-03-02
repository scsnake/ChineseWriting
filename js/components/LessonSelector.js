// Lesson Selector Component
const LessonSelector = {
    name: 'LessonSelector',
    template: `
        <div class="lesson-selector">
            <h2>📚 選擇課文</h2>
            
            <div class="lesson-selection-container">
                <!-- Left Panel: Filters (1/3) -->
                <div class="selection-sidebar">
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

                    <!-- Slot for extra sidebar content (e.g., Test Config) -->
                    <slot name="sidebar-extras"></slot>
                </div>

                <!-- Right Panel: Lesson List (2/3) -->
                <div class="selection-content">
                    <div v-if="groupedData.length === 0" class="empty-state-text">
                        沒有符合條件的課文
                    </div>

                    <div v-for="group in groupedData" :key="group.id" class="grade-group">
                        <div class="grade-header" @click="toggleGroup(group.id)">
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
                            >
                                <input 
                                    type="checkbox" 
                                    :checked="selectedLessons.includes(lesson.id)"
                                    @change="toggleLesson(lesson.id)"
                                    class="lesson-checkbox"
                                />
                                <div class="lesson-label">
                                    <span class="lesson-chapter">{{ lesson.chapter }}</span>
                                    <span class="lesson-title">{{ lesson.title }}</span>
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
            selectedYear: ''
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

                    const lessons = book.lessons.map(lesson => ({
                        id: DataService.createLessonId(
                            group.publisher,
                            group.tw_year,
                            book.grade,
                            book.semester,
                            lesson.chapter
                        ),
                        chapter: lesson.chapter,
                        title: lesson.title
                    }));

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
            this.rawData = await DataService.getStructuredData();

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
