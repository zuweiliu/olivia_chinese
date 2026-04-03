/**
 * Chapter1 - 五代十国征服篇
 * Intro → dress selection → cat adoption → open world → conquer 5 kingdoms → victory
 */
class Chapter1 {
    constructor(engine) {
        this.engine = engine; // RPGGameEngine
        this._meshes = [];    // chapter-specific meshes to dispose
        this._guiControls = [];

        this.kingdoms = [];
        this.dialogueData = {};
        this.worldBuilder = null;
        this.conquestManager = null;
        this.dressSystem = null;
        this.state = 'intro';

        this._keyHandler = null;
    }

    async load() {
        [this.kingdoms, this.dialogueData] = await Promise.all([
            fetch('data/rpg/chapters/ch1-conquest/kingdoms.json').then(r => r.json()),
            fetch('data/rpg/chapters/ch1-conquest/dialogue.json').then(r => r.json())
        ]);
    }

    start() {
        this.engine.setChapterBadge('第一章：五代十国 | WASD移动 | E进攻');

        // Build open world
        this.worldBuilder = new OpenWorldBuilder(this.engine.scene, this.kingdoms);
        this.worldBuilder.build();

        // Position player at base (开封)
        const kaifeng = this.kingdoms.find(k => k.isBase);
        if (kaifeng) {
            this.engine.player.mesh.position = new BABYLON.Vector3(
                kaifeng.position.x, 2, kaifeng.position.z + 8
            );
        }
        this.engine.player.bounds = { minX: -350, maxX: 350, minY: 0.5, maxY: 40, minZ: -350, maxZ: 350 };
        this.engine.player.isLocked = true;

        // Ambient particles for open world
        this.engine.particles.createAmbient();
        this.engine.particles.createFireflies();
        this.engine.particles.createPlayerTrail(this.engine.player.mesh);

        // E key to trigger conquest
        this._keyHandler = (e) => {
            if (e.code === 'KeyE' && this.state === 'exploring') {
                this.conquestManager && this.conquestManager.tryConquest(this.engine.player.mesh.position);
            }
        };
        window.addEventListener('keydown', this._keyHandler);

        this._startIntro();
    }

    update(dt) {
        if (this.conquestManager && this.state === 'exploring') {
            this.conquestManager.update(this.engine.player.mesh.position);
        }
    }

    dispose() {
        if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler);
        if (this.worldBuilder) {
            this.engine.scene.meshes
                .filter(m => m.name.startsWith('ground') || m.name.startsWith('river') ||
                             m.name.startsWith('mtn') || m.name.startsWith('cap') ||
                             m.name.startsWith('hill') || m.name.startsWith('path') ||
                             m.name.startsWith('city') || m.name.startsWith('castle') ||
                             m.name.startsWith('tree') || m.name.startsWith('sign') ||
                             m.name.startsWith('tower'))
                .forEach(m => m.dispose());
        }
        this._guiControls.forEach(c => { try { this.engine.ui.removeControl(c); c.dispose(); } catch(e){} });
        this._guiControls = [];
    }

    // ── Intro ─────────────────────────────────────────────────────────────────

    _startIntro() {
        this.state = 'intro';
        this.engine.dialogueSystem.show(this.dialogueData.intro || [], () => {
            this._startDressSelection();
        });
    }

    // ── Dress selection ───────────────────────────────────────────────────────

    _startDressSelection() {
        this.state = 'dress';
        this.engine.dialogueSystem.show(this.dialogueData.dress_prompt || [], () => {
            this.dressSystem = new DressSystem(
                this.engine.ui, this.engine.learningSystem, this.engine.speechSystem, this
            );
            this.dressSystem.show(() => this._afterDressSelected());
        });
    }

    _afterDressSelected() {
        this.engine.zhaoCompanion = new CompanionNPC(this.engine.scene, {
            name: '赵匡胤', type: 'human',
            color: new BABYLON.Color3(0.6, 0.4, 0.1),
            followOffset: new BABYLON.Vector3(2.5, 0, -2),
            followSpeed: 4, scale: 1
        });
        this.engine.zhaoCompanion.build();
        this.engine.zhaoCompanion.setPosition(
            this.engine.player.mesh.position.clone().add(new BABYLON.Vector3(3, 0, 0))
        );
        this._startCatAdoption();
    }

    // ── Cat adoption ──────────────────────────────────────────────────────────

    _startCatAdoption() {
        this.engine.dialogueSystem.show(this.dialogueData.cat_prompt || [], () => {
            this._runCatWordChallenge();
        });
    }

    _runCatWordChallenge() {
        const catWords = ['jundui', 'zuozhan', 'fandui'];
        const words = catWords
            .map(id => this.engine.learningSystem.words.find(w => w.id === id))
            .filter(Boolean);
        let idx = 0;
        const next = () => {
            if (idx >= words.length) { this._adoptCat(); return; }
            this.engine.showWordChallenge(words[idx], '🐱 猫猫想学这个词！', () => {
                idx++; setTimeout(next, 500);
            });
        };
        next();
    }

    _adoptCat() {
        this.engine.catCompanion = new CompanionNPC(this.engine.scene, {
            name: '猫猫', type: 'cat',
            followOffset: new BABYLON.Vector3(-2, 0, -1.5),
            followSpeed: 5, scale: 1
        });
        this.engine.catCompanion.build();
        this.engine.catCompanion.setPosition(
            this.engine.player.mesh.position.clone().add(new BABYLON.Vector3(-2, 0, 0))
        );
        this.engine.dialogueSystem.show(this.dialogueData.depart || [], () => {
            this._startExploring();
        });
    }

    // ── Exploration & conquest ────────────────────────────────────────────────

    _startExploring() {
        this.state = 'exploring';
        this.engine.player.isLocked = false;

        this.conquestManager = new ConquestManager(
            this.engine.scene, this.engine.ui, this.kingdoms,
            this.engine.learningSystem, this.engine.speechSystem,
            this.engine.dialogueSystem, this.engine.catCompanion, this
        );
        this.conquestManager.setWorldBuilder(this.worldBuilder);
        this.conquestManager.setOnVictory(() => this._showVictory());
        this.conquestManager.buildHUD();
    }

    // ── Victory ───────────────────────────────────────────────────────────────

    _showVictory() {
        this.state = 'victory';
        this.engine.player.isLocked = true;

        const base = this.kingdoms.find(k => k.isBase);
        if (base && this.engine.particles) {
            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    this.engine.particles.burstAt(new BABYLON.Vector3(
                        base.position.x + (Math.random() - 0.5) * 22,
                        8,
                        base.position.z + (Math.random() - 0.5) * 22
                    ));
                }, i * 350);
            }
        }

        setTimeout(() => {
            this.engine.dialogueSystem.show(this.dialogueData.victory || [], () => {
                this._showVictoryScreen();
            });
        }, 800);
    }

    _showVictoryScreen() {
        const dim = new BABYLON.GUI.Rectangle('victoryDim');
        dim.width = '100%'; dim.height = '100%';
        dim.background = 'rgba(0,0,0,0.75)';
        dim.thickness = 0; dim.isPointerBlocker = true;
        this.engine.ui.addControl(dim);
        this._guiControls.push(dim);

        const card = new BABYLON.GUI.Rectangle('victoryCard');
        card.width = '580px'; card.height = '340px';
        card.background = 'rgba(15,10,30,0.98)';
        card.cornerRadius = 20; card.thickness = 3; card.color = '#ffd700';
        dim.addControl(card);

        const title = new BABYLON.GUI.TextBlock('vTitle', '🎉 大宋建立！');
        title.color = '#ffd700'; title.fontSize = 42;
        title.fontFamily = '"Microsoft YaHei", serif';
        title.fontWeight = 'bold'; title.top = '-100px';
        card.addControl(title);

        const sub = new BABYLON.GUI.TextBlock('vSub', '公元960年，赵匡胤统一中原，建立宋朝，定都开封');
        sub.color = '#ddccaa'; sub.fontSize = 17;
        sub.fontFamily = '"Microsoft YaHei", serif';
        sub.top = '-48px'; sub.textWrapping = true; sub.width = '500px';
        card.addControl(sub);

        const kingdoms = new BABYLON.GUI.TextBlock('vKingdoms', '后梁 ✅  后唐 ✅  后晋 ✅  后汉 ✅  后周 ✅');
        kingdoms.color = '#88ff88'; kingdoms.fontSize = 16;
        kingdoms.fontFamily = '"Microsoft YaHei", serif'; kingdoms.top = '12px';
        card.addControl(kingdoms);

        const cat = new BABYLON.GUI.TextBlock('vCat', '猫猫：喵～（打了个嗝）');
        cat.color = '#aaaaff'; cat.fontSize = 14;
        cat.fontFamily = '"Microsoft YaHei", serif'; cat.top = '52px';
        card.addControl(cat);

        // Next chapter button
        const nextBtn = new BABYLON.GUI.Rectangle('nextChBtn');
        nextBtn.width = '220px'; nextBtn.height = '42px';
        nextBtn.top = '100px'; nextBtn.left = '-65px';
        nextBtn.background = '#1a3a5a'; nextBtn.cornerRadius = 10;
        nextBtn.thickness = 2; nextBtn.color = '#66aaff'; nextBtn.isPointerBlocker = true;
        card.addControl(nextBtn);
        const nL = new BABYLON.GUI.TextBlock();
        nL.text = '▶ 第二章：杯酒释兵权'; nL.color = '#88ccff'; nL.fontSize = 14;
        nL.fontFamily = '"Microsoft YaHei", serif';
        nextBtn.addControl(nL);
        nextBtn.onPointerEnterObservable.add(() => { nextBtn.background = '#2a5a8a'; });
        nextBtn.onPointerOutObservable.add(() => { nextBtn.background = '#1a3a5a'; });
        nextBtn.onPointerClickObservable.add(async () => {
            this.engine.ui.removeControl(dim); dim.dispose();
            await this.engine.fadeScreen('in', 700);
            this.engine.nextChapter();
        });

        // Replay button
        const replayBtn = new BABYLON.GUI.Rectangle('replayBtn');
        replayBtn.width = '130px'; replayBtn.height = '42px';
        replayBtn.top = '100px'; replayBtn.left = '95px';
        replayBtn.background = '#3a2a08'; replayBtn.cornerRadius = 10;
        replayBtn.thickness = 2; replayBtn.color = '#ffd700'; replayBtn.isPointerBlocker = true;
        card.addControl(replayBtn);
        const rL = new BABYLON.GUI.TextBlock();
        rL.text = '🔄 再玩一次'; rL.color = '#ffd700'; rL.fontSize = 14;
        rL.fontFamily = '"Microsoft YaHei", serif';
        replayBtn.addControl(rL);
        replayBtn.onPointerEnterObservable.add(() => { replayBtn.background = '#5a4a18'; });
        replayBtn.onPointerOutObservable.add(() => { replayBtn.background = '#3a2a08'; });
        replayBtn.onPointerClickObservable.add(() => {
            localStorage.removeItem('flyChina_rpg_progress');
            window.location.reload();
        });
    }

    // ── Proxy getters — ConquestManager/DressSystem use these ────────────────
    get player()     { return this.engine.player; }
    get music()      { return this.engine.music; }
    get particles()  { return this.engine.particles; }
    get scene()      { return this.engine.scene; }

    // DressSystem calls _matchPinyin on `this`
    _matchPinyin(typed, expected) {
        return this.engine.matchPinyin(typed, expected);
    }
}
