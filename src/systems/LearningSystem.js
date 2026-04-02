/**
 * LearningSystem - Manages word states, review lists, progress, and scoring
 * Handles the core learning flow: discover → teach → review → master
 */
class LearningSystem {
    constructor(storageKey) {
        this.storageKey = storageKey || 'flyChina_progress';
        this.words = [];
        this.stories = [];
        this.config = null;
        this.currentTheme = null;

        // Word states: 'unseen' | 'learning' | 'review' | 'mastered'
        this.wordStates = {};
        // Review list - words that need to be reviewed before progressing
        this.reviewList = [];
        // Collected items
        this.collected = new Set();
        // Score
        this.totalLight = 0;
        this.currentAreaLight = 0;
        // Stories completed
        this.completedStories = new Set();
        // Gate paragraphs read (unlocks passage to next area)
        this.readGates = new Set();

        this._loadProgress();
    }

    async loadTheme(themePath) {
        try {
            const [configRes, wordsRes, storiesRes] = await Promise.all([
                fetch(`${themePath}/config.json`),
                fetch(`${themePath}/words.json`),
                fetch(`${themePath}/stories.json`)
            ]);

            this.config = await configRes.json();
            this.words = await wordsRes.json();
            this.stories = await storiesRes.json();
            this.currentTheme = this.config.theme;

            // Initialize word states for any new words
            for (const word of this.words) {
                if (!this.wordStates[word.id]) {
                    this.wordStates[word.id] = 'unseen';
                }
            }

            this._loadProgress();
            return true;
        } catch (e) {
            console.error('Failed to load theme:', e);
            return false;
        }
    }

    getWordsForArea(areaId) {
        const area = this.config.areas.find(a => a.id === areaId);
        if (!area) return [];
        return this.words.filter(w => area.wordIds.includes(w.id));
    }

    getStoriesForArea(areaId) {
        const area = this.config.areas.find(a => a.id === areaId);
        if (!area) return [];
        return this.stories.filter(s => area.storyIds.includes(s.id));
    }

    getWordState(wordId) {
        return this.wordStates[wordId] || 'unseen';
    }

    /**
     * Player correctly read a word on first try
     */
    masterWord(wordId) {
        this.wordStates[wordId] = 'mastered';
        this.collected.add(wordId);
        const word = this.words.find(w => w.id === wordId);
        const light = this._getLightValue(word);
        this.totalLight += light;
        this.currentAreaLight += light;
        this._removeFromReview(wordId);
        this._saveProgress();
        return light;
    }

    /**
     * Player couldn't read a word - needs teaching, goes to review list
     */
    markForReview(wordId) {
        this.wordStates[wordId] = 'review';
        if (!this.reviewList.includes(wordId)) {
            this.reviewList.push(wordId);
        }
        this._saveProgress();
    }

    /**
     * Player is learning a word (has seen pinyin)
     */
    markLearning(wordId) {
        if (this.wordStates[wordId] === 'unseen') {
            this.wordStates[wordId] = 'learning';
        }
        this._saveProgress();
    }

    /**
     * Player repeated a word during learning (partial credit)
     */
    givePartialCredit(wordId) {
        const word = this.words.find(w => w.id === wordId);
        const light = Math.floor(this._getLightValue(word) * 0.3);
        this.totalLight += light;
        this.currentAreaLight += light;
        this.markForReview(wordId);
        this._saveProgress();
        return light;
    }

    /**
     * Review: player correctly read a review word
     */
    reviewWordSuccess(wordId) {
        this.wordStates[wordId] = 'mastered';
        this.collected.add(wordId);
        this._removeFromReview(wordId);
        const word = this.words.find(w => w.id === wordId);
        const light = Math.floor(this._getLightValue(word) * 0.5);
        this.totalLight += light;
        this._saveProgress();
        return light;
    }

    completeStory(storyId) {
        this.completedStories.add(storyId);
        const story = this.stories.find(s => s.id === storyId);
        const light = story ? story.reward : 50;
        this.totalLight += light;
        this.currentAreaLight += light;
        this._saveProgress();
        return light;
    }

    isAreaUnlocked(areaId) {
        const area = this.config.areas.find(a => a.id === areaId);
        if (!area) return false;
        return this.totalLight >= area.requiredLight;
    }

    markGateRead(storyId) {
        this.readGates.add(storyId);
        this._saveProgress();
    }

    isGateRead(storyId) {
        return this.readGates.has(storyId);
    }

    getGateStoryForArea(areaId) {
        const area = this.config.areas.find(a => a.id === areaId);
        if (!area || !area.storyIds || area.storyIds.length === 0) return null;
        return this.stories.find(s => s.id === area.storyIds[0]) || null;
    }

    getCurrentArea() {
        // Return the latest unlocked area
        let current = this.config.areas[0];
        for (const area of this.config.areas) {
            if (this.totalLight >= area.requiredLight) {
                current = area;
            }
        }
        return current;
    }

    getUnlockedAreas() {
        return this.config.areas.filter(a => this.totalLight >= a.requiredLight);
    }

    getAreaProgress(areaId) {
        const words = this.getWordsForArea(areaId);
        const mastered = words.filter(w => this.wordStates[w.id] === 'mastered').length;
        const stories = this.getStoriesForArea(areaId);
        const storiesDone = stories.filter(s => this.completedStories.has(s.id)).length;
        return {
            totalWords: words.length,
            masteredWords: mastered,
            totalStories: stories.length,
            completedStories: storiesDone,
            complete: mastered === words.length && storiesDone === stories.length
        };
    }

    isReviewClear() {
        return this.reviewList.length === 0;
    }

    getReviewWords() {
        return this.reviewList.map(id => this.words.find(w => w.id === id)).filter(Boolean);
    }

    isWordCollected(wordId) {
        return this.collected.has(wordId);
    }

    resetAreaLight() {
        this.currentAreaLight = 0;
    }

    _getLightValue(word) {
        if (!word) return 10;
        const categoryValues = {
            'food': 10, 'place': 10, 'person': 10, 'object': 15,
            'action': 15, 'art': 20, 'historical': 30
        };
        const base = categoryValues[word.category] || 10;
        return base * word.difficulty;
    }

    _removeFromReview(wordId) {
        const idx = this.reviewList.indexOf(wordId);
        if (idx > -1) this.reviewList.splice(idx, 1);
    }

    _saveProgress() {
        const data = {
            theme: this.currentTheme,
            wordStates: this.wordStates,
            reviewList: this.reviewList,
            collected: Array.from(this.collected),
            totalLight: this.totalLight,
            completedStories: Array.from(this.completedStories),
            readGates: Array.from(this.readGates)
        };
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            console.warn('Could not save progress:', e);
        }
    }

    _loadProgress() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                if (data.theme === this.currentTheme || !this.currentTheme) {
                    this.wordStates = data.wordStates || {};
                    this.reviewList = data.reviewList || [];
                    this.collected = new Set(data.collected || []);
                    this.totalLight = data.totalLight || 0;
                    this.completedStories = new Set(data.completedStories || []);
                    this.readGates = new Set(data.readGates || []);
                }
            }
        } catch (e) {
            console.warn('Could not load progress:', e);
        }
    }

    resetProgress() {
        this.wordStates = {};
        this.reviewList = [];
        this.collected = new Set();
        this.totalLight = 0;
        this.currentAreaLight = 0;
        this.completedStories = new Set();
        this.readGates = new Set();
        localStorage.removeItem(this.storageKey);
    }
}
