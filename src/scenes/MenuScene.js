/**
 * MenuScene - Main menu with theme selection and game title
 */
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // Background gradient
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0a0a2a, 0x0a0a2a, 0x1a1a4a, 0x1a1a4a);
        bg.fillRect(0, 0, w, h);

        // Stars
        for (let i = 0; i < 80; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, w),
                Phaser.Math.Between(0, h * 0.6),
                Phaser.Math.Between(1, 2),
                0xffffff,
                Phaser.Math.FloatBetween(0.2, 0.8)
            );
            this.tweens.add({
                targets: star,
                alpha: { from: star.alpha, to: star.alpha * 0.3 },
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true,
                repeat: -1
            });
        }

        // Mountains silhouette
        const mountains = this.add.image(w / 2, h - 180, 'mountains').setScale(w / 400, 2).setAlpha(0.4);

        // Floating lanterns
        for (let i = 0; i < 6; i++) {
            const lx = Phaser.Math.Between(50, w - 50);
            const ly = Phaser.Math.Between(100, h - 200);
            const lantern = this.add.image(lx, ly, 'lantern').setScale(1.5).setAlpha(0.6);
            this.tweens.add({
                targets: lantern,
                y: ly - 20,
                x: lx + Phaser.Math.Between(-15, 15),
                alpha: 0.8,
                duration: Phaser.Math.Between(2000, 4000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // Title
        this.add.text(w / 2, 80, '飞越中华', {
            fontSize: '64px',
            fontFamily: '"Microsoft YaHei", "SimHei", "STHeiti", serif',
            color: '#ffd700',
            stroke: '#4a2a00',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(w / 2, 140, 'Fly Through China', {
            fontSize: '24px',
            fontFamily: 'Georgia, serif',
            color: '#ccaa66'
        }).setOrigin(0.5);

        this.add.text(w / 2, 175, 'A Chinese History Learning Adventure', {
            fontSize: '14px',
            color: '#8888aa'
        }).setOrigin(0.5);

        // Theme selection area
        this.add.text(w / 2, 230, '— 选择朝代 Choose a Dynasty —', {
            fontSize: '18px',
            color: '#aaaacc'
        }).setOrigin(0.5);

        // Song Dynasty button (unlocked)
        const songBtn = this._createThemeButton(w / 2, 310, '宋朝', 'Song Dynasty', '960-1279', true, 'song-dynasty');

        // Tang Dynasty button (locked)
        this._createThemeButton(w / 2, 400, '唐朝', 'Tang Dynasty', '618-907', false, 'tang-dynasty');

        // Han Dynasty button (locked)
        this._createThemeButton(w / 2, 490, '汉朝', 'Han Dynasty', '206 BC - 220 AD', false, 'han-dynasty');

        // Instructions at bottom
        this.add.text(w / 2, h - 80, '🎤 This game uses your microphone to check pronunciation', {
            fontSize: '13px',
            color: '#8888aa'
        }).setOrigin(0.5);

        this.add.text(w / 2, h - 55, 'Use Chrome or Edge for best speech recognition support', {
            fontSize: '12px',
            color: '#666688'
        }).setOrigin(0.5);

        // Reset progress button (small, bottom-right)
        const resetBtn = this.add.text(w - 20, h - 20, 'Reset Progress', {
            fontSize: '11px',
            color: '#664444'
        }).setOrigin(1, 1).setInteractive({ useHandCursor: true });

        resetBtn.on('pointerover', () => resetBtn.setColor('#aa6666'));
        resetBtn.on('pointerout', () => resetBtn.setColor('#664444'));
        resetBtn.on('pointerdown', () => {
            if (confirm('Reset all progress? This cannot be undone.')) {
                localStorage.removeItem('flyChina_progress');
                this.scene.restart();
            }
        });
    }

    _createThemeButton(x, y, nameZh, nameEn, era, unlocked, themeId) {
        const container = this.add.container(x, y);

        // Button background
        const bg = this.add.graphics();
        if (unlocked) {
            bg.fillStyle(0x2a2a4a, 0.8);
            bg.fillRoundedRect(-180, -32, 360, 64, 12);
            bg.lineStyle(2, 0xffd700, 0.6);
            bg.strokeRoundedRect(-180, -32, 360, 64, 12);
        } else {
            bg.fillStyle(0x1a1a2a, 0.5);
            bg.fillRoundedRect(-180, -32, 360, 64, 12);
            bg.lineStyle(1, 0x444466, 0.4);
            bg.strokeRoundedRect(-180, -32, 360, 64, 12);
        }
        container.add(bg);

        // Dynasty name
        const zhText = this.add.text(-60, -15, nameZh, {
            fontSize: '28px',
            fontFamily: '"Microsoft YaHei", "SimHei", "STHeiti", serif',
            color: unlocked ? '#ffd700' : '#555566'
        }).setOrigin(0.5);
        container.add(zhText);

        // English name + era
        const enText = this.add.text(60, -12, nameEn, {
            fontSize: '16px',
            color: unlocked ? '#ccccdd' : '#444455'
        }).setOrigin(0.5);
        container.add(enText);

        const eraText = this.add.text(60, 8, era, {
            fontSize: '12px',
            color: unlocked ? '#8888aa' : '#333344'
        }).setOrigin(0.5);
        container.add(eraText);

        // Lock icon for locked themes
        if (!unlocked) {
            const lockText = this.add.text(150, -5, '🔒', {
                fontSize: '20px'
            }).setOrigin(0.5);
            container.add(lockText);
        } else {
            // Progress indicator
            const saved = localStorage.getItem('flyChina_progress');
            let lightText = '0';
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    lightText = (data.totalLight || 0).toString();
                } catch(e) {}
            }
            const progressText = this.add.text(150, -5, '✨ ' + lightText, {
                fontSize: '14px',
                color: '#ffcc44'
            }).setOrigin(0.5);
            container.add(progressText);
        }

        if (unlocked) {
            // Make interactive
            const hitArea = this.add.rectangle(0, 0, 360, 64, 0x000000, 0).setInteractive({ useHandCursor: true });
            container.add(hitArea);

            hitArea.on('pointerover', () => {
                bg.clear();
                bg.fillStyle(0x3a3a6a, 0.9);
                bg.fillRoundedRect(-180, -32, 360, 64, 12);
                bg.lineStyle(2, 0xffd700, 1);
                bg.strokeRoundedRect(-180, -32, 360, 64, 12);
            });

            hitArea.on('pointerout', () => {
                bg.clear();
                bg.fillStyle(0x2a2a4a, 0.8);
                bg.fillRoundedRect(-180, -32, 360, 64, 12);
                bg.lineStyle(2, 0xffd700, 0.6);
                bg.strokeRoundedRect(-180, -32, 360, 64, 12);
            });

            hitArea.on('pointerdown', () => {
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.time.delayedCall(500, () => {
                    this.scene.start('GameScene', { theme: themeId });
                });
            });
        }

        return container;
    }
}
