/**
 * GameScene - Main gameplay scene with 2.5D parallax world,
 * player movement, collectibles, and Chinese learning interactions
 */
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.learningSystem = null;
        this.speechSystem = null;
        this.player = null;
        this.collectibles = [];
        this.storyScrolls = [];
        this.currentArea = null;
        this.currentAreaIndex = 0;
        this.cursors = null;
        this.wasd = null;
        this.isInteracting = false;
        this.activeOverlay = null;
        this.worldWidth = 2400;
        this.worldHeight = 700;
        this.hudElements = {};
        this.particles = [];
    }

    init(data) {
        this.themeId = data.theme || 'song-dynasty';
        // Reset state for scene re-entry (Phaser reuses scene instances)
        this.learningSystem = null;
        this.speechSystem = null;
        this.player = null;
        this.playerGlow = null;
        this.collectibles = [];
        this.storyScrolls = [];
        this.currentArea = null;
        this.currentAreaIndex = 0;
        this.isInteracting = false;
        this.activeOverlay = null;
        this.nearestItem = null;
        this.proximityPrompt = null;
        this.hudElements = {};
        this.particles = [];
        this._lockMessage = null;
        this._areaNameDisplay = null;
        this._overlayElements = [];
        this._typingKeyHandler = null;
    }

    create() {
        this.ready = false;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // Show loading text while data loads
        this._loadingText = this.add.text(w / 2, h / 2, 'Loading Song Dynasty...', {
            fontSize: '20px',
            color: '#ffd700'
        }).setOrigin(0.5).setDepth(999);

        // Initialize systems
        this.learningSystem = new LearningSystem();
        this.speechSystem = new SpeechSystem();

        // Load theme data then build the world
        this.learningSystem.loadTheme(`data/themes/${this.themeId}`).then((loaded) => {
            if (!loaded) {
                console.error('Failed to load theme');
                this.scene.start('MenuScene');
                return;
            }

            if (this._loadingText) this._loadingText.destroy();

            this.cameras.main.fadeIn(800, 0, 0, 0);

            // Set world bounds
            this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

            // Build the world
            this._createBackground(w, h);
            this._createBuildings();
            this._createPlayer(w, h);
            this._setupCamera(w, h);
            this._setupInput();
            this._createHUD(w, h);

            // Load current area
            this.currentArea = this.learningSystem.getCurrentArea();
            this.currentAreaIndex = this.learningSystem.config.areas.indexOf(this.currentArea);
            this._populateArea();

            // Area name display
            this._showAreaName();

            // Ambient floating particles
            this._createAmbientParticles();

            this.ready = true;
        });
    }

    update(time, delta) {
        if (!this.ready || !this.player) return;

        // Player movement
        if (!this.isInteracting) {
            this._handleMovement(delta);
        }

        // Player glow follows player
        if (this.playerGlow) {
            this.playerGlow.x = this.player.x;
            this.playerGlow.y = this.player.y;
        }

        // Bob animation for collectibles
        this.collectibles.forEach((c, i) => {
            if (c.active) {
                c.y = c.baseY + Math.sin(time / 600 + i) * 6;
                if (c.glow) {
                    c.glow.x = c.x;
                    c.glow.y = c.y;
                    c.glow.setScale(0.9 + Math.sin(time / 400 + i) * 0.15);
                }
            }
        });

        // Story scrolls bob
        this.storyScrolls.forEach((s, i) => {
            if (s.active) {
                s.y = s.baseY + Math.sin(time / 800 + i * 2) * 4;
            }
        });

        // Check proximity to collectibles
        if (!this.isInteracting) {
            this._checkProximity();
        }

        // Update ambient particles
        this._updateParticles(delta);

        // Update HUD
        this._updateHUD();
    }

    // ==================== WORLD BUILDING ====================

    _createBackground(w, h) {
        // Sky gradient
        const sky = this.add.graphics();
        sky.fillGradientStyle(0x1a1a3a, 0x1a1a3a, 0x2a2a5a, 0x3a3a6a);
        sky.fillRect(0, 0, this.worldWidth, this.worldHeight);
        sky.setScrollFactor(0.1);
        sky.setDepth(-100);

        // Distant mountains (parallax layer 1)
        for (let i = 0; i < 4; i++) {
            const m = this.add.image(i * 400 + 200, this.worldHeight - 160, 'mountains')
                .setScrollFactor(0.2)
                .setAlpha(0.3)
                .setDepth(-90)
                .setScale(1.2);
        }

        // Clouds (parallax layer 2)
        for (let i = 0; i < 8; i++) {
            const cloud = this.add.image(
                Phaser.Math.Between(0, this.worldWidth),
                Phaser.Math.Between(30, 150),
                'cloud'
            ).setScrollFactor(0.15 + Math.random() * 0.1)
             .setAlpha(Phaser.Math.FloatBetween(0.15, 0.35))
             .setDepth(-80)
             .setScale(Phaser.Math.FloatBetween(0.8, 1.5));

            this.tweens.add({
                targets: cloud,
                x: cloud.x + Phaser.Math.Between(30, 80),
                duration: Phaser.Math.Between(8000, 15000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // Ground
        const ground = this.add.graphics();
        ground.fillStyle(0x3a3a2a, 1);
        ground.fillRect(0, this.worldHeight - 80, this.worldWidth, 80);
        ground.fillStyle(0x4a4a3a, 1);
        ground.fillRect(0, this.worldHeight - 80, this.worldWidth, 3);
        ground.setDepth(-10);

        // Road/path
        const road = this.add.graphics();
        road.fillStyle(0x5a5a4a, 0.5);
        road.fillRect(0, this.worldHeight - 60, this.worldWidth, 40);
        road.setDepth(-9);
    }

    _createBuildings() {
        const areas = this.learningSystem.config.areas;
        const areaWidth = this.worldWidth / areas.length;

        areas.forEach((area, index) => {
            const startX = index * areaWidth;
            const midX = startX + areaWidth / 2;

            // Area separator / transition marker
            if (index > 0) {
                const gate = this.add.image(startX, this.worldHeight - 120, 'gate')
                    .setDepth(5)
                    .setScale(1.2);

                // Area name on gate
                this.add.text(startX, this.worldHeight - 155, area.name, {
                    fontSize: '14px',
                    fontFamily: '"Microsoft YaHei", "SimHei", sans-serif',
                    color: '#ffd700',
                    stroke: '#000000',
                    strokeThickness: 3
                }).setOrigin(0.5).setDepth(6);
            }

            // Buildings for each area
            const buildingTypes = ['building1', 'building2', 'shop'];
            const numBuildings = Phaser.Math.Between(3, 5);

            for (let b = 0; b < numBuildings; b++) {
                const bx = startX + 60 + b * (areaWidth / (numBuildings + 1));
                const buildType = buildingTypes[b % buildingTypes.length];
                const building = this.add.image(bx, this.worldHeight - 130, buildType)
                    .setDepth(-5)
                    .setScrollFactor(0.85)
                    .setScale(Phaser.Math.FloatBetween(0.8, 1.2));
            }

            // Trees
            for (let t = 0; t < 3; t++) {
                const tx = startX + Phaser.Math.Between(30, areaWidth - 30);
                this.add.image(tx, this.worldHeight - 100, 'tree')
                    .setDepth(-4)
                    .setScale(Phaser.Math.FloatBetween(0.7, 1.1));
            }

            // Lanterns along the path
            for (let l = 0; l < 4; l++) {
                const lx = startX + 40 + l * (areaWidth / 5);
                const lantern = this.add.image(lx, this.worldHeight - 170, 'lantern')
                    .setDepth(2)
                    .setScale(0.8)
                    .setAlpha(0.7);
                this.tweens.add({
                    targets: lantern,
                    alpha: { from: 0.5, to: 0.9 },
                    duration: Phaser.Math.Between(1500, 2500),
                    yoyo: true,
                    repeat: -1
                });
            }

            // Bridge in some areas
            if (index === 1 || index === 4) {
                this.add.image(midX, this.worldHeight - 65, 'bridge')
                    .setDepth(-3)
                    .setScale(1.2);
            }
        });
    }

    _createPlayer(w, h) {
        // Player glow aura
        this.playerGlow = this.add.image(200, this.worldHeight - 150, 'player-glow')
            .setDepth(9)
            .setScale(1.5)
            .setAlpha(0.5);

        this.tweens.add({
            targets: this.playerGlow,
            scaleX: 1.8,
            scaleY: 1.8,
            alpha: 0.3,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Player sprite
        this.player = this.physics.add.image(200, this.worldHeight - 150, 'player')
            .setDepth(10)
            .setCollideWorldBounds(true)
            .setScale(1.2)
            .setDrag(300)
            .setMaxVelocity(250, 250);

        // Floating animation
        this.tweens.add({
            targets: this.player,
            y: this.player.y - 8,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    _setupCamera(w, h) {
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(100, 50);
    }

    _setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // Escape key to return to menu
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.isInteracting) {
                this._closeOverlay();
            } else {
                this.scene.start('MenuScene');
            }
        });

        // Space to interact with nearby items
        this.input.keyboard.on('keydown-SPACE', () => {
            if (!this.isInteracting && this.nearestItem) {
                this._interactWithItem(this.nearestItem);
            }
        });

        // R key to open review
        this.input.keyboard.on('keydown-R', () => {
            if (!this.isInteracting && this.learningSystem.reviewList.length > 0) {
                this.scene.launch('ReviewScene', {
                    learningSystem: this.learningSystem,
                    speechSystem: this.speechSystem
                });
                this.scene.pause();
            }
        });
    }

    _handleMovement(delta) {
        const speed = 200;
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
        if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;
        if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
        if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

        // Diagonal normalization
        if (vx !== 0 && vy !== 0) {
            vx *= 0.707;
            vy *= 0.707;
        }

        this.player.setVelocity(vx, vy);

        // Flip player based on direction
        if (vx < 0) this.player.setFlipX(true);
        if (vx > 0) this.player.setFlipX(false);

        // Emit trail particles when moving
        if (vx !== 0 || vy !== 0) {
            if (Math.random() < 0.3) {
                this._emitTrailParticle(this.player.x, this.player.y + 10);
            }
        }

        // Check area transitions
        this._checkAreaTransition();
    }

    // ==================== COLLECTIBLES ====================

    _populateArea() {
        // Clear existing collectibles
        this.collectibles.forEach(c => {
            if (c.glow) c.glow.destroy();
            if (c.label) c.label.destroy();
            c.destroy();
        });
        this.collectibles = [];

        this.storyScrolls.forEach(s => {
            if (s.label) s.label.destroy();
            s.destroy();
        });
        this.storyScrolls = [];

        const areas = this.learningSystem.config.areas;
        const areaWidth = this.worldWidth / areas.length;

        // Populate all unlocked areas
        areas.forEach((area, areaIndex) => {
            if (!this.learningSystem.isAreaUnlocked(area.id)) return;

            const startX = areaIndex * areaWidth + 50;

            // Word collectibles
            const areaWords = this.learningSystem.getWordsForArea(area.id);
            areaWords.forEach((word, wordIndex) => {
                if (this.learningSystem.isWordCollected(word.id)) return;

                const x = startX + (wordIndex + 1) * (areaWidth / (areaWords.length + 2));
                const y = this.worldHeight - 150 - Phaser.Math.Between(30, 120);

                const glow = this.add.image(x, y, 'collectible-glow')
                    .setDepth(7)
                    .setScale(1.2)
                    .setAlpha(0.5);

                const item = this.physics.add.image(x, y, 'collectible')
                    .setDepth(8)
                    .setScale(1)
                    .setImmovable(true);

                item.baseY = y;
                item.wordData = word;
                item.itemType = 'word';
                item.glow = glow;

                // Category color tint
                const tints = {
                    'food': 0xff8844,
                    'place': 0x44aaff,
                    'person': 0xaa88ff,
                    'object': 0x88ff88,
                    'action': 0xff88cc,
                    'art': 0xffaa44,
                    'historical': 0xff4444
                };
                item.setTint(tints[word.category] || 0xffffff);

                this.collectibles.push(item);
            });

            // Story scrolls
            const areaStories = this.learningSystem.getStoriesForArea(area.id);
            areaStories.forEach((story, storyIndex) => {
                if (this.learningSystem.completedStories.has(story.id)) return;

                const x = startX + areaWidth / 2 + storyIndex * 100;
                const y = this.worldHeight - 200;

                const scroll = this.physics.add.image(x, y, 'scroll')
                    .setDepth(8)
                    .setScale(1.5)
                    .setImmovable(true);

                scroll.baseY = y;
                scroll.storyData = story;
                scroll.itemType = 'story';

                this.storyScrolls.push(scroll);
            });
        });
    }

    _checkProximity() {
        let nearest = null;
        let nearestDist = 80;

        // Check word collectibles
        this.collectibles.forEach(item => {
            if (!item.active) return;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
            if (dist < nearestDist) {
                nearest = item;
                nearestDist = dist;
            }
        });

        // Check story scrolls
        this.storyScrolls.forEach(scroll => {
            if (!scroll.active) return;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, scroll.x, scroll.y);
            if (dist < nearestDist) {
                nearest = scroll;
                nearestDist = dist;
            }
        });

        // Update prompt
        if (nearest !== this.nearestItem) {
            if (this.proximityPrompt) {
                this.proximityPrompt.destroy();
                this.proximityPrompt = null;
            }
            if (nearest) {
                const label = nearest.itemType === 'word' ? nearest.wordData.characters : '📜 ' + nearest.storyData.title;
                this.proximityPrompt = this.add.text(nearest.x, nearest.y - 35, '[SPACE] ' + label, {
                    fontSize: '13px',
                    fontFamily: '"Microsoft YaHei", sans-serif',
                    color: '#ffd700',
                    stroke: '#000000',
                    strokeThickness: 3,
                    align: 'center'
                }).setOrigin(0.5).setDepth(20);
            }
        }
        this.nearestItem = nearest;
    }

    _interactWithItem(item) {
        if (item.itemType === 'word') {
            this._showWordOverlay(item);
        } else if (item.itemType === 'story') {
            this._showStoryOverlay(item);
        }
    }

    // ==================== WORD INTERACTION ====================

    _showWordOverlay(item) {
        this.isInteracting = true;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const word = item.wordData;
        const cx = w / 2;
        const cy = h / 2;

        // Track all overlay elements for cleanup (no container nesting)
        this._overlayElements = [];
        const D = 100; // base depth for overlay

        // Dim background - blocks clicks on the game world behind
        const dimBg = this.add.rectangle(cx, cy, w, h, 0x000000, 0.6)
            .setScrollFactor(0).setDepth(D).setInteractive();
        dimBg.on('pointerdown', () => {}); // consume clicks on dim area
        this._overlayElements.push(dimBg);

        // Card background
        const card = this.add.graphics().setScrollFactor(0).setDepth(D + 1);
        card.fillStyle(0x1a1a2a, 0.95);
        card.fillRoundedRect(cx - 200, cy - 160, 400, 320, 16);
        card.lineStyle(2, 0xffd700, 0.5);
        card.strokeRoundedRect(cx - 200, cy - 160, 400, 320, 16);
        this._overlayElements.push(card);

        // Chinese characters (large)
        const charText = this.add.text(cx, cy - 100, word.characters, {
            fontSize: '56px',
            fontFamily: '"Microsoft YaHei", "SimHei", "STHeiti", serif',
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2);
        this._overlayElements.push(charText);

        // Instruction
        const instructText = this.add.text(cx, cy - 50, '🎤 Read this aloud!', {
            fontSize: '16px',
            color: '#ffcc44'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2);
        this._overlayElements.push(instructText);

        // Status area
        const statusText = this.add.text(cx, cy + 10, 'Press 🎤 Speak or "I don\'t know"', {
            fontSize: '13px',
            color: '#8888aa',
            wordWrap: { width: 350 },
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2);
        this._overlayElements.push(statusText);

        // Pinyin (hidden initially)
        const pinyinText = this.add.text(cx, cy - 60, word.pinyin, {
            fontSize: '22px',
            color: '#88ccff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2).setVisible(false);
        this._overlayElements.push(pinyinText);

        // Meaning (hidden initially)
        const meaningText = this.add.text(cx, cy + 50, word.meaning, {
            fontSize: '18px',
            color: '#aaddaa'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2).setVisible(false);
        this._overlayElements.push(meaningText);

        // === Buttons (depth D+3 so they're above everything) ===
        const buttonY = cy + 110;

        // Listen / Mic button
        const micBtn = this._createOverlayButton(cx - 100, buttonY, '🎤 Speak', 0x2a5a2a, () => {
            this._startListeningForWord(word, item, statusText, pinyinText, meaningText, charText, micBtn, showBtn);
        });

        // "I don't know" button
        const showBtn = this._createOverlayButton(cx + 100, buttonY, "I don't know", 0x5a3a2a, () => {
            this._teachWord(word, item, statusText, pinyinText, meaningText, charText, micBtn, showBtn);
        });

        // Close button (top right)
        const closeBtn = this.add.text(cx + 185, cy - 148, '✕', {
            fontSize: '20px',
            color: '#888888'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(D + 3);
        closeBtn.on('pointerdown', () => this._closeOverlay());
        closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#888888'));
        this._overlayElements.push(closeBtn);

        this.activeOverlay = true;
        this.activeItem = item;

        // If speech not supported, auto-show typing fallback
        if (!this.speechSystem.isSupported) {
            statusText.setText('Speech not supported. Type pinyin to answer:');
            this._showTypingFallback(word, item, statusText, pinyinText, meaningText);
        }
    }

    _startListeningForWord(word, item, statusText, pinyinText, meaningText, charText, micBtn, showBtn) {
        statusText.setText('🎤 Listening... speak now!');
        statusText.setColor('#ffcc44');

        // Pulse the character
        this.tweens.add({
            targets: charText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 500,
            yoyo: true,
            repeat: 2
        });

        this.speechSystem.startListening(
            // onResult
            (results) => {
                const check = this.speechSystem.checkMatch(results, word.characters);
                if (check.match) {
                    // Correct!
                    this._onWordCorrect(word, item, statusText, meaningText, charText);
                } else {
                    // Incorrect
                    statusText.setText(`Heard: "${results[0].transcript}" - Try again or tap "I don't know"`);
                    statusText.setColor('#ff8888');
                }
            },
            // onError
            (error) => {
                if (error === 'timeout') {
                    statusText.setText("Didn't hear anything. Try again or tap \"I don't know\"");
                } else {
                    statusText.setText('Microphone error. Try again.');
                }
                statusText.setColor('#ff8888');
            },
            // onEnd
            null
        );
    }

    _onWordCorrect(word, item, statusText, meaningText, charText) {
        const light = this.learningSystem.masterWord(word.id);

        statusText.setText(`✨ Correct! +${light} light`);
        statusText.setColor('#44ff88');
        meaningText.setText(word.meaning).setVisible(true);
        charText.setColor('#ffd700');

        // Sparkle effect
        this._sparkleEffect(item.x, item.y);

        // Remove item after delay
        this.time.delayedCall(1200, () => {
            if (item.glow) item.glow.destroy();
            item.destroy();
            const idx = this.collectibles.indexOf(item);
            if (idx > -1) this.collectibles.splice(idx, 1);
            this._closeOverlay();
        });
    }

    _teachWord(word, item, statusText, pinyinText, meaningText, charText, micBtn, showBtn) {
        // Show pinyin and meaning
        pinyinText.setVisible(true);
        meaningText.setText(word.meaning).setVisible(true);
        this.learningSystem.markLearning(word.id);

        statusText.setText('Now try to read it! Press 🎤 Speak');
        statusText.setColor('#88ccff');

        // Change "I don't know" button to "Skip (add to review)"
        showBtn.label.setText('Skip → Review');
        showBtn.hitArea.off('pointerdown');
        showBtn.hitArea.on('pointerdown', () => {
            const light = this.learningSystem.givePartialCredit(word.id);
            statusText.setText(`Added to review list. +${light} light (partial)`);
            statusText.setColor('#ffaa44');
            this.time.delayedCall(1000, () => {
                this._closeOverlay();
            });
        });

        // Update mic button to check with teaching context
        micBtn.hitArea.off('pointerdown');
        micBtn.hitArea.on('pointerdown', () => {
            statusText.setText('🎤 Listening...');
            statusText.setColor('#ffcc44');

            this.speechSystem.startListening(
                (results) => {
                    const check = this.speechSystem.checkMatch(results, word.characters);
                    if (check.match) {
                        // Correct after teaching - partial credit, goes to review
                        const light = this.learningSystem.givePartialCredit(word.id);
                        statusText.setText(`Good! +${light} light. Added to review for later.`);
                        statusText.setColor('#88ff88');
                        this.time.delayedCall(1200, () => this._closeOverlay());
                    } else {
                        statusText.setText(`Heard: "${results[0].transcript}" - Try again!`);
                        statusText.setColor('#ff8888');
                    }
                },
                (error) => {
                    statusText.setText("Didn't catch that. Try again!");
                    statusText.setColor('#ff8888');
                },
                null
            );
        });
    }

    _showTypingFallback(word, item, statusText, pinyinText, meaningText) {
        // Create a DOM input for typing pinyin
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const D = 102;

        const inputHint = this.add.text(w / 2, h / 2 + 80, 'Type the pinyin (e.g. "chá guǎn"):', {
            fontSize: '13px',
            color: '#aaaacc'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D);
        this._overlayElements.push(inputHint);

        // We'll handle typing via keyboard events as a simple approach
        let typed = '';
        const typedDisplay = this.add.text(w / 2, h / 2 + 105, '|', {
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: '#2a2a4a',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D);
        this._overlayElements.push(typedDisplay);

        const charText = this._overlayElements[2]; // charText is 3rd element
        const keyHandler = (event) => {
            if (event.key === 'Enter') {
                // Check answer
                const normalize = (s) => s.toLowerCase().replace(/\s+/g, '').replace(/[āáǎà]/g, 'a')
                    .replace(/[ēéěè]/g, 'e').replace(/[īíǐì]/g, 'i')
                    .replace(/[ōóǒò]/g, 'o').replace(/[ūúǔù]/g, 'u')
                    .replace(/[ǖǘǚǜ]/g, 'v');
                if (normalize(typed) === normalize(word.pinyin)) {
                    this._onWordCorrect(word, item, statusText, meaningText, charText);
                    this.input.keyboard.off('keydown', keyHandler);
                } else {
                    statusText.setText(`Not quite. Correct: ${word.pinyin}`);
                    statusText.setColor('#ff8888');
                    pinyinText.setVisible(true);
                    meaningText.setText(word.meaning).setVisible(true);
                    this.learningSystem.markForReview(word.id);
                }
            } else if (event.key === 'Backspace') {
                typed = typed.slice(0, -1);
                typedDisplay.setText(typed + '|');
            } else if (event.key.length === 1) {
                typed += event.key;
                typedDisplay.setText(typed + '|');
            }
        };
        this.input.keyboard.on('keydown', keyHandler);
        this._typingKeyHandler = keyHandler;
    }

    // ==================== STORY INTERACTION ====================

    _showStoryOverlay(item) {
        this.isInteracting = true;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const story = item.storyData;
        const cx = w / 2;
        const cy = h / 2;

        // Track all overlay elements for cleanup (no container nesting)
        this._overlayElements = [];
        const D = 100;

        // Dim background
        const dimBg = this.add.rectangle(cx, cy, w, h, 0x000000, 0.7)
            .setScrollFactor(0).setDepth(D).setInteractive();
        dimBg.on('pointerdown', () => {});
        this._overlayElements.push(dimBg);

        // Scroll card
        const card = this.add.graphics().setScrollFactor(0).setDepth(D + 1);
        card.fillStyle(0x2a1a0a, 0.95);
        card.fillRoundedRect(cx - 250, cy - 200, 500, 400, 16);
        card.lineStyle(2, 0xd4a574, 0.6);
        card.strokeRoundedRect(cx - 250, cy - 200, 500, 400, 16);
        this._overlayElements.push(card);

        // Story title
        this._overlayElements.push(this.add.text(cx, cy - 170, '📜 ' + story.title, {
            fontSize: '24px',
            fontFamily: '"Microsoft YaHei", serif',
            color: '#ffd700'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2));

        this._overlayElements.push(this.add.text(cx, cy - 140, story.titleEn, {
            fontSize: '14px',
            color: '#aa8866'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2));

        // Sentences display
        let currentSentence = 0;

        const sentenceText = this.add.text(cx, cy - 60, story.sentences[0].chinese, {
            fontSize: '28px',
            fontFamily: '"Microsoft YaHei", serif',
            color: '#ffffff',
            wordWrap: { width: 420 },
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2);
        this._overlayElements.push(sentenceText);

        const progressText = this.add.text(cx, cy - 95, `Sentence 1 / ${story.sentences.length}`, {
            fontSize: '12px',
            color: '#888888'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2);
        this._overlayElements.push(progressText);

        const statusText = this.add.text(cx, cy + 10, '🎤 Read this sentence aloud!', {
            fontSize: '14px',
            color: '#ffcc44'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2);
        this._overlayElements.push(statusText);

        const pinyinText = this.add.text(cx, cy + 40, '', {
            fontSize: '16px',
            color: '#88ccff',
            wordWrap: { width: 420 },
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2).setVisible(false);
        this._overlayElements.push(pinyinText);

        const meaningText = this.add.text(cx, cy + 70, '', {
            fontSize: '14px',
            color: '#aaddaa',
            wordWrap: { width: 420 },
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2).setVisible(false);
        this._overlayElements.push(meaningText);

        const advanceSentence = () => {
            currentSentence++;
            if (currentSentence >= story.sentences.length) {
                // Story complete!
                const light = this.learningSystem.completeStory(story.id);
                sentenceText.setText('🎉 Story Complete!');
                statusText.setText(`+${light} light earned!`);
                statusText.setColor('#44ff88');
                pinyinText.setVisible(false);
                meaningText.setVisible(false);

                this.time.delayedCall(1500, () => {
                    item.destroy();
                    const idx = this.storyScrolls.indexOf(item);
                    if (idx > -1) this.storyScrolls.splice(idx, 1);
                    this._closeOverlay();
                });
                return;
            }

            const sent = story.sentences[currentSentence];
            sentenceText.setText(sent.chinese);
            progressText.setText(`Sentence ${currentSentence + 1} / ${story.sentences.length}`);
            statusText.setText('🎤 Read this sentence aloud!');
            statusText.setColor('#ffcc44');
            pinyinText.setVisible(false);
            meaningText.setVisible(false);
        };

        // Mic button
        this._createOverlayButton(cx - 80, cy + 130, '🎤 Speak', 0x2a5a2a, () => {
            const sent = story.sentences[currentSentence];
            statusText.setText('🎤 Listening...');

            this.speechSystem.startListening(
                (results) => {
                    const check = this.speechSystem.checkMatch(results, sent.chinese);
                    if (check.match) {
                        statusText.setText('✨ Correct!');
                        statusText.setColor('#44ff88');
                        meaningText.setText(sent.meaning).setVisible(true);
                        this.time.delayedCall(1000, advanceSentence);
                    } else {
                        statusText.setText(`Heard: "${results[0].transcript}"`);
                        statusText.setColor('#ff8888');
                        pinyinText.setText(sent.pinyin).setVisible(true);
                        meaningText.setText(sent.meaning).setVisible(true);
                    }
                },
                (error) => {
                    statusText.setText("Didn't catch that. Try again!");
                    statusText.setColor('#ff8888');
                },
                null
            );
        });

        // Show help button
        this._createOverlayButton(cx + 80, cy + 130, 'Show Help', 0x5a3a2a, () => {
            const sent = story.sentences[currentSentence];
            pinyinText.setText(sent.pinyin).setVisible(true);
            meaningText.setText(sent.meaning).setVisible(true);
            statusText.setText('Read the pinyin, then try speaking!');
            statusText.setColor('#88ccff');
        });

        // Next button (skip)
        this._createOverlayButton(cx, cy + 175, 'Next →', 0x3a3a5a, advanceSentence);

        // Close button
        const closeBtn = this.add.text(cx + 235, cy - 190, '✕', {
            fontSize: '20px',
            color: '#888888'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(D + 3);
        closeBtn.on('pointerdown', () => this._closeOverlay());
        closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#888888'));
        this._overlayElements.push(closeBtn);

        this.activeOverlay = true;
    }

    // ==================== HUD ====================

    _createHUD(w, h) {
        const hud = this.add.container(0, 0).setDepth(200).setScrollFactor(0);

        // Top bar background
        const topBar = this.add.graphics();
        topBar.fillStyle(0x000000, 0.5);
        topBar.fillRect(0, 0, w, 50);
        hud.add(topBar);

        // Lantern icon + light count
        hud.add(this.add.image(30, 25, 'lantern').setScale(0.9));

        this.hudElements.lightText = this.add.text(50, 25, '0', {
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#ffd700'
        }).setOrigin(0, 0.5);
        hud.add(this.hudElements.lightText);

        // Area name
        this.hudElements.areaText = this.add.text(w / 2, 25, '', {
            fontSize: '16px',
            fontFamily: '"Microsoft YaHei", sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);
        hud.add(this.hudElements.areaText);

        // Review count
        this.hudElements.reviewText = this.add.text(w - 20, 15, '', {
            fontSize: '12px',
            color: '#ff8888'
        }).setOrigin(1, 0);
        hud.add(this.hudElements.reviewText);

        // Controls hint
        this.hudElements.controlsText = this.add.text(w - 20, 35, 'WASD/Arrows: move | Space: interact | R: review | Esc: menu', {
            fontSize: '10px',
            color: '#666688'
        }).setOrigin(1, 0.5);
        hud.add(this.hudElements.controlsText);

        // Progress bar for current area
        this.hudElements.progressBg = this.add.graphics();
        this.hudElements.progressBg.fillStyle(0x333333, 0.5);
        this.hudElements.progressBg.fillRoundedRect(w / 2 - 100, 42, 200, 6, 3);
        hud.add(this.hudElements.progressBg);

        this.hudElements.progressBar = this.add.graphics();
        hud.add(this.hudElements.progressBar);
    }

    _updateHUD() {
        const w = this.cameras.main.width;

        // Light count
        this.hudElements.lightText.setText(this.learningSystem.totalLight.toString());

        // Current area name (based on player position)
        const areas = this.learningSystem.config.areas;
        const areaWidth = this.worldWidth / areas.length;
        const areaIndex = Math.min(Math.floor(this.player.x / areaWidth), areas.length - 1);
        const area = areas[Math.max(0, areaIndex)];

        if (area) {
            const unlocked = this.learningSystem.isAreaUnlocked(area.id);
            this.hudElements.areaText.setText(unlocked ? `${area.name} (${area.nameEn})` : `🔒 ${area.nameEn} - Need ${area.requiredLight} light`);
            this.hudElements.areaText.setColor(unlocked ? '#ffffff' : '#ff8888');
        }

        // Review count
        const reviewCount = this.learningSystem.reviewList.length;
        this.hudElements.reviewText.setText(reviewCount > 0 ? `📝 Review: ${reviewCount} words [R]` : '');

        // Progress bar
        if (area) {
            const progress = this.learningSystem.getAreaProgress(area.id);
            const total = progress.totalWords + progress.totalStories;
            const done = progress.masteredWords + progress.completedStories;
            const pct = total > 0 ? done / total : 0;

            this.hudElements.progressBar.clear();
            this.hudElements.progressBar.fillStyle(0xffd700, 0.8);
            this.hudElements.progressBar.fillRoundedRect(w / 2 - 100, 42, 200 * pct, 6, 3);
        }
    }

    // ==================== AREA TRANSITIONS ====================

    _checkAreaTransition() {
        const areas = this.learningSystem.config.areas;
        const areaWidth = this.worldWidth / areas.length;
        const areaIndex = Math.floor(this.player.x / areaWidth);

        if (areaIndex !== this.currentAreaIndex && areaIndex >= 0 && areaIndex < areas.length) {
            const newArea = areas[areaIndex];
            if (!this.learningSystem.isAreaUnlocked(newArea.id)) {
                // Push player back
                this.player.x = this.currentAreaIndex * areaWidth + areaWidth - 10;
                this.player.setVelocityX(0);

                // Show locked message
                if (!this._lockMessage) {
                    this._lockMessage = this.add.text(this.player.x, this.player.y - 50, `🔒 Need ${newArea.requiredLight} light`, {
                        fontSize: '14px',
                        color: '#ff8888',
                        stroke: '#000000',
                        strokeThickness: 3
                    }).setOrigin(0.5).setDepth(50);

                    this.time.delayedCall(2000, () => {
                        if (this._lockMessage) {
                            this._lockMessage.destroy();
                            this._lockMessage = null;
                        }
                    });
                }
                return;
            }

            this.currentAreaIndex = areaIndex;
            this.currentArea = newArea;
            this._showAreaName();
        }
    }

    _showAreaName() {
        if (!this.currentArea) return;
        const w = this.cameras.main.width;

        if (this._areaNameDisplay) this._areaNameDisplay.destroy();

        this._areaNameDisplay = this.add.text(w / 2, 80, this.currentArea.name + '\n' + this.currentArea.nameEn, {
            fontSize: '28px',
            fontFamily: '"Microsoft YaHei", serif',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(150).setScrollFactor(0).setAlpha(0);

        this.tweens.add({
            targets: this._areaNameDisplay,
            alpha: { from: 0, to: 1 },
            y: 70,
            duration: 800,
            hold: 2000,
            yoyo: true,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                if (this._areaNameDisplay) this._areaNameDisplay.destroy();
            }
        });
    }

    // ==================== EFFECTS ====================

    _sparkleEffect(x, y) {
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const speed = Phaser.Math.Between(60, 140);
            const p = this.add.image(x, y, 'particle')
                .setDepth(50)
                .setScale(Phaser.Math.FloatBetween(0.5, 1.2))
                .setTint(Phaser.Math.RND.pick([0xffd700, 0xffaa00, 0xffffff, 0xff8800]));

            this.tweens.add({
                targets: p,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0,
                duration: 800,
                ease: 'Power2',
                onComplete: () => p.destroy()
            });
        }
    }

    _emitTrailParticle(x, y) {
        const p = this.add.image(x + Phaser.Math.Between(-5, 5), y, 'particle')
            .setDepth(8)
            .setScale(0.4)
            .setAlpha(0.4)
            .setTint(0xffd700);

        this.tweens.add({
            targets: p,
            alpha: 0,
            scale: 0,
            y: y + 15,
            duration: 600,
            onComplete: () => p.destroy()
        });
    }

    _createAmbientParticles() {
        // Floating light particles in the world
        this.time.addEvent({
            delay: 300,
            callback: () => {
                if (this.particles.length > 30) return;
                const camX = this.cameras.main.scrollX;
                const camW = this.cameras.main.width;
                const x = camX + Phaser.Math.Between(0, camW);
                const y = Phaser.Math.Between(50, this.worldHeight - 100);

                const p = this.add.image(x, y, 'particle')
                    .setDepth(3)
                    .setScale(Phaser.Math.FloatBetween(0.2, 0.5))
                    .setAlpha(Phaser.Math.FloatBetween(0.1, 0.3))
                    .setTint(Phaser.Math.RND.pick([0xffd700, 0xffcc88, 0xaaccff]));

                p.vx = Phaser.Math.FloatBetween(-0.3, 0.3);
                p.vy = Phaser.Math.FloatBetween(-0.5, -0.1);
                p.life = 0;
                p.maxLife = Phaser.Math.Between(3000, 6000);
                this.particles.push(p);
            },
            loop: true
        });
    }

    _updateParticles(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life += delta;
            if (p.life > p.maxLife) {
                p.destroy();
                this.particles.splice(i, 1);
            }
        }
    }

    // ==================== UI HELPERS ====================

    _createOverlayButton(x, y, text, color, callback) {
        const D = 103; // above all other overlay elements
        const bg = this.add.graphics().setScrollFactor(0).setDepth(D);
        bg.fillStyle(color, 0.9);
        bg.fillRoundedRect(x - 60, y - 18, 120, 36, 8);
        this._overlayElements.push(bg);

        const label = this.add.text(x, y, text, {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 1);
        this._overlayElements.push(label);

        const hitArea = this.add.rectangle(x, y, 120, 36, 0x000000, 0)
            .setInteractive({ useHandCursor: true })
            .setScrollFactor(0).setDepth(D + 2);
        this._overlayElements.push(hitArea);

        hitArea.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(color + 0x222222, 1);
            bg.fillRoundedRect(x - 60, y - 18, 120, 36, 8);
            bg.lineStyle(1, 0xffd700, 0.5);
            bg.strokeRoundedRect(x - 60, y - 18, 120, 36, 8);
        });

        hitArea.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(color, 0.9);
            bg.fillRoundedRect(x - 60, y - 18, 120, 36, 8);
        });

        hitArea.on('pointerdown', callback);

        return { bg, label, hitArea };
    }

    _closeOverlay() {
        if (this._overlayElements) {
            this._overlayElements.forEach(el => {
                if (el && el.destroy) el.destroy();
            });
            this._overlayElements = [];
        }
        if (this._typingKeyHandler) {
            this.input.keyboard.off('keydown', this._typingKeyHandler);
            this._typingKeyHandler = null;
        }
        this.activeOverlay = false;
        this.isInteracting = false;
        this.speechSystem.stopListening();

        if (this.proximityPrompt) {
            this.proximityPrompt.destroy();
            this.proximityPrompt = null;
        }
        this.nearestItem = null;

        // Refresh collectibles
        this._populateArea();
    }
}
