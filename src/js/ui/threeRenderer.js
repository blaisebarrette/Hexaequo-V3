import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Constants for positioning
const POSITIONS = {
    // Tile positions
    TILE_RESTING_HEIGHT: 0,
    TILE_FLOATING_HEIGHT: 1,
    
    // Piece positions
    PIECE_RESTING_HEIGHT: 0,
    PIECE_FLOATING_HEIGHT: 0.5,
    
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
     * @returns {boolean} - True if the disc icon was clicked
     */
    isDiscClicked(x, y) {
        this.mouse.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(y / this.renderer.domElement.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Make sure discIcon is visible and check intersections
        if (!this.discIcon.visible) return false;
        
        // Use a more precise intersection test
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
        this.mouse.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(y / this.renderer.domElement.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Make sure ringIcon is visible and check intersections
        if (!this.ringIcon.visible) return false;
        
        // Use a more precise intersection test
        const intersects = this.raycaster.intersectObject(this.ringIcon, true);
        
        return intersects.length > 0;
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
        
        // If there's a piece at this position, lift it above the board
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
        
        // Create a temporary floating tile
        const model = this.models[`tile_${color}`].clone();
        model.position.set(position.x, POSITIONS.TILE_FLOATING_HEIGHT, position.z); // Float above the board
        
        // Rotate tile by 30 degrees to align with hexagonal grid
        model.rotation.y = Math.PI / 6; // 30 degrees in radians
        
        model.userData = { type: 'temp-tile', q, r, color };
        this.uiGroup.add(model);
        
        // Position the cancel and validate icons above the tile
        this.cancelIcon.position.set(position.x - 0.5, POSITIONS.UI_VALIDATE_ICON_HEIGHT, position.z);
        this.validateIcon.position.set(position.x + 0.5, POSITIONS.UI_VALIDATE_ICON_HEIGHT, position.z);
        
        this.cancelIcon.visible = true;
        this.validateIcon.visible = true;
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
        
        this.cancelIcon.position.set(position.x, POSITIONS.UI_ICON_HEIGHT, position.z - 0.5);
        this.cancelIcon.visible = true;
        
        // Create a temporary reference object with coordinates for both disc and ring
        const tempRef = new THREE.Object3D();
        tempRef.position.set(position.x, 0, position.z);
        tempRef.userData = { type: 'temp-piece', q, r, color };
        this.uiGroup.add(tempRef);
        
        if (canPlaceDisc && canPlaceRing) {
            // Show both disc and ring icons
            this.discIcon.position.set(position.x - 0.5, POSITIONS.UI_ICON_HEIGHT, position.z);
            this.ringIcon.position.set(position.x + 0.5, POSITIONS.UI_ICON_HEIGHT, position.z);
            
            this.discIcon.visible = true;
            this.ringIcon.visible = true;
            this.validateIcon.visible = false;
        } else if (canPlaceDisc) {
            // Show only disc icon with validation
            const model = this.models[`disc_${color}`].clone();
            model.position.set(position.x, POSITIONS.PIECE_FLOATING_HEIGHT, position.z);
            model.userData = { type: 'temp-piece', pieceType: 'disc', q, r, color };
            this.uiGroup.add(model);
            
            this.validateIcon.position.set(position.x, POSITIONS.UI_ICON_HEIGHT, position.z + 0.5);
            this.validateIcon.visible = true;
            
            // Update selected piece type
            this.gameState.selectedPiece = { type: 'disc', q, r };
        } else if (canPlaceRing) {
            // Show only ring icon with validation
            const model = this.models[`ring_${color}`].clone();
            model.position.set(position.x, POSITIONS.PIECE_FLOATING_HEIGHT, position.z);
            model.userData = { type: 'temp-piece', pieceType: 'ring', q, r, color };
            this.uiGroup.add(model);
            
            this.validateIcon.position.set(position.x, POSITIONS.UI_ICON_HEIGHT, position.z + 0.5);
            this.validateIcon.visible = true;
            
            // Update selected piece type
            this.gameState.selectedPiece = { type: 'ring', q, r };
        }
    }
    
    /**
     * Show valid action placeholders for the current player's turn
     * These are always present for interaction, but only visible when "Show valid moves" is checked
     */
    showValidActionPlaceholders() {
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
     * Show UI for piece movement
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @param {Array} validMoves - Array of valid move coordinates {q, r}
     */
    showPieceMovementUI(q, r, validMoves) {
        const position = this.hexToWorld(q, r);
        const key = `${q},${r}`;
        
        console.log(`Showing piece movement UI at (${q}, ${r})`);
        
        // Ensure we have the correct piece information
        let pieceType = 'disc'; // Default fallback
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
        
        // Get or create the correct piece mesh
        const pieceMesh = this.piecesMeshes[key];
        
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
        
        // Now lift the piece (after getting or creating it)
        const updatedPieceMesh = this.piecesMeshes[key];
        if (updatedPieceMesh) {
            updatedPieceMesh.position.y = POSITIONS.PIECE_FLOATING_HEIGHT;
        } else {
            console.error(`Failed to get or create piece mesh at (${q}, ${r})`);
        }
        
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
     * Clear any UI elements for actions
     */
    clearActionUI() {
        // Hide UI icons
        this.cancelIcon.visible = false;
        this.validateIcon.visible = false;
        this.discIcon.visible = false;
        this.ringIcon.visible = false;
        
        // Remove temporary tiles/pieces
        for (let i = this.uiGroup.children.length - 1; i >= 0; i--) {
            const child = this.uiGroup.children[i];
            if (child.userData && (child.userData.type === 'temp-tile' || child.userData.type === 'temp-piece')) {
                this.uiGroup.remove(child);
            }
        }
        
        // Clear valid move indicators
        while (this.validMovesGroup.children.length > 0) {
            this.validMovesGroup.remove(this.validMovesGroup.children[0]);
        }
        
        // Reset any lifted pieces back to their resting positions
        for (const key in this.piecesMeshes) {
            if (this.piecesMeshes[key]) {
                this.piecesMeshes[key].position.y = POSITIONS.PIECE_RESTING_HEIGHT;
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
} 