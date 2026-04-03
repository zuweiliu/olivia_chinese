/**
 * FeastScene - Palace banquet hall where 猫猫 sprays wine on each general
 * causing them to give up their 军印 (military seal) one by one.
 */
class FeastScene {
    constructor(engine, dialogueData) {
        this.engine  = engine;
        this.dlg     = dialogueData;
        this._meshes = [];
        this._generalNPCs = [];  // { mesh, sealMesh, nameLabel }
        this._sealPile = [];
    }

    /** Build the room, return Promise that resolves when feast sequence finishes */
    run() {
        return new Promise(resolve => {
            this._onDone = resolve;
            this._buildRoom();
            this._buildTable();
            this._buildGenerals();
            this._positionPlayer();
            this._runSequence();
        });
    }

    dispose() {
        this._meshes.forEach(m => { try { m.dispose(); } catch(e){} });
        this._meshes = [];
        this._generalNPCs = [];
    }

    // ── Environment ──────────────────────────────────────────────────────────

    _buildRoom() {
        const s = this.engine.scene;
        const add = m => { this._meshes.push(m); return m; };

        // Floor (marble-like)
        const floor = add(BABYLON.MeshBuilder.CreateGround('feastFloor', { width: 44, height: 30 }, s));
        const fMat = new BABYLON.StandardMaterial('feastFloorMat', s);
        fMat.diffuseColor  = new BABYLON.Color3(0.62, 0.50, 0.36);
        fMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        floor.material = fMat;
        floor.position = new BABYLON.Vector3(0, 0, 0);

        // Ceiling
        const ceil = add(BABYLON.MeshBuilder.CreateGround('feastCeil', { width: 44, height: 30 }, s));
        ceil.position = new BABYLON.Vector3(0, 7, 0);
        ceil.rotation.x = Math.PI;
        const cMat = fMat.clone('ceilMat');
        cMat.diffuseColor = new BABYLON.Color3(0.38, 0.28, 0.18);
        ceil.material = cMat;

        // Walls
        const wallDefs = [
            { w: 44, h: 7, pos: new BABYLON.Vector3(0, 3.5, -15), ry: 0 },   // north
            { w: 44, h: 7, pos: new BABYLON.Vector3(0, 3.5,  15), ry: Math.PI }, // south
            { w: 30, h: 7, pos: new BABYLON.Vector3(-22, 3.5, 0), ry: Math.PI / 2 },
            { w: 30, h: 7, pos: new BABYLON.Vector3( 22, 3.5, 0), ry: -Math.PI / 2 }
        ];
        const wMat = new BABYLON.StandardMaterial('wallMat', s);
        wMat.diffuseColor  = new BABYLON.Color3(0.52, 0.35, 0.20);
        wMat.emissiveColor = new BABYLON.Color3(0.06, 0.04, 0.02);
        wMat.backFaceCulling = false;
        wallDefs.forEach((d, i) => {
            const w = add(BABYLON.MeshBuilder.CreatePlane('wall' + i,
                { width: d.w, height: d.h }, s));
            w.position  = d.pos;
            w.rotation.y = d.ry;
            w.material  = wMat;
        });

        // Red lanterns on walls
        const lanternMat = new BABYLON.StandardMaterial('lanMat', s);
        lanternMat.diffuseColor  = new BABYLON.Color3(0.9, 0.1, 0.05);
        lanternMat.emissiveColor = new BABYLON.Color3(0.55, 0.08, 0.02);
        const lanternGlowMat = new BABYLON.StandardMaterial('lanGlowMat', s);
        lanternGlowMat.diffuseColor  = new BABYLON.Color3(1, 0.85, 0.3);
        lanternGlowMat.emissiveColor = new BABYLON.Color3(0.6, 0.4, 0.05);
        lanternGlowMat.alpha = 0.7;

        const lanternPositions = [
            new BABYLON.Vector3(-18, 5.5, -14), new BABYLON.Vector3(18, 5.5, -14),
            new BABYLON.Vector3(-18, 5.5,  14), new BABYLON.Vector3(18, 5.5,  14),
            new BABYLON.Vector3(0, 5.5, -14),   new BABYLON.Vector3(0, 5.5, 14)
        ];
        lanternPositions.forEach((pos, i) => {
            const body = add(BABYLON.MeshBuilder.CreateCylinder('lan_' + i,
                { diameterTop: 0.7, diameterBottom: 0.7, height: 1.2, tessellation: 10 }, s));
            body.position = pos;
            body.material = lanternMat;
            // Glow orb inside
            const glow = add(BABYLON.MeshBuilder.CreateSphere('lanGlow_' + i, { diameter: 0.5 }, s));
            glow.position = pos;
            glow.material = lanternGlowMat;
            // Point light
            const pl = new BABYLON.PointLight('lanLight_' + i, pos, s);
            pl.diffuse  = new BABYLON.Color3(1, 0.7, 0.3);
            pl.intensity = 1.2; pl.range = 12;
        });

        // Dragon pillars (left and right)
        const pillarMat = new BABYLON.StandardMaterial('pillarMat', s);
        pillarMat.diffuseColor  = new BABYLON.Color3(0.6, 0.15, 0.05);
        pillarMat.emissiveColor = new BABYLON.Color3(0.12, 0.03, 0.01);
        [[-15, 0, -8], [-15, 0, 8], [15, 0, -8], [15, 0, 8]].forEach(([x, y, z], i) => {
            const pillar = add(BABYLON.MeshBuilder.CreateCylinder('pillar' + i,
                { diameter: 1.2, height: 7, tessellation: 10 }, s));
            pillar.position = new BABYLON.Vector3(x, 3.5, z);
            pillar.material = pillarMat;
        });

        // Throne / emperor chair at north end
        this._buildChair(new BABYLON.Vector3(0, 0, -11), 0, true);

        // Dim the scene ambient for indoor feel
        this.engine.scene.ambientColor = new BABYLON.Color3(0.08, 0.05, 0.03);
    }

    _buildChair(pos, rotY, isThrone) {
        const s = this.engine.scene;
        const add = m => { this._meshes.push(m); return m; };
        const mat = new BABYLON.StandardMaterial('chairMat_' + pos.x, s);
        mat.diffuseColor  = isThrone ? new BABYLON.Color3(0.55, 0.4, 0.1) : new BABYLON.Color3(0.42, 0.28, 0.12);
        mat.emissiveColor = isThrone ? new BABYLON.Color3(0.12, 0.08, 0.02) : new BABYLON.Color3(0.04, 0.02, 0.01);

        const seat = add(BABYLON.MeshBuilder.CreateBox('seat_' + pos.x,
            { width: isThrone ? 2.2 : 1.6, height: 0.25, depth: 1.4 }, s));
        seat.position = new BABYLON.Vector3(pos.x, 0.8, pos.z);
        seat.rotation.y = rotY; seat.material = mat;

        const back = add(BABYLON.MeshBuilder.CreateBox('back_' + pos.x,
            { width: isThrone ? 2.2 : 1.6, height: isThrone ? 2.2 : 1.6, depth: 0.15 }, s));
        back.position = new BABYLON.Vector3(pos.x, isThrone ? 1.8 : 1.6, pos.z - 0.62);
        back.rotation.y = rotY; back.material = mat;
    }

    _buildTable() {
        const s = this.engine.scene;
        const add = m => { this._meshes.push(m); return m; };

        // Long banquet table
        const tMat = new BABYLON.StandardMaterial('tableMat', s);
        tMat.diffuseColor  = new BABYLON.Color3(0.48, 0.30, 0.12);
        tMat.specularColor = new BABYLON.Color3(0.35, 0.25, 0.1);

        const table = add(BABYLON.MeshBuilder.CreateBox('feastTable',
            { width: 22, height: 0.3, depth: 3.5 }, s));
        table.position = new BABYLON.Vector3(0, 0.9, 0);
        table.material = tMat;

        // Table legs
        [[-10, 0, -1.5], [-10, 0, 1.5], [10, 0, -1.5], [10, 0, 1.5]].forEach(([x, y, z], i) => {
            const leg = add(BABYLON.MeshBuilder.CreateBox('tLeg' + i,
                { width: 0.3, height: 0.9, depth: 0.3 }, s));
            leg.position = new BABYLON.Vector3(x, 0.45, z);
            leg.material = tMat;
        });

        // Red tablecloth
        const cloth = add(BABYLON.MeshBuilder.CreateBox('cloth',
            { width: 22.2, height: 0.05, depth: 3.6 }, s));
        cloth.position = new BABYLON.Vector3(0, 1.06, 0);
        const cMat = new BABYLON.StandardMaterial('clothMat', s);
        cMat.diffuseColor  = new BABYLON.Color3(0.7, 0.08, 0.06);
        cMat.emissiveColor = new BABYLON.Color3(0.1, 0.01, 0.01);
        cloth.material = cMat;

        // Wine cups (small red cylinders at each seat position)
        const cupMat = new BABYLON.StandardMaterial('cupMat', s);
        cupMat.diffuseColor  = new BABYLON.Color3(0.8, 0.72, 0.3);
        cupMat.emissiveColor = new BABYLON.Color3(0.15, 0.12, 0.03);
        const generalXPositions = [-8, -4, 0, 4, 8];
        generalXPositions.forEach(x => {
            [-1.2, 1.2].forEach(z => {
                const cup = add(BABYLON.MeshBuilder.CreateCylinder('cup',
                    { diameterTop: 0.22, diameterBottom: 0.18, height: 0.35, tessellation: 8 }, s));
                cup.position = new BABYLON.Vector3(x, 1.22, z);
                cup.material = cupMat;
            });
        });

        // 赵匡胤 emperor cup
        const empCup = add(BABYLON.MeshBuilder.CreateCylinder('empCup',
            { diameterTop: 0.28, diameterBottom: 0.22, height: 0.4, tessellation: 8 }, s));
        empCup.position = new BABYLON.Vector3(0, 1.25, -0.5);
        empCup.material = cupMat;

        // Dishes (flat cylinders)
        const dishMat = new BABYLON.StandardMaterial('dishMat', s);
        dishMat.diffuseColor = new BABYLON.Color3(0.9, 0.85, 0.75);
        [[-6, 0.3], [0, 0.3], [6, 0.3]].forEach(([x, z]) => {
            const dish = add(BABYLON.MeshBuilder.CreateCylinder('dish',
                { diameter: 1.0, height: 0.08, tessellation: 12 }, s));
            dish.position = new BABYLON.Vector3(x, 1.1, z);
            dish.material = dishMat;
        });

        // 军印 seal on table (revealed at end)
        this._sealPileRoot = new BABYLON.TransformNode('sealPile', s);
        this._sealPileRoot.position = new BABYLON.Vector3(0, 1.15, 0.3);
    }

    _buildGenerals() {
        const s = this.engine.scene;
        const generalDefs = this.dlg.general_surrender;
        const xPositions   = [-8, -4, 0, 4, 8];
        const zSide        = -4.5; // north side of table — generals face south toward player

        const bodyColors = [
            new BABYLON.Color3(0.15, 0.25, 0.55),
            new BABYLON.Color3(0.55, 0.15, 0.15),
            new BABYLON.Color3(0.15, 0.45, 0.20),
            new BABYLON.Color3(0.45, 0.38, 0.08),
            new BABYLON.Color3(0.38, 0.12, 0.42)
        ];

        xPositions.forEach((x, i) => {
            const def  = generalDefs[i];
            const root = new BABYLON.TransformNode('gen_' + i, s);
            root.position = new BABYLON.Vector3(x, 0, zSide);
            root.rotation.y = Math.PI; // face south toward player
            this._meshes.push(root);

            // Body (armored box)
            const bMat = new BABYLON.StandardMaterial('genBodyMat' + i, s);
            bMat.diffuseColor  = bodyColors[i];
            bMat.emissiveColor = bodyColors[i].scale(0.15);

            const body = BABYLON.MeshBuilder.CreateBox('genBody' + i,
                { width: 0.7, height: 1.1, depth: 0.4 }, s);
            body.position.y = 1.2; body.parent = root; body.material = bMat;
            this._meshes.push(body);

            // Head
            const skinMat = new BABYLON.StandardMaterial('genSkin' + i, s);
            skinMat.diffuseColor = new BABYLON.Color3(0.9, 0.75, 0.6);
            const head = BABYLON.MeshBuilder.CreateSphere('genHead' + i,
                { diameter: 0.45 }, s);
            head.position.y = 2.0; head.parent = root; head.material = skinMat;
            this._meshes.push(head);

            // Helmet
            const helMat = new BABYLON.StandardMaterial('helMat' + i, s);
            helMat.diffuseColor  = bodyColors[i].scale(0.8);
            helMat.emissiveColor = bodyColors[i].scale(0.2);
            const helm = BABYLON.MeshBuilder.CreateCylinder('genHelm' + i,
                { diameterTop: 0.15, diameterBottom: 0.48, height: 0.38, tessellation: 10 }, s);
            helm.position.y = 2.28; helm.parent = root; helm.material = helMat;
            this._meshes.push(helm);

            // 军印 (military seal) — small golden cube on table in front
            const sealMat = new BABYLON.StandardMaterial('sealMat' + i, s);
            sealMat.diffuseColor  = new BABYLON.Color3(0.9, 0.75, 0.2);
            sealMat.emissiveColor = new BABYLON.Color3(0.3, 0.22, 0.04);
            const seal = BABYLON.MeshBuilder.CreateBox('seal' + i,
                { width: 0.28, height: 0.18, depth: 0.28 }, s);
            seal.position = new BABYLON.Vector3(x, 1.18, zSide + 1.8); // on table, south of general
            seal.material = sealMat;
            this._meshes.push(seal);

            // Name label
            const labelTex = new BABYLON.DynamicTexture('genLabel' + i,
                { width: 200, height: 80 }, s);
            const ctx = labelTex.getContext();
            ctx.fillStyle = 'transparent';
            ctx.clearRect(0, 0, 200, 80);
            labelTex.update();
            const ctx2 = labelTex.getContext();
            ctx2.font = 'bold 22px "Microsoft YaHei", sans-serif';
            ctx2.fillStyle = '#ffdd88';
            ctx2.fillText(def.name, 10, 28);
            ctx2.font = '14px sans-serif';
            ctx2.fillStyle = '#aabbcc';
            ctx2.fillText(def.title, 10, 52);
            labelTex.update();

            const labelPlane = BABYLON.MeshBuilder.CreatePlane('genLabel' + i,
                { width: 1.6, height: 0.65 }, s);
            labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
            const lMat = new BABYLON.StandardMaterial('genLMat' + i, s);
            lMat.diffuseTexture = labelTex;
            lMat.emissiveColor  = new BABYLON.Color3(1, 1, 1);
            lMat.alpha = 0.9;
            lMat.backFaceCulling = false;
            labelPlane.material = lMat;
            labelPlane.position = new BABYLON.Vector3(x, 2.7, zSide + 0.4); // slightly south so player sees it
            this._meshes.push(labelPlane);

            // Chair for this general — behind them on north side
            this._buildChair(new BABYLON.Vector3(x, 0, zSide - 0.9), 0, false);

            this._generalNPCs.push({ root, head, body, seal, labelPlane, def, alive: true });
        });

        // 赵匡胤 at north end of table
        this._buildZhao();
    }

    _buildZhao() {
        const s = this.engine.scene;
        const zhaoMat = new BABYLON.StandardMaterial('zhaoFeastMat', s);
        zhaoMat.diffuseColor  = new BABYLON.Color3(0.65, 0.48, 0.12);
        zhaoMat.emissiveColor = new BABYLON.Color3(0.15, 0.10, 0.02);

        // Emperor at west head of table, facing east
        const root = new BABYLON.TransformNode('zhaoFeast', s);
        root.position = new BABYLON.Vector3(-13, 0, 0);
        root.rotation.y = Math.PI / 2; // face east (toward the table)
        this._meshes.push(root);
        // Throne chair behind him (further west)
        this._buildChair(new BABYLON.Vector3(-14.5, 0, 0), Math.PI / 2, true);

        const body = BABYLON.MeshBuilder.CreateBox('zhaoBody',
            { width: 0.75, height: 1.2, depth: 0.45 }, s);
        body.position.y = 1.25; body.parent = root; body.material = zhaoMat;
        this._meshes.push(body);

        const skinMat = new BABYLON.StandardMaterial('zhaoSkin', s);
        skinMat.diffuseColor = new BABYLON.Color3(0.9, 0.75, 0.6);
        const head = BABYLON.MeshBuilder.CreateSphere('zhaoHead',
            { diameter: 0.48 }, s);
        head.position.y = 2.05; head.parent = root; head.material = skinMat;
        this._meshes.push(head);

        // Crown (imperial)
        const crownMat = new BABYLON.StandardMaterial('crownMat', s);
        crownMat.diffuseColor  = new BABYLON.Color3(1, 0.85, 0.15);
        crownMat.emissiveColor = new BABYLON.Color3(0.5, 0.35, 0.05);
        const crown = BABYLON.MeshBuilder.CreateCylinder('zhaoCrown',
            { diameterTop: 0.5, diameterBottom: 0.45, height: 0.35, tessellation: 12 }, s);
        crown.position.y = 2.35; crown.parent = root; crown.material = crownMat;
        this._meshes.push(crown);
    }

    _positionPlayer() {
        const s = this.engine.scene;
        const add = m => { this._meshes.push(m); return m; };

        // Player sits at south side of table, facing north toward generals
        this.engine.player.mesh.position = new BABYLON.Vector3(0, 0.8, 5.5);
        this.engine.player.isLocked = true;

        // Player seat
        const seatMat = new BABYLON.StandardMaterial('playerSeatMat', s);
        seatMat.diffuseColor  = new BABYLON.Color3(0.55, 0.38, 0.15);
        seatMat.emissiveColor = new BABYLON.Color3(0.08, 0.05, 0.01);
        const pSeat = add(BABYLON.MeshBuilder.CreateBox('playerSeat',
            { width: 1.2, height: 0.2, depth: 1.0 }, s));
        pSeat.position = new BABYLON.Vector3(0, 0.7, 5.5);
        pSeat.material = seatMat;
        const pBack = add(BABYLON.MeshBuilder.CreateBox('playerBack',
            { width: 1.2, height: 1.3, depth: 0.14 }, s));
        pBack.position = new BABYLON.Vector3(0, 1.35, 6.15);
        pBack.material = seatMat;

        // Camera south of player, looking north toward generals
        if (this.engine.camera) {
            this.engine.camera.alpha  = Math.PI / 2; // camera to south
            this.engine.camera.beta   = Math.PI / 3.5;
            this.engine.camera.radius = 14;
        }
    }

    // ── Feast sequence ────────────────────────────────────────────────────────

    _runSequence() {
        this.engine.dialogueSystem.show(this.dlg.feast_open, () => {
            this._sprayGeneralChain(0);
        });
    }

    _sprayGeneralChain(idx) {
        if (idx >= this._generalNPCs.length) {
            this._allGeneralsGone();
            return;
        }
        // Player must click button to send 猫猫, then answer 3 words
        this._showSprayButton(idx, () => {
            this._teachWordsForGeneral(idx, () => {
                this._sprayGeneral(idx, () => {
                    setTimeout(() => this._sprayGeneralChain(idx + 1), 600);
                });
            });
        });
    }

    _showSprayButton(idx, onConfirm) {
        const g   = this._generalNPCs[idx];
        const def = g.def;
        const remaining = this._generalNPCs.length - idx;

        const panel = new BABYLON.GUI.Rectangle('sprayPanel_' + idx);
        panel.width = '340px'; panel.height = '110px';
        panel.background = 'rgba(10,5,20,0.94)';
        panel.cornerRadius = 14; panel.thickness = 2; panel.color = '#ffaa33';
        panel.verticalAlignment   = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.top = '-28px'; panel.isPointerBlocker = true;
        this.engine.ui.addControl(panel);

        const prompt = new BABYLON.GUI.TextBlock('sprayPrompt', `${def.name} 还没交出兵权！`);
        prompt.color = '#ffdd88'; prompt.fontSize = 15;
        prompt.fontFamily = '"Microsoft YaHei", serif';
        prompt.top = '-22px';
        panel.addControl(prompt);

        const btn = new BABYLON.GUI.Rectangle('sprayBtn_' + idx);
        btn.width = '240px'; btn.height = '38px'; btn.top = '22px';
        btn.background = 'rgba(180,80,10,0.7)';
        btn.cornerRadius = 10; btn.thickness = 2; btn.color = '#ffcc66';
        btn.isPointerBlocker = true;
        panel.addControl(btn);

        const btnTxt = new BABYLON.GUI.TextBlock();
        btnTxt.text = `🐱 让猫猫去喷 ${def.name}！`;
        btnTxt.color = '#fff8e0'; btnTxt.fontSize = 15;
        btnTxt.fontFamily = '"Microsoft YaHei", serif';
        btn.addControl(btnTxt);

        btn.onPointerEnterObservable.add(() => { btn.background = 'rgba(220,110,20,0.9)'; });
        btn.onPointerOutObservable.add(() => { btn.background = 'rgba(180,80,10,0.7)'; });
        btn.onPointerClickObservable.add(() => {
            this.engine.ui.removeControl(panel); panel.dispose();
            onConfirm();
        });
    }

    _pickWordsForGeneral(generalIdx) {
        const all = this.engine.learningSystem.words;
        if (!all || all.length === 0) return [];
        // Prefer unmastered words; offset each general by 3 slots
        const unmastered = all.filter(w =>
            this.engine.learningSystem.getWordState(w.id) !== 'mastered'
        );
        const pool = unmastered.length >= 3 ? unmastered : all;
        const start = (generalIdx * 3) % pool.length;
        const picked = [];
        for (let i = 0; i < 3; i++) {
            picked.push(pool[(start + i) % pool.length]);
        }
        return picked;
    }

    _teachWordsForGeneral(generalIdx, onAllCorrect) {
        const g     = this._generalNPCs[generalIdx];
        const words = this._pickWordsForGeneral(generalIdx);
        let wordIdx = 0;

        // Move 猫猫 beside this general while player learns
        const cat = this.engine.catCompanion;
        if (cat) cat.setPosition(new BABYLON.Vector3(g.root.position.x, 0.5, g.root.position.z - 1.5));

        // Counter badge: "猫猫充能 0/3"
        const badge = new BABYLON.GUI.Rectangle('genBadge_' + generalIdx);
        badge.width = '220px'; badge.height = '44px';
        badge.background = 'rgba(10,5,20,0.92)';
        badge.cornerRadius = 10; badge.thickness = 2; badge.color = '#ffaa33';
        badge.verticalAlignment   = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        badge.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        badge.top = '14px'; badge.isPointerBlocker = false;
        this.engine.ui.addControl(badge);

        const badgeTxt = new BABYLON.GUI.TextBlock('genBadgeTxt', '');
        badgeTxt.color = '#ffcc66'; badgeTxt.fontSize = 15;
        badgeTxt.fontFamily = '"Microsoft YaHei", serif';
        badge.addControl(badgeTxt);

        const updateBadge = (n) => {
            const dots = '●'.repeat(n) + '○'.repeat(3 - n);
            badgeTxt.text = `🐱 猫猫充能 ${dots}  ${g.def.name}`;
        };
        updateBadge(0);

        const showNextWord = () => {
            if (wordIdx >= words.length) {
                this.engine.ui.removeControl(badge); badge.dispose();
                onAllCorrect();
                return;
            }
            const word = words[wordIdx];
            const prompt = `让 ${g.def.name} 交出兵权！猫猫需要充能 (${wordIdx + 1}/3)`;
            this.engine.showWordChallenge(word, prompt, () => {
                wordIdx++;
                updateBadge(wordIdx);
                setTimeout(showNextWord, 400);
            });
        };
        showNextWord();
    }

    _sprayGeneral(idx, onDone) {
        const g   = this._generalNPCs[idx];
        const def = g.def;
        const s   = this.engine.scene;
        const cat = this.engine.catCompanion;

        // Move 猫猫 next to this general (animate by teleport for now)
        if (cat) {
            cat.setPosition(new BABYLON.Vector3(g.root.position.x, 0.5, g.root.position.z - 1.5));
        }

        // ① Spray particle burst (bright blue-white puff)
        setTimeout(() => {
            if (this.engine.particles) {
                this.engine.particles.burstAt(
                    new BABYLON.Vector3(g.root.position.x, 1.8, g.root.position.z - 0.5)
                );
            }
            // Screen flash (light blue for wine spray)
            const flash = new BABYLON.GUI.Rectangle('sprayFlash');
            flash.width = '100%'; flash.height = '100%';
            flash.background = 'rgba(180,220,255,0.35)';
            flash.thickness = 0; flash.isPointerBlocker = false;
            this.engine.ui.addControl(flash);
            let ft = 0;
            const fObs = s.onBeforeRenderObservable.add(() => {
                ft += s.getEngine().getDeltaTime() / 1000;
                flash.background = `rgba(180,220,255,${Math.max(0, 0.35 - ft * 1.5).toFixed(3)})`;
                if (ft >= 0.25) { s.onBeforeRenderObservable.remove(fObs); this.engine.ui.removeControl(flash); flash.dispose(); }
            });

            // ② Spray reaction dialogue bubble
            this._showSpeechBubble(
                new BABYLON.Vector3(g.root.position.x, 3.0, g.root.position.z),
                def.spray_reaction, '#aaddff', 1200, () => {

                    // ③ Thinking/surrender bubble
                    this._showSpeechBubble(
                        new BABYLON.Vector3(g.root.position.x, 3.0, g.root.position.z),
                        def.think, '#ffdd88', 2000, () => {

                            // ④ General places 军印 — animate seal sliding to center
                            this._surrenderSeal(idx, () => {

                                // ⑤ Farewell bubble, then general fades out
                                this._showSpeechBubble(
                                    new BABYLON.Vector3(g.root.position.x, 3.0, g.root.position.z),
                                    def.farewell, '#ccffcc', 1600, () => {
                                        this._fadeOutGeneral(idx, onDone);
                                    }
                                );
                            });
                        }
                    );
                }
            );
        }, 400);
    }

    _showSpeechBubble(worldPos, text, color, durationMs, onDone) {
        const bubble = new BABYLON.GUI.Rectangle('bubble_' + Date.now());
        bubble.adaptWidthToChildren = false;
        bubble.width = '320px'; bubble.height = '70px';
        bubble.background = 'rgba(10,8,20,0.88)';
        bubble.cornerRadius = 12; bubble.thickness = 2;
        bubble.color = color; bubble.isPointerBlocker = false;
        // Position at top-center area since we can't do 3D→screen easily without extra setup
        bubble.verticalAlignment   = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        bubble.top = '80px';
        this.engine.ui.addControl(bubble);

        const tb = new BABYLON.GUI.TextBlock('bText', text);
        tb.color = color; tb.fontSize = 14;
        tb.fontFamily = '"Microsoft YaHei", serif';
        tb.textWrapping = true; tb.paddingLeft = '10px'; tb.paddingRight = '10px';
        bubble.addControl(tb);

        // TTS
        if (window.speechSynthesis && text.match(/[\u4e00-\u9fff]/)) {
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'zh-CN'; u.rate = 0.9;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(u);
        }

        setTimeout(() => {
            this.engine.ui.removeControl(bubble);
            bubble.dispose();
            onDone();
        }, durationMs);
    }

    _surrenderSeal(idx, onDone) {
        const g    = this._generalNPCs[idx];
        const seal = g.seal;
        const s    = this.engine.scene;
        const target = new BABYLON.Vector3(idx * 0.4 - 0.8, 1.18, -0.3); // pile in center of table
        let t = 0;
        const startPos = seal.position.clone();
        const obs = s.onBeforeRenderObservable.add(() => {
            t += s.getEngine().getDeltaTime() / 1000;
            const p = Math.min(1, t / 0.8);
            seal.position = BABYLON.Vector3.Lerp(startPos, target, p);
            seal.position.y = startPos.y + Math.sin(p * Math.PI) * 0.6; // arc
            if (p >= 1) {
                s.onBeforeRenderObservable.remove(obs);
                onDone();
            }
        });
    }

    _fadeOutGeneral(idx, onDone) {
        const g = this._generalNPCs[idx];
        const s = this.engine.scene;
        let t = 0;
        const meshes = [g.root, g.labelPlane].filter(Boolean);
        const allChildMeshes = g.root.getChildMeshes ? g.root.getChildMeshes() : [];

        const obs = s.onBeforeRenderObservable.add(() => {
            t += s.getEngine().getDeltaTime() / 1000;
            const a = Math.max(0, 1 - t / 0.7);
            allChildMeshes.forEach(m => { if (m.material) m.material.alpha = a; });
            if (g.labelPlane && g.labelPlane.material) g.labelPlane.material.alpha = a;
            if (t >= 0.7) {
                s.onBeforeRenderObservable.remove(obs);
                g.root.setEnabled(false);
                if (g.labelPlane) g.labelPlane.setEnabled(false);
                g.alive = false;
                onDone();
            }
        });
    }

    _allGeneralsGone() {
        // 军印 pile is visible on table (seals slid there)
        // Show feast_end dialogue, then suggest_exam
        setTimeout(() => {
            this.engine.dialogueSystem.show(this.dlg.feast_end, () => {
                this.engine.dialogueSystem.show(this.dlg.suggest_exam, () => {
                    this._onDone();
                });
            });
        }, 800);
    }
}
