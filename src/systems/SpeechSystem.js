/**
 * SpeechSystem - Web Speech API wrapper for Chinese speech recognition
 * Uses webkitSpeechRecognition to verify player pronunciation of Chinese characters
 */
class SpeechSystem {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isSupported = false;
        this.onResult = null;
        this.onError = null;
        this.onEnd = null;
        this.timeout = null;

        this._init();
    }

    _init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported in this browser. Fallback to typing mode.');
            this.isSupported = false;
            return;
        }

        this.isSupported = true;
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'zh-CN';
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 5;
        this.recognition.continuous = false;

        this.recognition.onresult = (event) => {
            this._clearTimeout();
            const results = [];
            for (let i = 0; i < event.results[0].length; i++) {
                results.push({
                    transcript: event.results[0][i].transcript.trim(),
                    confidence: event.results[0][i].confidence
                });
            }
            if (this.onResult) {
                this.onResult(results);
            }
            this.isListening = false;
        };

        this.recognition.onerror = (event) => {
            this._clearTimeout();
            console.log('Speech recognition error:', event.error);
            if (this.onError) {
                this.onError(event.error);
            }
            this.isListening = false;
        };

        this.recognition.onend = () => {
            this._clearTimeout();
            this.isListening = false;
            if (this.onEnd) {
                this.onEnd();
            }
        };
    }

    /**
     * Start listening for Chinese speech
     * @param {Function} onResult - callback({transcript, confidence}[])
     * @param {Function} onError - callback(errorString)
     * @param {Function} onEnd - callback when listening ends
     * @param {number} timeoutMs - auto-stop after this many ms (default 6000)
     */
    startListening(onResult, onError, onEnd, timeoutMs = 6000) {
        if (!this.isSupported) {
            if (onError) onError('not-supported');
            return false;
        }

        if (this.isListening) {
            this.stopListening();
        }

        this.onResult = onResult;
        this.onError = onError;
        this.onEnd = onEnd;

        try {
            this.recognition.start();
            this.isListening = true;

            this.timeout = setTimeout(() => {
                if (this.isListening) {
                    this.stopListening();
                    if (onError) onError('timeout');
                }
            }, timeoutMs);

            return true;
        } catch (e) {
            console.error('Failed to start speech recognition:', e);
            if (onError) onError('start-failed');
            return false;
        }
    }

    stopListening() {
        this._clearTimeout();
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (e) {
                // Ignore
            }
        }
        this.isListening = false;
    }

    _clearTimeout() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    /**
     * Check if recognized speech matches the expected Chinese text
     * @param {Array} results - speech recognition results
     * @param {string} expected - expected Chinese characters
     * @returns {Object} { match: boolean, bestTranscript: string, confidence: number }
     */
    checkMatch(results, expected) {
        if (!results || results.length === 0) {
            return { match: false, bestTranscript: '', confidence: 0 };
        }

        const normalize = (str) => str.replace(/[\s，。！？、；：""''（）\.\,\!\?\;\:\"\'\(\)]/g, '').trim();
        const expectedNorm = normalize(expected);

        for (const result of results) {
            const transcriptNorm = normalize(result.transcript);
            if (transcriptNorm === expectedNorm) {
                return { match: true, bestTranscript: result.transcript, confidence: result.confidence };
            }
        }

        // Partial match - check if at least 70% of characters match
        const bestResult = results[0];
        const transcriptNorm = normalize(bestResult.transcript);
        let matchCount = 0;
        for (const char of expectedNorm) {
            if (transcriptNorm.includes(char)) matchCount++;
        }
        const matchRatio = matchCount / expectedNorm.length;

        return {
            match: matchRatio >= 0.7,
            bestTranscript: bestResult.transcript,
            confidence: bestResult.confidence,
            matchRatio: matchRatio
        };
    }
}
