// Data Service for loading and managing words.json
const DataService = {
    data: null,

    // Load words.json
    async loadData() {
        if (this.data) return this.data;

        try {
            const response = await fetch('words.json?t=' + Date.now());
            if (!response.ok) throw new Error(`Failed to load words.json: ${response.status} ${response.statusText}`);
            const parsed = await response.json();
            if (!Array.isArray(parsed)) throw new Error('words.json: expected top-level array');
            this.data = parsed;
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

    // Normalize a lesson's parts across schema variants.
    // Gemini has produced two shapes so far:
    //   Standard:  parts.phonetic_analysis = { similar_shapes: [...], multiple_phonetics: [...] }
    //              parts.key_sentences    = { phrase_practice: [...], sentence_practice: [...] }
    //              parts.extended_idioms  = [...]
    //   Variant (114 二下 L8): parts.phonetic_analysis is a FLAT array of characters,
    //              parts.multiple_phonetics sits at parts level (may be empty),
    //              key_sentences sits at LESSON level (sibling of parts),
    //              extended_idioms is nested INSIDE key_sentences.
    // This helper returns a uniform shape callers can rely on.
    normalizeParts(lesson) {
        if (!lesson) return { vocab: [], similarShapes: [], multiplePhonetics: [], keySentences: {}, idioms: [] };
        const parts = lesson.parts || {};
        const paObj = parts.phonetic_analysis;
        const paIsFlat = Array.isArray(paObj);

        // Similar shapes: standard = paObj.similar_shapes (array of arrays); variant = flat list wrapped as one group
        let similarShapes;
        if (paIsFlat) {
            similarShapes = paObj.length ? [paObj] : [];
        } else {
            similarShapes = Array.isArray(paObj?.similar_shapes) ? paObj.similar_shapes : [];
        }

        // Multiple phonetics: standard = paObj.multiple_phonetics; variant = parts.multiple_phonetics
        let multiplePhonetics = paIsFlat
            ? (Array.isArray(parts.multiple_phonetics) ? parts.multiple_phonetics : [])
            : (Array.isArray(paObj?.multiple_phonetics) ? paObj.multiple_phonetics : []);

        // Key sentences may be at parts level OR lesson level
        const keySentences = parts.key_sentences || lesson.key_sentences || {};

        // Extended idioms: standard = parts.extended_idioms; variant = key_sentences.extended_idioms
        const idioms = Array.isArray(parts.extended_idioms)
            ? parts.extended_idioms
            : (Array.isArray(keySentences.extended_idioms) ? keySentences.extended_idioms : []);

        return {
            vocab: Array.isArray(parts.vocabulary_and_sentences) ? parts.vocabulary_and_sentences : [],
            similarShapes,
            multiplePhonetics,
            keySentences,
            idioms,
            _paIsFlat: paIsFlat
        };
    },

    // Get lesson by ID (format: "publisher_twyear_grade_semester_chapter")
    async getLessonById(lessonId) {
        const data = await this.loadData();
        const [publisher, twYear, grade, semester, chapter] = lessonId.split('_');

        const group = data.find(g => g.publisher === publisher && g.tw_year === twYear);
        if (!group || !Array.isArray(group.books)) return null;

        const book = group.books.find(b => b.grade === grade && b.semester === semester);
        if (!book || !Array.isArray(book.lessons)) return null;

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
            const { similarShapes } = this.normalizeParts(lesson);
            for (const group of similarShapes) {
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
            const { multiplePhonetics } = this.normalizeParts(lesson);
            for (const item of multiplePhonetics) {
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
            const { idioms: lessonIdioms } = this.normalizeParts(lesson);
            for (const entry of lessonIdioms) {
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
