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
        this._createGround();
        this._createSkybox();
        this._createFog();
        this._createPaths();
        this.kingdoms.forEach(k => this._buildCity(k));
        this._createAmbientDetails();
    }

    _createGround() {
        const ground = BABYLON.MeshBuilder.CreateGround('ground', {
            width: 700, height: 700, subdivisions: 30
        }, this.scene);
        const mat = new BABYLON.PBRMaterial('groundMat', this.scene);
        mat.albedoColor = new BABYLON.Color3(0.22, 0.28, 0.14);
        mat.roughness = 0.95;
        mat.metallic = 0;
        ground.material = mat;
        ground.receiveShadows = true;
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
