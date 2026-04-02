/**
 * CollectibleManager - 3D glowing orbs for vocabulary words and story scrolls
 */
class CollectibleManager {
    constructor(scene, learningSystem, particles) {
        this.scene = scene;
        this.learningSystem = learningSystem;
        this.particles = particles;
        this.wordOrbs = [];
        this.storyOrbs = [];
        this.nearestItem = null;
        this.promptMesh = null;
        this.interactCallback = null;
        this._time = 0;

        // Category colors
        this.categoryColors = {
            'food':       new BABYLON.Color3(1, 0.5, 0.2),
            'place':      new BABYLON.Color3(0.3, 0.7, 1),
            'person':     new BABYLON.Color3(0.7, 0.5, 1),
            'object':     new BABYLON.Color3(0.5, 1, 0.5),
            'action':     new BABYLON.Color3(1, 0.5, 0.8),
            'art':        new BABYLON.Color3(1, 0.7, 0.3),
            'historical': new BABYLON.Color3(1, 0.3, 0.3)
        };
    }

    spawnAll() {
        this._clearAll();

        const areas = this.learningSystem.config.areas;
        const areaLength = 180 / areas.length;

        areas.forEach((area, areaIndex) => {
            if (!this.learningSystem.isAreaUnlocked(area.id)) return;

            const zStart = -90 + areaIndex * areaLength;

            // Word collectibles
            const areaWords = this.learningSystem.getWordsForArea(area.id);
            areaWords.forEach((word, wordIndex) => {
                if (this.learningSystem.isWordCollected(word.id)) return;

                const spacing = areaLength / (areaWords.length + 2);
                const z = zStart + spacing * (wordIndex + 1);
                const side = wordIndex % 2 === 0 ? -1 : 1;
                const x = side * (2 + Math.random() * 3);
                const y = 2 + Math.random() * 4;

                const orb = this._createWordOrb(word, x, y, z);
                this.wordOrbs.push(orb);
            });

            // Story scrolls
            const areaStories = this.learningSystem.getStoriesForArea(area.id);
            areaStories.forEach((story, storyIndex) => {
                if (this.learningSystem.completedStories.has(story.id)) return;

                const z = zStart + areaLength / 2 + storyIndex * 5;
                const x = (storyIndex % 2 === 0 ? 1 : -1) * 1.5;
                const y = 3 + Math.random() * 2;

                const orb = this._createStoryOrb(story, x, y, z);
                this.storyOrbs.push(orb);
            });
        });
    }

    _createWordOrb(word, x, y, z) {
        const s = this.scene;
        const color = this.categoryColors[word.category] || new BABYLON.Color3(1, 1, 1);

        // Main orb (larger for visibility)
        const orb = BABYLON.MeshBuilder.CreateSphere(`word_${word.id}`, {
            diameter: 1.0, segments: 12
        }, s);
        orb.position = new BABYLON.Vector3(x, y, z);

        const mat = new BABYLON.PBRMaterial(`wordMat_${word.id}`, s);
        mat.albedoColor = color;
        mat.emissiveColor = color.scale(0.7);
        mat.roughness = 0.3;
        mat.metallic = 0.2;
        orb.material = mat;

        // Outer glow shell
        const glow = BABYLON.MeshBuilder.CreateSphere(`wordGlow_${word.id}`, {
            diameter: 2.0, segments: 8
        }, s);
        glow.parent = orb;
        const glowMat = new BABYLON.PBRMaterial(`wordGlowMat_${word.id}`, s);
        glowMat.albedoColor = color;
        glowMat.emissiveColor = color.scale(0.4);
        glowMat.alpha = 0.12;
        glowMat.roughness = 1;
        glowMat.backFaceCulling = false;
        glow.material = glowMat;

        // Point light (brighter)
        const light = new BABYLON.PointLight(`wordLight_${word.id}`,
            BABYLON.Vector3.Zero(), s);
        light.parent = orb;
        light.intensity = 0.8;
        light.diffuse = color;
        light.range = 8;

        // Floating label showing Chinese character
        const labelPlane = BABYLON.MeshBuilder.CreatePlane(`wordLabel_${word.id}`, {
            width: 2, height: 0.6
        }, s);
        labelPlane.position = new BABYLON.Vector3(0, 1.2, 0);
        labelPlane.parent = orb;
        labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const labelTex = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(labelPlane, 128, 40);
        const labelText = new BABYLON.GUI.TextBlock();
        labelText.text = word.characters;
        labelText.color = '#ffffff';
        labelText.fontSize = 28;
        labelText.fontFamily = '"Microsoft YaHei", serif';
        labelText.outlineColor = '#000000';
        labelText.outlineWidth = 2;
        labelTex.addControl(labelText);
        orb._labelPlane = labelPlane;

        // Spinning sparkle ring
        const ring = BABYLON.MeshBuilder.CreateTorus(`wordRing_${word.id}`, {
            diameter: 1.6, thickness: 0.04, tessellation: 24
        }, s);
        ring.parent = orb;
        ring.rotation.x = Math.PI / 3;
        const ringMat = new BABYLON.PBRMaterial(`wordRingMat_${word.id}`, s);
        ringMat.albedoColor = color;
        ringMat.emissiveColor = color.scale(0.8);
        ringMat.roughness = 0.2;
        ringMat.metallic = 0.5;
        ring.material = ringMat;
        orb._ring = ring;

        // Store data
        orb._wordData = word;
        orb._itemType = 'word';
        orb._baseY = y;
        orb._glowMesh = glow;
        orb._light = light;
        orb._phaseOffset = Math.random() * Math.PI * 2;

        return orb;
    }

    _createStoryOrb(story, x, y, z) {
        const s = this.scene;
        const color = new BABYLON.Color3(0.9, 0.7, 0.3);

        // Scroll-like shape (cylinder)
        const scroll = BABYLON.MeshBuilder.CreateCylinder(`story_${story.id}`, {
            diameter: 0.5, height: 0.8, tessellation: 8
        }, s);
        scroll.position = new BABYLON.Vector3(x, y, z);
        scroll.rotation.z = Math.PI / 2;

        const mat = new BABYLON.PBRMaterial(`storyMat_${story.id}`, s);
        mat.albedoColor = color;
        mat.emissiveColor = color.scale(0.5);
        mat.roughness = 0.4;
        mat.metallic = 0.1;
        scroll.material = mat;

        // Glow
        const glow = BABYLON.MeshBuilder.CreateSphere(`storyGlow_${story.id}`, {
            diameter: 1.5, segments: 8
        }, s);
        glow.parent = scroll;
        const glowMat = new BABYLON.PBRMaterial(`storyGlowMat_${story.id}`, s);
        glowMat.albedoColor = color;
        glowMat.emissiveColor = color.scale(0.3);
        glowMat.alpha = 0.1;
        glowMat.roughness = 1;
        glowMat.backFaceCulling = false;
        glow.material = glowMat;

        // Light
        const light = new BABYLON.PointLight(`storyLight_${story.id}`,
            BABYLON.Vector3.Zero(), s);
        light.parent = scroll;
        light.intensity = 0.3;
        light.diffuse = color;
        light.range = 4;

        scroll._storyData = story;
        scroll._itemType = 'story';
        scroll._baseY = y;
        scroll._glowMesh = glow;
        scroll._light = light;
        scroll._phaseOffset = Math.random() * Math.PI * 2;

        return scroll;
    }

    update(dt, playerPos) {
        this._time += dt;

        // Bob all orbs
        const allOrbs = [...this.wordOrbs, ...this.storyOrbs];
        allOrbs.forEach(orb => {
            if (orb.isDisposed()) return;
            orb.position.y = orb._baseY + Math.sin(this._time * 2 + orb._phaseOffset) * 0.3;
            // Slow rotation
            orb.rotation.y += dt * 0.5;
            // Pulse glow
            if (orb._glowMesh) {
                const pulse = 1 + Math.sin(this._time * 3 + orb._phaseOffset) * 0.15;
                orb._glowMesh.scaling.setAll(pulse);
            }
            // Spin ring
            if (orb._ring) {
                orb._ring.rotation.y += dt * 2;
                orb._ring.rotation.z = Math.sin(this._time * 1.5 + orb._phaseOffset) * 0.3;
            }
        });

        // Proximity check
        this._checkProximity(playerPos);
    }

    _checkProximity(playerPos) {
        let nearest = null;
        let nearestDist = 8; // interaction range

        const allOrbs = [...this.wordOrbs, ...this.storyOrbs];
        allOrbs.forEach(orb => {
            if (orb.isDisposed()) return;
            const dist = BABYLON.Vector3.Distance(playerPos, orb.position);
            if (dist < nearestDist) {
                nearest = orb;
                nearestDist = dist;
            }
        });

        if (nearest !== this.nearestItem) {
            this._removePrompt();
            if (nearest) {
                this._showPrompt(nearest);
            }
            this.nearestItem = nearest;
        }
    }

    _showPrompt(orb) {
        const label = orb._itemType === 'word'
            ? orb._wordData.characters
            : '📜 ' + orb._storyData.title;

        this.promptMesh = BABYLON.MeshBuilder.CreatePlane('prompt', {
            width: 4, height: 0.8
        }, this.scene);
        this.promptMesh.position = orb.position.clone();
        this.promptMesh.position.y += 2.2;
        this.promptMesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        const tex = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(this.promptMesh, 320, 64);

        // Background panel
        const bg = new BABYLON.GUI.Rectangle();
        bg.background = 'rgba(0,0,0,0.6)';
        bg.cornerRadius = 10;
        bg.thickness = 2;
        bg.color = '#ffd700';
        tex.addControl(bg);

        const text = new BABYLON.GUI.TextBlock();
        text.text = `⮞ Press E: ${label}`;
        text.color = '#ffd700';
        text.fontSize = 26;
        text.fontFamily = '"Microsoft YaHei", sans-serif';
        text.outlineColor = '#000000';
        text.outlineWidth = 2;
        bg.addControl(text);
    }

    _removePrompt() {
        if (this.promptMesh) {
            this.promptMesh.dispose();
            this.promptMesh = null;
        }
    }

    collectItem(orb) {
        if (!orb || orb.isDisposed()) return;

        // Sparkle effect
        if (this.particles) {
            this.particles.burstAt(orb.position.clone());
        }

        // Remove from arrays
        const wordIdx = this.wordOrbs.indexOf(orb);
        if (wordIdx > -1) this.wordOrbs.splice(wordIdx, 1);

        const storyIdx = this.storyOrbs.indexOf(orb);
        if (storyIdx > -1) this.storyOrbs.splice(storyIdx, 1);

        // Dispose mesh and children
        if (orb._light) orb._light.dispose();
        if (orb._glowMesh) orb._glowMesh.dispose();
        if (orb._labelPlane) orb._labelPlane.dispose();
        if (orb._ring) orb._ring.dispose();
        orb.dispose();

        this._removePrompt();
        this.nearestItem = null;
    }

    _clearAll() {
        [...this.wordOrbs, ...this.storyOrbs].forEach(orb => {
            if (orb._light) orb._light.dispose();
            if (orb._glowMesh) orb._glowMesh.dispose();
            if (orb._labelPlane) orb._labelPlane.dispose();
            if (orb._ring) orb._ring.dispose();
            if (!orb.isDisposed()) orb.dispose();
        });
        this.wordOrbs = [];
        this.storyOrbs = [];
        this._removePrompt();
    }

    respawn() {
        this._clearAll();
        this.spawnAll();
    }
}
