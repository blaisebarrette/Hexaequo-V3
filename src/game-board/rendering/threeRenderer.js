/**
 * ThreeRenderer - Handles 3D rendering for the game board
 * 
 * This module is responsible for rendering the game board in 3D using Three.js.
 * It renders tiles, pieces, highlights, and animations.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { eventBus } from '../../api/eventBus.js';
import { boardState, BoardStateConstants } from '../core/boardState.js';
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
    constructor(container) {
        this.container = container;
        this.renderRequested = false;
        this.hexSize = 1.0; // Size of hex tiles
        
        // Scene objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Game objects
        this.tilesGroup = new THREE.Group(); // Group for all tiles
        this.piecesGroup = new THREE.Group(); // Group for all pieces
        this.highlightsGroup = new THREE.Group(); // Group for visual highlights
        
        this.tiles = new Map(); // Map of tileId -> THREE.Object3D
        this.pieces = new Map(); // Map of pieceId -> THREE.Object3D
        this.highlights = new Map(); // Map of tileId -> THREE.Object3D
        
        // For raycasting
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Asset loaders
        this.gltfLoader = new GLTFLoader();
        this.textureLoader = new THREE.TextureLoader();
        
        // Models and textures
        this.models = {};
        this.textures = {};
        
        // Initialize the renderer
        this.initialize();
        this.setupEventListeners();
    }
    
    /**
     * Initialize the 3D renderer
     */
    initialize() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(COLORS.BACKGROUND.LIGHT);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            45, // FOV
            this.container.clientWidth / this.container.clientHeight, // Aspect ratio
            0.1, // Near clipping plane
            1000 // Far clipping plane
        );
        this.camera.position.set(0, 15, 12);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Create controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.rotateSpeed = 0.7;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 30;
        this.controls.maxPolarAngle = Math.PI / 2.1; // Just under 90 degrees to prevent going below board
        
        // Add event listeners
        this.controls.addEventListener('change', () => this.requestRender());
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Add groups to scene
        this.scene.add(this.tilesGroup);
        this.scene.add(this.piecesGroup);
        this.scene.add(this.highlightsGroup);
        
        // Add lights
        this.addLights();
        
        // Create the grid
        this.createGrid();
        
        // Load models and setup scene when ready
        this.loadModels();
    }
    
    /**
     * Load 3D models for game pieces
     */
    loadModels() {
        console.log('Loading 3D models...');
        const modelPaths = {
            tile_black: './src/assets/models/modern/tile_black.glb',
            tile_white: './src/assets/models/modern/tile_white.glb',
            disc_black: './src/assets/models/modern/disc_black.glb',
            disc_white: './src/assets/models/modern/disc_white.glb',
            ring_black: './src/assets/models/modern/ring_black.glb',
            ring_white: './src/assets/models/modern/ring_white.glb'
        };
        
        // Create fallback geometries in case models fail to load
        this.createFallbackGeometries();
        
        // Track model loading success
        let loadingFailed = false;
        
        // Load each model
        const promises = [];
        for (const [name, path] of Object.entries(modelPaths)) {
            const promise = new Promise((resolve) => {
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
                        resolve();
                    },
                    (progress) => {
                        console.log(`Loading model ${name}: ${Math.round(progress.loaded / progress.total * 100)}%`);
                    },
                    (error) => {
                        console.warn(`Using fallback geometry for ${name}: ${error.message}`);
                        loadingFailed = true;
                        resolve();
                    }
                );
            });
            promises.push(promise);
        }
        
        // When all models are loaded (or failed to load), set up the board
        Promise.all(promises)
            .then(() => {
                console.log('All models loaded, setting up scene');
                if (loadingFailed) {
                    this.showModelLoadingError();
                }
                // Emit model loading complete event
                eventBus.publish('board:modelsLoaded', {
                    success: !loadingFailed,
                    modelCount: Object.keys(this.models).length
                });
                this.setupScene();
            });
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
     * Display an indicator that model loading failed
     */
    showModelLoadingError() {
        console.warn("Some 3D models failed to load - using fallback geometries");
        
        // Create a simple error indicator (a red sphere)
        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const errorIndicator = new THREE.Mesh(geometry, material);
        
        // Position it in a visible location
        errorIndicator.position.set(0, 2, 0);
        
        // Add to scene
        this.scene.add(errorIndicator);
        
        // Add text instruction
        const message = "Model loading error: using fallback geometries";
        console.error(message);
    }
    
    /**
     * Set up the initial game board
     */
    setupScene() {
        // Clear any existing elements
        while (this.tilesGroup.children.length > 0) {
            this.tilesGroup.remove(this.tilesGroup.children[0]);
        }
        
        while (this.piecesGroup.children.length > 0) {
            this.piecesGroup.remove(this.piecesGroup.children[0]);
        }
        
        this.tiles.clear();
        this.pieces.clear();
        
        // Add a ground plane
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Rotate to horizontal
        ground.position.y = -0.1; // Slightly below the tiles
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Start the render loop
        this.animate();
        
        // Emit setup complete event
        eventBus.publish('board:setupComplete', {
            timestamp: Date.now()
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
        // Listen for board state updates
        eventBus.subscribe('board:stateUpdated', (data) => {
            this.onBoardStateUpdated(data);
        });
        
        // Listen for game state changes
        eventBus.subscribe('game:stateChanged', (data) => {
            this.onGameStateChanged(data);
        });
        
        // Listen for tile highlights
        eventBus.subscribe('board:tileHighlighted', (data) => {
            this.highlightTile(data.tileId, data.highlightType);
        });
        
        eventBus.subscribe('board:tileUnhighlighted', (data) => {
            this.unhighlightTile(data.tileId);
        });
        
        // Listen for camera updates
        eventBus.subscribe('board:cameraUpdated', (data) => {
            this.updateCamera(data);
        });
        
        // Listen for tile and piece events
        eventBus.subscribe('tile:added', (data) => {
            this.addTile(data.tileId, data.tileData);
        });
        
        eventBus.subscribe('tile:removed', (data) => {
            this.removeTile(data.tileId);
        });
        
        eventBus.subscribe('piece:added', (data) => {
            this.addPiece(data.pieceId, data.pieceData);
        });
        
        eventBus.subscribe('piece:moved', (data) => {
            this.movePiece(data.piece, data.newPosition);
        });
        
        eventBus.subscribe('piece:removed', (data) => {
            this.removePiece(data.pieceId);
        });
        
        // Listen for click and hover events on the board
        this.renderer.domElement.addEventListener('click', (event) => {
            this.handleClick(event);
        });
        
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            this.handleMouseMove(event);
        });
    }
    
    /**
     * Add lights to the scene
     */
    addLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 15);
        directionalLight.castShadow = true;
        
        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -15;
        directionalLight.shadow.camera.right = 15;
        directionalLight.shadow.camera.top = 15;
        directionalLight.shadow.camera.bottom = -15;
        directionalLight.shadow.bias = -0.0005;
        
        this.scene.add(directionalLight);
        
        // Add a soft light from below for better visibility
        const bottomLight = new THREE.DirectionalLight(0xffffff, 0.3);
        bottomLight.position.set(0, -10, 0);
        this.scene.add(bottomLight);
    }
    
    /**
     * Create a grid for reference
     */
    createGrid() {
        const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, COLORS.GRID, COLORS.GRID);
        gridHelper.position.set(
            BOARD_OFFSET.x,
            BOARD_OFFSET.y,
            BOARD_OFFSET.z
        );
        this.scene.add(gridHelper);
    }
    
    /**
     * Handle window resize events
     */
    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.requestRender();
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
        const intersection = this.getIntersection(event);
        
        if (intersection) {
            const object = intersection.object;
            const position = intersection.point;
            
            // Round position to grid coordinates
            const x = Math.round(position.x);
            const y = Math.round(position.y);
            const z = Math.round(position.z);
            
            // Determine what was clicked
            if (object.userData.type === 'tile') {
                // Tile click
                eventBus.publish('board:positionClicked', {
                    tileId: object.userData.id,
                    x, y, z
                });
            } else if (object.userData.type === 'piece') {
                // Piece click
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
        requestAnimationFrame(() => this.animate());
        
        // Update controls
        this.controls.update();
        
        // Render the scene only if requested or controls are being used
        if (this.renderRequested || this.controls.update()) {
            this.render();
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
}

// Export the ThreeRenderer class
export default ThreeRenderer; 