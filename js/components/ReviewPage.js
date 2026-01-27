// Review Page Component
const ReviewPage = {
    name: 'ReviewPage',
    template: `
        <div>
            <div class="header">
                <h1>歷史紀錄</h1>
            </div>
            
            <div class="nav-buttons">
                <button @click="goHome" class="btn btn-secondary">
                    ← 首頁
                </button>
                <button v-if="selectedSessionId" @click="backToList" class="btn btn-secondary">
                    ← 返回列表
                </button>
                <button v-if="!selectedSessionId && sessions.length > 0" @click="deleteAllSessions" class="btn btn-danger">
                    全部刪除
                </button>
            </div>
            
            <div class="content">
                <!-- Session List View -->
                <div v-if="!selectedSessionId" class="session-list">
                    <div v-if="sessions.length === 0" class="empty-state">
                        <div class="empty-state-icon">📝</div>
                        <div class="empty-state-text">尚無測驗紀錄</div>
                    </div>
                    
                    <div 
                        v-for="session in sessions" 
                        :key="session.id"
                        class="session-item"
                    >
                        <div class="session-date">
                            📅 {{ formatDate(session.timestamp) }}
                        </div>
                        <div class="session-info">
                            {{ session.totalQuestions }}題 - {{ formatLessons(session.lessonIds) }}
                        </div>
                        <div class="session-actions">
                            <button @click="viewSession(session.id)" class="btn btn-primary">
                                查看
                            </button>
                            <button @click="deleteSession(session.id)" class="btn btn-danger">
                                刪除
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Session Detail View -->
                <div v-else>
                    <div v-if="loading" class="loading">
                        載入中...
                    </div>
                    
                    <div v-else class="answer-grid">
                        <div 
                            v-for="answer in answers" 
                            :key="answer.id"
                            class="answer-card"
                        >
                            <div class="answer-question">
                                {{ answer.contextWord }}
                            </div>
                            <div class="answer-type">
                                {{ answer.questionType === 'char' ? '寫國字' : '寫注音' }}
                                ({{ answer.targetChar }})
                            </div>
                            <img 
                                :src="answer.imageUrl" 
                                alt="手寫答案"
                                class="answer-image"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            sessions: [],
            selectedSessionId: null,
            answers: [],
            loading: false,
            lessonTitles: {}
        };
    },
    async mounted() {
        await this.loadSessions();
        
        // Check if navigated with sessionId
        if (this.$route.params.sessionId) {
            this.viewSession(this.$route.params.sessionId);
        }
    },
    methods: {
        async loadSessions() {
            try {
                this.sessions = await StorageService.getAllSessions();
                
                // Pre-load lesson titles for all sessions
                for (const session of this.sessions) {
                    const titles = await DataService.getLessonTitles(session.lessonIds);
                    this.lessonTitles[session.id] = titles;
                }
            } catch (error) {
                console.error('Error loading sessions:', error);
                alert('載入紀錄時發生錯誤');
            }
        },

        async viewSession(sessionId) {
            this.selectedSessionId = sessionId;
            this.loading = true;
            
            try {
                const answers = await StorageService.getAnswersBySession(sessionId);
                
                // Convert blobs to URLs for display
                this.answers = await Promise.all(
                    answers.map(async (answer) => ({
                        ...answer,
                        imageUrl: URL.createObjectURL(answer.canvasData)
                    }))
                );
            } catch (error) {
                console.error('Error loading answers:', error);
                alert('載入答案時發生錯誤');
            } finally {
                this.loading = false;
            }
        },

        backToList() {
            // Revoke blob URLs to prevent memory leaks
            this.answers.forEach(answer => {
                if (answer.imageUrl) {
                    URL.revokeObjectURL(answer.imageUrl);
                }
            });
            
            this.selectedSessionId = null;
            this.answers = [];
        },

        async deleteSession(sessionId) {
            const confirm = window.confirm('確定要刪除此測驗紀錄嗎？');
            if (!confirm) return;
            
            try {
                await StorageService.deleteSession(sessionId);
                await this.loadSessions();
                alert('已刪除');
            } catch (error) {
                console.error('Error deleting session:', error);
                alert('刪除時發生錯誤');
            }
        },

        async deleteAllSessions() {
            const confirm = window.confirm(`確定要刪除全部 ${this.sessions.length} 筆測驗紀錄嗎？此操作無法復原。`);
            if (!confirm) return;
            
            try {
                // Delete all sessions one by one
                for (const session of this.sessions) {
                    await StorageService.deleteSession(session.id);
                }
                await this.loadSessions();
                alert('已全部刪除');
            } catch (error) {
                console.error('Error deleting all sessions:', error);
                alert('刪除時發生錯誤');
            }
        },

        formatDate(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        },

        formatLessons(lessonIds) {
            // Try to get cached lesson titles
            const sessionId = this.sessions.find(s => 
                JSON.stringify(s.lessonIds) === JSON.stringify(lessonIds)
            )?.id;
            
            if (sessionId && this.lessonTitles[sessionId]) {
                const titles = this.lessonTitles[sessionId];
                if (titles.length <= 3) {
                    return titles.join('、');
                } else {
                    return `${titles.slice(0, 2).join('、')}等${titles.length}課`;
                }
            }
            
            return `${lessonIds.length}個課文`;
        },

        goHome() {
            this.$router.push({ name: 'home' });
        }
    },
    beforeUnmount() {
        // Clean up blob URLs
        this.answers.forEach(answer => {
            if (answer.imageUrl) {
                URL.revokeObjectURL(answer.imageUrl);
            }
        });
    }
};

// Make it globally available
window.ReviewPage = ReviewPage;
