/**
 * ReformScene - 王安石变法
 * Wang Anshi presents the fiscal crisis → player suggests reform →
 * 3 reforms × 3 words each → conservative opposition → failure
 */
class ReformScene {
    constructor(engine, dialogueData) {
        this.engine = engine;
        this.dlg    = dialogueData;
        this._meshes = [];
        this._wangNPC = null;
        this._conservativeNPCs = [];
        this._reformBanners = [];
        this._onDone = null;
        this._maomaoTimer  = null;
        this._yawnTimer    = null;
        this._yawnBubble   = null;
    }

    run() {
        return new Promise(resolve => {
            this._onDone = resolve;
            this._buildHall();
            this._buildDesk();
            this._buildWangAnshi();
            this._buildScrollWall();
            this._positionPlayer();
            this._runIntro();
        });
    }

    dispose() {
        this._stopMaomaoAntics();
        this._meshes.forEach(m => { try { m.dispose(); } catch(e){} });
        this._meshes = [];
        this._reformBanners = [];
        this._conservativeNPCs = [];
    }

    // ── Environment ───────────────────────────────────────────────────────────

    _buildHall() {
        const s   = this.engine.scene;
        const add = m => { this._meshes.push(m); return m; };

        // Floor — dark polished wood
        const floor = add(BABYLON.MeshBuilder.CreateGround('rfFloor', { width: 36, height: 28 }, s));
        const fMat = new BABYLON.StandardMaterial('rfFloorMat', s);
        fMat.diffuseColor  = new BABYLON.Color3(0.30, 0.18, 0.08);
        fMat.specularColor = new BABYLON.Color3(0.25, 0.18, 0.10);
        floor.material = fMat;

        // Ceiling
        const ceil = add(BABYLON.MeshBuilder.CreateGround('rfCeil', { width: 36, height: 28 }, s));
        ceil.position.y = 7; ceil.rotation.x = Math.PI;
        const cMat = fMat.clone('rfCeilMat');
        cMat.diffuseColor = new BABYLON.Color3(0.20, 0.12, 0.05);
        ceil.material = cMat;

        // Walls
        const wallMat = new BABYLON.StandardMaterial('rfWallMat', s);
        wallMat.diffuseColor = new BABYLON.Color3(0.72, 0.60, 0.42);
        const walls = [
            { w: 36, h: 7, pos: new BABYLON.Vector3(0, 3.5, -14), ry: 0 },
            { w: 36, h: 7, pos: new BABYLON.Vector3(0, 3.5,  14), ry: Math.PI },
            { w: 28, h: 7, pos: new BABYLON.Vector3(-18, 3.5, 0), ry:  Math.PI / 2 },
            { w: 28, h: 7, pos: new BABYLON.Vector3( 18, 3.5, 0), ry: -Math.PI / 2 }
        ];
        walls.forEach(def => {
            const w = add(BABYLON.MeshBuilder.CreatePlane('rfWall', { width: def.w, height: def.h }, s));
            w.position = def.pos; w.rotation.y = def.ry;
            w.material = wallMat;
        });

        // Red pillars
        const pillarMat = new BABYLON.StandardMaterial('rfPillarMat', s);
        pillarMat.diffuseColor  = new BABYLON.Color3(0.7, 0.1, 0.1);
        pillarMat.emissiveColor = new BABYLON.Color3(0.12, 0.02, 0.02);
        [[-12, -8], [-12, 8], [12, -8], [12, 8]].forEach(([x, z]) => {
            const p = add(BABYLON.MeshBuilder.CreateCylinder('rfPillar',
                { diameter: 0.65, height: 7, tessellation: 12 }, s));
            p.position = new BABYLON.Vector3(x, 3.5, z);
            p.material = pillarMat;
        });

        // Lanterns hanging from ceiling
        const lanternMat = new BABYLON.StandardMaterial('rfLanMat', s);
        lanternMat.diffuseColor  = new BABYLON.Color3(0.9, 0.15, 0.1);
        lanternMat.emissiveColor = new BABYLON.Color3(0.6, 0.08, 0.05);
        [[-6, -4], [0, -4], [6, -4], [-6, 4], [6, 4]].forEach(([x, z]) => {
            const lan = add(BABYLON.MeshBuilder.CreateCylinder('rfLan',
                { diameterTop: 0.25, diameterBottom: 0.25, height: 0.55, tessellation: 10 }, s));
            lan.position = new BABYLON.Vector3(x, 6.2, z);
            lan.material = lanternMat;
            const cord = add(BABYLON.MeshBuilder.CreateCylinder('rfCord',
                { diameter: 0.04, height: 0.45, tessellation: 6 }, s));
            cord.position = new BABYLON.Vector3(x, 6.65, z);
            const cMat2 = new BABYLON.StandardMaterial('cMat2', s);
            cMat2.diffuseColor = new BABYLON.Color3(0.3, 0.2, 0.1);
            cord.material = cMat2;
        });
    }

    _buildDesk() {
        const s   = this.engine.scene;
        const add = m => { this._meshes.push(m); return m; };

        const deskMat = new BABYLON.StandardMaterial('rfDeskMat', s);
        deskMat.diffuseColor  = new BABYLON.Color3(0.45, 0.28, 0.10);
        deskMat.emissiveColor = new BABYLON.Color3(0.04, 0.02, 0.01);

        // Desk top
        const top = add(BABYLON.MeshBuilder.CreateBox('rfDeskTop',
            { width: 9, height: 0.18, depth: 4.2 }, s));
        top.position = new BABYLON.Vector3(0, 1.0, 0);
        top.material = deskMat;

        // Desk legs
        [[-4, -1.8], [-4, 1.8], [4, -1.8], [4, 1.8]].forEach(([x, z]) => {
            const leg = add(BABYLON.MeshBuilder.CreateBox('rfLeg',
                { width: 0.18, height: 1.0, depth: 0.18 }, s));
            leg.position = new BABYLON.Vector3(x, 0.5, z);
            leg.material = deskMat;
        });

        // Ink slab
        const inkMat = new BABYLON.StandardMaterial('inkMat', s);
        inkMat.diffuseColor = new BABYLON.Color3(0.08, 0.08, 0.10);
        const ink = add(BABYLON.MeshBuilder.CreateBox('rfInk',
            { width: 0.55, height: 0.06, depth: 0.35 }, s));
        ink.position = new BABYLON.Vector3(-3.2, 1.10, -0.6);
        ink.material = inkMat;

        // Scroll on desk
        const scrollMat = new BABYLON.StandardMaterial('scrollMat', s);
        scrollMat.diffuseColor = new BABYLON.Color3(0.92, 0.88, 0.72);
        const scroll = add(BABYLON.MeshBuilder.CreateCylinder('rfScroll',
            { diameter: 0.18, height: 1.8, tessellation: 10 }, s));
        scroll.rotation.z = Math.PI / 2;
        scroll.position = new BABYLON.Vector3(1.5, 1.14, 0.2);
        scroll.material = scrollMat;

        // Brush holder cup
        const cupMat = new BABYLON.StandardMaterial('cupMat', s);
        cupMat.diffuseColor = new BABYLON.Color3(0.4, 0.28, 0.55);
        const cup = add(BABYLON.MeshBuilder.CreateCylinder('rfCup',
            { diameterTop: 0.18, diameterBottom: 0.14, height: 0.35, tessellation: 10 }, s));
        cup.position = new BABYLON.Vector3(-3.8, 1.18, 0.5);
        cup.material = cupMat;
    }

    _buildWangAnshi() {
        const s   = this.engine.scene;
        const add = m => { this._meshes.push(m); return m; };

        const root = new BABYLON.TransformNode('wangRoot', s);
        root.position = new BABYLON.Vector3(0, 0, -3.8);
        root.rotation.y = Math.PI; // face south toward player
        add(root);
        this._wangNPC = root;

        // Robe — official blue
        const robeMat = new BABYLON.StandardMaterial('wangRobe', s);
        robeMat.diffuseColor  = new BABYLON.Color3(0.15, 0.25, 0.58);
        robeMat.emissiveColor = new BABYLON.Color3(0.03, 0.05, 0.12);
        const body = add(BABYLON.MeshBuilder.CreateBox('wangBody',
            { width: 0.72, height: 1.25, depth: 0.42 }, s));
        body.position.y = 1.28; body.parent = root; body.material = robeMat;

        // Head
        const skinMat = new BABYLON.StandardMaterial('wangSkin', s);
        skinMat.diffuseColor = new BABYLON.Color3(0.88, 0.72, 0.58);
        const head = add(BABYLON.MeshBuilder.CreateSphere('wangHead', { diameter: 0.46 }, s));
        head.position.y = 2.08; head.parent = root; head.material = skinMat;

        // Official hat (乌纱帽)
        const hatMat = new BABYLON.StandardMaterial('wangHat', s);
        hatMat.diffuseColor = new BABYLON.Color3(0.08, 0.08, 0.10);
        const hat = add(BABYLON.MeshBuilder.CreateCylinder('wangHat',
            { diameterTop: 0.36, diameterBottom: 0.48, height: 0.30, tessellation: 12 }, s));
        hat.position.y = 2.38; hat.parent = root; hat.material = hatMat;
        // Hat wings
        [-1, 1].forEach(side => {
            const wing = add(BABYLON.MeshBuilder.CreateBox('wangWing' + side,
                { width: 0.32, height: 0.06, depth: 0.14 }, s));
            wing.position = new BABYLON.Vector3(side * 0.34, 2.34, 0);
            wing.parent = root; wing.material = hatMat;
        });

        // Name label
        this._buildNPCLabel(new BABYLON.Vector3(0, 2.80, -3.4), '王安石', '宰相 · 改革家');
    }

    _buildNPCLabel(pos, name, title) {
        const s = this.engine.scene;
        const tex = new BABYLON.DynamicTexture('npcLabel_' + name, { width: 220, height: 80 }, s);
        const ctx = tex.getContext();
        ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#ffe580'; ctx.fillText(name, 12, 30);
        ctx.font = '14px sans-serif'; ctx.fillStyle = '#aabbcc';
        ctx.fillText(title, 12, 54);
        tex.update();
        const plane = BABYLON.MeshBuilder.CreatePlane('npcLabelPlane', { width: 1.8, height: 0.65 }, s);
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
        plane.position = pos;
        const mat = new BABYLON.StandardMaterial('npcLMat', s);
        mat.diffuseTexture = tex; mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        mat.alpha = 0.92; mat.backFaceCulling = false;
        plane.material = mat;
        this._meshes.push(plane);
    }

    _buildScrollWall() {
        const s   = this.engine.scene;
        const add = m => { this._meshes.push(m); return m; };

        // Reform status board on north wall — 3 slots (populated as reforms succeed)
        this._reformSlots = [];
        const slotsX = [-5, 0, 5];
        slotsX.forEach((x, i) => {
            const bg = add(BABYLON.MeshBuilder.CreatePlane('rfSlotBg' + i,
                { width: 2.4, height: 3.2 }, s));
            bg.position = new BABYLON.Vector3(x, 3.6, -13.7);
            const mat = new BABYLON.StandardMaterial('rfSlotBgMat' + i, s);
            mat.diffuseColor = new BABYLON.Color3(0.88, 0.82, 0.64);
            mat.emissiveColor = new BABYLON.Color3(0.12, 0.10, 0.06);
            mat.backFaceCulling = false;
            bg.material = mat;

            // Placeholder text (reform name)
            const tex = new BABYLON.DynamicTexture('rfSlotTex' + i, { width: 128, height: 192 }, s);
            const ctx = tex.getContext();
            ctx.fillStyle = '#c8b888';
            ctx.fillRect(0, 0, 128, 192);
            ctx.fillStyle = '#888'; ctx.font = '18px "Microsoft YaHei"';
            ctx.fillText('待定', 44, 100);
            tex.update();
            const overlay = add(BABYLON.MeshBuilder.CreatePlane('rfSlotOverlay' + i,
                { width: 2.4, height: 3.2 }, s));
            overlay.position = new BABYLON.Vector3(x, 3.6, -13.65);
            const oMat = new BABYLON.StandardMaterial('rfSlotOMat' + i, s);
            oMat.diffuseTexture = tex; oMat.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.8);
            oMat.backFaceCulling = false; oMat.alpha = 0.9;
            overlay.material = oMat;
            this._reformSlots.push({ overlay, tex });
        });
    }

    _positionPlayer() {
        this.engine.player.mesh.position = new BABYLON.Vector3(0, 0.8, 4.5);
        this.engine.player.isLocked = true;

        // Player chair
        const s   = this.engine.scene;
        const add = m => { this._meshes.push(m); return m; };
        const seatMat = new BABYLON.StandardMaterial('rfPSeat', s);
        seatMat.diffuseColor = new BABYLON.Color3(0.48, 0.30, 0.10);
        const seat = add(BABYLON.MeshBuilder.CreateBox('rfPlayerSeat',
            { width: 1.1, height: 0.18, depth: 0.9 }, s));
        seat.position = new BABYLON.Vector3(0, 0.72, 4.5); seat.material = seatMat;
        const back = add(BABYLON.MeshBuilder.CreateBox('rfPlayerBack',
            { width: 1.1, height: 1.2, depth: 0.12 }, s));
        back.position = new BABYLON.Vector3(0, 1.30, 5.05); back.material = seatMat;

        // 猫猫 beside player
        if (this.engine.catCompanion) {
            this.engine.catCompanion.setPosition(new BABYLON.Vector3(1.5, 0.5, 4.8));
        }

        // Camera: slight elevation, looking north over the desk at Wang Anshi
        if (this.engine.camera) {
            this.engine.camera.alpha  = Math.PI / 2;
            this.engine.camera.beta   = Math.PI / 3.5;
            this.engine.camera.radius = 13;
        }
    }

    // ── Sequence ──────────────────────────────────────────────────────────────

    _runIntro() {
        this.engine.dialogueSystem.show(this.dlg.intro, () => {
            this._showSuggestButton();
        });
    }

    _showSuggestButton() {
        const panel = new BABYLON.GUI.Rectangle('suggestPanel');
        panel.width = '320px'; panel.height = '100px';
        panel.background = 'rgba(10,5,20,0.94)';
        panel.cornerRadius = 14; panel.thickness = 2; panel.color = '#88ccff';
        panel.verticalAlignment   = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.top = '-28px'; panel.isPointerBlocker = true;
        this.engine.ui.addControl(panel);

        const hint = new BABYLON.GUI.TextBlock('suggestHint', '王安石等待你的建议……');
        hint.color = '#aaddff'; hint.fontSize = 14;
        hint.fontFamily = '"Microsoft YaHei", serif'; hint.top = '-20px';
        panel.addControl(hint);

        const btn = new BABYLON.GUI.Rectangle('suggestBtn');
        btn.width = '240px'; btn.height = '36px'; btn.top = '20px';
        btn.background = 'rgba(20,60,140,0.8)';
        btn.cornerRadius = 10; btn.thickness = 2; btn.color = '#88ccff';
        btn.isPointerBlocker = true;
        panel.addControl(btn);
        const bTxt = new BABYLON.GUI.TextBlock();
        bTxt.text = '📜 建议变法！'; bTxt.color = '#ddeeff'; bTxt.fontSize = 15;
        bTxt.fontFamily = '"Microsoft YaHei", serif';
        btn.addControl(bTxt);

        btn.onPointerEnterObservable.add(() => { btn.background = 'rgba(30,90,200,0.9)'; });
        btn.onPointerOutObservable.add(() => { btn.background = 'rgba(20,60,140,0.8)'; });
        btn.onPointerClickObservable.add(() => {
            this.engine.ui.removeControl(panel); panel.dispose();
            this.engine.dialogueSystem.show(this.dlg.player_suggests, () => {
                this.engine.dialogueSystem.show(this.dlg.wanganshi_accepts, () => {
                    this._startMaomaoAntics(); // 猫猫 starts wandering
                    this._runReformChain(0);
                });
            });
        });
    }

    // ── Maomao antics ─────────────────────────────────────────────────────────

    _startMaomaoAntics() {
        const cat = this.engine.catCompanion;
        if (!cat) return;

        // Wander randomly around the hall
        const wanderSpots = [
            new BABYLON.Vector3( 1.5, 0.5,  4.8),
            new BABYLON.Vector3(-3.0, 0.5,  6.0),
            new BABYLON.Vector3( 5.0, 0.5,  2.0),
            new BABYLON.Vector3(-1.5, 0.5,  8.0),
            new BABYLON.Vector3( 4.0, 0.5,  7.0),
            new BABYLON.Vector3(-5.0, 0.5,  3.5),
            new BABYLON.Vector3( 0.5, 0.5, 11.0)
        ];
        let spotIdx = 0;
        this._maomaoTimer = setInterval(() => {
            spotIdx = (spotIdx + 1) % wanderSpots.length;
            cat.setPosition(wanderSpots[spotIdx]);
        }, 2400);

        // Occasional yawn bubble every 5-7 seconds
        const yawnLines = [
            '呼~~（打了个大哈欠）',
            '喔～（准备出去追蝶蝶）',
            '...（滚到地板上打滚）',
            '喋～（将耳朵压低）',
            '喔~~（地上滚来滚去）'
        ];
        let yawnIdx = 0;
        const doYawn = () => {
            this._showCatBubble(cat, yawnLines[yawnIdx % yawnLines.length], '#aaaaff', 1800);
            yawnIdx++;
            this._yawnTimer = setTimeout(doYawn, 5000 + Math.random() * 3000);
        };
        this._yawnTimer = setTimeout(doYawn, 3500);
    }

    _stopMaomaoAntics() {
        if (this._maomaoTimer) { clearInterval(this._maomaoTimer); this._maomaoTimer = null; }
        if (this._yawnTimer)   { clearTimeout(this._yawnTimer);   this._yawnTimer   = null; }
        if (this._yawnBubble)  {
            try { this.engine.ui.removeControl(this._yawnBubble); this._yawnBubble.dispose(); } catch(e){}
            this._yawnBubble = null;
        }
    }

    _showCatBubble(cat, text, color, durationMs) {
        // Remove previous bubble
        if (this._yawnBubble) {
            try { this.engine.ui.removeControl(this._yawnBubble); this._yawnBubble.dispose(); } catch(e){}
        }
        const bubble = new BABYLON.GUI.Rectangle('catBubble_' + Date.now());
        bubble.width = '240px'; bubble.height = '46px';
        bubble.background = 'rgba(10,5,20,0.90)';
        bubble.cornerRadius = 12; bubble.thickness = 2; bubble.color = color;
        bubble.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        bubble.verticalAlignment   = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        bubble.left = '-14px'; bubble.top = '-90px';
        bubble.isPointerBlocker = false;
        this.engine.ui.addControl(bubble);
        this._yawnBubble = bubble;

        const tb = new BABYLON.GUI.TextBlock('catBubbleTxt', '🐱 猫猫：' + text);
        tb.color = color; tb.fontSize = 13;
        tb.fontFamily = '"Microsoft YaHei", serif';
        tb.textWrapping = true; tb.paddingLeft = '8px'; tb.paddingRight = '8px';
        bubble.addControl(tb);

        setTimeout(() => {
            if (this._yawnBubble === bubble) {
                try { this.engine.ui.removeControl(bubble); bubble.dispose(); } catch(e){}
                this._yawnBubble = null;
            }
        }, durationMs);
    }

    // ── Reform chain ──────────────────────────────────────────────────────────

    _runReformChain(idx) {
        const reforms = this.dlg.reforms;
        if (idx >= reforms.length) {
            this._stopMaomaoAntics();
            this._showThirdLesson();
            return;
        }
        const reform = reforms[idx];
        // Show reform intro dialogue, then button to implement
        this.engine.dialogueSystem.show([reform.intro], () => {
            this._showImplementButton(reform, idx, () => {
                this._runWordChallenge(reform, idx, 0, () => {
                    // Mark scroll on wall
                    this._markReformDone(idx, reform.name);
                    this.engine.dialogueSystem.show([reform.success], () => {
                        setTimeout(() => this._runReformChain(idx + 1), 500);
                    });
                });
            });
        });
    }

    _showImplementButton(reform, idx, onConfirm) {
        const panel = new BABYLON.GUI.Rectangle('implPanel_' + idx);
        panel.width = '350px'; panel.height = '110px';
        panel.background = 'rgba(10,5,20,0.94)';
        panel.cornerRadius = 14; panel.thickness = 2; panel.color = '#66ddaa';
        panel.verticalAlignment   = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.top = '-28px'; panel.isPointerBlocker = true;
        this.engine.ui.addControl(panel);

        const pTxt = new BABYLON.GUI.TextBlock('implTxt', `${reform.name}：${reform.desc}`);
        pTxt.color = '#aaffcc'; pTxt.fontSize = 13;
        pTxt.fontFamily = '"Microsoft YaHei", serif'; pTxt.top = '-22px';
        panel.addControl(pTxt);

        const btn = new BABYLON.GUI.Rectangle('implBtn_' + idx);
        btn.width = '260px'; btn.height = '36px'; btn.top = '22px';
        btn.background = 'rgba(10,100,60,0.8)';
        btn.cornerRadius = 10; btn.thickness = 2; btn.color = '#66ffaa';
        btn.isPointerBlocker = true;
        panel.addControl(btn);
        const bTxt = new BABYLON.GUI.TextBlock();
        bTxt.text = `📜 实施${reform.name}！`; bTxt.color = '#ccffe0'; bTxt.fontSize = 15;
        bTxt.fontFamily = '"Microsoft YaHei", serif';
        btn.addControl(bTxt);

        btn.onPointerEnterObservable.add(() => { btn.background = 'rgba(15,140,80,0.9)'; });
        btn.onPointerOutObservable.add(() => { btn.background = 'rgba(10,100,60,0.8)'; });
        btn.onPointerClickObservable.add(() => {
            this.engine.ui.removeControl(panel); panel.dispose();
            onConfirm();
        });
    }

    _runWordChallenge(reform, reformIdx, wordNum, onAllDone) {
        if (wordNum >= 3) { onAllDone(); return; }

        const words = this._pickWords(reformIdx, wordNum);
        if (!words) { onAllDone(); return; }

        // Progress badge
        const badge = new BABYLON.GUI.Rectangle('rfBadge');
        badge.width = '260px'; badge.height = '42px';
        badge.background = 'rgba(10,5,20,0.92)';
        badge.cornerRadius = 10; badge.thickness = 2; badge.color = '#66ddaa';
        badge.verticalAlignment   = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        badge.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        badge.top = '14px'; badge.isPointerBlocker = false;
        this.engine.ui.addControl(badge);
        const bdTxt = new BABYLON.GUI.TextBlock();
        const dots = '●'.repeat(wordNum) + '○'.repeat(3 - wordNum);
        bdTxt.text = `📜 ${reform.name} ${dots}`;
        bdTxt.color = '#88ffcc'; bdTxt.fontSize = 14;
        bdTxt.fontFamily = '"Microsoft YaHei", serif';
        badge.addControl(bdTxt);

        const prompt = reform.word_prompt;
        this.engine.showWordChallenge(words, prompt, () => {
            this.engine.ui.removeControl(badge); badge.dispose();
            setTimeout(() => this._runWordChallenge(reform, reformIdx, wordNum + 1, onAllDone), 400);
        });
    }

    _pickWords(reformIdx, wordOffset) {
        const all = this.engine.learningSystem.words;
        if (!all || all.length === 0) return null;
        const unmastered = all.filter(w =>
            this.engine.learningSystem.getWordState(w.id) !== 'mastered'
        );
        const pool  = unmastered.length > 0 ? unmastered : all;
        const index = (reformIdx * 3 + wordOffset) % pool.length;
        return pool[index];
    }

    _markReformDone(idx, name) {
        if (!this._reformSlots[idx]) return;
        const { tex } = this._reformSlots[idx];
        const ctx = tex.getContext();
        ctx.clearRect(0, 0, 128, 192);
        ctx.fillStyle = '#d4eecc'; ctx.fillRect(0, 0, 128, 192);
        ctx.fillStyle = '#226622'; ctx.font = 'bold 20px "Microsoft YaHei"';
        ctx.fillText(name, 20, 60);
        ctx.fillStyle = '#448844'; ctx.font = '32px sans-serif';
        ctx.fillText('✓', 46, 120);
        ctx.fillStyle = '#338833'; ctx.font = '13px "Microsoft YaHei"';
        ctx.fillText('已推行', 32, 158);
        tex.update();

        // Particle burst above scroll slot
        const xPos = [-5, 0, 5][idx] || 0;
        if (this.engine.particles) {
            this.engine.particles.burstAt(new BABYLON.Vector3(xPos, 5, -12));
        }
    }

    // ── Third lesson & Maomao rushing ─────────────────────────────────────────

    _showThirdLesson() {
        const cat = this.engine.catCompanion;
        // Wang Anshi gives his 3rd and most important lesson
        this.engine.dialogueSystem.show(this.dlg.third_lesson_wang, () => {
            // Maomao ignores it — show 3 cat responses with running
            this._showThirdLessonCat(0, () => {
                // Maomao rushes out
                this.engine.dialogueSystem.show(this.dlg.maomao_rushes, () => {
                    // Quick cat dash animation: teleport to door then offscreen
                    if (cat) {
                        cat.setPosition(new BABYLON.Vector3(0, 0.5, 12));
                        setTimeout(() => cat.setPosition(new BABYLON.Vector3(0, -20, 0)), 600);
                    }
                    setTimeout(() => this._runTimeSkip(), 800);
                });
            });
        });
    }

    _showThirdLessonCat(idx, onDone) {
        const catLines = this.dlg.third_lesson_cat;
        if (idx >= catLines.length) { onDone(); return; }

        const cat = this.engine.catCompanion;
        // Move cat to a new random spot each line
        const spots = [
            new BABYLON.Vector3(7, 0.5, 8),
            new BABYLON.Vector3(-6, 0.5, 10),
            new BABYLON.Vector3(3, 0.5, 12)
        ];
        if (cat) cat.setPosition(spots[idx % spots.length]);

        this._showCatBubble(cat, catLines[idx], '#ff99cc', 2200);
        setTimeout(() => this._showThirdLessonCat(idx + 1, onDone), 2500);
    }

    // ── Time skip & opposition ────────────────────────────────────────────────

    _runTimeSkip() {
        // Fade to dark, show year text, fade back
        const overlay = new BABYLON.GUI.Rectangle('rfTimeOverlay');
        overlay.width = '100%'; overlay.height = '100%';
        overlay.background = 'rgba(0,0,0,0)';
        overlay.thickness = 0; overlay.isPointerBlocker = true;
        this.engine.ui.addControl(overlay);

        const yearTxt = new BABYLON.GUI.TextBlock('rfYear', this.dlg.time_skip_text);
        yearTxt.color = '#ffd700'; yearTxt.fontSize = 52;
        yearTxt.fontFamily = '"Microsoft YaHei", serif';
        yearTxt.fontWeight = 'bold'; yearTxt.alpha = 0;
        overlay.addControl(yearTxt);

        const s = this.engine.scene;
        let t = 0;
        const obs = s.onBeforeRenderObservable.add(() => {
            t += s.getEngine().getDeltaTime() / 1000;
            if (t < 1.2) {
                const a = Math.min(1, t / 0.6);
                overlay.background = `rgba(0,0,0,${(a * 0.92).toFixed(3)})`;
                yearTxt.alpha = a;
            } else if (t < 2.5) {
                // hold
            } else {
                const a = Math.max(0, 1 - (t - 2.5) / 0.7);
                overlay.background = `rgba(0,0,0,${(a * 0.92).toFixed(3)})`;
                yearTxt.alpha = a;
                if (a <= 0) {
                    s.onBeforeRenderObservable.remove(obs);
                    this.engine.ui.removeControl(overlay); overlay.dispose();
                    this._spawnConservatives();
                    this.engine.dialogueSystem.show(this.dlg.opposition, () => {
                        this._runFailure();
                    });
                }
            }
        });
    }

    _spawnConservatives() {
        const s   = this.engine.scene;
        const add = m => { this._meshes.push(m); return m; };
        const redMat = new BABYLON.StandardMaterial('consRobe', s);
        redMat.diffuseColor  = new BABYLON.Color3(0.6, 0.1, 0.1);
        redMat.emissiveColor = new BABYLON.Color3(0.12, 0.02, 0.02);
        const skinMat = new BABYLON.StandardMaterial('consSkin', s);
        skinMat.diffuseColor = new BABYLON.Color3(0.88, 0.72, 0.58);

        [[-6, 6], [6, 6], [-4, 8], [4, 8]].forEach(([x, z], i) => {
            const root = new BABYLON.TransformNode('cons_' + i, s);
            root.position = new BABYLON.Vector3(x, 0, z);
            root.rotation.y = Math.PI + Math.atan2(x, z - 4);
            add(root);
            const body = add(BABYLON.MeshBuilder.CreateBox('consBody' + i,
                { width: 0.65, height: 1.15, depth: 0.38 }, s));
            body.position.y = 1.2; body.parent = root; body.material = redMat;
            const head = add(BABYLON.MeshBuilder.CreateSphere('consHead' + i, { diameter: 0.42 }, s));
            head.position.y = 2.0; head.parent = root; head.material = skinMat;
            this._conservativeNPCs.push(root);
        });

        // Label one as 司马光
        this._buildNPCLabel(new BABYLON.Vector3(-6, 2.8, 6), '司马光', '保守派领袖');
    }

    _runFailure() {
        // Wang Anshi sad — hang his head (tilt slightly)
        if (this._wangNPC) {
            this._wangNPC.rotation.x = 0.15;
        }
        this.engine.dialogueSystem.show(this.dlg.failure, () => {
            this._onDone();
        });
    }
}
