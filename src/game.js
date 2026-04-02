/**
 * 飞越中华 - Fly Through China 3D
 * Main entry point - Babylon.js initialization
 */
window.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('renderCanvas');

    const gameEngine = new GameEngine(canvas);

    try {
        await gameEngine.init();
        console.log('飞越中华 3D - Game initialized successfully');
    } catch (err) {
        console.error('Failed to initialize game:', err);
        const loadingEl = document.getElementById('loadingScreen');
        if (loadingEl) {
            loadingEl.querySelector('p').textContent = 'Error loading game: ' + err.message;
            loadingEl.querySelector('.spinner').style.display = 'none';
        }
    }
});
