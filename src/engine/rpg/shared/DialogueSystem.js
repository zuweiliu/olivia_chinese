/**
 * DialogueSystem - Typewriter-style dialogue overlay for RPG conversations
 */
class DialogueSystem {
    constructor(gui) {
        this.gui = gui;
        this.panel = null;
        this.onComplete = null;
        this._typeTimer = null;
        this._lines = [];
        this._lineIndex = 0;
        this._charIndex = 0;
        this._textBlock = null;
        this._nameBlock = null;
        this._skipBtn = null;
        this._isTyping = false;

        this._portraitColors = {
            zhao: '#d4a44c',
            player: '#88aaff',
            cat: '#222222'
        };
        this._portraitEmoji = {
            zhao: '⚔️',
            player: '🌟',
            cat: '🐱'
        };
    }

    show(lines, onComplete) {
        this._lines = lines;
        this._lineIndex = 0;
        this._charIndex = 0;
        this.onComplete = onComplete || (() => {});
        this._buildPanel();
        this._showLine();
    }

    _buildPanel() {
        if (this.panel) {
            this.gui.removeControl(this.panel);
            this.panel.dispose();
        }

        this.panel = new BABYLON.GUI.Rectangle('dialoguePanel');
        this.panel.width = '680px';
        this.panel.height = '160px';
        this.panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.panel.top = '-30px';
        this.panel.background = 'rgba(10, 8, 20, 0.92)';
        this.panel.cornerRadius = 12;
        this.panel.thickness = 2;
        this.panel.color = 'rgba(255, 215, 0, 0.6)';
        this.panel.isPointerBlocker = true;
        this.gui.addControl(this.panel);

        // Portrait circle
        this._portraitCircle = new BABYLON.GUI.Ellipse('portrait');
        this._portraitCircle.width = '70px';
        this._portraitCircle.height = '70px';
        this._portraitCircle.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this._portraitCircle.left = '20px';
        this._portraitCircle.thickness = 2;
        this._portraitCircle.color = '#ffd700';
        this._portraitCircle.background = '#1a1230';
        this.panel.addControl(this._portraitCircle);

        this._portraitLabel = new BABYLON.GUI.TextBlock('portraitLabel', '⚔️');
        this._portraitLabel.fontSize = 30;
        this._portraitCircle.addControl(this._portraitLabel);

        // Speaker name
        this._nameBlock = new BABYLON.GUI.TextBlock('speakerName', '');
        this._nameBlock.color = '#ffd700';
        this._nameBlock.fontSize = 16;
        this._nameBlock.fontFamily = '"Microsoft YaHei", serif';
        this._nameBlock.fontWeight = 'bold';
        this._nameBlock.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this._nameBlock.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this._nameBlock.left = '108px';
        this._nameBlock.top = '18px';
        this._nameBlock.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.panel.addControl(this._nameBlock);

        // Dialogue text
        this._textBlock = new BABYLON.GUI.TextBlock('dialogueText', '');
        this._textBlock.color = '#f0e8d0';
        this._textBlock.fontSize = 18;
        this._textBlock.fontFamily = '"Microsoft YaHei", serif';
        this._textBlock.textWrapping = true;
        this._textBlock.width = '530px';
        this._textBlock.height = '80px';
        this._textBlock.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this._textBlock.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this._textBlock.left = '108px';
        this._textBlock.top = '44px';
        this._textBlock.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this._textBlock.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.panel.addControl(this._textBlock);

        // Next / Skip button
        const nextBtn = new BABYLON.GUI.Rectangle('dialogueNext');
        nextBtn.width = '60px';
        nextBtn.height = '28px';
        nextBtn.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        nextBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        nextBtn.left = '-14px';
        nextBtn.top = '-10px';
        nextBtn.background = 'rgba(255,215,0,0.2)';
        nextBtn.cornerRadius = 6;
        nextBtn.thickness = 1;
        nextBtn.color = '#ffd700';
        nextBtn.isPointerBlocker = true;
        this.panel.addControl(nextBtn);

        const nextLabel = new BABYLON.GUI.TextBlock();
        nextLabel.text = '▶ 下一句';
        nextLabel.color = '#ffd700';
        nextLabel.fontSize = 11;
        nextBtn.addControl(nextLabel);

        nextBtn.onPointerEnterObservable.add(() => { nextBtn.background = 'rgba(255,215,0,0.4)'; });
        nextBtn.onPointerOutObservable.add(() => { nextBtn.background = 'rgba(255,215,0,0.2)'; });
        nextBtn.onPointerClickObservable.add(() => this._advance());

        // Progress dots
        this._dotsBlock = new BABYLON.GUI.TextBlock('dots', '');
        this._dotsBlock.color = '#666644';
        this._dotsBlock.fontSize = 11;
        this._dotsBlock.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this._dotsBlock.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        this._dotsBlock.left = '-14px';
        this._dotsBlock.top = '-40px';
        this.panel.addControl(this._dotsBlock);
    }

    /** Normalise a line: plain string "Speaker：text" or {speaker,text,portrait} object */
    _parseLine(raw) {
        if (raw && typeof raw === 'object') return raw;
        const s = String(raw);
        const sep = s.indexOf('：');
        if (sep > 0 && sep <= 12) {
            return { speaker: s.slice(0, sep), text: s.slice(sep + 1), portrait: null };
        }
        return { speaker: '', text: s, portrait: null };
    }

    _showLine() {
        if (this._lineIndex >= this._lines.length) {
            this._finish();
            return;
        }

        const line = this._parseLine(this._lines[this._lineIndex]);

        // Update portrait
        const portrait = line.portrait || this._guessPortrait(line.speaker);
        this._portraitLabel.text = this._portraitEmoji[portrait] || '💬';
        this._portraitCircle.color = this._portraitColors[portrait] || '#888888';

        this._nameBlock.text = line.speaker || '';
        this._textBlock.text = '';
        this._charIndex = 0;
        this._isTyping = true;

        this._dotsBlock.text = `${this._lineIndex + 1} / ${this._lines.length}`;

        const text = line.text || '';
        if (this._typeTimer) clearInterval(this._typeTimer);
        this._typeTimer = setInterval(() => {
            if (this._charIndex < text.length) {
                this._textBlock.text += text[this._charIndex];
                this._charIndex++;
            } else {
                clearInterval(this._typeTimer);
                this._isTyping = false;
            }
        }, 40);
    }

    _guessPortrait(speaker) {
        if (!speaker) return 'player';
        if (speaker.includes('赵') || speaker.includes('匡胤')) return 'zhao';
        if (speaker.includes('猫')) return 'cat';
        if (speaker.includes('你') || speaker.includes('player')) return 'player';
        return 'zhao';
    }

    _advance() {
        if (this._isTyping) {
            clearInterval(this._typeTimer);
            this._isTyping = false;
            this._textBlock.text = this._parseLine(this._lines[this._lineIndex]).text || '';
            return;
        }
        this._lineIndex++;
        this._showLine();
    }

    _finish() {
        if (this._typeTimer) clearInterval(this._typeTimer);
        this.hide();
        if (this.onComplete) this.onComplete();
    }

    hide() {
        if (this.panel) {
            this.gui.removeControl(this.panel);
            this.panel.dispose();
            this.panel = null;
        }
        if (this._typeTimer) clearInterval(this._typeTimer);
    }
}
