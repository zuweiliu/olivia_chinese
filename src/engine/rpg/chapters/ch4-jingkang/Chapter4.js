/**
 * Chapter4 - 靖康之变
 * Huizong paints while 3 warnings go unheeded → Jin army captures Kaifeng → Northern Song falls
 */
class Chapter4 {
    constructor(engine) {
        this.engine = engine;
        this.dialogueData = {};
        this._scene = null;
    }

    async load() {
        this.dialogueData = await fetch('data/rpg/chapters/ch4-jingkang/dialogue.json')
            .then(r => r.json());
    }

    start() {
        this.engine.setChapterBadge('第四章：靖康之变');

        if (!this.engine.catCompanion) {
            this.engine.catCompanion = new CompanionNPC(this.engine.scene, {
                name: '猫猫', type: 'cat',
                followOffset: new BABYLON.Vector3(-2, 0, -1.5),
                followSpeed: 5, scale: 1
            });
            this.engine.catCompanion.build();
        }

        this._scene = new JingkangScene(this.engine, this.dialogueData);
        this.engine.fadeScreen('out', 600);
        this._scene.run().then(() => {
            this.engine.fadeScreen('in', 800).then(() => {
                this._showEndScreen();
            });
        });
    }

    update(dt) {}

    dispose() {
        if (this._scene) { this._scene.dispose(); this._scene = null; }
        if (this.engine.catCompanion) {
            this.engine.catCompanion.setPosition(new BABYLON.Vector3(0, -20, 0));
        }
    }

    _showEndScreen() {
        const dim = new BABYLON.GUI.Rectangle('ch4EndDim');
        dim.width = '100%'; dim.height = '100%';
        dim.background = 'rgba(0,0,0,0.92)';
        dim.thickness = 0; dim.isPointerBlocker = true;
        this.engine.ui.addControl(dim);

        const card = new BABYLON.GUI.Rectangle('ch4EndCard');
        card.width = '600px'; card.height = '380px';
        card.background = 'rgba(12,3,3,0.98)';
        card.cornerRadius = 22; card.thickness = 3; card.color = '#cc4444';
        dim.addControl(card);

        const title = new BABYLON.GUI.TextBlock('', '⚔️ 北宋灭亡');
        title.color = '#ff6666'; title.fontSize = 38;
        title.fontFamily = '"Microsoft YaHei", serif';
        title.fontWeight = 'bold'; title.top = '-128px';
        card.addControl(title);

        const sub = new BABYLON.GUI.TextBlock('', '1127年 · 靖康之变');
        sub.color = '#aa6644'; sub.fontSize = 16;
        sub.fontFamily = '"Microsoft YaHei", serif';
        sub.top = '-88px';
        card.addControl(sub);

        const lines = [
            { icon: '🎨', text: '宋徽宗：才华横溢的画家，无能的皇帝', color: '#ffcc88' },
            { icon: '⚠️', text: '三道警报被无视，国家走向灭亡',         color: '#ff9999' },
            { icon: '🐱', text: '猫猫：都怪我没有更努力地提醒……',       color: '#aaaaff' },
            { icon: '📜', text: '瘦金体书法与《瑞鹤图》流传千古',        color: '#aaddcc' }
        ];
        lines.forEach((l, i) => {
            const tb = new BABYLON.GUI.TextBlock('ch4L' + i, l.icon + ' ' + l.text);
            tb.color = l.color; tb.fontSize = 14;
            tb.fontFamily = '"Microsoft YaHei", serif';
            tb.top = (-34 + i * 34) + 'px';
            card.addControl(tb);
        });

        const replayBtn = new BABYLON.GUI.Rectangle('ch4Replay');
        replayBtn.width = '200px'; replayBtn.height = '42px'; replayBtn.top = '155px';
        replayBtn.background = '#1a0505'; replayBtn.cornerRadius = 10;
        replayBtn.thickness = 2; replayBtn.color = '#cc4444'; replayBtn.isPointerBlocker = true;
        card.addControl(replayBtn);
        const rL = new BABYLON.GUI.TextBlock();
        rL.text = '🔄 返回章节选择'; rL.color = '#cc8888'; rL.fontSize = 14;
        rL.fontFamily = '"Microsoft YaHei", serif';
        replayBtn.addControl(rL);
        replayBtn.onPointerEnterObservable.add(() => { replayBtn.background = '#2a0808'; });
        replayBtn.onPointerOutObservable.add(() => { replayBtn.background = '#1a0505'; });
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
