// IndexedDB Storage Service
const StorageService = {
    dbName: 'ZhuyinPracticeDB',
    version: 1,
    db: null,

    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create testSessions store
                if (!db.objectStoreNames.contains('testSessions')) {
                    const sessionsStore = db.createObjectStore('testSessions', { keyPath: 'id' });
                    sessionsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Create answers store
                if (!db.objectStoreNames.contains('answers')) {
                    const answersStore = db.createObjectStore('answers', { keyPath: 'id' });
                    answersStore.createIndex('sessionId', 'sessionId', { unique: false });
                    answersStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    },

    // Generate UUID
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // Create test session
    async createSession(lessonIds, testType, totalQuestions) {
        if (!this.db) await this.init();

        // Convert Vue Proxy to plain array for IndexedDB cloning
        const plainLessonIds = Array.isArray(lessonIds) ? [...lessonIds] : lessonIds;

        const session = {
            id: this.generateId(),
            timestamp: Date.now(),
            lessonIds: plainLessonIds,
            testType,
            totalQuestions
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['testSessions'], 'readwrite');
            const store = transaction.objectStore('testSessions');
            const request = store.add(session);

            request.onsuccess = () => resolve(session);
            request.onerror = () => reject(request.error);
        });
    },

    // Save answer
    async saveAnswer(sessionId, questionIndex, questionType, targetChar, targetZhuyin, contextWord, canvasBlob) {
        if (!this.db) await this.init();

        const answer = {
            id: this.generateId(),
            sessionId,
            questionIndex,
            questionType,
            targetChar,
            targetZhuyin,
            contextWord,
            canvasData: canvasBlob,
            timestamp: Date.now()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['answers'], 'readwrite');
            const store = transaction.objectStore('answers');
            const request = store.add(answer);

            request.onsuccess = () => resolve(answer);
            request.onerror = () => reject(request.error);
        });
    },

    // Get all sessions (sorted by timestamp desc)
    async getAllSessions() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['testSessions'], 'readonly');
            const store = transaction.objectStore('testSessions');
            const request = store.getAll();

            request.onsuccess = () => {
                const sessions = request.result;
                sessions.sort((a, b) => b.timestamp - a.timestamp);
                resolve(sessions);
            };
            request.onerror = () => reject(request.error);
        });
    },

    // Get answers for a session
    async getAnswersBySession(sessionId) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['answers'], 'readonly');
            const store = transaction.objectStore('answers');
            const index = store.index('sessionId');
            const request = index.getAll(sessionId);

            request.onsuccess = () => {
                const answers = request.result;
                answers.sort((a, b) => a.questionIndex - b.questionIndex);
                resolve(answers);
            };
            request.onerror = () => reject(request.error);
        });
    },

    // Delete session and its answers
    async deleteSession(sessionId) {
        if (!this.db) await this.init();

        // Get all answers for this session
        const answers = await this.getAnswersBySession(sessionId);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['testSessions', 'answers'], 'readwrite');

            // Delete session
            const sessionsStore = transaction.objectStore('testSessions');
            sessionsStore.delete(sessionId);

            // Delete all answers
            const answersStore = transaction.objectStore('answers');
            answers.forEach(answer => {
                answersStore.delete(answer.id);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    // Get session by ID
    async getSession(sessionId) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['testSessions'], 'readonly');
            const store = transaction.objectStore('testSessions');
            const request = store.get(sessionId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
};

// Make it globally available
window.StorageService = StorageService;
