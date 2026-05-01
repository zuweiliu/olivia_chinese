/**
 * JingkangScene - 靖康之变
 * Huizong paints while 3 warnings go unheeded → Jin army arrives → Northern Song falls
 */
class JingkangScene {
    constructor(engine, dialogueData) {
        this.engine = engine;
        this.dlg    = dialogueData;
        this._meshes = [];
        this._onDone = null;
        this._huizongNPC  = null;
        this._messengerNPC = null;
        this._maomaoTimer  = null;
        this._brushMesh    = null;
    }

    run() {
        return new Promise(resolve => {
            this._onDone = resolve;
            this._buildStudio();
            this._buildPaintingDesk();
            this._buildHuizong();
            this._buildPaintings();
            this._buildMessenger();
            this._positionPlayer();
            this._runIntro();
        });
    }

    dispose() {
        if (this._maomaoTimer) { clearInterval(this._maomaoTimer); this._maomaoTimer = null; }
        this._meshes.forEach(m => { try { m.dispose(); } catch(e){} });
        this._meshes = [];
    }

    // ── Environment ───────────────────────────────────────────────────────────

    _buildStudio() {
        const s   = this.engine.scene;
        const add = m => { this._meshes.push(m); return m; };

        // Warm wooden floor
        const floor = add(BABYLON.MeshBuilder.CreateGround('jkFloor', { width: 34, height: 26 }, s));
        const fMat = new BABYLON.StandardMaterial('jkFloorMat', s);
        fMat.diffuseColor  = new BABYLON.Color3(0.42, 0.28, 0.12);
        fMat.specularColor = new BABYLON.Color3(0.15, 0.10, 0.05);
        floor.material = fMat;

        // Ceiling
        const ceil = add(BABYLON.MeshBuilder.CreateGround('jkCeil', { width: 34, height: 26 }, s));
        ceil.position.y = 7; ceil.rotation.x = Math.PI;
        const cMat = new BABYLON.StandardMaterial('jkCeilMat', s);
        cMat.diffuseColor = new BABYLON.Color3(0.25, 0.18, 0.08);
        ceil.material = cMat;

        // Walls (warm cream/ivory)
        const wallMat = new BABYLON.StandardMaterial('jkWallMat', s);
        wallMat.diffuseColor = new BABYLON.Color3(0.92, 0.88, 0.76);
        const walls = [
            { w: 34, h: 7, pos: new BABYLON.Vector3(0, 3.5, -13),  ry: 0 },
            { w: 34, h: 7, pos: new BABYLON.Vector3(0, 3.5,  13),  ry: Math.PI },
            { w: 26, h: 7, pos: new BABYLON.Vector3(-17, 3.5, 0),  ry:  Math.PI / 2 },
            { w: 26, h: 7, pos: new BABYLON.Vector3( 17, 3.5, 0),  ry: -Math.PI / 2 }
        ];
        walls.forEach(def => {
            const w = add(BABYLON.MeshBuilder.CreatePlane('jkWall', { width: def.w, height: def.h }, s));
            w.position = def.pos; w.rotation.y = def.ry; w.material = wallMat;
        });

        // Lacquered red pillars
        const pillarMat = new BABYLON.StandardMaterial('jkPillar', s);
        pillarMat.diffuseColor  = new BABYLON.Color3(0.72, 0.08, 0.08);
        pillarMat.emissiveColor = new BABYLON.Color3(0.12, 0.01, 0.01);
        [[-10, -8], [-10, 8], [10, -8], [10, 8]].forEach(([x, z]) => {
            const p = add(BABYLON.MeshBuilder.CreateCylinder('jkPillar',
                { diameter: 0.6, height: 7, tessellation: 12 }, s));
            p.position = new BABYLON.Vector3(x, 3.5, z); p.material = pillarMat;
        });

        // Gold lanterns
        const lanMat = new BABYLON.StandardMaterial('jkLanMat', s);
        lanMat.diffuseColor  = new BABYLON.Color3(0.95, 0.88, 0.2);
        lanMat.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0.05);
        [[-5, 0], [5, 0], [0, -5], [0, 5]].forEach(([x, z]) => {
            const lan = add(BABYLON.MeshBuilder.CreateCylinder('jkLan',
                { diameterTop: 0.22, diameterBottom: 0.22, height: 0.5, tessellation: 10 }, s));
            lan.position = new BABYLON.Vector3(x, 6.2, z); lan.material = lanMat;
        });

        // Ink spill mesh (hidden until Maomao knocks it over)
        const inkMat = new BABYLON.StandardMaterial('jkInkMat', s);
        inkMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.08);
        this._inkSpill = add(BABYLON.MeshBuilder.CreateDisc('jkInk', { radius: 0.5, tessellation: 16 }, s));
        this._inkSpill.rotation.x = Math.PI / 2;
        this._inkSpill.position = new BABYLON.Vector3(-1.5, 0.01, -1.0);
        this._inkSpill.material = inkMat;
        this._inkSpill.setEnabled(false);
    }

    _buildPaintingDesk() {
        const s   = this.engine.scene;
        const add = m => { this._meshes.push(m); return m; };

        const dMat = new BABYLON.StandardMaterial('jkDeskMat', s);
        dMat.diffuseColor  = new BABYLON.Color3(0.38, 0.22, 0.08);
        dMat.emissiveColor = new BABYLON.Color3(0.04, 0.02, 0.01);

        // Painting table (wide and flat)
        const top = add(BABYLON.MeshBuilder.CreateBox('jkDesk', { width: 8, height: 0.15, depth: 4 }, s));
        top.position = new BABYLON.Vector3(0, 1.0, -1.5); top.material = dMat;
        [[-3.5, -3.3], [-3.5, 0.3], [3.5, -3.3], [3.5, 0.3]].forEach(([x, z]) => {
            const leg = add(BABYLON.MeshBuilder.CreateBox('jkLeg',
                { width: 0.16, height: 1.0, depth: 0.16 }, s));
            leg.position = new BABYLON.Vector3(x, 0.5, z); leg.material = dMat;
        });

        // The painting scroll (rolled out on the table)
        const scrollMat = new BABYLON.StandardMaterial('jkScrollMat', s);
        scrollMat.diffuseColor = new BABYLON.Color3(0.96, 0.92, 0.78);
        scrollMat.emissiveColor = new BABYLON.Color3(0.06, 0.05, 0.02);
        const scroll = add(BABYLON.MeshBuilder.CreatePlane('jkScroll', { width: 6, height: 2.8 }, s));
        scroll.rotation.x = Math.PI / 2;
        scroll.position = new BABYLON.Vector3(0, 1.09, -1.5);
        scroll.material = scrollMat;

        // Ink slab
        const inkMat = new BABYLON.StandardMaterial('jkInkSlab', s);
        inkMat.diffuseColor = new BABYLON.Color3(0.06, 0.06, 0.08);
        const ink = add(BABYLON.MeshBuilder.CreateBox('jkInkSlab',
            { width: 0.5, height: 0.06, depth: 0.3 }, s));
        ink.position = new BABYLON.Vector3(-3.2, 1.08, -1.0); ink.material = inkMat;

        // Brush (pickupable by Maomao)
        const brushMat = new BABYLON.StandardMaterial('jkBrush', s);
        brushMat.diffuseColor = new BABYLON.Color3(0.55, 0.35, 0.12);
        this._brushMesh = add(BABYLON.MeshBuilder.CreateCylinder('jkBrush',
            { diameterTop: 0.03, diameterBottom: 0.05, height: 1.0, tessellation: 8 }, s));
        this._brushMesh.rotation.z = Math.PI / 2;
        this._brushMesh.position = new BABYLON.Vector3(2.8, 1.12, -1.2);
        this._brushMesh.material = brushMat;

        // Ceramic vases on shelf
        const vaseMat = new BABYLON.StandardMaterial('jkVaseMat', s);
        vaseMat.diffuseColor  = new BABYLON.Color3(0.2, 0.4, 0.65);
        vaseMat.emissiveColor = new BABYLON.Color3(0.02, 0.05, 0.10);
        [-6, -5, 5, 6].forEach((x, i) => {
            const v = add(BABYLON.MeshBuilder.CreateCylinder('jkVase' + i,
                { diameterTop: 0.18, diameterBottom: 0.22, height: 0.55, tessellation: 10 }, s));
            v.position = new BABYLON.Vector3(x, 1.30, -11.5); v.material = vaseMat;
        });
    }

    _buildHuizong() {
        const s   = this.engine.scene;
        const add = m => { this._meshes.push(m); return m; };

        const root = new BABYLON.TransformNode('huizongRoot', s);
        root.position = new BABYLON.Vector3(0, 0, -4.2);
        root.rotation.y = Math.PI; // faces south toward player
        add(root);
        this._huizongNPC = root;

        // Imperial yellow robe
        const robeMat = new BABYLON.StandardMaterial('hzRobe', s);
        robeMat.diffuseColor  = new BABYLON.Color3(0.88, 0.72, 0.08);
        robeMat.emissiveColor = new BABYLON.Color3(0.15, 0.12, 0.01);
        const body = add(BABYLON.MeshBuilder.CreateBox('hzBody',
            { width: 0.75, height: 1.25, depth: 0.44 }, s));
        body.position.y = 1.3; body.parent = root; body.material = robeMat;

        const skinMat = new BABYLON.StandardMaterial('hzSkin', s);
        skinMat.diffuseColor = new BABYLON.Color3(0.90, 0.76, 0.62);
        const head = add(BABYLON.MeshBuilder.CreateSphere('hzHead', { diameter: 0.47 }, s));
        head.position.y = 2.1; head.parent = root; head.material = skinMat;

        // Imperial crown
        const crownMat = new BABYLON.StandardMaterial('hzCrown', s);
        crownMat.diffuseColor  = new BABYLON.Color3(1, 0.88, 0.15);
        crownMat.emissiveColor = new BABYLON.Color3(0.45, 0.32, 0.02);
        const crown = add(BABYLON.MeshBuilder.CreateCylinder('hzCrown',
            { diameterTop: 0.48, diameterBottom: 0.44, height: 0.33, tessellation: 12 }, s));
        crown.position.y = 2.4; crown.parent = root; crown.material = crownMat;
        // Crown wings
        [-1, 1].forEach(side => {
            const wing = add(BABYLON.MeshBuilder.CreateBox('hzWing' + side,
                { width: 0.30, height: 0.05, depth: 0.12 }, s));
            wing.position = new BABYLON.Vector3(side * 0.32, 2.36, 0);
            wing.parent = root; wing.material = crownMat;
        });

        // Label
        this._buildLabel(new BABYLON.Vector3(0, 2.85, -3.8), '宋徽宗', '书画皇帝 · 北宋末帝');
    }

    _buildPaintings() {
        const s   = this.engine.scene;
        const add = m => { this._meshes.push(m); return m; };

        // Hanging scrolls on north wall
        const colors = [
            new BABYLON.Color3(0.65, 0.82, 0.6),
            new BABYLON.Color3(0.8, 0.72, 0.45),
            new BABYLON.Color3(0.55, 0.70, 0.80)
        ];
        [-7, 0, 7].forEach((x, i) => {
            const bg = add(BABYLON.MeshBuilder.CreatePlane('jkPainting' + i,
                { width: 2.8, height: 4.2 }, s));
            bg.position = new BABYLON.Vector3(x, 4.0, -12.7);
            const mat = new BABYLON.StandardMaterial('jkPaintMat' + i, s);
            mat.diffuseColor  = colors[i];
            mat.emissiveColor = colors[i].scale(0.15);
            mat.backFaceCulling = false;
            bg.material = mat;

            // Roller at top and bottom
            const rollerMat = new BABYLON.StandardMaterial('jkRoller' + i, s);
            rollerMat.diffuseColor = new BABYLON.Color3(0.35, 0.18, 0.05);
            [1.8, -1.8].forEach(dy => {
                const r = add(BABYLON.MeshBuilder.CreateCylinder('jkRollerM',
                    { diameter: 0.18, height: 3.0, tessellation: 10 }, s));
                r.rotation.z = Math.PI / 2;
                r.position = new BABYLON.Vector3(x, 4.0 + dy, -12.65);
                r.material = rollerMat;
            });
        });
    }

    _buildMessenger() {
        const s   = this.engine.scene;
        const add = m => { this._meshes.push(m); return m; };

        const root = new BABYLON.TransformNode('messengerRoot', s);
        root.position = new BABYLON.Vector3(-4, 0, 9);
        root.rotation.y = -Math.PI / 4;
        add(root);
        this._messengerNPC = root;

        const robeMat = new BABYLON.StandardMaterial('msgRobe', s);
        robeMat.diffuseColor = new BABYLON.Color3(0.55, 0.55, 0.55);
        const body = add(BABYLON.MeshBuilder.CreateBox('msgBody',
            { width: 0.62, height: 1.1, depth: 0.38 }, s));
        body.position.y = 1.2; body.parent = root; body.material = robeMat;

        const skinMat = new BABYLON.StandardMaterial('msgSkin', s);
        skinMat.diffuseColor = new BABYLON.Color3(0.88, 0.72, 0.60);
        const head = add(BABYLON.MeshBuilder.CreateSphere('msgHead', { diameter: 0.42 }, s));
        head.position.y = 1.98; head.parent = root; head.material = skinMat;

        this._messengerNPC.setEnabled(false); // hidden until needed
    }

    _buildLabel(pos, name, title) {
        const s   = this.engine.scene;
        const tex = new BABYLON.DynamicTexture('lbl_' + name, { width: 220, height: 80 }, s);
        const ctx = tex.getContext();
        ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#ffe566'; ctx.fillText(name, 12, 30);
        ctx.font = '13px sans-serif'; ctx.fillStyle = '#aabb99';
        ctx.fillText(title, 12, 54);
        tex.update();
        const plane = BABYLON.MeshBuilder.CreatePlane('lbl', { width: 1.9, height: 0.68 }, s);
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
        plane.position = pos;
        const mat = new BABYLON.StandardMaterial('lblMat', s);
        mat.diffuseTexture = tex; mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        mat.alpha = 0.92; mat.backFaceCulling = false;
        plane.material = mat;
        this._meshes.push(plane);
    }

    _positionPlayer() {
        this.engine.player.mesh.position = new BABYLON.Vector3(0, 0.8, 6);
        this.engine.player.isLocked = true;
        if (this.engine.catCompanion) {
            this.engine.catCompanion.setPosition(new BABYLON.Vector3(2, 0.5, 5.5));
        }
        if (this.engine.camera) {
            this.engine.camera.alpha  = Math.PI / 2;
            this.engine.camera.beta   = Math.PI / 3.4;
            this.engine.camera.radius = 14;
        }
    }

    // ── Sequence ──────────────────────────────────────────────────────────────

    _runIntro() {
        this.engine.dialogueSystem.show(this.dlg.intro, () => {
            this._runWarningChain(0);
        });
    }

    _runWarningChain(idx) {
        const warnings = this.dlg.warnings;
        if (idx >= warnings.length) {
            this._runJinArrives();
            return;
        }
        const w = warnings[idx];

        // Show title badge
        this._showTitleBadge(w.title);

        // Messenger bursts in
        this._messengerNPC.setEnabled(true);
        this._messengerNPC.position = new BABYLON.Vector3(-4 + idx * 2, 0, 9 - idx);

        // Messenger dialogue
        this.engine.dialogueSystem.show([w.messenger_arrives], () => {
            // Button: present the warning
            this._showReportButton(w, () => {
                // 3 word challenges
                this._runWordChallenge(w, 0, () => {
                    // Player delivers report
                    this.engine.dialogueSystem.show([w.player_reports], () => {
                        // Huizong dismisses
                        this.engine.dialogueSystem.show(w.huizong_response, () => {
                            // Maomao antics!
                            this._doMaomaoAntic(idx, w, () => {
                                this._messengerNPC.setEnabled(false);
                                setTimeout(() => this._runWarningChain(idx + 1), 600);
                            });
                        });
                    });
                });
            });
        });
    }

    _showTitleBadge(title) {
        const badge = new BABYLON.GUI.Rectangle('jkBadge');
        badge.width = '280px'; badge.height = '40px';
        badge.background = 'rgba(80,5,5,0.92)';
        badge.cornerRadius = 10; badge.thickness = 2; badge.color = '#ff8888';
        badge.verticalAlignment   = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        badge.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        badge.top = '14px'; badge.isPointerBlocker = false;
        this.engine.ui.addControl(badge);
        const tb = new BABYLON.GUI.TextBlock('jkBadgeTxt', '⚠️ ' + title);
        tb.color = '#ffaaaa'; tb.fontSize = 14;
        tb.fontFamily = '"Microsoft YaHei", serif';
        badge.addControl(tb);
        setTimeout(() => {
            try { this.engine.ui.removeControl(badge); badge.dispose(); } catch(e){}
        }, 3000);
    }

    _showReportButton(w, onConfirm) {
        const panel = new BABYLON.GUI.Rectangle('jkReportPanel');
        panel.width = '340px'; panel.height = '100px';
        panel.background = 'rgba(10,5,20,0.94)';
        panel.cornerRadius = 14; panel.thickness = 2; panel.color = '#ffaaaa';
        panel.verticalAlignment   = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.top = '-28px'; panel.isPointerBlocker = true;
        this.engine.ui.addControl(panel);

        const hint = new BABYLON.GUI.TextBlock('', '皇上还在作画，你需要先搞懂军情……');
        hint.color = '#ffcccc'; hint.fontSize = 13;
        hint.fontFamily = '"Microsoft YaHei", serif'; hint.top = '-20px';
        panel.addControl(hint);

        const btn = new BABYLON.GUI.Rectangle('jkRBtn');
        btn.width = '260px'; btn.height = '36px'; btn.top = '20px';
        btn.background = 'rgba(120,20,20,0.8)'; btn.cornerRadius = 10;
        btn.thickness = 2; btn.color = '#ffaaaa'; btn.isPointerBlocker = true;
        panel.addControl(btn);
        const bTxt = new BABYLON.GUI.TextBlock();
        bTxt.text = w.deliver_btn; bTxt.color = '#ffe0e0'; bTxt.fontSize = 14;
        bTxt.fontFamily = '"Microsoft YaHei", serif';
        btn.addControl(bTxt);

        btn.onPointerEnterObservable.add(() => { btn.background = 'rgba(170,30,30,0.9)'; });
        btn.onPointerOutObservable.add(() => { btn.background = 'rgba(120,20,20,0.8)'; });
        btn.onPointerClickObservable.add(() => {
            this.engine.ui.removeControl(panel); panel.dispose();
            onConfirm();
        });
    }

    _runWordChallenge(warning, wordNum, onAllDone) {
        if (wordNum >= 3) { onAllDone(); return; }

        const word = this._pickWord(warning, wordNum);
        if (!word) { onAllDone(); return; }

        const badge = new BABYLON.GUI.Rectangle('jkWBadge');
        badge.width = '280px'; badge.height = '40px';
        badge.background = 'rgba(10,5,20,0.92)';
        badge.cornerRadius = 10; badge.thickness = 2; badge.color = '#ffaaaa';
        badge.verticalAlignment   = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        badge.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        badge.top = '14px'; badge.isPointerBlocker = false;
        this.engine.ui.addControl(badge);
        const bdTxt = new BABYLON.GUI.TextBlock();
        bdTxt.text = `⚠️ 解读军情 ${'●'.repeat(wordNum)}${'○'.repeat(3 - wordNum)}`;
        bdTxt.color = '#ffcccc'; bdTxt.fontSize = 13;
        bdTxt.fontFamily = '"Microsoft YaHei", serif';
        badge.addControl(bdTxt);

        this.engine.showWordChallenge(word, warning.word_prompt, () => {
            this.engine.ui.removeControl(badge); badge.dispose();
            setTimeout(() => this._runWordChallenge(warning, wordNum + 1, onAllDone), 350);
        });
    }

    _pickWord(warning, offset) {
        const all = this.engine.learningSystem.words;
        if (!all || all.length === 0) return null;
        const unmastered = all.filter(w =>
            this.engine.learningSystem.getWordState(w.id) !== 'mastered'
        );
        const pool  = unmastered.length > 0 ? unmastered : all;
        const wIdx  = this.dlg.warnings.indexOf(warning);
        const index = ((wIdx * 3) + offset + 9) % pool.length; // +9 offset after Ch3's 9 words
        return pool[index];
    }

    // ── Maomao escalating antics ──────────────────────────────────────────────

    _doMaomaoAntic(idx, warning, onDone) {
        const cat   = this.engine.catCompanion;
        const color = warning.maomao_color || '#aaaaff';

        if (idx === 0) {
            // Knock over inkstone: move cat to desk, reveal ink spill
            if (cat) cat.setPosition(new BABYLON.Vector3(-1.5, 1.2, -1.0));
            setTimeout(() => {
                this._inkSpill.setEnabled(true);
                this._showCatBubble(warning.maomao_action, color, 2200, onDone);
            }, 400);

        } else if (idx === 1) {
            // Sit on painting: cat on table surface
            if (cat) cat.setPosition(new BABYLON.Vector3(0, 1.3, -1.5));
            this._showCatBubble(warning.maomao_action, color, 2400, onDone);

        } else if (idx === 2) {
            // Grab brush and run: animate brush rising, cat runs to door
            if (cat) cat.setPosition(new BABYLON.Vector3(2.8, 1.3, -1.2));
            setTimeout(() => {
                if (this._brushMesh) {
                    this._brushMesh.position.y = 1.6;
                }
                this._showCatBubble(warning.maomao_action, color, 1600, () => {
                    if (cat) {
                        // Run toward door
                        cat.setPosition(new BABYLON.Vector3(0, 0.5, 10));
                    }
                    setTimeout(onDone, 800);
                });
            }, 400);
        }
    }

    _showCatBubble(text, color, durationMs, onDone) {
        const bubble = new BABYLON.GUI.Rectangle('jkCatBubble');
        bubble.width = '280px'; bubble.height = '52px';
        bubble.background = 'rgba(10,5,20,0.90)';
        bubble.cornerRadius = 12; bubble.thickness = 2; bubble.color = color;
        bubble.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        bubble.verticalAlignment   = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        bubble.left = '-14px'; bubble.top = '-90px';
        bubble.isPointerBlocker = false;
        this.engine.ui.addControl(bubble);

        const tb = new BABYLON.GUI.TextBlock('jkCatTxt', '🐱 猫猫：' + text);
        tb.color = color; tb.fontSize = 13;
        tb.fontFamily = '"Microsoft YaHei", serif';
        tb.textWrapping = true; tb.paddingLeft = '8px'; tb.paddingRight = '8px';
        bubble.addControl(tb);

        setTimeout(() => {
            try { this.engine.ui.removeControl(bubble); bubble.dispose(); } catch(e){}
            if (onDone) onDone();
        }, durationMs);
    }

    // ── Jin army arrives ──────────────────────────────────────────────────────

    _runJinArrives() {
        // Red flash storm
        this._redFlashStorm(() => {
            this.engine.dialogueSystem.show(this.dlg.jin_arrives, () => {
                this._runJingkang();
            });
        });
    }

    _redFlashStorm(onDone) {
        const s = this.engine.scene;
        const overlay = new BABYLON.GUI.Rectangle('jkRedOverlay');
        overlay.width = '100%'; overlay.height = '100%';
        overlay.background = 'rgba(180,20,0,0)';
        overlay.thickness = 0; overlay.isPointerBlocker = true;
        this.engine.ui.addControl(overlay);

        // Particle burst at multiple points to simulate army
        const burstPositions = [
            new BABYLON.Vector3(-8, 3, -12), new BABYLON.Vector3(0, 3, -12),
            new BABYLON.Vector3(8, 3, -12),  new BABYLON.Vector3(-4, 3, -8),
            new BABYLON.Vector3(4, 3, -8)
        ];
        burstPositions.forEach((pos, i) => {
            setTimeout(() => {
                if (this.engine.particles) this.engine.particles.burstAt(pos);
            }, i * 180);
        });

        // Huizong shows fear
        if (this._huizongNPC) {
            this._huizongNPC.rotation.x = 0.2;
        }

        let t = 0;
        const obs = s.onBeforeRenderObservable.add(() => {
            t += s.getEngine().getDeltaTime() / 1000;
            const flicker = Math.abs(Math.sin(t * 8)) * 0.55;
            overlay.background = `rgba(180,20,0,${flicker.toFixed(3)})`;
            if (t >= 2.5) {
                s.onBeforeRenderObservable.remove(obs);
                this.engine.ui.removeControl(overlay); overlay.dispose();
                onDone();
            }
        });
    }

    _runJingkang() {
        // Fade to dark, display each jingkang line as large text
        const dlg = this.dlg.jingkang;
        this._showJingkangCard(dlg, 0, () => {
            this.engine.dialogueSystem.show(this.dlg.epilogue, () => {
                this._onDone();
            });
        });
    }

    _showJingkangCard(lines, idx, onDone) {
        if (idx >= lines.length) { onDone(); return; }

        const overlay = new BABYLON.GUI.Rectangle('jkCard_' + idx);
        overlay.width = '100%'; overlay.height = '100%';
        overlay.background = 'rgba(0,0,0,0.88)';
        overlay.thickness = 0; overlay.isPointerBlocker = true;
        this.engine.ui.addControl(overlay);

        const tb = new BABYLON.GUI.TextBlock('jkCardTxt', lines[idx]);
        tb.color = idx === 0 ? '#ff4444' : '#ddccaa';
        tb.fontSize = idx === 0 ? 46 : 20;
        tb.fontFamily = '"Microsoft YaHei", serif';
        tb.fontWeight = 'bold'; tb.alpha = 0;
        overlay.addControl(tb);

        const s = this.engine.scene;
        let t = 0;
        const obs = s.onBeforeRenderObservable.add(() => {
            t += s.getEngine().getDeltaTime() / 1000;
            if (t < 0.8) tb.alpha = t / 0.8;
            else if (t < 2.2) tb.alpha = 1;
            else {
                tb.alpha = Math.max(0, 1 - (t - 2.2) / 0.6);
                if (tb.alpha <= 0) {
                    s.onBeforeRenderObservable.remove(obs);
                    this.engine.ui.removeControl(overlay); overlay.dispose();
                    setTimeout(() => this._showJingkangCard(lines, idx + 1, onDone), 200);
                }
            }
        });
    }
}
