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

    // Get lesson by ID (format: "publisher_twyear_grade_semester_chapter")
    async getLessonById(lessonId) {
        const data = await this.loadData();
        const [publisher, twYear, grade, semester, chapter] = lessonId.split('_');

        const group = data.find(g => g.publisher === publisher && g.tw_year === twYear);
        if (!group) return null;

        const book = group.books.find(b => b.grade === grade && b.semester === semester);
        if (!book) return null;

        return book.lessons.find(l => l.chapter === chapter);
    },

    // Get all characters from selected lessons
    async getCharactersFromLessons(lessonIds) {
        const characters = [];

        for (const lessonId of lessonIds) {
            const lesson = await this.getLessonById(lessonId);
            if (lesson && lesson.parts && lesson.parts.vocabulary_and_sentences) {
                // Add each character with its context
                lesson.parts.vocabulary_and_sentences.forEach(item => {
                    characters.push({
                        char: item['生字國字'],
                        zhuyin: item['生字注音'],
                        words: item['words'] || (item['本課詞語國字'] ? [item['本課詞語國字']] : []),
                        lessonId: lessonId,
                        lessonTitle: lesson.title
                    });
                });
            }
        }

        return characters;
    },

    // Create lesson ID from components
    createLessonId(publisher, twYear, grade, semester, chapter) {
        return `${publisher}_${twYear}_${grade}_${semester}_${chapter}`;
    },

    // Parse lesson ID
    parseLessonId(lessonId) {
        const [publisher, twYear, grade, semester, chapter] = lessonId.split('_');
        return { publisher, twYear, grade, semester, chapter };
    },

    // Get similar_shapes groups from selected lessons
    async getSimilarShapesFromLessons(lessonIds) {
        const groups = [];

        for (const lessonId of lessonIds) {
            const lesson = await this.getLessonById(lessonId);
            if (!lesson) continue;
            const pa = lesson.parts && lesson.parts.phonetic_analysis;
            if (!pa || !pa.similar_shapes) continue;

            for (const group of pa.similar_shapes) {
                if (!Array.isArray(group) || group.length < 2) continue;
                groups.push({ group, lessonId, lessonTitle: lesson.title });
            }
        }

        return groups;
    },

    // Get multiple_phonetics from selected lessons
    async getMultiplePhoneticsFromLessons(lessonIds) {
        const groups = [];

        for (const lessonId of lessonIds) {
            const lesson = await this.getLessonById(lessonId);
            if (!lesson) continue;
            const pa = lesson.parts && lesson.parts.phonetic_analysis;
            if (!pa || !pa.multiple_phonetics || pa.multiple_phonetics.length === 0) continue;

            for (const item of pa.multiple_phonetics) {
                // item: { character: "...", variants: [ { phonetic: "...", example_phrases: [...] }, ... ] }
                if (item.variants && item.variants.length > 0) {
                    groups.push({ item, lessonId, lessonTitle: lesson.title });
                }
            }
        }

        return groups;
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
    },

    // Get extended_idioms from selected lessons
    async getIdiomsFromLessons(lessonIds) {
        const idioms = [];
        for (const lessonId of lessonIds) {
            const lesson = await this.getLessonById(lessonId);
            if (!lesson) continue;
            const parts = lesson.parts;
            if (!parts || !Array.isArray(parts.extended_idioms)) continue;
            for (const entry of parts.extended_idioms) {
                if (entry.idiom && entry.example_sentence) {
                    idioms.push({
                        idiom: entry.idiom,
                        explanation: entry.explanation || '',
                        example_sentence: entry.example_sentence,
                        lessonId,
                        lessonTitle: lesson.title
                    });
                }
            }
        }
        return idioms;
    }
};

// Make it globally available
window.DataService = DataService;

/* SIGNATURE_START
   [​‌‌‌‌​‌‌‍​​‌​​​‌​‍​‌‌‌​‌​‌‍​‌‌‌​​‌​‍​‌‌​‌‌​​‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​‌​​​‍​‌‌‌​‌​​‍​‌‌‌​‌​​‍​‌‌‌​​​​‍​‌‌‌​​‌‌‍​​‌‌‌​‌​‍​​‌​‌‌‌‌‍​​‌​‌‌‌‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌‌​‌​‌‍​‌‌​​​‌​‍​​‌​‌‌‌​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​‌‌​‌‍​​‌​‌‌‌‌‍​‌‌‌​​‌‌‍​‌‌​​​‌‌‍​‌‌‌​​‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌​‌‌‍​‌‌​​‌​‌‍​​‌​‌‌‌‌‍​‌​​​​‌‌‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌​‌‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌​‌​‌‌‌‍​‌‌‌​​‌​‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌‌‍​​‌​​​‌​‍​​‌​‌‌​​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​​​​‌‍​‌‌‌​‌​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌​‌‌‌‌‍​‌‌‌​​‌​‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌​​​‌​​‍​‌‌​‌​​‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​​​​‌‍​‌‌​‌‌​​‍​​‌​​​​​‍​‌​‌​​‌‌‍​‌‌​‌​​‌‍​‌‌​​‌‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌‌​‌​​‍​‌‌‌​‌​‌‍​‌‌‌​​‌​‍​‌‌​​‌​‌‍​​‌​​​‌​‍​​‌​‌‌​​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​‌‌‌​‍​‌‌​‌‌‌‌‍​‌‌‌​‌​​‍​‌‌​​‌​‌‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌​‌‌​‌‌‍​‌​‌​​‌‌‍​‌​‌‌​​‌‍​‌​‌​​‌‌‍​‌​‌​‌​​‍​‌​​​‌​‌‍​‌​​‌‌​‌‍​​‌‌‌​‌​‍​​‌​​​​​‍​‌​​‌​​‌‍​‌‌​​‌‌​‍​​‌​​​​​‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌‌​​‌‌‍​​‌​​​​​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​​‌​​‍​‌‌​​‌​‌‍​​‌​​​​​‍​‌‌​‌​​‌‍​‌‌‌​​‌‌‍​​‌​​​​​‍​‌‌​​​​‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌‌​​‍​‌‌‌‌​​‌‍​‌‌‌‌​‌​‍​‌‌​​‌​‌‍​‌‌​​‌​​‍​​‌​‌‌​​‍​​‌​​​​​‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌‌​​‌​‌‍​​‌​​​​​‍​‌‌​‌​​​‍​‌‌‌​‌​​‍​‌‌‌​‌​​‍​‌‌‌​​​​‍​‌‌‌​​‌‌‍​​‌‌‌​‌​‍​​‌​‌‌‌‌‍​​‌​‌‌‌‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌‌​‌​‌‍​‌‌​​​‌​‍​​‌​‌‌‌​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​‌‌​‌‍​​‌​‌‌‌‌‍​‌‌‌​​‌‌‍​‌‌​​​‌‌‍​‌‌‌​​‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌​‌‌‍​‌‌​​‌​‌‍​​‌​‌‌‌‌‍​‌​​​​‌‌‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌​‌‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌​‌​‌‌‌‍​‌‌‌​​‌​‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌‌‍​​‌​​​​​‍​‌‌​​‌‌​‍​‌‌​‌‌‌‌‍​‌‌‌​​‌​‍​​‌​​​​​‍​‌‌‌​​​​‍​‌‌‌​​‌​‍​‌‌​‌‌‌‌‍​‌‌​‌​‌​‍​‌‌​​‌​‌‍​‌‌​​​‌‌‍​‌‌‌​‌​​‍​​‌​​​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌​‍​‌‌​‌‌‌‌‍​​‌​‌‌‌​‍​‌​‌‌‌​‌‍​​‌​​​‌​‍​‌‌‌‌‌​‌‍​‌‌‌‌‌​​‍​‌​‌​​‌‌‍​‌​​‌​​‌‍​‌​​​‌‌‌‍​​‌‌‌​‌​‍​‌​​​​‌‌‍​‌​​​​‌​‍​‌‌​​‌​‌‍​‌‌​​‌​‌‍​‌‌‌​‌​​‍​‌​​‌‌​‌‍​‌‌​‌‌​​‍​‌‌‌​​‌‌‍​​‌‌​​‌​‍​‌‌‌‌​​​‍​‌‌​‌‌‌​‍​​‌​‌‌‌‌‍​‌​‌‌​‌​‍​‌​​‌‌‌‌‍​‌‌​‌‌​‌‍​‌‌‌​‌​​‍​‌‌‌‌​​‌‍​‌​​‌‌‌‌‍​‌​‌‌​‌​‍​‌‌​‌​​​‍​‌​​‌​‌‌‍​‌​​​​‌‌‍​‌‌​‌​‌‌‍​‌‌‌​‌​​‍​‌​‌​​​​‍​‌‌​‌‌​​‍​‌​​‌‌‌​‍​​‌‌‌​​‌‍​‌‌‌​‌​​‍​‌​‌​‌‌​‍​‌​‌​‌‌​‍​​‌‌​‌​​‍​‌‌‌​‌‌​‍​​‌‌​​‌‌‍​‌​‌​‌​‌‍​‌​​​​​‌‍​​‌‌‌​​​‍​‌‌‌​​​‌‍​‌​​‌​​‌‍​‌‌‌​‌‌‌‍​‌​‌​‌‌‌‍​​‌‌​​​​‍​‌‌‌‌​‌​‍​‌‌​‌​‌‌‍​‌‌​​​​‌‍​‌‌​‌‌​‌‍​​‌‌​​​‌‍​‌‌‌​‌‌​‍​‌‌‌​​​‌‍​‌​​​​​‌‍​‌​​‌​​‌‍​‌‌​‌​​‌‍​‌​​‌​​​‍​‌​​​​‌​‍​‌​‌‌​‌​‍​‌‌‌‌​​​‍​‌​​​​‌​‍​‌​‌‌​‌​‍​‌​‌​​‌​‍​‌​‌​​‌‌‍​‌​​‌​‌‌‍​​‌‌​‌‌​‍​‌​​‌‌‌​‍​‌​​​‌‌​‍​‌​​‌​‌​‍​‌​‌‌​​‌‍​‌‌‌​​‌​‍​‌​​‌‌​​‍​‌​​‌​​​‍​‌‌‌​​‌​‍​​‌‌​​​‌‍​​‌‌‌​​‌‍​​‌‌​​‌‌‍​‌​​‌​‌​‍​‌​‌​​‌​‍​‌‌‌‌​​‌‍​‌​‌‌​​‌‍​‌‌​‌‌‌​‍​​‌‌​‌​‌‍​‌‌​‌‌‌​‍​‌‌‌​​‌​‍​‌​​​​​‌‍​​‌​‌​‌‌‍​‌​​​​‌​‍​‌​​​‌​​‍​‌‌‌​‌‌‌‍​​‌‌‌‌​‌‍​​‌‌‌‌​‌‍]
   SIGNATURE_END */
