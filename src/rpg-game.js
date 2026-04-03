/**
 * 五代十国 — Time-Travel RPG Entry Point
 */
window.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('renderCanvas');
    const game = new RPGGameEngine(canvas);

    try {
        await game.init();
        console.log('五代十国 RPG — initialized');
    } catch (err) {
        console.error('Failed to initialize RPG game:', err);
        const el = document.getElementById('loadingScreen');
        if (el) {
            el.querySelector('p').textContent = 'Error: ' + err.message;
            const sp = el.querySelector('.spinner');
            if (sp) sp.style.display = 'none';
        }
    }
});
