// Test Page Component
const TestPage = {
    name: 'TestPage',
    template: `
        <div class="test-container">
            <div class="progress-bar">
                第 {{ currentIndex + 1 }} 題 / 共 {{ questions.length }} 題
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
            canvasSize: 300
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
    beforeUnmount() {
        window.removeEventListener('resize', this.adjustCanvasSize);
    },
    methods: {
        initTest() {
            // Get session and questions from route params
            this.sessionId = this.$route.params.sessionId;

            try {
                this.questions = JSON.parse(this.$route.params.questions);
            } catch (error) {
                console.error('Error parsing questions:', error);
                alert('測驗資料錯誤');
                this.$router.push({ name: 'home' });
            }
        },

        adjustCanvasSize() {
            // Adjust canvas size based on screen width
            const maxWidth = window.innerWidth - 40; // 20px padding on each side
            if (maxWidth < 300) {
                this.canvasSize = maxWidth;
            } else if (maxWidth > 400) {
                this.canvasSize = 400;
            } else {
                this.canvasSize = 300;
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
