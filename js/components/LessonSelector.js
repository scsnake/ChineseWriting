// Lesson Selector Component
const LessonSelector = {
    name: 'LessonSelector',
    template: `
        <div class="lesson-selector">
            <h2>📚 選擇課文</h2>
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
            groupedData: [],
            expandedGroups: {}
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
            const rawData = await DataService.getStructuredData();
            
            // Group by grade+semester, merge all book types
            const grouped = {};
            
            rawData.forEach(item => {
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
            
            // Convert to array and create abbreviated labels
            this.groupedData = Object.entries(grouped).map(([key, data]) => {
                const gradeNum = data.grade.replace('年級', '');
                const semesterAbbr = data.semester.replace('學期', '');
                const label = `${gradeNum}${semesterAbbr}`;
                
                // Initialize expanded state
                this.expandedGroups[key] = false;
                
                // Map lessons and sort by Chinese numeral in chapter
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
                
                // Sort lessons by extracting Chinese numeral from "第X課"
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
            });
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
        }
    }
};

// Make it globally available
window.LessonSelector = LessonSelector;
