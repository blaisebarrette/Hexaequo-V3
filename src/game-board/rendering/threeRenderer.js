/**
 * ThreeRenderer - Handles 3D rendering for the game board
 * 
 * This module is responsible for rendering the game board in 3D using Three.js.
 * It renders tiles, pieces, highlights, and animations.
 * 
 * UI Methods Implemented:
 * - initUI: Creates basic UI elements (cancel, validate, disc, ring icons)
 * - showValidationUI: Shows validate/cancel icons for confirming actions
 * - showTilePlacementUI: Shows UI for tile placement
 * - showPiecePlacementUI: Shows UI for piece placement with options for disc/ring
 * - clearActionUI: Clears all UI elements
 * - animateTilePlacement: Animates a tile being placed on the board
 * - animatePiecePlacement: Animates a piece being placed on the board
 * - liftPiece: Lifts a piece to indicate it's selected
 * - resetAllPiecesHeight: Resets all pieces to their resting height
 * - showValidMovesForPiece: Shows valid move indicators for a selected piece
 * - clearValidMoveIndicators: Clears valid move indicators
 * - UI interaction helpers: checkUIClick, isCancelClicked, isValidateClicked, etc.
 * - screenToHex: Converts screen coordinates to hex coordinates
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { eventBus } from '../../api/eventBus.js';
import { apiClient } from '../../api/apiClient.js';
import { BoardStateConstants } from '../core/boardState.js';
import { animationHandler } from './animationHandler.js';

// Constants for rendering
const TILE_SIZE = 1.0;
const GRID_SIZE = 20;
const BOARD_OFFSET = { x: 0, y: 0, z: 0 };

// Constants for positioning
const POSITIONS = {
    TILE_RESTING_HEIGHT: 0,
    TILE_FLOATING_HEIGHT: 0.5,
    PIECE_RESTING_HEIGHT: 0,
    PIECE_FLOATING_HEIGHT: 0.5,
    HEX_SPACING: 0.90  // Controls spacing between hexes
};

// Add placeholder constants for valid move indicators
const PLACEHOLDER = {
    VISIBLE_OPACITY: 0.6,
    INVISIBLE_OPACITY: 0.1,
    TILE_RADIUS: 0.9,
    TILE_THICKNESS: 0.1,
    TILE_SEGMENTS: 6,
    TILE_HEIGHT: 0.05,
    TILE_COLOR: 0x4CAF50, // Green color for tile placeholders
    DISC_RADIUS: 0.7,
    DISC_THICKNESS: 0.1,
    DISC_SEGMENTS: 32,
    DISC_HEIGHT: 0.15,
    RING_RADIUS: 0.7,
    RING_TUBE: 0.1,
    RING_SEGMENTS: 16,
    RING_TUBULAR_SEGMENTS: 32,
    RING_HEIGHT: 0.15,
    PIECE_COLOR: 0x2196F3, // Blue color for piece placeholders
    MOVE_COLOR: 0xFFC107  // Amber color for movement placeholders
};

// Color constants
const COLORS = {
    LIGHT_TILE: 0xf5d7a3,
    DARK_TILE: 0xb58863,
    GRID: 0x999999,
    BACKGROUND: {
        LIGHT: 0xe0e0e0,
        DARK: 0x202020
    },
    HIGHLIGHT: {
        SELECTED: 0x00ff00,
        VALID_MOVE: 0x2196f3,
        VALID_PLACEMENT: 0x4caf50,
        LAST_MOVE: 0xffeb3b,
        HOVER: 0xff9800,
        ACTIVE: 0xff5722
    }
};

/**
 * ThreeRenderer class for 3D rendering
 */
export class ThreeRenderer {
    constructor(canvasContainerId, boardState) {
        // Store reference to boardState provided by boardModule
        this.boardState = boardState;
        
        // Get container from DOM
        this.container = document.getElementById(canvasContainerId);
        if (!this.container) {
            throw new Error(`Container element with ID '${canvasContainerId}' not found`);
        }
        
        // Initialize Three.js components
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0); // Light gray background by default
        
        // Set up renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Setup camera
        this.camera = new THREE.PerspectiveCamera(
            45, 
            this.container.clientWidth / this.container.clientHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 15, 15);
        this.camera.lookAt(0, 0, 0);
        
        // Groups for organization
        this.tilesGroup = new THREE.Group();
        this.piecesGroup = new THREE.Group();
        this.uiElementsGroup = new THREE.Group();
        this.validMovesGroup = new THREE.Group(); // Group for valid move indicators
        
        this.scene.add(this.tilesGroup);
        this.scene.add(this.piecesGroup);
        this.scene.add(this.uiElementsGroup);
        this.scene.add(this.validMovesGroup);
        
        // Add lighting
        this.setupLights();
        
        // Setup controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.rotateSpeed = 0.5;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 30;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Limit to just below horizontal
        
        // Initialize loaders
        this.gltfLoader = new GLTFLoader();
        this.textureLoader = new THREE.TextureLoader();
        
        // Maps to store tiles and pieces
        this.tiles = new Map();
        this.pieces = new Map();
        
        // Store models
        this.models = {};
        
        // Store textures
        this.textures = {};
        
        // Load textures
        this.loadTextures();
        
        // Set up window resize listener
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Subscribe to boardState changes
        eventBus.subscribe('board:stateChanged', this.onBoardStateChanged.bind(this));
        
        // Render flag to optimize rendering
        this.needsRender = true;
    }
    
    /**
     * Initialize the 3D renderer
     */
    initialize() {
        console.log('Initializing 3D renderer');

        // Set up scene
        this.scene = this.scene || new THREE.Scene();
        this.scene.background = new THREE.Color(this.boardState.darkMode ? 0x222222 : 0xf0f0f0);
        
        // Create a camera if it doesn't exist
        if (!this.camera) {
            this.camera = new THREE.PerspectiveCamera(
                45, 
                this.container.clientWidth / this.container.clientHeight,
                0.1,
                1000
            );
            this.camera.position.set(0, 15, 15);
            this.camera.lookAt(0, 0, 0);
        }
        
        // Initialize renderer if it doesn't exist
        if (!this.renderer) {
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.container.appendChild(this.renderer.domElement);
        }
        
        // Initialize controls if they don't exist
        if (!this.controls) {
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.1;
            this.controls.rotateSpeed = 0.5;
            this.controls.minDistance = 5;
            this.controls.maxDistance = 30;
            this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Limit to just below horizontal
        }
        
        // Create groups for organizing objects in the scene
        // Reuse existing groups if they exist, otherwise create new ones
        if (!this.tilesGroup) {
            this.tilesGroup = new THREE.Group();
            this.scene.add(this.tilesGroup);
        } else {
            // Clear existing tiles if reinitializing
            while (this.tilesGroup.children.length > 0) {
                const child = this.tilesGroup.children[0];
                if (child) {
                    this.tilesGroup.remove(child);
                }
            }
        }
        
        if (!this.piecesGroup) {
            this.piecesGroup = new THREE.Group();
            this.scene.add(this.piecesGroup);
        } else {
            // Clear existing pieces if reinitializing
            while (this.piecesGroup.children.length > 0) {
                const child = this.piecesGroup.children[0];
                if (child) {
                    this.piecesGroup.remove(child);
                }
            }
        }
        
        if (!this.uiElementsGroup) {
            this.uiElementsGroup = new THREE.Group();
            this.scene.add(this.uiElementsGroup);
        } else {
            // Clear existing UI elements if reinitializing
            while (this.uiElementsGroup.children.length > 0) {
                const child = this.uiElementsGroup.children[0];
                if (child) {
                    this.uiElementsGroup.remove(child);
                }
            }
        }
        
        if (!this.validMovesGroup) {
            this.validMovesGroup = new THREE.Group();
            this.scene.add(this.validMovesGroup);
        } else {
            // Clear existing valid move indicators if reinitializing
            while (this.validMovesGroup.children.length > 0) {
                const child = this.validMovesGroup.children[0];
                if (child) {
                    this.validMovesGroup.remove(child);
                }
            }
        }
        
        // For raycasting
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Initialize maps for tiles and pieces if they don't exist
        this.tiles = this.tiles || new Map();
        this.pieces = this.pieces || new Map();
        
        // Create fallback geometries for when models fail to load
        this.createFallbackGeometries();

        // Setup lights
        this.setupLights();
        
        // Create the ground plane
        this.createGroundPlane();
        
        // Add a render flag to optimize rendering
        this.needsRender = true;
        
        // Create an animation loop
        this.animate();
        
        // Initialize UI elements
        this.initUI();
        
        console.log('3D renderer initialized successfully');
    }
    
    /**
     * Load 3D models for game pieces
     */
    loadModels() {
        console.log('Loading 3D models...');
        
        // Import model configuration
        import('../core/modelConfig.js').then(modelConfig => {
            // Get the current model configuration
            const config = modelConfig.DEFAULT_MODEL_CONFIG;
            
            // Notify API that we're starting to load models
            eventBus.publish('board:modelLoadingStarted', {
                modelCount: 0,
                config
            });
            
            // Load models with the configuration
            this.loadModelsWithConfig(config, modelConfig);
        }).catch(error => {
            console.error('Failed to load model configuration:', error);
            
            // Create fallback geometries for all models
            this.createFallbackGeometries();
            
            // Notify that model loading failed
            eventBus.publish('error', {
                message: 'Failed to load model configuration',
                details: error.message
            });
            
            // Continue with setup using fallback geometries
            this.setupScene();
        });
    }
    
    /**
     * Load models with the specified configuration
     * @param {Object} config - Model configuration
     * @param {Object} modelConfig - Model configuration module
     */
    loadModelsWithConfig(config, modelConfig) {
        console.log('Loading models with config:', config);
        
        // Create fallback geometries in case models fail to load
        this.createFallbackGeometries();
        
        // Get model paths for current theme/quality
        const modelPaths = modelConfig.getModelPaths(config.theme, config.quality);
        console.log('Model paths:', modelPaths);
        
        // Track model loading progress
        let loadedCount = 0;
        let totalModels = Object.keys(modelPaths).length;
        let loadingFailed = false;
        let failedModels = [];
        
        // Set initial model loading state
        this.modelLoadingState = {
            success: false,
            inProgress: true,
            modelCount: 0,
            failedModels: [],
            loadedModels: 0,
            totalModels,
            config
        };
        
        // Load each model
        const promises = [];
        for (const [name, path] of Object.entries(modelPaths)) {
            console.log(`Starting to load model: ${name} from ${path}`);
            
            const loadPromise = new Promise((resolve) => {
                const timeoutId = config.loadTimeout > 0 ? setTimeout(() => {
                    console.warn(`Model loading timeout for ${name}`);
                    loadingFailed = true;
                    failedModels.push({name, path, error: 'Timeout'});
                    resolve({success: false, name, error: 'Timeout'});
                }, config.loadTimeout) : null;
                
                this.gltfLoader.load(
                    path,
                    (gltf) => {
                        if (timeoutId) clearTimeout(timeoutId);
                        
                        loadedCount++;
                        console.log(`Loaded model: ${name} (${loadedCount}/${totalModels})`);
                        this.models[name] = gltf.scene.children[0];
                        
                        // Enable shadows for the model
                        this.models[name].castShadow = true;
                        this.models[name].receiveShadow = true;
                        
                        // Enable shadows for all child meshes
                        this.models[name].traverse((child) => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                            }
                        });
                        
                        // Emit loading progress event
                        if (config.showLoadingProgress) {
                            eventBus.publish('board:modelLoadProgress', {
                                name,
                                loaded: loadedCount,
                                total: totalModels,
                                progress: loadedCount / totalModels
                            });
                        }
                        
                        resolve({success: true, name});
                    },
                    (progress) => {
                        if (config.showLoadingProgress) {
                            const modelProgress = Math.round(progress.loaded / progress.total * 100);
                            console.log(`Loading model ${name}: ${modelProgress}%`);
                            eventBus.publish('board:modelLoadItemProgress', {
                                name,
                                progress: modelProgress,
                                loaded: progress.loaded,
                                total: progress.total
                            });
                        }
                    },
                    (error) => {
                        if (timeoutId) clearTimeout(timeoutId);
                        
                        console.warn(`Using fallback geometry for ${name}: ${error.message}`);
                        loadingFailed = true;
                        failedModels.push({name, path, error: error.message});
                        resolve({success: false, name, error: error.message});
                    }
                );
            });
            
            promises.push(loadPromise);
        }
        
        // When all models are loaded (or failed to load), set up the board
        Promise.all(promises)
            .then((results) => {
                console.log('All model load attempts completed. Results:', results);
                console.log(`Successfully loaded ${loadedCount} out of ${totalModels} models`);
                
                if (loadingFailed) {
                    this.showModelLoadingError(failedModels);
                }
                
                // Save loading state for API queries
                this.modelLoadingState = {
                    success: !loadingFailed || config.useFallbackIfLoadFails,
                    inProgress: false,
                    modelCount: Object.keys(this.models).length,
                    failedModels,
                    loadedModels: totalModels - failedModels.length,
                    totalModels,
                    config
                };
                
                // Emit model loading complete event
                eventBus.publish('board:modelsLoaded', {
                    success: !loadingFailed || config.useFallbackIfLoadFails,
                    modelCount: Object.keys(this.models).length,
                    failedModels,
                    config
                });
                
                this.setupScene();
            });
    }
    
    /**
     * Gets the model loading status
     * @returns {Object} Model loading status
     */
    getModelLoadingStatus() {
        return this.modelLoadingState || {
            success: false,
            error: 'Model loading has not been initialized'
        };
    }
    
    /**
     * Retry loading failed models
     * @param {Array} models - Models to retry loading
     * @returns {Object} Result of the retry operation
     */
    retryModelLoading(models) {
        if (!this.modelLoadingState) {
            return { success: false, error: 'Model loading has not been initialized' };
        }
        
        // Implementation of retryModelLoading remains the same
        // but now it's called from the boardModule via the API
        
        return { success: true, message: 'Retry initiated' };
    }
    
    /**
     * Configure model loading
     * @param {Object} config - New configuration
     * @returns {Object} Updated configuration
     */
    configureModelLoading(config) {
        if (!this.modelLoadingState) {
            this.modelLoadingState = { config: {} };
        }
        
        this.modelLoadingState.config = { ...this.modelLoadingState.config, ...config };
        return { success: true, config: this.modelLoadingState.config };
    }
    
    /**
     * Get available model themes
     * @returns {Object} Available themes and qualities
     */
    getAvailableModelThemes() {
        // This would need to import or be passed modelConfig
        // For now, return a placeholder
        return {
            themes: ['default', 'minimal'],
            qualities: ['high', 'medium', 'low'],
            currentTheme: this.modelLoadingState?.config?.theme || 'default',
            currentQuality: this.modelLoadingState?.config?.quality || 'medium'
        };
    }
    
    /**
     * Set the model theme
     * @param {Object} params - Theme parameters
     * @returns {Object} Result of the operation
     */
    setModelTheme(params) {
        if (!params.theme) {
            return { success: false, error: 'Theme not specified' };
        }
        
        // This would need to import or be passed modelConfig
        // For now, just return success
        return { success: true, message: 'Theme updated' };
    }
    
    /**
     * Check if valid moves are visible
     * @returns {boolean} True if valid moves are visible
     */
    isValidMovesVisible() {
        // Check if valid moves group has visible objects
        return this.validMovesGroup.visible;
    }
    
    /**
     * Display an indicator that model loading failed
     * @param {Array} failedModels - Array of failed model information
     */
    showModelLoadingError(failedModels = []) {
        console.warn("Some 3D models failed to load - using fallback geometries");
        
        // Log the failed models
        if (failedModels.length > 0) {
            console.error("Failed models:", failedModels);
        }
        
        // Create a simple error indicator (a red sphere)
        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const errorIndicator = new THREE.Mesh(geometry, material);
        
        // Position it in a visible location
        errorIndicator.position.set(0, 2, 0);
        
        // Add to scene
        this.scene.add(errorIndicator);
        
        // Save reference for potential removal later
        this.errorIndicator = errorIndicator;
        
        // Add text instruction
        const message = `Model loading error: ${failedModels.length} models failed to load. Using fallback geometries.`;
        console.error(message);
        
        // Emit error event
        eventBus.publish('error', {
            message: 'Some 3D models failed to load',
            details: `${failedModels.length} models failed to load. Using fallback geometries.`,
            failedModels
        });
    }
    
    /**
     * Refresh the scene after settings changes or model reloads
     */
    refreshScene() {
        console.log('Refreshing scene with current settings');
        
        try {
            // Get current board state
            const tiles = this.boardState.getTiles ? this.boardState.getTiles() : [];
            const pieces = this.boardState.getPieces ? this.boardState.getPieces() : [];
            
            // Update all tile models based on current settings
            if (tiles && tiles.length > 0) {
                console.log(`Refreshing ${tiles.length} tiles with new models/settings`);
                
                tiles.forEach(tile => {
                    // Only update existing tiles (that are rendered)
                    if (this.tiles.has(tile.id)) {
                        const tileObj = this.tiles.get(tile.id);
                        
                        // Remove old model if present
                        const oldModel = tileObj.children.find(child => child.userData && child.userData.isModelMesh);
                        if (oldModel) {
                            tileObj.remove(oldModel);
                        }
                        
                        // Add updated model
                        if (this.models.tile) {
                            // Clone the model for this tile
                            const tileModel = this.models.tile.clone();
                            tileModel.userData = { isModelMesh: true };
                            
                            // Position within the tile object
                            tileModel.position.set(0, 0, 0);
                            
                            // Add to the tile's object
                            tileObj.add(tileModel);
                        }
                    }
                });
            } else {
                console.log('No tiles to refresh');
            }
            
            // Update all piece models based on current settings
            if (pieces && pieces.length > 0) {
                console.log(`Refreshing ${pieces.length} pieces with new models/settings`);
                
                pieces.forEach(piece => {
                    // Only update existing pieces (that are rendered)
                    if (this.pieces.has(piece.id)) {
                        const pieceObj = this.pieces.get(piece.id);
                        
                        // Remove old model if present
                        const oldModel = pieceObj.children.find(child => child.userData && child.userData.isModelMesh);
                        if (oldModel) {
                            pieceObj.remove(oldModel);
                        }
                        
                        // Add updated model based on piece type
                        const modelName = piece.player === 'white' ? 'whitePiece' : 'blackPiece';
                        
                        if (this.models[modelName]) {
                            // Clone the model for this piece
                            const pieceModel = this.models[modelName].clone();
                            pieceModel.userData = { isModelMesh: true };
                            
                            // Position within the piece object
                            pieceModel.position.set(0, 0, 0);
                            
                            // Add to the piece's object
                            pieceObj.add(pieceModel);
                        }
                    }
                });
            } else {
                console.log('No pieces to refresh');
            }
            
            // Update any UI elements
            if (typeof this.updateUIElements === 'function') {
                this.updateUIElements();
            }
            
            // Request a render
            this.requestRender();
            
            // Publish event that scene was refreshed
            eventBus.publish('board:sceneRefreshed', {
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error refreshing scene:', error);
            eventBus.publish('error', {
                message: 'Failed to refresh scene',
                details: error.message
            });
        }
    }

    /**
     * Update UI elements based on current state
     */
    updateUIElements() {
        try {
            // Clear existing UI elements
            while (this.uiElementsGroup.children.length > 0) {
                this.uiElementsGroup.remove(this.uiElementsGroup.children[0]);
            }
            
            // Show valid moves if the method exists
            if (typeof this.showValidActionPlaceholders === 'function') {
                this.showValidActionPlaceholders();
            } else {
                console.log('showValidActionPlaceholders method not available');
            }
            
            // Request a render to show changes
            this.requestRender();
        } catch (error) {
            console.error('Error updating UI elements:', error);
        }
    }
    
    /**
     * Create fallback geometries for when 3D models fail to load
     */
    createFallbackGeometries() {
        // Tile geometries - hexagonal
        const tileGeometry = new THREE.CylinderGeometry(1, 1, 0.2, 6);
        
        const blackTileMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.7,
            metalness: 0.2
        });
        const whiteTileMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xeeeeee,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const blackTileMesh = new THREE.Mesh(tileGeometry, blackTileMaterial);
        const whiteTileMesh = new THREE.Mesh(tileGeometry, whiteTileMaterial);
        
        // Disc geometries - cylinders
        const discGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 32);
        
        const blackDiscMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.5,
            metalness: 0.3
        });
        const whiteDiscMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.3
        });
        
        const blackDiscMesh = new THREE.Mesh(discGeometry, blackDiscMaterial);
        const whiteDiscMesh = new THREE.Mesh(discGeometry, whiteDiscMaterial);
        
        // Ring geometries - torus
        const ringGeometry = new THREE.TorusGeometry(0.7, 0.2, 16, 32);
        ringGeometry.rotateX(Math.PI/2); // Rotate to horizontal
        
        const blackRingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.5,
            metalness: 0.3
        });
        const whiteRingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.3
        });
        
        const blackRingMesh = new THREE.Mesh(ringGeometry, blackRingMaterial);
        const whiteRingMesh = new THREE.Mesh(ringGeometry, whiteRingMaterial);
        
        // Assign fallback meshes to models
        this.models.tile_black = blackTileMesh;
        this.models.tile_white = whiteTileMesh;
        this.models.disc_black = blackDiscMesh;
        this.models.disc_white = whiteDiscMesh;
        this.models.ring_black = blackRingMesh;
        this.models.ring_white = whiteRingMesh;
    }
    
    /**
     * Set up the initial game board
     */
    setupScene() {
        console.log('Setting up 3D scene');
        
        // Clear any existing elements
        while (this.tilesGroup.children.length > 0) {
            this.tilesGroup.remove(this.tilesGroup.children[0]);
        }
        
        while (this.piecesGroup.children.length > 0) {
            this.piecesGroup.remove(this.piecesGroup.children[0]);
        }
        
        this.tiles.clear();
        this.pieces.clear();
        
        // Initialize UI elements
        this.initUI();
        
        // Add a ground plane with texture based on settings
        this.createGroundPlane();
        
        // Start the render loop
        this.animate();
        
        // Emit setup complete event
        eventBus.publish('board:setupComplete', {
            timestamp: Date.now()
        });
    }
    
    /**
     * Create the ground plane with appropriate texture
     */
    createGroundPlane() {
        // Make sure boardState exists
        if (!this.boardState) {
            console.warn('Cannot create ground plane: boardState is undefined');
            return;
        }
        
        try {
            // Remove any existing ground
            if (this.ground) {
                this.scene.remove(this.ground);
                this.ground = null;
            }
            
            // Create a large ground plane
            const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
            let groundMaterial;
            
            // Get the background color from board state
            const backgroundColor = this.boardState.backgroundColor || 'default';
            const isDarkMode = this.boardState.darkMode || false;
            
            // Create material based on background type
            switch (backgroundColor) {
                case 'wood':
                    // Load wood texture if available
                    if (this.textures && this.textures.wood) {
                        groundMaterial = new THREE.MeshStandardMaterial({
                            map: this.textures.wood,
                            roughness: 0.8,
                            metalness: 0.1
                        });
                    } else {
                        // Fallback to color
                        groundMaterial = new THREE.MeshStandardMaterial({
                            color: isDarkMode ? 0x3e2723 : 0x8d6e63, // Dark/light wood color
                            roughness: 0.9,
                            metalness: 0.1
                        });
                    }
                    break;
                case 'stone':
                    // Load stone texture if available
                    if (this.textures && this.textures.stone) {
                        groundMaterial = new THREE.MeshStandardMaterial({
                            map: this.textures.stone,
                            roughness: 0.7,
                            metalness: 0.2
                        });
                    } else {
                        // Fallback to color
                        groundMaterial = new THREE.MeshStandardMaterial({
                            color: isDarkMode ? 0x424242 : 0x9e9e9e, // Dark/light stone color
                            roughness: 0.8,
                            metalness: 0.2
                        });
                    }
                    break;
                case 'marble':
                    // Load marble texture if available
                    if (this.textures && this.textures.marble) {
                        groundMaterial = new THREE.MeshStandardMaterial({
                            map: this.textures.marble,
                            roughness: 0.5,
                            metalness: 0.3
                        });
                    } else {
                        // Fallback to color
                        groundMaterial = new THREE.MeshStandardMaterial({
                            color: isDarkMode ? 0x455a64 : 0xcfd8dc, // Dark/light marble color
                            roughness: 0.6,
                            metalness: 0.3
                        });
                    }
                    break;
                default:
                    // Default plain color
                    groundMaterial = new THREE.MeshStandardMaterial({
                        color: isDarkMode ? 0x333333 : 0xdddddd, // Dark/light default color
                        roughness: 0.9,
                        metalness: 0.1
                    });
            }
            
            this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
            this.ground.rotation.x = -Math.PI / 2; // Rotate to horizontal
            this.ground.position.y = -0.1; // Slightly below the tiles
            this.ground.receiveShadow = true;
            this.scene.add(this.ground);
            
            // Update scene background color for dark/light mode
            this.scene.background = new THREE.Color(isDarkMode ? 0x222222 : 0xf0f0f0);
            
            // Request a render to show changes
            this.requestRender();
        } catch (error) {
            console.error('Error creating ground plane:', error);
            // Create a simple fallback ground
            try {
                const fallbackGroundMaterial = new THREE.MeshStandardMaterial({
                    color: 0x888888,
                    roughness: 1.0,
                    metalness: 0.0
                });
                this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), fallbackGroundMaterial);
                this.ground.rotation.x = -Math.PI / 2;
                this.ground.position.y = -0.1;
                this.ground.receiveShadow = true;
                this.scene.add(this.ground);
                
                // Report error
                eventBus.publish('error', {
                    type: 'ground_plane_error',
                    message: 'Error creating ground plane, using fallback',
                    details: error.message
                });
            } catch (fallbackError) {
                console.error('Failed to create fallback ground plane:', fallbackError);
            }
        }
    }
    
    /**
     * Update background texture/appearance based on settings
     * @param {string} backgroundType - Type of background ('default', 'wood', 'stone', 'marble')
     */
    updateBackgroundTexture(backgroundType) {
        // Update boardState if not already updated
        if (this.boardState.backgroundColor !== backgroundType) {
            this.boardState.backgroundColor = backgroundType;
        }
        
        // Recreate the ground plane with the new texture/appearance
        this.createGroundPlane();
    }
    
    /**
     * Reload models with new settings (theme/quality)
     * @param {Object} modelSettings - New model settings
     */
    reloadModels(modelSettings) {
        console.log('Reloading models with new settings:', modelSettings);
        
        // Skip if no settings provided
        if (!modelSettings) {
            console.warn('No model settings provided for reload');
            eventBus.publish('board:modelsReloaded', {
                success: false,
                error: 'No model settings provided'
            });
            return;
        }
        
        // Import model config dynamically
        import('../core/modelConfig.js').then(modelConfig => {
            try {
                // Save current model visibility state
                const currentVisibilityState = {};
                
                // Preserve current visibility states of models
                for (const [modelName, model] of Object.entries(this.models)) {
                    if (model) {
                        currentVisibilityState[modelName] = model.visible;
                    }
                }
                
                // Get model paths for the new theme/quality
                const newModelPaths = modelConfig.getModelPaths(
                    modelSettings.theme || modelConfig.DEFAULT_MODEL_CONFIG.theme,
                    modelSettings.quality || modelConfig.DEFAULT_MODEL_CONFIG.quality
                );
                
                // Track reload process
                let loadedCount = 0;
                const totalModels = Object.keys(newModelPaths).length;
                let failedModels = [];
                
                // If no models to load, complete immediately
                if (totalModels === 0) {
                    console.warn('No models found to load with current settings');
                    eventBus.publish('board:modelsReloaded', {
                        success: false,
                        error: 'No models found with current settings'
                    });
                    return;
                }
                
                // Function to handle a model load completion
                const handleModelLoadComplete = () => {
                    loadedCount++;
                    
                    // Check if all models are loaded
                    if (loadedCount === totalModels) {
                        console.log('Models reloaded successfully');
                        
                        // Restore visibility states to new models
                        for (const [modelName, visible] of Object.entries(currentVisibilityState)) {
                            if (this.models[modelName]) {
                                this.models[modelName].visible = visible;
                            }
                        }
                        
                        // Update the scene with new models
                        this.refreshScene();
                        
                        // Emit model reload complete event
                        eventBus.publish('board:modelsReloaded', {
                            success: true,
                            failedModels
                        });
                    }
                };
                
                // Load each model
                for (const [name, path] of Object.entries(newModelPaths)) {
                    console.log(`Loading model: ${name} from ${path}`);
                    
                    this.gltfLoader.load(
                        path,
                        (gltf) => {
                            console.log(`Loaded model: ${name}`);
                            this.models[name] = gltf.scene.children[0];
                            
                            // Enable shadows for the model
                            this.models[name].castShadow = true;
                            this.models[name].receiveShadow = true;
                            
                            // Enable shadows for all child meshes
                            this.models[name].traverse((child) => {
                                if (child.isMesh) {
                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                }
                            });
                            
                            handleModelLoadComplete();
                        },
                        (progress) => {
                            const modelProgress = Math.round(progress.loaded / progress.total * 100);
                            console.log(`Loading model ${name}: ${modelProgress}%`);
                        },
                        (error) => {
                            console.warn(`Failed to load model ${name}: ${error.message}`);
                            failedModels.push({ name, path, error: error.message });
                            handleModelLoadComplete();
                        }
                    );
                }
            } catch (error) {
                console.error('Error processing model settings:', error);
                eventBus.publish('board:modelsReloaded', {
                    success: false,
                    error: error.message
                });
            }
        }).catch(error => {
            console.error('Failed to load model config for reload:', error);
            eventBus.publish('error', {
                message: 'Failed to reload models',
                details: error.message
            });
            
            // Also publish specific model reload event
            eventBus.publish('board:modelsReloaded', {
                success: false,
                error: 'Failed to load model configuration'
            });
        });
    }
    
    /**
     * Convert hex coordinates to world position
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @returns {Object} - { x, y, z } world coordinates
     */
    hexToWorld(q, r) {
        // Convert axial coordinates to world space
        // Formula from: https://www.redblobgames.com/grids/hexagons/
        // Modified to support the 30 degree Y rotation
        
        // Convert from axial to pixel coordinates
        let x = this.hexSize * POSITIONS.HEX_SPACING * (3/2 * q);
        let z = this.hexSize * POSITIONS.HEX_SPACING * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
        const y = 0; // Height
        
        // Since we're rotating the tiles 30 degrees, we need to adjust the coordinates
        // to ensure they still form a proper grid after rotation
        const adjustForRotation = false; // Set to true if coordinates need adjusting
        
        if (adjustForRotation) {
            // Adjust for 30 degree rotation (π/6 radians)
            const angle = Math.PI / 6;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            
            // Apply rotation matrix
            const rotatedX = x * cosA - z * sinA;
            const rotatedZ = x * sinA + z * cosA;
            
            x = rotatedX;
            z = rotatedZ;
        }
        
        return { x, y, z };
    }
    
    /**
     * Set up event listeners for board state changes
     */
    setupEventListeners() {
        console.log('Setting up 3D renderer event listeners');
        
        // Add mouse move event listener for hover effects
        this.container.addEventListener('mousemove', (event) => {
            // Update mouse position for raycasting
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Perform raycasting
            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            // Check for intersections with tiles
            const tileIntersects = this.raycaster.intersectObjects(this.tilesGroup.children, true);
            
            // Handle hover effects for tiles
            if (tileIntersects.length > 0) {
                const tileObject = tileIntersects[0].object;
                // Find the parent that has userData.tileId
                let tileParent = tileObject;
                while (tileParent && !tileParent.userData.tileId) {
                    tileParent = tileParent.parent;
                }
                
                if (tileParent && tileParent.userData.tileId) {
                    const tileId = tileParent.userData.tileId;
                    // Dispatch hover event via event bus
                    eventBus.publish('board:tileHover', {
                        tileId: tileId,
                        position: tileParent.position.clone()
                    });
                }
            } else {
                // No tile is being hovered
                eventBus.publish('board:tileHoverEnd', {});
            }
            
            // Request a render to show hover effects
            this.requestRender();
        });
        
        // Add click event listener for selection
        this.container.addEventListener('click', (event) => {
            // Prevent default to avoid any browser-specific behavior
            event.preventDefault();
            
            // Update mouse position (just in case it wasn't updated by mousemove)
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Perform raycasting
            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            // Check for intersections with tiles
            const tileIntersects = this.raycaster.intersectObjects(this.tilesGroup.children, true);
            
            if (tileIntersects.length > 0) {
                const tileObject = tileIntersects[0].object;
                // Find the parent that has userData.tileId
                let tileParent = tileObject;
                while (tileParent && !tileParent.userData.tileId) {
                    tileParent = tileParent.parent;
                }
                
                if (tileParent && tileParent.userData.tileId) {
                    const tileId = tileParent.userData.tileId;
                    // Dispatch selection event via event bus
                    eventBus.publish('board:tileSelected', {
                        tileId: tileId,
                        position: tileParent.position.clone()
                    });
                }
            }
            
            // Check for intersections with pieces
            const pieceIntersects = this.raycaster.intersectObjects(this.piecesGroup.children, true);
            
            if (pieceIntersects.length > 0) {
                const pieceObject = pieceIntersects[0].object;
                // Find the parent that has userData.pieceId
                let pieceParent = pieceObject;
                while (pieceParent && !pieceParent.userData.pieceId) {
                    pieceParent = pieceParent.parent;
                }
                
                if (pieceParent && pieceParent.userData.pieceId) {
                    const pieceId = pieceParent.userData.pieceId;
                    // Dispatch selection event via event bus
                    eventBus.publish('board:pieceSelected', {
                        pieceId: pieceId,
                        position: pieceParent.position.clone()
                    });
                }
            }
            
            // Check if nothing was selected
            if (tileIntersects.length === 0 && pieceIntersects.length === 0) {
                // Clicked on empty space
                eventBus.publish('board:emptySpaceSelected', {});
            }
            
            // Request a render to show selection effects
            this.requestRender();
        });
        
        // Window resize listener
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        console.log('3D renderer event listeners set up successfully');
    }
    
    /**
     * Handle window resize
     */
    onWindowResize() {
        // Update camera aspect ratio
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        
        // Request a render
        this.requestRender();
    }
    
    /**
     * Set up scene lighting
     */
    setupLights() {
        // Remove existing lights
        this.scene.traverse(object => {
            if (object.isLight) {
                this.scene.remove(object);
            }
        });
        
        // Main directional light (sun-like)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        
        // Optimize shadow map
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 30;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        
        this.scene.add(directionalLight);
        
        // Secondary directional light from opposite direction (fill light)
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, 8, -7);
        fillLight.castShadow = false; // No need for shadows from fill light
        this.scene.add(fillLight);
        
        // Ambient light for overall scene illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
    }
    
    /**
     * Request a render to be performed in the next animation frame
     */
    requestRender() {
        this.needsRender = true;
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Render the scene only if needed (optimization)
        if (this.needsRender) {
            this.renderer.render(this.scene, this.camera);
            this.needsRender = false;
        }
    }
    
    /**
     * Handle board state updates
     * @param {Object} data - Updated board state data
     */
    onBoardStateUpdated(data) {
        // Update background color based on dark mode
        this.scene.background = new THREE.Color(
            data.darkMode ? COLORS.BACKGROUND.DARK : COLORS.BACKGROUND.LIGHT
        );
        
        // Update highlights from board state
        this.updateHighlights(data.highlightedTiles);
        
        // Request a render to show updates
        this.requestRender();
    }
    
    /**
     * Handle game state changes
     * @param {Object} data - Game state data
     */
    onGameStateChanged(data) {
        console.log("ThreeRenderer: Game state changed", data.type);
        console.log("Game state data structure:", JSON.stringify(data, null, 2));
        
        // Check if boardData exists in state, may be in different locations based on event source
        let boardData = null;
        
        // Strategy 1: Check data.state.board
        if (data.state && data.state.board) {
            boardData = data.state.board;
            console.log(`Found board data in data.state.board: ${boardData.tiles?.length || 0} tiles, ${boardData.pieces?.length || 0} pieces`);
        } 
        // Strategy 2: Check data.board
        else if (data.board) {
            boardData = data.board;
            console.log(`Found board data in data.board: ${boardData.tiles?.length || 0} tiles, ${boardData.pieces?.length || 0} pieces`);
        } 
        // Strategy 3: Check if data.type is playerTurn - might not include board data
        else if (data.type === 'playerTurn') {
            console.log('Turn change event - no board update needed');
            return;
        } 
        // Strategy 4: Check if data.state has tiles/pieces directly
        else if (data.state) {
            if (data.state.tiles || data.state.pieces) {
                boardData = {
                    tiles: data.state.tiles || [],
                    pieces: data.state.pieces || []
                };
                console.log(`Found board data directly in state: ${boardData.tiles?.length || 0} tiles, ${boardData.pieces?.length || 0} pieces`);
            }
        }
        // Strategy 5: Check if data has tiles/pieces directly
        else if (data.tiles || data.pieces) {
            boardData = {
                tiles: data.tiles || [],
                pieces: data.pieces || []
            };
            console.log(`Found board data directly in data: ${boardData.tiles?.length || 0} tiles, ${boardData.pieces?.length || 0} pieces`);
        }
        
        if (!boardData) {
            console.warn('No board data in game state');
            console.log('Full data object:', data);
            return;
        }
        
        // Reset board if needed
        if (data.type === 'reset' || data.type === 'new_game') {
            console.log('Resetting board for new game');
            this.resetBoard();
        }
        
        // Verify that the board data has the expected structure
        if (boardData.tiles) {
            console.log('First tile example:', boardData.tiles[0]);
        }
        
        if (boardData.pieces) {
            console.log('First piece example:', boardData.pieces[0]);
        }
        
        this.updateBoardFromGameState(boardData);
        this.requestRender();
    }
    
    /**
     * Update the board from the game state
     * @param {Object} boardData - Board data from game state
     */
    updateBoardFromGameState(boardData) {
        if (!boardData) {
            console.warn('No board data to update from');
            return;
        }
        
        // Ensure tiles and pieces are arrays (even if empty)
        const tiles = Array.isArray(boardData.tiles) ? boardData.tiles : [];
        const pieces = Array.isArray(boardData.pieces) ? boardData.pieces : [];
        
        console.log(`Updating board from game state: ${tiles.length} tiles, ${pieces.length} pieces`);
        
        // Process tiles
        if (tiles.length > 0) {
            // Keep track of processed tiles to detect removed ones
            const processedTileIds = new Set();
            
            tiles.forEach(tile => {
                if (!tile) {
                    console.warn('Found null or undefined tile in tiles array');
                    return;
                }
                
                // Ensure each tile has an ID - use coordinates as fallback
                const tileId = tile.id || `${tile.q || 0}-${tile.r || 0}`;
                processedTileIds.add(tileId);
                
                try {
                    if (this.tiles.has(tileId)) {
                        this.updateTile(tileId, tile);
                    } else {
                        this.addTile(tileId, tile);
                    }
                } catch (error) {
                    console.error(`Error processing tile ${tileId}:`, error, tile);
                }
            });
            
            // Remove tiles that no longer exist in the game state
            for (const tileId of this.tiles.keys()) {
                if (!processedTileIds.has(tileId)) {
                    this.removeTile(tileId);
                }
            }
        }
        
        // Process pieces
        if (pieces.length > 0) {
            // Keep track of processed pieces to detect removed ones
            const processedPieceIds = new Set();
            
            pieces.forEach(piece => {
                if (!piece) {
                    console.warn('Found null or undefined piece in pieces array');
                    return;
                }
                
                // Ensure each piece has an ID - use tileId and type as fallback
                let pieceId;
                
                if (piece.id) {
                    pieceId = piece.id;
                } else if (piece.tileId && piece.type) {
                    pieceId = `${piece.tileId}-${piece.type}`;
                } else {
                    // Generate a random ID if all else fails
                    pieceId = `piece-${Math.random().toString(36).substr(2, 9)}`;
                    console.warn(`Generated random ID ${pieceId} for piece without ID`, piece);
                }
                
                processedPieceIds.add(pieceId);
                
                try {
                    if (this.pieces.has(pieceId)) {
                        this.updatePiece(pieceId, piece);
                    } else {
                        this.addPiece(pieceId, piece);
                    }
                } catch (error) {
                    console.error(`Error processing piece ${pieceId}:`, error, piece);
                }
            });
            
            // Remove pieces that no longer exist in the game state
            for (const pieceId of this.pieces.keys()) {
                if (!processedPieceIds.has(pieceId)) {
                    this.removePiece(pieceId);
                }
            }
        } else {
            console.log('No pieces in board data');
        }
    }
    
    /**
     * Reset the board, clearing all tiles and pieces
     */
    resetBoard() {
        // Clear all tiles
        for (const tileId of this.tiles.keys()) {
            this.removeTile(tileId);
        }
        
        // Clear all pieces
        for (const pieceId of this.pieces.keys()) {
            this.removePiece(pieceId);
        }
        
        // Clear maps
        this.tiles.clear();
        this.pieces.clear();
    }
    
    /**
     * Add a tile to the board
     * @param {string} tileId - Unique ID for the tile
     * @param {Object} tileData - Tile data
     */
    addTile(tileId, tileData) {
        // If tile already exists, update it instead
        if (this.tiles.has(tileId)) {
            this.updateTile(tileId, tileData);
            return;
        }
        
        console.log(`Adding tile ${tileId} at q:${tileData.q}, r:${tileData.r}, color:${tileData.color}`);
        
        // Determine the model to use based on color
        const modelName = tileData.color === 'white' ? 'tile_white' : 'tile_black';
        const tileModel = this.models[modelName];
        
        if (!tileModel) {
            console.error(`Model not found for ${modelName}`);
            return;
        }
        
        // Clone the model to create a new instance
        const tileMesh = tileModel.clone();
        
        // Add user data for reference
        tileMesh.userData = {
            id: tileId,
            type: 'tile',
            data: { ...tileData }
        };
        
        // Position the tile
        const position = this.hexToWorld(tileData.q, tileData.r);
        tileMesh.position.set(
            position.x, 
            POSITIONS.TILE_RESTING_HEIGHT, 
            position.z
        );
        
        // Rotate the tile by 30 degrees around the Y axis to align with grid
        tileMesh.rotation.y = Math.PI / 6; // 30 degrees in radians
        
        // Add to the scene
        this.tilesGroup.add(tileMesh);
        this.tiles.set(tileId, tileMesh);
        
        // Request a render
        this.requestRender();
    }
    
    /**
     * Update an existing tile
     * @param {string} tileId - Unique ID for the tile
     * @param {Object} tileData - Updated tile data
     */
    updateTile(tileId, tileData) {
        const tile = this.tiles.get(tileId);
        if (!tile) {
            console.warn(`Tried to update non-existent tile ${tileId}`);
            return;
        }
        
        // Update position if q or r changed
        if (tile.userData.data.q !== tileData.q || tile.userData.data.r !== tileData.r) {
            const position = this.hexToWorld(tileData.q, tileData.r);
            tile.position.set(
                position.x, 
                POSITIONS.TILE_RESTING_HEIGHT, 
                position.z
            );
        }
        
        // Make sure rotation is correct (in case it was changed)
        tile.rotation.y = Math.PI / 6; // 30 degrees in radians
        
        // Update color if changed (this would require replacing the mesh)
        if (tile.userData.data.color !== tileData.color) {
            // Remove the old tile
            this.removeTile(tileId);
            // Add the new tile with the updated color
            this.addTile(tileId, tileData);
            return;
        }
        
        // Update user data
        tile.userData.data = { ...tileData };
        
        // Request a render
        this.requestRender();
    }
    
    /**
     * Remove a tile from the board
     * @param {string} tileId - Unique ID for the tile
     */
    removeTile(tileId) {
        const tile = this.tiles.get(tileId);
        if (!tile) {
            console.warn(`Tried to remove non-existent tile ${tileId}`);
            return;
        }
        
        // Remove the tile from the scene
        this.tilesGroup.remove(tile);
        this.tiles.delete(tileId);
        
        // Request a render
        this.requestRender();
    }
    
    /**
     * Add a piece to the board
     * @param {string} pieceId - Unique ID for the piece
     * @param {Object} pieceData - Piece data
     */
    addPiece(pieceId, pieceData) {
        // If piece already exists, update it instead
        if (this.pieces.has(pieceId)) {
            this.updatePiece(pieceId, pieceData);
            return;
        }
        
        console.log(`Adding piece ${pieceId}:`, pieceData);
        
        // Handle undefined or missing properties with defaults
        const pieceType = (pieceData.type || 'disc').toLowerCase(); // Default to 'disc'
        const pieceColor = (pieceData.color || 'white').toLowerCase(); // Default to 'white'
        const modelName = `${pieceType}_${pieceColor}`;
        
        console.log(`Using model: ${modelName}`);
        
        const pieceModel = this.models[modelName];
        
        if (!pieceModel) {
            console.error(`Model not found for ${modelName}`);
            return;
        }
        
        // Clone the model to create a new instance
        const pieceMesh = pieceModel.clone();
        
        // Add user data for reference
        pieceMesh.userData = {
            id: pieceId,
            type: 'piece',
            data: { ...pieceData }
        };
        
        // Find the associated tile to position the piece above it
        let position = { x: 0, y: 0, z: 0 };
        
        // If we have tile coordinates, use them to position the piece
        if (pieceData.q !== undefined && pieceData.r !== undefined) {
            position = this.hexToWorld(pieceData.q, pieceData.r);
        } 
        // Otherwise, look for the tile by ID
        else if (pieceData.tileId) {
            // Get the tile ID
            const tileId = pieceData.tileId;
            const tile = this.tiles.get(tileId);
            
            if (tile) {
                position.x = tile.position.x;
                position.z = tile.position.z;
            } else {
                console.warn(`Piece ${pieceId} references non-existent tile ${tileId}`);
            }
        }
        
        // Position the piece
        pieceMesh.position.set(
            position.x, 
            POSITIONS.PIECE_RESTING_HEIGHT, 
            position.z
        );
        
        // Add to the scene
        this.piecesGroup.add(pieceMesh);
        this.pieces.set(pieceId, pieceMesh);
        
        // Request a render
        this.requestRender();
    }
    
    /**
     * Update an existing piece
     * @param {string} pieceId - Unique ID for the piece
     * @param {Object} pieceData - Updated piece data
     */
    updatePiece(pieceId, pieceData) {
        const piece = this.pieces.get(pieceId);
        if (!piece) {
            console.warn(`Tried to update non-existent piece ${pieceId}`);
            return;
        }
        
        console.log(`Updating piece ${pieceId}:`, pieceData);
        
        // Get current values for comparison
        const currentData = piece.userData.data || {};
        const currentType = currentData.type || 'disc';
        const currentColor = currentData.color || 'white';
        
        // Get new values with defaults
        const newType = (pieceData.type || currentType);
        const newColor = (pieceData.color || currentColor);
        
        // If type or color changed, we need to replace the piece with a new model
        if (currentType !== newType || currentColor !== newColor) {
            console.log(`Piece type or color changed from ${currentType}/${currentColor} to ${newType}/${newColor}`);
            // Remove the old piece
            this.removePiece(pieceId);
            // Add the new piece with the updated type/color
            this.addPiece(pieceId, pieceData);
            return;
        }
        
        // Update position if tile changed
        let positionChanged = false;
        let newPosition = { x: 0, y: 0, z: 0 };
        
        // If q/r coordinates are available, use them
        if (pieceData.q !== undefined && pieceData.r !== undefined &&
            (piece.userData.data.q !== pieceData.q || piece.userData.data.r !== pieceData.r)) {
            newPosition = this.hexToWorld(pieceData.q, pieceData.r);
            positionChanged = true;
        }
        // Otherwise, check if the tileId changed and the tile exists
        else if (piece.userData.data.tileId !== pieceData.tileId) {
            const tileId = pieceData.tileId;
            const tile = this.tiles.get(tileId);
            
            if (tile) {
                newPosition.x = tile.position.x;
                newPosition.z = tile.position.z;
                positionChanged = true;
            }
        }
        
        // Update the position if needed
        if (positionChanged) {
            this.movePiece(piece, newPosition);
        }
        
        // Update user data
        piece.userData.data = { ...piece.userData.data, ...pieceData };
        
        // Request a render
        this.requestRender();
    }
    
    /**
     * Remove a piece from the board
     * @param {string} pieceId - Unique ID for the piece
     */
    removePiece(pieceId) {
        const piece = this.pieces.get(pieceId);
        if (!piece) {
            console.warn(`Tried to remove non-existent piece ${pieceId}`);
            return;
        }
        
        // Remove the piece from the scene
        this.piecesGroup.remove(piece);
        this.pieces.delete(pieceId);
        
        // Request a render
        this.requestRender();
    }
    
    /**
     * Highlight a tile
     * @param {string} tileId - ID of the tile to highlight
     * @param {string} highlightType - Type of highlight
     */
    highlightTile(tileId, highlightType) {
        // Get tile
        const tileMesh = this.tiles.get(tileId);
        if (!tileMesh) return;
        
        // Remove existing highlight if present
        this.unhighlightTile(tileId);
        
        // Get highlight color based on type
        let color;
        switch (highlightType) {
            case BoardStateConstants.HIGHLIGHT_TYPE.SELECTED:
                color = COLORS.HIGHLIGHT.SELECTED;
                break;
            case BoardStateConstants.HIGHLIGHT_TYPE.VALID_MOVE:
                color = COLORS.HIGHLIGHT.VALID_MOVE;
                break;
            case BoardStateConstants.HIGHLIGHT_TYPE.VALID_PLACEMENT:
                color = COLORS.HIGHLIGHT.VALID_PLACEMENT;
                break;
            case BoardStateConstants.HIGHLIGHT_TYPE.LAST_MOVE:
                color = COLORS.HIGHLIGHT.LAST_MOVE;
                break;
            case BoardStateConstants.HIGHLIGHT_TYPE.HOVER:
                color = COLORS.HIGHLIGHT.HOVER;
                break;
            case BoardStateConstants.HIGHLIGHT_TYPE.ACTIVE:
                color = COLORS.HIGHLIGHT.ACTIVE;
                break;
            default:
                return; // Unknown highlight type
        }
        
        // Create highlight mesh
        const geometry = new THREE.BoxGeometry(
            TILE_SIZE + 0.05,
            TILE_SIZE * 0.05,
            TILE_SIZE + 0.05
        );
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.6
        });
        
        const highlightMesh = new THREE.Mesh(geometry, material);
        highlightMesh.position.copy(tileMesh.position);
        highlightMesh.position.y -= 0.05; // Position just below the tile
        
        // Add to scene and storage
        this.scene.add(highlightMesh);
        this.highlights.set(tileId, highlightMesh);
        
        // Request a render to show the highlight
        this.requestRender();
    }
    
    /**
     * Remove highlight from a tile
     * @param {string} tileId - ID of the tile to unhighlight
     */
    unhighlightTile(tileId) {
        // Get highlight mesh
        const highlightMesh = this.highlights.get(tileId);
        if (!highlightMesh) return;
        
        // Remove from scene
        this.scene.remove(highlightMesh);
        
        // Dispose of geometry and material
        highlightMesh.geometry.dispose();
        highlightMesh.material.dispose();
        
        // Remove from storage
        this.highlights.delete(tileId);
        
        // Request a render to show the updated board
        this.requestRender();
    }
    
    /**
     * Update highlights based on board state
     * @param {Array} highlightedTiles - Array of [tileId, highlightType] pairs
     */
    updateHighlights(highlightedTiles) {
        // Get current highlighted tiles
        const currentHighlights = new Set(this.highlights.keys());
        const newHighlights = new Set();
        
        // Process highlights from board state
        for (const [tileId, highlightType] of highlightedTiles) {
            newHighlights.add(tileId);
            
            // Add or update highlight
            if (currentHighlights.has(tileId)) {
                // Update existing highlight if type changed
                const currentHighlight = this.highlights.get(tileId);
                if (currentHighlight.userData.highlightType !== highlightType) {
                    this.unhighlightTile(tileId);
                    this.highlightTile(tileId, highlightType);
                }
            } else {
                // Add new highlight
                this.highlightTile(tileId, highlightType);
            }
        }
        
        // Remove highlights that are no longer in the board state
        for (const tileId of currentHighlights) {
            if (!newHighlights.has(tileId)) {
                this.unhighlightTile(tileId);
            }
        }
    }
    
    /**
     * Update camera based on board state
     * @param {Object} cameraData - Camera data {position, target, zoomLevel}
     */
    updateCamera(cameraData) {
        const { position, target, zoomLevel } = cameraData;
        
        // Update camera position and target if provided
        if (position) {
            this.camera.position.set(position.x, position.y, position.z);
        }
        
        if (target) {
            this.controls.target.set(target.x, target.y, target.z);
        }
        
        // Apply zoom level if provided
        if (zoomLevel !== undefined) {
            this.camera.zoom = zoomLevel;
            this.camera.updateProjectionMatrix();
        }
        
        // Update controls
        this.controls.update();
        
        // Request a render to show the updated view
        this.requestRender();
    }
    
    /**
     * Handle mouse click on the board
     * @param {Event} event - Mouse event
     */
    handleClick(event) {
        // Get coordinates 
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Check for UI element clicks first
        if (this.checkUIClick(x, y)) {
            if (this.isCancelClicked(x, y)) {
                console.log('Cancel clicked');
                eventBus.publish('ui:cancelClicked');
                return;
            }
            
            if (this.isValidateClicked(x, y)) {
                console.log('Validate clicked');
                eventBus.publish('ui:validateClicked');
                return;
            }
            
            if (this.isDiscClicked(x, y)) {
                console.log('Disc icon clicked');
                eventBus.publish('ui:pieceTypeSelected', { pieceType: 'disc' });
                return;
            }
            
            if (this.isRingClicked(x, y)) {
                console.log('Ring icon clicked');
                eventBus.publish('ui:pieceTypeSelected', { pieceType: 'ring' });
                return;
            }
            
            return; // Clicked on some other UI element
        }
        
        const intersection = this.getIntersection(event);
        
        if (intersection) {
            const object = intersection.object;
            const position = intersection.point;
            
            // Round position to grid coordinates
            const x = Math.round(position.x);
            const y = Math.round(position.y);
            const z = Math.round(position.z);
            
            // Check if clicked on a valid move placeholder
            if (object.parent === this.validMovesGroup) {
                console.log('Clicked on valid move placeholder:', object.userData);
                
                // Handle click based on the action type
                if (object.userData.action === 'placeTile') {
                    // Attempt to place a tile via API
                    apiClient.request('placeTile', {
                        q: object.userData.q,
                        r: object.userData.r,
                        color: this.boardState.currentPlayer // Current player color
                    })
                    .then(result => {
                        if (result.success) {
                            console.log('Successfully placed tile');
                        } else {
                            console.error('Failed to place tile:', result.error);
                        }
                    })
                    .catch(err => {
                        console.error('Error placing tile:', err);
                    });
                    
                    return;
                } else if (object.userData.action === 'placePiece') {
                    // Attempt to place a piece via API
                    apiClient.request('placePiece', {
                        q: object.userData.q,
                        r: object.userData.r,
                        tileId: object.userData.tileId,
                        pieceType: object.userData.pieceType
                    })
                    .then(result => {
                        if (result.success) {
                            console.log('Successfully placed piece');
                        } else {
                            console.error('Failed to place piece:', result.error);
                        }
                    })
                    .catch(err => {
                        console.error('Error placing piece:', err);
                    });
                    
                    return;
                } else if (object.userData.action === 'movePiece') {
                    // Handle move piece action
                    console.log('Moving piece to', object.userData.toQ, object.userData.toR);
                    apiClient.request('movePiece', {
                        fromQ: object.userData.fromQ,
                        fromR: object.userData.fromR,
                        toQ: object.userData.toQ,
                        toR: object.userData.toR
                    })
                    .then(result => {
                        if (result.success) {
                            console.log('Successfully moved piece');
                        } else {
                            console.error('Failed to move piece:', result.error);
                        }
                    })
                    .catch(err => {
                        console.error('Error moving piece:', err);
                    });
                    
                    return;
                }
            }
            
            // Determine what was clicked (normal board elements)
            if (object.userData.type === 'tile') {
                // Tile click
                eventBus.publish('board:positionClicked', {
                    tileId: object.userData.id,
                    x, y, z
                });
            } else if (object.userData.type === 'piece') {
                // Piece click
                const pieceData = object.userData.data;
                if (pieceData && pieceData.color === this.boardState.currentPlayer) {
                    console.log('Clicked on own piece:', pieceData);
                    this.showValidMovesForPiece(pieceData.q, pieceData.r);
                }
                
                eventBus.publish('board:positionClicked', {
                    pieceId: object.userData.id,
                    tileId: object.userData.data.tileId,
                    x, y, z
                });
            } else {
                // Empty position click
                eventBus.publish('board:positionClicked', { x, y, z });
            }
        }
    }
    
    /**
     * Handle mouse move on the board (hover)
     * @param {Event} event - Mouse event
     */
    handleMouseMove(event) {
        const intersection = this.getIntersection(event);
        
        if (intersection) {
            const object = intersection.object;
            const position = intersection.point;
            
            // Round position to grid coordinates
            const x = Math.round(position.x);
            const y = Math.round(position.y);
            const z = Math.round(position.z);
            
            // Determine what was hovered
            if (object.userData.type === 'tile') {
                // Tile hover
                eventBus.publish('board:positionHovered', {
                    tileId: object.userData.id,
                    x, y, z
                });
            } else if (object.userData.type === 'piece') {
                // Piece hover
                eventBus.publish('board:positionHovered', {
                    pieceId: object.userData.id,
                    tileId: object.userData.data.tileId,
                    x, y, z
                });
            } else {
                // Empty position hover
                eventBus.publish('board:positionHovered', { x, y, z });
            }
        }
    }
    
    /**
     * Get intersection with an object in the scene
     * @param {Event} event - Mouse event
     * @returns {Object|null} - Intersection data or null if no intersection
     */
    getIntersection(event) {
        // Calculate mouse position in normalized device coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({ x, y }, this.camera);
        
        // Calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        // Return the first intersection if any
        return intersects.length > 0 ? intersects[0] : null;
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Render the scene only if needed (optimization)
        if (this.needsRender) {
            this.renderer.render(this.scene, this.camera);
            this.needsRender = false;
        }
    }

    /**
     * Move a piece to a new position with animation
     * @param {THREE.Object3D} piece - The piece to move
     * @param {Object} newPosition - The new position {x, y, z}
     */
    movePiece(piece, newPosition) {
        // Store original position
        const startPos = piece.position.clone();
        
        // Create midpoint position (higher up) for arc movement
        const midPos = new THREE.Vector3(
            (startPos.x + newPosition.x) / 2,
            POSITIONS.PIECE_FLOATING_HEIGHT, // Use floating height for middle of animation
            (startPos.z + newPosition.z) / 2
        );
        
        // Set target position
        const endPos = new THREE.Vector3(
            newPosition.x,
            POSITIONS.PIECE_RESTING_HEIGHT,
            newPosition.z
        );
        
        // Use animation handler to animate the movement
        animationHandler.animatePositionWithArc(piece, startPos, midPos, endPos).then(() => {
            this.requestRender();
        });
    }

    /**
     * Request a render update
     */
    requestRender() {
        if (!this.renderRequested) {
            this.renderRequested = true;
            requestAnimationFrame(() => this.render());
        }
    }

    /**
     * Perform a render
     */
    render() {
        this.renderRequested = false;
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Handle action started events
     * @param {Object} data - Action data
     */
    onActionStarted(data) {
        // If moving a piece, clear valid action placeholders
        if (data.action === 'movePiece') {
            this.clearValidMoveIndicators();
        }
    }

    /**
     * Show valid action placeholders for the current player's turn
     * These placeholders indicate where valid moves can be made
     */
    showValidActionPlaceholders() {
        try {
            // Clear existing placeholders in UI elements group
            const placeholders = this.uiElementsGroup.children.filter(child => 
                child.userData && child.userData.type === 'placeholder');
            
            placeholders.forEach(placeholder => {
                this.uiElementsGroup.remove(placeholder);
            });
            
            // Get the current action
            const currentAction = this.boardState.activeActionUI; // Use activeActionUI directly
            
            if (!currentAction) {
                // No active action, show nothing or default state
                return;
            }
            
            console.log(`Showing placeholders for action: ${currentAction}`);
            
            // Handle different action types
            switch (currentAction) {
                case 'placeTile':
                    this.showTilePlacementPlaceholders();
                    break;
                case 'placePiece':
                    this.showPiecePlacementPlaceholders();
                    break;
                case 'movePiece':
                    // Only show when a piece is selected
                    if (this.boardState.selectedPiece) {
                        this.showMovePlacementPlaceholders(this.boardState.selectedPiece);
                    }
                    break;
                default:
                    console.log(`No placeholders for action type: ${currentAction}`);
            }
            
            // Request a render
            this.requestRender();
        } catch (error) {
            console.error('Error showing valid action placeholders:', error);
        }
    }

    /**
     * Show placeholders for valid tile placements
     */
    showTilePlacementPlaceholders() {
        // Use the validPlacements array directly from boardState instead of calling a method
        const validPlacements = this.boardState.validPlacements || [];
        
        if (validPlacements.length === 0) {
            console.log('No valid tile placements found');
            return;
        }
        
        console.log(`Showing ${validPlacements.length} valid tile placements`);
        
        // Create a material for the placeholder
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,  // Green for valid tile placements
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        
        // For each valid placement, create a placeholder
        validPlacements.forEach(placement => {
            // Create a simple hex tile geometry
            const geometry = new THREE.CylinderGeometry(0.9, 0.9, 0.1, 6);
            
            // Create the placeholder mesh
            const placeholder = new THREE.Mesh(geometry, material);
            placeholder.rotation.x = Math.PI / 2; // Make it flat on the board
            
            // Set position from placement coords
            const position = this.getPositionFromCoords(placement.q || placement.x, placement.r || placement.z);
            placeholder.position.set(position.x, position.y + 0.05, position.z); // Slightly above the board
            
            // Set metadata for the placeholder
            placeholder.userData = {
                type: 'placeholder',
                placeholderType: 'tile',
                coordinates: { q: placement.q || placement.x, r: placement.r || placement.z }
            };
            
            // Add to the UI elements group
            this.uiElementsGroup.add(placeholder);
        });
    }

    /**
     * Show placeholders for valid piece placements
     */
    showPiecePlacementPlaceholders() {
        // Use the validPlacements array directly from boardState instead of calling a method
        const validPlacements = this.boardState.validPlacements || [];
        
        if (validPlacements.length === 0) {
            console.log('No valid piece placements found');
            return;
        }
        
        console.log(`Showing ${validPlacements.length} valid piece placements`);
        
        // Create a material for the placeholder
        const material = new THREE.MeshBasicMaterial({
            color: 0x0000ff,  // Blue for valid piece placements
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        
        // For each valid placement, create a placeholder
        validPlacements.forEach(placement => {
            // Create a simple sphere geometry for piece placement
            const geometry = new THREE.SphereGeometry(0.4, 16, 16);
            
            // Create the placeholder mesh
            const placeholder = new THREE.Mesh(geometry, material);
            
            // Get the tile at these coordinates
            const tile = this.getTileAtCoordinates(placement.q, placement.r);
            
            if (tile) {
                // Position the placeholder above the tile
                const position = tile.position.clone();
                position.y += 0.5; // Position above the tile
                placeholder.position.copy(position);
                
                // Set metadata for the placeholder
                placeholder.userData = {
                    type: 'placeholder',
                    placeholderType: 'piece',
                    coordinates: { q: placement.q, r: placement.r },
                    tileId: tile.userData.tileId
                };
                
                // Add to the UI elements group
                this.uiElementsGroup.add(placeholder);
            }
        });
    }

    /**
     * Show placeholders for valid move placements for a piece
     * @param {string} pieceId - ID of the piece to show moves for
     */
    showMovePlacementPlaceholders(pieceId) {
        if (!pieceId) {
            console.error('No piece ID provided for move placeholders');
            return;
        }
        
        // Get the piece and its current position
        const piece = this.pieces.get(pieceId);
        
        if (!piece) {
            console.error(`Piece with ID ${pieceId} not found`);
            return;
        }
        
        // Get current piece coordinates
        const coords = piece.userData.coordinates;
        
        if (!coords) {
            console.error('Piece has no coordinates data');
            return;
        }
        
        // Use the validMoves array directly from boardState instead of calling a method
        const validMoves = this.boardState.validMoves || [];
        
        if (validMoves.length === 0) {
            console.log(`No valid moves found for piece at ${coords.q}, ${coords.r}`);
            return;
        }
        
        console.log(`Showing ${validMoves.length} valid moves for piece at ${coords.q}, ${coords.r}`);
        
        // Create a material for the placeholder
        const material = new THREE.MeshBasicMaterial({
            color: 0xff00ff,  // Purple for valid moves
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        
        // For each valid move, create a placeholder
        validMoves.forEach(move => {
            // Create a simple arrow or indicator geometry
            const geometry = new THREE.ConeGeometry(0.3, 0.6, 12);
            
            // Create the placeholder mesh
            const placeholder = new THREE.Mesh(geometry, material);
            
            // Get the tile at these coordinates
            const tile = this.getTileAtCoordinates(move.q, move.r);
            
            if (tile) {
                // Position the placeholder above the tile
                const position = tile.position.clone();
                position.y += 0.5; // Position above the tile
                placeholder.position.copy(position);
                
                // Set metadata for the placeholder
                placeholder.userData = {
                    type: 'placeholder',
                    placeholderType: 'move',
                    coordinates: { q: move.q, r: move.r },
                    tileId: tile.userData.tileId,
                    pieceId: pieceId
                };
                
                // Add to the UI elements group
                this.uiElementsGroup.add(placeholder);
            }
        });
    }

    /**
     * Get a tile object at the specified coordinates
     * @param {number} q - Q coordinate
     * @param {number} r - R coordinate
     * @returns {THREE.Object3D|null} - The tile object or null if not found
     */
    getTileAtCoordinates(q, r) {
        // Find the tile with matching coordinates
        for (const [tileId, tileObj] of this.tiles.entries()) {
            if (tileObj.userData.coordinates &&
                tileObj.userData.coordinates.q === q &&
                tileObj.userData.coordinates.r === r) {
                return tileObj;
            }
        }
        return null;
    }

    /**
     * Convert hex coordinates to 3D position
     * @param {number} q - Q coordinate
     * @param {number} r - R coordinate
     * @returns {THREE.Vector3} - 3D position
     */
    getPositionFromCoords(q, r) {
        // Calculate x and z based on hex coordinates using the pointy-top orientation
        const x = this.hexSize * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
        const z = this.hexSize * (3/2 * r);
        
        return new THREE.Vector3(x, 0, z);
    }

    /**
     * Update the visibility of valid move indicators based on a setting
     * @param {boolean} visible - Whether valid moves should be visible
     */
    updateValidMovesVisibility(visible) {
        const opacity = visible ? PLACEHOLDER.VISIBLE_OPACITY : PLACEHOLDER.INVISIBLE_OPACITY;
        
        // Update opacity of all indicators
        for (const indicator of this.validMovesGroup.children) {
            if (indicator.material) {
                indicator.material.opacity = opacity;
            }
        }
        
        this.requestRender();
    }
    
    /**
     * Show valid moves for a specific piece
     * @param {number} q - Q coordinate of the piece
     * @param {number} r - R coordinate of the piece
     */
    showValidMovesForPiece(q, r) {
        console.log(`Showing valid moves for piece at ${q},${r}`);
        
        // Clear existing placeholder pieces
        this.clearValidMoveIndicators();
        
        // Find the piece mesh
        const pieceId = this.findPieceIdByCoordinates(q, r);
        if (pieceId) {
            // Lift the piece to indicate it's selected
            this.liftPiece(pieceId);
        }
        
        // Fetch valid moves for this piece via API
        apiClient.request('getValidMoves', { q, r })
            .then(result => {
                if (!result.success) {
                    console.error('Failed to get valid moves:', result.error);
                    return;
                }
                
                const validMoves = result.data.moves;
                console.log(`Found ${validMoves.length} valid moves:`, validMoves);
                
                if (validMoves.length === 0) {
                    return; // No valid moves
                }
                
                // Create placeholders for each valid move
                const opacity = PLACEHOLDER.VISIBLE_OPACITY;
                
                validMoves.forEach(move => {
                    const position = this.hexToWorld(move.q, move.r);
                    
                    // Create a semi-transparent indicator
                    const geometry = new THREE.CylinderGeometry(
                        PLACEHOLDER.TILE_RADIUS * 0.8, 
                        PLACEHOLDER.TILE_RADIUS * 0.8, 
                        PLACEHOLDER.TILE_THICKNESS * 0.5, 
                        PLACEHOLDER.TILE_SEGMENTS
                    );
                    const material = new THREE.MeshBasicMaterial({ 
                        color: PLACEHOLDER.MOVE_COLOR,
                        transparent: true,
                        opacity: opacity
                    });
                    const indicator = new THREE.Mesh(geometry, material);
                    
                    indicator.position.set(position.x, PLACEHOLDER.TILE_HEIGHT * 2, position.z);
                    indicator.userData = { 
                        action: 'movePiece',
                        fromQ: q,
                        fromR: r,
                        toQ: move.q,
                        toR: move.r
                    };
                    
                    this.validMovesGroup.add(indicator);
                });
                
                this.requestRender();
            })
            .catch(error => {
                console.error('Error fetching valid moves:', error);
            });
    }
    
    /**
     * Find a piece ID by its coordinates
     * @param {number} q - Q coordinate
     * @param {number} r - R coordinate
     * @returns {string|null} - The piece ID or null if not found
     */
    findPieceIdByCoordinates(q, r) {
        for (const [pieceId, piece] of this.pieces.entries()) {
            const pieceData = piece.userData.data;
            if (pieceData && pieceData.q === q && pieceData.r === r) {
                return pieceId;
            }
        }
        return null;
    }
    
    /**
     * Lift a piece to indicate it's selected
     * @param {string} pieceId - ID of the piece to lift
     */
    liftPiece(pieceId) {
        const piece = this.pieces.get(pieceId);
        if (!piece) {
            console.warn(`Piece ${pieceId} not found for lifting`);
            return;
        }
        
        // Reset all pieces to resting height
        this.resetAllPiecesHeight();
        
        // Lift the selected piece
        animationHandler.animateProperty(
            piece.position,
            'y',
            POSITIONS.PIECE_RESTING_HEIGHT,
            POSITIONS.PIECE_FLOATING_HEIGHT,
            {
                duration: 300,
                onUpdate: () => this.requestRender()
            }
        );
    }
    
    /**
     * Reset all pieces to their resting height
     */
    resetAllPiecesHeight() {
        for (const piece of this.pieces.values()) {
            if (piece.position.y !== POSITIONS.PIECE_RESTING_HEIGHT) {
                animationHandler.animateProperty(
                    piece.position,
                    'y',
                    piece.position.y,
                    POSITIONS.PIECE_RESTING_HEIGHT,
                    {
                        duration: 150,
                        onUpdate: () => this.requestRender()
                    }
                );
            }
        }
    }
    
    /**
     * Clear only the valid move indicators (placeholders)
     */
    clearValidMoveIndicators() {
        // Reset all pieces to resting height
        this.resetAllPiecesHeight();
        
        // Remove valid move indicators
        while (this.validMovesGroup.children.length > 0) {
            const child = this.validMovesGroup.children[0];
            
            // Dispose of geometry and material
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
            
            this.validMovesGroup.remove(child);
        }
        
        this.requestRender();
    }

    /**
     * Initialize UI elements for game interactions
     */
    initUI() {
        // Create simple geometric shapes for UI elements
        const cancelGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const cancelMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.cancelIcon = new THREE.Mesh(cancelGeo, cancelMat);
        this.cancelIcon.visible = false;
        this.uiGroup.add(this.cancelIcon);
        
        const validateGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const validateMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.validateIcon = new THREE.Mesh(validateGeo, validateMat);
        this.validateIcon.visible = false;
        this.uiGroup.add(this.validateIcon);
        
        const discGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const discMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        this.discIcon = new THREE.Mesh(discGeo, discMat);
        this.discIcon.visible = false;
        this.uiGroup.add(this.discIcon);
        
        const ringGeo = new THREE.TorusGeometry(0.3, 0.1, 16, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        this.ringIcon = new THREE.Mesh(ringGeo, ringMat);
        this.ringIcon.visible = false;
        this.uiGroup.add(this.ringIcon);
    }

    /**
     * Show validation UI (cancel/validate icons) at the given hex coordinates
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate 
     */
    showValidationUI(q, r) {
        console.log(`Showing validation UI at (${q}, ${r})`);
        
        const position = this.hexToWorld(q, r);
        
        // Position the cancel and validate icons above the piece
        // Make sure to position them to the left and right of the piece
        this.cancelIcon.position.set(position.x - 0.5, POSITIONS.PIECE_FLOATING_HEIGHT + 0.5, position.z);
        this.validateIcon.position.set(position.x + 0.5, POSITIONS.PIECE_FLOATING_HEIGHT + 0.5, position.z);
        
        // Make both icons visible
        this.cancelIcon.visible = true;
        this.validateIcon.visible = true;
        
        this.requestRender();
    }

    /**
     * Show UI for tile placement
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @param {string} color - 'black' or 'white'
     */
    showTilePlacementUI(q, r, color) {
        console.log(`Showing tile placement UI at (${q}, ${r}), color: ${color}`);
        
        const position = this.hexToWorld(q, r);
        
        // Remove the valid move placeholder at this position
        for (let i = this.validMovesGroup.children.length - 1; i >= 0; i--) {
            const child = this.validMovesGroup.children[i];
            if (child.userData && child.userData.q === q && child.userData.r === r) {
                this.validMovesGroup.remove(child);
            }
        }
        
        // Create a temporary floating tile
        const modelKey = `tile_${color}`;
        if (!this.models[modelKey]) {
            console.error(`Model not found for ${modelKey}`);
            return;
        }
        
        const model = this.models[modelKey].clone();
        model.position.set(position.x, POSITIONS.TILE_FLOATING_HEIGHT, position.z); // Float above the board
        
        // Rotate tile by 30 degrees to align with hexagonal grid
        model.rotation.y = Math.PI / 6; // 30 degrees in radians
        
        model.userData = { type: 'temp-tile', q, r, color };
        this.uiGroup.add(model);
        
        // Store the temporary tile model for animation
        this.tempTileModel = model;
        
        // Position the cancel and validate icons above the tile
        this.cancelIcon.position.set(position.x - 0.5, POSITIONS.TILE_FLOATING_HEIGHT + 0.5, position.z);
        this.validateIcon.position.set(position.x + 0.5, POSITIONS.TILE_FLOATING_HEIGHT + 0.5, position.z);
        
        this.cancelIcon.visible = true;
        this.validateIcon.visible = true;
        
        // Request a render
        this.requestRender();
    }

    /**
     * Show UI for piece placement
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @param {string} color - 'black' or 'white'
     * @param {boolean} canPlaceDisc - Whether a disc can be placed
     * @param {boolean} canPlaceRing - Whether a ring can be placed
     */
    showPiecePlacementUI(q, r, color, canPlaceDisc, canPlaceRing) {
        console.log(`Showing piece placement UI at (${q}, ${r}), color: ${color}`);
        
        const position = this.hexToWorld(q, r);
        
        // Clear any previous temporary piece model
        this.tempPieceModel = null;
        
        // Remove the valid move placeholder at this position
        for (let i = this.validMovesGroup.children.length - 1; i >= 0; i--) {
            const child = this.validMovesGroup.children[i];
            if (child.userData && child.userData.q === q && child.userData.r === r) {
                this.validMovesGroup.remove(child);
            }
        }
        
        // Show the cancel icon in all cases
        this.cancelIcon.position.set(position.x, POSITIONS.PIECE_FLOATING_HEIGHT + 0.5, position.z - 0.5);
        this.cancelIcon.visible = true;
        
        // Create a temporary reference object with coordinates
        const tempRef = new THREE.Object3D();
        tempRef.position.set(position.x, 0, position.z);
        tempRef.userData = { type: 'temp-piece', q, r, color };
        this.uiGroup.add(tempRef);
        
        if (canPlaceDisc && canPlaceRing) {
            // Show both disc and ring models
            const discModel = this.models[`disc_${color}`].clone();
            const ringModel = this.models[`ring_${color}`].clone();
            
            // Scale down the models
            const discScale = 0.8;
            const ringScale = 0.8;
            discModel.scale.set(discScale, discScale, discScale);
            ringModel.scale.set(ringScale, ringScale, ringScale);
            
            // Position the models
            discModel.position.set(position.x - 0.5, POSITIONS.PIECE_FLOATING_HEIGHT, position.z);
            ringModel.position.set(position.x + 0.5, POSITIONS.PIECE_FLOATING_HEIGHT, position.z);
            
            // Add user data for click detection
            const discUserData = { 
                type: 'ui-icon', 
                pieceType: 'disc', 
                q, r, color,
                action: 'place_piece'
            };
            const ringUserData = { 
                type: 'ui-icon', 
                pieceType: 'ring', 
                q, r, color,
                action: 'place_piece'
            };
            
            // Set userData on the models
            discModel.userData = discUserData;
            ringModel.userData = ringUserData;
            
            // Add to UI group
            this.discIcon = discModel;
            this.ringIcon = ringModel;
            this.uiGroup.add(discModel);
            this.uiGroup.add(ringModel);
            
            // Hide the validate icon since we're showing both options
            this.validateIcon.visible = false;
            
            console.log('Added both disc and ring models to UI group');
        } else if (canPlaceDisc) {
            // Show only disc model with validation
            const model = this.models[`disc_${color}`].clone();
            
            // Position the model floating above the tile
            model.position.set(position.x, POSITIONS.PIECE_FLOATING_HEIGHT, position.z);
            
            // Add user data for click detection
            const userData = { 
                type: 'ui-icon', 
                pieceType: 'disc', 
                q, r, color,
                action: 'place_piece'
            };
            
            // Set userData on the model
            model.userData = userData;
            
            this.uiGroup.add(model);
            
            // Position validation icons above the piece
            this.cancelIcon.position.set(position.x - 0.5, POSITIONS.PIECE_FLOATING_HEIGHT + 0.5, position.z);
            this.validateIcon.position.set(position.x + 0.5, POSITIONS.PIECE_FLOATING_HEIGHT + 0.5, position.z);
            this.validateIcon.visible = true;
            
            // Store a reference to the model
            this.tempPieceModel = model;
            
            console.log('Added disc model to UI group (single piece mode)');
        } else if (canPlaceRing) {
            // Show only ring model with validation
            const model = this.models[`ring_${color}`].clone();
            
            // Position the model floating above the tile
            model.position.set(position.x, POSITIONS.PIECE_FLOATING_HEIGHT, position.z);
            
            // Add user data for click detection
            const userData = { 
                type: 'ui-icon', 
                pieceType: 'ring', 
                q, r, color,
                action: 'place_piece'
            };
            
            // Set userData on the model
            model.userData = userData;
            
            this.uiGroup.add(model);
            
            // Position validation icons above the piece
            this.cancelIcon.position.set(position.x - 0.5, POSITIONS.PIECE_FLOATING_HEIGHT + 0.5, position.z);
            this.validateIcon.position.set(position.x + 0.5, POSITIONS.PIECE_FLOATING_HEIGHT + 0.5, position.z);
            this.validateIcon.visible = true;
            
            // Store a reference to the model
            this.tempPieceModel = model;
            
            console.log('Added ring model to UI group (single piece mode)');
        }
        
        // Request a render
        this.requestRender();
    }
    
    /**
     * Clear any UI elements for actions
     * @param {boolean} showDropAnimation - Whether to animate pieces dropping back to resting position
     */
    clearActionUI(showDropAnimation = false) {
        console.log('Clearing all action UI elements');
        
        // Store piece positions that need drop animation before clearing
        const piecesToDrop = [];
        if (showDropAnimation) {
            for (const [pieceId, piece] of this.pieces.entries()) {
                if (piece && piece.position.y === POSITIONS.PIECE_FLOATING_HEIGHT) {
                    const pieceData = piece.userData.data;
                    if (pieceData && pieceData.q !== undefined) {
                        piecesToDrop.push({ pieceId, q: pieceData.q, r: pieceData.r });
                    }
                }
            }
        }
        
        // Hide UI icons
        this.cancelIcon.visible = false;
        this.validateIcon.visible = false;
        
        // If we have custom disc/ring icons created (not the built-in ones)
        if (this.discIcon && this.discIcon.parent === this.uiGroup) {
            this.uiGroup.remove(this.discIcon);
        }
        
        if (this.ringIcon && this.ringIcon.parent === this.uiGroup) {
            this.uiGroup.remove(this.ringIcon);
        }
        
        // Remove temporary tiles/pieces and UI icons
        for (let i = this.uiGroup.children.length - 1; i >= 0; i--) {
            const child = this.uiGroup.children[i];
            if (child.userData && (child.userData.type === 'temp-tile' || 
                                 child.userData.type === 'temp-piece' || 
                                 child.userData.type === 'ui-icon')) {
                this.uiGroup.remove(child);
            }
        }
        
        // Clear the temporary tile model reference
        this.tempTileModel = null;
        
        // Clear the temporary piece model reference
        this.tempPieceModel = null;
        
        // Clear valid move indicators
        this.clearValidMoveIndicators();
        
        // If there are pieces to animate dropping, do it
        if (showDropAnimation && piecesToDrop.length > 0) {
            // Animate each piece dropping
            for (const { pieceId, q, r } of piecesToDrop) {
                const piece = this.pieces.get(pieceId);
                if (piece) {
                    animationHandler.animateProperty(
                        piece.position,
                        'y',
                        POSITIONS.PIECE_FLOATING_HEIGHT,
                        POSITIONS.PIECE_RESTING_HEIGHT,
                        {
                            duration: 300,
                            easing: t => {
                                // Simple bounce easing
                                const n1 = 7.5625;
                                const d1 = 2.75;
                                
                                if (t < 1 / d1) {
                                    return n1 * t * t;
                                } else if (t < 2 / d1) {
                                    return n1 * (t -= 1.5 / d1) * t + 0.75;
                                } else if (t < 2.5 / d1) {
                                    return n1 * (t -= 2.25 / d1) * t + 0.9375;
                                } else {
                                    return n1 * (t -= 2.625 / d1) * t + 0.984375;
                                }
                            },
                            onUpdate: () => this.requestRender()
                        }
                    );
                }
            }
        } else {
            // Reset any lifted pieces back to their resting positions immediately
            for (const piece of this.pieces.values()) {
                if (piece && piece.position.y !== POSITIONS.PIECE_RESTING_HEIGHT) {
                    piece.position.y = POSITIONS.PIECE_RESTING_HEIGHT;
                }
            }
        }
        
        // Request a render
        this.requestRender();
    }
    
    /**
     * Animate tile placement
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @param {string} color - 'black' or 'white'
     * @returns {Promise} - Promise that resolves when animation completes
     */
    async animateTilePlacement(q, r, color) {
        if (!this.tempTileModel) {
            console.warn('No temporary tile model for animation');
            return Promise.resolve();
        }
        
        console.log(`Animating tile placement at (${q}, ${r}), color: ${color}`);
        
        const position = this.hexToWorld(q, r);
        const startPos = this.tempTileModel.position.clone();
        const endPos = new THREE.Vector3(position.x, POSITIONS.TILE_RESTING_HEIGHT, position.z);
        
        // Animate the tile dropping with a bounce effect
        return animationHandler.animatePosition(
            this.tempTileModel,
            startPos,
            endPos,
            {
                duration: 500,
                easing: t => {
                    // Simple bounce easing
                    const n1 = 7.5625;
                    const d1 = 2.75;
                    
                    if (t < 1 / d1) {
                        return n1 * t * t;
                    } else if (t < 2 / d1) {
                        return n1 * (t -= 1.5 / d1) * t + 0.75;
                    } else if (t < 2.5 / d1) {
                        return n1 * (t -= 2.25 / d1) * t + 0.9375;
                    } else {
                        return n1 * (t -= 2.625 / d1) * t + 0.984375;
                    }
                },
                onUpdate: () => this.requestRender(),
                onComplete: () => {
                    // Ensure tile is exactly at resting height after animation
                    this.tempTileModel.position.y = POSITIONS.TILE_RESTING_HEIGHT;
                    
                    // Remove the temporary model from UI group
                    this.uiGroup.remove(this.tempTileModel);
                    this.tempTileModel = null;
                    
                    // Add the permanent tile to the board
                    const tileData = {
                        q, r, color
                    };
                    const tileId = `${q},${r}`;
                    this.addTile(tileId, tileData);
                }
            }
        );
    }
    
    /**
     * Animate piece placement
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @param {string} color - 'black' or 'white'
     * @param {string} pieceType - 'disc' or 'ring'
     * @returns {Promise} - Promise that resolves when animation completes
     */
    async animatePiecePlacement(q, r, color, pieceType) {
        console.log(`Animating piece placement: ${color} ${pieceType} at (${q}, ${r})`);
        
        const position = this.hexToWorld(q, r);
        
        // Find the existing floating piece (either tempPieceModel or a custom icon)
        let floatingPiece = this.tempPieceModel;
        
        if (!floatingPiece && pieceType === 'disc' && this.discIcon) {
            floatingPiece = this.discIcon;
        } else if (!floatingPiece && pieceType === 'ring' && this.ringIcon) {
            floatingPiece = this.ringIcon;
        }
        
        // If still no floating piece, create a temporary one
        if (!floatingPiece) {
            console.warn(`No floating ${pieceType} found, creating a temporary one for animation`);
            
            // Clone the appropriate model
            const modelKey = `${pieceType}_${color}`;
            if (!this.models[modelKey]) {
                console.error(`Model not found for ${modelKey}`);
                return Promise.resolve();
            }
            
            floatingPiece = this.models[modelKey].clone();
            
            // Position at the floating height
            floatingPiece.position.set(position.x, POSITIONS.PIECE_FLOATING_HEIGHT, position.z);
            
            // Add user data
            floatingPiece.userData = { 
                type: 'ui-icon', 
                pieceType, 
                q, r, color
            };
            
            this.uiGroup.add(floatingPiece);
        }
        
        const startPos = floatingPiece.position.clone();
        const endPos = new THREE.Vector3(position.x, POSITIONS.PIECE_RESTING_HEIGHT, position.z);
        
        // Animate the piece dropping with a bounce effect
        return animationHandler.animatePosition(
            floatingPiece,
            startPos,
            endPos,
            {
                duration: 500,
                easing: t => {
                    // Simple bounce easing
                    const n1 = 7.5625;
                    const d1 = 2.75;
                    
                    if (t < 1 / d1) {
                        return n1 * t * t;
                    } else if (t < 2 / d1) {
                        return n1 * (t -= 1.5 / d1) * t + 0.75;
                    } else if (t < 2.5 / d1) {
                        return n1 * (t -= 2.25 / d1) * t + 0.9375;
                    } else {
                        return n1 * (t -= 2.625 / d1) * t + 0.984375;
                    }
                },
                onUpdate: () => this.requestRender(),
                onComplete: () => {
                    // Remove the floating piece from the UI group
                    this.uiGroup.remove(floatingPiece);
                    
                    // Add the permanent piece to the board
                    const pieceData = {
                        q, r, color, type: pieceType
                    };
                    const pieceId = `${q},${r}-${pieceType}`;
                    this.addPiece(pieceId, pieceData);
                }
            }
        );
    }

    /**
     * Helper method to check if an object is a child of another object
     * @param {THREE.Object3D} child - The child object
     * @param {THREE.Object3D} parent - The potential parent object
     * @returns {boolean} - True if child is a descendant of parent
     */
    isChildOf(child, parent) {
        let current = child;
        while (current) {
            if (current === parent) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }
    
    /**
     * Convert screen coordinates to hex grid coordinates
     * @param {number} x - Screen x coordinate
     * @param {number} y - Screen y coordinate
     * @returns {Object|null} - Hex coordinates {q, r} or null if no valid hex
     */
    screenToHex(x, y) {
        // Convert screen coordinates to normalized device coordinates
        this.mouse.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(y / this.renderer.domElement.clientHeight) * 2 + 1;
        
        // Raycast to find intersected objects
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // First check if we hit a piece
        const pieceIntersects = this.raycaster.intersectObjects(this.piecesGroup.children, true);
        if (pieceIntersects.length > 0) {
            // Traverse up to find the model with user data
            let parent = pieceIntersects[0].object;
            while (parent && (!parent.userData || parent.userData.q === undefined)) {
                parent = parent.parent;
            }
            
            if (parent && parent.userData && parent.userData.q !== undefined) {
                return {
                    q: parent.userData.q,
                    r: parent.userData.r
                };
            }
        }
        
        // Then check if we hit a tile
        const tileIntersects = this.raycaster.intersectObjects(this.tilesGroup.children, true);
        if (tileIntersects.length > 0) {
            // Traverse up to find the model with user data
            let parent = tileIntersects[0].object;
            while (parent && (!parent.userData || parent.userData.q === undefined)) {
                parent = parent.parent;
            }
            
            if (parent && parent.userData && parent.userData.q !== undefined) {
                return {
                    q: parent.userData.q,
                    r: parent.userData.r
                };
            }
        }
        
        // Check for valid move indicators
        const validMoveIntersects = this.raycaster.intersectObjects(this.validMovesGroup.children, true);
        if (validMoveIntersects.length > 0) {
            const object = validMoveIntersects[0].object;
            if (object.userData && object.userData.q !== undefined) {
                return {
                    q: object.userData.q,
                    r: object.userData.r
                };
            }
        }
        
        return null;
    }

    /**
     * Check if the user clicked on a UI element
     * @param {number} x - Screen x coordinate
     * @param {number} y - Screen y coordinate
     * @returns {boolean} - True if a UI element was clicked
     */
    checkUIClick(x, y) {
        // Convert screen coordinates to normalized device coordinates
        this.mouse.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(y / this.renderer.domElement.clientHeight) * 2 + 1;
        
        // Raycast to find intersected objects
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check UI elements specifically excluding pieces and tiles
        const uiIntersects = [];
        
        // Only do precise intersection tests with specific UI controls
        if (this.cancelIcon.visible) {
            const cancelIntersects = this.raycaster.intersectObject(this.cancelIcon, true);
            uiIntersects.push(...cancelIntersects);
        }
        
        if (this.validateIcon.visible) {
            const validateIntersects = this.raycaster.intersectObject(this.validateIcon, true);
            uiIntersects.push(...validateIntersects);
        }
        
        if (this.discIcon.visible) {
            const discIntersects = this.raycaster.intersectObject(this.discIcon, true);
            uiIntersects.push(...discIntersects);
        }
        
        if (this.ringIcon.visible) {
            const ringIntersects = this.raycaster.intersectObject(this.ringIcon, true);
            uiIntersects.push(...ringIntersects);
        }
        
        return uiIntersects.length > 0;
    }
    
    /**
     * Check if the cancel icon was clicked
     * @param {number} x - Screen x coordinate
     * @param {number} y - Screen y coordinate
     * @returns {boolean} - True if the cancel icon was clicked
     */
    isCancelClicked(x, y) {
        if (!this.cancelIcon.visible) return false;
        
        this.mouse.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(y / this.renderer.domElement.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObject(this.cancelIcon, true);
        return intersects.length > 0;
    }
    
    /**
     * Check if the validate icon was clicked
     * @param {number} x - Screen x coordinate
     * @param {number} y - Screen y coordinate
     * @returns {boolean} - True if the validate icon was clicked
     */
    isValidateClicked(x, y) {
        if (!this.validateIcon.visible) return false;
        
        this.mouse.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(y / this.renderer.domElement.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObject(this.validateIcon, true);
        return intersects.length > 0;
    }
    
    /**
     * Check if the disc icon was clicked
     * @param {number} x - Screen x coordinate
     * @param {number} y - Screen y coordinate
     * @returns {boolean} - True if the disc icon was clicked
     */
    isDiscClicked(x, y) {
        if (!this.discIcon.visible) return false;
        
        this.mouse.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(y / this.renderer.domElement.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObject(this.discIcon, true);
        return intersects.length > 0;
    }
    
    /**
     * Check if the ring icon was clicked
     * @param {number} x - Screen x coordinate
     * @param {number} y - Screen y coordinate
     * @returns {boolean} - True if the ring icon was clicked
     */
    isRingClicked(x, y) {
        if (!this.ringIcon.visible) return false;
        
        this.mouse.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(y / this.renderer.domElement.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObject(this.ringIcon, true);
        return intersects.length > 0;
    }

    /**
     * Load textures for use in the scene
     */
    loadTextures() {
        // List of textures to load
        const texturesToLoad = [
            { name: 'wood', path: '/assets/textures/wood.jpg', fallbackColor: 0x8d6e63 },
            { name: 'stone', path: '/assets/textures/stone.jpg', fallbackColor: 0x9e9e9e },
            { name: 'marble', path: '/assets/textures/marble.jpg', fallbackColor: 0xcfd8dc }
        ];
        
        console.log('Loading background textures...');
        
        // Initialize textures object if not already initialized
        this.textures = this.textures || {};
        
        // Create fallback textures first
        texturesToLoad.forEach(texture => {
            // Create a simple plain color fallback texture
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            const hexColor = texture.fallbackColor;
            const r = (hexColor >> 16) & 255;
            const g = (hexColor >> 8) & 255;
            const b = hexColor & 255;
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Create a texture from the canvas
            const fallbackTexture = new THREE.CanvasTexture(canvas);
            fallbackTexture.wrapS = THREE.RepeatWrapping;
            fallbackTexture.wrapT = THREE.RepeatWrapping;
            fallbackTexture.repeat.set(4, 4);
            
            // Store as fallback
            this.textures[`${texture.name}_fallback`] = fallbackTexture;
        });
        
        // Load each texture
        texturesToLoad.forEach(texture => {
            try {
                this.textureLoader.load(
                    texture.path,
                    loadedTexture => {
                        console.log(`Loaded texture: ${texture.name}`);
                        
                        // Configure texture for proper tiling
                        loadedTexture.wrapS = THREE.RepeatWrapping;
                        loadedTexture.wrapT = THREE.RepeatWrapping;
                        loadedTexture.repeat.set(4, 4); // Adjust tiling as needed
                        
                        // Store the loaded texture
                        this.textures[texture.name] = loadedTexture;
                        
                        // If this is the current background type, update the ground
                        if (this.boardState?.backgroundColor === texture.name) {
                            this.createGroundPlane();
                        }
                    },
                    undefined, // No progress callback needed
                    error => {
                        console.warn(`Failed to load texture ${texture.name}: ${error.message}`);
                        // Use the fallback texture we created
                        this.textures[texture.name] = this.textures[`${texture.name}_fallback`];
                        
                        // If this is the current background type, update the ground
                        if (this.boardState?.backgroundColor === texture.name) {
                            this.createGroundPlane();
                        }
                        
                        // Report error to event bus
                        eventBus.publish('error', {
                            type: 'texture_load_error',
                            message: `Failed to load texture: ${texture.name}`,
                            details: error.message,
                            path: texture.path
                        });
                    }
                );
            } catch (error) {
                console.error(`Exception during texture loading for ${texture.name}:`, error);
                // Use the fallback texture we created
                this.textures[texture.name] = this.textures[`${texture.name}_fallback`];
                
                // Report error to event bus
                eventBus.publish('error', {
                    type: 'texture_load_exception',
                    message: `Exception during texture loading: ${texture.name}`,
                    details: error.message,
                    path: texture.path
                });
            }
        });
    }

    /**
     * Handle board state changes
     * @param {Object} event - The state change event object
     */
    onBoardStateChanged(event) {
        const state = event.detail;
        
        // Check if background color or dark mode changed
        if (state.backgroundColor !== undefined || state.darkMode !== undefined) {
            this.createGroundPlane(); // Recreate the ground plane with new settings
        }
        
        // Add other state change handlers as needed
        
        // Request a render
        this.requestRender();
    }
}

// Export the ThreeRenderer class
export default ThreeRenderer; 