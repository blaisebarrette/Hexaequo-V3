/**
 * BoardState - Manages the local rendering state of the game board
 * 
 * This module separates the local rendering state from the core game state,
 * handling things like active animations, selected tiles, and visual state.
 */
import { eventBus } from '../../api/eventBus.js';
import { apiClient } from '../../api/apiClient.js';
import { DEFAULT_MODEL_CONFIG } from './modelConfig.js';

/**
 * Board state constants
 */
export const BoardStateConstants = {
    // Animation queue priorities
    ANIMATION_PRIORITY: {
        HIGH: 0,
        NORMAL: 1,
        LOW: 2
    },
    
    // Highlight types
    HIGHLIGHT_TYPE: {
        NONE: 'none',
        SELECTED: 'selected',
        VALID_MOVE: 'validMove',
        VALID_PLACEMENT: 'validPlacement', 
        LAST_MOVE: 'lastMove',
        HOVER: 'hover',
        ACTIVE: 'active'
    },
    
    // Background types
    BACKGROUND_TYPE: {
        DEFAULT: 'default',
        WOOD: 'wood',
        STONE: 'stone',
        MARBLE: 'marble'
    }
};

/**
 * BoardState class - Manages the visual state and rendering information for the game board
 */
export class BoardState {
    constructor() {
        // Visual state
        this.animationsEnabled = true;
        this.darkMode = false;
        this.backgroundColor = BoardStateConstants.BACKGROUND_TYPE.DEFAULT;
        
        // Model settings
        this.modelSettings = { ...DEFAULT_MODEL_CONFIG };
        
        // Interaction state
        this.selectedTile = null;
        this.selectedPiece = null;
        this.hoveredTile = null;
        this.hoveredPiece = null;
        this.highlightedTiles = new Map(); // Map of tileId -> highlight type
        this.validMoves = []; // Array of valid move objects
        this.validPlacements = []; // Array of valid placement objects
        
        // UI elements state
        this.activeActionUI = null; // Current active UI action (place tile, place piece, etc)
        
        // Animation state
        this.activeAnimations = new Set(); // Set of active animation IDs
        this.animationQueue = []; // Queue of animations to run
        this.isAnimating = false; // Flag to track if animations are running
        
        // Camera/view state
        this.cameraPosition = { x: 0, y: 15, z: 12 };
        this.cameraTarget = { x: 0, y: 0, z: 0 };
        this.zoomLevel = 1.0;
        
        // Game state cache
        this.gameState = {
            board: {
                tiles: [],
                pieces: []
            }
        };
        
        // Initialize event listeners
        this.setupEventListeners();
    }
    
    /**
     * Setup event listeners for board state changes
     */
    setupEventListeners() {
        // Listen for game state changes
        eventBus.subscribe('game:stateChanged', (data) => {
            this.handleGameStateChanged(data);
        });
        
        // Listen for action events
        eventBus.subscribe('action:started', (data) => {
            this.handleActionStarted(data);
        });
        
        eventBus.subscribe('action:completed', (data) => {
            this.handleActionCompleted(data);
        });
        
        eventBus.subscribe('action:cancelled', () => {
            this.handleActionCancelled();
        });
        
        // Listen for piece selection events
        eventBus.subscribe('piece:selected', (data) => {
            this.handlePieceSelected(data);
        });
        
        eventBus.subscribe('piece:deselected', () => {
            this.handlePieceDeselected();
        });
        
        // Listen for tile selection events
        eventBus.subscribe('tile:selected', (data) => {
            this.handleTileSelected(data);
        });
        
        eventBus.subscribe('tile:deselected', () => {
            this.handleTileDeselected();
        });
        
        // Listen for UI events
        eventBus.subscribe('ui:actionActivated', (data) => {
            this.handleUIActionActivated(data);
        });
        
        // Listen for settings changes
        eventBus.subscribe('settings:changed', (data) => {
            this.handleSettingsChanged(data);
        });
    }
    
    /**
     * Handle game state changes
     * @param {Object} data - Updated game state data
     */
    handleGameStateChanged(data) {
        // Cache the game state for use by getTiles and getPieces methods
        if (data.state) {
            this.gameState = data.state;
        }
        
        // Update last move highlight
        if (data.lastMove) {
            this.clearHighlightsByType(BoardStateConstants.HIGHLIGHT_TYPE.LAST_MOVE);
            
            if (data.lastMove.fromTile && data.lastMove.toTile) {
                // Movement: highlight both from and to
                this.highlightTile(data.lastMove.fromTile, BoardStateConstants.HIGHLIGHT_TYPE.LAST_MOVE);
                this.highlightTile(data.lastMove.toTile, BoardStateConstants.HIGHLIGHT_TYPE.LAST_MOVE);
            } else if (data.lastMove.tile) {
                // Placement: highlight the placement tile
                this.highlightTile(data.lastMove.tile, BoardStateConstants.HIGHLIGHT_TYPE.LAST_MOVE);
            }
        }
        
        // Clear selections when turn changes
        if (data.currentPlayer) {
            this.selectedPiece = null;
            this.selectedTile = null;
            this.clearValidMoves();
            this.clearValidPlacements();
        }
        
        // Publish updated board state event
        this.publishBoardStateUpdate();
    }
    
    /**
     * Handle action started events
     * @param {Object} data - Action data
     */
    handleActionStarted(data) {
        this.activeActionUI = data.action;
        
        switch (data.action) {
            case 'placeTile':
                this.showValidTilePlacements();
                break;
            case 'placePiece':
                this.showValidPiecePlacements();
                break;
            case 'movePiece':
                if (data.pieceId) {
                    this.selectPiece(data.pieceId);
                }
                break;
        }
        
        // Publish updated board state event
        this.publishBoardStateUpdate();
    }
    
    /**
     * Handle action completed events
     * @param {Object} data - Action result data
     */
    handleActionCompleted(data) {
        this.activeActionUI = null;
        this.clearValidMoves();
        this.clearValidPlacements();
        this.selectedPiece = null;
        this.selectedTile = null;
        
        // Publish updated board state event
        this.publishBoardStateUpdate();
    }
    
    /**
     * Handle action cancelled events
     */
    handleActionCancelled() {
        this.activeActionUI = null;
        this.clearValidMoves();
        this.clearValidPlacements();
        this.selectedPiece = null;
        this.selectedTile = null;
        
        // Publish updated board state event
        this.publishBoardStateUpdate();
    }
    
    /**
     * Handle piece selected events
     * @param {Object} data - Piece data
     */
    handlePieceSelected(data) {
        this.selectedPiece = data.pieceId;
        
        // If in movePiece action, show valid moves
        if (this.activeActionUI === 'movePiece') {
            this.showValidMovesForPiece(data.pieceId);
        }
        
        // Publish updated board state event
        this.publishBoardStateUpdate();
    }
    
    /**
     * Handle piece deselected events
     */
    handlePieceDeselected() {
        this.selectedPiece = null;
        this.clearValidMoves();
        
        // Publish updated board state event
        this.publishBoardStateUpdate();
    }
    
    /**
     * Handle tile selected events
     * @param {Object} data - Tile data
     */
    handleTileSelected(data) {
        this.selectedTile = data.tileId;
        
        // If we have a selected piece and valid moves, check if this is a valid move
        if (this.selectedPiece && this.validMoves.length > 0) {
            const isValidMove = this.validMoves.some(move => move.toTile === data.tileId);
            
            if (isValidMove) {
                // Request move via API
                this.requestMovePiece(this.selectedPiece, data.tileId);
            }
        }
        
        // If in placeTile action, check if this is a valid placement
        if (this.activeActionUI === 'placeTile' && this.validPlacements.length > 0) {
            const isValidPlacement = this.validPlacements.some(placement => 
                placement.x === data.x && placement.y === data.y && placement.z === data.z);
            
            if (isValidPlacement) {
                // Request tile placement via API
                this.requestPlaceTile(data.x, data.y, data.z);
            }
        }
        
        // If in placePiece action and we have valid placements, check if this is valid
        if (this.activeActionUI === 'placePiece' && this.validPlacements.length > 0) {
            const isValidPlacement = this.validPlacements.some(placement => placement.tileId === data.tileId);
            
            if (isValidPlacement) {
                // Request piece placement via API (need pieceType from UI)
                // This will be handled by UI components that track selected piece type
            }
        }
        
        // Publish updated board state event
        this.publishBoardStateUpdate();
    }
    
    /**
     * Handle tile deselected events
     */
    handleTileDeselected() {
        this.selectedTile = null;
        
        // Publish updated board state event
        this.publishBoardStateUpdate();
    }
    
    /**
     * Handle UI action activated events
     * @param {Object} data - UI action data
     */
    handleUIActionActivated(data) {
        this.activeActionUI = data.action;
        
        switch (data.action) {
            case 'placeTile':
                this.showValidTilePlacements();
                break;
            case 'placePiece':
                this.showValidPiecePlacements();
                break;
            case 'movePiece':
                // Wait for piece selection to show valid moves
                break;
            default:
                this.clearValidMoves();
                this.clearValidPlacements();
        }
        
        // Publish updated board state event
        this.publishBoardStateUpdate();
    }
    
    /**
     * Handle settings changed events
     * @param {Object} data - Settings data
     */
    handleSettingsChanged(data) {
        // Update dark mode
        if (data.darkMode !== undefined) {
            this.darkMode = data.darkMode;
        }
        
        // Update animations
        if (data.animationsEnabled !== undefined) {
            this.animationsEnabled = data.animationsEnabled;
        }
        
        // Update background
        if (data.backgroundColor !== undefined) {
            this.backgroundColor = data.backgroundColor;
        }
        
        // Update model settings
        if (data.modelSettings) {
            const modelSettingsChanged = 
                data.modelSettings.theme !== this.modelSettings.theme ||
                data.modelSettings.quality !== this.modelSettings.quality;
                
            // Update settings
            this.modelSettings = {
                ...this.modelSettings,
                ...data.modelSettings
            };
            
            // If theme or quality changed, update the models via API
            if (modelSettingsChanged) {
                apiClient.request('configureModelLoading', {
                    theme: this.modelSettings.theme,
                    quality: this.modelSettings.quality,
                    useFallbackIfLoadFails: this.modelSettings.useFallbackIfLoadFails,
                    showLoadingProgress: this.modelSettings.showLoadingProgress
                }).then(() => {
                    // If needed, also trigger model reload
                    if (data.modelSettings.reload) {
                        apiClient.request('setModelTheme', {
                            theme: this.modelSettings.theme,
                            quality: this.modelSettings.quality
                        });
                    }
                });
            }
        }
        
        // Publish updated state
        this.publishBoardStateUpdate();
    }
    
    /**
     * Request the valid moves for a piece via API
     * @param {string} pieceId - ID of the piece
     */
    async showValidMovesForPiece(pieceId) {
        try {
            const result = await apiClient.request('getValidMoves', { pieceId });
            
            if (result.success) {
                this.validMoves = result.data.moves;
                
                // Highlight valid move tiles
                this.clearHighlightsByType(BoardStateConstants.HIGHLIGHT_TYPE.VALID_MOVE);
                this.validMoves.forEach(move => {
                    this.highlightTile(move.toTile, BoardStateConstants.HIGHLIGHT_TYPE.VALID_MOVE);
                });
                
                // Publish updated board state event
                this.publishBoardStateUpdate();
            }
        } catch (error) {
            console.error('Error fetching valid moves:', error);
            eventBus.publish('error', { 
                message: 'Failed to get valid moves',
                details: error
            });
        }
    }
    
    /**
     * Request the valid tile placements via API
     */
    async showValidTilePlacements() {
        try {
            const result = await apiClient.request('getValidTilePlacements', {});
            
            if (result.success) {
                this.validPlacements = result.data.placements;
                
                // Highlight valid placement tiles
                this.clearHighlightsByType(BoardStateConstants.HIGHLIGHT_TYPE.VALID_PLACEMENT);
                this.validPlacements.forEach(placement => {
                    // Creating a virtual tileId for highlighting
                    const tileId = `x${placement.x}y${placement.y}z${placement.z}`;
                    this.highlightTile(tileId, BoardStateConstants.HIGHLIGHT_TYPE.VALID_PLACEMENT);
                });
                
                // Publish updated board state event
                this.publishBoardStateUpdate();
            }
        } catch (error) {
            console.error('Error fetching valid tile placements:', error);
            eventBus.publish('error', { 
                message: 'Failed to get valid tile placements',
                details: error
            });
        }
    }
    
    /**
     * Request the valid piece placements via API
     */
    async showValidPiecePlacements() {
        try {
            const result = await apiClient.request('getValidPiecePlacements', {});
            
            if (result.success) {
                this.validPlacements = result.data.placements;
                
                // Highlight valid placement tiles
                this.clearHighlightsByType(BoardStateConstants.HIGHLIGHT_TYPE.VALID_PLACEMENT);
                this.validPlacements.forEach(placement => {
                    this.highlightTile(placement.tileId, BoardStateConstants.HIGHLIGHT_TYPE.VALID_PLACEMENT);
                });
                
                // Publish updated board state event
                this.publishBoardStateUpdate();
            }
        } catch (error) {
            console.error('Error fetching valid piece placements:', error);
            eventBus.publish('error', { 
                message: 'Failed to get valid piece placements',
                details: error
            });
        }
    }
    
    /**
     * Request a move piece action via API
     * @param {string} pieceId - ID of the piece to move
     * @param {string} toTileId - ID of the destination tile
     */
    async requestMovePiece(pieceId, toTileId) {
        try {
            const result = await apiClient.request('movePiece', { 
                pieceId, 
                toTileId 
            });
            
            if (!result.success) {
                eventBus.publish('error', { 
                    message: 'Failed to move piece',
                    details: result.error
                });
            }
        } catch (error) {
            console.error('Error moving piece:', error);
            eventBus.publish('error', { 
                message: 'Failed to move piece',
                details: error
            });
        }
    }
    
    /**
     * Request a place tile action via API
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     */
    async requestPlaceTile(x, y, z) {
        try {
            const result = await apiClient.request('placeTile', { 
                position: { x, y, z }
            });
            
            if (!result.success) {
                eventBus.publish('error', { 
                    message: 'Failed to place tile',
                    details: result.error
                });
            }
        } catch (error) {
            console.error('Error placing tile:', error);
            eventBus.publish('error', { 
                message: 'Failed to place tile',
                details: error
            });
        }
    }
    
    /**
     * Request a place piece action via API
     * @param {string} tileId - ID of the tile to place on
     * @param {string} pieceType - Type of piece to place
     */
    async requestPlacePiece(tileId, pieceType) {
        try {
            const result = await apiClient.request('placePiece', { 
                tileId, 
                pieceType 
            });
            
            if (!result.success) {
                eventBus.publish('error', { 
                    message: 'Failed to place piece',
                    details: result.error
                });
            }
        } catch (error) {
            console.error('Error placing piece:', error);
            eventBus.publish('error', { 
                message: 'Failed to place piece',
                details: error
            });
        }
    }
    
    /**
     * Highlight a tile with a specific highlight type
     * @param {string} tileId - ID of the tile to highlight
     * @param {string} highlightType - Type of highlight from BoardStateConstants.HIGHLIGHT_TYPE
     */
    highlightTile(tileId, highlightType) {
        this.highlightedTiles.set(tileId, highlightType);
        
        // Publish highlighted tile event
        eventBus.publish('board:tileHighlighted', {
            tileId,
            highlightType
        });
    }
    
    /**
     * Clear all highlights of a specific type
     * @param {string} highlightType - Type of highlight to clear
     */
    clearHighlightsByType(highlightType) {
        const tilesToClear = [];
        
        for (const [tileId, type] of this.highlightedTiles.entries()) {
            if (type === highlightType) {
                tilesToClear.push(tileId);
            }
        }
        
        // Remove highlights from the map
        tilesToClear.forEach(tileId => {
            this.highlightedTiles.delete(tileId);
            
            // Publish tile unhighlighted event
            eventBus.publish('board:tileUnhighlighted', { tileId });
        });
    }
    
    /**
     * Clear all highlights
     */
    clearAllHighlights() {
        const tileIds = Array.from(this.highlightedTiles.keys());
        
        // Clear the map
        this.highlightedTiles.clear();
        
        // Publish events for each tile
        tileIds.forEach(tileId => {
            eventBus.publish('board:tileUnhighlighted', { tileId });
        });
    }
    
    /**
     * Clear valid moves
     */
    clearValidMoves() {
        this.validMoves = [];
        this.clearHighlightsByType(BoardStateConstants.HIGHLIGHT_TYPE.VALID_MOVE);
    }
    
    /**
     * Clear valid placements
     */
    clearValidPlacements() {
        this.validPlacements = [];
        this.clearHighlightsByType(BoardStateConstants.HIGHLIGHT_TYPE.VALID_PLACEMENT);
    }
    
    /**
     * Select a piece programmatically
     * @param {string} pieceId - ID of the piece to select
     */
    selectPiece(pieceId) {
        this.selectedPiece = pieceId;
        
        // Publish piece selected event
        eventBus.publish('piece:selected', { pieceId });
        
        // If in movePiece action, show valid moves
        if (this.activeActionUI === 'movePiece') {
            this.showValidMovesForPiece(pieceId);
        }
    }
    
    /**
     * Select a tile programmatically
     * @param {string} tileId - ID of the tile to select
     */
    selectTile(tileId) {
        this.selectedTile = tileId;
        this.highlightTile(tileId, BoardStateConstants.HIGHLIGHT_TYPE.SELECTED);
        
        // Publish tile selected event
        eventBus.publish('tile:selected', { tileId });
    }
    
    /**
     * Add an active animation to the board state
     * @param {string} animationId - Unique ID for the animation
     */
    addActiveAnimation(animationId) {
        this.activeAnimations.add(animationId);
        this.isAnimating = this.activeAnimations.size > 0;
        
        // Publish animation started event
        eventBus.publish('board:animationStarted', { 
            animationId,
            activeCount: this.activeAnimations.size
        });
    }
    
    /**
     * Remove an active animation from the board state
     * @param {string} animationId - ID of the animation to remove
     */
    removeActiveAnimation(animationId) {
        this.activeAnimations.delete(animationId);
        this.isAnimating = this.activeAnimations.size > 0;
        
        // Publish animation ended event
        eventBus.publish('board:animationEnded', { 
            animationId,
            activeCount: this.activeAnimations.size
        });
        
        // If no active animations and items in queue, run next animation
        if (this.activeAnimations.size === 0 && this.animationQueue.length > 0) {
            this.runNextAnimation();
        }
    }
    
    /**
     * Queue an animation function to run
     * @param {Function} animationFn - Animation function that returns a Promise
     * @param {number} priority - Priority level (see BoardStateConstants.ANIMATION_PRIORITY)
     */
    queueAnimation(animationFn, priority = BoardStateConstants.ANIMATION_PRIORITY.NORMAL) {
        // Add to queue with priority
        this.animationQueue.push({
            run: animationFn,
            priority
        });
        
        // Sort queue by priority
        this.animationQueue.sort((a, b) => a.priority - b.priority);
        
        // If not currently animating, run next animation
        if (!this.isAnimating) {
            this.runNextAnimation();
        }
    }
    
    /**
     * Run the next animation in the queue
     */
    runNextAnimation() {
        if (this.animationQueue.length === 0) return;
        
        const nextAnimation = this.animationQueue.shift();
        nextAnimation.run();
    }
    
    /**
     * Clear all animations in the queue and complete running animations
     */
    clearAnimations() {
        this.animationQueue = [];
        eventBus.publish('board:animationsCleared');
    }
    
    /**
     * Update camera position
     * @param {Object} position - Position object {x, y, z}
     */
    updateCameraPosition(position) {
        this.cameraPosition = { ...position };
        
        // Publish camera updated event
        eventBus.publish('board:cameraUpdated', { 
            position: this.cameraPosition,
            target: this.cameraTarget,
            zoomLevel: this.zoomLevel
        });
    }
    
    /**
     * Update camera target
     * @param {Object} target - Target object {x, y, z}
     */
    updateCameraTarget(target) {
        this.cameraTarget = { ...target };
        
        // Publish camera updated event
        eventBus.publish('board:cameraUpdated', { 
            position: this.cameraPosition,
            target: this.cameraTarget,
            zoomLevel: this.zoomLevel
        });
    }
    
    /**
     * Update zoom level
     * @param {number} level - Zoom level factor
     */
    updateZoomLevel(level) {
        this.zoomLevel = level;
        
        // Publish camera updated event
        eventBus.publish('board:cameraUpdated', { 
            position: this.cameraPosition,
            target: this.cameraTarget,
            zoomLevel: this.zoomLevel
        });
    }
    
    /**
     * Publish board state update event
     */
    publishBoardStateUpdate() {
        eventBus.publish('board:stateChanged', {
            darkMode: this.darkMode,
            animationsEnabled: this.animationsEnabled,
            backgroundColor: this.backgroundColor,
            modelSettings: this.modelSettings,
            selectedTile: this.selectedTile,
            selectedPiece: this.selectedPiece,
            hoveredTile: this.hoveredTile,
            hoveredPiece: this.hoveredPiece,
            highlightedTiles: Array.from(this.highlightedTiles.entries()),
            activeActionUI: this.activeActionUI,
            validMoves: [...this.validMoves],
            validPlacements: [...this.validPlacements],
            isAnimating: this.isAnimating,
            timestamp: Date.now()
        });
    }

    /**
     * Get a serializable version of the board state
     * @returns {Object} Serializable state object
     */
    getSerializableState() {
        return {
            // Visual settings
            darkMode: this.darkMode,
            backgroundColor: this.backgroundColor,
            animationsEnabled: this.animationsEnabled,
            modelSettings: {...this.modelSettings},
            
            // Interaction state
            selectedTile: this.selectedTile,
            selectedPiece: this.selectedPiece,
            hoveredTile: this.hoveredTile,
            hoveredPiece: this.hoveredPiece,
            
            // Convert Map to Object for serialization
            highlightedTiles: Object.fromEntries(this.highlightedTiles),
            
            // Arrays
            validMoves: [...this.validMoves],
            validPlacements: [...this.validPlacements],
            
            // UI state
            activeActionUI: this.activeActionUI,
            
            // Camera/view state
            cameraPosition: {...this.cameraPosition},
            cameraTarget: {...this.cameraTarget},
            zoomLevel: this.zoomLevel,
            
            // Animation state - only send flags, not the actual animations
            isAnimating: this.isAnimating,
            hasActiveAnimations: this.activeAnimations.size > 0,
            
            // Timestamp for state tracking
            timestamp: Date.now()
        };
    }

    /**
     * Get all tiles on the board
     * @returns {Array} Array of tile objects
     */
    getTiles() {
        return this.gameState?.board?.tiles || [];
    }

    /**
     * Get a tile by its ID
     * @param {string} tileId - The ID of the tile to get
     * @returns {Object|null} The tile or null if not found
     */
    getTileById(tileId) {
        const tiles = this.getTiles();
        return tiles.find(tile => tile.id === tileId) || null;
    }

    /**
     * Get a tile at specific coordinates
     * @param {number} q - Q coordinate
     * @param {number} r - R coordinate
     * @returns {Object|null} The tile or null if not found
     */
    getTileAtCoordinates(q, r) {
        const tiles = this.getTiles();
        return tiles.find(tile => tile.q === q && tile.r === r) || null;
    }

    /**
     * Get all pieces on the board
     * @returns {Array} Array of piece objects
     */
    getPieces() {
        return this.gameState?.board?.pieces || [];
    }

    /**
     * Get a piece by its ID
     * @param {string} pieceId - The ID of the piece to get
     * @returns {Object|null} The piece or null if not found
     */
    getPieceById(pieceId) {
        const pieces = this.getPieces();
        return pieces.find(piece => piece.id === pieceId) || null;
    }

    /**
     * Get pieces on a specific tile
     * @param {string} tileId - The ID of the tile
     * @returns {Array} Array of pieces on the tile
     */
    getPiecesOnTile(tileId) {
        const pieces = this.getPieces();
        return pieces.filter(piece => piece.tileId === tileId);
    }
}

// Create singleton instance but don't export it - keep it private to this module
const boardState = new BoardState(); 

// Export only the BoardState class, not the instance
// Using the class, the board module will create and manage its own instance 