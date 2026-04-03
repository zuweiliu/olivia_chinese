/**
 * RPGGameEngine - Orchestrates the 五代十国 time-travel RPG game
 */
class RPGGameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
        this.scene = null;
        this.camera = null;

        // Module references
        this.player = null;
        this.music = null;
        this.learningSystem = null;
        this.speechSystem = null;
        this.ui = null; // BABYLON.GUI.AdvancedDynamicTexture
        this.worldBuilder = null;
        this.dialogueSystem = null;
        this.dressSystem = null;
        this.zhaoCompanion = null;
        this.catCompanion = null;
        this.conquestManager = null;
        this.particles = null;

        // Data
        this.kingdoms = [];
        this.dialogueData = {};

        // State
        this.state = 'loading'; // loading | intro | dress | exploring | challenge | victory
        this._catAdopted = false;
        this._introComplete = false;
    }

    async init() {
        this._createScene();
        this._createLighting();

        // Load data
        this.learningSystem = new LearningSystem('flyChina_rpg_progress');
        this.speechSystem = new SpeechSystem();
        await this.learningSystem.loadTheme('data/themes/song-dynasty');
        [this.kingdoms, this.dialogueData] = await Promise.all([
            fetch('data/rpg/kingdoms.json').then(r => r.json()),
            fetch('data/rpg/dialogue.json').then(r => r.json())
        ]);

        // GUI
        this.ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('rpgUI', true, this.scene);

        // Systems
        this.dialogueSystem = new DialogueSystem(this.ui);
        this.worldBuilder = new OpenWorldBuilder(this.scene, this.kingdoms);
        this.worldBuilder.build();
        this.particles = new ParticleEffects(this.scene);

        // Player (reuse PlayerController)
        const kaifeng = this.kingdoms.find(k => k.isBase);
        this.player = new PlayerController(this.scene, this.canvas);
        if (kaifeng) {
            this.player.mesh.position = new BABYLON.Vector3(kaifeng.position.x, 0, kaifeng.position.z + 5);
        }
        // Expand bounds for the large open world (kingdoms at up to ±160 from center)
        this.player.bounds = { minX: -350, maxX: 350, minY: 0.5, maxY: 40, minZ: -350, maxZ: 350 };
        this.player.isLocked = true;

        // Camera
        this._setupCamera();

        // Background music
        this.music = new BackgroundMusic();
        this.music.init();

        // Particle ambient
        this.particles.createAmbient();
        this.particles.createFireflies();
        this.particles.createPlayerTrail(this.player.mesh);

        // HUD basic
        this._createBasicHUD();

        // Input: E key for interact
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE' && this.state === 'exploring') {
                this.conquestManager && this.conquestManager.tryConquest(this.player.mesh.position);
            }
        });

        // Game loop
        this.scene.registerBeforeRender(() => this._gameLoop());
        this.engine.runRenderLoop(() => this.scene.render());
        window.addEventListener('resize', () => this.engine.resize());

        // Hide loading screen
        const el = document.getElementById('loadingScreen');
        if (el) el.classList.add('hidden');

        // Start intro sequence
        this._startIntro();
    }

    _createScene() {
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(0.05, 0.03, 0.12, 1);
        this.scene.ambientColor = new BABYLON.Color3(0.12, 0.08, 0.18);
        this.scene.collisionsEnabled = true;
    }

    _createLighting() {
        const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), this.scene);
        hemi.intensity = 0.5;
        hemi.diffuse = new BABYLON.Color3(0.85, 0.78, 0.65);
        hemi.groundColor = new BABYLON.Color3(0.18, 0.12, 0.08);

        const dir = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-0.5, -1, 0.5), this.scene);
        dir.position = new BABYLON.Vector3(80, 120, -80);
        dir.intensity = 0.55;
        dir.diffuse = new BABYLON.Color3(1, 0.92, 0.78);

        this.shadowGenerator = new BABYLON.ShadowGenerator(1024, dir);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.darkness = 0.45;

        const glow = new BABYLON.GlowLayer('glow', this.scene, { mainTextureFixedSize: 512, blurKernelSize: 40 });
        glow.intensity = 0.9;
    }

    _setupCamera() {
        this.camera = new BABYLON.ArcRotateCamera('cam', Math.PI, Math.PI / 3.5, 20,
            this.player.mesh.position.clone(), this.scene);
        this.camera.lowerRadiusLimit = 8;
        this.camera.upperRadiusLimit = 40;
        this.camera.lowerBetaLimit = 0.3;
        this.camera.upperBetaLimit = Math.PI / 2.2;
        this.camera.wheelDeltaPercentage = 0.02;
        this.camera.inertia = 0.85;
        this.camera.attachControl(this.canvas, true);
        this.camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
        this.camera.lockedTarget = this.player.mesh;
    }

    _createBasicHUD() {
        // Mute button
        const muteBtn = new BABYLON.GUI.Rectangle('muteBtn');
        muteBtn.width = '32px'; muteBtn.height = '32px';
        muteBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        muteBtn.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        muteBtn.top = '9px'; muteBtn.left = '-14px';
        muteBtn.cornerRadius = 16; muteBtn.thickness = 0;
        muteBtn.background = 'transparent'; muteBtn.isPointerBlocker = true;
        this.ui.addControl(muteBtn);

        this._muteLabel = new BABYLON.GUI.TextBlock('muteLabel', '🎵');
        this._muteLabel.fontSize = 18;
        muteBtn.addControl(this._muteLabel);
        muteBtn.onPointerEnterObservable.add(() => { muteBtn.background = 'rgba(255,255,255,0.15)'; });
        muteBtn.onPointerOutObservable.add(() => { muteBtn.background = 'transparent'; });
        muteBtn.onPointerClickObservable.add(() => {
            if (!this.music) return;
            const muted = this.music.toggle();
            this._muteLabel.text = muted ? '🔇' : '🎵';
        });

        // Controls hint
        const hint = new BABYLON.GUI.TextBlock('hint', 'WASD移动 | E进攻王国 | 鼠标旋转视角');
        hint.color = '#665544';
        hint.fontSize = 11;
        hint.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        hint.top = '-10px';
        this.ui.addControl(hint);
    }

    _startIntro() {
        this.state = 'intro';
        this.dialogueSystem.show(this.dialogueData.intro || [], () => {
            this._startDressSelection();
        });
    }

    _startDressSelection() {
        this.state = 'dress';
        this.dialogueSystem.show(this.dialogueData.dress_prompt || [], () => {
            this.dressSystem = new DressSystem(this.ui, this.learningSystem, this.speechSystem, this);
            this.dressSystem.show((dress) => {
                this._afterDressSelected(dress);
            });
        });
    }

    _afterDressSelected(dress) {
        // Spawn 赵匡胤 companion
        this.zhaoCompanion = new CompanionNPC(this.scene, {
            name: '赵匡胤',
            type: 'human',
            color: new BABYLON.Color3(0.6, 0.4, 0.1),
            followOffset: new BABYLON.Vector3(2.5, 0, -2),
            followSpeed: 4,
            scale: 1
        });
        this.zhaoCompanion.build();
        this.zhaoCompanion.setPosition(this.player.mesh.position.clone().add(new BABYLON.Vector3(3, 0, 0)));

        // Now prompt cat adoption
        this._startCatAdoption();
    }

    _startCatAdoption() {
        this.dialogueSystem.show(this.dialogueData.cat_prompt || [], () => {
            this._showCatWordChallenge();
        });
    }

    _showCatWordChallenge() {
        // Teach 3 cat words (using DressSystem's word challenge pattern)
        const catWords = ['jundui', 'zuozhan', 'fandui'];
        const words = catWords.map(id => this.learningSystem.words.find(w => w.id === id)).filter(Boolean);
        let idx = 0;

        const showNext = () => {
            if (idx >= words.length) {
                this._adoptCat();
                return;
            }
            this._showQuickWordChallenge(words[idx], () => { idx++; setTimeout(showNext, 500); });
        };
        showNext();
    }

    _showQuickWordChallenge(word, onCorrect) {
        const overlay = new BABYLON.GUI.Rectangle('qwOverlay');
        overlay.width = '400px'; overlay.height = '260px';
        overlay.background = 'rgba(10,8,25,0.96)';
        overlay.cornerRadius = 12; overlay.thickness = 2;
        overlay.color = 'rgba(100,200,255,0.6)'; overlay.isPointerBlocker = true;
        this.ui.addControl(overlay);

        const chars = new BABYLON.GUI.TextBlock('qwC', word.characters);
        chars.color = '#ffffff'; chars.fontSize = 52;
        chars.fontFamily = '"Microsoft YaHei", serif'; chars.top = '-70px';
        overlay.addControl(chars);

        const py = new BABYLON.GUI.TextBlock('qwP', word.pinyin);
        py.color = '#88ccff'; py.fontSize = 18; py.top = '-25px'; py.alpha = 0;
        overlay.addControl(py);

        const status = new BABYLON.GUI.TextBlock('qwS', '🐱 猫猫想学这个词！');
        status.color = '#ffcc44'; status.fontSize = 14;
        status.fontFamily = '"Microsoft YaHei", serif'; status.top = '18px';
        overlay.addControl(status);

        const input = new BABYLON.GUI.InputText('qwI');
        input.width = '195px'; input.height = '32px';
        input.top = '60px'; input.left = '-60px';
        input.color = '#aaddff'; input.background = 'rgba(0,0,30,0.85)';
        input.focusedBackground = 'rgba(10,10,60,0.95)';
        input.placeholderText = 'pinyin...'; input.placeholderColor = '#445566';
        input.fontSize = 13; input.thickness = 1; input.isPointerBlocker = true;
        overlay.addControl(input);

        const checkFn = () => {
            const t = input.text.trim();
            if (!t) return;
            if (this._matchPinyin(t, word.pinyin)) {
                this.learningSystem.masterWord(word.id);
                if (this.music) this.music.playCheer();
                status.text = '✨ 正确！猫猫很开心！'; status.color = '#44ff88';
                py.alpha = 1;
                setTimeout(() => { this.ui.removeControl(overlay); overlay.dispose(); onCorrect(); }, 800);
            } else {
                status.text = `✗ "${t}" — 再试`; status.color = '#ff8888';
            }
        };
        input.onKeyboardEventProcessedObservable.add(e => { if (e.key === 'Enter' || e.keyCode === 13) checkFn(); });

        const ck = new BABYLON.GUI.Rectangle('qwCk');
        ck.width = '80px'; ck.height = '32px'; ck.top = '60px'; ck.left = '108px';
        ck.background = '#1a4a2a'; ck.cornerRadius = 6; ck.thickness = 1;
        ck.color = '#44aa66'; ck.isPointerBlocker = true;
        overlay.addControl(ck);
        const ckL = new BABYLON.GUI.TextBlock(); ckL.text = 'Check ✓'; ckL.color = '#44ff88'; ckL.fontSize = 12;
        ck.addControl(ckL);
        ck.onPointerEnterObservable.add(() => { ck.background = '#2a6a3a'; });
        ck.onPointerOutObservable.add(() => { ck.background = '#1a4a2a'; });
        ck.onPointerClickObservable.add(checkFn);

        const hint = new BABYLON.GUI.Rectangle('qwHint');
        hint.width = '100px'; hint.height = '28px'; hint.top = '100px';
        hint.background = '#2a1a2a'; hint.cornerRadius = 6; hint.thickness = 1;
        hint.color = '#886688'; hint.isPointerBlocker = true;
        overlay.addControl(hint);
        const hL = new BABYLON.GUI.TextBlock(); hL.text = '显示拼音'; hL.color = '#cc88cc'; hL.fontSize = 12;
        hint.addControl(hL);
        hint.onPointerClickObservable.add(() => { py.alpha = 1; });

        // TTS
        if (window.speechSynthesis) {
            const u = new SpeechSynthesisUtterance(word.characters);
            u.lang = 'zh-CN'; u.rate = 0.8;
            window.speechSynthesis.cancel();
            setTimeout(() => window.speechSynthesis.speak(u), 300);
        }
    }

    _adoptCat() {
        this._catAdopted = true;

        // Spawn 猫猫 companion
        this.catCompanion = new CompanionNPC(this.scene, {
            name: '猫猫',
            type: 'cat',
            followOffset: new BABYLON.Vector3(-2, 0, -1.5),
            followSpeed: 5,
            scale: 1
        });
        this.catCompanion.build();
        this.catCompanion.setPosition(this.player.mesh.position.clone().add(new BABYLON.Vector3(-2, 0, 0)));

        // Show depart dialogue then unlock player
        this.dialogueSystem.show(this.dialogueData.depart || [], () => {
            this._startExploring();
        });
    }

    _startExploring() {
        this.state = 'exploring';
        this.player.isLocked = false;

        // Build conquest manager
        this.conquestManager = new ConquestManager(
            this.scene, this.ui, this.kingdoms,
            this.learningSystem, this.speechSystem,
            this.dialogueSystem, this.catCompanion, this
        );
        this.conquestManager.setWorldBuilder(this.worldBuilder);
        this.conquestManager.setOnVictory(() => this._showVictory());
        this.conquestManager.buildHUD();
    }

    _showVictory() {
        this.state = 'victory';
        this.player.isLocked = true;

        // Fireworks / celebration particles
        this.kingdoms.forEach(k => {
            if (!k.isBase) return;
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    this.particles.burstAt(new BABYLON.Vector3(
                        k.position.x + (Math.random() - 0.5) * 20,
                        8,
                        k.position.z + (Math.random() - 0.5) * 20
                    ));
                }, i * 400);
            }
        });

        setTimeout(() => {
            this.dialogueSystem.show(this.dialogueData.victory || [], () => {
                this._showVictoryScreen();
            });
        }, 800);
    }

    _showVictoryScreen() {
        const dim = new BABYLON.GUI.Rectangle('victoryDim');
        dim.width = '100%'; dim.height = '100%';
        dim.background = 'rgba(0,0,0,0.7)';
        dim.thickness = 0; dim.isPointerBlocker = true;
        this.ui.addControl(dim);

        const card = new BABYLON.GUI.Rectangle('victoryCard');
        card.width = '560px'; card.height = '320px';
        card.background = 'rgba(15,10,30,0.98)';
        card.cornerRadius = 20; card.thickness = 3;
        card.color = '#ffd700';
        dim.addControl(card);

        const title = new BABYLON.GUI.TextBlock('vTitle', '🎉 大宋建立！');
        title.color = '#ffd700'; title.fontSize = 42;
        title.fontFamily = '"Microsoft YaHei", serif';
        title.fontWeight = 'bold'; title.top = '-90px';
        card.addControl(title);

        const sub = new BABYLON.GUI.TextBlock('vSub', '公元960年，赵匡胤统一中原，建立宋朝');
        sub.color = '#ddccaa'; sub.fontSize = 18;
        sub.fontFamily = '"Microsoft YaHei", serif';
        sub.top = '-35px'; sub.textWrapping = true; sub.width = '480px';
        card.addControl(sub);

        const conquered = new BABYLON.GUI.TextBlock('vConquered', '后梁 ✅  后唐 ✅  后晋 ✅  后汉 ✅  后周 ✅');
        conquered.color = '#88ff88'; conquered.fontSize = 16;
        conquered.fontFamily = '"Microsoft YaHei", serif'; conquered.top = '20px';
        card.addControl(conquered);

        const catMsg = new BABYLON.GUI.TextBlock('vCat', '猫猫：喵～（打了个嗝）');
        catMsg.color = '#aaaaff'; catMsg.fontSize = 14;
        catMsg.fontFamily = '"Microsoft YaHei", serif'; catMsg.top = '60px';
        card.addControl(catMsg);

        const replayBtn = new BABYLON.GUI.Rectangle('replayBtn');
        replayBtn.width = '160px'; replayBtn.height = '40px';
        replayBtn.top = '108px'; replayBtn.background = '#3a2a08';
        replayBtn.cornerRadius = 10; replayBtn.thickness = 2;
        replayBtn.color = '#ffd700'; replayBtn.isPointerBlocker = true;
        card.addControl(replayBtn);
        const rL = new BABYLON.GUI.TextBlock(); rL.text = '🔄 再玩一次'; rL.color = '#ffd700'; rL.fontSize = 16;
        rL.fontFamily = '"Microsoft YaHei", serif';
        replayBtn.addControl(rL);
        replayBtn.onPointerEnterObservable.add(() => { replayBtn.background = '#5a4a18'; });
        replayBtn.onPointerOutObservable.add(() => { replayBtn.background = '#3a2a08'; });
        replayBtn.onPointerClickObservable.add(() => {
            localStorage.removeItem('flyChina_rpg_progress');
            window.location.reload();
        });
    }

    _matchPinyin(typed, expected) {
        const norm = s => s.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/v/g, 'u').replace(/[^a-z]/g, '');
        const t = norm(typed), e = norm(expected);
        return t.length > 0 && t === e;
    }

    _gameLoop() {
        const dt = this.engine.getDeltaTime() / 1000;
        if (this.player && !this.player.isLocked) {
            this.player.update(dt);
        }
        if (this.zhaoCompanion) this.zhaoCompanion.update(this.player.mesh.position, dt);
        if (this.catCompanion) this.catCompanion.update(this.player.mesh.position, dt);
        if (this.particles) {
            this.particles.update(dt);
            if (this.player) this.particles.setTrailIntensity(this.player.velocity.length());
        }
        if (this.conquestManager && this.state === 'exploring') {
            this.conquestManager.update(this.player.mesh.position);
        }
    }
}
