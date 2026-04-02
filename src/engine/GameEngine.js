/**
 * GameEngine - Babylon.js engine initialization, scene, camera, lighting, skybox
 */
class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.engine = new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true
        });
        this.scene = null;
        this.camera = null;
        this.shadowGenerator = null;

        // Module references
        this.player = null;
        this.world = null;
        this.collectibles = null;
        this.particles = null;
        this.ui = null;
        this.learningSystem = null;
        this.speechSystem = null;

        // Game state
        this.state = 'menu'; // 'menu' | 'playing' | 'overlay'
        this.currentTheme = 'song-dynasty';
    }

    async init() {
        this._createScene();
        this._createLighting();
        this._createSkybox();
        this._createGround();
        this._createFog();

        // Init systems
        this.learningSystem = new LearningSystem('flyChina3D_progress');
        this.speechSystem = new SpeechSystem();

        // Load theme data
        const loaded = await this.learningSystem.loadTheme(`data/themes/${this.currentTheme}`);
        if (!loaded) {
            console.error('Failed to load theme data');
            return;
        }

        // Init game modules
        this.particles = new ParticleEffects(this.scene);
        this.player = new PlayerController(this.scene, this.canvas);
        this.world = new WorldBuilder(this.scene, this.learningSystem);
        this.collectibles = new CollectibleManager(this.scene, this.learningSystem, this.particles);
        this.ui = new UIManager(this.scene, this.learningSystem, this.speechSystem, this);

        // Build the world
        this.world.buildCity();
        this.collectibles.spawnAll();
        this.particles.createAmbient();
        this.particles.createFireflies();
        this.particles.createPlayerTrail(this.player.mesh);

        // Setup camera to follow player
        this._setupFollowCamera();

        // Enable glow
        this._setupGlow();

        // Enable shadows on player's child meshes
        if (this.shadowGenerator && this.player.mesh) {
            this.player.mesh.getChildMeshes().forEach(child => {
                this.shadowGenerator.addShadowCaster(child);
            });
        }

        // Setup game loop
        this.scene.registerBeforeRender(() => this._gameLoop());

        // Start render loop
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        // Handle resize
        window.addEventListener('resize', () => {
            this.engine.resize();
        });

        // Hide loading screen
        const loadingEl = document.getElementById('loadingScreen');
        if (loadingEl) loadingEl.classList.add('hidden');

        this.state = 'playing';
    }

    _createScene() {
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(0.08, 0.06, 0.15, 1);
        this.scene.ambientColor = new BABYLON.Color3(0.15, 0.12, 0.2);
        this.scene.collisionsEnabled = true;

        // Optimize
        this.scene.autoClearDepthAndStencil = true;
    }

    _createLighting() {
        // Hemispheric light (ambient sky/ground)
        const hemi = new BABYLON.HemisphericLight('hemiLight',
            new BABYLON.Vector3(0, 1, 0), this.scene);
        hemi.intensity = 0.5;
        hemi.diffuse = new BABYLON.Color3(0.9, 0.85, 0.7);
        hemi.groundColor = new BABYLON.Color3(0.2, 0.15, 0.1);

        // Directional light (sun/moon)
        const dir = new BABYLON.DirectionalLight('dirLight',
            new BABYLON.Vector3(-0.5, -1, 0.5), this.scene);
        dir.position = new BABYLON.Vector3(50, 80, -50);
        dir.intensity = 0.6;
        dir.diffuse = new BABYLON.Color3(1, 0.95, 0.8);

        // Shadow generator
        this.shadowGenerator = new BABYLON.ShadowGenerator(1024, dir);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.blurKernel = 16;
        this.shadowGenerator.darkness = 0.4;
    }

    _createSkybox() {
        // Register custom shader in Babylon's store
        BABYLON.Effect.ShadersStore['skyGradientVertexShader'] = `
            precision highp float;
            attribute vec3 position;
            uniform mat4 worldViewProjection;
            varying vec3 vPosition;
            void main() {
                gl_Position = worldViewProjection * vec4(position, 1.0);
                vPosition = position;
            }
        `;
        BABYLON.Effect.ShadersStore['skyGradientFragmentShader'] = `
            precision highp float;
            varying vec3 vPosition;
            void main() {
                float h = normalize(vPosition).y;
                vec3 topColor = vec3(0.1, 0.08, 0.25);
                vec3 midColor = vec3(0.2, 0.15, 0.35);
                vec3 bottomColor = vec3(0.3, 0.2, 0.15);
                vec3 color;
                if (h > 0.0) {
                    color = mix(midColor, topColor, h);
                } else {
                    color = mix(midColor, bottomColor, -h);
                }
                float star = step(0.998, fract(sin(dot(vPosition.xz * 50.0, vec2(12.9898, 78.233))) * 43758.5453));
                color += vec3(star * 0.6) * step(0.2, h);
                gl_FragColor = vec4(color, 1.0);
            }
        `;

        const skyMat = new BABYLON.ShaderMaterial('skyMat', this.scene, {
            vertex: 'skyGradient',
            fragment: 'skyGradient'
        }, {
            attributes: ['position'],
            uniforms: ['worldViewProjection']
        });
        skyMat.backFaceCulling = false;

        const skybox = BABYLON.MeshBuilder.CreateSphere('skybox', { diameter: 500, segments: 16 }, this.scene);
        skybox.material = skyMat;
        skybox.infiniteDistance = true;
        skybox.renderingGroupId = 0;
    }

    _createGround() {
        // Main ground (earthy)
        const ground = BABYLON.MeshBuilder.CreateGround('ground', {
            width: 200,
            height: 200,
            subdivisions: 20
        }, this.scene);

        const groundMat = new BABYLON.PBRMaterial('groundMat', this.scene);
        groundMat.albedoColor = new BABYLON.Color3(0.2, 0.22, 0.12);
        groundMat.roughness = 0.95;
        groundMat.metallic = 0;
        ground.material = groundMat;
        ground.receiveShadows = true;

        // Road surface (cobblestone-colored)
        const road = BABYLON.MeshBuilder.CreateGround('road', {
            width: 8, height: 200
        }, this.scene);
        road.position.y = 0.02;
        const roadMat = new BABYLON.PBRMaterial('roadMat', this.scene);
        roadMat.albedoColor = new BABYLON.Color3(0.35, 0.3, 0.22);
        roadMat.roughness = 0.85;
        roadMat.metallic = 0;
        road.material = roadMat;
        road.receiveShadows = true;

        // Road center line (darker stripe)
        const centerLine = BABYLON.MeshBuilder.CreateGround('centerLine', {
            width: 0.15, height: 200
        }, this.scene);
        centerLine.position.y = 0.03;
        const clMat = new BABYLON.PBRMaterial('clMat', this.scene);
        clMat.albedoColor = new BABYLON.Color3(0.28, 0.24, 0.18);
        clMat.roughness = 0.9;
        centerLine.material = clMat;

        // Side gutters (stone channels)
        for (let side = -1; side <= 1; side += 2) {
            const gutter = BABYLON.MeshBuilder.CreateGround(`gutter_${side}`, {
                width: 0.4, height: 200
            }, this.scene);
            gutter.position = new BABYLON.Vector3(side * 4.1, 0.01, 0);
            const gutterMat = new BABYLON.PBRMaterial(`gutterMat_${side}`, this.scene);
            gutterMat.albedoColor = new BABYLON.Color3(0.3, 0.28, 0.25);
            gutterMat.roughness = 0.95;
            gutter.material = gutterMat;
        }

        // Grass patches along outer areas
        const grassMat = new BABYLON.PBRMaterial('grassMat', this.scene);
        grassMat.albedoColor = new BABYLON.Color3(0.18, 0.28, 0.12);
        grassMat.roughness = 0.95;
        for (let i = 0; i < 20; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const patch = BABYLON.MeshBuilder.CreateDisc(`grass_${i}`, {
                radius: 1.5 + Math.random() * 2, tessellation: 8
            }, this.scene);
            patch.position = new BABYLON.Vector3(
                side * (15 + Math.random() * 20),
                0.015,
                (Math.random() - 0.5) * 180
            );
            patch.rotation.x = Math.PI / 2;
            patch.material = grassMat;
        }
    }

    _createFog() {
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.006;
        this.scene.fogColor = new BABYLON.Color3(0.1, 0.08, 0.15);
    }

    _setupFollowCamera() {
        // Remove any existing camera
        if (this.camera) this.camera.dispose();

        this.camera = new BABYLON.ArcRotateCamera('followCam',
            Math.PI,        // alpha: camera behind player (-Z), looking forward (+Z along road)
            Math.PI / 3.5,  // beta (vertical angle)
            18,             // radius (distance from target)
            this.player.mesh.position.clone(),
            this.scene
        );

        this.camera.lowerRadiusLimit = 8;
        this.camera.upperRadiusLimit = 35;
        this.camera.lowerBetaLimit = 0.3;
        this.camera.upperBetaLimit = Math.PI / 2.2;
        this.camera.wheelDeltaPercentage = 0.02;
        this.camera.inertia = 0.85;

        // Attach controls for mouse-look (right-click drag to rotate)
        this.camera.attachControl(this.canvas, true);

        // Disable camera keyboard controls so arrow keys control player movement
        this.camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');

        // Smooth follow - target slightly above player root for torso height
        this.camera.lockedTarget = this.player.mesh;
        this.camera.targetScreenOffset = new BABYLON.Vector2(0, -0.5);
    }

    _setupGlow() {
        const gl = new BABYLON.GlowLayer('glow', this.scene, {
            mainTextureFixedSize: 512,
            blurKernelSize: 48
        });
        gl.intensity = 0.8;
        this.glowLayer = gl;
    }

    _gameLoop() {
        if (this.state !== 'playing') return;

        const deltaTime = this.engine.getDeltaTime() / 1000;

        // Update player
        if (this.player) {
            this.player.update(deltaTime);
        }

        // Update collectibles (bobbing, proximity check)
        if (this.collectibles) {
            this.collectibles.update(deltaTime, this.player.mesh.position);
        }

        // Update particles + adjust trail based on player speed
        if (this.particles) {
            this.particles.update(deltaTime);
            if (this.player) {
                this.particles.setTrailIntensity(this.player.velocity.length());
            }
        }

        // Update UI
        if (this.ui) {
            this.ui.updateHUD();
        }

        // Check area transitions
        if (this.world) {
            this.world.checkAreaTransition(this.player.mesh.position, this.ui);
        }
    }
}
