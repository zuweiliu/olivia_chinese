/**
 * Chapter2 - 杯酒释兵权 + 科举考试
 * Feast scene (generals give up military seals) → player suggests 科举
 * → exam hall → scholars become officials → country stabilises
 */
class Chapter2 {
    constructor(engine) {
        this.engine = engine;
        this.dialogueData = {};
        this._feastScene = null;
        this._examScene  = null;
    }

    async load() {
        this.dialogueData = await fetch('data/rpg/chapters/ch2-feast/dialogue.json')
            .then(r => r.json());
    }

    start() {
        this.engine.setChapterBadge('第二章：杯酒释兵权 · 科举考试');
        this._runTransition();
    }

    update(dt) {
        // No per-frame logic needed beyond shared game loop
    }

    dispose() {
        if (this._feastScene) { this._feastScene.dispose(); this._feastScene = null; }
        if (this._examScene)  { this._examScene.dispose();  this._examScene  = null; }
        // Hide companions — they'll be re-used by engine but feast/exam scenes
        // position them manually, so just teleport them away
        if (this.engine.zhaoCompanion) {
            this.engine.zhaoCompanion.setPosition(new BABYLON.Vector3(0, -20, 0));
        }
        if (this.engine.catCompanion) {
            this.engine.catCompanion.setPosition(new BABYLON.Vector3(0, -20, 0));
        }
    }

    // ── Flow ──────────────────────────────────────────────────────────────────

    async _runTransition() {
        // Brief dialogue bridge from Chapter 1 victory
        await this.engine.fadeScreen('out', 700);

        // Position companions for feast room (make sure they exist)
        if (!this.engine.zhaoCompanion) {
            this.engine.zhaoCompanion = new CompanionNPC(this.engine.scene, {
                name: '赵匡胤', type: 'human',
                color: new BABYLON.Color3(0.6, 0.4, 0.1),
                followOffset: new BABYLON.Vector3(2.5, 0, -2),
                followSpeed: 4, scale: 1
            });
            this.engine.zhaoCompanion.build();
        }
        if (!this.engine.catCompanion) {
            this.engine.catCompanion = new CompanionNPC(this.engine.scene, {
                name: '猫猫', type: 'cat',
                followOffset: new BABYLON.Vector3(-2, 0, -1.5),
                followSpeed: 5, scale: 1
            });
            this.engine.catCompanion.build();
        }
        // Park companions off-screen until scenes position them
        this.engine.zhaoCompanion.setPosition(new BABYLON.Vector3(0, -20, 0));
        this.engine.catCompanion.setPosition(new BABYLON.Vector3(0, -20, 0));

        // Build feast scene
        this._feastScene = new FeastScene(this.engine, this.dialogueData);

        this.engine.dialogueSystem.show(this.dialogueData.transition, async () => {
            await this.engine.fadeScreen('out', 700);

            // Run feast
            await this._feastScene.run();

            // Transition to exam hall
            await this.engine.fadeScreen('in', 600);
            await this._delay(300);
            await this.engine.fadeScreen('out', 700);

            this._feastScene.dispose();
            this._feastScene = null;

            // Build and run exam scene
            this._examScene = new ExamScene(this.engine, this.dialogueData);
            await this._examScene.run();

            // Done — show final stability screen then reload option
            await this.engine.fadeScreen('in', 600);
            await this._delay(400);
            this._showEndScreen();
        });
    }

    _showEndScreen() {
        const dim = new BABYLON.GUI.Rectangle('endDim');
        dim.width = '100%'; dim.height = '100%';
        dim.background = 'rgba(0,0,0,0.80)';
        dim.thickness = 0; dim.isPointerBlocker = true;
        this.engine.ui.addControl(dim);

        const card = new BABYLON.GUI.Rectangle('endCard');
        card.width = '600px'; card.height = '380px';
        card.background = 'rgba(12,8,2,0.98)';
        card.cornerRadius = 22; card.thickness = 3; card.color = '#ffd700';
        dim.addControl(card);

        const title = new BABYLON.GUI.TextBlock('endTitle', '🌸 大宋太平盛世');
        title.color = '#ffd700'; title.fontSize = 44;
        title.fontFamily = '"Microsoft YaHei", serif';
        title.fontWeight = 'bold'; title.top = '-120px';
        card.addControl(title);

        const lines = [
            '军权归皇帝，不再有军阀割据。',
            '科举制度选拔人才，文化繁荣。',
            '重文轻武的传统开始了。',
            '宋朝成为中国历史上最富有的朝代之一。'
        ];
        lines.forEach((line, i) => {
            const tb = new BABYLON.GUI.TextBlock('el' + i, (i === 0 ? '✅ ' : i === 1 ? '✅ ' : i === 2 ? '📖 ' : '💰 ') + line);
            tb.color = i < 2 ? '#88ff88' : '#ddccaa';
            tb.fontSize = 16;
            tb.fontFamily = '"Microsoft YaHei", serif';
            tb.top = (-50 + i * 34) + 'px';
            card.addControl(tb);
        });

        const catTxt = new BABYLON.GUI.TextBlock('catFinal', '猫猫：喵～（骄傲地昂起头）');
        catTxt.color = '#aaaaff'; catTxt.fontSize = 14;
        catTxt.fontFamily = '"Microsoft YaHei", serif'; catTxt.top = '102px';
        card.addControl(catTxt);

        const replayBtn = new BABYLON.GUI.Rectangle('finalReplay');
        replayBtn.width = '180px'; replayBtn.height = '44px';
        replayBtn.top = '148px';
        replayBtn.background = '#3a2a08'; replayBtn.cornerRadius = 10;
        replayBtn.thickness = 2; replayBtn.color = '#ffd700'; replayBtn.isPointerBlocker = true;
        card.addControl(replayBtn);
        const rL = new BABYLON.GUI.TextBlock();
        rL.text = '🔄 重新开始'; rL.color = '#ffd700'; rL.fontSize = 16;
        rL.fontFamily = '"Microsoft YaHei", serif';
        replayBtn.addControl(rL);
        replayBtn.onPointerEnterObservable.add(() => { replayBtn.background = '#5a4a18'; });
        replayBtn.onPointerOutObservable.add(() => { replayBtn.background = '#3a2a08'; });
        replayBtn.onPointerClickObservable.add(() => {
            localStorage.removeItem('flyChina_rpg_progress');
            window.location.reload();
        });
    }

    _delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
}
