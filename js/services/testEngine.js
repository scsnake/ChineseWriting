// Test Engine for generating questions
const TestEngine = {
    // Generate test questions
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
        const word = question.contextWord;
        const targetChar = question.targetChar;
        
        // Find position of target character in word
        const charIndex = word.indexOf(targetChar);
        
        if (charIndex === -1) {
            // Character not found in word, just show the word
            return word;
        }
        
        // Build display with underlined portion
        let display = '';
        for (let i = 0; i < word.length; i++) {
            if (i === charIndex) {
                if (question.type === 'char') {
                    // Show zhuyin, user writes character
                    display += `<span class="test-item">${question.targetZhuyin}</span>`;
                } else {
                    // Show character, user writes zhuyin
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
