/**
 * ConquestManager - Tracks kingdom conquests, triggers word challenges, cat swallow animation
 */
class ConquestManager {
    constructor(scene, gui, kingdoms, learningSystem, speechSystem, dialogueSystem, cat, gameEngine) {
        this.scene = scene;
        this.gui = gui;
        this.kingdoms = kingdoms;
        this.learningSystem = learningSystem;
        this.speechSystem = speechSystem;
        this.dialogueSystem = dialogueSystem;
        this.cat = cat;
        this.gameEngine = gameEngine;
        this.conquered = new Set();
        this._activeChallenge = false;
        this._hudIcons = {};
        this._onVictory = null;
        this._worldBuilder = null;
        this._lastNearbyId = null;
        this._approachLabel = null;
    }

    setWorldBuilder(wb) { this._worldBuilder = wb; }
    setOnVictory(fn) { this._onVictory = fn; }

    buildHUD() {
        // Row of 5 kingdom icons at the top-left
        const enemyKingdoms = this.kingdoms.filter(k => !k.isBase);
        enemyKingdoms.forEach((k, i) => {
            const icon = new BABYLON.GUI.Rectangle('icon_' + k.id);
            icon.width = '48px';
            icon.height = '48px';
            icon.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
            icon.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            icon.top = '12px';
            icon.left = (14 + i * 58) + 'px';
            icon.cornerRadius = 8;
            const col = k.colorTheme;
            icon.background = `rgba(${Math.round(col[0]*255)},${Math.round(col[1]*255)},${Math.round(col[2]*255)},0.35)`;
            icon.thickness = 2;
            icon.color = `rgb(${Math.round(col[0]*255)},${Math.round(col[1]*255)},${Math.round(col[2]*255)})`;
            this.gui.addControl(icon);

            const nameLabel = new BABYLON.GUI.TextBlock('iconName_' + k.id, k.name);
            nameLabel.color = '#ffffff';
            nameLabel.fontSize = 10;
            nameLabel.fontFamily = '"Microsoft YaHei", serif';
            nameLabel.top = '4px';
            icon.addControl(nameLabel);

            const statusLabel = new BABYLON.GUI.TextBlock('iconStatus_' + k.id, '⚔️');
            statusLabel.color = '#ffffff';
            statusLabel.fontSize = 18;
            statusLabel.top = '-6px';
            icon.addControl(statusLabel);

            this._hudIcons[k.id] = { icon, statusLabel };
        });

        // Approach label (shown when near a kingdom)
        this._approachLabel = new BABYLON.GUI.TextBlock('approachLabel', '');
        this._approachLabel.color = '#ffd700';
        this._approachLabel.fontSize = 18;
        this._approachLabel.fontFamily = '"Microsoft YaHei", serif';
        this._approachLabel.outlineColor = '#000000';
        this._approachLabel.outlineWidth = 3;
        this._approachLabel.top = '75px';
        this._approachLabel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this._approachLabel.alpha = 0;
        this.gui.addControl(this._approachLabel);
    }

    update(playerPos) {
        if (this._activeChallenge) return;
        const nearby = this._worldBuilder ? this._worldBuilder.getNearbyKingdom(playerPos) : null;
        const nearbyId = nearby ? nearby.id : null;

        if (nearbyId !== this._lastNearbyId) {
            this._lastNearbyId = nearbyId;
            if (nearby && !this.conquered.has(nearby.id)) {
                this._approachLabel.text = `进入 ${nearby.name} — 按 E 开始挑战！`;
                this._approachLabel.alpha = 1;
            } else {
                this._approachLabel.alpha = 0;
            }
        }
    }

    tryConquest(playerPos) {
        if (this._activeChallenge) return;
        const nearby = this._worldBuilder ? this._worldBuilder.getNearbyKingdom(playerPos) : null;
        if (!nearby || this.conquered.has(nearby.id)) return;

        this._activeChallenge = true;
        this._approachLabel.alpha = 0;

        // Show kingdom dialogue first
        const lines = (this.gameEngine.dialogueData.kingdoms || {})[nearby.id] || [];
        this.dialogueSystem.show(lines, () => {
            this._showWordChallenge(nearby);
        });
    }

    _showWordChallenge(kingdom) {
        const words = kingdom.words.map(id => this.learningSystem.words.find(w => w.id === id)).filter(Boolean);
        let wordIndex = 0;
        let correctCount = 0;

        const showNext = () => {
            if (wordIndex >= words.length) {
                this._onAllWordsCorrect(kingdom);
                return;
            }
            this._showSingleWord(words[wordIndex], () => {
                correctCount++;
                wordIndex++;
                setTimeout(showNext, 600);
            });
        };
        showNext();
    }

    _showSingleWord(word, onCorrect) {
        const overlay = new BABYLON.GUI.Rectangle('conquestWord');
        overlay.width = '440px';
        overlay.height = '320px';
        overlay.background = 'rgba(10,8,25,0.96)';
        overlay.cornerRadius = 14;
        overlay.thickness = 2;
        overlay.color = 'rgba(255,100,60,0.7)';
        overlay.isPointerBlocker = true;
        this.gui.addControl(overlay);

        const header = new BABYLON.GUI.TextBlock('cwHeader', '⚔️ 学会此词，猫猫获得力量！');
        header.color = '#ff8844';
        header.fontSize = 15;
        header.fontFamily = '"Microsoft YaHei", serif';
        header.top = '-120px';
        overlay.addControl(header);

        const chars = new BABYLON.GUI.TextBlock('cwChars', word.characters);
        chars.color = '#ffffff';
        chars.fontSize = 58;
        chars.fontFamily = '"Microsoft YaHei", serif';
        chars.top = '-60px';
        overlay.addControl(chars);

        const pinyin = new BABYLON.GUI.TextBlock('cwPy', word.pinyin);
        pinyin.color = '#88ccff';
        pinyin.fontSize = 22;
        pinyin.top = '-10px';
        pinyin.alpha = 0;
        overlay.addControl(pinyin);

        const meaning = new BABYLON.GUI.TextBlock('cwMeaning', word.meaning);
        meaning.color = '#aaddaa';
        meaning.fontSize = 16;
        meaning.top = '28px';
        meaning.alpha = 0;
        overlay.addControl(meaning);

        const status = new BABYLON.GUI.TextBlock('cwStatus', '输入拼音或大声朗读！');
        status.color = '#ffcc44';
        status.fontSize = 14;
        status.fontFamily = '"Microsoft YaHei", serif';
        status.top = '62px';
        overlay.addControl(status);

        // TTS button
        const ttsBtn = new BABYLON.GUI.Rectangle('cwTTS');
        ttsBtn.width = '110px';
        ttsBtn.height = '30px';
        ttsBtn.top = '100px';
        ttsBtn.left = '-110px';
        ttsBtn.background = '#2a2a4a';
        ttsBtn.cornerRadius = 6;
        ttsBtn.thickness = 1;
        ttsBtn.color = '#8888cc';
        ttsBtn.isPointerBlocker = true;
        overlay.addControl(ttsBtn);
        const ttsL = new BABYLON.GUI.TextBlock(); ttsL.text = '🔊 听读音'; ttsL.color = '#aaaaff'; ttsL.fontSize = 12;
        ttsBtn.addControl(ttsL);
        ttsBtn.onPointerClickObservable.add(() => {
            if (window.speechSynthesis) {
                const u = new SpeechSynthesisUtterance(word.characters);
                u.lang = 'zh-CN'; u.rate = 0.8;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(u);
            }
            pinyin.alpha = 1;
        });

        // Speak button
        const speakBtn = new BABYLON.GUI.Rectangle('cwSpeak');
        speakBtn.width = '110px';
        speakBtn.height = '30px';
        speakBtn.top = '100px';
        speakBtn.left = '10px';
        speakBtn.background = '#1a4a2a';
        speakBtn.cornerRadius = 6;
        speakBtn.thickness = 1;
        speakBtn.color = '#44aa66';
        speakBtn.isPointerBlocker = true;
        overlay.addControl(speakBtn);
        const spkL = new BABYLON.GUI.TextBlock(); spkL.text = '🎤 朗读'; spkL.color = '#44ff88'; spkL.fontSize = 12;
        speakBtn.addControl(spkL);
        speakBtn.onPointerClickObservable.add(() => {
            status.text = '🎤 正在听...'; status.color = '#ffcc44';
            this.speechSystem.startListening((results) => {
                const check = this.speechSystem.checkMatch(results, word.characters);
                if (check.match) {
                    this._markCorrect(overlay, word, status, meaning, onCorrect);
                } else {
                    status.text = `听到："${results[0].transcript}" — 再试！`; status.color = '#ff8888';
                }
            }, () => { status.text = '没听到，再试一次！'; status.color = '#ff8888'; }, null);
        });

        // Pinyin input
        const input = new BABYLON.GUI.InputText('cwInput');
        input.width = '200px'; input.height = '32px';
        input.top = '138px'; input.left = '-62px';
        input.color = '#aaddff'; input.background = 'rgba(0,0,30,0.85)';
        input.focusedBackground = 'rgba(10,10,60,0.95)';
        input.placeholderText = '输入拼音...'; input.placeholderColor = '#445566';
        input.fontSize = 13; input.thickness = 1; input.isPointerBlocker = true;
        overlay.addControl(input);

        const checkFn = () => {
            const typed = input.text.trim();
            if (!typed) return;
            if (this._matchPinyin(typed, word.pinyin)) {
                this._markCorrect(overlay, word, status, meaning, onCorrect);
            } else {
                status.text = `✗ "${typed}" — 再试`; status.color = '#ff8888';
            }
        };
        input.onKeyboardEventProcessedObservable.add(e => { if (e.key === 'Enter' || e.keyCode === 13) checkFn(); });

        const ckBtn = new BABYLON.GUI.Rectangle('cwCk');
        ckBtn.width = '80px'; ckBtn.height = '32px';
        ckBtn.top = '138px'; ckBtn.left = '110px';
        ckBtn.background = '#1a4a2a'; ckBtn.cornerRadius = 6;
        ckBtn.thickness = 1; ckBtn.color = '#44aa66'; ckBtn.isPointerBlocker = true;
        overlay.addControl(ckBtn);
        const ckL = new BABYLON.GUI.TextBlock(); ckL.text = 'Check ✓'; ckL.color = '#44ff88'; ckL.fontSize = 12;
        ckBtn.addControl(ckL);
        ckBtn.onPointerEnterObservable.add(() => { ckBtn.background = '#2a6a3a'; });
        ckBtn.onPointerOutObservable.add(() => { ckBtn.background = '#1a4a2a'; });
        ckBtn.onPointerClickObservable.add(checkFn);
    }

    _markCorrect(overlay, word, status, meaning, onCorrect) {
        this.learningSystem.masterWord(word.id);
        if (this.gameEngine.music) this.gameEngine.music.playCheer();
        status.text = '✨ 正确！猫猫变强了！'; status.color = '#44ff88';
        meaning.alpha = 1;
        setTimeout(() => {
            this.gui.removeControl(overlay);
            overlay.dispose();
            onCorrect();
        }, 900);
    }

    _onAllWordsCorrect(kingdom) {
        // Show post-conquest dialogue
        const lines = (this.gameEngine.dialogueData['conquest_success'] || {})[kingdom.id] || [];
        this.dialogueSystem.show(lines, () => {
            // Cat swallow animation
            const castlePos = this._worldBuilder.getCastlePosition(kingdom.id);
            if (this.cat) {
                this.cat.playSwallow(castlePos, () => {
                    this._worldBuilder.hideCastle(kingdom.id);
                    this._markConquered(kingdom);
                });
            } else {
                this._worldBuilder.hideCastle(kingdom.id);
                this._markConquered(kingdom);
            }
        });
    }

    _markConquered(kingdom) {
        this.conquered.add(kingdom.id);
        this._activeChallenge = false;

        // Update HUD icon
        const icons = this._hudIcons[kingdom.id];
        if (icons) {
            icons.statusLabel.text = '✅';
            icons.icon.background = 'rgba(50,180,50,0.3)';
            icons.icon.color = '#44ff88';
        }

        // Particle burst at castle site
        if (this.gameEngine.particles) {
            this.gameEngine.particles.burstAt(
                new BABYLON.Vector3(kingdom.position.x, 5, kingdom.position.z)
            );
        }

        // Check all conquered
        const enemyKingdoms = this.kingdoms.filter(k => !k.isBase);
        if (this.conquered.size >= enemyKingdoms.length) {
            setTimeout(() => {
                if (this._onVictory) this._onVictory();
            }, 1200);
        }
    }

    _matchPinyin(typed, expected) {
        const norm = s => s.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/v/g, 'u')
            .replace(/[^a-z]/g, '');
        const t = norm(typed), e = norm(expected);
        return t.length > 0 && t === e;
    }
}
