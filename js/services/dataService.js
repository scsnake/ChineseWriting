// Data Service for loading and managing words.json
const DataService = {
    data: null,
    
    // Load words.json
    async loadData() {
        if (this.data) return this.data;
        
        try {
            const response = await fetch('words.json');
            if (!response.ok) throw new Error('Failed to load words.json');
            this.data = await response.json();
            return this.data;
        } catch (error) {
            console.error('Error loading words.json:', error);
            throw error;
        }
    },

    // Get all data structured for lesson selector
    async getStructuredData() {
        const data = await this.loadData();
        return data;
    },

    // Get lesson by ID (format: "grade_semester_book_chapter")
    async getLessonById(lessonId) {
        const data = await this.loadData();
        const [gradeName, semesterName, bookType, chapter] = lessonId.split('_');
        
        for (const gradeGroup of data) {
            if (gradeGroup.grade === gradeName && gradeGroup.semester === semesterName && gradeGroup.book_type === bookType) {
                return gradeGroup.lessons.find(lesson => lesson.chapter === chapter);
            }
        }
        return null;
    },

    // Get all characters from selected lessons
    async getCharactersFromLessons(lessonIds) {
        const characters = [];
        
        for (const lessonId of lessonIds) {
            const lesson = await this.getLessonById(lessonId);
            if (lesson && lesson.new_characters) {
                // Add each character with its context
                lesson.new_characters.forEach(charData => {
                    characters.push({
                        char: charData.char,
                        zhuyin: charData.zhuyin,
                        words: charData.words || [],
                        lessonId: lessonId,
                        lessonTitle: lesson.title
                    });
                });
            }
        }
        
        return characters;
    },

    // Create lesson ID from components
    createLessonId(grade, semester, bookType, chapter) {
        return `${grade}_${semester}_${bookType}_${chapter}`;
    },

    // Parse lesson ID
    parseLessonId(lessonId) {
        const [grade, semester, bookType, chapter] = lessonId.split('_');
        return { grade, semester, bookType, chapter };
    },

    // Get lesson title by ID
    async getLessonTitle(lessonId) {
        const lesson = await this.getLessonById(lessonId);
        return lesson ? lesson.title : '';
    },

    // Get multiple lesson titles
    async getLessonTitles(lessonIds) {
        const titles = [];
        for (const lessonId of lessonIds) {
            const title = await this.getLessonTitle(lessonId);
            if (title) titles.push(title);
        }
        return titles;
    }
};

// Make it globally available
window.DataService = DataService;
