/**
 * CompanionNPC - A following NPC companion (used for 赵匡胤 and 猫猫)
 */
class CompanionNPC {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.name = options.name || 'companion';
        this.followOffset = options.followOffset || new BABYLON.Vector3(-2, 0, -2);
        this.followSpeed = options.followSpeed || 3.5;
        this.mesh = null;
        this.label = null;
        this._labelPlane = null;
        this._isVisible = true;
        this._type = options.type || 'human'; // 'human' | 'cat'
        this._color = options.color || new BABYLON.Color3(0.6, 0.4, 0.2);
        this._scale = options.scale || 1;
        this._bobPhase = Math.random() * Math.PI * 2;
        this._idleTimer = 0;
        this._idleState = 'walk'; // 'walk' | 'sit' | 'tail'
    }

    build() {
        if (this._type === 'cat') {
            this._buildCat();
        } else {
            this._buildHuman();
        }
        this._buildLabel();
        return this;
    }

    _buildHuman() {
        this.mesh = new BABYLON.TransformNode(this.name + '_root', this.scene);

        const mat = new BABYLON.StandardMaterial(this.name + '_mat', this.scene);
        mat.diffuseColor = this._color;
        mat.emissiveColor = this._color.scale(0.2);

        // Body
        const body = BABYLON.MeshBuilder.CreateCylinder(this.name + '_body', {
            height: 1.0, diameterTop: 0.55, diameterBottom: 0.65, tessellation: 8
        }, this.scene);
        body.position.y = 0.8;
        body.material = mat;
        body.parent = this.mesh;

        // Head
        const headMat = new BABYLON.StandardMaterial(this.name + '_headMat', this.scene);
        headMat.diffuseColor = new BABYLON.Color3(0.85, 0.7, 0.55);
        headMat.emissiveColor = new BABYLON.Color3(0.1, 0.08, 0.06);
        const head = BABYLON.MeshBuilder.CreateSphere(this.name + '_head', { diameter: 0.5 }, this.scene);
        head.position.y = 1.55;
        head.material = headMat;
        head.parent = this.mesh;

        // Helmet / hat (golden crown for 赵匡胤)
        const hatMat = new BABYLON.StandardMaterial(this.name + '_hatMat', this.scene);
        hatMat.diffuseColor = new BABYLON.Color3(0.85, 0.72, 0.1);
        hatMat.emissiveColor = new BABYLON.Color3(0.3, 0.25, 0.02);
        const hat = BABYLON.MeshBuilder.CreateCylinder(this.name + '_hat', {
            height: 0.3, diameterTop: 0.15, diameterBottom: 0.52, tessellation: 8
        }, this.scene);
        hat.position.y = 1.88;
        hat.material = hatMat;
        hat.parent = this.mesh;

        // Robe / skirt
        const robeMat = new BABYLON.StandardMaterial(this.name + '_robeMat', this.scene);
        robeMat.diffuseColor = new BABYLON.Color3(0.55, 0.25, 0.08);
        robeMat.emissiveColor = new BABYLON.Color3(0.05, 0.02, 0);
        const robe = BABYLON.MeshBuilder.CreateCylinder(this.name + '_robe', {
            height: 0.7, diameterTop: 0.65, diameterBottom: 0.9, tessellation: 8
        }, this.scene);
        robe.position.y = 0.35;
        robe.material = robeMat;
        robe.parent = this.mesh;

        this.mesh.scaling = new BABYLON.Vector3(this._scale, this._scale, this._scale);
    }

    _buildCat() {
        this.mesh = new BABYLON.TransformNode(this.name + '_root', this.scene);

        const mat = new BABYLON.StandardMaterial(this.name + '_mat', this.scene);
        mat.diffuseColor = new BABYLON.Color3(0.06, 0.06, 0.06);
        mat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.02);
        mat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

        const eyeMat = new BABYLON.StandardMaterial(this.name + '_eyeMat', this.scene);
        eyeMat.diffuseColor = new BABYLON.Color3(0.1, 0.9, 0.3);
        eyeMat.emissiveColor = new BABYLON.Color3(0.05, 0.5, 0.1);

        // Body
        const body = BABYLON.MeshBuilder.CreateSphere(this.name + '_body', {
            diameterX: 0.55, diameterY: 0.42, diameterZ: 0.68
        }, this.scene);
        body.position.y = 0.28;
        body.material = mat;
        body.parent = this.mesh;

        // Head
        const head = BABYLON.MeshBuilder.CreateSphere(this.name + '_head', { diameter: 0.38 }, this.scene);
        head.position.y = 0.6;
        head.position.z = 0.15;
        head.material = mat;
        head.parent = this.mesh;
        this._catHead = head;

        // Ears
        for (let side of [-1, 1]) {
            const ear = BABYLON.MeshBuilder.CreateCylinder(this.name + '_ear' + side, {
                height: 0.15, diameterTop: 0.01, diameterBottom: 0.12, tessellation: 4
            }, this.scene);
            ear.position.y = 0.78;
            ear.position.x = side * 0.13;
            ear.position.z = 0.15;
            ear.material = mat;
            ear.parent = this.mesh;
        }

        // Eyes
        for (let side of [-1, 1]) {
            const eye = BABYLON.MeshBuilder.CreateSphere(this.name + '_eye' + side, { diameter: 0.08 }, this.scene);
            eye.position.y = 0.62;
            eye.position.x = side * 0.1;
            eye.position.z = 0.3;
            eye.material = eyeMat;
            eye.parent = this.mesh;
        }

        // Tail
        this._tail = BABYLON.MeshBuilder.CreateTube(this.name + '_tail', {
            path: [
                new BABYLON.Vector3(0, 0.2, -0.3),
                new BABYLON.Vector3(-0.15, 0.35, -0.45),
                new BABYLON.Vector3(-0.25, 0.55, -0.38),
                new BABYLON.Vector3(-0.18, 0.7, -0.22)
            ],
            radius: 0.06,
            tessellation: 6
        }, this.scene);
        this._tail.material = mat;
        this._tail.parent = this.mesh;

        this.mesh.scaling = new BABYLON.Vector3(this._scale, this._scale, this._scale);
    }

    _buildLabel() {
        const plane = BABYLON.MeshBuilder.CreatePlane(this.name + '_label', { width: 1.8, height: 0.45 }, this.scene);
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
        if (this._type === 'cat') {
            plane.position.y = 1.2;
        } else {
            plane.position.y = 2.6;
        }
        plane.parent = this.mesh;

        const tex = new BABYLON.DynamicTexture(this.name + '_labelTex', { width: 256, height: 64 }, this.scene);
        const ctx = tex.getContext();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.clearRect(0, 0, 256, 64);
        ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 128, 40);
        tex.update();

        const labelMat = new BABYLON.StandardMaterial(this.name + '_labelMat', this.scene);
        labelMat.diffuseTexture = tex;
        labelMat.useAlphaFromDiffuseTexture = true;
        labelMat.emissiveColor = BABYLON.Color3.White();
        labelMat.backFaceCulling = false;
        plane.material = labelMat;
        this._labelPlane = plane;
    }

    setPosition(pos) {
        if (this.mesh) this.mesh.position.copyFrom(pos);
    }

    setVisible(v) {
        this._isVisible = v;
        if (this.mesh) this.mesh.setEnabled(v);
    }

    // Call every frame with player position and deltaTime
    update(targetPos, deltaTime) {
        if (!this.mesh || !this._isVisible) return;

        // Compute desired follow position
        const desired = targetPos.add(this.followOffset);
        desired.y = 0;

        const current = this.mesh.position;
        const diff = desired.subtract(current);
        const dist = diff.length();

        if (dist > 0.15) {
            const move = diff.normalize().scale(Math.min(this.followSpeed * deltaTime, dist));
            this.mesh.position.addInPlace(move);

            // Face movement direction
            const angle = Math.atan2(diff.x, diff.z);
            this.mesh.rotation.y = angle;
        }

        // Idle bob animation
        this._bobPhase += deltaTime * 3;
        const bob = Math.sin(this._bobPhase) * 0.04;
        this.mesh.position.y = bob;

        // Cat tail wag
        if (this._type === 'cat' && this._tail) {
            this._tail.rotation.y = Math.sin(this._bobPhase * 0.8) * 0.4;
        }
    }

    // Swallow animation: cat grows huge, "eats" the target position, shrinks back
    playSwallow(targetPos, onDone) {
        if (!this.mesh) return;

        const originalScale = this._scale;
        const originalPos = this.mesh.position.clone();
        let t = 0;
        const duration = 2.2;

        const anim = this.scene.onBeforeRenderObservable.add(() => {
            t += this.scene.getEngine().getDeltaTime() / 1000;
            const prog = t / duration;

            if (prog < 0.35) {
                // Grow
                const s = originalScale + (prog / 0.35) * 6;
                this.mesh.scaling.setAll(s);
            } else if (prog < 0.55) {
                // Lunge toward target
                const lp = (prog - 0.35) / 0.2;
                this.mesh.position = BABYLON.Vector3.Lerp(originalPos, targetPos, lp);
                this.mesh.scaling.setAll(originalScale + 6);
            } else if (prog < 0.75) {
                // Shrink back
                const sp = (prog - 0.55) / 0.2;
                const s = (originalScale + 6) * (1 - sp) + originalScale * sp;
                this.mesh.scaling.setAll(s);
                this.mesh.position = BABYLON.Vector3.Lerp(targetPos, originalPos, sp);
            } else if (prog < 1.0) {
                // Return to normal
                this.mesh.scaling.setAll(originalScale);
                this.mesh.position = BABYLON.Vector3.Lerp(targetPos, originalPos, (prog - 0.75) / 0.25);
            } else {
                this.mesh.scaling.setAll(originalScale);
                this.mesh.position.copyFrom(originalPos);
                this.scene.onBeforeRenderObservable.remove(anim);
                if (onDone) onDone();
            }
        });
    }

    dispose() {
        if (this.mesh) {
            this.mesh.getChildMeshes().forEach(m => m.dispose());
            this.mesh.dispose();
        }
        if (this._labelPlane) this._labelPlane.dispose();
    }
}
