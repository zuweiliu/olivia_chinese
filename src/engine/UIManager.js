/**
 * UIManager - Babylon.js GUI for HUD, word overlay, story overlay, review
 */
class UIManager {
    constructor(scene, learningSystem, speechSystem, gameEngine) {
        this.scene = scene;
        this.learningSystem = learningSystem;
        this.speechSystem = speechSystem;
        this.gameEngine = gameEngine;

        // Fullscreen GUI
        this.gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI');

        // HUD elements
        this.hud = {};
        this._createHUD();

        // Overlay state
        this._overlayElements = [];
        this._areaNameTimeout = null;
        this._lockTimeout = null;
        this._gateReadingOpen = false;

        // Input
        this._setupInput();
    }

    // ==================== HUD ====================

    _createHUD() {
        // Top bar
        const topBar = new BABYLON.GUI.Rectangle('topBar');
        topBar.width = '100%';
        topBar.height = '50px';
        topBar.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        topBar.background = 'rgba(0,0,0,0.5)';
        topBar.thickness = 0;
        this.gui.addControl(topBar);

        // Light count
        const lightPanel = new BABYLON.GUI.StackPanel('lightPanel');
        lightPanel.isVertical = false;
        lightPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        lightPanel.left = '15px';
        lightPanel.width = '120px';
        topBar.addControl(lightPanel);

        const lightIcon = new BABYLON.GUI.TextBlock('lightIcon', '🏮');
        lightIcon.width = '30px';
        lightIcon.fontSize = 20;
        lightPanel.addControl(lightIcon);

        this.hud.lightText = new BABYLON.GUI.TextBlock('lightText', '0');
        this.hud.lightText.color = '#ffd700';
        this.hud.lightText.fontSize = 18;
        this.hud.lightText.fontWeight = 'bold';
        this.hud.lightText.width = '80px';
        this.hud.lightText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        lightPanel.addControl(this.hud.lightText);

        // Area name (center)
        this.hud.areaText = new BABYLON.GUI.TextBlock('areaText', '');
        this.hud.areaText.color = '#ffffff';
        this.hud.areaText.fontSize = 16;
        this.hud.areaText.fontFamily = '"Microsoft YaHei", sans-serif';
        topBar.addControl(this.hud.areaText);

        // Review count (right)
        this.hud.reviewText = new BABYLON.GUI.TextBlock('reviewText', '');
        this.hud.reviewText.color = '#ff8888';
        this.hud.reviewText.fontSize = 12;
        this.hud.reviewText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.hud.reviewText.left = '-15px';
        this.hud.reviewText.top = '-8px';
        topBar.addControl(this.hud.reviewText);

        // Controls hint
        const controls = new BABYLON.GUI.TextBlock('controls',
            'WASD: move | Space/Q: fly up | Shift: fly down | E: interact | R: review');
        controls.color = '#666688';
        controls.fontSize = 10;
        controls.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        controls.left = '-15px';
        controls.top = '8px';
        topBar.addControl(controls);

        // Progress bar background
        const progressBg = new BABYLON.GUI.Rectangle('progressBg');
        progressBg.width = '200px';
        progressBg.height = '6px';
        progressBg.top = '42px';
        progressBg.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        progressBg.background = 'rgba(50,50,50,0.5)';
        progressBg.cornerRadius = 3;
        progressBg.thickness = 0;
        this.gui.addControl(progressBg);

        this.hud.progressBar = new BABYLON.GUI.Rectangle('progressBar');
        this.hud.progressBar.width = '0px';
        this.hud.progressBar.height = '6px';
        this.hud.progressBar.top = '42px';
        this.hud.progressBar.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.hud.progressBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.hud.progressBar.background = '#ffd700';
        this.hud.progressBar.cornerRadius = 3;
        this.hud.progressBar.thickness = 0;
        this.gui.addControl(this.hud.progressBar);

        // Area name announcement (hidden initially)
        this.hud.areaAnnounce = new BABYLON.GUI.TextBlock('areaAnnounce', '');
        this.hud.areaAnnounce.color = '#ffd700';
        this.hud.areaAnnounce.fontSize = 36;
        this.hud.areaAnnounce.fontFamily = '"Microsoft YaHei", serif';
        this.hud.areaAnnounce.outlineColor = '#000000';
        this.hud.areaAnnounce.outlineWidth = 4;
        this.hud.areaAnnounce.top = '80px';
        this.hud.areaAnnounce.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.hud.areaAnnounce.alpha = 0;
        this.gui.addControl(this.hud.areaAnnounce);

        // Lock message
        this.hud.lockMessage = new BABYLON.GUI.TextBlock('lockMsg', '');
        this.hud.lockMessage.color = '#ff8888';
        this.hud.lockMessage.fontSize = 18;
        this.hud.lockMessage.top = '120px';
        this.hud.lockMessage.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.hud.lockMessage.alpha = 0;
        this.gui.addControl(this.hud.lockMessage);
    }

    updateHUD() {
        const ls = this.learningSystem;
        this.hud.lightText.text = ls.totalLight.toString();

        // Current area
        const world = this.gameEngine.world;
        if (world && this.gameEngine.player) {
            const area = world.getAreaAtPosition(this.gameEngine.player.mesh.position.z);
            if (area) {
                const unlocked = ls.isAreaUnlocked(area.id);
                this.hud.areaText.text = unlocked
                    ? `${area.name} (${area.nameEn})`
                    : `🔒 ${area.nameEn} - Need ${area.requiredLight} light`;
                this.hud.areaText.color = unlocked ? '#ffffff' : '#ff8888';

                // Progress bar
                const progress = ls.getAreaProgress(area.id);
                const total = progress.totalWords + progress.totalStories;
                const done = progress.masteredWords + progress.completedStories;
                const pct = total > 0 ? done / total : 0;
                this.hud.progressBar.width = `${Math.floor(200 * pct)}px`;
            }
        }

        // Review count
        const reviewCount = ls.reviewList.length;
        this.hud.reviewText.text = reviewCount > 0 ? `📝 Review: ${reviewCount} [R]` : '';
    }

    showAreaName(name, nameEn) {
        this.hud.areaAnnounce.text = `${name}\n${nameEn}`;
        this.hud.areaAnnounce.alpha = 1;

        // Screen flash on area transition
        this._flashScreen();

        if (this._areaNameTimeout) clearTimeout(this._areaNameTimeout);
        this._areaNameTimeout = setTimeout(() => {
            this._fadeOut(this.hud.areaAnnounce);
        }, 2500);
    }

    _flashScreen() {
        if (!this._flashRect) {
            this._flashRect = new BABYLON.GUI.Rectangle('flash');
            this._flashRect.width = '100%';
            this._flashRect.height = '100%';
            this._flashRect.background = '#ffd700';
            this._flashRect.thickness = 0;
            this._flashRect.alpha = 0;
            this._flashRect.isPointerBlocker = false;
            this.gui.addControl(this._flashRect);
        }
        this._flashRect.alpha = 0.25;
        let a = 0.25;
        const fade = () => {
            a -= 0.008;
            if (a <= 0) {
                this._flashRect.alpha = 0;
                return;
            }
            this._flashRect.alpha = a;
            requestAnimationFrame(fade);
        };
        fade();
    }

    showLockMessage(requiredLight) {
        this.hud.lockMessage.text = `🔒 Need ${requiredLight} light to enter`;
        this.hud.lockMessage.alpha = 1;

        if (this._lockTimeout) clearTimeout(this._lockTimeout);
        this._lockTimeout = setTimeout(() => {
            this._fadeOut(this.hud.lockMessage);
        }, 2000);
    }

    _fadeOut(control) {
        let alpha = control.alpha;
        const fade = () => {
            alpha -= 0.03;
            if (alpha <= 0) {
                control.alpha = 0;
                return;
            }
            control.alpha = alpha;
            requestAnimationFrame(fade);
        };
        fade();
    }

    // ==================== GATE READING ====================

    showGateReading(story, onComplete) {
        if (this._gateReadingOpen) return;
        this._gateReadingOpen = true;
        if (this.gameEngine) this.gameEngine.state = 'paused';

        let sentenceIndex = 0;
        const sentences = story.sentences;
        let showPinyin = false;

        // Dim backdrop
        const backdrop = new BABYLON.GUI.Rectangle('grBackdrop');
        backdrop.width = '100%';
        backdrop.height = '100%';
        backdrop.background = 'rgba(0,0,0,0.82)';
        backdrop.thickness = 0;
        this.gui.addControl(backdrop);

        // Card panel
        const card = new BABYLON.GUI.Rectangle('grCard');
        card.width = '720px';
        card.height = '480px';
        card.background = 'rgba(30,15,5,0.97)';
        card.thickness = 2;
        card.color = '#8B6914';
        card.cornerRadius = 12;
        this.gui.addControl(card);

        // Title
        const title = new BABYLON.GUI.TextBlock('grTitle', `📜 ${story.title}  •  ${story.titleEn}`);
        title.color = '#ffd700';
        title.fontSize = 18;
        title.fontWeight = 'bold';
        title.top = '-190px';
        title.height = '30px';
        card.addControl(title);

        // Progress indicator
        const progress = new BABYLON.GUI.TextBlock('grProgress', '');
        progress.color = '#aaa';
        progress.fontSize = 13;
        progress.top = '-160px';
        progress.height = '20px';
        card.addControl(progress);

        // Chinese sentence text
        const chineseText = new BABYLON.GUI.TextBlock('grChinese', '');
        chineseText.color = '#fff';
        chineseText.fontSize = 26;
        chineseText.fontFamily = '"Microsoft YaHei", serif';
        chineseText.textWrapping = true;
        chineseText.top = '-60px';
        chineseText.height = '80px';
        chineseText.paddingLeft = '40px';
        chineseText.paddingRight = '40px';
        card.addControl(chineseText);

        // Pinyin text
        const pinyinText = new BABYLON.GUI.TextBlock('grPinyin', '');
        pinyinText.color = '#aaddff';
        pinyinText.fontSize = 15;
        pinyinText.fontFamily = 'serif';
        pinyinText.textWrapping = true;
        pinyinText.top = '40px';
        pinyinText.height = '40px';
        pinyinText.paddingLeft = '40px';
        pinyinText.paddingRight = '40px';
        card.addControl(pinyinText);

        // English meaning
        const meaningText = new BABYLON.GUI.TextBlock('grMeaning', '');
        meaningText.color = '#ccaa66';
        meaningText.fontSize = 14;
        meaningText.fontStyle = 'italic';
        meaningText.textWrapping = true;
        meaningText.top = '90px';
        meaningText.height = '50px';
        meaningText.paddingLeft = '40px';
        meaningText.paddingRight = '40px';
        card.addControl(meaningText);

        // Pinyin toggle button
        const pinyinBtn = new BABYLON.GUI.Button.CreateSimpleButton('grPinyinBtn', '拼音 ▾');
        pinyinBtn.width = '100px';
        pinyinBtn.height = '32px';
        pinyinBtn.top = '155px';
        pinyinBtn.left = '-160px';
        pinyinBtn.background = 'rgba(50,30,10,0.9)';
        pinyinBtn.color = '#aaddff';
        pinyinBtn.fontSize = 13;
        pinyinBtn.thickness = 1;
        pinyinBtn.cornerRadius = 6;
        card.addControl(pinyinBtn);

        // Next / Done button
        const nextBtn = new BABYLON.GUI.Button.CreateSimpleButton('grNextBtn', '下一句 ▶');
        nextBtn.width = '140px';
        nextBtn.height = '40px';
        nextBtn.top = '155px';
        nextBtn.left = '60px';
        nextBtn.background = '#8B1a1a';
        nextBtn.color = '#ffd700';
        nextBtn.fontSize = 16;
        nextBtn.fontWeight = 'bold';
        nextBtn.thickness = 1;
        nextBtn.cornerRadius = 8;
        card.addControl(nextBtn);

        const updateSentence = () => {
            const s = sentences[sentenceIndex];
            chineseText.text = s.chinese;
            pinyinText.text = showPinyin ? s.pinyin : '';
            meaningText.text = s.meaning;
            progress.text = `第 ${sentenceIndex + 1} / ${sentences.length} 句`;
            const isLast = sentenceIndex === sentences.length - 1;
            nextBtn.children[0].text = isLast ? '✓ 已读完' : '下一句 ▶';
            nextBtn.background = isLast ? '#1a6a1a' : '#8B1a1a';
        };

        pinyinBtn.onPointerClickObservable.add(() => {
            showPinyin = !showPinyin;
            pinyinBtn.children[0].text = showPinyin ? '拼音 ▴' : '拼音 ▾';
            updateSentence();
        });

        nextBtn.onPointerClickObservable.add(() => {
            if (sentenceIndex < sentences.length - 1) {
                sentenceIndex++;
                updateSentence();
            } else {
                // Done reading
                this.gui.removeControl(backdrop);
                this.gui.removeControl(card);
                this._gateReadingOpen = false;
                if (this.gameEngine) this.gameEngine.state = 'playing';
                if (onComplete) onComplete();
            }
        });

        updateSentence();
    }

    // ==================== INPUT ====================

    _setupInput() {
        window.addEventListener('keydown', (e) => {
            if (this.gameEngine.state === 'overlay') {
                if (e.code === 'Escape') this.closeOverlay();
                return;
            }

            if (e.code === 'KeyE') {
                this._tryInteract();
            } else if (e.code === 'KeyR') {
                this._openReview();
            } else if (e.code === 'Escape') {
                // Could open menu - for now just log
                console.log('Menu not yet implemented in 3D');
            }
        });
    }

    _tryInteract() {
        const cm = this.gameEngine.collectibles;
        if (!cm || !cm.nearestItem) return;

        const item = cm.nearestItem;
        if (item._itemType === 'word') {
            this.showWordOverlay(item);
        } else if (item._itemType === 'story') {
            this.showStoryOverlay(item);
        }
    }

    _openReview() {
        if (this.learningSystem.reviewList.length === 0) return;
        this.showReviewOverlay();
    }

    // ==================== WORD OVERLAY ====================

    showWordOverlay(item) {
        this.gameEngine.state = 'overlay';
        this.gameEngine.player.isLocked = true;
        this._clearOverlay();

        const word = item._wordData;

        // Dim background
        const dimBg = this._createDimBg();

        // Card
        const card = new BABYLON.GUI.Rectangle('wordCard');
        card.width = '420px';
        card.height = '360px';
        card.background = 'rgba(20, 20, 40, 0.95)';
        card.cornerRadius = 16;
        card.thickness = 2;
        card.color = 'rgba(255, 215, 0, 0.5)';
        this.gui.addControl(card);
        this._overlayElements.push(card);

        // Chinese characters
        const charText = new BABYLON.GUI.TextBlock('charText', word.characters);
        charText.color = '#ffffff';
        charText.fontSize = 56;
        charText.fontFamily = '"Microsoft YaHei", "SimHei", serif';
        charText.top = '-100px';
        card.addControl(charText);

        // Instruction
        const instruct = new BABYLON.GUI.TextBlock('instruct', '🎤 Read this aloud!');
        instruct.color = '#ffcc44';
        instruct.fontSize = 16;
        instruct.top = '-50px';
        card.addControl(instruct);

        // Status
        const status = new BABYLON.GUI.TextBlock('status', 'Press 🎤 Speak or "I don\'t know"');
        status.color = '#8888aa';
        status.fontSize = 13;
        status.top = '10px';
        status.textWrapping = true;
        status.width = '380px';
        card.addControl(status);

        // Pinyin (hidden)
        const pinyin = new BABYLON.GUI.TextBlock('pinyin', word.pinyin);
        pinyin.color = '#88ccff';
        pinyin.fontSize = 22;
        pinyin.top = '-55px';
        pinyin.alpha = 0;
        card.addControl(pinyin);

        // Meaning (hidden)
        const meaning = new BABYLON.GUI.TextBlock('meaning', word.meaning);
        meaning.color = '#aaddaa';
        meaning.fontSize = 18;
        meaning.top = '55px';
        meaning.alpha = 0;
        card.addControl(meaning);

        // Speak button
        const speakBtn = this._createButton('🎤 Speak', '130px', '-100px', '#2a5a2a', () => {
            status.text = '🎤 Listening... speak now!';
            status.color = '#ffcc44';

            this.speechSystem.startListening(
                (results) => {
                    const check = this.speechSystem.checkMatch(results, word.characters);
                    if (check.match) {
                        const light = this.learningSystem.masterWord(word.id);
                        status.text = `✨ Correct! +${light} light`;
                        status.color = '#44ff88';
                        meaning.alpha = 1;
                        charText.color = '#ffd700';
                        this.gameEngine.collectibles.collectItem(item);
                        setTimeout(() => this.closeOverlay(), 1200);
                    } else {
                        status.text = `Heard: "${results[0].transcript}" - Try again!`;
                        status.color = '#ff8888';
                    }
                },
                (error) => {
                    status.text = error === 'timeout'
                        ? "Didn't hear anything. Try again!"
                        : 'Microphone error. Try again.';
                    status.color = '#ff8888';
                },
                null
            );
        });
        card.addControl(speakBtn);

        // Don't know button
        const dontKnowBtn = this._createButton("I don't know", '130px', '100px', '#5a3a2a', () => {
            pinyin.alpha = 1;
            meaning.alpha = 1;
            this.learningSystem.markLearning(word.id);
            status.text = 'Now try to read it! Press 🎤 Speak';
            status.color = '#88ccff';

            // Change button to Skip
            dontKnowBtn.children[0].text = 'Skip → Review';
            dontKnowBtn.onPointerClickObservable.clear();
            dontKnowBtn.onPointerClickObservable.add(() => {
                const light = this.learningSystem.givePartialCredit(word.id);
                status.text = `Added to review. +${light} light (partial)`;
                status.color = '#ffaa44';
                setTimeout(() => this.closeOverlay(), 1000);
            });
        });
        card.addControl(dontKnowBtn);

        // Close button
        const closeBtn = this._createCloseButton();
        card.addControl(closeBtn);

        // Typing fallback if no speech support
        if (!this.speechSystem.isSupported) {
            status.text = 'Speech not supported in this browser.\nUse Chrome or Edge for speech recognition.';
        }
    }

    // ==================== STORY OVERLAY ====================

    showStoryOverlay(item) {
        this.gameEngine.state = 'overlay';
        this.gameEngine.player.isLocked = true;
        this._clearOverlay();

        const story = item._storyData;
        let currentSentence = 0;

        // Dim background
        this._createDimBg();

        // Card
        const card = new BABYLON.GUI.Rectangle('storyCard');
        card.width = '520px';
        card.height = '440px';
        card.background = 'rgba(40, 25, 10, 0.95)';
        card.cornerRadius = 16;
        card.thickness = 2;
        card.color = 'rgba(210, 165, 115, 0.6)';
        this.gui.addControl(card);
        this._overlayElements.push(card);

        // Title
        const title = new BABYLON.GUI.TextBlock('title', '📜 ' + story.title);
        title.color = '#ffd700';
        title.fontSize = 24;
        title.fontFamily = '"Microsoft YaHei", serif';
        title.top = '-175px';
        card.addControl(title);

        const titleEn = new BABYLON.GUI.TextBlock('titleEn', story.titleEn);
        titleEn.color = '#aa8866';
        titleEn.fontSize = 14;
        titleEn.top = '-145px';
        card.addControl(titleEn);

        // Progress
        const progress = new BABYLON.GUI.TextBlock('progress',
            `Sentence 1 / ${story.sentences.length}`);
        progress.color = '#888888';
        progress.fontSize = 12;
        progress.top = '-100px';
        card.addControl(progress);

        // Sentence
        const sentence = new BABYLON.GUI.TextBlock('sentence', story.sentences[0].chinese);
        sentence.color = '#ffffff';
        sentence.fontSize = 28;
        sentence.fontFamily = '"Microsoft YaHei", serif';
        sentence.top = '-50px';
        sentence.textWrapping = true;
        sentence.width = '450px';
        card.addControl(sentence);

        // Status
        const status = new BABYLON.GUI.TextBlock('status', '🎤 Read this sentence aloud!');
        status.color = '#ffcc44';
        status.fontSize = 14;
        status.top = '20px';
        card.addControl(status);

        // Pinyin
        const pinyinText = new BABYLON.GUI.TextBlock('pinyin', '');
        pinyinText.color = '#88ccff';
        pinyinText.fontSize = 16;
        pinyinText.top = '50px';
        pinyinText.textWrapping = true;
        pinyinText.width = '450px';
        pinyinText.alpha = 0;
        card.addControl(pinyinText);

        // Meaning
        const meaningText = new BABYLON.GUI.TextBlock('meaning', '');
        meaningText.color = '#aaddaa';
        meaningText.fontSize = 14;
        meaningText.top = '80px';
        meaningText.textWrapping = true;
        meaningText.width = '450px';
        meaningText.alpha = 0;
        card.addControl(meaningText);

        const advanceSentence = () => {
            currentSentence++;
            if (currentSentence >= story.sentences.length) {
                const light = this.learningSystem.completeStory(story.id);
                sentence.text = '🎉 Story Complete!';
                status.text = `+${light} light earned!`;
                status.color = '#44ff88';
                pinyinText.alpha = 0;
                meaningText.alpha = 0;
                this.gameEngine.collectibles.collectItem(item);
                setTimeout(() => this.closeOverlay(), 1500);
                return;
            }
            const sent = story.sentences[currentSentence];
            sentence.text = sent.chinese;
            progress.text = `Sentence ${currentSentence + 1} / ${story.sentences.length}`;
            status.text = '🎤 Read this sentence aloud!';
            status.color = '#ffcc44';
            pinyinText.alpha = 0;
            meaningText.alpha = 0;
        };

        // Speak button
        const speakBtn = this._createButton('🎤 Speak', '150px', '-100px', '#2a5a2a', () => {
            const sent = story.sentences[currentSentence];
            status.text = '🎤 Listening...';
            this.speechSystem.startListening(
                (results) => {
                    const check = this.speechSystem.checkMatch(results, sent.chinese);
                    if (check.match) {
                        status.text = '✨ Correct!';
                        status.color = '#44ff88';
                        meaningText.text = sent.meaning;
                        meaningText.alpha = 1;
                        setTimeout(advanceSentence, 1000);
                    } else {
                        status.text = `Heard: "${results[0].transcript}"`;
                        status.color = '#ff8888';
                        pinyinText.text = sent.pinyin;
                        pinyinText.alpha = 1;
                        meaningText.text = sent.meaning;
                        meaningText.alpha = 1;
                    }
                },
                (error) => {
                    status.text = "Didn't catch that. Try again!";
                    status.color = '#ff8888';
                },
                null
            );
        });
        card.addControl(speakBtn);

        // Help button
        const helpBtn = this._createButton('Show Help', '150px', '0px', '#5a3a2a', () => {
            const sent = story.sentences[currentSentence];
            pinyinText.text = sent.pinyin;
            pinyinText.alpha = 1;
            meaningText.text = sent.meaning;
            meaningText.alpha = 1;
            status.text = 'Read the pinyin, then try speaking!';
            status.color = '#88ccff';
        });
        card.addControl(helpBtn);

        // Next button
        const nextBtn = this._createButton('Next →', '150px', '100px', '#3a3a5a', advanceSentence);
        card.addControl(nextBtn);

        // Close
        card.addControl(this._createCloseButton());
    }

    // ==================== REVIEW OVERLAY ====================

    showReviewOverlay() {
        this.gameEngine.state = 'overlay';
        this.gameEngine.player.isLocked = true;
        this._clearOverlay();

        const reviewWords = this.learningSystem.reviewList.map(id =>
            this.learningSystem.words.find(w => w.id === id)
        ).filter(Boolean);

        if (reviewWords.length === 0) {
            this.closeOverlay();
            return;
        }

        let currentIndex = 0;

        this._createDimBg();

        const card = new BABYLON.GUI.Rectangle('reviewCard');
        card.width = '420px';
        card.height = '380px';
        card.background = 'rgba(20, 30, 20, 0.95)';
        card.cornerRadius = 16;
        card.thickness = 2;
        card.color = 'rgba(100, 255, 100, 0.4)';
        this.gui.addControl(card);
        this._overlayElements.push(card);

        const titleText = new BABYLON.GUI.TextBlock('rtitle', '📝 Review Mode');
        titleText.color = '#88ff88';
        titleText.fontSize = 22;
        titleText.top = '-150px';
        card.addControl(titleText);

        const progressText = new BABYLON.GUI.TextBlock('rprogress',
            `Word 1 / ${reviewWords.length}`);
        progressText.color = '#888888';
        progressText.fontSize = 12;
        progressText.top = '-120px';
        card.addControl(progressText);

        const charText = new BABYLON.GUI.TextBlock('rchar', reviewWords[0].characters);
        charText.color = '#ffffff';
        charText.fontSize = 48;
        charText.fontFamily = '"Microsoft YaHei", serif';
        charText.top = '-60px';
        card.addControl(charText);

        const status = new BABYLON.GUI.TextBlock('rstatus', '🎤 Read this word aloud!');
        status.color = '#ffcc44';
        status.fontSize = 14;
        status.top = '10px';
        card.addControl(status);

        const pinyin = new BABYLON.GUI.TextBlock('rpinyin', reviewWords[0].pinyin);
        pinyin.color = '#88ccff';
        pinyin.fontSize = 20;
        pinyin.top = '-20px';
        pinyin.alpha = 0;
        card.addControl(pinyin);

        const meaning = new BABYLON.GUI.TextBlock('rmeaning', reviewWords[0].meaning);
        meaning.color = '#aaddaa';
        meaning.fontSize = 16;
        meaning.top = '50px';
        meaning.alpha = 0;
        card.addControl(meaning);

        const advance = () => {
            currentIndex++;
            if (currentIndex >= reviewWords.length) {
                charText.text = '🎉 Review Complete!';
                status.text = 'All words reviewed!';
                status.color = '#44ff88';
                pinyin.alpha = 0;
                meaning.alpha = 0;
                setTimeout(() => this.closeOverlay(), 1500);
                return;
            }
            const w = reviewWords[currentIndex];
            charText.text = w.characters;
            pinyin.text = w.pinyin;
            meaning.text = w.meaning;
            pinyin.alpha = 0;
            meaning.alpha = 0;
            progressText.text = `Word ${currentIndex + 1} / ${reviewWords.length}`;
            status.text = '🎤 Read this word aloud!';
            status.color = '#ffcc44';
        };

        // Speak
        const speakBtn = this._createButton('🎤 Speak', '120px', '-100px', '#2a5a2a', () => {
            const w = reviewWords[currentIndex];
            status.text = '🎤 Listening...';
            this.speechSystem.startListening(
                (results) => {
                    const check = this.speechSystem.checkMatch(results, w.characters);
                    if (check.match) {
                        this.learningSystem.masterWord(w.id);
                        this.learningSystem.reviewList = this.learningSystem.reviewList.filter(id => id !== w.id);
                        status.text = '✨ Correct! Mastered!';
                        status.color = '#44ff88';
                        meaning.alpha = 1;
                        setTimeout(advance, 1000);
                    } else {
                        status.text = `Heard: "${results[0].transcript}" - Try again!`;
                        status.color = '#ff8888';
                        pinyin.alpha = 1;
                    }
                },
                (error) => {
                    status.text = "Didn't catch that. Try again!";
                    status.color = '#ff8888';
                },
                null
            );
        });
        card.addControl(speakBtn);

        // Show hint
        const hintBtn = this._createButton('Show Hint', '120px', '0px', '#5a3a2a', () => {
            pinyin.alpha = 1;
            meaning.alpha = 1;
        });
        card.addControl(hintBtn);

        // Skip
        const skipBtn = this._createButton('Skip →', '120px', '100px', '#3a3a5a', advance);
        card.addControl(skipBtn);

        card.addControl(this._createCloseButton());
    }

    // ==================== UI HELPERS ====================

    _createDimBg() {
        const dim = new BABYLON.GUI.Rectangle('dimBg');
        dim.width = '100%';
        dim.height = '100%';
        dim.background = 'rgba(0, 0, 0, 0.6)';
        dim.thickness = 0;
        dim.isPointerBlocker = true;
        this.gui.addControl(dim);
        this._overlayElements.push(dim);
        return dim;
    }

    _createButton(text, top, left, bgColor, callback) {
        const btn = new BABYLON.GUI.Rectangle('btn_' + text);
        btn.width = '130px';
        btn.height = '36px';
        btn.top = top;
        btn.left = left;
        btn.background = bgColor;
        btn.cornerRadius = 8;
        btn.thickness = 0;
        btn.isPointerBlocker = true;

        const label = new BABYLON.GUI.TextBlock();
        label.text = text;
        label.color = '#ffffff';
        label.fontSize = 14;
        btn.addControl(label);

        btn.onPointerEnterObservable.add(() => {
            btn.background = '#ffd700';
            label.color = '#000000';
        });
        btn.onPointerOutObservable.add(() => {
            btn.background = bgColor;
            label.color = '#ffffff';
        });
        btn.onPointerClickObservable.add(callback);

        return btn;
    }

    _createCloseButton() {
        const btn = new BABYLON.GUI.Rectangle('closeBtn');
        btn.width = '30px';
        btn.height = '30px';
        btn.top = '-155px';
        btn.left = '180px';
        btn.background = 'transparent';
        btn.thickness = 0;
        btn.isPointerBlocker = true;

        const label = new BABYLON.GUI.TextBlock();
        label.text = '✕';
        label.color = '#888888';
        label.fontSize = 20;
        btn.addControl(label);

        btn.onPointerEnterObservable.add(() => label.color = '#ffffff');
        btn.onPointerOutObservable.add(() => label.color = '#888888');
        btn.onPointerClickObservable.add(() => this.closeOverlay());

        return btn;
    }

    closeOverlay() {
        this._clearOverlay();
        this.gameEngine.state = 'playing';
        this.gameEngine.player.isLocked = false;
        this.speechSystem.stopListening();

        // Refresh collectibles
        this.gameEngine.collectibles.respawn();
    }

    _clearOverlay() {
        this._overlayElements.forEach(el => {
            this.gui.removeControl(el);
            el.dispose();
        });
        this._overlayElements = [];
    }
}
