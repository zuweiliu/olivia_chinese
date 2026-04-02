/**
 * ParticleEffects - Glow, trails, sparkles, ambient particles
 */
class ParticleEffects {
    constructor(scene) {
        this.scene = scene;
        this.ambientParticles = [];
        this._time = 0;
    }

    createAmbient() {
        // Floating light motes throughout the world
        for (let i = 0; i < 80; i++) {
            const mote = BABYLON.MeshBuilder.CreateSphere(`mote_${i}`, {
                diameter: 0.08 + Math.random() * 0.1, segments: 4
            }, this.scene);

            mote.position = new BABYLON.Vector3(
                (Math.random() - 0.5) * 160,
                1 + Math.random() * 15,
                (Math.random() - 0.5) * 160
            );

            const mat = new BABYLON.StandardMaterial(`moteMat_${i}`, this.scene);
            const colors = [
                new BABYLON.Color3(1, 0.85, 0.3),
                new BABYLON.Color3(1, 0.7, 0.4),
                new BABYLON.Color3(0.6, 0.8, 1),
                new BABYLON.Color3(1, 0.9, 0.6)
            ];
            const color = colors[Math.floor(Math.random() * colors.length)];
            mat.diffuseColor = color;
            mat.emissiveColor = color.scale(0.8);
            mat.alpha = 0.3 + Math.random() * 0.4;
            mote.material = mat;

            mote._vx = (Math.random() - 0.5) * 0.3;
            mote._vy = (Math.random() - 0.5) * 0.15;
            mote._vz = (Math.random() - 0.5) * 0.3;
            mote._baseAlpha = mat.alpha;
            mote._phase = Math.random() * Math.PI * 2;
            mote._mat = mat;

            this.ambientParticles.push(mote);
        }
    }

    update(dt) {
        this._time += dt;

        // Update ambient particles
        this.ambientParticles.forEach(mote => {
            if (mote.isDisposed()) return;

            mote.position.x += mote._vx * dt;
            mote.position.y += mote._vy * dt;
            mote.position.z += mote._vz * dt;

            // Wrap around world
            if (mote.position.x > 80) mote.position.x = -80;
            if (mote.position.x < -80) mote.position.x = 80;
            if (mote.position.z > 80) mote.position.z = -80;
            if (mote.position.z < -80) mote.position.z = 80;
            if (mote.position.y > 18) mote._vy = -Math.abs(mote._vy);
            if (mote.position.y < 1) mote._vy = Math.abs(mote._vy);

            // Pulse alpha
            mote._mat.alpha = mote._baseAlpha + Math.sin(this._time * 2 + mote._phase) * 0.15;
        });

        this._updateFireflies(dt);
    }

    burstAt(position) {
        // Sparkle burst effect at a position
        const count = 15;
        for (let i = 0; i < count; i++) {
            const spark = BABYLON.MeshBuilder.CreateSphere(`spark_${Date.now()}_${i}`, {
                diameter: 0.12 + Math.random() * 0.08, segments: 4
            }, this.scene);
            spark.position = position.clone();

            const colors = [
                new BABYLON.Color3(1, 0.85, 0),
                new BABYLON.Color3(1, 0.65, 0),
                new BABYLON.Color3(1, 1, 1),
                new BABYLON.Color3(1, 0.5, 0)
            ];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const mat = new BABYLON.StandardMaterial(`sparkMat_${i}`, this.scene);
            mat.diffuseColor = color;
            mat.emissiveColor = color;
            mat.alpha = 1;
            spark.material = mat;

            // Random velocity
            const angle = (i / count) * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const vx = Math.cos(angle) * speed;
            const vy = 1 + Math.random() * 3;
            const vz = Math.sin(angle) * speed;

            // Animate
            const startPos = position.clone();
            const anim = new BABYLON.Animation(`sparkAnim_${i}`, 'position',
                60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3);

            const keys = [
                { frame: 0, value: startPos },
                { frame: 30, value: new BABYLON.Vector3(
                    startPos.x + vx, startPos.y + vy, startPos.z + vz) }
            ];
            anim.setKeys(keys);
            spark.animations = [anim];

            // Alpha fade
            const fadeAnim = new BABYLON.Animation(`sparkFade_${i}`, 'material.alpha',
                60, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
            fadeAnim.setKeys([
                { frame: 0, value: 1 },
                { frame: 30, value: 0 }
            ]);
            spark.animations.push(fadeAnim);

            // Scale down
            const scaleAnim = new BABYLON.Animation(`sparkScale_${i}`, 'scaling',
                60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3);
            scaleAnim.setKeys([
                { frame: 0, value: new BABYLON.Vector3(1, 1, 1) },
                { frame: 30, value: new BABYLON.Vector3(0, 0, 0) }
            ]);
            spark.animations.push(scaleAnim);

            this.scene.beginAnimation(spark, 0, 30, false, 1, () => {
                spark.dispose();
                mat.dispose();
            });
        }
    }

    trailAt(position) {
        // Single trail particle behind the player
        const trail = BABYLON.MeshBuilder.CreateSphere(`trail_${Date.now()}`, {
            diameter: 0.15, segments: 4
        }, this.scene);
        trail.position = position.clone();
        trail.position.x += (Math.random() - 0.5) * 0.3;
        trail.position.z += (Math.random() - 0.5) * 0.3;

        const mat = new BABYLON.StandardMaterial('trailMat', this.scene);
        mat.diffuseColor = new BABYLON.Color3(1, 0.85, 0.3);
        mat.emissiveColor = new BABYLON.Color3(1, 0.7, 0.2);
        mat.alpha = 0.5;
        trail.material = mat;

        const fadeAnim = new BABYLON.Animation('trailFade', 'material.alpha',
            60, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
        fadeAnim.setKeys([
            { frame: 0, value: 0.5 },
            { frame: 20, value: 0 }
        ]);
        trail.animations = [fadeAnim];

        const scaleAnim = new BABYLON.Animation('trailScale', 'scaling',
            60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3);
        scaleAnim.setKeys([
            { frame: 0, value: new BABYLON.Vector3(1, 1, 1) },
            { frame: 20, value: new BABYLON.Vector3(0, 0, 0) }
        ]);
        trail.animations.push(scaleAnim);

        this.scene.beginAnimation(trail, 0, 20, false, 1, () => {
            trail.dispose();
            mat.dispose();
        });
    }

    /**
     * Create a persistent particle trail attached to the player mesh
     */
    createPlayerTrail(playerNode) {
        // Emitter positioned at player's dress hem
        const emitter = new BABYLON.TransformNode('trailEmitter', this.scene);
        emitter.position.y = -0.2;
        emitter.parent = playerNode;

        const ps = new BABYLON.ParticleSystem('playerTrail', 200, this.scene);
        ps.emitter = emitter;

        // Particle texture (create procedural circle)
        const texSize = 64;
        const dt = new BABYLON.DynamicTexture('trailTex', texSize, this.scene);
        const ctx = dt.getContext();
        const grad = ctx.createRadialGradient(texSize/2, texSize/2, 0, texSize/2, texSize/2, texSize/2);
        grad.addColorStop(0, 'rgba(255, 220, 100, 1)');
        grad.addColorStop(0.4, 'rgba(255, 180, 50, 0.6)');
        grad.addColorStop(1, 'rgba(255, 150, 30, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, texSize, texSize);
        dt.update();
        ps.particleTexture = dt;

        ps.color1 = new BABYLON.Color4(1, 0.9, 0.5, 0.6);
        ps.color2 = new BABYLON.Color4(1, 0.7, 0.3, 0.4);
        ps.colorDead = new BABYLON.Color4(1, 0.5, 0.2, 0);

        ps.minSize = 0.05;
        ps.maxSize = 0.2;
        ps.minLifeTime = 0.3;
        ps.maxLifeTime = 0.8;
        ps.emitRate = 30;
        ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

        ps.direction1 = new BABYLON.Vector3(-0.3, -0.5, -0.3);
        ps.direction2 = new BABYLON.Vector3(0.3, 0.2, 0.3);
        ps.minEmitPower = 0.5;
        ps.maxEmitPower = 1.5;

        ps.gravity = new BABYLON.Vector3(0, -0.3, 0);
        ps.updateSpeed = 0.01;

        ps.start();
        this._playerTrail = ps;
    }

    /**
     * Adjust trail emission based on player speed
     */
    setTrailIntensity(speed) {
        if (!this._playerTrail) return;
        if (speed > 0.5) {
            this._playerTrail.emitRate = Math.min(80, 30 + speed * 15);
            this._playerTrail.maxSize = 0.15 + speed * 0.05;
        } else {
            this._playerTrail.emitRate = 10;
            this._playerTrail.maxSize = 0.1;
        }
    }

    /**
     * Create firefly particles near lanterns
     */
    createFireflies() {
        // Scattered firefly-like particles throughout city
        this._fireflies = [];
        for (let i = 0; i < 30; i++) {
            const ff = BABYLON.MeshBuilder.CreateSphere(`firefly_${i}`, {
                diameter: 0.06, segments: 4
            }, this.scene);
            ff.position = new BABYLON.Vector3(
                (Math.random() - 0.5) * 40,
                1.5 + Math.random() * 4,
                (Math.random() - 0.5) * 160
            );
            const mat = new BABYLON.StandardMaterial(`ffMat_${i}`, this.scene);
            mat.emissiveColor = new BABYLON.Color3(0.8, 1, 0.3);
            mat.alpha = 0;
            ff.material = mat;
            ff._mat = mat;
            ff._phase = Math.random() * Math.PI * 2;
            ff._speed = 0.3 + Math.random() * 0.5;
            ff._baseX = ff.position.x;
            ff._baseY = ff.position.y;
            ff._baseZ = ff.position.z;
            this._fireflies.push(ff);
        }
    }

    _updateFireflies(dt) {
        if (!this._fireflies) return;
        this._fireflies.forEach(ff => {
            if (ff.isDisposed()) return;
            const t = this._time;
            const p = ff._phase;
            // Gentle drifting path
            ff.position.x = ff._baseX + Math.sin(t * ff._speed + p) * 1.5;
            ff.position.y = ff._baseY + Math.sin(t * ff._speed * 0.7 + p) * 0.5;
            ff.position.z = ff._baseZ + Math.cos(t * ff._speed * 0.5 + p) * 1.0;
            // Blink on/off
            const blink = Math.sin(t * 3 + p * 5);
            ff._mat.alpha = blink > 0.3 ? 0.7 * blink : 0;
        });
    }
}
