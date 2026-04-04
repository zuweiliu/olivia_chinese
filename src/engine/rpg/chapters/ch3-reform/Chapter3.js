/**
 * Chapter3 - 王安石变法
 * Wang Anshi presents fiscal crisis → player suggests reform →
 * 3 measures × 3 words each → conservative opposition → failure
 */
class Chapter3 {
    constructor(engine) {
        this.engine = engine;
        this.dialogueData = {};
        this._reformScene = null;
    }

    async load() {
        this.dialogueData = await fetch('data/rpg/chapters/ch3-reform/dialogue.json')
            .then(r => r.json());
    }

    start() {
        this.engine.setChapterBadge('第三章：王安石变法');

        // Ensure cat companion exists beside player
        if (!this.engine.catCompanion) {
            this.engine.catCompanion = new CompanionNPC(this.engine.scene, {
                name: '猫猫', type: 'cat',
                followOffset: new BABYLON.Vector3(-2, 0, -1.5),
                followSpeed: 5, scale: 1
            });
            this.engine.catCompanion.build();
        }

        this._reformScene = new ReformScene(this.engine, this.dialogueData);

        // Reveal scene then run
        this.engine.fadeScreen('out', 600);
        this._reformScene.run().then(() => {
            this.engine.fadeScreen('in', 600).then(() => {
                this._showEndScreen();
            });
        });
    }

    update(dt) {}

    dispose() {
        if (this._reformScene) { this._reformScene.dispose(); this._reformScene = null; }
        if (this.engine.catCompanion) {
            this.engine.catCompanion.setPosition(new BABYLON.Vector3(0, -20, 0));
        }
    }

    _showEndScreen() {
        const dim = new BABYLON.GUI.Rectangle('ch3EndDim');
        dim.width = '100%'; dim.height = '100%';
        dim.background = 'rgba(0,0,0,0.88)';
        dim.thickness = 0; dim.isPointerBlocker = true;
        this.engine.ui.addControl(dim);

        const card = new BABYLON.GUI.Rectangle('ch3EndCard');
        card.width = '580px'; card.height = '360px';
        card.background = 'rgba(12,8,2,0.98)';
        card.cornerRadius = 22; card.thickness = 3; card.color = '#88aaff';
        dim.addControl(card);

        const title = new BABYLON.GUI.TextBlock('', '📜 王安石变法');
        title.color = '#88aaff'; title.fontSize = 36;
        title.fontFamily = '"Microsoft YaHei", serif';
        title.fontWeight = 'bold'; title.top = '-118px';
        card.addControl(title);

        const lines = [
            { icon: '❌', text: '变法失败：保守派强烈反对', color: '#ff8888' },
            { icon: '📖', text: '王安石成为著名的改革家和文学家', color: '#aaddff' },
            { icon: '💡', text: '变法思想影响后世千年', color: '#ffdd88' },
            { icon: '🐱', text: '猫猫：喵…（虽败犹荣）', color: '#aaaaff' }
        ];
        lines.forEach((l, i) => {
            const tb = new BABYLON.GUI.TextBlock('ch3L' + i, l.icon + ' ' + l.text);
            tb.color = l.color; tb.fontSize = 15;
            tb.fontFamily = '"Microsoft YaHei", serif';
            tb.top = (-42 + i * 34) + 'px';
            card.addControl(tb);
        });

        const replayBtn = new BABYLON.GUI.Rectangle('ch3Replay');
        replayBtn.width = '200px'; replayBtn.height = '42px'; replayBtn.top = '140px';
        replayBtn.background = '#1a1a3a'; replayBtn.cornerRadius = 10;
        replayBtn.thickness = 2; replayBtn.color = '#88aaff'; replayBtn.isPointerBlocker = true;
        card.addControl(replayBtn);
        const rL = new BABYLON.GUI.TextBlock();
        rL.text = '🔄 返回章节选择'; rL.color = '#88aaff'; rL.fontSize = 14;
        rL.fontFamily = '"Microsoft YaHei", serif';
        replayBtn.addControl(rL);
        replayBtn.onPointerEnterObservable.add(() => { replayBtn.background = '#2a2a5a'; });
        replayBtn.onPointerOutObservable.add(() => { replayBtn.background = '#1a1a3a'; });
        replayBtn.onPointerClickObservable.add(() => {
            this.engine.ui.removeControl(dim); dim.dispose();
            this.engine.fadeScreen('in', 400).then(() => {
                this.dispose();
                this.engine._showChapterSelect();
                this.engine.fadeScreen('out', 500);
            });
        });
    }
}
