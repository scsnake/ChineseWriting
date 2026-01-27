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
                            <span class="grade-title">{{ group.label }}</span>
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
                                <span class="lesson-label">
                                    {{ lesson.chapter }} {{ lesson.title }}
                                </span>
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
                const matchYear = !this.selectedYear || item.year === this.selectedYear;
                return matchPublisher && matchYear;
            });
        },
        // Group the filtered data
        groupedData() {
            const grouped = {};

            this.filteredRawData.forEach(item => {
                const key = `${item.grade}_${item.semester}`;

                if (!grouped[key]) {
                    grouped[key] = {
                        grade: item.grade,
                        semester: item.semester,
                        lessons: []
                    };
                }

                // Add all lessons from this book
                item.lessons.forEach(lesson => {
                    grouped[key].lessons.push({
                        ...lesson,
                        bookType: item.book_type
                    });
                });
            });

            // Convert to array and sort groups
            return Object.entries(grouped).map(([key, data]) => {
                const gradeNum = data.grade.replace('年級', '');
                const semesterAbbr = data.semester.replace('學期', '');
                const label = `${gradeNum}${semesterAbbr}`;

                // Initialize expanded state if not set (default to false/collapsed)
                if (this.expandedGroups[key] === undefined) {
                    this.expandedGroups[key] = false;
                }

                // Map lessons
                const lessons = data.lessons.map(lesson => ({
                    id: DataService.createLessonId(
                        data.grade,
                        data.semester,
                        lesson.bookType,
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
                        const numA = this.chineseToNumber(matchA[1]);
                        const numB = this.chineseToNumber(matchB[1]);
                        return numA - numB;
                    }
                    return 0;
                });

                return {
                    id: key,
                    label: label,
                    lessons: lessons
                };
            }).sort((a, b) => {
                // Extract grade numbers (e.g., "一年級" -> "一")
                const gradeA = a.id.split('_')[0].replace('年級', '');
                const gradeB = b.id.split('_')[0].replace('年級', '');

                const numA = this.chineseToNumber(gradeA);
                const numB = this.chineseToNumber(gradeB);

                if (numA !== numB) {
                    return numA - numB;
                }

                // If grades are same, sort by semester (上 before 下)
                // "上學期" -> 1, "下學期" -> 2
                const semA = a.id.includes('上學期') ? 1 : 2;
                const semB = b.id.includes('上學期') ? 1 : 2;

                return semA - semB;
            });
        }
    },
    async mounted() {
        await this.loadData();
    },
    methods: {
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
                if (item.year) years.add(item.year);
            });

            this.publishers = Array.from(publishers).sort();
            // Sort years descending (newest first)
            this.years = Array.from(years).sort((a, b) => {
                // Try numeric sort
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
                this.selectedYear = this.years[0]; // First is newest due to sort
            }
        },

        toggleGroup(groupId) {
            this.expandedGroups[groupId] = !this.expandedGroups[groupId];
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

        clearSelection() {
            this.selectedLessons = [];
        }
    }
};

// Make it globally available
window.LessonSelector = LessonSelector;
