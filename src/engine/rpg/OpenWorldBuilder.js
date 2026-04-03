/**
 * OpenWorldBuilder - Builds the open 3D world with 6 kingdom cities
 */
class OpenWorldBuilder {
    constructor(scene, kingdoms) {
        this.scene = scene;
        this.kingdoms = kingdoms; // array from kingdoms.json
        this._cityMeshGroups = {}; // id -> array of meshes
        this._castles = {}; // id -> castle TransformNode
        this._pathMeshes = [];
    }

    build() {
        this._createTerrain();
        this._createSkybox();
        this._createFog();
        this._createRivers();
        this._createPaths();
        this.kingdoms.forEach(k => this._buildCity(k));
        this._createMountains();
        this._createAmbientDetails();
    }

    // ── Height function (multi-octave sin/cos pseudo-noise) ──────────────────
    _getHeight(x, z) {
        let h = 0;
        h += Math.sin(x * 0.013 + 0.3) * Math.cos(z * 0.011 + 0.7) * 5.5;
        h += Math.sin(x * 0.038 + 1.1) * Math.cos(z * 0.032 + 0.4) * 2.8;
        h += Math.sin(x * 0.075 + 2.0) * Math.cos(z * 0.068 + 1.8) * 1.2;
        h += Math.sin(x * 0.18  + 3.1) * Math.cos(z * 0.15  + 2.3) * 0.5;

        // Flatten near each kingdom (city platforms stay level)
        for (const k of this.kingdoms) {
            const d = Math.hypot(x - k.position.x, z - k.position.z);
            const flatRadius = k.isBase ? 35 : 28;
            const blendRange = 25;
            if (d < flatRadius) { h = 0; break; }
            if (d < flatRadius + blendRange) {
                h *= (d - flatRadius) / blendRange;
            }
        }
        return Math.max(0, h);
    }

    _createTerrain() {
        const subs = 100;
        const ground = BABYLON.MeshBuilder.CreateGround('ground', {
            width: 700, height: 700, subdivisions: subs
        }, this.scene);

        // Deform vertices
        const positions = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] = this._getHeight(positions[i], positions[i + 2]);
        }
        ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        const normals = [];
        BABYLON.VertexData.ComputeNormals(positions, ground.getIndices(), normals);
        ground.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);

        // Multi-zone ground material using a DynamicTexture
        const texSize = 1024;
        const tex = new BABYLON.DynamicTexture('groundTex', { width: texSize, height: texSize }, this.scene);
        const ctx = tex.getContext();
        // Base green
        ctx.fillStyle = '#384820';
        ctx.fillRect(0, 0, texSize, texSize);
        // Dirt patches
        const patchCount = 120;
        for (let i = 0; i < patchCount; i++) {
            const px = Math.random() * texSize, py = Math.random() * texSize;
            const r = 15 + Math.random() * 50;
            const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
            if (Math.random() < 0.4) {
                grad.addColorStop(0, 'rgba(90,65,30,0.5)');
                grad.addColorStop(1, 'rgba(90,65,30,0)');
            } else {
                grad.addColorStop(0, 'rgba(55,75,22,0.6)');
                grad.addColorStop(1, 'rgba(55,75,22,0)');
            }
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
        }
        tex.update();

        const mat = new BABYLON.StandardMaterial('groundMat', this.scene);
        mat.diffuseTexture = tex;
        mat.diffuseTexture.uScale = 8;
        mat.diffuseTexture.vScale = 8;
        mat.specularColor = BABYLON.Color3.Black();
        ground.material = mat;
        ground.receiveShadows = true;
        this._ground = ground;
    }

    _createMountains() {
        // Mountain cluster positions — away from all cities
        const clusterSeeds = [
            { x: -220, z: -180 }, { x: 240, z: -160 }, { x: -180, z: 220 },
            { x: 260, z: 180 }, { x: -260, z: 50 }, { x: 50, z: -240 },
            { x: 200, z: 260 }, { x: -240, z: -250 }
        ];

        const snowMat = new BABYLON.StandardMaterial('snowMat', this.scene);
        snowMat.diffuseColor = new BABYLON.Color3(0.92, 0.95, 1.0);
        snowMat.emissiveColor = new BABYLON.Color3(0.06, 0.06, 0.08);

        const rockMats = [0.42, 0.38, 0.35].map((b, i) => {
            const m = new BABYLON.StandardMaterial('rockMat' + i, this.scene);
            m.diffuseColor = new BABYLON.Color3(b, b * 0.95, b * 0.88);
            m.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
            return m;
        });

        clusterSeeds.forEach((seed, si) => {
            // Skip if too close to a city
            const tooClose = this.kingdoms.some(k =>
                Math.hypot(seed.x - k.position.x, seed.z - k.position.z) < 60
            );
            if (tooClose) return;

            const peakCount = 3 + Math.floor(Math.random() * 4);
            for (let p = 0; p < peakCount; p++) {
                const ox = seed.x + (Math.random() - 0.5) * 60;
                const oz = seed.z + (Math.random() - 0.5) * 60;
                const gy = this._getHeight(ox, oz);
                const h = 18 + Math.random() * 32;
                const w = 10 + Math.random() * 14;

                // Main peak (cone)
                const peak = BABYLON.MeshBuilder.CreateCylinder('mtn_' + si + '_' + p, {
                    diameterTop: 0.5, diameterBottom: w,
                    height: h, tessellation: 7
                }, this.scene);
                peak.position = new BABYLON.Vector3(ox, gy + h * 0.5, oz);
                peak.rotation.y = Math.random() * Math.PI;
                peak.material = rockMats[p % rockMats.length];

                // Snow cap
                const capH = h * 0.28;
                const cap = BABYLON.MeshBuilder.CreateCylinder('cap_' + si + '_' + p, {
                    diameterTop: 0.3, diameterBottom: w * 0.35,
                    height: capH, tessellation: 7
                }, this.scene);
                cap.position = new BABYLON.Vector3(ox, gy + h - capH * 0.3, oz);
                cap.rotation.y = peak.rotation.y;
                cap.material = snowMat;

                // Foothills (smaller cones around base)
                for (let f = 0; f < 3; f++) {
                    const fa = (f / 3) * Math.PI * 2 + si;
                    const fr = w * 0.5 + Math.random() * w * 0.4;
                    const fx = ox + Math.cos(fa) * fr;
                    const fz = oz + Math.sin(fa) * fr;
                    const fgy = this._getHeight(fx, fz);
                    const fh = h * (0.3 + Math.random() * 0.35);
                    const fw = w * (0.4 + Math.random() * 0.3);
                    const hill = BABYLON.MeshBuilder.CreateCylinder('hill_' + si + '_' + p + '_' + f, {
                        diameterTop: 0.4, diameterBottom: fw,
                        height: fh, tessellation: 6
                    }, this.scene);
                    hill.position = new BABYLON.Vector3(fx, fgy + fh * 0.5, fz);
                    hill.material = rockMats[(p + f) % rockMats.length];
                }
            }
        });
    }

    _createRivers() {
        const riverMat = new BABYLON.StandardMaterial('riverMat', this.scene);
        riverMat.diffuseColor = new BABYLON.Color3(0.18, 0.45, 0.72);
        riverMat.emissiveColor = new BABYLON.Color3(0.04, 0.12, 0.22);
        riverMat.alpha = 0.72;
        riverMat.specularColor = new BABYLON.Color3(0.6, 0.7, 0.8);
        riverMat.backFaceCulling = false;

        // Two rivers with winding paths
        const rivers = [
            // River 1: meanders from top-left to center-right
            [
                new BABYLON.Vector3(-300, 0.25, -200),
                new BABYLON.Vector3(-220, 0.25, -160),
                new BABYLON.Vector3(-160, 0.25, -80),
                new BABYLON.Vector3(-90,  0.25, -40),
                new BABYLON.Vector3(-20,  0.25,  20),
                new BABYLON.Vector3( 60,  0.25,  80),
                new BABYLON.Vector3(140,  0.25, 140),
                new BABYLON.Vector3(220,  0.25, 200)
            ],
            // River 2: from top-right down to bottom
            [
                new BABYLON.Vector3( 280, 0.25, -280),
                new BABYLON.Vector3( 200, 0.25, -180),
                new BABYLON.Vector3( 220, 0.25, -80),
                new BABYLON.Vector3( 180, 0.25,  10),
                new BABYLON.Vector3( 120, 0.25,  90),
                new BABYLON.Vector3(  60, 0.25, 190),
                new BABYLON.Vector3( -20, 0.25, 280)
            ]
        ];

        rivers.forEach((path, ri) => {
            // Skip segments that pass through city areas
            for (let i = 0; i < path.length - 1; i++) {
                const mid = path[i].add(path[i + 1]).scale(0.5);
                const tooClose = this.kingdoms.some(k =>
                    Math.hypot(mid.x - k.position.x, mid.z - k.position.z) < 32
                );
                if (tooClose) continue;

                const seg = BABYLON.MeshBuilder.CreateGround('river_' + ri + '_' + i, {
                    width: 12, height: path[i].subtract(path[i + 1]).length()
                }, this.scene);
                seg.material = riverMat;
                seg.position = mid;
                seg.position.y = 0.25;

                // Orient along path direction
                const dir = path[i + 1].subtract(path[i]);
                seg.rotation.y = Math.atan2(dir.x, dir.z);
            }
        });
    }

    _createSkybox() {
        BABYLON.Effect.ShadersStore['rpgSkyVertexShader'] = `
            precision highp float;
            attribute vec3 position;
            uniform mat4 worldViewProjection;
            varying vec3 vPos;
            void main() { gl_Position = worldViewProjection * vec4(position,1.0); vPos = position; }
        `;
        BABYLON.Effect.ShadersStore['rpgSkyFragmentShader'] = `
            precision highp float;
            varying vec3 vPos;
            void main() {
                float h = normalize(vPos).y;
                vec3 top = vec3(0.05, 0.04, 0.18);
                vec3 mid = vec3(0.15, 0.08, 0.28);
                vec3 hor = vec3(0.35, 0.18, 0.12);
                vec3 col = h > 0.0 ? mix(mid, top, h) : mix(mid, hor, -h * 2.0);
                float star = step(0.997, fract(sin(dot(vPos.xz * 60.0, vec2(12.98, 78.23))) * 43758.5));
                col += vec3(star * 0.7) * step(0.15, h);
                gl_FragColor = vec4(col, 1.0);
            }
        `;
        const skyMat = new BABYLON.ShaderMaterial('rpgSkyMat', this.scene, {
            vertex: 'rpgSky', fragment: 'rpgSky'
        }, { attributes: ['position'], uniforms: ['worldViewProjection'] });
        skyMat.backFaceCulling = false;
        const sky = BABYLON.MeshBuilder.CreateSphere('rpgSky', { diameter: 1200, segments: 12 }, this.scene);
        sky.material = skyMat;
        sky.infiniteDistance = true;
        sky.renderingGroupId = 0;
    }

    _createFog() {
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.004;
        this.scene.fogColor = new BABYLON.Color3(0.12, 0.08, 0.18);
    }

    _createPaths() {
        const base = this.kingdoms.find(k => k.isBase);
        if (!base) return;

        const pathMat = new BABYLON.StandardMaterial('pathMat', this.scene);
        pathMat.diffuseColor = new BABYLON.Color3(0.38, 0.32, 0.22);
        pathMat.specularColor = BABYLON.Color3.Black();

        this.kingdoms.filter(k => !k.isBase).forEach(k => {
            const from = new BABYLON.Vector3(base.position.x, 0.02, base.position.z);
            const to = new BABYLON.Vector3(k.position.x, 0.02, k.position.z);
            const dir = to.subtract(from);
            const len = dir.length();
            const mid = from.add(to).scale(0.5);

            const path = BABYLON.MeshBuilder.CreateGround('path_' + k.id, {
                width: 5, height: len
            }, this.scene);
            path.position = mid;
            path.position.y = 0.02;
            path.rotation.y = Math.atan2(dir.x, dir.z);
            path.material = pathMat;
            this._pathMeshes.push(path);
        });
    }

    _buildCity(kingdom) {
        const pos = new BABYLON.Vector3(kingdom.position.x, 0, kingdom.position.z);
        const col = new BABYLON.Color3(...kingdom.colorTheme);
        const meshes = [];

        // City wall (ring of pillars)
        const wallRadius = kingdom.isBase ? 28 : 22;
        const pillars = kingdom.isBase ? 12 : 8;
        for (let i = 0; i < pillars; i++) {
            const angle = (i / pillars) * Math.PI * 2;
            const px = pos.x + Math.cos(angle) * wallRadius;
            const pz = pos.z + Math.sin(angle) * wallRadius;
            const pillar = BABYLON.MeshBuilder.CreateBox('wall_' + kingdom.id + '_' + i, {
                width: 1.5, height: 6, depth: 1.5
            }, this.scene);
            pillar.position = new BABYLON.Vector3(px, 3, pz);
            const wMat = new BABYLON.StandardMaterial('wMat_' + kingdom.id + '_' + i, this.scene);
            wMat.diffuseColor = col.scale(0.7);
            wMat.emissiveColor = col.scale(0.05);
            pillar.material = wMat;
            meshes.push(pillar);
        }

        // Buildings cluster (6-10 buildings)
        const buildingCount = kingdom.isBase ? 10 : 6;
        for (let i = 0; i < buildingCount; i++) {
            const angle = (i / buildingCount) * Math.PI * 2 + 0.3;
            const r = 8 + Math.random() * 10;
            const bx = pos.x + Math.cos(angle) * r;
            const bz = pos.z + Math.sin(angle) * r;
            const bh = 3 + Math.random() * 5;
            const bw = 2.5 + Math.random() * 2;

            const building = BABYLON.MeshBuilder.CreateBox('bld_' + kingdom.id + '_' + i, {
                width: bw, height: bh, depth: bw
            }, this.scene);
            building.position = new BABYLON.Vector3(bx, bh / 2, bz);

            const bMat = new BABYLON.StandardMaterial('bMat_' + kingdom.id + '_' + i, this.scene);
            bMat.diffuseColor = col.scale(0.55 + Math.random() * 0.35);
            bMat.emissiveColor = col.scale(0.04);
            building.material = bMat;
            meshes.push(building);

            // Curved roof
            const roof = BABYLON.MeshBuilder.CreateCylinder('roof_' + kingdom.id + '_' + i, {
                diameterTop: 0.1, diameterBottom: bw * 1.4,
                height: bh * 0.45, tessellation: 6
            }, this.scene);
            roof.position = new BABYLON.Vector3(bx, bh + bh * 0.22, bz);
            const rMat = new BABYLON.StandardMaterial('rMat_' + kingdom.id + '_' + i, this.scene);
            rMat.diffuseColor = new BABYLON.Color3(0.18, 0.14, 0.08);
            rMat.emissiveColor = new BABYLON.Color3(0.02, 0.015, 0.01);
            roof.material = rMat;
            meshes.push(roof);
        }

        // Central castle / throne room
        const castle = this._buildCastle(kingdom, pos, col);
        this._castles[kingdom.id] = castle;
        meshes.push(castle);

        // City name sign
        this._buildCitySign(kingdom, pos);

        this._cityMeshGroups[kingdom.id] = meshes;
    }

    _buildCastle(kingdom, pos, col) {
        const root = new BABYLON.TransformNode('castle_' + kingdom.id, this.scene);
        root.position.copyFrom(pos);

        const castleMat = new BABYLON.StandardMaterial('castleMat_' + kingdom.id, this.scene);
        castleMat.diffuseColor = col;
        castleMat.emissiveColor = col.scale(0.18);
        castleMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

        const h = kingdom.isBase ? 14 : 10;
        const w = kingdom.isBase ? 10 : 7;

        const base = BABYLON.MeshBuilder.CreateBox('cBase_' + kingdom.id, {
            width: w, height: h * 0.6, depth: w
        }, this.scene);
        base.position.y = h * 0.3;
        base.material = castleMat;
        base.parent = root;

        const top = BABYLON.MeshBuilder.CreateBox('cTop_' + kingdom.id, {
            width: w * 0.75, height: h * 0.35, depth: w * 0.75
        }, this.scene);
        top.position.y = h * 0.775;
        top.material = castleMat;
        top.parent = root;

        // Pagoda roof tiers
        for (let tier = 0; tier < 3; tier++) {
            const tier3 = BABYLON.MeshBuilder.CreateCylinder('cRoof_' + kingdom.id + '_' + tier, {
                diameterTop: 0.2,
                diameterBottom: (w * 0.9) - tier * (w * 0.2),
                height: h * 0.15,
                tessellation: 6
            }, this.scene);
            tier3.position.y = h * 0.98 + tier * h * 0.18;
            const trMat = new BABYLON.StandardMaterial('trMat_' + kingdom.id + '_' + tier, this.scene);
            trMat.diffuseColor = new BABYLON.Color3(0.12, 0.08, 0.04);
            trMat.emissiveColor = new BABYLON.Color3(0.05, 0.03, 0.01);
            tier3.material = trMat;
            tier3.parent = root;
        }

        // Glow on top
        const spire = BABYLON.MeshBuilder.CreateSphere('cSpire_' + kingdom.id, { diameter: 1.2 }, this.scene);
        spire.position.y = h * 1.35;
        const spireMat = new BABYLON.StandardMaterial('spireMat_' + kingdom.id, this.scene);
        spireMat.diffuseColor = col;
        spireMat.emissiveColor = col.scale(0.8);
        spire.material = spireMat;
        spire.parent = root;

        return root;
    }

    _buildCitySign(kingdom, pos) {
        const plane = BABYLON.MeshBuilder.CreatePlane('sign_' + kingdom.id, { width: 5, height: 1.5 }, this.scene);
        plane.position = new BABYLON.Vector3(pos.x, 14, pos.z);
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;

        const tex = new BABYLON.DynamicTexture('signTex_' + kingdom.id, { width: 512, height: 128 }, this.scene);
        const ctx = tex.getContext();
        ctx.clearRect(0, 0, 512, 128);

        const col = kingdom.colorTheme;
        const hex = '#' + [0, 1, 2].map(i => Math.round(col[i] * 255).toString(16).padStart(2, '0')).join('');
        ctx.fillStyle = hex;
        ctx.font = 'bold 48px "Microsoft YaHei", serif';
        ctx.textAlign = 'center';
        ctx.fillText(kingdom.name || kingdom.city || kingdom.id, 256, 60);
        if (kingdom.city && kingdom.name !== kingdom.city) {
            ctx.font = '26px "Microsoft YaHei", serif';
            ctx.fillStyle = '#ddddcc';
            ctx.fillText(kingdom.city || '', 256, 100);
        }
        tex.update();

        const mat = new BABYLON.StandardMaterial('signMat_' + kingdom.id, this.scene);
        mat.diffuseTexture = tex;
        mat.useAlphaFromDiffuseTexture = true;
        mat.emissiveColor = BABYLON.Color3.White();
        mat.backFaceCulling = false;
        plane.material = mat;
    }

    _createAmbientDetails() {
        // Scatter trees / lanterns across the world
        const treeCount = 80;
        const treeMat = new BABYLON.StandardMaterial('treeMat', this.scene);
        treeMat.diffuseColor = new BABYLON.Color3(0.15, 0.38, 0.12);
        const trunkMat = new BABYLON.StandardMaterial('trunkMat', this.scene);
        trunkMat.diffuseColor = new BABYLON.Color3(0.3, 0.22, 0.12);

        for (let i = 0; i < treeCount; i++) {
            const tx = (Math.random() - 0.5) * 600;
            const tz = (Math.random() - 0.5) * 600;

            // Keep trees away from city centers
            const tooClose = this.kingdoms.some(k =>
                Math.hypot(tx - k.position.x, tz - k.position.z) < 35
            );
            if (tooClose) continue;

            const trunk = BABYLON.MeshBuilder.CreateCylinder('trunk_' + i, {
                height: 2.5 + Math.random() * 2,
                diameterTop: 0.25, diameterBottom: 0.4, tessellation: 6
            }, this.scene);
            trunk.position = new BABYLON.Vector3(tx, 1.5, tz);
            trunk.material = trunkMat;

            const canopy = BABYLON.MeshBuilder.CreateSphere('canopy_' + i, {
                diameter: 2.5 + Math.random() * 1.5, segments: 5
            }, this.scene);
            canopy.position = new BABYLON.Vector3(tx, 4.5 + Math.random(), tz);
            canopy.material = treeMat;
        }
    }

    getCastlePosition(kingdomId) {
        const castle = this._castles[kingdomId];
        return castle ? castle.position.clone() : BABYLON.Vector3.Zero();
    }

    hideCastle(kingdomId) {
        const castle = this._castles[kingdomId];
        if (castle) {
            castle.getChildMeshes().forEach(m => m.setEnabled(false));
        }
    }

    getNearbyKingdom(playerPos, radius = 40) {
        for (const k of this.kingdoms) {
            if (k.isBase) continue;
            const d = Math.hypot(
                playerPos.x - k.position.x,
                playerPos.z - k.position.z
            );
            if (d < radius) return k;
        }
        return null;
    }
}
