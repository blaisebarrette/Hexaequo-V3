import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ThreeAnimationHandler, ANIMATION_CONFIG } from './threeAnimationHandler.js';

// Constants for positioning
const POSITIONS = {
    // Tile positions
    TILE_RESTING_HEIGHT: 0,
    TILE_FLOATING_HEIGHT: 0.625,
    
    // Piece positions
    PIECE_RESTING_HEIGHT: 0,
    PIECE_FLOATING_HEIGHT: 0.625,
    
    // UI element positions
    UI_ICON_HEIGHT: 1.5,
    UI_VALIDATE_ICON_HEIGHT: 2,
    
    // Spacing factors
    HEX_SPACING: 0.6
};

// Constants for placeholders - easily tweakable
const PLACEHOLDER = {
    // Opacity values
    VISIBLE_OPACITY: 0.5,
    INVISIBLE_OPACITY: 0,
    
    // Colors
    TILE_COLOR: 0x00ff00,   // Green
    PIECE_COLOR: 0x00ff00,  // Green
    MOVE_COLOR: 0x0000ff,   // Blue
    
    // Heights
    TILE_HEIGHT: 0.125,       // Height position of tile placeholders
    DISC_HEIGHT: 0.325,      // Height position of disc placeholders
    RING_HEIGHT: 0.325,      // Height position of ring placeholders
    MOVE_HEIGHT: 0.25,       // Height position of movement placeholders
    
    // Tile placeholder
    TILE_RADIUS: 0.8125,    // Radius of tile placeholders
    TILE_THICKNESS: 0.25,   // Thickness of tile placeholders
    TILE_SEGMENTS: 6,       // Number of segments for hexagonal placeholders
    
    // Disc placeholder
    DISC_RADIUS: 0.375,       // Radius of disc placeholders
    DISC_THICKNESS: 0.25,   // Thickness of disc placeholders
    DISC_SEGMENTS: 32,      // Number of segments for disc placeholders
    
    // Ring placeholder
    RING_RADIUS: 0.625,       // Radius of ring placeholders
    RING_TUBE: 0.125,         // Thickness of ring tube
    RING_SEGMENTS: 16,      // Number of segments for ring placeholders
    RING_TUBULAR_SEGMENTS: 32, // Number of tubular segments for ring placeholders
    
    // Movement placeholders
    DISC_MOVE_RADIUS: 0.375,    // Radius of disc movement placeholders
    DISC_MOVE_THICKNESS: 0.25,  // Thickness of disc movement placeholders
    RING_MOVE_RADIUS: 0.625,      // Radius of ring movement placeholders
    RING_MOVE_TUBE: 0.1         // Thickness of ring movement placeholders tube
};

/**
 * ThreeRenderer - Handles 3D rendering of the game board using Three.js
 */
export class ThreeRenderer {
    constructor(domElement, gameState) {
        this.domElement = domElement;
        this.gameState = gameState;
        
        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Animation handler
        this.animationHandler = new ThreeAnimationHandler();
        
        // Loaded models
        this.models = {
            tile_black: null,
            tile_white: null,
            disc_black: null,
            disc_white: null,
            ring_black: null,
            ring_white: null
        };
        
        // Game board elements
        this.hexSize = 1.5; // Size of a hex tile in 3D units
        this.boardGroup = null; // Group for all board elements
        this.tilesGroup = null; // Group for all tiles
        this.piecesGroup = null; // Group for all pieces
        this.uiGroup = null; // Group for UI elements (validation icons, etc.)
        this.validMovesGroup = null; // Group for valid move indicators
        
        // Map of hex coordinates to mesh objects
        this.tilesMeshes = {}; // (q,r) -> tile mesh
        this.piecesMeshes = {}; // (q,r) -> piece mesh
        
        // UI elements
        this.cancelIcon = null;
        this.validateIcon = null;
        this.discIcon = null;
        this.ringIcon = null;
        
        // Raycasting for interaction
        this.raycaster = new THREE.Raycaster();
        // Set a larger threshold for the raycaster to make clicking easier
        this.raycaster.params.Line.threshold = 0.1;
        this.raycaster.params.Points.threshold = 0.1;
        this.mouse = new THREE.Vector2();
        
        // Initialize scene
        this.initScene();
        this.initUI();
        this.loadModels();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }
    
    /**
     * Initialize the Three.js scene
     */
    initScene() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            45, // FOV
            this.domElement.clientWidth / this.domElement.clientHeight, // Aspect ratio
            0.1, // Near clipping plane
            1000 // Far clipping plane
        );
        this.camera.position.set(0, 15, 15); // Position the camera
        this.camera.lookAt(0, 0, 0); // Look at the center
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.domElement.clientWidth, this.domElement.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadow edges
        this.domElement.appendChild(this.renderer.domElement);
        
        // Create orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 30;
        this.controls.maxPolarAngle = Math.PI / 2; // Prevent going below the board
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 30;
        directionalLight.shadow.camera.left = -15;
        directionalLight.shadow.camera.right = 15;
        directionalLight.shadow.camera.top = 15;
        directionalLight.shadow.camera.bottom = -15;
        directionalLight.shadow.bias = -0.0005;
        this.scene.add(directionalLight);
        
        // Create groups for organizing the scene
        this.boardGroup = new THREE.Group();
        this.tilesGroup = new THREE.Group();
        this.piecesGroup = new THREE.Group();
        this.uiGroup = new THREE.Group();
        this.validMovesGroup = new THREE.Group();
        
        this.boardGroup.add(this.tilesGroup);
        this.boardGroup.add(this.piecesGroup);
        this.boardGroup.add(this.uiGroup);
        this.boardGroup.add(this.validMovesGroup);
        this.scene.add(this.boardGroup);
    }
    
    /**
     * Initialize UI elements
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
     * Load 3D models for game pieces
     */
    loadModels() {
        const loader = new GLTFLoader();
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
        
        // Load each model
        const promises = [];
        for (const [name, path] of Object.entries(modelPaths)) {
            const promise = new Promise((resolve) => {
                loader.load(
                    path,
                    (gltf) => {
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
                    undefined,
                    (error) => {
                        console.warn(`Using fallback geometry for ${name}: ${error.message}`);
                        // We'll use the fallback geometries we created earlier
                        resolve();
                    }
                );
            });
            promises.push(promise);
        }
        
        // When all models are loaded (or failed to load), set up the board
        Promise.all(promises)
            .then(() => {
                console.log('All models loaded');
                this.setupScene();
            });
    }
    
    /**
     * Create fallback geometries for when 3D models fail to load
     */
    createFallbackGeometries() {
        // Tile geometries
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
        
        // Enable shadows for fallback geometries
        blackTileMesh.castShadow = true;
        blackTileMesh.receiveShadow = true;
        whiteTileMesh.castShadow = true;
        whiteTileMesh.receiveShadow = true;
        
        // Disc geometries
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
        
        // Enable shadows for discs
        blackDiscMesh.castShadow = true;
        blackDiscMesh.receiveShadow = true;
        whiteDiscMesh.castShadow = true;
        whiteDiscMesh.receiveShadow = true;
        
        // Ring geometries
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
        
        // Enable shadows for rings
        blackRingMesh.castShadow = true;
        blackRingMesh.receiveShadow = true;
        whiteRingMesh.castShadow = true;
        whiteRingMesh.receiveShadow = true;
        
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
        // Clear any existing elements
        while (this.tilesGroup.children.length > 0) {
            this.tilesGroup.remove(this.tilesGroup.children[0]);
        }
        
        while (this.piecesGroup.children.length > 0) {
            this.piecesGroup.remove(this.piecesGroup.children[0]);
        }
        
        this.tilesMeshes = {};
        this.piecesMeshes = {};
        
        // Add a much larger ground plane to appear infinite
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0xdddddd, // Lighter color for light mode
            roughness: 0.9,
            metalness: 0.1
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2; // Rotate to horizontal
        this.ground.position.y = -0.1; // Slightly below the tiles
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
        // Update the board based on the game state
        this.updateBoard();
    }
    
    /**
     * Update the board to match the current game state
     */
    updateBoard() {
        console.log('Updating board to match game state');
        
        // Add/update tiles and pieces based on game state
        for (const key in this.gameState.board.tiles) {
            const [q, r] = key.split(',').map(Number);
            const tileData = this.gameState.board.tiles[key];
            
            // Add tile if it doesn't exist
            if (!this.tilesMeshes[key]) {
                this.addTile(q, r, tileData.color);
            }
            
            // Add or remove piece
            if (tileData.piece) {
                console.log(`Tile at ${key} has ${tileData.piece.color} ${tileData.piece.type}`);
                
                if (!this.piecesMeshes[key]) {
                    console.log(`Adding ${tileData.piece.color} ${tileData.piece.type} at (${q}, ${r})`);
                    this.addPiece(q, r, tileData.piece.color, tileData.piece.type);
                } else {
                    // Check if the existing piece matches what should be there
                    const existingPiece = this.piecesMeshes[key];
                    if (existingPiece.userData.color !== tileData.piece.color || 
                        existingPiece.userData.pieceType !== tileData.piece.type) {
                        console.log(`Updating piece from ${existingPiece.userData.color} ${existingPiece.userData.pieceType} to ${tileData.piece.color} ${tileData.piece.type}`);
                        // Remove and re-add with correct type/color
                        this.removePiece(q, r);
                        this.addPiece(q, r, tileData.piece.color, tileData.piece.type);
                    }
                }
            } else if (this.piecesMeshes[key]) {
                // Remove piece if it shouldn't be there
                console.log(`Removing piece at (${q}, ${r})`);
                this.removePiece(q, r);
            }
        }
    }
    
    /**
     * Add a tile to the board
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @param {string} color - 'black' or 'white'
     */
    addTile(q, r, color) {
        const key = `${q},${r}`;
        const position = this.hexToWorld(q, r);
        
        // Clone the appropriate model
        const model = this.models[`tile_${color}`].clone();
        model.position.set(position.x, POSITIONS.TILE_RESTING_HEIGHT, position.z);
        
        // Rotate tile by 30 degrees to align with hexagonal grid
        model.rotation.y = Math.PI / 6; // 30 degrees in radians
        
        model.userData = { type: 'tile', q, r, color };
        
        // Ensure shadows are enabled for cloned model
        model.castShadow = true;
        model.receiveShadow = true;
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        // Add to scene
        this.tilesGroup.add(model);
        this.tilesMeshes[key] = model;
    }
    
    /**
     * Add a piece to the board
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @param {string} color - 'black' or 'white'
     * @param {string} type - 'disc' or 'ring'
     */
    addPiece(q, r, color, type) {
        const key = `${q},${r}`;
        const position = this.hexToWorld(q, r);
        
        console.log(`Adding ${color} ${type} at (${q}, ${r})`);
        
        // Remove any existing piece at this position
        if (this.piecesMeshes[key]) {
            console.log(`Removing existing piece at (${q}, ${r})`);
            this.removePiece(q, r);
        }
        
        // Double-check game state to ensure consistency
        const tileData = this.gameState.board.tiles[key];
        if (tileData && tileData.piece) {
            console.log(`Game state has a ${tileData.piece.color} ${tileData.piece.type} at (${q}, ${r})`);
            // Use the piece type and color from the game state for consistency
            color = tileData.piece.color;
            type = tileData.piece.type;
        }
        
        // Clone the appropriate model
        const modelKey = `${type}_${color}`;
        console.log(`Using model: ${modelKey}`);
        
        if (!this.models[modelKey]) {
            console.error(`Model not found for ${modelKey}`);
            return;
        }
        
        const model = this.models[modelKey].clone();
        model.position.set(position.x, POSITIONS.PIECE_RESTING_HEIGHT, position.z); // Place slightly above the tile
        model.userData = { type: 'piece', pieceType: type, q, r, color };
        
        // Ensure shadows are enabled for cloned model
        model.castShadow = true;
        model.receiveShadow = true;
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        console.log(`Set userData on model:`, model.userData);
        
        // Add to scene
        this.piecesGroup.add(model);
        this.piecesMeshes[key] = model;
        
        // Debug: Log all piecesMeshes
        console.log(`Total piecesMeshes:`, Object.keys(this.piecesMeshes).length);
    }
    
    /**
     * Remove a piece from the board
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     */
    removePiece(q, r) {
        const key = `${q},${r}`;
        const piece = this.piecesMeshes[key];
        
        if (piece) {
            this.piecesGroup.remove(piece);
            delete this.piecesMeshes[key];
        }
    }
    
    /**
     * Convert hex coordinates to world position
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @returns {Object} - { x, z } world coordinates
     */
    hexToWorld(q, r) {
        // Convert axial coordinates to world space with reduced spacing
        // Formula from: https://www.redblobgames.com/grids/hexagons/
        const x = this.hexSize * POSITIONS.HEX_SPACING * (3/2 * q);
        const z = this.hexSize * POSITIONS.HEX_SPACING * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
        
        return { x, z };
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
        
        console.log(`screenToHex at (${x}, ${y}) => NDC: (${this.mouse.x.toFixed(2)}, ${this.mouse.y.toFixed(2)})`);
        
        // Raycast to find intersected objects
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check direct intersections with known piece meshes first (most reliable)
        console.log(`Checking direct piece meshes, count:`, Object.keys(this.piecesMeshes).length);
        const pieceMeshes = Object.values(this.piecesMeshes);
        if (pieceMeshes.length > 0) {
            const pieceIntersect = this.raycaster.intersectObjects(pieceMeshes, true);
            if (pieceIntersect.length > 0) {
                console.log(`Direct hit on a piece mesh:`, pieceIntersect[0].object);
                // Find the piece mesh that was hit by looking at its parent chain
                let targetMesh = pieceIntersect[0].object;
                while (targetMesh && (!targetMesh.userData || !targetMesh.userData.q)) {
                    targetMesh = targetMesh.parent;
                }
                
                // If we found a mesh with userData, use its coordinates
                if (targetMesh && targetMesh.userData && targetMesh.userData.q !== undefined) {
                    console.log(`Found piece at (${targetMesh.userData.q}, ${targetMesh.userData.r})`);
                    return {
                        q: targetMesh.userData.q,
                        r: targetMesh.userData.r
                    };
                }
                
                // If we still don't have coordinates, try to get them from the piecesMeshes entries
                for (const [key, mesh] of Object.entries(this.piecesMeshes)) {
                    if (this.isChildOf(pieceIntersect[0].object, mesh)) {
                        const [q, r] = key.split(',').map(Number);
                        console.log(`Found piece at (${q}, ${r}) via mesh lookup`);
                        return { q, r };
                    }
                }
            }
        }
        
        // Try intersection with all pieces as a fallback
        let pieceIntersects = this.raycaster.intersectObjects(this.piecesGroup.children, true);
        
        console.log(`Piece intersections (traditional): ${pieceIntersects.length}`);
        if (pieceIntersects.length > 0) {
            console.log(`First piece intersection: `, pieceIntersects[0].object);
            const object = pieceIntersects[0].object;
            // Traverse up to find the model with user data
            let parent = object;
            while (parent && !parent.userData?.q) {
                console.log(`Traversing up, current parent:`, parent);
                parent = parent.parent;
            }
            
            if (parent && parent.userData?.q !== undefined && parent.userData?.r !== undefined) {
                console.log(`Found piece at (${parent.userData.q}, ${parent.userData.r})`);
                return { 
                    q: parent.userData.q, 
                    r: parent.userData.r 
                };
            } else {
                console.log(`Failed to find parent with userData`, parent);
            }
        }
        
        // Then check if we hit a tile
        const tileIntersects = this.raycaster.intersectObjects(this.tilesGroup.children, true);
        
        console.log(`Tile intersections: ${tileIntersects.length}`);
        if (tileIntersects.length > 0) {
            const object = tileIntersects[0].object;
            // Traverse up to find the model with user data
            let parent = object;
            while (parent && !parent.userData?.q) {
                parent = parent.parent;
            }
            
            if (parent && parent.userData?.q !== undefined && parent.userData?.r !== undefined) {
                console.log(`Found tile at (${parent.userData.q}, ${parent.userData.r})`);
                return { 
                    q: parent.userData.q, 
                    r: parent.userData.r 
                };
            }
        }
        
        // Now check for valid move indicators (for placing tiles or moving pieces)
        const validMoveIntersects = this.raycaster.intersectObjects(this.validMovesGroup.children, true);
        
        console.log(`Valid move intersections: ${validMoveIntersects.length}`);
        if (validMoveIntersects.length > 0) {
            const object = validMoveIntersects[0].object;
            if (object.userData?.q !== undefined && object.userData?.r !== undefined) {
                console.log(`Found valid move at (${object.userData.q}, ${object.userData.r})`);
                return { 
                    q: object.userData.q, 
                    r: object.userData.r 
                };
            }
        }
        
        console.log(`No valid hex found`);
        return null;
    }
    
    /**
     * Helper method to check if an object is a child of another object
     * @param {Object} child - The child object
     * @param {Object} parent - The potential parent object
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
        // Make sure to only count direct UI elements (cancel, validate, etc.) not temporary UI items
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
        this.mouse.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(y / this.renderer.domElement.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Make sure cancelIcon is visible and check intersections
        if (!this.cancelIcon.visible) return false;
        
        // Use a more precise intersection test
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
        this.mouse.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(y / this.renderer.domElement.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Make sure validateIcon is visible and check intersections
        if (!this.validateIcon.visible) return false;
        
        // Use a more precise intersection test
        const intersects = this.raycaster.intersectObject(this.validateIcon, true);
        
        return intersects.length > 0;
    }
    
    /**
     * Check if the disc icon was clicked
     * @param {number} x - Screen x coordinate
     * @param {number} y - Screen y coordinate
     * @returns {Object|boolean} - The clicked object or false if no disc icon was clicked
     */
    isDiscClicked(x, y) {
        this.mouse.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(y / this.renderer.domElement.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check for intersections with UI elements that are disc icons
        const intersects = this.raycaster.intersectObjects(this.uiGroup.children, true);
        console.log('UI intersections found:', intersects.length);
        
        for (const intersect of intersects) {
            let object = intersect.object;
            // Traverse up to find the object with userData
            while (object && !object.userData) {
                object = object.parent;
            }
            
            if (object && object.userData) {
                console.log('Found object with userData:', object.userData);
                if (object.userData.type === 'ui-icon' && 
                    object.userData.pieceType === 'disc') {
                    console.log('Disc icon clicked');
                    
                    // Find the actual disc model in the uiGroup
                    const discModel = this.uiGroup.children.find(
                        child => child.userData && 
                                child.userData.type === 'ui-icon' && 
                                child.userData.pieceType === 'disc'
                    );
                    
                    // Return the model to allow for animation
                    return discModel || true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Check if the ring icon was clicked
     * @param {number} x - Screen x coordinate
     * @param {number} y - Screen y coordinate
     * @returns {Object|boolean} - The clicked object or false if no ring icon was clicked
     */
    isRingClicked(x, y) {
        this.mouse.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(y / this.renderer.domElement.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check for intersections with UI elements that are ring icons
        const intersects = this.raycaster.intersectObjects(this.uiGroup.children, true);
        console.log('UI intersections found:', intersects.length);
        
        for (const intersect of intersects) {
            let object = intersect.object;
            // Traverse up to find the object with userData
            while (object && !object.userData) {
                object = object.parent;
            }
            
            if (object && object.userData) {
                console.log('Found object with userData:', object.userData);
                if (object.userData.type === 'ui-icon' && 
                    object.userData.pieceType === 'ring') {
                    console.log('Ring icon clicked');
                    
                    // Find the actual ring model in the uiGroup
                    const ringModel = this.uiGroup.children.find(
                        child => child.userData && 
                                child.userData.type === 'ui-icon' && 
                                child.userData.pieceType === 'ring'
                    );
                    
                    // Return the model to allow for animation
                    return ringModel || true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Animate a piece dropping from floating height to resting position after move validation
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @returns {Promise} - Promise that resolves when animation completes
     */
    async animatePieceDropAfterMove(q, r) {
        const key = `${q},${r}`;
        const pieceMesh = this.piecesMeshes[key];
        
        if (!pieceMesh) {
            console.warn('No piece found to animate dropping');
            return Promise.resolve();
        }
        
        // Only animate if the piece is floating
        if (pieceMesh.position.y !== POSITIONS.PIECE_FLOATING_HEIGHT) {
            return Promise.resolve();
        }
        
        console.log(`Animating piece dropping at (${q}, ${r})`);
        
        const startPos = pieceMesh.position.clone();
        const endPos = new THREE.Vector3(
            pieceMesh.position.x,
            POSITIONS.PIECE_RESTING_HEIGHT,
            pieceMesh.position.z
        );
        
        // Animate the piece dropping with a bounce effect
        await this.animationHandler.animatePosition(
            pieceMesh,
            startPos,
            endPos,
            {
                easing: ANIMATION_CONFIG.EASING.BOUNCE,
                duration: ANIMATION_CONFIG.DURATION * 1.2, // Slightly slower for better bounce effect
                onComplete: () => {
                    // Ensure piece is exactly at resting height after animation
                    pieceMesh.position.y = POSITIONS.PIECE_RESTING_HEIGHT;
                }
            }
        );
        
        return true;
    }

    /**
     * Show validation UI at the specified position
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     */
    showValidationUI(q, r) {
        const position = this.hexToWorld(q, r);
        const key = `${q},${r}`;
        
        console.log(`Showing validation UI at (${q}, ${r})`);
        
        // If using a temporary piece, ensure it has the correct type and color
        if (this.gameState.selectedPiece) {
            console.log('Selected piece for validation:', this.gameState.selectedPiece);
            const selectedPiece = this.gameState.selectedPiece;
            
            // If we have a piece in game state, use its properties
            const tileData = this.gameState.board.tiles[key];
            if (tileData && tileData.piece) {
                console.log(`Using piece from game state: ${tileData.piece.color} ${tileData.piece.type}`);
                
                // Update the mesh at this position to ensure it's correct
                if (this.piecesMeshes[key]) {
                    if (this.piecesMeshes[key].userData.color !== tileData.piece.color || 
                        this.piecesMeshes[key].userData.pieceType !== tileData.piece.type) {
                        console.log(`Updating mesh to match game state`);
                        this.removePiece(q, r);
                        this.addPiece(q, r, tileData.piece.color, tileData.piece.type);
                    }
                } else {
                    this.addPiece(q, r, tileData.piece.color, tileData.piece.type);
                }
            } else if (selectedPiece.color && selectedPiece.type) {
                // Create temporary visual piece with correct properties if none exists
                console.log(`Creating visual from selected piece: ${selectedPiece.color} ${selectedPiece.type}`);
                
                if (!this.piecesMeshes[key]) {
                    this.addPiece(q, r, selectedPiece.color, selectedPiece.type);
                }
            }
        }
        
        // Get the mesh after possibly creating it
        const pieceMesh = this.piecesMeshes[key];
        
        // If there's a piece at this position, ensure it's at the floating height
        if (pieceMesh) {
            pieceMesh.position.y = POSITIONS.PIECE_FLOATING_HEIGHT;
        }
        
        // Position the cancel and validate icons above the piece
        // Make sure to position them to the left and right of the piece
        this.cancelIcon.position.set(position.x - 0.5, POSITIONS.UI_VALIDATE_ICON_HEIGHT, position.z);
        this.validateIcon.position.set(position.x + 0.5, POSITIONS.UI_VALIDATE_ICON_HEIGHT, position.z);
        
        // Make both icons visible
        this.cancelIcon.visible = true;
        this.validateIcon.visible = true;
        
        console.log('Showing both cancel and validate icons after piece movement');
    }
    
    /**
     * Show UI for tile placement
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @param {string} color - 'black' or 'white'
     */
    showTilePlacementUI(q, r, color) {
        const position = this.hexToWorld(q, r);
        
        // Remove the valid move placeholder at this position
        for (let i = this.validMovesGroup.children.length - 1; i >= 0; i--) {
            const child = this.validMovesGroup.children[i];
            if (child.userData && child.userData.q === q && child.userData.r === r) {
                this.validMovesGroup.remove(child);
            }
        }
        
        // Create a temporary floating tile
        const model = this.models[`tile_${color}`].clone();
        model.position.set(position.x, POSITIONS.TILE_FLOATING_HEIGHT, position.z); // Float above the board
        
        // Rotate tile by 30 degrees to align with hexagonal grid
        model.rotation.y = Math.PI / 6; // 30 degrees in radians
        
        model.userData = { type: 'temp-tile', q, r, color };
        this.uiGroup.add(model);
        
        // Store the temporary tile model for animation
        this.tempTileModel = model;
        
        // Position the cancel and validate icons above the tile
        this.cancelIcon.position.set(position.x - 0.5, POSITIONS.UI_VALIDATE_ICON_HEIGHT, position.z);
        this.validateIcon.position.set(position.x + 0.5, POSITIONS.UI_VALIDATE_ICON_HEIGHT, position.z);
        
        this.cancelIcon.visible = true;
        this.validateIcon.visible = true;
    }
    
    /**
     * Animate tile placement
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @param {string} color - 'black' or 'white'
     * @returns {Promise} - Promise that resolves when animation completes
     */
    async animateTilePlacement(q, r, color) {
        if (!this.tempTileModel) return Promise.resolve();

        const position = this.hexToWorld(q, r);
        const startPos = this.tempTileModel.position.clone();
        const endPos = new THREE.Vector3(position.x, POSITIONS.TILE_RESTING_HEIGHT, position.z);

        // Animate the tile dropping with a bounce effect
        await this.animationHandler.animatePosition(
            this.tempTileModel,
            startPos,
            endPos,
            {
                easing: ANIMATION_CONFIG.EASING.BOUNCE,
                duration: ANIMATION_CONFIG.DURATION * 1.2, // Slightly slower for better bounce effect
                onComplete: () => {
                    // Ensure tile is exactly at resting height after animation
                    this.tempTileModel.position.y = POSITIONS.TILE_RESTING_HEIGHT;
                }
            }
        );

        // Remove the temporary model from UI group
        this.uiGroup.remove(this.tempTileModel);
        this.tempTileModel = null;

        // Add the permanent tile
        this.addTile(q, r, color);
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
        const position = this.hexToWorld(q, r);
        
        // Find the existing floating piece in the UI group
        let floatingPiece = this.uiGroup.children.find(
            child => child.userData && 
                    child.userData.type === 'ui-icon' && 
                    child.userData.pieceType === pieceType
        );
        
        // If no floating piece found, check for tempPieceModel
        if (!floatingPiece && this.tempPieceModel) {
            if (this.tempPieceModel.userData.pieceType === pieceType) {
                floatingPiece = this.tempPieceModel;
            }
        }
        
        // If still no floating piece, create a temporary one
        if (!floatingPiece) {
            console.warn(`No floating piece found, creating a temporary ${color} ${pieceType} for animation`);
            
            // Clone the appropriate model
            const modelKey = `${pieceType}_${color}`;
            if (!this.models[modelKey]) {
                console.error(`Model not found for ${modelKey}`);
                // Add the permanent piece without animation
                this.addPiece(q, r, color, pieceType);
                return Promise.resolve();
            }
            
            floatingPiece = this.models[modelKey].clone();
            
            // Position at the floating height
            const tempPos = new THREE.Vector3(position.x, POSITIONS.PIECE_FLOATING_HEIGHT, position.z);
            floatingPiece.position.copy(tempPos);
            
            // Add user data
            floatingPiece.userData = { 
                type: 'ui-icon', 
                pieceType: pieceType, 
                q, 
                r, 
                color
            };
            
            this.uiGroup.add(floatingPiece);
        }
        
        const startPos = floatingPiece.position.clone();
        const endPos = new THREE.Vector3(position.x, POSITIONS.PIECE_RESTING_HEIGHT, position.z);
        
        // Animate the piece dropping with a bounce effect
        await this.animationHandler.animatePosition(
            floatingPiece,
            startPos,
            endPos,
            {
                easing: ANIMATION_CONFIG.EASING.BOUNCE,
                duration: ANIMATION_CONFIG.DURATION * 1.2, // Slightly slower for better bounce effect
                onComplete: () => {
                    // Ensure piece is exactly at resting height after animation
                    floatingPiece.position.y = POSITIONS.PIECE_RESTING_HEIGHT;
                }
            }
        );
        
        // Remove the temporary model from UI group
        this.uiGroup.remove(floatingPiece);
        
        // Add the permanent piece
        this.addPiece(q, r, color, pieceType);
    }
    
    /**
     * Animate a piece moving from one position to another
     * @param {number} fromQ - Starting hex q coordinate
     * @param {number} fromR - Starting hex r coordinate
     * @param {number} toQ - Destination hex q coordinate
     * @param {number} toR - Destination hex r coordinate
     * @returns {Promise} - Promise that resolves when animation completes
     */
    async animatePieceMovement(fromQ, fromR, toQ, toR) {
        const fromKey = `${fromQ},${fromR}`;
        const toKey = `${toQ},${toR}`;
        const fromPosition = this.hexToWorld(fromQ, fromR);
        const toPosition = this.hexToWorld(toQ, toR);
        
        // Get the piece mesh that's currently at the source position
        const pieceMesh = this.piecesMeshes[fromKey];
        
        if (!pieceMesh) {
            console.warn(`No piece found at (${fromQ}, ${fromR}) to animate`);
            return Promise.resolve();
        }
        
        console.log(`Animating piece movement from (${fromQ}, ${fromR}) to (${toQ}, ${toR})`);
        
        // Create start and end positions at the floating height
        const startPos = new THREE.Vector3(
            fromPosition.x, 
            POSITIONS.PIECE_FLOATING_HEIGHT,
            fromPosition.z
        );
        
        const endPos = new THREE.Vector3(
            toPosition.x, 
            POSITIONS.PIECE_FLOATING_HEIGHT,
            toPosition.z
        );

        // Store information about pieces to be captured
        const piecesToCapture = [];
        
        // Check if this is a jump move by a disc piece and if there's a piece to be captured
        if (pieceMesh.userData && pieceMesh.userData.pieceType === 'disc') {
            // Calculate if this is a jump (distance of 2)
            const distance = Math.max(
                Math.abs(toQ - fromQ), 
                Math.abs(toR - fromR), 
                Math.abs((toQ - fromQ) + (toR - fromR))
            );
            
            if (distance === 2) {
                // Calculate the coordinates of the jumped-over piece
                const jumpedQ = (fromQ + toQ) / 2;
                const jumpedR = (fromR + toR) / 2;
                const jumpedKey = `${jumpedQ},${jumpedR}`;
                
                // Check if there's a piece at the jumped position
                const jumpedPieceMesh = this.piecesMeshes[jumpedKey];
                if (jumpedPieceMesh && jumpedPieceMesh.userData) {
                    // Only remove the piece if it's an opponent's piece
                    const jumpedPieceColor = jumpedPieceMesh.userData.color;
                    const movingPieceColor = pieceMesh.userData.color;
                    
                    console.log(`Found piece at jumped position: ${jumpedPieceColor} (moving piece: ${movingPieceColor})`);
                    
                    // Only visually remove opponent's pieces, not your own
                    if (jumpedPieceColor !== movingPieceColor) {
                        console.log(`Capturing opponent piece at (${jumpedQ}, ${jumpedR})`);
                        // Store info for animation after the movement completes
                        piecesToCapture.push({ q: jumpedQ, r: jumpedR });
                    } else {
                        console.log(`Not removing own piece at (${jumpedQ}, ${jumpedR})`);
                    }
                }
            }
        }
        
        // Handle ring capture - special case because ring moves to the captured piece's position
        let capturedPieceMesh = null;
        // Check if there's a piece at the destination that needs to be captured (for ring movement)
        const destPieceMesh = this.piecesMeshes[toKey];
        if (destPieceMesh && pieceMesh.userData) {
            // Check if this is a ring (which can capture by moving onto a piece)
            if (pieceMesh.userData.pieceType === 'ring') {
                // Only remove the piece if it's an opponent's piece
                const destPieceColor = destPieceMesh.userData.color;
                const movingPieceColor = pieceMesh.userData.color;
                
                console.log(`Ring moving to position with piece: ${destPieceColor} (ring color: ${movingPieceColor})`);
                
                // Only capture opponent's pieces, not your own
                if (destPieceColor !== movingPieceColor) {
                    console.log(`Ring capturing opponent piece at (${toQ}, ${toR})`);
                    
                    // Save the mesh to be captured before we overwrite it
                    capturedPieceMesh = destPieceMesh;
                    
                    // Remove from tracking but DON'T remove from scene yet - we need to animate it
                    delete this.piecesMeshes[toKey];
                }
            }
        }
        
        // Temporarily move the piece mesh to the new key in our tracking
        delete this.piecesMeshes[fromKey];
        this.piecesMeshes[toKey] = pieceMesh;
        
        // Update the piece's userData
        if (pieceMesh.userData) {
            pieceMesh.userData.q = toQ;
            pieceMesh.userData.r = toR;
        }
        
        // Animate the piece moving with an arc path
        await this.animationHandler.animatePosition(
            pieceMesh,
            startPos,
            endPos,
            {
                easing: ANIMATION_CONFIG.EASING.EASE_OUT,
                duration: ANIMATION_CONFIG.DURATION
            }
        );
        
        // If we have a captured piece from a ring move, animate it now
        if (capturedPieceMesh) {
            try {
                console.log(`Animating ring-captured piece`);
                // Ensure we animate the correct mesh, not looking it up by coordinates
                await this.animateCapturedPieceMesh(capturedPieceMesh, toQ, toR);
            } catch (error) {
                console.error(`Error animating ring-captured piece:`, error);
                // Make sure the piece is removed from the scene
                if (capturedPieceMesh.parent) {
                    capturedPieceMesh.parent.remove(capturedPieceMesh);
                }
            }
        }
        
        // After piece movement animation completes, animate the captured pieces
        for (const capturedPiece of piecesToCapture) {
            try {
                await this.animatePieceCapture(capturedPiece.q, capturedPiece.r);
            } catch (error) {
                console.error(`Error animating capture at (${capturedPiece.q}, ${capturedPiece.r}):`, error);
                // Remove the piece directly as fallback
                this.removePiece(capturedPiece.q, capturedPiece.r);
            }
        }
        
        return true;
    }
    
    /**
     * Animate a captured piece mesh directly (used for ring captures)
     * @param {THREE.Object3D} pieceMesh - The piece mesh to animate
     * @param {number} q - Original hex q coordinate
     * @param {number} r - Original hex r coordinate
     * @returns {Promise} - Promise that resolves when animation completes
     */
    async animateCapturedPieceMesh(pieceMesh, q, r) {
        if (!pieceMesh) {
            console.warn(`No piece mesh provided to animate capture`);
            return Promise.resolve();
        }
        
        console.log(`Animating piece mesh capture from position (${q}, ${r})`);
        
        try {
            // Get the world position for reference
            const worldPos = this.hexToWorld(q, r);
            
            // Create safe start position - using current position
            const startPos = new THREE.Vector3(
                pieceMesh.position.x,
                pieceMesh.position.y,
                pieceMesh.position.z
            );
            
            // Create end position (2 units above start)
            const endPos = new THREE.Vector3(
                startPos.x,
                startPos.y + 2,
                startPos.z
            );
            
            // Create copies of the original materials to avoid affecting other pieces
            const originalMaterials = [];
            const materialMap = new Map();
            
            // Make the specific piece's materials transparent for opacity animation
            // We need to save references and create clones to avoid affecting other pieces
            pieceMesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        const newMaterials = [];
                        child.material.forEach((material, index) => {
                            if (material) {
                                // Store original
                                originalMaterials.push({
                                    mesh: child,
                                    index: index,
                                    material: material
                                });
                                
                                // Create a clone of the material to avoid affecting other pieces
                                const newMaterial = material.clone();
                                newMaterial.transparent = true;
                                newMaterial.opacity = 1.0;
                                newMaterial.needsUpdate = true;
                                
                                // Save in our map for animation
                                materialMap.set(newMaterial, 1.0);
                                newMaterials.push(newMaterial);
                            } else {
                                newMaterials.push(null);
                            }
                        });
                        child.material = newMaterials;
                    } else if (child.material) {
                        // Store original
                        originalMaterials.push({
                            mesh: child,
                            material: child.material
                        });
                        
                        // Create a clone of the material
                        const newMaterial = child.material.clone();
                        newMaterial.transparent = true;
                        newMaterial.opacity = 1.0;
                        newMaterial.needsUpdate = true;
                        
                        // Save in our map for animation
                        materialMap.set(newMaterial, 1.0);
                        child.material = newMaterial;
                    }
                }
            });
            
            // Animate position manually rather than using the animation handler
            // to avoid potential THREE.js vector calculations that might cause errors
            const duration = 600; // milliseconds
            const startTime = performance.now();
            
            // Use manual animation loop instead of the animation handler
            await new Promise(resolve => {
                const animate = () => {
                    const elapsedTime = performance.now() - startTime;
                    const progress = Math.min(elapsedTime / duration, 1);
                    
                    // Apply simple easing
                    const easedProgress = progress * (2 - progress); // Quadratic ease-out
                    
                    // Update position
                    pieceMesh.position.set(
                        startPos.x,
                        startPos.y + (endPos.y - startPos.y) * easedProgress,
                        startPos.z
                    );
                    
                    // Update opacity ONLY for the materials in our map
                    const newOpacity = 1.0 - easedProgress;
                    for (const [material, _] of materialMap) {
                        material.opacity = newOpacity;
                    }
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        // Ensure we set the final state
                        pieceMesh.position.set(endPos.x, endPos.y, endPos.z);
                        
                        // Set final opacity to 0 for our specific materials
                        for (const [material, _] of materialMap) {
                            material.opacity = 0;
                        }
                        
                        // Remove the piece from the scene
                        if (pieceMesh.parent) {
                            pieceMesh.parent.remove(pieceMesh);
                        }
                        
                        // Dispose of our cloned materials to prevent memory leaks
                        for (const [material, _] of materialMap) {
                            material.dispose();
                        }
                        
                        resolve();
                    }
                };
                
                // Start animation
                animate();
            });
            
        } catch (error) {
            console.error(`Error during capture animation for mesh:`, error);
            
            // Clean up even if animation fails
            if (pieceMesh.parent) {
                pieceMesh.parent.remove(pieceMesh);
            }
        }
        
        return true;
    }
    
    /**
     * Animate a piece being captured - floating upward while fading out
     * @param {number} q - Hex q coordinate of the captured piece
     * @param {number} r - Hex r coordinate of the captured piece
     * @returns {Promise} - Promise that resolves when animation completes
     */
    async animatePieceCapture(q, r) {
        const key = `${q},${r}`;
        const pieceMesh = this.piecesMeshes[key];
        
        if (!pieceMesh) {
            console.warn(`No piece found at (${q}, ${r}) to animate capture`);
            // Just in case, remove from tracking
            delete this.piecesMeshes[key];
            return Promise.resolve();
        }
        
        console.log(`Animating piece capture at (${q}, ${r})`);
        
        try {
            // Get the world position from hex coordinates as our primary reference
            const worldPos = this.hexToWorld(q, r);
            
            // Create safe start position - using world position to avoid THREE.js vector issues
            const startPos = new THREE.Vector3(
                worldPos.x,
                pieceMesh.position && typeof pieceMesh.position.y === 'number' 
                    ? pieceMesh.position.y 
                    : 0.2, // Default height if we can't get it
                worldPos.z
            );
            
            // Create end position (2 units above start)
            const endPos = new THREE.Vector3(
                startPos.x,
                startPos.y + 2,
                startPos.z
            );
            
            // Ensure piece is at the start position
            pieceMesh.position.set(startPos.x, startPos.y, startPos.z);
            
            // Create copies of the original materials to avoid affecting other pieces
            const originalMaterials = [];
            const materialMap = new Map();
            
            // Make the specific piece's materials transparent for opacity animation
            // We need to save references and create clones to avoid affecting other pieces
            pieceMesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        const newMaterials = [];
                        child.material.forEach((material, index) => {
                            if (material) {
                                // Store original
                                originalMaterials.push({
                                    mesh: child,
                                    index: index,
                                    material: material
                                });
                                
                                // Create a clone of the material to avoid affecting other pieces
                                const newMaterial = material.clone();
                                newMaterial.transparent = true;
                                newMaterial.opacity = 1.0;
                                newMaterial.needsUpdate = true;
                                
                                // Save in our map for animation
                                materialMap.set(newMaterial, 1.0);
                                newMaterials.push(newMaterial);
                            } else {
                                newMaterials.push(null);
                            }
                        });
                        child.material = newMaterials;
                    } else if (child.material) {
                        // Store original
                        originalMaterials.push({
                            mesh: child,
                            material: child.material
                        });
                        
                        // Create a clone of the material
                        const newMaterial = child.material.clone();
                        newMaterial.transparent = true;
                        newMaterial.opacity = 1.0;
                        newMaterial.needsUpdate = true;
                        
                        // Save in our map for animation
                        materialMap.set(newMaterial, 1.0);
                        child.material = newMaterial;
                    }
                }
            });
            
            // Animate position manually rather than using the animation handler
            // to avoid potential THREE.js vector calculations that might cause errors
            const duration = 600; // milliseconds
            const startTime = performance.now();
            
            // Use manual animation loop instead of the animation handler
            await new Promise(resolve => {
                const animate = () => {
                    const elapsedTime = performance.now() - startTime;
                    const progress = Math.min(elapsedTime / duration, 1);
                    
                    // Apply simple easing
                    const easedProgress = progress * (2 - progress); // Quadratic ease-out
                    
                    // Update position
                    pieceMesh.position.set(
                        startPos.x,
                        startPos.y + (endPos.y - startPos.y) * easedProgress,
                        startPos.z
                    );
                    
                    // Update opacity ONLY for the materials in our map
                    const newOpacity = 1.0 - easedProgress;
                    for (const [material, _] of materialMap) {
                        material.opacity = newOpacity;
                    }
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        // Ensure we set the final state
                        pieceMesh.position.set(endPos.x, endPos.y, endPos.z);
                        
                        // Set final opacity to 0 for our specific materials
                        for (const [material, _] of materialMap) {
                            material.opacity = 0;
                        }
                        
                        // Remove the piece from tracking and scene
                        delete this.piecesMeshes[key];
                        if (pieceMesh.parent) {
                            pieceMesh.parent.remove(pieceMesh);
                        }
                        
                        // Dispose of our cloned materials to prevent memory leaks
                        for (const [material, _] of materialMap) {
                            material.dispose();
                        }
                        
                        resolve();
                    }
                };
                
                // Start animation
                animate();
            });
            
        } catch (error) {
            console.error(`Error during capture animation for piece at (${q}, ${r}):`, error);
            
            // Clean up even if animation fails
            delete this.piecesMeshes[key];
            if (pieceMesh && pieceMesh.parent) {
                pieceMesh.parent.remove(pieceMesh);
            }
        }
        
        return true;
    }
    
    /**
     * Show UI for piece placement
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @param {string} color - 'black' or 'white'
     * @param {boolean} canPlaceDisc - Whether the player can place a disc
     * @param {boolean} canPlaceRing - Whether the player can place a ring
     */
    showPiecePlacementUI(q, r, color, canPlaceDisc, canPlaceRing) {
        const position = this.hexToWorld(q, r);
        
        console.log(`Showing piece placement UI at (${q}, ${r})`);
        
        // Clear any previous temporary piece model
        this.tempPieceModel = null;
        
        // Remove the valid move placeholder at this position
        for (let i = this.validMovesGroup.children.length - 1; i >= 0; i--) {
            const child = this.validMovesGroup.children[i];
            if (child.userData && child.userData.q === q && child.userData.r === r) {
                this.validMovesGroup.remove(child);
            }
        }
        
        this.cancelIcon.position.set(position.x, POSITIONS.UI_ICON_HEIGHT, position.z - 0.5);
        this.cancelIcon.visible = true;
        
        // Create a temporary reference object with coordinates for both disc and ring
        const tempRef = new THREE.Object3D();
        tempRef.position.set(position.x, 0, position.z);
        tempRef.userData = { type: 'temp-piece', q, r, color };
        this.uiGroup.add(tempRef);
        
        if (canPlaceDisc && canPlaceRing) {
            // Show both disc and ring models
            const discModel = this.models[`disc_${color}`].clone();
            const ringModel = this.models[`ring_${color}`].clone();
            
            // Scale down the models
            const discScale = 0.8; // Leave this at 0.8
            const ringScale = 0.5; // Leave this at 0.5
            discModel.scale.set(discScale, discScale, discScale);
            ringModel.scale.set(ringScale, ringScale, ringScale);
            
            // Rotate 90 degrees to be on the vertical plane
            discModel.rotation.x = Math.PI / 2;
            ringModel.rotation.x = Math.PI / 2;
            
            // Position the models
            discModel.position.set(position.x - 0.5, POSITIONS.UI_ICON_HEIGHT, position.z);
            ringModel.position.set(position.x + 0.5, POSITIONS.UI_ICON_HEIGHT, position.z);
            
            // Add user data for click detection to both the model and its children
            const discUserData = { 
                type: 'ui-icon', 
                pieceType: 'disc', 
                q, 
                r, 
                color,
                action: 'place_piece'
            };
            const ringUserData = { 
                type: 'ui-icon', 
                pieceType: 'ring', 
                q, 
                r, 
                color,
                action: 'place_piece'
            };
            
            // Set userData on the models
            discModel.userData = discUserData;
            ringModel.userData = ringUserData;
            
            // Set userData on all children of the models
            discModel.traverse((child) => {
                if (child.isMesh) {
                    child.userData = discUserData;
                }
            });
            ringModel.traverse((child) => {
                if (child.isMesh) {
                    child.userData = ringUserData;
                }
            });
            
            // Add to UI group
            this.uiGroup.add(discModel);
            this.uiGroup.add(ringModel);
            
            // Hide the validate icon since we're showing both options
            this.validateIcon.visible = false;
            
            console.log('Added both disc and ring models to UI group');
            
            // Store a reference to the model for later validation
            this.tempPieceModel = discModel;
        } else if (canPlaceDisc) {
            // Show only disc model with validation
            const model = this.models[`disc_${color}`].clone();
            
            // Keep full size for single piece
            const scale = 1.0;
            model.scale.set(scale, scale, scale);
            
            // Place on the horizontal plane (no rotation needed as the model is already horizontal)
            // Position the model floating above the tile
            model.position.set(position.x, POSITIONS.PIECE_FLOATING_HEIGHT, position.z);
            
            // Add user data for click detection
            const userData = { 
                type: 'ui-icon', 
                pieceType: 'disc', 
                q, 
                r, 
                color,
                action: 'place_piece'
            };
            
            // Set userData on the model
            model.userData = userData;
            
            // Set userData on all children of the model
            model.traverse((child) => {
                if (child.isMesh) {
                    child.userData = userData;
                }
            });
            
            this.uiGroup.add(model);
            
            // Position validation icons above the piece
            this.cancelIcon.position.set(position.x - 0.5, POSITIONS.UI_VALIDATE_ICON_HEIGHT, position.z);
            this.validateIcon.position.set(position.x + 0.5, POSITIONS.UI_VALIDATE_ICON_HEIGHT, position.z);
            this.validateIcon.visible = true;
            
            // Update selected piece type
            this.gameState.selectedPiece = { type: 'disc', q, r, color };
            
            console.log('Added disc model to UI group (single piece mode)');
            
            // Store a reference to the model for later validation
            this.tempPieceModel = model;
        } else if (canPlaceRing) {
            // Show only ring model with validation
            const model = this.models[`ring_${color}`].clone();
            
            // Keep full size for single piece
            const scale = 1.0;
            model.scale.set(scale, scale, scale);
            
            // Place on the horizontal plane (no rotation needed as the model is already horizontal)
            // Position the model floating above the tile
            model.position.set(position.x, POSITIONS.PIECE_FLOATING_HEIGHT, position.z);
            
            // Add user data for click detection
            const userData = { 
                type: 'ui-icon', 
                pieceType: 'ring', 
                q, 
                r, 
                color,
                action: 'place_piece'
            };
            
            // Set userData on the model
            model.userData = userData;
            
            // Set userData on all children of the model
            model.traverse((child) => {
                if (child.isMesh) {
                    child.userData = userData;
                }
            });
            
            this.uiGroup.add(model);
            
            // Position validation icons above the piece
            this.cancelIcon.position.set(position.x - 0.5, POSITIONS.UI_VALIDATE_ICON_HEIGHT, position.z);
            this.validateIcon.position.set(position.x + 0.5, POSITIONS.UI_VALIDATE_ICON_HEIGHT, position.z);
            this.validateIcon.visible = true;
            
            // Update selected piece type
            this.gameState.selectedPiece = { type: 'ring', q, r, color };
            
            console.log('Added ring model to UI group (single piece mode)');
            
            // Store a reference to the model for later validation
            this.tempPieceModel = model;
        }
    }
    
    /**
     * Show valid action placeholders for the current player's turn
     * These are always present for interaction, but only visible when "Show valid moves" is checked
     */
    showValidActionPlaceholders() {
        // Check if game is over - if so, don't show any placeholders
        if (this.gameState.gameStatus !== 'ongoing') {
            console.log('Game is over, not showing any placeholders');
            // Clear any existing placeholders
            while (this.validMovesGroup.children.length > 0) {
                this.validMovesGroup.remove(this.validMovesGroup.children[0]);
            }
            return;
        }
        
        const currentPlayer = this.gameState.currentPlayer;
        const showValidMoves = document.getElementById('show-valid-moves').checked;
        
        // Calculate opacity based on checkbox state
        const opacity = showValidMoves ? PLACEHOLDER.VISIBLE_OPACITY : PLACEHOLDER.INVISIBLE_OPACITY;
        
        // Clear previous placeholders
        while (this.validMovesGroup.children.length > 0) {
            this.validMovesGroup.remove(this.validMovesGroup.children[0]);
        }
        
        // If we're in the middle of a move_piece action, don't show general valid actions
        // as those will be handled by showPieceMovementUI
        if (this.gameState.currentAction === 'move_piece') {
            console.log('Currently moving a piece, not showing general valid actions');
            return;
        }
        
        // 1. Show valid tile placements
        const validTilePlacements = this.gameState.getValidTilePlacements(currentPlayer);
        if (this.gameState.pieces[currentPlayer].tilesAvailable > 0) {
            for (const placement of validTilePlacements) {
                const position = this.hexToWorld(placement.q, placement.r);
                
                // Create a semi-transparent hex indicator
                const geometry = new THREE.CylinderGeometry(
                    PLACEHOLDER.TILE_RADIUS, 
                    PLACEHOLDER.TILE_RADIUS, 
                    PLACEHOLDER.TILE_THICKNESS, 
                    PLACEHOLDER.TILE_SEGMENTS
                );
                const material = new THREE.MeshBasicMaterial({ 
                    color: PLACEHOLDER.TILE_COLOR,
                    transparent: true,
                    opacity: opacity
                });
                const indicator = new THREE.Mesh(geometry, material);
                
                // Rotate to match tile orientation
                indicator.rotation.y = Math.PI / 6; // 30 degrees in radians
                
                indicator.position.set(position.x, PLACEHOLDER.TILE_HEIGHT, position.z);
                indicator.userData = { 
                    q: placement.q, 
                    r: placement.r,
                    action: 'place_tile'
                };
                
                this.validMovesGroup.add(indicator);
            }
        }
        
        // 2. Show valid piece placements
        // Find all empty tiles of the player's color where pieces can be placed
        for (const key in this.gameState.board.tiles) {
            const [q, r] = key.split(',').map(Number);
            const tile = this.gameState.board.tiles[key];
            
            // Skip tiles that already have pieces or aren't the player's color
            if (tile.piece || tile.color !== currentPlayer) continue;
            
            // Check if player can place pieces here
            const canPlaceDisc = this.gameState.pieces[currentPlayer].discsAvailable > 0;
            const canPlaceRing = this.gameState.pieces[currentPlayer].ringsAvailable > 0 &&
                                this.gameState.pieces[currentPlayer].discsCaptured > 0;
            
            if (canPlaceDisc || canPlaceRing) {
                const position = this.hexToWorld(q, r);
                
                // Create placeholders based on available piece types
                if (canPlaceDisc) {
                    const geometry = new THREE.CylinderGeometry(
                        PLACEHOLDER.DISC_RADIUS, 
                        PLACEHOLDER.DISC_RADIUS, 
                        PLACEHOLDER.DISC_THICKNESS, 
                        PLACEHOLDER.DISC_SEGMENTS
                    );
                    const material = new THREE.MeshBasicMaterial({ 
                        color: PLACEHOLDER.PIECE_COLOR,
                        transparent: true,
                        opacity: opacity
                    });
                    const indicator = new THREE.Mesh(geometry, material);
                    
                    indicator.position.set(position.x, PLACEHOLDER.DISC_HEIGHT, position.z);
                    indicator.userData = { 
                        q, 
                        r,
                        action: 'place_piece',
                        canPlaceDisc: true,
                        canPlaceRing: canPlaceRing
                    };
                    
                    this.validMovesGroup.add(indicator);
                }
                
                if (canPlaceRing && !canPlaceDisc) {  // Only add ring if we didn't add disc
                    const geometry = new THREE.TorusGeometry(
                        PLACEHOLDER.RING_RADIUS, 
                        PLACEHOLDER.RING_TUBE, 
                        PLACEHOLDER.RING_SEGMENTS, 
                        PLACEHOLDER.RING_TUBULAR_SEGMENTS
                    );
                    const material = new THREE.MeshBasicMaterial({ 
                        color: PLACEHOLDER.PIECE_COLOR,
                        transparent: true,
                        opacity: opacity
                    });
                    const indicator = new THREE.Mesh(geometry, material);
                    indicator.rotation.x = Math.PI / 2; // Make the ring flat
                    
                    indicator.position.set(position.x, PLACEHOLDER.RING_HEIGHT, position.z);
                    indicator.userData = { 
                        q, 
                        r,
                        action: 'place_piece',
                        canPlaceDisc: false,
                        canPlaceRing: true
                    };
                    
                    this.validMovesGroup.add(indicator);
                }
            }
        }
        
        // Note: Removed the section for showing placeholders over movable pieces
        // Pieces can still be clicked and moved without visual indicators
    }

    /**
     * Update the visibility of valid move indicators based on checkbox state
     */
    updateValidMovesVisibility() {
        const showValidMoves = document.getElementById('show-valid-moves').checked;
        const opacity = showValidMoves ? 0.5 : 0;
        
        // Update opacity of all indicators
        for (const indicator of this.validMovesGroup.children) {
            if (indicator.material) {
                indicator.material.opacity = opacity;
            }
        }
    }
    
    /**
     * Animate a piece lifting up when selected for movement
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @returns {Promise} - Promise that resolves when animation completes
     */
    async animatePieceLift(q, r) {
        const key = `${q},${r}`;
        const pieceMesh = this.piecesMeshes[key];
        
        if (!pieceMesh) {
            console.warn('No piece found to animate');
            return Promise.resolve();
        }
        
        const startPos = pieceMesh.position.clone();
        const endPos = new THREE.Vector3(pieceMesh.position.x, POSITIONS.PIECE_FLOATING_HEIGHT, pieceMesh.position.z);
        
        // Animate the piece lifting with a simple ease-out effect
        await this.animationHandler.animatePosition(
            pieceMesh,
            startPos,
            endPos,
            {
                easing: ANIMATION_CONFIG.EASING.EASE_OUT,
                duration: ANIMATION_CONFIG.DURATION
            }
        );
    }

    /**
     * Show UI for piece movement
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @param {Array} validMoves - Array of valid move coordinates {q, r}
     */
    async showPieceMovementUI(q, r, validMoves) {
        const position = this.hexToWorld(q, r);
        
        // Get the piece at the clicked position
        const piece = this.gameState.board.tiles[`${q},${r}`].piece;
        if (!piece) {
            console.warn('No piece found at clicked position');
            return;
        }
        
        const pieceColor = piece.color;
        const pieceType = piece.type;
        
        // If this is a ring that has already moved (has a selectedPiece with different coordinates),
        // don't show any valid moves
        if (pieceType === 'ring' && this.gameState.selectedPiece) {
            if (this.gameState.selectedPiece.q !== q || this.gameState.selectedPiece.r !== r) {
                console.log('Ring has already moved, not showing valid moves');
                return;
            }
        }
        
        // Get or create the piece mesh
        const pieceMesh = this.piecesMeshes[`${q},${r}`];
        
        if (!pieceMesh) {
            console.log(`No piece mesh found, creating a ${pieceColor} ${pieceType}`);
            this.addPiece(q, r, pieceColor, pieceType);
        } else {
            console.log(`Found piece mesh: ${pieceMesh.userData.color} ${pieceMesh.userData.pieceType}`);
            
            // Check if the existing mesh matches what we need
            if (pieceMesh.userData.pieceType !== pieceType || pieceMesh.userData.color !== pieceColor) {
                console.log(`Updating piece mesh from ${pieceMesh.userData.color} ${pieceMesh.userData.pieceType} to ${pieceColor} ${pieceType}`);
                this.removePiece(q, r);
                this.addPiece(q, r, pieceColor, pieceType);
            }
        }
        
        // Animate the piece lifting up
        await this.animatePieceLift(q, r);
        
        // When first selecting a piece, only show the cancel icon, not validate
        this.cancelIcon.position.set(position.x, POSITIONS.UI_VALIDATE_ICON_HEIGHT, position.z);
        this.cancelIcon.visible = true;
        
        // Hide the validate icon until the piece has moved
        this.validateIcon.visible = false;
        
        // Clear any previous valid move indicators
        while (this.validMovesGroup.children.length > 0) {
            this.validMovesGroup.remove(this.validMovesGroup.children[0]);
        }
        
        // Add indicators for valid moves
        const showValidMoves = document.getElementById('show-valid-moves').checked;
        const opacity = showValidMoves ? PLACEHOLDER.VISIBLE_OPACITY : PLACEHOLDER.INVISIBLE_OPACITY;
        
        for (const move of validMoves) {
            const movePosition = this.hexToWorld(move.q, move.r);
            
            // Create a semi-transparent indicator
            let indicator;
            if (pieceType === 'disc') {
                const geometry = new THREE.CylinderGeometry(
                    PLACEHOLDER.DISC_MOVE_RADIUS,
                    PLACEHOLDER.DISC_MOVE_RADIUS,
                    PLACEHOLDER.DISC_MOVE_THICKNESS,
                    PLACEHOLDER.DISC_SEGMENTS
                );
                const material = new THREE.MeshBasicMaterial({ 
                    color: PLACEHOLDER.MOVE_COLOR,
                    transparent: true,
                    opacity: opacity
                });
                indicator = new THREE.Mesh(geometry, material);
            } else if (pieceType === 'ring') {
                const geometry = new THREE.TorusGeometry(
                    PLACEHOLDER.RING_MOVE_RADIUS,
                    PLACEHOLDER.RING_MOVE_TUBE,
                    PLACEHOLDER.RING_SEGMENTS,
                    PLACEHOLDER.RING_TUBULAR_SEGMENTS
                );
                const material = new THREE.MeshBasicMaterial({ 
                    color: PLACEHOLDER.MOVE_COLOR,
                    transparent: true,
                    opacity: opacity
                });
                indicator = new THREE.Mesh(geometry, material);
                indicator.rotation.x = Math.PI / 2; // Make the ring flat
            }
            
            indicator.position.set(movePosition.x, PLACEHOLDER.MOVE_HEIGHT, movePosition.z);
            indicator.userData = { 
                q: move.q, 
                r: move.r,
                sourceQ: q,
                sourceR: r,
                action: 'move_piece',
                pieceType: pieceType
            };
            
            this.validMovesGroup.add(indicator);
        }
    }
    
    /**
     * Show UI for further jumps after a first move, keeping both icons visible
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @param {Array} validMoves - Array of valid move coordinates {q, r}
     */
    showFurtherJumpUI(q, r, validMoves) {
        const position = this.hexToWorld(q, r);
        const key = `${q},${r}`;
        
        console.log(`Showing further jump UI at (${q}, ${r}) with ${validMoves.length} valid moves`);
        
        // Ensure we have the correct piece information
        let pieceType = 'disc'; // Default fallback for jumps (only discs can jump)
        let pieceColor = this.gameState.currentPlayer;
        
        // Check if we have a piece in the game state at this position
        const tileData = this.gameState.board.tiles[key];
        if (tileData && tileData.piece) {
            console.log(`Found piece in game state: ${tileData.piece.color} ${tileData.piece.type}`);
            pieceType = tileData.piece.type;
            pieceColor = tileData.piece.color;
        }
        
        // Or if we have piece info in selectedPiece
        if (this.gameState.selectedPiece && this.gameState.selectedPiece.type) {
            console.log(`Found piece in selectedPiece: ${this.gameState.selectedPiece.color || pieceColor} ${this.gameState.selectedPiece.type}`);
            pieceType = this.gameState.selectedPiece.type;
            if (this.gameState.selectedPiece.color) {
                pieceColor = this.gameState.selectedPiece.color;
            }
        }
        
        // Clear any previous valid move indicators
        while (this.validMovesGroup.children.length > 0) {
            this.validMovesGroup.remove(this.validMovesGroup.children[0]);
        }
        
        // Add indicators for valid moves
        const showValidMoves = document.getElementById('show-valid-moves').checked;
        const opacity = showValidMoves ? PLACEHOLDER.VISIBLE_OPACITY : PLACEHOLDER.INVISIBLE_OPACITY;
        
        for (const move of validMoves) {
            const movePosition = this.hexToWorld(move.q, move.r);
            
            // Create a semi-transparent indicator
            let indicator;
            if (pieceType === 'disc') {
                const geometry = new THREE.CylinderGeometry(
                    PLACEHOLDER.DISC_MOVE_RADIUS,
                    PLACEHOLDER.DISC_MOVE_RADIUS,
                    PLACEHOLDER.DISC_MOVE_THICKNESS,
                    PLACEHOLDER.DISC_SEGMENTS
                );
                const material = new THREE.MeshBasicMaterial({ 
                    color: PLACEHOLDER.MOVE_COLOR,
                    transparent: true,
                    opacity: opacity
                });
                indicator = new THREE.Mesh(geometry, material);
            } else if (pieceType === 'ring') {
                const geometry = new THREE.TorusGeometry(
                    PLACEHOLDER.RING_MOVE_RADIUS,
                    PLACEHOLDER.RING_MOVE_TUBE,
                    PLACEHOLDER.RING_SEGMENTS,
                    PLACEHOLDER.RING_TUBULAR_SEGMENTS
                );
                const material = new THREE.MeshBasicMaterial({ 
                    color: PLACEHOLDER.MOVE_COLOR,
                    transparent: true,
                    opacity: opacity
                });
                indicator = new THREE.Mesh(geometry, material);
                indicator.rotation.x = Math.PI / 2; // Make the ring flat
            }
            
            indicator.position.set(movePosition.x, PLACEHOLDER.MOVE_HEIGHT, movePosition.z);
            indicator.userData = { 
                q: move.q, 
                r: move.r,
                sourceQ: q,
                sourceR: r,
                action: 'move_piece',
                pieceType: pieceType
            };
            
            this.validMovesGroup.add(indicator);
        }
        
        // Important: We don't modify the cancel/validate icons here as they're already set by showValidationUI
        console.log('Further jump UI ready with both cancel and validate icons visible');
    }
    
    /**
     * Clear only the valid move indicators (placeholders)
     */
    clearValidMoveIndicators() {
        // Remove valid move indicators
        while (this.validMovesGroup.children.length > 0) {
            this.validMovesGroup.remove(this.validMovesGroup.children[0]);
        }
    }
    
    /**
     * Clear any UI elements for actions
     */
    clearActionUI(showDropAnimation = false) {
        // Store piece positions that need to drop animation before clearing
        const piecesToDrop = [];
        if (showDropAnimation) {
            for (const key in this.piecesMeshes) {
                const piece = this.piecesMeshes[key];
                if (piece && piece.position.y === POSITIONS.PIECE_FLOATING_HEIGHT) {
                    const [q, r] = key.split(',').map(Number);
                    piecesToDrop.push({ q, r });
                }
            }
        }
        
        // Hide UI icons
        this.cancelIcon.visible = false;
        this.validateIcon.visible = false;
        this.discIcon.visible = false;
        this.ringIcon.visible = false;
        
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
            for (const { q, r } of piecesToDrop) {
                this.animatePieceDropAfterMove(q, r);
            }
        } else {
            // Reset any lifted pieces back to their resting positions immediately
            for (const key in this.piecesMeshes) {
                if (this.piecesMeshes[key]) {
                    this.piecesMeshes[key].position.y = POSITIONS.PIECE_RESTING_HEIGHT;
                }
            }
        }
    }
    
    /**
     * Handle window resize
     */
    onWindowResize() {
        // Update camera aspect ratio
        this.camera.aspect = this.domElement.clientWidth / this.domElement.clientHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(this.domElement.clientWidth, this.domElement.clientHeight);
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Update controls
        this.controls.update();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Update the background color of the scene based on dark mode setting
     * @param {boolean} isDarkMode - Whether dark mode is enabled
     */
    updateBackgroundColor(isDarkMode) {
        // Use a darker color for dark mode, lighter for light mode
        if (isDarkMode) {
            this.scene.background = new THREE.Color(0x222222); // Dark gray for dark mode
            if (this.ground) {
                this.ground.material.color.setHex(0x444444); // Darker ground for dark mode
            }
        } else {
            this.scene.background = new THREE.Color(0xf0f0f0); // Light gray for light mode
            if (this.ground) {
                this.ground.material.color.setHex(0xe8e8e8); // Lighter ground for light mode
            }
        }
    }
    
    // Add zoom methods after the animate method
    
    /**
     * Zoom in the camera by the specified factor
     * @param {number} factor - The zoom factor
     */
    zoomIn(factor = 1.1) {
        if (this.camera && this.camera.zoom) {
            // Limit maximum zoom
            const newZoom = Math.min(this.camera.zoom * factor, 3.0);
            this.camera.zoom = newZoom;
            this.camera.updateProjectionMatrix();
        }
    }
    
    /**
     * Zoom out the camera by the specified factor
     * @param {number} factor - The zoom factor
     */
    zoomOut(factor = 1.1) {
        if (this.camera && this.camera.zoom) {
            // Limit minimum zoom
            const newZoom = Math.max(this.camera.zoom / factor, 0.5);
            this.camera.zoom = newZoom;
            this.camera.updateProjectionMatrix();
        }
    }

    /**
     * Animate a piece being selected from the piece choice UI (when both disc and ring are available)
     * @param {THREE.Object3D} model - The piece model to animate
     * @param {Object} position - Target hex world position {x, z}
     * @param {string} pieceType - 'disc' or 'ring'
     * @returns {Promise} - Promise that resolves when animation completes
     */
    async animatePieceSelection(model, position, pieceType) {
        if (!model) {
            console.warn('No model provided for piece selection animation');
            return Promise.resolve();
        }
        
        console.log(`Animating selection of ${pieceType} to position:`, position);
        
        // Store original values to animate from
        const startPosition = model.position.clone();
        const startRotation = new THREE.Euler().copy(model.rotation);
        const startScale = model.scale.clone();
        
        // Define end values
        const endPosition = new THREE.Vector3(position.x, POSITIONS.PIECE_FLOATING_HEIGHT, position.z);
        const endRotation = new THREE.Euler(0, 0, 0); // Horizontal orientation
        const endScale = new THREE.Vector3(1, 1, 1); // Full size
        
        // Animation duration
        const duration = ANIMATION_CONFIG.DURATION * 1.5; // Slightly longer for complex animation
        const startTime = performance.now();
        
        return new Promise((resolve) => {
            const animate = () => {
                const now = performance.now();
                const elapsed = now - startTime;
                let progress = Math.min(elapsed / duration, 1);
                
                // Apply smooth ease-out for all transformations
                const easedProgress = ANIMATION_CONFIG.EASING.EASE_OUT(progress);
                
                // Interpolate position (all axes with the same easing)
                const x = THREE.MathUtils.lerp(startPosition.x, endPosition.x, easedProgress);
                const y = THREE.MathUtils.lerp(startPosition.y, endPosition.y, easedProgress);
                const z = THREE.MathUtils.lerp(startPosition.z, endPosition.z, easedProgress);
                
                model.position.set(x, y, z);
                
                // Interpolate rotation
                model.rotation.x = THREE.MathUtils.lerp(startRotation.x, endRotation.x, easedProgress);
                model.rotation.y = THREE.MathUtils.lerp(startRotation.y, endRotation.y, easedProgress);
                model.rotation.z = THREE.MathUtils.lerp(startRotation.z, endRotation.z, easedProgress);
                
                // Interpolate scale
                const scaleX = THREE.MathUtils.lerp(startScale.x, endScale.x, easedProgress);
                const scaleY = THREE.MathUtils.lerp(startScale.y, endScale.y, easedProgress);
                const scaleZ = THREE.MathUtils.lerp(startScale.z, endScale.z, easedProgress);
                model.scale.set(scaleX, scaleY, scaleZ);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Ensure final position, rotation, and scale are exact
                    model.position.copy(endPosition);
                    model.rotation.copy(endRotation);
                    model.scale.copy(endScale);
                    resolve();
                }
            };
            
            animate();
        });
    }
} 