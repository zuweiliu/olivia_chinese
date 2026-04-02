/**
 * 飞越中华 - Fly Through China
 * Main game configuration and initialization
 */
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 960,
    height: 600,
    backgroundColor: '#0a0a1a',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        min: {
            width: 640,
            height: 400
        },
        max: {
            width: 1920,
            height: 1080
        }
    },
    scene: [BootScene, MenuScene, GameScene, ReviewScene]
};

const game = new Phaser.Game(config);
