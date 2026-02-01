const QuestionableListPage = {
    name: 'QuestionableListPage',
    template: `
        <div class="page-wrapper">
            <div class="header">
                <button class="btn-back" @click="goBack">
                    ←
                </button>
                <h1>問題題目列表</h1>
            </div>
            
            <div class="content">
                <div v-if="loading" class="loading">
                    載入中...
                </div>
                
                <div v-else-if="items.length === 0" class="no-data">
                    <p>目前沒有標記為問題的題目</p>
                </div>
                
                <div v-else class="questionable-list">
                    <div v-for="(item, index) in items" :key="item.id" class="questionable-item">
                        <div class="item-info">
                            <div class="item-word">{{ item.contextWord }}</div>
                            <div class="item-detail">
                                <span class="detail-label">目標:</span> 
                                <span class="detail-value">{{ item.targetChar }} ({{ item.targetZhuyin }})</span>
                            </div>
                            <div class="item-time">{{ formatDate(item.timestamp) }}</div>
                        </div>
                        <!-- Reserved for future use -->
                        <button class="btn-remove" @click="removeItem(item)" v-if="false">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            items: [],
            loading: true
        };
    },
    async mounted() {
        await this.loadItems();
    },
    methods: {
        async loadItems() {
            try {
                this.items = await StorageService.getQuestionableItems();
            } catch (error) {
                console.error('Error loading items:', error);
                alert('無法載入資料');
            } finally {
                this.loading = false;
            }
        },

        async removeItem(item) {
            if (!confirm('確定要移除此標記嗎？')) return;

            try {
                // toggleQuestionable removes it if it exists
                await StorageService.toggleQuestionable(item);
                await this.loadItems(); // Reload list
            } catch (error) {
                console.error('Error removing item:', error);
                alert('移除失敗');
            }
        },

        formatDate(timestamp) {
            if (!timestamp) return '';
            return new Date(timestamp).toLocaleString('zh-TW');
        },

        goBack() {
            this.$router.push({ name: 'home' });
        }
    }
};

window.QuestionableListPage = QuestionableListPage;
