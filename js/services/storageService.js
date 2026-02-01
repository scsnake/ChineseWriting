// IndexedDB Storage Service
const StorageService = {
    dbName: 'ZhuyinPracticeDB',
    version: 3,
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

                // Create starredItems store (v2)
                if (!db.objectStoreNames.contains('starredItems')) {
                    const starsStore = db.createObjectStore('starredItems', { keyPath: 'id' });
                    starsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Create questionableItems store (v3)
                if (!db.objectStoreNames.contains('questionableItems')) {
                    const qStore = db.createObjectStore('questionableItems', { keyPath: 'id' });
                    qStore.createIndex('timestamp', 'timestamp', { unique: false });
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
    },

    // Star/Unstar a question item
    async toggleStar(question) {
        if (!this.db) await this.init();

        // Create a unique ID for the question data
        const id = `${question.type}-${question.targetChar}-${question.targetZhuyin}`;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['starredItems'], 'readwrite');
            const store = transaction.objectStore('starredItems');

            // Check if exists
            const getReq = store.get(id);

            getReq.onsuccess = () => {
                if (getReq.result) {
                    // Exists, so remove it
                    store.delete(id);
                    resolve(false); // return false for unstarred
                } else {
                    // Doesn't exist, add it
                    const item = {
                        id: id,
                        type: question.type,
                        targetChar: question.targetChar,
                        targetZhuyin: question.targetZhuyin,
                        contextWord: question.contextWord,
                        timestamp: Date.now()
                    };
                    store.add(item);
                    resolve(true); // return true for starred
                }
            };

            getReq.onerror = () => reject(getReq.error);
        });
    },

    // Check if item is starred
    async isStarred(question) {
        if (!this.db) await this.init();

        const id = `${question.type}-${question.targetChar}-${question.targetZhuyin}`;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['starredItems'], 'readonly');
            const store = transaction.objectStore('starredItems');
            const request = store.get(id);

            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Get all starred items
    async getStarredItems() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['starredItems'], 'readonly');
            const store = transaction.objectStore('starredItems');
            const request = store.getAll();

            request.onsuccess = () => {
                const results = request.result;
                // Sort by timestamp desc (newest first)
                results.sort((a, b) => b.timestamp - a.timestamp);
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    },

    // Questionable Item Methods (Similar to Starred)
    async toggleQuestionable(question) {
        if (!this.db) await this.init();
        const id = `${question.type}-${question.targetChar}-${question.targetZhuyin}`;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['questionableItems'], 'readwrite');
            const store = transaction.objectStore('questionableItems');
            const getReq = store.get(id);

            getReq.onsuccess = () => {
                if (getReq.result) {
                    store.delete(id);
                    resolve(false);
                } else {
                    const item = {
                        id: id,
                        type: question.type,
                        targetChar: question.targetChar,
                        targetZhuyin: question.targetZhuyin,
                        contextWord: question.contextWord,
                        timestamp: Date.now()
                    };
                    store.add(item);
                    resolve(true);
                }
            };
            getReq.onerror = () => reject(getReq.error);
        });
    },

    async isQuestionable(question) {
        if (!this.db) await this.init();
        const id = `${question.type}-${question.targetChar}-${question.targetZhuyin}`;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['questionableItems'], 'readonly');
            const store = transaction.objectStore('questionableItems');
            const request = store.get(id);
            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getQuestionableItems() {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['questionableItems'], 'readonly');
            const store = transaction.objectStore('questionableItems');
            const request = store.getAll();
            request.onsuccess = () => {
                const results = request.result;
                results.sort((a, b) => b.timestamp - a.timestamp);
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }
};

// Make it globally available
window.StorageService = StorageService;
