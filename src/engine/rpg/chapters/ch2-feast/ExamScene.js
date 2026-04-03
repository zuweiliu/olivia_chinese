/**
 * ExamScene - 科举考试 hall where 5 scholars take the exam, learn words,
 * become officials, and the country stabilises.
 */
class ExamScene {
    constructor(engine, dialogueData) {
        this.engine  = engine;
        this.dlg     = dialogueData;
        this._meshes = [];
        this._scholars = [];   // { root, head, desk, quill, nameTB }
        this._passed   = 0;
    }

    run() {
        return new Promise(resolve => {
            this._onDone = resolve;
            this._buildHall();
            this._buildDesks();
            this._positionPlayer();
            this._runSequence();
        });
    }

    dispose() {
        this._meshes.forEach(m => { try { m.dispose(); } catch(e){} });
        this._meshes = [];
        this._scholars = [];
    }

    // ── Environment ──────────────────────────────────────────────────────────

    _buildHall() {
        const s = this.engine.scene;
        const add = m => { this._meshes.push(m); return m; };

        // Floor
        const floor = add(BABYLON.MeshBuilder.CreateGround('examFloor',
            { width: 50, height: 36 }, s));
        const fMat = new BABYLON.StandardMaterial('examFloorMat', s);
        fMat.diffuseColor  = new BABYLON.Color3(0.72, 0.68, 0.55);
        fMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        floor.material = fMat;

        // Ceiling beams
        const beamMat = new BABYLON.StandardMaterial('beamMat', s);
        beamMat.diffuseColor  = new BABYLON.Color3(0.42, 0.28, 0.14);
        beamMat.emissiveColor = new BABYLON.Color3(0.05, 0.03, 0.01);
        for (let bi = -2; bi <= 2; bi++) {
            const beam = add(BABYLON.MeshBuilder.CreateBox('beam' + bi,
                { width: 50, height: 0.25, depth: 0.5 }, s));
            beam.position = new BABYLON.Vector3(0, 6.5, bi * 4);
            beam.material = beamMat;
        }

        // Walls
        const wMat = new BABYLON.StandardMaterial('examWallMat', s);
        wMat.diffuseColor  = new BABYLON.Color3(0.78, 0.72, 0.55);
        wMat.backFaceCulling = false;
        const walls = [
            { w: 50, h: 7, pos: new BABYLON.Vector3(0, 3.5, -18), ry: 0 },
            { w: 50, h: 7, pos: new BABYLON.Vector3(0, 3.5,  18), ry: Math.PI },
            { w: 36, h: 7, pos: new BABYLON.Vector3(-25, 3.5, 0), ry: Math.PI / 2 },
            { w: 36, h: 7, pos: new BABYLON.Vector3( 25, 3.5, 0), ry: -Math.PI / 2 }
        ];
        walls.forEach((d, i) => {
            const w = add(BABYLON.MeshBuilder.CreatePlane('examWall' + i,
                { width: d.w, height: d.h }, s));
            w.position = d.pos; w.rotation.y = d.ry; w.material = wMat;
        });

        // Banner at front: "科举考试"
        const bannerTex = new BABYLON.DynamicTexture('bannerTex',
            { width: 512, height: 128 }, s);
        const bCtx = bannerTex.getContext();
        bCtx.fillStyle = '#8b1010';
        bCtx.fillRect(0, 0, 512, 128);
        bCtx.font = 'bold 80px "Microsoft YaHei", serif';
        bCtx.fillStyle = '#ffd700';
        bCtx.textAlign = 'center';
        bCtx.fillText('科举考试', 256, 95);
        bannerTex.update();
        const banner = add(BABYLON.MeshBuilder.CreatePlane('banner',
            { width: 10, height: 2.5 }, s));
        banner.position = new BABYLON.Vector3(0, 5.5, -17.5);
        const bMat = new BABYLON.StandardMaterial('bannerMat', s);
        bMat.diffuseTexture  = bannerTex;
        bMat.emissiveColor   = new BABYLON.Color3(0.6, 0.5, 0.1);
        bMat.backFaceCulling = false;
        banner.material = bMat;

        // Candles on side tables
        const candleMat = new BABYLON.StandardMaterial('candleMat', s);
        candleMat.diffuseColor  = new BABYLON.Color3(0.95, 0.90, 0.75);
        const flameMat = new BABYLON.StandardMaterial('flameMat', s);
        flameMat.diffuseColor  = new BABYLON.Color3(1, 0.7, 0.1);
        flameMat.emissiveColor = new BABYLON.Color3(0.8, 0.4, 0.05);
        [[-20, 0, -14], [20, 0, -14], [-20, 0, 14], [20, 0, 14]].forEach(([x, y, z], i) => {
            const can = add(BABYLON.MeshBuilder.CreateCylinder('candle' + i,
                { diameter: 0.25, height: 1.2 }, s));
            can.position = new BABYLON.Vector3(x, 0.6, z); can.material = candleMat;
            const flame = add(BABYLON.MeshBuilder.CreateSphere('flame' + i,
                { diameter: 0.2 }, s));
            flame.position = new BABYLON.Vector3(x, 1.3, z); flame.material = flameMat;
            const pl = new BABYLON.PointLight('candleLight' + i,
                new BABYLON.Vector3(x, 1.4, z), s);
            pl.diffuse    = new BABYLON.Color3(1, 0.75, 0.3);
            pl.intensity  = 0.9; pl.range = 10;
        });

        // Podium for examiner (赵匡胤)
        const podMat = new BABYLON.StandardMaterial('podMat', s);
        podMat.diffuseColor  = new BABYLON.Color3(0.45, 0.30, 0.12);
        const pod = add(BABYLON.MeshBuilder.CreateBox('podium',
            { width: 3, height: 1.1, depth: 1.2 }, s));
        pod.position = new BABYLON.Vector3(0, 0.55, -14); pod.material = podMat;

        // Adjust ambient for indoor
        this.engine.scene.ambientColor = new BABYLON.Color3(0.10, 0.08, 0.05);
    }

    _buildDesks() {
        const s    = this.engine.scene;
        const add  = m => { this._meshes.push(m); return m; };
        const xPositions = [-16, -8, 0, 8, 16];

        const deskMat = new BABYLON.StandardMaterial('deskMat', s);
        deskMat.diffuseColor  = new BABYLON.Color3(0.52, 0.38, 0.18);
        deskMat.specularColor = new BABYLON.Color3(0.2, 0.15, 0.08);

        const skinMat = new BABYLON.StandardMaterial('scholarSkin', s);
        skinMat.diffuseColor = new BABYLON.Color3(0.88, 0.73, 0.58);

        const scholarColors = [
            new BABYLON.Color3(0.12, 0.18, 0.45),
            new BABYLON.Color3(0.18, 0.38, 0.15),
            new BABYLON.Color3(0.38, 0.12, 0.12),
            new BABYLON.Color3(0.32, 0.28, 0.08),
            new BABYLON.Color3(0.18, 0.30, 0.35)
        ];

        const scholarNames = ['王安石', '欧阳修', '苏轼', '范仲淹', '司马光'];

        xPositions.forEach((x, i) => {
            // Desk
            const desk = add(BABYLON.MeshBuilder.CreateBox('examDesk' + i,
                { width: 2.2, height: 0.12, depth: 1.2 }, s));
            desk.position = new BABYLON.Vector3(x, 0.9, 0);
            desk.material = deskMat;

            // Desk legs
            [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]].forEach(([dx, dz], li) => {
                const leg = add(BABYLON.MeshBuilder.CreateBox('deskLeg_' + i + '_' + li,
                    { width: 0.12, height: 0.9, depth: 0.12 }, s));
                leg.position = new BABYLON.Vector3(x + dx, 0.45, dz);
                leg.material = deskMat;
            });

            // Paper on desk
            const paperMat = new BABYLON.StandardMaterial('paper' + i, s);
            paperMat.diffuseColor  = new BABYLON.Color3(0.95, 0.93, 0.82);
            paperMat.emissiveColor = new BABYLON.Color3(0.1, 0.09, 0.06);
            const paper = add(BABYLON.MeshBuilder.CreateBox('paper' + i,
                { width: 0.8, height: 0.015, depth: 1.0 }, s));
            paper.position = new BABYLON.Vector3(x, 0.97, 0);
            paper.material = paperMat;

            // Scholar body
            const root = new BABYLON.TransformNode('scholar_' + i, s);
            root.position = new BABYLON.Vector3(x, 0, 1.4);
            this._meshes.push(root);

            const bMat = new BABYLON.StandardMaterial('schBody' + i, s);
            bMat.diffuseColor  = scholarColors[i];
            bMat.emissiveColor = scholarColors[i].scale(0.12);
            const body = BABYLON.MeshBuilder.CreateBox('schBody' + i,
                { width: 0.62, height: 1.05, depth: 0.38 }, s);
            body.position.y = 1.15; body.parent = root; body.material = bMat;
            this._meshes.push(body);

            const head = BABYLON.MeshBuilder.CreateSphere('schHead' + i,
                { diameter: 0.42 }, s);
            head.position = new BABYLON.Vector3(0, 1.98, -0.2);
            head.parent = root; head.material = skinMat;
            this._meshes.push(head);

            // Scholar hat (方帽)
            const hatMat = new BABYLON.StandardMaterial('schHat' + i, s);
            hatMat.diffuseColor = new BABYLON.Color3(0.08, 0.06, 0.04);
            const hat = BABYLON.MeshBuilder.CreateBox('schHat' + i,
                { width: 0.55, height: 0.22, depth: 0.55 }, s);
            hat.position = new BABYLON.Vector3(0, 2.26, -0.2);
            hat.parent = root; hat.material = hatMat;
            this._meshes.push(hat);

            // Quill (writing brush)
            const quillMat = new BABYLON.StandardMaterial('quill' + i, s);
            quillMat.diffuseColor = new BABYLON.Color3(0.6, 0.5, 0.3);
            const quill = BABYLON.MeshBuilder.CreateCylinder('quill' + i,
                { diameterTop: 0.04, diameterBottom: 0.01, height: 0.6, tessellation: 6 }, s);
            quill.position = new BABYLON.Vector3(x + 0.22, 1.05, 0.2);
            quill.rotation.z = -0.4; quill.rotation.x = 0.3;
            quill.material = quillMat;
            this._meshes.push(quill);

            // Name label (GUI text above scholar)
            this._scholars.push({
                root, head, desk, quill, paper,
                name: scholarNames[i],
                passed: false,
                _writeT: 0
            });
        });

        // Examiner (赵匡胤) at podium
        this._buildExaminer();
    }

    _buildExaminer() {
        const s = this.engine.scene;
        const mat = new BABYLON.StandardMaterial('examinerMat', s);
        mat.diffuseColor  = new BABYLON.Color3(0.65, 0.48, 0.12);
        mat.emissiveColor = new BABYLON.Color3(0.14, 0.10, 0.02);

        const root = new BABYLON.TransformNode('examiner', s);
        root.position = new BABYLON.Vector3(0, 0, -13.5);
        this._meshes.push(root);

        const body = BABYLON.MeshBuilder.CreateBox('examBody',
            { width: 0.75, height: 1.15, depth: 0.42 }, s);
        body.position.y = 1.65; body.parent = root; body.material = mat;
        this._meshes.push(body);

        const skinMat = new BABYLON.StandardMaterial('examSkin', s);
        skinMat.diffuseColor = new BABYLON.Color3(0.88, 0.73, 0.58);
        const head = BABYLON.MeshBuilder.CreateSphere('examHead',
            { diameter: 0.46 }, s);
        head.position = new BABYLON.Vector3(0, 2.58, 0);
        head.parent = root; head.material = skinMat;
        this._meshes.push(head);

        const crownMat = new BABYLON.StandardMaterial('examCrown', s);
        crownMat.diffuseColor  = new BABYLON.Color3(0.95, 0.82, 0.12);
        crownMat.emissiveColor = new BABYLON.Color3(0.4, 0.3, 0.04);
        const crown = BABYLON.MeshBuilder.CreateCylinder('examCrown',
            { diameterTop: 0.46, diameterBottom: 0.42, height: 0.32, tessellation: 12 }, s);
        crown.position = new BABYLON.Vector3(0, 2.88, 0);
        crown.parent = root; crown.material = crownMat;
        this._meshes.push(crown);
    }

    _positionPlayer() {
        this.engine.player.mesh.position = new BABYLON.Vector3(0, 1.5, 16);
        this.engine.player.isLocked = true;
        if (this.engine.camera) {
            this.engine.camera.alpha  = Math.PI;
            this.engine.camera.beta   = Math.PI / 3.5;
            this.engine.camera.radius = 26;
        }
    }

    // ── Exam sequence ─────────────────────────────────────────────────────────

    _runSequence() {
        // Scholars bob while writing (register update loop)
        this._writeObs = this.engine.scene.onBeforeRenderObservable.add(() => {
            const dt = this.engine.engine.getDeltaTime() / 1000;
            this._scholars.forEach((sc, i) => {
                if (sc.passed) return;
                sc._writeT = (sc._writeT || 0) + dt;
                // Head bobs forward/back as if writing
                sc.head.position.z = -0.2 + Math.sin(sc._writeT * 2.8 + i) * 0.06;
            });
        });

        this.engine.dialogueSystem.show(this.dlg.exam_start, () => {
            this._examScholarChain(0);
        });
    }

    _examScholarChain(idx) {
        if (idx >= this._scholars.length) {
            this._ceremonyAndEnd();
            return;
        }
        this._examScholar(idx, () => {
            setTimeout(() => this._examScholarChain(idx + 1), 500);
        });
    }

    _examScholar(idx, onDone) {
        const sc = this._scholars[idx];
        // Pick a word from the vocabulary for this scholar to "learn"
        const wordIds = [
            'keju', 'wenguan', 'zhongwen', 'rencai', 'zhili',
            'bianfa', 'zhidu', 'wuyi', 'jundui', 'zuozhan'
        ];
        const allWords = this.engine.learningSystem.words;
        let word = null;
        // Find an unmastered word from the preferred list
        for (const id of wordIds.slice(idx, idx + 3)) {
            const w = allWords.find(w => w.id === id);
            if (w && this.engine.learningSystem.getWordState(w.id) !== 'mastered') {
                word = w; break;
            }
        }
        // Fallback: any unmastered word
        if (!word) {
            word = allWords.find(w => this.engine.learningSystem.getWordState(w.id) !== 'mastered');
        }
        // Last fallback: any word
        if (!word) word = allWords[idx % allWords.length];

        const prompt = (this.dlg.exam_word_prompt || '📝 帮学者记住：') + '';
        this.engine.showWordChallenge(word, prompt + sc.name + ' 需要学这个词！', () => {
            this._scholarPass(idx, onDone);
        });
    }

    _scholarPass(idx, onDone) {
        const sc = this._scholars[idx];
        sc.passed = true;

        // Cheer bubble
        const passMsg = (this.dlg.scholar_pass || [])[idx] || '通过了！';
        const bubble = new BABYLON.GUI.Rectangle('passBubble' + idx);
        bubble.width = '280px'; bubble.height = '60px';
        bubble.background = 'rgba(10,30,10,0.9)';
        bubble.cornerRadius = 10; bubble.thickness = 2;
        bubble.color = '#44ff88'; bubble.isPointerBlocker = false;
        bubble.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        bubble.top = '80px';
        this.engine.ui.addControl(bubble);
        const tb = new BABYLON.GUI.TextBlock('pt' + idx, passMsg);
        tb.color = '#88ffaa'; tb.fontSize = 14;
        tb.fontFamily = '"Microsoft YaHei", serif';
        bubble.addControl(tb);

        if (this.engine.music) this.engine.music.playCheer();
        if (this.engine.particles) {
            this.engine.particles.burstAt(
                new BABYLON.Vector3(sc.root.position.x, 3.5, sc.root.position.z)
            );
        }

        // Scholar celebrates: head bobs fast
        sc.head.position.y += 0.1;
        setTimeout(() => { sc.head.position.y -= 0.1; }, 300);

        this._passed++;
        this._updateStabilityHUD();

        setTimeout(() => {
            this.engine.ui.removeControl(bubble); bubble.dispose();
            onDone();
        }, 1400);
    }

    _updateStabilityHUD() {
        if (!this._stabilityHUD) this._buildStabilityHUD();
        const pct = Math.round((this._passed / 5) * 100);
        if (this._stabilityBar) this._stabilityBar.width = (pct * 2.4) + 'px';
        if (this._stabilityText) this._stabilityText.text = `国家稳定度：${pct}%`;
    }

    _buildStabilityHUD() {
        const panel = new BABYLON.GUI.Rectangle('stabilityPanel');
        panel.width = '260px'; panel.height = '44px';
        panel.background = 'rgba(10,8,20,0.85)';
        panel.cornerRadius = 8; panel.thickness = 2; panel.color = '#ffd700';
        panel.verticalAlignment   = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.top = '12px'; panel.left = '14px';
        panel.isPointerBlocker = false;
        this.engine.ui.addControl(panel);
        this._meshes.push({ dispose: () => { this.engine.ui.removeControl(panel); panel.dispose(); } });

        this._stabilityText = new BABYLON.GUI.TextBlock('stabText', '国家稳定度：0%');
        this._stabilityText.color = '#ffd700'; this._stabilityText.fontSize = 13;
        this._stabilityText.fontFamily = '"Microsoft YaHei", serif';
        this._stabilityText.top = '-8px';
        panel.addControl(this._stabilityText);

        const barBg = new BABYLON.GUI.Rectangle('barBg');
        barBg.width = '240px'; barBg.height = '8px';
        barBg.background = 'rgba(60,40,10,0.9)'; barBg.cornerRadius = 4;
        barBg.thickness = 0; barBg.top = '10px';
        barBg.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        barBg.left = '10px';
        panel.addControl(barBg);

        this._stabilityBar = new BABYLON.GUI.Rectangle('bar');
        this._stabilityBar.width = '0px'; this._stabilityBar.height = '8px';
        this._stabilityBar.background = '#44cc66'; this._stabilityBar.cornerRadius = 4;
        this._stabilityBar.thickness = 0;
        this._stabilityBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        barBg.addControl(this._stabilityBar);

        this._stabilityHUD = panel;
    }

    _ceremonyAndEnd() {
        // Stop writing animation
        if (this._writeObs) {
            this.engine.scene.onBeforeRenderObservable.remove(this._writeObs);
        }

        // Give scholars official hats (replace hat color with gold)
        this._scholars.forEach((sc, i) => {
            const hatMesh = this.engine.scene.getMeshByName('schHat' + i);
            if (hatMesh && hatMesh.material) {
                hatMesh.material.diffuseColor  = new BABYLON.Color3(0.08, 0.06, 0.04);
                hatMesh.material.emissiveColor = new BABYLON.Color3(0.3, 0.22, 0.04);
            }
        });

        // Fanfare
        if (this.engine.music) this.engine.music.playConquestFanfare();

        // Burst all scholars
        setTimeout(() => {
            this._scholars.forEach(sc => {
                if (this.engine.particles) {
                    this.engine.particles.burstAt(
                        new BABYLON.Vector3(sc.root.position.x, 4, sc.root.position.z)
                    );
                }
            });
        }, 200);

        // Official ceremony overlay
        const dim = new BABYLON.GUI.Rectangle('ceremony');
        dim.width = '100%'; dim.height = '100%';
        dim.background = 'rgba(0,0,0,0.5)';
        dim.thickness = 0; dim.isPointerBlocker = false;
        this.engine.ui.addControl(dim);
        this._meshes.push({ dispose: () => { try { this.engine.ui.removeControl(dim); dim.dispose(); } catch(e){} } });

        const card = new BABYLON.GUI.Rectangle('ceremCard');
        card.width = '500px'; card.height = '120px';
        card.background = 'rgba(12,8,2,0.95)';
        card.cornerRadius = 16; card.thickness = 2; card.color = '#ffd700';
        card.isPointerBlocker = false;
        dim.addControl(card);

        const t1 = new BABYLON.GUI.TextBlock('ct1', '🎓 五位学者通过科举，正式成为大宋官员！');
        t1.color = '#ffd700'; t1.fontSize = 22;
        t1.fontFamily = '"Microsoft YaHei", serif'; t1.fontWeight = 'bold';
        t1.top = '-22px';
        card.addControl(t1);

        const names = this._scholars.map(sc => sc.name).join('  ');
        const t2 = new BABYLON.GUI.TextBlock('ct2', names + '  ✅');
        t2.color = '#88ffaa'; t2.fontSize = 15;
        t2.fontFamily = '"Microsoft YaHei", serif'; t2.top = '22px';
        card.addControl(t2);

        setTimeout(() => {
            this.engine.ui.removeControl(dim); dim.dispose();
            this.engine.dialogueSystem.show(this.dlg.exam_complete, () => {
                this.engine.dialogueSystem.show(this.dlg.ending, () => {
                    this._onDone();
                });
            });
        }, 3200);
    }
}
