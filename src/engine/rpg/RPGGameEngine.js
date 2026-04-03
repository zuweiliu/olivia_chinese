/**
 * RPGGameEngine - Thin orchestrator.
 * Owns: BABYLON engine/scene/camera, player, music, shared systems.
 * Delegates all chapter-specific logic to chapter classes via loadChapter().
 */
class RPGGameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
        this.scene  = null;
        this.camera = null;

        // Shared systems (available to all chapters)
        this.player          = null;
        this.music           = null;
        this.learningSystem  = null;
        this.speechSystem    = null;
        this.ui              = null; // BABYLON.GUI.AdvancedDynamicTexture
        this.dialogueSystem  = null;
        this.particles       = null;
        this.zhaoCompanion   = null;
        this.catCompanion    = null;
        this.shadowGenerator = null;

        this._currentChapter = null;
        this._chapterList    = [Chapter1, Chapter2]; // ordered list
        this._chapterIndex   = 0;
    }

    async init() {
        this._createScene();
        this._createLighting();

        // Shared data systems
        this.learningSystem = new LearningSystem('flyChina_rpg_progress');
        this.speechSystem   = new SpeechSystem();
        await this.learningSystem.loadTheme('data/themes/song-dynasty');

        // GUI + shared modules
        this.ui             = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('rpgUI', true, this.scene);
        this.dialogueSystem = new DialogueSystem(this.ui);
        this.particles      = new ParticleEffects(this.scene);

        // Player — chapters reposition as needed
        this.player = new PlayerController(this.scene, this.canvas);
        this.player.isLocked = true;

        // Camera
        this._setupCamera();

        // Music
        this.music = new BackgroundMusic();
        this.music.init();

        // Persistent HUD
        this._createBaseHUD();

        // Render loop
        this.scene.registerBeforeRender(() => this._gameLoop());
        this.engine.runRenderLoop(() => this.scene.render());
        window.addEventListener('resize', () => this.engine.resize());

        // Hide loading screen
        const el = document.getElementById('loadingScreen');
        if (el) el.classList.add('hidden');

        // Chapter select screen
        this._showChapterSelect();
    }

    /**
     * Load chapter by index (or pass a ChapterClass directly).
     * Disposes the previous chapter's resources first.
     */
    async loadChapter(indexOrClass) {
        if (this._currentChapter) {
            this._currentChapter.dispose();
            this._currentChapter = null;
        }

        let ChapterClass;
        if (typeof indexOrClass === 'number') {
            this._chapterIndex = indexOrClass;
            ChapterClass = this._chapterList[indexOrClass];
        } else {
            ChapterClass = indexOrClass;
            this._chapterIndex = this._chapterList.indexOf(ChapterClass);
        }

        if (!ChapterClass) {
            console.warn('RPGGameEngine: no more chapters.');
            return;
        }

        this._currentChapter = new ChapterClass(this);
        await this._currentChapter.load();
        this._currentChapter.start();
    }

    /** Called by a chapter when it finishes — moves to next chapter */
    nextChapter() {
        this.loadChapter(this._chapterIndex + 1);
    }

    // ── Scene / camera / lighting ──────────────────────────────────────────────

    _createScene() {
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor  = new BABYLON.Color4(0.05, 0.03, 0.12, 1);
        this.scene.ambientColor = new BABYLON.Color3(0.12, 0.08, 0.18);
        this.scene.collisionsEnabled = true;
    }

    _createLighting() {
        const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), this.scene);
        hemi.intensity   = 0.5;
        hemi.diffuse     = new BABYLON.Color3(0.85, 0.78, 0.65);
        hemi.groundColor = new BABYLON.Color3(0.18, 0.12, 0.08);

        const dir = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-0.5, -1, 0.5), this.scene);
        dir.position  = new BABYLON.Vector3(80, 120, -80);
        dir.intensity = 0.55;
        dir.diffuse   = new BABYLON.Color3(1, 0.92, 0.78);

        this.shadowGenerator = new BABYLON.ShadowGenerator(1024, dir);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.darkness = 0.45;

        const glow = new BABYLON.GlowLayer('glow', this.scene, { mainTextureFixedSize: 512, blurKernelSize: 40 });
        glow.intensity = 0.9;
    }

    _setupCamera() {
        this.camera = new BABYLON.ArcRotateCamera('cam', Math.PI, Math.PI / 3.5, 20,
            this.player.mesh.position.clone(), this.scene);
        this.camera.lowerRadiusLimit  = 6;
        this.camera.upperRadiusLimit  = 45;
        this.camera.lowerBetaLimit    = 0.3;
        this.camera.upperBetaLimit    = Math.PI / 2.2;
        this.camera.wheelDeltaPercentage = 0.02;
        this.camera.inertia = 0.85;
        this.camera.attachControl(this.canvas, true);
        this.camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
        this.camera.lockedTarget = this.player.mesh;
    }

    _createBaseHUD() {
        const muteBtn = new BABYLON.GUI.Rectangle('muteBtn');
        muteBtn.width  = '32px'; muteBtn.height = '32px';
        muteBtn.verticalAlignment   = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        muteBtn.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        muteBtn.top  = '9px'; muteBtn.left = '-14px';
        muteBtn.cornerRadius = 16; muteBtn.thickness = 0;
        muteBtn.background = 'transparent'; muteBtn.isPointerBlocker = true;
        this.ui.addControl(muteBtn);

        this._muteLabel = new BABYLON.GUI.TextBlock('muteLabel', '🎵');
        this._muteLabel.fontSize = 18;
        muteBtn.addControl(this._muteLabel);
        muteBtn.onPointerEnterObservable.add(() => { muteBtn.background = 'rgba(255,255,255,0.15)'; });
        muteBtn.onPointerOutObservable.add(()  => { muteBtn.background = 'transparent'; });
        muteBtn.onPointerClickObservable.add(() => {
            if (!this.music) return;
            this._muteLabel.text = this.music.toggle() ? '🔇' : '🎵';
        });

        // Chapter badge (updated by chapters)
        this._chapterBadge = new BABYLON.GUI.TextBlock('chBadge', '');
        this._chapterBadge.color  = '#665544';
        this._chapterBadge.fontSize = 11;
        this._chapterBadge.verticalAlignment   = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        this._chapterBadge.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this._chapterBadge.top  = '-10px';
        this._chapterBadge.left = '14px';
        this.ui.addControl(this._chapterBadge);
    }

    setChapterBadge(text) {
        if (this._chapterBadge) this._chapterBadge.text = text;
    }

    // ── Chapter select screen ─────────────────────────────────────────────────

    _showChapterSelect() {
        const chapters = [
            {
                index: 0,
                title:    '第一章',
                subtitle: '五代十国',
                desc:     '穿越到乱世，学习词语，\n帮助赵匡胤征服五个王国，\n建立大宋！',
                emoji:    '⚔️',
                color:    '#c84a10',
                bgDim:    'rgba(200,74,16,0.20)',
                bgHover:  'rgba(200,74,16,0.45)'
            },
            {
                index: 1,
                title:    '第二章',
                subtitle: '杯酒释兵权·科举考试',
                desc:     '宴会上让将军交出兵权，\n建立科举制度选拔人才，\n开创文治盛世！',
                emoji:    '🏮',
                color:    '#1a7abf',
                bgDim:    'rgba(26,122,191,0.20)',
                bgHover:  'rgba(26,122,191,0.45)'
            }
        ];

        // Dark full-screen background
        const bg = new BABYLON.GUI.Rectangle('csBg');
        bg.width = '100%'; bg.height = '100%';
        bg.background = 'rgba(6,4,15,0.97)';
        bg.thickness = 0; bg.isPointerBlocker = true;
        this.ui.addControl(bg);

        // Title
        const title = new BABYLON.GUI.TextBlock('csTitle', '五代十国 · 穿越时空的少女');
        title.color = '#ffd700'; title.fontSize = 28;
        title.fontFamily = '"Microsoft YaHei", serif';
        title.fontWeight = 'bold';
        title.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        title.top = '38px';
        bg.addControl(title);

        const sub = new BABYLON.GUI.TextBlock('csSub', '选择章节');
        sub.color = '#887744'; sub.fontSize = 15;
        sub.fontFamily = '"Microsoft YaHei", serif';
        sub.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        sub.top = '76px';
        bg.addControl(sub);

        chapters.forEach((ch, i) => {
            const card = new BABYLON.GUI.Rectangle('csCard' + i);
            card.width = '220px'; card.height = '300px';
            card.background = 'rgba(14,10,28,0.96)';
            card.cornerRadius = 16; card.thickness = 2;
            card.color = ch.color;
            card.left = ((i - (chapters.length - 1) / 2) * 254) + 'px';
            card.isPointerBlocker = true;
            bg.addControl(card);

            const icon = new BABYLON.GUI.TextBlock('csIcon' + i, ch.emoji);
            icon.fontSize = 48; icon.top = '-90px';
            card.addControl(icon);

            const label = new BABYLON.GUI.TextBlock('csLabel' + i, ch.title);
            label.color = ch.color; label.fontSize = 22;
            label.fontFamily = '"Microsoft YaHei", serif';
            label.fontWeight = 'bold'; label.top = '-40px';
            card.addControl(label);

            const stitle = new BABYLON.GUI.TextBlock('csStitle' + i, ch.subtitle);
            stitle.color = '#ffffff'; stitle.fontSize = 14;
            stitle.fontFamily = '"Microsoft YaHei", serif';
            stitle.top = '-8px';
            card.addControl(stitle);

            const desc = new BABYLON.GUI.TextBlock('csDesc' + i, ch.desc);
            desc.color = '#aaaaaa'; desc.fontSize = 12;
            desc.fontFamily = '"Microsoft YaHei", serif';
            desc.textWrapping = true; desc.width = '190px';
            desc.top = '52px'; desc.lineSpacing = '4px';
            card.addControl(desc);

            const btn = new BABYLON.GUI.Rectangle('csBtn' + i);
            btn.width = '150px'; btn.height = '38px';
            btn.top = '118px'; btn.background = ch.bgDim;
            btn.cornerRadius = 10; btn.thickness = 2;
            btn.color = ch.color; btn.isPointerBlocker = true;
            card.addControl(btn);
            const btnL = new BABYLON.GUI.TextBlock('csBtnL' + i, '▶ 开始');
            btnL.color = '#ffffff'; btnL.fontSize = 15;
            btnL.fontFamily = '"Microsoft YaHei", serif';
            btn.addControl(btnL);

            const select = async () => {
                this.ui.removeControl(bg); bg.dispose();
                await this.fadeScreen('in', 500);
                await this.loadChapter(ch.index);
                await this.fadeScreen('out', 500);
            };
            card.onPointerEnterObservable.add(() => { card.thickness = 3; card.background = 'rgba(30,20,50,0.98)'; btn.background = ch.bgHover; });
            card.onPointerOutObservable.add(() => { card.thickness = 2; card.background = 'rgba(14,10,28,0.96)'; btn.background = ch.bgDim; });
            btn.onPointerEnterObservable.add(() => { btn.background = ch.bgHover; });
            btn.onPointerOutObservable.add(() => { btn.background = ch.bgDim; });
            btn.onPointerClickObservable.add(select);
            card.onPointerClickObservable.add(select);
        });
    }

    // ── Utility shared by all chapters ────────────────────────────────────────

    matchPinyin(typed, expected) {
        const norm = s => s.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/v/g, 'u').replace(/[^a-z]/g, '');
        const t = norm(typed), e = norm(expected);
        return t.length > 0 && t === e;
    }

    /** Fade the screen to/from black. dir: 'in' = fade to black, 'out' = fade from black */
    fadeScreen(dir, durationMs = 600) {
        return new Promise(resolve => {
            const overlay = new BABYLON.GUI.Rectangle('fadeOverlay');
            overlay.width = '100%'; overlay.height = '100%';
            overlay.background = dir === 'in' ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)';
            overlay.thickness = 0; overlay.isPointerBlocker = true;
            this.ui.addControl(overlay);

            let t = 0;
            const obs = this.scene.onBeforeRenderObservable.add(() => {
                t += this.engine.getDeltaTime();
                const p = Math.min(1, t / durationMs);
                const a = dir === 'in' ? p : 1 - p;
                overlay.background = `rgba(0,0,0,${a.toFixed(3)})`;
                if (p >= 1) {
                    this.scene.onBeforeRenderObservable.remove(obs);
                    if (dir === 'out') { this.ui.removeControl(overlay); overlay.dispose(); }
                    resolve();
                }
            });
        });
    }

    showWordChallenge(word, prompt, onCorrect) {
        const overlay = new BABYLON.GUI.Rectangle('qwOverlay');
        overlay.width = '400px'; overlay.height = '270px';
        overlay.background = 'rgba(10,8,25,0.96)';
        overlay.cornerRadius = 12; overlay.thickness = 2;
        overlay.color = 'rgba(100,200,255,0.6)'; overlay.isPointerBlocker = true;
        this.ui.addControl(overlay);

        const chars = new BABYLON.GUI.TextBlock('qwC', word.characters);
        chars.color = '#ffffff'; chars.fontSize = 52;
        chars.fontFamily = '"Microsoft YaHei", serif'; chars.top = '-75px';
        overlay.addControl(chars);

        const py = new BABYLON.GUI.TextBlock('qwP', word.pinyin);
        py.color = '#88ccff'; py.fontSize = 18; py.top = '-28px'; py.alpha = 0;
        overlay.addControl(py);

        const status = new BABYLON.GUI.TextBlock('qwS', prompt || '输入拼音！');
        status.color = '#ffcc44'; status.fontSize = 14;
        status.fontFamily = '"Microsoft YaHei", serif'; status.top = '16px';
        overlay.addControl(status);

        const input = new BABYLON.GUI.InputText('qwI');
        input.width = '195px'; input.height = '32px';
        input.top = '58px'; input.left = '-60px';
        input.color = '#aaddff'; input.background = 'rgba(0,0,30,0.85)';
        input.focusedBackground = 'rgba(10,10,60,0.95)';
        input.placeholderText = 'pinyin...'; input.placeholderColor = '#445566';
        input.fontSize = 13; input.thickness = 1; input.isPointerBlocker = true;
        overlay.addControl(input);

        const check = () => {
            const t = input.text.trim();
            if (!t) return;
            if (this.matchPinyin(t, word.pinyin)) {
                this.learningSystem.masterWord(word.id);
                if (this.music) this.music.playCheer();
                status.text = '✨ 正确！'; status.color = '#44ff88'; py.alpha = 1;
                setTimeout(() => { this.ui.removeControl(overlay); overlay.dispose(); onCorrect(); }, 800);
            } else {
                status.text = `✗ "${t}" — 再试`; status.color = '#ff8888';
            }
        };
        input.onKeyboardEventProcessedObservable.add(e => {
            if (e.key === 'Enter' || e.keyCode === 13) check();
        });

        const ck = new BABYLON.GUI.Rectangle('qwCk');
        ck.width = '80px'; ck.height = '32px'; ck.top = '58px'; ck.left = '108px';
        ck.background = '#1a4a2a'; ck.cornerRadius = 6; ck.thickness = 1;
        ck.color = '#44aa66'; ck.isPointerBlocker = true;
        overlay.addControl(ck);
        const ckL = new BABYLON.GUI.TextBlock(); ckL.text = 'Check ✓'; ckL.color = '#44ff88'; ckL.fontSize = 12;
        ck.addControl(ckL);
        ck.onPointerEnterObservable.add(() => { ck.background = '#2a6a3a'; });
        ck.onPointerOutObservable.add(() => { ck.background = '#1a4a2a'; });
        ck.onPointerClickObservable.add(check);

        const hintBtn = new BABYLON.GUI.Rectangle('qwHint');
        hintBtn.width = '100px'; hintBtn.height = '28px'; hintBtn.top = '98px';
        hintBtn.background = '#2a1a2a'; hintBtn.cornerRadius = 6; hintBtn.thickness = 1;
        hintBtn.color = '#886688'; hintBtn.isPointerBlocker = true;
        overlay.addControl(hintBtn);
        const hL = new BABYLON.GUI.TextBlock(); hL.text = '显示拼音'; hL.color = '#cc88cc'; hL.fontSize = 12;
        hintBtn.addControl(hL);
        hintBtn.onPointerClickObservable.add(() => { py.alpha = 1; });

        if (window.speechSynthesis) {
            const u = new SpeechSynthesisUtterance(word.characters);
            u.lang = 'zh-CN'; u.rate = 0.8;
            window.speechSynthesis.cancel();
            setTimeout(() => window.speechSynthesis.speak(u), 300);
        }
    }

    // ── Game loop (chapters register their own update callbacks) ──────────────

    _gameLoop() {
        const dt = this.engine.getDeltaTime() / 1000;
        if (this.player && !this.player.isLocked) this.player.update(dt);
        if (this.zhaoCompanion && this.player) this.zhaoCompanion.update(this.player.mesh.position, dt);
        if (this.catCompanion  && this.player) this.catCompanion.update(this.player.mesh.position, dt);
        if (this.particles) {
            this.particles.update(dt);
            if (this.player) this.particles.setTrailIntensity(this.player.velocity.length());
        }
        if (this._currentChapter && this._currentChapter.update) {
            this._currentChapter.update(dt);
        }
    }
}
