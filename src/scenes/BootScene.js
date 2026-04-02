/**
 * BootScene - Loads assets and shows loading screen
 */
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Create loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const title = this.add.text(width / 2, height / 2 - 80, '飞越中华', {
            fontSize: '48px',
            fontFamily: '"Microsoft YaHei", "SimHei", "STHeiti", sans-serif',
            color: '#ffd700',
            stroke: '#4a2a00',
            strokeThickness: 4
        }).setOrigin(0.5);

        const subtitle = this.add.text(width / 2, height / 2 - 30, 'Fly Through China', {
            fontSize: '20px',
            color: '#ccaa66'
        }).setOrigin(0.5);

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRoundedRect(width / 2 - 160, height / 2 + 20, 320, 30, 8);

        const loadingText = this.add.text(width / 2, height / 2 + 70, 'Loading...', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xffd700, 1);
            progressBar.fillRoundedRect(width / 2 - 155, height / 2 + 25, 310 * value, 20, 6);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        // Generate all game textures programmatically (no external assets needed)
        this._generateTextures();
    }

    _generateTextures() {
        const g = this.make.graphics({ add: false });

        // Player character - a glowing fairy/spirit
        g.clear();
        // Body glow
        g.fillStyle(0xfff8e0, 0.3);
        g.fillCircle(24, 24, 22);
        g.fillStyle(0xffd700, 0.6);
        g.fillCircle(24, 24, 16);
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(24, 24, 10);
        // Eyes
        g.fillStyle(0x2a1a00, 1);
        g.fillCircle(20, 22, 2);
        g.fillCircle(28, 22, 2);
        g.generateTexture('player', 48, 48);

        // Player glow aura
        g.clear();
        g.fillStyle(0xffd700, 0.15);
        g.fillCircle(32, 32, 32);
        g.fillStyle(0xffd700, 0.1);
        g.fillCircle(32, 32, 24);
        g.generateTexture('player-glow', 64, 64);

        // Collectible item - glowing orb
        g.clear();
        g.fillStyle(0xff6600, 0.2);
        g.fillCircle(16, 16, 16);
        g.fillStyle(0xff8800, 0.5);
        g.fillCircle(16, 16, 11);
        g.fillStyle(0xffcc00, 0.8);
        g.fillCircle(16, 16, 7);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(16, 16, 3);
        g.generateTexture('collectible', 32, 32);

        // Collectible glow
        g.clear();
        g.fillStyle(0xffaa00, 0.15);
        g.fillCircle(24, 24, 24);
        g.generateTexture('collectible-glow', 48, 48);

        // Story scroll
        g.clear();
        g.fillStyle(0xd4a574, 1);
        g.fillRoundedRect(4, 2, 24, 28, 3);
        g.fillStyle(0xc49464, 1);
        g.fillRoundedRect(2, 0, 28, 6, 3);
        g.fillRoundedRect(2, 26, 28, 6, 3);
        g.lineStyle(1, 0x8a6444);
        g.lineBetween(10, 10, 24, 10);
        g.lineBetween(10, 15, 22, 15);
        g.lineBetween(10, 20, 20, 20);
        g.generateTexture('scroll', 32, 32);

        // Collected check mark
        g.clear();
        g.lineStyle(3, 0x00ff88, 1);
        g.lineBetween(4, 12, 10, 20);
        g.lineBetween(10, 20, 22, 4);
        g.generateTexture('checkmark', 26, 24);

        // Light particle
        g.clear();
        g.fillStyle(0xffffff, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('particle', 8, 8);

        // Building tiles (Song Dynasty style)
        // Roof
        g.clear();
        g.fillStyle(0x4a3a2a, 1);
        g.fillTriangle(0, 40, 60, 0, 120, 40);
        g.fillStyle(0x3a2a1a, 1);
        g.fillRect(10, 40, 100, 60);
        g.fillStyle(0x5a4a3a, 1);
        g.fillRect(45, 60, 30, 40);
        // Windows
        g.fillStyle(0xffdd88, 0.6);
        g.fillRect(18, 55, 18, 18);
        g.fillRect(84, 55, 18, 18);
        g.generateTexture('building1', 120, 100);

        // Pagoda style building
        g.clear();
        g.fillStyle(0x5a3a2a, 1);
        g.fillTriangle(0, 30, 50, 0, 100, 30);
        g.fillStyle(0x4a2a1a, 1);
        g.fillRect(15, 30, 70, 40);
        g.fillStyle(0x5a3a2a, 1);
        g.fillTriangle(10, 70, 50, 50, 90, 70);
        g.fillStyle(0x4a2a1a, 1);
        g.fillRect(20, 70, 60, 50);
        g.fillStyle(0xffdd88, 0.5);
        g.fillRect(40, 80, 20, 30);
        g.generateTexture('building2', 100, 120);

        // Small shop/stall
        g.clear();
        g.fillStyle(0xbb4444, 1);
        g.fillTriangle(0, 20, 40, 0, 80, 20);
        g.fillStyle(0xd4a574, 1);
        g.fillRect(5, 20, 70, 45);
        g.fillStyle(0x8a6444, 1);
        g.fillRect(5, 55, 70, 10);
        g.fillStyle(0xffdd88, 0.5);
        g.fillRect(15, 28, 50, 22);
        g.generateTexture('shop', 80, 65);

        // Tree (willow style)
        g.clear();
        g.fillStyle(0x4a3a1a, 1);
        g.fillRect(18, 30, 8, 30);
        g.fillStyle(0x3a7a3a, 0.8);
        g.fillCircle(22, 22, 22);
        g.fillStyle(0x4a8a4a, 0.6);
        g.fillCircle(16, 18, 14);
        g.fillCircle(28, 18, 14);
        g.generateTexture('tree', 44, 60);

        // Lantern
        g.clear();
        g.fillStyle(0xcc2222, 1);
        g.fillRoundedRect(4, 4, 16, 22, 6);
        g.fillStyle(0xffdd44, 0.7);
        g.fillRoundedRect(7, 8, 10, 14, 4);
        g.lineStyle(1, 0x886622);
        g.lineBetween(12, 0, 12, 4);
        g.lineBetween(12, 26, 12, 30);
        g.generateTexture('lantern', 24, 30);

        // Mountain silhouette for background
        g.clear();
        g.fillStyle(0x2a3a4a, 0.5);
        g.fillTriangle(0, 120, 80, 10, 160, 120);
        g.fillTriangle(100, 120, 200, 30, 300, 120);
        g.fillTriangle(220, 120, 320, 20, 400, 120);
        g.generateTexture('mountains', 400, 120);

        // Cloud
        g.clear();
        g.fillStyle(0xffffff, 0.3);
        g.fillCircle(30, 20, 18);
        g.fillCircle(50, 15, 22);
        g.fillCircle(75, 18, 20);
        g.fillCircle(55, 25, 16);
        g.generateTexture('cloud', 100, 45);

        // Bridge
        g.clear();
        g.fillStyle(0x6a5a4a, 1);
        g.fillRect(0, 15, 100, 8);
        g.fillStyle(0x5a4a3a, 1);
        // Arch
        g.beginPath();
        g.arc(50, 23, 30, Math.PI, 0, false);
        g.closePath();
        g.fillPath();
        g.fillStyle(0x7a8aaa, 0.3);
        g.fillRect(20, 23, 60, 15);
        g.generateTexture('bridge', 100, 40);

        // Review gate (torii-like)
        g.clear();
        g.fillStyle(0xcc3333, 1);
        g.fillRect(5, 0, 8, 80);
        g.fillRect(67, 0, 8, 80);
        g.fillRect(0, 8, 80, 8);
        g.fillRect(2, 20, 76, 5);
        g.generateTexture('gate', 80, 80);

        g.destroy();
    }

    create() {
        this.scene.start('MenuScene');
    }
}
