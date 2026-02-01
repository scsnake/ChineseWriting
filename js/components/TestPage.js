// Test Page Component
const TestPage = {
    name: 'TestPage',
    template: `
        <div class="test-container">
            <div class="progress-bar">
                第 {{ currentIndex + 1 }} 題 / 共 {{ questions.length }} 題
                <button class="btn-star" @click="toggleStar" :class="{ 'active': isStarred }">
                    {{ isStarred ? '★' : '☆' }}
                </button>
                <button class="btn-star btn-question" @click="toggleQuestionable" :class="{ 'active': isQuestionable }">
                    {{ isQuestionable ? '?' : '?' }}
                </button>
            </div>
            
            <div class="question-display">
                <div class="question-word" v-html="currentQuestionDisplay"></div>
                
                <handwriting-canvas 
                    ref="canvas"
                    :canvas-size="canvasSize"
                ></handwriting-canvas>
            </div>
            
            <div class="test-actions">
                <button 
                    v-if="currentIndex > 0" 
                    @click="prevQuestion" 
                    class="btn btn-secondary"
                >
                    ← 上一題
                </button>
                <button @click="clearCanvas" class="btn btn-secondary">
                    清除
                </button>
                <button @click="nextQuestion" class="btn btn-primary">
                    {{ isLastQuestion ? '完成' : '下一題' }} →
                </button>
            </div>
        </div>
    `,
    components: {
        HandwritingCanvas
    },
    data() {
        return {
            sessionId: '',
            questions: [],
            currentIndex: 0,
            canvasSize: 300,
            isStarred: false,
            isQuestionable: false
        };
    },
    computed: {
        currentQuestion() {
            return this.questions[this.currentIndex];
        },
        currentQuestionDisplay() {
            if (!this.currentQuestion) return '';
            return TestEngine.getQuestionDisplay(this.currentQuestion);
        },
        isLastQuestion() {
            return this.currentIndex === this.questions.length - 1;
        }
    },
    mounted() {
        this.initTest();
        this.adjustCanvasSize();
        window.addEventListener('resize', this.adjustCanvasSize);
    },
    watch: {
        currentIndex() {
            this.checkStarStatus();
        }
    },
    beforeUnmount() {
        window.removeEventListener('resize', this.adjustCanvasSize);
    },
    methods: {
        initTest() {
            // Get session and questions from route params
            this.sessionId = this.$route.params.sessionId;

            try {
                this.questions = JSON.parse(this.$route.params.questions);
                this.checkStarStatus();
            } catch (error) {
                console.error('Error parsing questions:', error);
                alert('測驗資料錯誤');
                this.$router.push({ name: 'home' });
            }
        },

        async checkStarStatus() {
            if (!this.currentQuestion) return;
            try {
                this.isStarred = await StorageService.isStarred(this.currentQuestion);
                this.isQuestionable = await StorageService.isQuestionable(this.currentQuestion);
            } catch (e) {
                console.error('Error checking status:', e);
            }
        },

        async toggleStar() {
            if (!this.currentQuestion) return;
            try {
                this.isStarred = await StorageService.toggleStar(this.currentQuestion);
            } catch (e) {
                console.error('Error toggling star:', e);
            }
        },

        async toggleQuestionable() {
            if (!this.currentQuestion) return;
            try {
                this.isQuestionable = await StorageService.toggleQuestionable(this.currentQuestion);
            } catch (e) {
                console.error('Error toggling questionable:', e);
            }
        },

        adjustCanvasSize() {
            // Adjust canvas size based on screen width and height availability
            const maxWidth = window.innerWidth - 40; // 20px padding on each side
            // Reserve space for header (~60px), progress (~50px), word (~100px), buttons (~80px) + padding
            const maxHeight = window.innerHeight - 350;

            const availableSize = Math.min(maxWidth, maxHeight);

            if (availableSize < 300) {
                this.canvasSize = 300;
            } else if (availableSize > 800) {
                this.canvasSize = 800; // Cap at 800px instead of 400px
            } else {
                this.canvasSize = availableSize;
            }
        },

        clearCanvas() {
            this.$refs.canvas.clear();
        },

        async saveCurrentAnswer() {
            const canvas = this.$refs.canvas;
            if (canvas.isEmpty()) return; // Don't save empty canvas

            try {
                const blob = await canvas.getBlob();
                await StorageService.saveAnswer(
                    this.sessionId,
                    this.currentIndex,
                    this.currentQuestion.type,
                    this.currentQuestion.targetChar,
                    this.currentQuestion.targetZhuyin,
                    this.currentQuestion.contextWord,
                    blob
                );
            } catch (error) {
                console.error('Error saving answer:', error);
                // Non-blocking error
            }
        },

        async prevQuestion() {
            // Save current work before going back
            await this.saveCurrentAnswer();

            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.clearCanvas();
                // TODO: Load previous answer if exists
            }
        },

        async nextQuestion() {
            const canvas = this.$refs.canvas;

            // Check if canvas is empty
            if (canvas.isEmpty()) {
                const confirm = window.confirm('尚未作答，確定要繼續嗎？');
                if (!confirm) return;
            }

            try {
                // Save answer
                await this.saveCurrentAnswer();

                // Move to next question or complete test
                if (this.isLastQuestion) {
                    this.completeTest();
                } else {
                    this.currentIndex++;
                    this.clearCanvas();
                }
            } catch (error) {
                console.error('Error saving/next:', error);
                alert('發生錯誤');
            }
        },

        completeTest() {
            // Navigate to review page with session ID
            this.$router.push({
                name: 'review',
                params: { sessionId: this.sessionId }
            });
        }
    }
};

// Make it globally available
window.TestPage = TestPage;
