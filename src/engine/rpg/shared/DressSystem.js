/**
 * DressSystem - Dress selection overlay, costs 3 words to unlock each outfit
 */
class DressSystem {
    constructor(gui, learningSystem, speechSystem, gameEngine) {
        this.gui = gui;
        this.learningSystem = learningSystem;
        this.speechSystem = speechSystem;
        this.gameEngine = gameEngine;
        this.selectedDress = 0;
        this._panel = null;

        this.dresses = [
            {
                id: 'red',
                name: '红衣仙子',
                description: 'Red silk robe — brave and bold',
                color: new BABYLON.Color3(0.85, 0.18, 0.18),
                accentColor: new BABYLON.Color3(0.9, 0.7, 0.1),
                words: ['fenlie', 'jianli', 'dingdu']
            },
            {
                id: 'blue',
                name: '青衣侠女',
                description: 'Blue scholar robe — wise and cool',
                color: new BABYLON.Color3(0.15, 0.38, 0.78),
                accentColor: new BABYLON.Color3(0.7, 0.85, 1.0),
                words: ['mingxian', 'xiaoxiang', 'yule']
            },
            {
                id: 'green',
                name: '绿衣神女',
                description: 'Green nature robe — mysterious and free',
                color: new BABYLON.Color3(0.18, 0.62, 0.28),
                accentColor: new BABYLON.Color3(0.85, 1.0, 0.6),
                words: ['rencai', 'qinfen', 'zunjing']
            }
        ];
    }

    show(onComplete) {
        this._onComplete = onComplete;
        this._buildPanel();
    }

    _buildPanel() {
        if (this._panel) {
            this.gui.removeControl(this._panel);
            this._panel.dispose();
        }

        const dim = new BABYLON.GUI.Rectangle('dressDim');
        dim.width = '100%';
        dim.height = '100%';
        dim.background = 'rgba(0,0,0,0.75)';
        dim.thickness = 0;
        dim.isPointerBlocker = true;
        this.gui.addControl(dim);
        this._panel = dim;

        const card = new BABYLON.GUI.Rectangle('dressCard');
        card.width = '700px';
        card.height = '480px';
        card.background = 'rgba(15, 10, 30, 0.97)';
        card.cornerRadius = 16;
        card.thickness = 2;
        card.color = 'rgba(255,215,0,0.6)';
        dim.addControl(card);

        const title = new BABYLON.GUI.TextBlock('dressTitle', '✨ 选择你的装扮');
        title.color = '#ffd700';
        title.fontSize = 26;
        title.fontFamily = '"Microsoft YaHei", serif';
        title.fontWeight = 'bold';
        title.top = '-190px';
        card.addControl(title);

        const subtitle = new BABYLON.GUI.TextBlock('dressSub', '每套装扮需要学会3个词语才能解锁');
        subtitle.color = '#aaa888';
        subtitle.fontSize = 13;
        subtitle.top = '-158px';
        card.addControl(subtitle);

        // Three dress option buttons
        const xPositions = [-220, 0, 220];
        this._dressButtons = [];
        this.dresses.forEach((dress, i) => {
            this._buildDressOption(card, dress, i, xPositions[i]);
        });
    }

    _buildDressOption(card, dress, index, xPos) {
        const col = dress.color;
        const hexColor = `rgb(${Math.round(col.r*255)},${Math.round(col.g*255)},${Math.round(col.b*255)})`;

        const btn = new BABYLON.GUI.Rectangle('dress_' + index);
        btn.width = '190px';
        btn.height = '300px';
        btn.left = xPos + 'px';
        btn.top = '20px';
        btn.background = 'rgba(255,255,255,0.05)';
        btn.cornerRadius = 12;
        btn.thickness = 2;
        btn.color = hexColor;
        btn.isPointerBlocker = true;
        card.addControl(btn);
        this._dressButtons.push(btn);

        // Dress silhouette (colored rectangle + circles)
        const figure = new BABYLON.GUI.Rectangle('figure_' + index);
        figure.width = '60px';
        figure.height = '130px';
        figure.top = '-60px';
        figure.background = hexColor;
        figure.cornerRadius = 8;
        figure.thickness = 0;
        btn.addControl(figure);

        const head = new BABYLON.GUI.Ellipse('head_' + index);
        head.width = '40px';
        head.height = '40px';
        head.top = '-130px';
        head.background = '#d4a070';
        head.thickness = 0;
        btn.addControl(head);

        const dressName = new BABYLON.GUI.TextBlock('dname_' + index, dress.name);
        dressName.color = '#ffffff';
        dressName.fontSize = 14;
        dressName.fontFamily = '"Microsoft YaHei", serif';
        dressName.fontWeight = 'bold';
        dressName.top = '55px';
        btn.addControl(dressName);

        const dressDesc = new BABYLON.GUI.TextBlock('ddesc_' + index, dress.description);
        dressDesc.color = '#aaaacc';
        dressDesc.fontSize = 11;
        dressDesc.top = '82px';
        dressDesc.textWrapping = true;
        dressDesc.width = '170px';
        btn.addControl(dressDesc);

        // Word cost labels
        const costLabel = new BABYLON.GUI.TextBlock('dcost_' + index, '🔒 需要学会：');
        costLabel.color = '#ffcc66';
        costLabel.fontSize = 11;
        costLabel.top = '108px';
        btn.addControl(costLabel);

        dress.words.forEach((wid, wi) => {
            const wordData = this.learningSystem.words.find(w => w.id === wid);
            const wLabel = new BABYLON.GUI.TextBlock('dword_' + index + '_' + wi,
                wordData ? wordData.characters : wid);
            wLabel.color = '#88ccff';
            wLabel.fontSize = 13;
            wLabel.fontFamily = '"Microsoft YaHei", serif';
            wLabel.top = (128 + wi * 22) + 'px';
            btn.addControl(wLabel);
        });

        // Select button
        const selBtn = new BABYLON.GUI.Rectangle('dsel_' + index);
        selBtn.width = '140px';
        selBtn.height = '32px';
        selBtn.top = '120px';
        selBtn.background = hexColor;
        selBtn.cornerRadius = 8;
        selBtn.thickness = 0;
        selBtn.isPointerBlocker = true;
        btn.addControl(selBtn);

        const selLabel = new BABYLON.GUI.TextBlock();
        selLabel.text = '选择此装扮';
        selLabel.color = '#ffffff';
        selLabel.fontSize = 13;
        selBtn.addControl(selLabel);

        selBtn.onPointerEnterObservable.add(() => { selBtn.alpha = 0.8; });
        selBtn.onPointerOutObservable.add(() => { selBtn.alpha = 1; });
        selBtn.onPointerClickObservable.add(() => this._selectDress(index, dress));
    }

    _selectDress(index, dress) {
        // Check if all 3 words are mastered or in review
        const allLearned = dress.words.every(wid => {
            const state = this.learningSystem.wordStates[wid];
            return state === 'mastered' || state === 'review' || state === 'learning';
        });

        if (!allLearned) {
            // Show word challenge for first unlearned word
            const unlearned = dress.words.find(wid => {
                const state = this.learningSystem.wordStates[wid];
                return !state || state === 'unseen';
            });
            if (unlearned) {
                this._showWordChallenge(dress, unlearned, () => this._selectDress(index, dress));
                return;
            }
        }

        // Dress selected!
        this.selectedDress = index;
        this._applyDress(dress);
        this._close();
        if (this._onComplete) this._onComplete(dress);
    }

    _showWordChallenge(dress, wordId, onLearned) {
        const word = this.learningSystem.words.find(w => w.id === wordId);
        if (!word) { onLearned(); return; }

        const overlay = new BABYLON.GUI.Rectangle('dressWordOverlay');
        overlay.width = '400px';
        overlay.height = '280px';
        overlay.background = 'rgba(10,8,25,0.98)';
        overlay.cornerRadius = 12;
        overlay.thickness = 2;
        overlay.color = 'rgba(255,215,0,0.7)';
        overlay.isPointerBlocker = true;
        this.gui.addControl(overlay);

        const chars = new BABYLON.GUI.TextBlock('dwChars', word.characters);
        chars.color = '#ffffff';
        chars.fontSize = 52;
        chars.fontFamily = '"Microsoft YaHei", serif';
        chars.top = '-75px';
        overlay.addControl(chars);

        const py = new BABYLON.GUI.TextBlock('dwPy', word.pinyin);
        py.color = '#88ccff';
        py.fontSize = 20;
        py.top = '-30px';
        py.alpha = 0;
        overlay.addControl(py);

        const meaning = new BABYLON.GUI.TextBlock('dwMeaning', word.meaning);
        meaning.color = '#aaddaa';
        meaning.fontSize = 16;
        meaning.top = '10px';
        meaning.alpha = 0;
        overlay.addControl(meaning);

        const status = new BABYLON.GUI.TextBlock('dwStatus', 'Type pinyin or speak!');
        status.color = '#ffcc44';
        status.fontSize = 13;
        status.top = '45px';
        overlay.addControl(status);

        const input = new BABYLON.GUI.InputText('dwInput');
        input.width = '200px';
        input.height = '32px';
        input.top = '82px';
        input.left = '-55px';
        input.color = '#aaddff';
        input.background = 'rgba(0,0,30,0.85)';
        input.focusedBackground = 'rgba(10,10,60,0.95)';
        input.placeholderText = 'pinyin...';
        input.placeholderColor = '#445566';
        input.fontSize = 13;
        input.thickness = 1;
        input.isPointerBlocker = true;
        overlay.addControl(input);

        const checkFn = () => {
            const typed = input.text.trim();
            if (!typed) return;
            if (this.gameEngine._matchPinyin(typed, word.pinyin)) {
                this.learningSystem.masterWord(word.id);
                status.text = '✨ 正确！';
                status.color = '#44ff88';
                meaning.alpha = 1;
                setTimeout(() => {
                    this.gui.removeControl(overlay);
                    overlay.dispose();
                    onLearned();
                }, 900);
            } else {
                status.text = `✗ "${typed}" — 再试一次`;
                status.color = '#ff8888';
            }
        };

        input.onKeyboardEventProcessedObservable.add((e) => {
            if (e.key === 'Enter' || e.keyCode === 13) checkFn();
        });

        const checkBtn = new BABYLON.GUI.Rectangle('dwCheck');
        checkBtn.width = '80px';
        checkBtn.height = '32px';
        checkBtn.top = '82px';
        checkBtn.left = '120px';
        checkBtn.background = '#1a4a2a';
        checkBtn.cornerRadius = 6;
        checkBtn.thickness = 1;
        checkBtn.color = '#44aa66';
        checkBtn.isPointerBlocker = true;
        overlay.addControl(checkBtn);
        const cl = new BABYLON.GUI.TextBlock(); cl.text = 'Check ✓'; cl.color = '#44ff88'; cl.fontSize = 12;
        checkBtn.addControl(cl);
        checkBtn.onPointerClickObservable.add(checkFn);

        const hintBtn = new BABYLON.GUI.Rectangle('dwHint');
        hintBtn.width = '100px';
        hintBtn.height = '28px';
        hintBtn.top = '122px';
        hintBtn.background = '#3a2a1a';
        hintBtn.cornerRadius = 6;
        hintBtn.thickness = 1;
        hintBtn.color = '#aa8844';
        hintBtn.isPointerBlocker = true;
        overlay.addControl(hintBtn);
        const hl = new BABYLON.GUI.TextBlock(); hl.text = '显示提示'; hl.color = '#ffcc66'; hl.fontSize = 12;
        hintBtn.addControl(hl);
        hintBtn.onPointerClickObservable.add(() => { py.alpha = 1; meaning.alpha = 1; });
    }

    _applyDress(dress) {
        const player = this.gameEngine.player;
        if (!player || !player.mesh) return;
        const mats = player.mesh.getChildMeshes().filter(m => m.material);
        mats.forEach(m => {
            if (!m.material) return;
            if (m.material.albedoColor !== undefined) {
                m.material.albedoColor = dress.color;
                m.material.emissiveColor = dress.color.scale(0.15);
            } else if (m.material.diffuseColor !== undefined) {
                m.material.diffuseColor = dress.color;
            }
        });
    }

    _close() {
        if (this._panel) {
            this.gui.removeControl(this._panel);
            this._panel.dispose();
            this._panel = null;
        }
    }
}
