// Test Engine for generating questions
const TestEngine = {
    // Generate test questions (vocabulary)
    async generateTest(lessonIds, testCount, testType) {
        // Get all characters from selected lessons
        const characters = await DataService.getCharactersFromLessons(lessonIds);

        if (characters.length === 0) {
            throw new Error('No characters found in selected lessons');
        }

        // Shuffle characters
        const shuffled = this.shuffleArray([...characters]);

        // Take the required number (or all if less available)
        const selectedChars = shuffled.slice(0, Math.min(testCount, shuffled.length));

        // Generate questions based on test type
        const questions = [];

        for (let i = 0; i < selectedChars.length; i++) {
            const charData = selectedChars[i];
            let questionType;

            // Determine question type
            if (testType === 'mixed') {
                questionType = Math.random() < 0.5 ? 'char' : 'zhuyin';
            } else {
                questionType = testType;
            }

            // Select a context word (prefer 2-character words)
            const contextWord = this.selectContextWord(charData.char, charData.words);

            questions.push({
                id: i,
                type: questionType,
                targetChar: charData.char,
                targetZhuyin: charData.zhuyin,
                contextWord: contextWord,
                lessonTitle: charData.lessonTitle
            });
        }

        return questions;
    },

    // Generate similar-shapes (形近字) questions
    // Returns questions grouped: same groupId = same display page
    async generateSimilarShapesTest(lessonIds) {
        const groups = await DataService.getSimilarShapesFromLessons(lessonIds);
        if (groups.length === 0) throw new Error('No similar shapes data in selected lessons');

        // Shuffle the groups (not individual questions)
        const shuffledGroups = this.shuffleArray([...groups]);

        const questions = [];
        let id = 0;

        for (let gi = 0; gi < shuffledGroups.length; gi++) {
            const { group, lessonId, lessonTitle } = shuffledGroups[gi];
            const groupId = gi; // stable identifier for this group

            for (const item of group) {
                // item: { character: "池(ㄔˊ)", example_phrases: ["池塘", "水池"] }
                const charMatch = item.character.match(/^(.+?)\((.+?)\)$/);
                if (!charMatch) continue;
                const targetChar = charMatch[1];
                const targetZhuyin = charMatch[2];

                // Pick best phrase (prefer 2-char words containing the target char)
                const phrases = item.example_phrases || [];
                const phrase = phrases.find(p => p.includes(targetChar) && p.length === 2)
                    || phrases.find(p => p.includes(targetChar))
                    || phrases[0]
                    || targetChar;

                questions.push({
                    id: id++,
                    type: 'similar_char',
                    questionMode: 'similar_shapes',
                    groupId,          // same groupId → shown on same page
                    targetChar,
                    targetZhuyin,
                    contextWord: phrase,
                    lessonId,
                    lessonTitle
                });
            }
        }

        return questions;
    },

    // Select best context word for display
    selectContextWord(targetChar, words) {
        if (!words || words.length === 0) {
            return targetChar;
        }

        // Prefer 2-character words
        const twoCharWords = words.filter(w => w.length === 2);
        if (twoCharWords.length > 0) {
            return twoCharWords[0];
        }

        // Otherwise use first available word
        return words[0];
    },

    // Shuffle array using Fisher-Yates algorithm
    shuffleArray(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },

    // Get display text for question
    getQuestionDisplay(question) {
        // Both similar_shapes and standard 'char' type: show zhuyin, user writes character
        const word = question.contextWord || question.targetChar;
        const targetChar = question.targetChar;
        const charIndex = word.indexOf(targetChar);

        if (charIndex === -1) {
            // Character not in word — just show phonetic as the whole prompt
            return `<span class="test-item">${question.targetZhuyin}</span>`;
        }

        let display = '';
        for (let i = 0; i < word.length; i++) {
            if (i === charIndex) {
                if (question.type === 'char' || question.type === 'similar_char') {
                    display += `<span class="test-item">${question.targetZhuyin}</span>`;
                } else {
                    // 'zhuyin' type: show character, user writes phonetic
                    display += `<span class="test-item">${targetChar}</span>`;
                }
            } else {
                display += word[i];
            }
        }
        return display;
    }
};

// Make it globally available
window.TestEngine = TestEngine;
