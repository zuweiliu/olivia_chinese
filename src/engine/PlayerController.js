/**
 * PlayerController - Flying fairy/spirit with 3D movement and controls
 */
class PlayerController {
    constructor(scene, canvas) {
        this.scene = scene;
        this.canvas = canvas;
        this.mesh = null;
        this.glowMesh = null;
        this.pointLight = null;
        this.velocity = BABYLON.Vector3.Zero();
        this.speed = 15;
        this.drag = 0.92;
        this.keys = {};
        this.isLocked = false;

        // World bounds
        this.bounds = {
            minX: -95, maxX: 95,
            minY: 1, maxY: 30,
            minZ: -95, maxZ: 95
        };

        this._createPlayer();
        this._setupInput();
    }

    _createPlayer() {
        const s = this.scene;

        // Root node (invisible transform parent)
        this.mesh = new BABYLON.TransformNode('player', s);
        this.mesh.position = new BABYLON.Vector3(0, 5, -70);

        // ========== MATERIALS ==========
        // Skin
        const skinMat = new BABYLON.PBRMaterial('skinMat', s);
        skinMat.albedoColor = new BABYLON.Color3(1, 0.88, 0.78);
        skinMat.roughness = 0.7;
        skinMat.metallic = 0;

        // Dress (deep red Song Dynasty silk)
        const dressMat = new BABYLON.PBRMaterial('dressMat', s);
        dressMat.albedoColor = new BABYLON.Color3(0.7, 0.12, 0.15);
        dressMat.emissiveColor = new BABYLON.Color3(0.15, 0.02, 0.03);
        dressMat.roughness = 0.4;
        dressMat.metallic = 0.1;

        // Sash / belt (gold)
        const sashMat = new BABYLON.PBRMaterial('sashMat', s);
        sashMat.albedoColor = new BABYLON.Color3(0.9, 0.75, 0.2);
        sashMat.emissiveColor = new BABYLON.Color3(0.3, 0.2, 0.05);
        sashMat.roughness = 0.3;
        sashMat.metallic = 0.3;

        // Hair (dark)
        const hairMat = new BABYLON.PBRMaterial('hairMat', s);
        hairMat.albedoColor = new BABYLON.Color3(0.08, 0.06, 0.05);
        hairMat.roughness = 0.6;
        hairMat.metallic = 0.1;

        // Hair ornament (gold)
        const ornamentMat = new BABYLON.PBRMaterial('ornamentMat', s);
        ornamentMat.albedoColor = new BABYLON.Color3(1, 0.85, 0.2);
        ornamentMat.emissiveColor = new BABYLON.Color3(0.5, 0.35, 0.05);
        ornamentMat.roughness = 0.2;
        ornamentMat.metallic = 0.6;

        // Sleeve / scarf (translucent white silk)
        const sleeveMat = new BABYLON.PBRMaterial('sleeveMat', s);
        sleeveMat.albedoColor = new BABYLON.Color3(1, 0.95, 0.9);
        sleeveMat.emissiveColor = new BABYLON.Color3(0.2, 0.15, 0.1);
        sleeveMat.roughness = 0.5;
        sleeveMat.metallic = 0;
        sleeveMat.alpha = 0.55;
        sleeveMat.backFaceCulling = false;

        // Eye
        const eyeMat = new BABYLON.StandardMaterial('eyeMat', s);
        eyeMat.diffuseColor = new BABYLON.Color3(0.1, 0.05, 0.02);

        // ========== HEAD ==========
        const head = BABYLON.MeshBuilder.CreateSphere('head', { diameter: 0.55, segments: 12 }, s);
        head.position.y = 1.55;
        head.parent = this.mesh;
        head.material = skinMat;

        // Eyes
        const eyeSize = 0.06;
        const leftEye = BABYLON.MeshBuilder.CreateSphere('lEye', { diameter: eyeSize }, s);
        leftEye.position = new BABYLON.Vector3(-0.1, 1.58, -0.24);
        leftEye.parent = this.mesh;
        leftEye.material = eyeMat;

        const rightEye = BABYLON.MeshBuilder.CreateSphere('rEye', { diameter: eyeSize }, s);
        rightEye.position = new BABYLON.Vector3(0.1, 1.58, -0.24);
        rightEye.parent = this.mesh;
        rightEye.material = eyeMat;

        // Blush (small pink spheres on cheeks)
        const blushMat = new BABYLON.PBRMaterial('blushMat', s);
        blushMat.albedoColor = new BABYLON.Color3(1, 0.6, 0.6);
        blushMat.emissiveColor = new BABYLON.Color3(0.3, 0.1, 0.1);
        blushMat.roughness = 0.8;
        blushMat.alpha = 0.4;

        const lBlush = BABYLON.MeshBuilder.CreateSphere('lBlush', { diameter: 0.1 }, s);
        lBlush.position = new BABYLON.Vector3(-0.18, 1.5, -0.2);
        lBlush.parent = this.mesh;
        lBlush.material = blushMat;

        const rBlush = lBlush.clone('rBlush');
        rBlush.position.x = 0.18;
        rBlush.parent = this.mesh;

        // ========== HAIR ==========
        // Main hair bun (Song Dynasty style updo)
        const hairBack = BABYLON.MeshBuilder.CreateSphere('hairBack', {
            diameter: 0.6, segments: 10
        }, s);
        hairBack.position = new BABYLON.Vector3(0, 1.65, 0.08);
        hairBack.scaling = new BABYLON.Vector3(1, 1.1, 0.9);
        hairBack.parent = this.mesh;
        hairBack.material = hairMat;

        // Top bun
        const bun = BABYLON.MeshBuilder.CreateSphere('bun', { diameter: 0.3, segments: 8 }, s);
        bun.position = new BABYLON.Vector3(0, 1.95, 0.02);
        bun.parent = this.mesh;
        bun.material = hairMat;

        // Hair sticks (gold ornaments)
        const stick1 = BABYLON.MeshBuilder.CreateCylinder('stick1', {
            diameter: 0.03, height: 0.5
        }, s);
        stick1.position = new BABYLON.Vector3(-0.12, 2.0, 0.02);
        stick1.rotation.z = 0.4;
        stick1.parent = this.mesh;
        stick1.material = ornamentMat;

        const stick2 = stick1.clone('stick2');
        stick2.position.x = 0.12;
        stick2.rotation.z = -0.4;
        stick2.parent = this.mesh;

        // Dangling ornament (small sphere on stick)
        const dangle = BABYLON.MeshBuilder.CreateSphere('dangle', { diameter: 0.06 }, s);
        dangle.position = new BABYLON.Vector3(-0.25, 1.85, 0.02);
        dangle.parent = this.mesh;
        dangle.material = ornamentMat;
        this._dangle = dangle;

        // Side hair strands
        const lStrand = BABYLON.MeshBuilder.CreateCylinder('lStrand', {
            diameterTop: 0.06, diameterBottom: 0.02, height: 0.5
        }, s);
        lStrand.position = new BABYLON.Vector3(-0.25, 1.35, 0.05);
        lStrand.parent = this.mesh;
        lStrand.material = hairMat;

        const rStrand = lStrand.clone('rStrand');
        rStrand.position.x = 0.25;
        rStrand.parent = this.mesh;

        // ========== TORSO ==========
        const torso = BABYLON.MeshBuilder.CreateCylinder('torso', {
            diameterTop: 0.35, diameterBottom: 0.3, height: 0.6, tessellation: 10
        }, s);
        torso.position.y = 1.0;
        torso.parent = this.mesh;
        torso.material = dressMat;

        // ========== DRESS (flowing skirt) ==========
        // Main skirt cone
        const skirt = BABYLON.MeshBuilder.CreateCylinder('skirt', {
            diameterTop: 0.3, diameterBottom: 1.0, height: 1.0, tessellation: 16
        }, s);
        skirt.position.y = 0.2;
        skirt.parent = this.mesh;
        skirt.material = dressMat;
        this._skirt = skirt;

        // Gold belt/sash at waist
        const belt = BABYLON.MeshBuilder.CreateTorus('belt', {
            diameter: 0.34, thickness: 0.04, tessellation: 16
        }, s);
        belt.position.y = 0.72;
        belt.parent = this.mesh;
        belt.material = sashMat;

        // Sash ribbons hanging down (2 flowing strips)
        const ribbon1 = BABYLON.MeshBuilder.CreatePlane('ribbon1', {
            width: 0.08, height: 0.7
        }, s);
        ribbon1.position = new BABYLON.Vector3(0.1, 0.4, -0.17);
        ribbon1.parent = this.mesh;
        ribbon1.material = sashMat;
        this._ribbon1 = ribbon1;

        const ribbon2 = ribbon1.clone('ribbon2');
        ribbon2.position.x = -0.05;
        ribbon2.parent = this.mesh;
        this._ribbon2 = ribbon2;

        // ========== ARMS + SLEEVES (wide flowing sleeves) ==========
        // Left arm
        const lArm = BABYLON.MeshBuilder.CreateCylinder('lArm', {
            diameterTop: 0.08, diameterBottom: 0.06, height: 0.45
        }, s);
        lArm.position = new BABYLON.Vector3(-0.28, 1.0, 0);
        lArm.rotation.z = 0.6;
        lArm.parent = this.mesh;
        lArm.material = skinMat;

        // Right arm
        const rArm = lArm.clone('rArm');
        rArm.position.x = 0.28;
        rArm.rotation.z = -0.6;
        rArm.parent = this.mesh;

        // Left flowing sleeve
        const lSleeve = BABYLON.MeshBuilder.CreateCylinder('lSleeve', {
            diameterTop: 0.12, diameterBottom: 0.4, height: 0.6, tessellation: 8
        }, s);
        lSleeve.position = new BABYLON.Vector3(-0.42, 0.7, 0);
        lSleeve.rotation.z = 0.5;
        lSleeve.parent = this.mesh;
        lSleeve.material = sleeveMat;
        this._lSleeve = lSleeve;

        // Right flowing sleeve
        const rSleeve = lSleeve.clone('rSleeve');
        rSleeve.position.x = 0.42;
        rSleeve.rotation.z = -0.5;
        rSleeve.parent = this.mesh;
        this._rSleeve = rSleeve;

        // ========== TRAILING SILK SCARVES ==========
        // Long flowing scarf that trails behind (like Sky game)
        this._scarfParts = [];
        const scarfLen = 8;
        for (let i = 0; i < scarfLen; i++) {
            const w = 0.2 - i * 0.015;
            const scarf = BABYLON.MeshBuilder.CreatePlane(`scarf_${i}`, {
                width: Math.max(w, 0.05), height: 0.3
            }, s);
            scarf.position = new BABYLON.Vector3(0, 0.5, 0.2 + i * 0.25);
            scarf.parent = this.mesh;
            scarf.material = sleeveMat;
            scarf.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
            this._scarfParts.push(scarf);
        }

        // ========== SKIRT TRAIL (extra flowing layers) ==========
        this._skirtTrails = [];
        for (let i = 0; i < 4; i++) {
            const trail = BABYLON.MeshBuilder.CreatePlane(`skirtTrail_${i}`, {
                width: 0.6 - i * 0.1, height: 0.5
            }, s);
            trail.position = new BABYLON.Vector3(
                (Math.random() - 0.5) * 0.3,
                -0.1 - i * 0.08,
                0.3 + i * 0.2
            );
            trail.parent = this.mesh;
            trail.material = dressMat;
            trail.material = i % 2 === 0 ? dressMat : sleeveMat;
            trail.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
            this._skirtTrails.push(trail);
        }

        // ========== GLOW AURA ==========
        this.glowMesh = BABYLON.MeshBuilder.CreateSphere('playerGlow', {
            diameter: 2.5, segments: 10
        }, s);
        this.glowMesh.position.y = 0.8;
        this.glowMesh.parent = this.mesh;

        const glowMat = new BABYLON.PBRMaterial('playerGlowMat', s);
        glowMat.albedoColor = new BABYLON.Color3(1, 0.85, 0.5);
        glowMat.emissiveColor = new BABYLON.Color3(0.6, 0.4, 0.1);
        glowMat.alpha = 0.08;
        glowMat.roughness = 1;
        glowMat.metallic = 0;
        glowMat.backFaceCulling = false;
        this.glowMesh.material = glowMat;

        // ========== LIGHT ==========
        this.pointLight = new BABYLON.PointLight('playerLight',
            new BABYLON.Vector3(0, 1, 0), s);
        this.pointLight.parent = this.mesh;
        this.pointLight.intensity = 1.2;
        this.pointLight.diffuse = new BABYLON.Color3(1, 0.9, 0.6);
        this.pointLight.range = 12;

        // Floating animation state
        this._floatTime = 0;
        this._baseY = this.mesh.position.y;
    }

    _setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            // Prevent space from scrolling
            if (e.code === 'Space') e.preventDefault();
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    update(dt) {
        if (this.isLocked) {
            this.velocity = BABYLON.Vector3.Zero();
            return;
        }

        const camera = this.scene.activeCamera;
        if (!camera) return;

        // Compute forward/right from actual camera-to-target direction
        // This works correctly regardless of camera rotation
        let forward = camera.target.subtract(camera.position);
        forward.y = 0;
        if (forward.length() < 0.01) forward = new BABYLON.Vector3(0, 0, 1);
        forward.normalize();
        // Right = forward rotated 90° clockwise around Y
        let right = new BABYLON.Vector3(forward.z, 0, -forward.x);
        right.normalize();

        // Movement input
        let moveDir = BABYLON.Vector3.Zero();

        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.addInPlace(forward);
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.subtractInPlace(forward);
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.subtractInPlace(right);
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.addInPlace(right);

        // Vertical
        if (this.keys['Space'] || this.keys['KeyQ']) {
            moveDir.y += 1;
        }
        if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
            moveDir.y -= 1;
        }

        if (moveDir.length() > 0) {
            moveDir.normalize();
            this.velocity.addInPlace(moveDir.scale(this.speed * dt));
        }

        // Apply drag
        this.velocity.scaleInPlace(this.drag);

        // Clamp velocity
        const maxSpeed = 20;
        if (this.velocity.length() > maxSpeed) {
            this.velocity.normalize().scaleInPlace(maxSpeed);
        }

        // Apply velocity
        this.mesh.position.addInPlace(this.velocity.scale(dt * 60));

        // Enforce bounds
        this.mesh.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.mesh.position.x));
        this.mesh.position.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.mesh.position.y));
        this.mesh.position.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.mesh.position.z));

        // Floating bob
        this._floatTime += dt;
        const bob = Math.sin(this._floatTime * 2) * 0.15;
        this.mesh.position.y += bob * dt * 2;

        // Gentle body sway
        const speed = this.velocity.length();
        const swayAmount = Math.min(speed * 0.02, 0.08);

        if (speed > 0.1) {
            // Lean slightly into movement
            const tiltX = -this.velocity.z * 0.04;
            const tiltZ = this.velocity.x * 0.04;
            this.mesh.rotation.x = BABYLON.Scalar.Lerp(this.mesh.rotation.x, tiltX, 0.08);
            this.mesh.rotation.z = BABYLON.Scalar.Lerp(this.mesh.rotation.z, tiltZ, 0.08);
        } else {
            this.mesh.rotation.x = BABYLON.Scalar.Lerp(this.mesh.rotation.x, 0, 0.03);
            this.mesh.rotation.z = BABYLON.Scalar.Lerp(this.mesh.rotation.z, 0, 0.03);
        }

        // Face movement direction (rotate around Y)
        if (speed > 0.3) {
            const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
            let current = this.mesh.rotation.y;
            // Smooth rotation
            let diff = targetAngle - current;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.mesh.rotation.y += diff * 0.08;
        }

        // ========== ANIMATE DRESS ==========
        const t = this._floatTime;
        const windStr = 0.08 + swayAmount;

        // Flowing sleeves sway
        if (this._lSleeve) {
            this._lSleeve.rotation.x = Math.sin(t * 2.5) * windStr * 2;
            this._lSleeve.rotation.z = 0.5 + Math.sin(t * 1.8) * windStr;
        }
        if (this._rSleeve) {
            this._rSleeve.rotation.x = Math.sin(t * 2.5 + 1) * windStr * 2;
            this._rSleeve.rotation.z = -0.5 - Math.sin(t * 1.8 + 1) * windStr;
        }

        // Sash ribbons flutter
        if (this._ribbon1) {
            this._ribbon1.rotation.x = Math.sin(t * 3) * 0.3;
            this._ribbon1.rotation.z = Math.sin(t * 2.2) * 0.15;
        }
        if (this._ribbon2) {
            this._ribbon2.rotation.x = Math.sin(t * 3 + 0.5) * 0.3;
            this._ribbon2.rotation.z = Math.sin(t * 2.2 + 0.5) * 0.15;
        }

        // Dangling hair ornament swings
        if (this._dangle) {
            this._dangle.position.x = -0.25 + Math.sin(t * 2) * 0.03;
            this._dangle.position.y = 1.85 + Math.sin(t * 3) * 0.02;
        }

        // Trailing scarves wave and follow behind
        if (this._scarfParts) {
            this._scarfParts.forEach((scarf, i) => {
                const delay = i * 0.4;
                const wave = Math.sin(t * 3 - delay) * (0.1 + i * 0.03);
                scarf.position.x = wave;
                scarf.position.y = 0.5 - i * 0.04 + Math.sin(t * 2 - delay) * 0.05;
                // Trail more when moving
                scarf.position.z = 0.2 + i * 0.25 + speed * i * 0.03;
            });
        }

        // Skirt trails wave
        if (this._skirtTrails) {
            this._skirtTrails.forEach((trail, i) => {
                const delay = i * 0.3;
                trail.rotation.x = Math.sin(t * 2.5 - delay) * 0.2;
                trail.position.z = 0.3 + i * 0.2 + speed * i * 0.02;
            });
        }

        // Skirt gentle sway
        if (this._skirt) {
            this._skirt.rotation.x = Math.sin(t * 1.5) * 0.03;
            this._skirt.rotation.z = Math.sin(t * 1.2) * 0.02;
        }

        // Pulse glow aura
        const pulse = 1 + Math.sin(t * 3) * 0.08;
        this.glowMesh.scaling.setAll(pulse);

        // Pulse light
        this.pointLight.intensity = 1.0 + Math.sin(t * 2.5) * 0.2;
    }
}
