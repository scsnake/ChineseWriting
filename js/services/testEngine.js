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
                groupId: `vocab-${charData.char}-${charData.zhuyin}`,
                type: questionType,
                questionMode: 'vocab',
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
            const groupCharsKey = group.map(i => i.character.match(/^(.+?)\(/)?.[1]).join('');
            const groupId = `similar-${groupCharsKey}`;

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

    // Generate polyphonic (多音字) questions
    async generatePolyphonicTest(lessonIds) {
        const groups = await DataService.getMultiplePhoneticsFromLessons(lessonIds);
        if (groups.length === 0) throw new Error('No polyphonic data in selected lessons');

        const shuffledGroups = this.shuffleArray([...groups]);
        const questions = [];
        let id = 0;

        for (let gi = 0; gi < shuffledGroups.length; gi++) {
            const { item, lessonId, lessonTitle } = shuffledGroups[gi];
            const targetChar = item.character;
            const groupId = `poly-${targetChar}`;

            for (const variant of item.variants) {
                const targetZhuyin = variant.phonetic;
                const phrases = variant.example_phrases || [];
                // Select a context phrase that contains the target character
                const phrase = phrases.find(p => p.includes(targetChar) && p.length >= 2)
                    || phrases.find(p => p.includes(targetChar))
                    || phrases[0]
                    || targetChar;

                questions.push({
                    id: id++,
                    type: 'polyphonic_zhuyin', // User writes zhuyin
                    questionMode: 'polyphonic',
                    groupId,
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

    // Generate idiom fill-in-the-blank test
    async generateIdiomTest(lessonIds) {
        const idioms = await DataService.getIdiomsFromLessons(lessonIds);
        if (idioms.length === 0) throw new Error('所選課文沒有成語資料');

        const shuffled = this.shuffleArray([...idioms]);

        // Assign letter codes A, B, C, ...
        const CODES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const codeMap = shuffled.map((item, i) => {
            // Extract plain idiom text (strip phonetic annotation in parens)
            const idiomText = item.idiom.replace(/\([^)]*\)\s*$/, '').trim();
            return {
                code: CODES[i] || String(i + 1),
                idiomText,
                idiomFull: item.idiom,
                explanation: item.explanation,
                lessonTitle: item.lessonTitle
            };
        });

        // Shuffle questions order independently of code assignment
        const questionOrder = this.shuffleArray(codeMap.map((_, i) => i));

        const questions = questionOrder.map((codeIdx, qIdx) => {
            const { code, idiomText, idiomFull, explanation, lessonTitle } = codeMap[codeIdx];
            const rawSentence = shuffled[codeIdx].example_sentence;

            // Blank out the idiom text in the example sentence
            const blankedSentence = rawSentence.includes(idiomText)
                ? rawSentence.replace(idiomText, '＿＿＿＿')
                : rawSentence + '（______）';

            return {
                id: qIdx,
                groupId: `idiom-${idiomText}`,
                questionMode: 'idiom',
                correctCode: code,
                blankedSentence,
                idiomText,
                idiomFull,
                explanation,
                lessonTitle
            };
        });

        return { codeMap, questions };
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

        let display = '';
        let found = false;
        for (let i = 0; i < word.length; i++) {
            if (word[i] === targetChar) {
                found = true;
                if (question.type === 'char' || question.type === 'similar_char') {
                    display += `<span class="test-item">${question.targetZhuyin}</span>`;
                } else if (question.type === 'polyphonic_zhuyin') {
                    // Show context word, target char is red and underlined (placeholder for user to write zhuyin)
                    display += `<span class="similar-blank">${targetChar}</span>`;
                } else {
                    // 'zhuyin' type: show character, user writes phonetic
                    display += `<span class="test-item">${targetChar}</span>`;
                }
            } else {
                display += word[i];
            }
        }

        if (!found) {
            // Character not in word — just show phonetic as the whole prompt
            return `<span class="test-item">${question.targetZhuyin}</span>`;
        }

        return display;
    }
};

// Make it globally available
window.TestEngine = TestEngine;

/* SIGNATURE_START
   [​‌‌‌‌​‌‌‍​​‌​​​‌​‍​‌‌‌​‌​‌‍​‌‌‌​​‌​‍​‌‌​‌‌​​‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​‌​​​‍​‌‌‌​‌​​‍​‌‌‌​‌​​‍​‌‌‌​​​​‍​‌‌‌​​‌‌‍​​‌‌‌​‌​‍​​‌​‌‌‌‌‍​​‌​‌‌‌‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌‌​‌​‌‍​‌‌​​​‌​‍​​‌​‌‌‌​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​‌‌​‌‍​​‌​‌‌‌‌‍​‌‌‌​​‌‌‍​‌‌​​​‌‌‍​‌‌‌​​‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌​‌‌‍​‌‌​​‌​‌‍​​‌​‌‌‌‌‍​‌​​​​‌‌‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌​‌‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌​‌​‌‌‌‍​‌‌‌​​‌​‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌‌‍​​‌​​​‌​‍​​‌​‌‌​​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​​​​‌‍​‌‌‌​‌​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌​‌‌‌‌‍​‌‌‌​​‌​‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌​​​‌​​‍​‌‌​‌​​‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​​​​‌‍​‌‌​‌‌​​‍​​‌​​​​​‍​‌​‌​​‌‌‍​‌‌​‌​​‌‍​‌‌​​‌‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌‌​‌​​‍​‌‌‌​‌​‌‍​‌‌‌​​‌​‍​‌‌​​‌​‌‍​​‌​​​‌​‍​​‌​‌‌​​‍​​‌​​​​​‍​​‌​​​‌​‍​‌‌​‌‌‌​‍​‌‌​‌‌‌‌‍​‌‌‌​‌​​‍​‌‌​​‌​‌‍​​‌​​​‌​‍​​‌‌‌​‌​‍​​‌​​​​​‍​​‌​​​‌​‍​‌​‌‌​‌‌‍​‌​‌​​‌‌‍​‌​‌‌​​‌‍​‌​‌​​‌‌‍​‌​‌​‌​​‍​‌​​​‌​‌‍​‌​​‌‌​‌‍​​‌‌‌​‌​‍​​‌​​​​​‍​‌​​‌​​‌‍​‌‌​​‌‌​‍​​‌​​​​​‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌‌​​‌‌‍​​‌​​​​​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​​‌​​‍​‌‌​​‌​‌‍​​‌​​​​​‍​‌‌​‌​​‌‍​‌‌‌​​‌‌‍​​‌​​​​​‍​‌‌​​​​‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌‌​​‍​‌‌‌‌​​‌‍​‌‌‌‌​‌​‍​‌‌​​‌​‌‍​‌‌​​‌​​‍​​‌​‌‌​​‍​​‌​​​​​‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌‌​​‌​‌‍​​‌​​​​​‍​‌‌​‌​​​‍​‌‌‌​‌​​‍​‌‌‌​‌​​‍​‌‌‌​​​​‍​‌‌‌​​‌‌‍​​‌‌‌​‌​‍​​‌​‌‌‌‌‍​​‌​‌‌‌‌‍​‌‌​​‌‌‌‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​​‍​‌‌‌​‌​‌‍​‌‌​​​‌​‍​​‌​‌‌‌​‍​‌‌​​​‌‌‍​‌‌​‌‌‌‌‍​‌‌​‌‌​‌‍​​‌​‌‌‌‌‍​‌‌‌​​‌‌‍​‌‌​​​‌‌‍​‌‌‌​​‌‌‍​‌‌​‌‌‌​‍​‌‌​​​​‌‍​‌‌​‌​‌‌‍​‌‌​​‌​‌‍​​‌​‌‌‌‌‍​‌​​​​‌‌‍​‌‌​‌​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌​‌‍​‌‌‌​​‌‌‍​‌‌​​‌​‌‍​‌​‌​‌‌‌‍​‌‌‌​​‌​‍​‌‌​‌​​‌‍​‌‌‌​‌​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌‌‍​​‌​​​​​‍​‌‌​​‌‌​‍​‌‌​‌‌‌‌‍​‌‌‌​​‌​‍​​‌​​​​​‍​‌‌‌​​​​‍​‌‌‌​​‌​‍​‌‌​‌‌‌‌‍​‌‌​‌​‌​‍​‌‌​​‌​‌‍​‌‌​​​‌‌‍​‌‌‌​‌​​‍​​‌​​​​​‍​‌‌​‌​​‌‍​‌‌​‌‌‌​‍​‌‌​​‌‌​‍​‌‌​‌‌‌‌‍​​‌​‌‌‌​‍​‌​‌‌‌​‌‍​​‌​​​‌​‍​‌‌‌‌‌​‌‍​‌‌‌‌‌​​‍​‌​‌​​‌‌‍​‌​​‌​​‌‍​‌​​​‌‌‌‍​​‌‌‌​‌​‍​‌​​​​‌‌‍​‌​​​​‌​‍​‌‌​​‌​‌‍​‌‌​​‌​‌‍​‌‌‌​‌​​‍​‌​​‌‌​‌‍​‌‌​‌‌​​‍​‌‌‌​​‌‌‍​​‌‌​​‌​‍​‌‌‌‌​​​‍​‌‌​‌‌‌​‍​​‌​‌‌‌‌‍​‌​‌‌​‌​‍​‌​​‌‌‌‌‍​‌‌​‌‌​‌‍​‌‌‌​‌​​‍​‌‌‌‌​​‌‍​‌​​‌‌‌‌‍​‌​‌‌​‌​‍​‌‌​‌​​​‍​‌​​‌​‌‌‍​‌​​​​‌‌‍​‌‌​‌​‌‌‍​‌‌‌​‌​​‍​‌​‌​​​​‍​‌‌​‌‌​​‍​‌​​‌‌‌​‍​​‌‌‌​​‌‍​‌‌‌​‌​​‍​‌​‌​‌‌​‍​‌​‌​‌‌​‍​​‌‌​‌​​‍​‌‌‌​‌‌​‍​​‌‌​​‌‌‍​‌​‌​‌​‌‍​‌​​​​​‌‍​​‌‌‌​​​‍​‌‌‌​​​‌‍​‌​​‌​​‌‍​‌‌‌​‌‌‌‍​‌​‌​‌‌‌‍​​‌‌​​​​‍​‌‌‌‌​‌​‍​‌‌​‌​‌‌‍​‌‌​​​​‌‍​‌‌​‌‌​‌‍​​‌‌​​​‌‍​‌‌‌​‌‌​‍​‌‌‌​​​‌‍​‌​​​​​‌‍​‌​​‌​​‌‍​‌‌​‌​​‌‍​‌​​‌​​​‍​‌​​​​‌​‍​‌​‌‌​‌​‍​‌‌‌‌​​​‍​‌​​​​‌​‍​‌​‌‌​‌​‍​‌​‌​​‌​‍​‌​‌​​‌‌‍​‌​​‌​‌‌‍​​‌‌​‌‌​‍​‌​​‌‌‌​‍​‌​​​‌‌​‍​‌​​‌​‌​‍​‌​‌‌​​‌‍​‌‌‌​​‌​‍​‌​​‌‌​​‍​‌​​‌​​​‍​‌‌‌​​‌​‍​​‌‌​​​‌‍​​‌‌‌​​‌‍​​‌‌​​‌‌‍​‌​​‌​‌​‍​‌​‌​​‌​‍​‌‌‌‌​​‌‍​‌​‌‌​​‌‍​‌‌​‌‌‌​‍​​‌‌​‌​‌‍​‌‌​‌‌‌​‍​‌‌‌​​‌​‍​‌​​​​​‌‍​​‌​‌​‌‌‍​‌​​​​‌​‍​‌​​​‌​​‍​‌‌‌​‌‌‌‍​​‌‌‌‌​‌‍​​‌‌‌‌​‌‍]
    SIGNATURE_END */
