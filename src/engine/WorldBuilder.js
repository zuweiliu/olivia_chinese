/**
 * WorldBuilder - Procedural Song Dynasty city from config data
 */
class WorldBuilder {
    constructor(scene, learningSystem) {
        this.scene = scene;
        this.learningSystem = learningSystem;
        this.areas = learningSystem.config.areas;
        this.areaLength = 180 / this.areas.length; // total world Z = 180
        this.currentAreaIndex = 0;
        this._areaNameTimeout = null;

        // Materials cache
        this._materials = {};
        this._createMaterials();
    }

    _createMaterials() {
        const s = this.scene;

        // Wall materials with different colors per area
        const wallColors = [
            [0.35, 0.25, 0.15], // dark wood
            [0.4, 0.3, 0.2],    // light wood
            [0.3, 0.2, 0.12],   // deep brown
            [0.45, 0.35, 0.25], // tan
        ];
        wallColors.forEach((c, i) => {
            const mat = new BABYLON.PBRMaterial(`wall${i}`, s);
            mat.albedoColor = new BABYLON.Color3(c[0], c[1], c[2]);
            mat.roughness = 0.85;
            mat.metallic = 0;
            this._materials[`wall${i}`] = mat;
        });

        // Roof material (dark red/brown)
        const roofMat = new BABYLON.PBRMaterial('roof', s);
        roofMat.albedoColor = new BABYLON.Color3(0.45, 0.15, 0.1);
        roofMat.roughness = 0.7;
        roofMat.metallic = 0;
        this._materials.roof = roofMat;

        // Red roof variant
        const redRoof = new BABYLON.PBRMaterial('redRoof', s);
        redRoof.albedoColor = new BABYLON.Color3(0.6, 0.12, 0.1);
        redRoof.roughness = 0.7;
        redRoof.metallic = 0;
        this._materials.redRoof = redRoof;

        // Window emissive
        const winMat = new BABYLON.PBRMaterial('window', s);
        winMat.albedoColor = new BABYLON.Color3(1, 0.9, 0.5);
        winMat.emissiveColor = new BABYLON.Color3(0.8, 0.6, 0.2);
        winMat.roughness = 0.5;
        winMat.metallic = 0;
        winMat.alpha = 0.7;
        this._materials.window = winMat;

        // Lantern
        const lanternMat = new BABYLON.PBRMaterial('lantern', s);
        lanternMat.albedoColor = new BABYLON.Color3(0.8, 0.15, 0.1);
        lanternMat.emissiveColor = new BABYLON.Color3(0.9, 0.3, 0.1);
        lanternMat.roughness = 0.6;
        lanternMat.metallic = 0;
        this._materials.lantern = lanternMat;

        // Tree trunk
        const trunkMat = new BABYLON.PBRMaterial('trunk', s);
        trunkMat.albedoColor = new BABYLON.Color3(0.3, 0.2, 0.1);
        trunkMat.roughness = 0.95;
        trunkMat.metallic = 0;
        this._materials.trunk = trunkMat;

        // Tree leaves
        const leavesMat = new BABYLON.PBRMaterial('leaves', s);
        leavesMat.albedoColor = new BABYLON.Color3(0.2, 0.45, 0.2);
        leavesMat.roughness = 0.9;
        leavesMat.metallic = 0;
        this._materials.leaves = leavesMat;

        // Gate/pillar
        const gateMat = new BABYLON.PBRMaterial('gate', s);
        gateMat.albedoColor = new BABYLON.Color3(0.6, 0.15, 0.1);
        gateMat.roughness = 0.7;
        gateMat.metallic = 0;
        this._materials.gate = gateMat;

        // Stone
        const stoneMat = new BABYLON.PBRMaterial('stone', s);
        stoneMat.albedoColor = new BABYLON.Color3(0.4, 0.38, 0.35);
        stoneMat.roughness = 0.95;
        stoneMat.metallic = 0;
        this._materials.stone = stoneMat;

        // Bridge
        const bridgeMat = new BABYLON.PBRMaterial('bridge', s);
        bridgeMat.albedoColor = new BABYLON.Color3(0.35, 0.3, 0.25);
        bridgeMat.roughness = 0.85;
        bridgeMat.metallic = 0;
        this._materials.bridge = bridgeMat;
    }

    buildCity() {
        this.areas.forEach((area, index) => {
            const zStart = -90 + index * this.areaLength;
            const zMid = zStart + this.areaLength / 2;

            // Gate between areas
            if (index > 0) {
                this._createGate(0, zStart, area);
            }

            // Buildings on both sides of the road
            this._createAreaBuildings(area, index, zStart);

            // Lanterns along the road
            this._createLanterns(zStart, this.areaLength);

            // Trees scattered
            this._createTrees(zStart, this.areaLength, index);

            // Bridge in some areas
            if (index === 1 || index === 4 || index === 6) {
                this._createBridge(zMid);
            }

            // Water features in certain areas
            if (index === 3 || index === 5) {
                this._createWaterFeature(zMid, index);
            }
        });
    }

    _createAreaBuildings(area, areaIndex, zStart) {
        const numBuildings = 4 + Math.floor(Math.random() * 3);
        const spacing = this.areaLength / (numBuildings + 1);

        for (let i = 0; i < numBuildings; i++) {
            const z = zStart + spacing * (i + 1) + (Math.random() - 0.5) * 3;
            const side = i % 2 === 0 ? -1 : 1;
            const x = side * (6 + Math.random() * 8);

            const buildingType = Math.random();
            if (buildingType < 0.3) {
                this._createPagoda(x, z, areaIndex);
            } else if (buildingType < 0.6) {
                this._createShop(x, z, areaIndex, side);
            } else {
                this._createHouse(x, z, areaIndex);
            }
        }
    }

    _createHouse(x, z, areaIndex) {
        const s = this.scene;
        const wallIdx = areaIndex % 4;
        const w = 3 + Math.random() * 2;
        const h = 2.5 + Math.random() * 1.5;
        const d = 3 + Math.random() * 2;

        // Walls
        const walls = BABYLON.MeshBuilder.CreateBox(`house_${x}_${z}`, {
            width: w, height: h, depth: d
        }, s);
        walls.position = new BABYLON.Vector3(x, h / 2, z);
        walls.material = this._materials[`wall${wallIdx}`];
        walls.receiveShadows = true;

        // Sloped roof
        const roof = BABYLON.MeshBuilder.CreateBox(`roof_${x}_${z}`, {
            width: w + 1, height: 0.3, depth: d + 1
        }, s);
        roof.position = new BABYLON.Vector3(x, h + 0.15, z);
        roof.scaling.y = 1;
        roof.material = this._materials.roof;

        // Roof ridge (triangular prism via extruded shape)
        const ridgeHeight = 1.2;
        const ridgeShape = [
            new BABYLON.Vector3(-w / 2 - 0.3, 0, 0),
            new BABYLON.Vector3(0, ridgeHeight, 0),
            new BABYLON.Vector3(w / 2 + 0.3, 0, 0)
        ];
        const ridge = BABYLON.MeshBuilder.ExtrudeShape(`ridge_${x}_${z}`, {
            shape: ridgeShape,
            path: [new BABYLON.Vector3(0, 0, -d / 2 - 0.3), new BABYLON.Vector3(0, 0, d / 2 + 0.3)],
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, s);
        ridge.position = new BABYLON.Vector3(x, h + 0.3, z);
        ridge.material = this._materials.roof;

        // Windows (emissive rectangles)
        const windowPlane = BABYLON.MeshBuilder.CreatePlane(`win_${x}_${z}`, {
            width: 0.6, height: 0.8
        }, s);
        windowPlane.position = new BABYLON.Vector3(x - w / 2 - 0.01, h * 0.6, z);
        windowPlane.rotation.y = Math.PI / 2;
        windowPlane.material = this._materials.window;

        const windowPlane2 = windowPlane.clone(`win2_${x}_${z}`);
        windowPlane2.position.x = x + w / 2 + 0.01;
        windowPlane2.rotation.y = -Math.PI / 2;
    }

    _createPagoda(x, z, areaIndex) {
        const s = this.scene;
        const floors = 2 + Math.floor(Math.random() * 2);
        const baseW = 3.5;
        const floorH = 2.5;

        for (let f = 0; f < floors; f++) {
            const scale = 1 - f * 0.15;
            const fw = baseW * scale;
            const y = f * floorH;

            // Floor walls
            const walls = BABYLON.MeshBuilder.CreateBox(`pagoda_${x}_${z}_f${f}`, {
                width: fw, height: floorH * 0.7, depth: fw
            }, s);
            walls.position = new BABYLON.Vector3(x, y + floorH * 0.35, z);
            walls.material = this._materials[`wall${areaIndex % 4}`];
            walls.receiveShadows = true;

            // Eave / roof overhang
            const eave = BABYLON.MeshBuilder.CreateBox(`eave_${x}_${z}_f${f}`, {
                width: fw + 1.2, height: 0.15, depth: fw + 1.2
            }, s);
            eave.position = new BABYLON.Vector3(x, y + floorH * 0.75, z);
            eave.material = this._materials.redRoof;
        }

        // Top spire
        const spire = BABYLON.MeshBuilder.CreateCylinder(`spire_${x}_${z}`, {
            diameterTop: 0, diameterBottom: 0.3, height: 1.5
        }, s);
        spire.position = new BABYLON.Vector3(x, floors * floorH + 0.75, z);
        spire.material = this._materials.gate;
    }

    _createShop(x, z, areaIndex, side) {
        const s = this.scene;
        const w = 3 + Math.random();
        const h = 2;
        const d = 2.5;

        // Walls
        const walls = BABYLON.MeshBuilder.CreateBox(`shop_${x}_${z}`, {
            width: w, height: h, depth: d
        }, s);
        walls.position = new BABYLON.Vector3(x, h / 2, z);
        walls.material = this._materials[`wall${(areaIndex + 1) % 4}`];
        walls.receiveShadows = true;

        // Flat awning towards road
        const awning = BABYLON.MeshBuilder.CreateBox(`awning_${x}_${z}`, {
            width: w + 0.5, height: 0.1, depth: 1.5
        }, s);
        awning.position = new BABYLON.Vector3(x + side * -1.2, h - 0.3, z);
        awning.material = this._materials.redRoof;

        // Display window
        const display = BABYLON.MeshBuilder.CreatePlane(`display_${x}_${z}`, {
            width: w * 0.7, height: h * 0.4
        }, s);
        display.position = new BABYLON.Vector3(x + side * -(w / 2 + 0.01), h * 0.5, z);
        display.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        display.material = this._materials.window;
    }

    _createGate(x, z, area) {
        const s = this.scene;
        const gateH = 5;
        const gateW = 6;

        // Left pillar
        const leftPillar = BABYLON.MeshBuilder.CreateBox(`gateL_${z}`, {
            width: 0.8, height: gateH, depth: 0.8
        }, s);
        leftPillar.position = new BABYLON.Vector3(x - gateW / 2, gateH / 2, z);
        leftPillar.material = this._materials.gate;

        // Right pillar
        const rightPillar = leftPillar.clone(`gateR_${z}`);
        rightPillar.position.x = x + gateW / 2;

        // Top beam
        const beam = BABYLON.MeshBuilder.CreateBox(`gateBeam_${z}`, {
            width: gateW + 1.5, height: 0.6, depth: 1.2
        }, s);
        beam.position = new BABYLON.Vector3(x, gateH, z);
        beam.material = this._materials.redRoof;

        // Second beam
        const beam2 = BABYLON.MeshBuilder.CreateBox(`gateBeam2_${z}`, {
            width: gateW + 0.5, height: 0.3, depth: 0.8
        }, s);
        beam2.position = new BABYLON.Vector3(x, gateH - 1, z);
        beam2.material = this._materials.gate;

        // Area name as 3D text plane
        const namePlane = BABYLON.MeshBuilder.CreatePlane(`gateName_${z}`, {
            width: 4, height: 1.2
        }, s);
        namePlane.position = new BABYLON.Vector3(x, gateH + 0.8, z);
        namePlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        const nameTex = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(namePlane, 256, 80);
        const nameText = new BABYLON.GUI.TextBlock();
        nameText.text = area.name;
        nameText.color = '#ffd700';
        nameText.fontSize = 40;
        nameText.fontFamily = '"Microsoft YaHei", "SimHei", serif';
        nameText.outlineColor = '#000000';
        nameText.outlineWidth = 3;
        nameTex.addControl(nameText);
    }

    _createLanterns(zStart, length) {
        const numLanterns = 8;
        const spacing = length / numLanterns;

        for (let i = 0; i < numLanterns; i++) {
            const z = zStart + spacing * (i + 0.5);
            const side = i % 2 === 0 ? -1 : 1;
            const x = side * 4;
            this._createSingleLantern(x, z);
        }
    }

    _createSingleLantern(x, z) {
        const s = this.scene;

        // Pole
        const pole = BABYLON.MeshBuilder.CreateCylinder(`pole_${x}_${z}`, {
            diameter: 0.1, height: 3.5
        }, s);
        pole.position = new BABYLON.Vector3(x, 1.75, z);
        pole.material = this._materials.trunk;

        // Lantern body
        const lantern = BABYLON.MeshBuilder.CreateCylinder(`lantern_${x}_${z}`, {
            diameterTop: 0.3, diameterBottom: 0.5, height: 0.8,
            tessellation: 8
        }, s);
        lantern.position = new BABYLON.Vector3(x, 3.7, z);
        lantern.material = this._materials.lantern;

        // Lantern light
        const light = new BABYLON.PointLight(`lanternLight_${x}_${z}`,
            new BABYLON.Vector3(x, 3.7, z), s);
        light.intensity = 0.6;
        light.diffuse = new BABYLON.Color3(1, 0.6, 0.2);
        light.range = 8;
    }

    _createTrees(zStart, length, areaIndex) {
        const numTrees = 3 + Math.floor(Math.random() * 3);

        for (let i = 0; i < numTrees; i++) {
            const z = zStart + Math.random() * length;
            const side = Math.random() > 0.5 ? -1 : 1;
            const x = side * (14 + Math.random() * 10);
            this._createSingleTree(x, z);
        }
    }

    _createSingleTree(x, z) {
        const s = this.scene;
        const h = 2 + Math.random() * 2;

        // Trunk
        const trunk = BABYLON.MeshBuilder.CreateCylinder(`trunk_${x}_${z}`, {
            diameterTop: 0.2, diameterBottom: 0.35, height: h
        }, s);
        trunk.position = new BABYLON.Vector3(x, h / 2, z);
        trunk.material = this._materials.trunk;

        // Canopy (multiple spheres for fullness)
        const canopyY = h + 0.5;
        const canopyR = 1.2 + Math.random() * 0.8;

        const canopy = BABYLON.MeshBuilder.CreateSphere(`canopy_${x}_${z}`, {
            diameter: canopyR * 2, segments: 8
        }, s);
        canopy.position = new BABYLON.Vector3(x, canopyY, z);
        canopy.material = this._materials.leaves;

        // Second smaller canopy offset
        const canopy2 = BABYLON.MeshBuilder.CreateSphere(`canopy2_${x}_${z}`, {
            diameter: canopyR * 1.3, segments: 8
        }, s);
        canopy2.position = new BABYLON.Vector3(x + 0.4, canopyY + 0.3, z + 0.3);
        canopy2.material = this._materials.leaves;
    }

    _createBridge(z) {
        const s = this.scene;

        // Bridge deck
        const deck = BABYLON.MeshBuilder.CreateBox('bridge_' + z, {
            width: 6, height: 0.3, depth: 3
        }, s);
        deck.position = new BABYLON.Vector3(0, 0.5, z);
        deck.material = this._materials.bridge;

        // Railings
        for (let side = -1; side <= 1; side += 2) {
            const rail = BABYLON.MeshBuilder.CreateBox(`rail_${z}_${side}`, {
                width: 0.15, height: 0.8, depth: 3
            }, s);
            rail.position = new BABYLON.Vector3(side * 2.8, 1, z);
            rail.material = this._materials.stone;
        }

        // Small water below
        const water = BABYLON.MeshBuilder.CreateGround(`water_${z}`, {
            width: 8, height: 5
        }, s);
        water.position = new BABYLON.Vector3(0, -0.1, z);
        const waterMat = new BABYLON.PBRMaterial(`waterMat_${z}`, s);
        waterMat.albedoColor = new BABYLON.Color3(0.1, 0.2, 0.4);
        waterMat.emissiveColor = new BABYLON.Color3(0.02, 0.05, 0.1);
        waterMat.roughness = 0.2;
        waterMat.metallic = 0.3;
        waterMat.alpha = 0.7;
        water.material = waterMat;
    }

    _createWaterFeature(z, areaIndex) {
        const s = this.scene;
        const side = areaIndex % 2 === 0 ? -1 : 1;
        const x = side * 12;

        // Small pond
        const pond = BABYLON.MeshBuilder.CreateDisc(`pond_${z}`, {
            radius: 3, tessellation: 16
        }, s);
        pond.position = new BABYLON.Vector3(x, 0.01, z);
        pond.rotation.x = Math.PI / 2;

        const pondMat = new BABYLON.PBRMaterial(`pondMat_${z}`, s);
        pondMat.albedoColor = new BABYLON.Color3(0.08, 0.15, 0.35);
        pondMat.emissiveColor = new BABYLON.Color3(0.01, 0.03, 0.08);
        pondMat.roughness = 0.15;
        pondMat.metallic = 0.4;
        pondMat.alpha = 0.8;
        pond.material = pondMat;
    }

    checkAreaTransition(playerPos, ui) {
        const areaIndex = Math.floor((playerPos.z + 90) / this.areaLength);
        const clampedIndex = Math.max(0, Math.min(areaIndex, this.areas.length - 1));

        if (clampedIndex !== this.currentAreaIndex) {
            const newArea = this.areas[clampedIndex];

            if (!this.learningSystem.isAreaUnlocked(newArea.id)) {
                // Push player back
                const boundary = -90 + clampedIndex * this.areaLength;
                if (clampedIndex > this.currentAreaIndex) {
                    playerPos.z = boundary - 0.5;
                } else {
                    playerPos.z = boundary + this.areaLength + 0.5;
                }
                if (ui) ui.showLockMessage(newArea.requiredLight);
                return;
            }

            this.currentAreaIndex = clampedIndex;
            if (ui) ui.showAreaName(newArea.name, newArea.nameEn);
        }
    }

    getAreaAtPosition(z) {
        const idx = Math.floor((z + 90) / this.areaLength);
        return this.areas[Math.max(0, Math.min(idx, this.areas.length - 1))];
    }
}
