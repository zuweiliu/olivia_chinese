/**
 * ReviewScene - Scholar's exam mini-game for reviewing words
 * Players must correctly read all review words to clear the list
 */
class ReviewScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ReviewScene' });
    }

    init(data) {
        this.learningSystem = data.learningSystem;
        this.speechSystem = data.speechSystem;
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // Background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a0a0a, 0x1a0a0a, 0x2a1a1a, 0x3a2a1a);
        bg.fillRect(0, 0, w, h);

        // Decorative elements
        this.add.image(w / 2, h - 60, 'gate').setScale(2).setAlpha(0.15);

        // Title
        this.add.text(w / 2, 40, '📝 复习 Review', {
            fontSize: '32px',
            fontFamily: '"Microsoft YaHei", serif',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(w / 2, 75, "Scholar's Exam - Read each word to clear your review list", {
            fontSize: '13px',
            color: '#aa8866'
        }).setOrigin(0.5);

        // Get review words
        this.reviewWords = this.learningSystem.getReviewWords();
        this.currentIndex = 0;

        if (this.reviewWords.length === 0) {
            this.add.text(w / 2, h / 2, '✨ No words to review! All clear!', {
                fontSize: '20px',
                color: '#44ff88'
            }).setOrigin(0.5);

            this.time.delayedCall(1500, () => this._exitReview());
            return;
        }

        // Progress
        this.progressText = this.add.text(w / 2, 100, `Word 1 / ${this.reviewWords.length}`, {
            fontSize: '14px',
            color: '#888888'
        }).setOrigin(0.5);

        // Word display card
        const cardBg = this.add.graphics();
        cardBg.fillStyle(0x2a2a3a, 0.9);
        cardBg.fillRoundedRect(w / 2 - 180, h / 2 - 120, 360, 200, 16);
        cardBg.lineStyle(2, 0xffd700, 0.4);
        cardBg.strokeRoundedRect(w / 2 - 180, h / 2 - 120, 360, 200, 16);

        // Chinese characters
        this.charText = this.add.text(w / 2, h / 2 - 60, '', {
            fontSize: '52px',
            fontFamily: '"Microsoft YaHei", "SimHei", serif',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Pinyin (hidden)
        this.pinyinText = this.add.text(w / 2, h / 2 - 10, '', {
            fontSize: '20px',
            color: '#88ccff'
        }).setOrigin(0.5).setVisible(false);

        // Meaning (hidden)
        this.meaningText = this.add.text(w / 2, h / 2 + 20, '', {
            fontSize: '16px',
            color: '#aaddaa'
        }).setOrigin(0.5).setVisible(false);

        // Status
        this.statusText = this.add.text(w / 2, h / 2 + 60, '🎤 Read this word aloud!', {
            fontSize: '14px',
            color: '#ffcc44'
        }).setOrigin(0.5);

        // Results tracker
        this.resultIcons = [];
        this.correctCount = 0;

        // Buttons
        this._createButton(w / 2 - 90, h / 2 + 120, '🎤 Speak', 0x2a5a2a, () => this._listenForWord());
        this._createButton(w / 2 + 90, h / 2 + 120, 'Show Help', 0x5a3a2a, () => this._showHelp());

        // Skip button
        this._createButton(w / 2, h / 2 + 165, 'Skip →', 0x3a3a5a, () => this._nextWord(false));

        // Exit button
        const exitBtn = this.add.text(w - 20, 20, '✕ Back to Game', {
            fontSize: '14px',
            color: '#888888'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        exitBtn.on('pointerdown', () => this._exitReview());
        exitBtn.on('pointerover', () => exitBtn.setColor('#ffffff'));
        exitBtn.on('pointerout', () => exitBtn.setColor('#888888'));

        // Show first word
        this._showCurrentWord();
    }

    _showCurrentWord() {
        if (this.currentIndex >= this.reviewWords.length) {
            this._showResults();
            return;
        }

        const word = this.reviewWords[this.currentIndex];
        this.charText.setText(word.characters);
        this.pinyinText.setText(word.pinyin).setVisible(false);
        this.meaningText.setText(word.meaning).setVisible(false);
        this.statusText.setText('🎤 Read this word aloud!').setColor('#ffcc44');
        this.progressText.setText(`Word ${this.currentIndex + 1} / ${this.reviewWords.length}`);

        // Entrance animation
        this.charText.setScale(0.5).setAlpha(0);
        this.tweens.add({
            targets: this.charText,
            scale: 1,
            alpha: 1,
            duration: 400,
            ease: 'Back.easeOut'
        });
    }

    _listenForWord() {
        const word = this.reviewWords[this.currentIndex];
        this.statusText.setText('🎤 Listening...').setColor('#ffcc44');

        this.speechSystem.startListening(
            (results) => {
                const check = this.speechSystem.checkMatch(results, word.characters);
                if (check.match) {
                    this.statusText.setText('✨ Correct!').setColor('#44ff88');
                    this.charText.setColor('#ffd700');
                    const light = this.learningSystem.reviewWordSuccess(word.id);
                    this.correctCount++;

                    this.time.delayedCall(800, () => {
                        this.charText.setColor('#ffffff');
                        this._nextWord(true);
                    });
                } else {
                    this.statusText.setText(`Heard: "${results[0].transcript}" - Try again!`).setColor('#ff8888');
                    this.pinyinText.setVisible(true);
                }
            },
            (error) => {
                this.statusText.setText("Didn't catch that. Try again!").setColor('#ff8888');
            },
            null
        );
    }

    _showHelp() {
        this.pinyinText.setVisible(true);
        this.meaningText.setVisible(true);
        this.statusText.setText('Now try reading it!').setColor('#88ccff');
    }

    _nextWord(wasCorrect) {
        const w = this.cameras.main.width;

        // Add result icon
        const iconX = 50 + this.currentIndex * 25;
        const icon = this.add.text(iconX, this.cameras.main.height - 30, wasCorrect ? '✓' : '✗', {
            fontSize: '16px',
            color: wasCorrect ? '#44ff88' : '#ff4444'
        }).setOrigin(0.5);
        this.resultIcons.push(icon);

        this.currentIndex++;
        this._showCurrentWord();
    }

    _showResults() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.charText.setText('');
        this.pinyinText.setVisible(false);
        this.meaningText.setVisible(false);

        const total = this.reviewWords.length;
        const remaining = this.learningSystem.reviewList.length;

        let message, color;
        if (remaining === 0) {
            message = '🎉 All words mastered! Review list cleared!';
            color = '#44ff88';
        } else {
            message = `${this.correctCount}/${total} correct. ${remaining} words still in review.`;
            color = '#ffcc44';
        }

        this.statusText.setText(message).setColor(color);
        this.progressText.setText('Review Complete');

        // Continue button
        this._createButton(w / 2, h / 2 + 40, 'Continue', 0x2a4a2a, () => this._exitReview());
    }

    _createButton(x, y, text, color, callback) {
        const bg = this.add.graphics();
        bg.fillStyle(color, 0.9);
        bg.fillRoundedRect(x - 60, y - 18, 120, 36, 8);

        const label = this.add.text(x, y, text, {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(x, y, 120, 36, 0x000000, 0).setInteractive({ useHandCursor: true });

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
    }

    _exitReview() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
