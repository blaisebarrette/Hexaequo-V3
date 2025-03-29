/**
 * Board Module - Main entry point for the game board module
 * 
 * This module connects the game board to the API and serves as the
 * main interface for board-related functionality.
 */
import { eventBus } from '../api/eventBus.js';
import { apiClient } from '../api/apiClient.js';
import { BoardState, BoardStateConstants } from './core/boardState.js';
import { AnimationHandler } from './rendering/animationHandler.js';
import { ThreeRenderer } from './rendering/threeRenderer.js';
import { LoadingOverlay } from './components/loadingOverlay.js';

// Private module-level variables - not directly accessible from outside
let renderer = null;
let loadingOverlay = null;
let initialized = false;
let boardState = null;
let animationHandler = null;

/**
 * Initialize the board module and set up event handlers
 */
export function initializeBoardModule() {
    console.log('Initializing board module...');
    
    if (initialized) {
        console.warn('Board module already initialized');
        return true;
    }
    
    // Create our BoardState instance
    boardState = new BoardState();
    
    // Create our AnimationHandler with the boardState instance
    animationHandler = new AnimationHandler(boardState);
    
    // Get the container element
    const boardContainer = document.getElementById('game-board');
    
    if (!boardContainer) {
        console.error('Game board container not found, cannot initialize renderer');
        return false;
    }
    
    console.log('Found game board container, initializing renderer...');
    
    // Initialize the loading overlay
    loadingOverlay = new LoadingOverlay(boardContainer);
    
    // Initialize the Three.js renderer using the dedicated method
    initializeRenderer('game-board');
    
    // Set up event handlers for board module
    setupEventHandlers();
    
    // Register API handlers
    registerAPIHandlers();
    
    // Show initial valid action placeholders
    setTimeout(() => {
        showValidActionPlaceholders();
    }, 1000); // Wait a second for everything to initialize
    
    initialized = true;
    
    // Signal that board module is ready
    eventBus.publish('board:initialized', { success: true });
    
    return true;
}

/**
 * Set up event handlers for the board module
 */
function setupEventHandlers() {
    // Listen for game state changes
    eventBus.subscribe('game:stateChanged', (data) => {
        // Any additional handling beyond what boardState does
        console.log('Board module handling game state change:', data);
        
        // Debug logging for board data
        if (data.state && data.state.board) {
            console.log('Game state board data:', data.state.board);
            if (data.state.board.tiles) {
                console.log('Number of tiles:', data.state.board.tiles.length);
            }
            if (data.state.board.pieces) {
                console.log('Number of pieces:', data.state.board.pieces.length);
            }
        }
        
        // Show valid action placeholders after state change
        showValidActionPlaceholders();
    });
    
    // Listen for board position clicks
    eventBus.subscribe('board:positionClicked', (data) => {
        handleClick(data);
    });
    
    // Listen for board position hover
    eventBus.subscribe('board:positionHovered', (data) => {
        handleHover(data);
    });
    
    // Listen for keyboard input
    eventBus.subscribe('input:keyPressed', (data) => {
        handleKeyPress(data);
    });
    
    // Listen for animation events
    eventBus.subscribe('board:animationStarted', (data) => {
        // Handle animation started
        console.log('Animation started:', data.animationId);
    });
    
    eventBus.subscribe('board:animationEnded', (data) => {
        // Handle animation ended
        console.log('Animation ended:', data.animationId);
    });
    
    // Listen for action events to update placeholders
    eventBus.subscribe('action:started', (data) => {
        console.log('Action started, updating placeholders:', data.action);
        showValidActionPlaceholders();
    });
    
    eventBus.subscribe('action:completed', () => {
        console.log('Action completed, updating placeholders');
        showValidActionPlaceholders();
    });
    
    eventBus.subscribe('action:cancelled', () => {
        console.log('Action cancelled, updating placeholders');
        showValidActionPlaceholders();
    });
    
    // Listen for UI element clicks
    eventBus.subscribe('ui:cancelClicked', () => {
        console.log('Cancel button clicked');
        cancelAction();
    });
    
    eventBus.subscribe('ui:validateClicked', () => {
        console.log('Validate button clicked');
        // Complete the current action
        completeCurrentAction();
    });
    
    eventBus.subscribe('ui:pieceTypeSelected', (data) => {
        console.log(`Piece type selected: ${data.pieceType}`);
        // Handle piece type selection
        selectPieceType(data.pieceType);
    });
}

/**
 * Register API handlers related to the board
 */
function registerAPIHandlers() {
    // Register required board module API handlers
    apiClient.registerHandlers({
        // Board state and validation handlers
        showValidTilePlacements: async () => {
            const result = await showValidActionPlaceholders();
            return { success: result };
        },
        
        showValidPiecePlacements: async () => {
            const result = await showValidActionPlaceholders();
            return { success: result };
        },
        
        getValidTilePlacements: () => {
            const placements = getValidTilePlacements();
            return { success: true, data: { placements } };
        },
        
        getValidPiecePlacements: () => {
            const placements = getValidPiecePlacements();
            return { success: true, data: { placements } };
        },
        
        getValidMoves: (data) => {
            const { q, r } = data;
            const moves = getValidMoves({ q, r });
            return { success: true, data: { moves } };
        },
        
        selectTile: (data) => {
            const result = selectTile(data);
            return { success: !!result };
        },
        
        selectPiece: (data) => {
            const result = selectPiece(data.pieceId);
            return { success: !!result };
        },
        
        // Action handlers
        startPlaceTileAction: async () => {
            const result = await startPlaceTileAction();
            return { success: !!result };
        },
        
        startPlacePieceAction: async () => {
            const result = await startPlacePieceAction();
            return { success: !!result };
        },
        
        startMovePieceAction: async (data) => {
            const { pieceId } = data;
            const result = await startMovePieceAction(pieceId);
            return { success: !!result };
        },
        
        completeCurrentAction: async () => {
            const result = await completeCurrentAction();
            return { success: !!result };
        },
        
        cancelAction: () => {
            cancelAction();
            return { success: true };
        },
        
        // UI methods
        toggleDarkMode: (data) => {
            const { enabled } = data;
            const result = toggleDarkMode(enabled);
            return { success: true, data: { darkMode: result } };
        },
        
        updateBackgroundColor: (data) => {
            const { type } = data;
            updateBackgroundColor(type);
            return { success: true };
        },
        
        updateBoardSettings: (data) => {
            const { settings } = data;
            const result = updateBoardSettings(settings);
            return { success: !!result };
        },
        
        resetScene: (data) => {
            const { keepSettings } = data;
            const result = resetScene(keepSettings);
            return { success: !!result };
        },
        
        // Model settings handlers
        getModelSettings: () => {
            const settings = getModelSettings();
            return { success: true, data: { settings } };
        },
        
        updateModelSettings: (data) => {
            const { settings } = data;
            const result = updateModelSettings(settings);
            return { success: !!result };
        },
        
        refreshModels: () => {
            const result = refreshModels();
            return { success: !!result };
        },
        
        getAvailableModelThemes: async () => {
            try {
                // Dynamically import the model config module
                const modelConfig = await import('./core/modelConfig.js');
                const themes = modelConfig.getAvailableThemes();
                return { success: true, data: { themes } };
            } catch (error) {
                console.error('Failed to get available model themes:', error);
                return { success: false, error: error.message };
            }
        },
        
        getAvailableModelQualities: async () => {
            try {
                // Dynamically import the model config module
                const modelConfig = await import('./core/modelConfig.js');
                const qualities = modelConfig.getAvailableQualityLevels();
                return { success: true, data: { qualities } };
            } catch (error) {
                console.error('Failed to get available model qualities:', error);
                return { success: false, error: error.message };
            }
        },
        
        // New UI methods for scene management
        showTilePlacementUIForPosition: async (data) => {
            const { q, r } = data;
            const result = await showTilePlacementUIForPosition(q, r);
            return { success: !!result };
        },
        
        showPiecePlacementUIForTile: async (data) => {
            const { q, r, color } = data;
            const result = await showPiecePlacementUIForTile(q, r, color);
            return { success: !!result };
        },
        
        selectPieceType: async (data) => {
            const result = await selectPieceType(data.pieceType);
            return { success: !!result };
        },
        
        toggleValidActionPlaceholdersVisibility: (data) => {
            const result = toggleValidActionPlaceholdersVisibility(data.visible);
            return { success: !!result };
        },
        
        getBoardState: () => {
            return boardState.getSerializableState();
        },
        
        // Model loading and configuration API handlers
        getModelLoadingStatus: () => {
            if (!renderer) return { success: false, error: 'Renderer not initialized' };
            return renderer.getModelLoadingStatus();
        },
        
        retryModelLoading: (params) => {
            if (!renderer) return { success: false, error: 'Renderer not initialized' };
            return renderer.retryModelLoading(params.models);
        },
        
        configureModelLoading: (params) => {
            if (!renderer) return { success: false, error: 'Renderer not initialized' };
            return renderer.configureModelLoading(params);
        },
        
        isValidMovesVisible: () => {
            if (!renderer) return { visible: false };
            if (typeof renderer.isValidMovesVisible === 'function') {
                return { visible: renderer.isValidMovesVisible() };
            }
            // Fallback if the method doesn't exist
            return { visible: false };
        },
        
        showValidMovesForPiece: (params) => {
            if (!renderer) return { success: false, error: 'Renderer not initialized' };
            renderer.showValidMovesForPiece(params.q, params.r);
            return { success: true };
        }
    });
}

// Export only the function needed to initialize the module
// All other functionality is accessed through the API

// For testing purposes only - ideally this would be removed in production
export const __testingOnly = {
    // Functions that can be tested directly without going through the API
    // This should only be used for unit tests
    getRenderer: () => renderer,
    getBoardState: () => boardState
};

// The rest of the file with internal function implementations remains the same

/**
 * Handle click on a board position
 * @param {Object} data - Position data {x, y, z, tileId, pieceId}
 */
function handleClick(data) {
    // Handle based on current state and action
    const { tileId, pieceId, x, y, z } = data;
    
    // Convert 3D coordinates to hex coordinates if needed
    let q, r;
    if (x !== undefined && renderer) {
        const hexCoords = renderer.screenToHex(x, y);
        if (hexCoords) {
            q = hexCoords.q;
            r = hexCoords.r;
        }
    }
    
    // If there's a pieceId, get its coordinates
    let pieceQ, pieceR;
    if (pieceId && renderer) {
        const piece = renderer.pieces.get(pieceId);
        if (piece && piece.userData && piece.userData.data) {
            pieceQ = piece.userData.data.q;
            pieceR = piece.userData.data.r;
        }
    }
    
    // If there's a tileId, get its coordinates
    let tileQ, tileR, tileColor;
    if (tileId && renderer) {
        const tile = renderer.tiles.get(tileId);
        if (tile && tile.userData && tile.userData.data) {
            tileQ = tile.userData.data.q;
            tileR = tile.userData.data.r;
            tileColor = tile.userData.data.color;
        }
    }
    
    // Handle based on current action
    switch (boardState.activeActionUI) {
        case 'placeTile':
            // If clicking on a valid move placeholder, show tile placement UI
            if (q !== undefined && r !== undefined) {
                showTilePlacementUIForPosition(q, r);
            }
            break;
            
        case 'placePiece':
            // If clicking on a tile of our color, show piece placement UI
            if (tileId && tileColor === boardState.currentPlayer) {
                showPiecePlacementUIForTile(tileQ, tileR, tileColor);
            }
            break;
            
        case 'movePiece':
            // If clicking on our own piece, show valid moves
            if (pieceId) {
                const piece = renderer.pieces.get(pieceId);
                if (piece && piece.userData && piece.userData.data && 
                    piece.userData.data.color === boardState.currentPlayer) {
                    
                    if (renderer) {
                        renderer.showValidMovesForPiece(pieceQ, pieceR);
                    }
                    
                    // Set selected piece in board state
                    boardState.selectedPiece = {
                        pieceId,
                        fromQ: pieceQ,
                        fromR: pieceR
                    };
                }
            }
            // If clicking on a valid move placeholder when a piece is selected
            else if (q !== undefined && r !== undefined && boardState.selectedPiece) {
                // Set destination in board state
                boardState.selectedDestination = {
                    toQ: q,
                    toR: r
                };
                
                // Show validation UI
                if (renderer) {
                    renderer.showValidationUI(q, r);
                }
            }
            break;
            
        default:
            // No active action - just select whatever was clicked
            if (pieceId) {
                selectPiece(pieceId);
            } else if (tileId) {
                selectTile({ tileId, x, y, z });
            }
    }
}

/**
 * Handle hover on a board position
 * @param {Object} data - Position data {x, y, z, tileId, pieceId}
 */
function handleHover(data) {
    const { tileId, pieceId } = data;
    
    // Update hover state
    boardState.hoveredTile = tileId || null;
    boardState.hoveredPiece = pieceId || null;
    
    // Handle hover effects based on current action
    if (boardState.activeActionUI === 'placeTile') {
        // Highlight position for tile placement
        // This will be handled by the renderer
    } else if (boardState.activeActionUI === 'placePiece' && tileId) {
        // Highlight tile for piece placement if it's a valid placement
        const isValidPlacement = boardState.validPlacements.some(p => p.tileId === tileId);
        
        if (isValidPlacement) {
            // Apply hover highlight
            boardState.highlightTile(tileId, 'hover');
        }
    } else if (boardState.activeActionUI === 'movePiece' && pieceId) {
        // Highlight piece that can be moved
        // This will be handled by the renderer
    }
    
    // Publish board state update
    boardState.publishBoardStateUpdate();
}

/**
 * Handle key press
 * @param {Object} data - Key data {key, ctrlKey, shiftKey, altKey}
 */
function handleKeyPress(data) {
    const { key } = data;
    
    // Handle escape to cancel current action
    if (key === 'Escape') {
        cancelAction();
    }
}

/**
 * Select a tile
 * @param {Object} data - Tile data {tileId, x, y, z}
 */
function selectTile(data) {
    const { tileId } = data;
    
    // If we already have this tile selected, deselect it
    if (boardState.selectedTile === tileId) {
        boardState.selectedTile = null;
        eventBus.publish('tile:deselected', { tileId });
        return;
    }
    
    // Set selected tile
    boardState.selectedTile = tileId;
    
    // Publish event
    eventBus.publish('tile:selected', data);
}

/**
 * Select a piece
 * @param {string} pieceId - ID of the piece to select
 */
function selectPiece(pieceId) {
    // If we already have this piece selected, deselect it
    if (boardState.selectedPiece === pieceId) {
        boardState.selectedPiece = null;
        eventBus.publish('piece:deselected', { pieceId });
        return;
    }
    
    // Set selected piece
    boardState.selectedPiece = pieceId;
    
    // Publish event
    eventBus.publish('piece:selected', { pieceId });
}

/**
 * Handle click on a position without a tile
 * @param {Object} position - Position data {x, y, z}
 */
function handlePositionClick(position) {
    const { x, y, z } = position;
    
    // If we're in tile placement mode, try to place a tile
    if (boardState.activeActionUI === 'placeTile') {
        // Check if this is a valid placement
        const isValidPlacement = boardState.validPlacements.some(
            p => p.x === x && p.y === y && p.z === z
        );
        
        if (isValidPlacement) {
            // Request tile placement via API
            placeTile(x, y, z);
        }
    }
}

/**
 * Start the place tile action
 */
async function startPlaceTileAction() {
    try {
        const result = await apiClient.request('startAction', { action: 'placeTile' });
        
        if (!result.success) {
            console.error('Failed to start place tile action:', result.error);
            eventBus.publish('error', { 
                message: 'Failed to start place tile action',
                details: result.error
            });
        }
    } catch (error) {
        console.error('Error starting place tile action:', error);
        eventBus.publish('error', { 
            message: 'Failed to start place tile action',
            details: error
        });
    }
}

/**
 * Start the place piece action
 * @param {string} pieceType - Type of piece to place
 */
async function startPlacePieceAction(pieceType) {
    try {
        const result = await apiClient.request('startAction', { 
            action: 'placePiece',
            pieceType
        });
        
        if (!result.success) {
            console.error('Failed to start place piece action:', result.error);
            eventBus.publish('error', { 
                message: 'Failed to start place piece action',
                details: result.error
            });
        }
    } catch (error) {
        console.error('Error starting place piece action:', error);
        eventBus.publish('error', { 
            message: 'Failed to start place piece action',
            details: error
        });
    }
}

/**
 * Start the move piece action
 */
async function startMovePieceAction(pieceId) {
    try {
        const result = await apiClient.request('startAction', { action: 'movePiece', pieceId });
        
        if (!result.success) {
            console.error('Failed to start move piece action:', result.error);
            eventBus.publish('error', { 
                message: 'Failed to start move piece action',
                details: result.error
            });
        }
    } catch (error) {
        console.error('Error starting move piece action:', error);
        eventBus.publish('error', { 
            message: 'Failed to start move piece action',
            details: error
        });
    }
}

/**
 * Cancel the current action
 */
async function cancelAction() {
    try {
        const result = await apiClient.request('cancelAction', {});
        
        if (!result.success) {
            console.error('Failed to cancel action:', result.error);
            eventBus.publish('error', { 
                message: 'Failed to cancel action',
                details: result.error
            });
        }
    } catch (error) {
        console.error('Error canceling action:', error);
        eventBus.publish('error', { 
            message: 'Failed to cancel action',
            details: error
        });
    }
}

/**
 * Complete the current action
 */
async function completeCurrentAction() {
    console.log('Completing current action:', boardState.activeActionUI);
    
    try {
        let result;
        
        switch (boardState.activeActionUI) {
            case 'placeTile':
                // If we have a selected position for tile placement
                if (boardState.selectedPosition) {
                    const { q, r } = boardState.selectedPosition;
                    result = await apiClient.request('placeTile', { 
                        q, r, 
                        color: boardState.currentPlayer 
                    });
                } else {
                    console.error('No selected position for tile placement');
                    return;
                }
                break;
                
            case 'placePiece':
                // If we have a selected position and piece type
                if (boardState.selectedPosition && boardState.selectedPieceType) {
                    const { q, r } = boardState.selectedPosition;
                    const pieceType = boardState.selectedPieceType;
                    result = await apiClient.request('placePiece', { 
                        q, r, 
                        color: boardState.currentPlayer,
                        type: pieceType
                    });
                } else {
                    console.error('No selected position or piece type for piece placement');
                    return;
                }
                break;
                
            case 'movePiece':
                // If we have a selected piece and destination
                if (boardState.selectedPiece && boardState.selectedDestination) {
                    const { fromQ, fromR } = boardState.selectedPiece;
                    const { toQ, toR } = boardState.selectedDestination;
                    result = await apiClient.request('movePiece', { 
                        fromQ, fromR, toQ, toR
                    });
                } else {
                    console.error('No selected piece or destination for move');
                    return;
                }
                break;
                
            default:
                console.error('Unknown action to complete:', boardState.activeActionUI);
                return;
        }
        
        if (!result || !result.success) {
            console.error('Failed to complete action:', result ? result.error : 'No result');
            eventBus.publish('error', { 
                message: `Failed to complete ${boardState.activeActionUI} action`,
                details: result ? result.error : 'No result from API'
            });
        }
    } catch (error) {
        console.error('Error completing action:', error);
        eventBus.publish('error', { 
            message: `Failed to complete ${boardState.activeActionUI} action`,
            details: error
        });
    }
}

/**
 * Select a piece type for placement
 * @param {string} pieceType - Type of piece to place (disc or ring)
 */
async function selectPieceType(pieceType) {
    console.log(`Selecting piece type: ${pieceType}`);
    
    // Store the selected piece type in board state
    boardState.selectedPieceType = pieceType;
    
    // If we're in placePiece mode and have a selected position
    if (boardState.activeActionUI === 'placePiece' && boardState.selectedPosition) {
        const { q, r } = boardState.selectedPosition;
        
        // Update UI to show validation controls with the selected piece type
        if (renderer) {
            // Show validation UI for the selected piece type
            renderer.showValidationUI(q, r);
        }
    }
}

/**
 * Show piece placement UI for a tile
 * @param {number} q - Q coordinate
 * @param {number} r - R coordinate
 * @param {string} color - Tile color (black or white)
 */
async function showPiecePlacementUIForTile(q, r, color) {
    console.log(`Showing piece placement UI for tile at (${q}, ${r}), color: ${color}`);
    
    try {
        // Check what pieces are available to place
        const availableResult = await apiClient.request('getAvailablePieces', { 
            color: boardState.currentPlayer 
        });
        
        if (!availableResult.success) {
            console.error('Failed to get available pieces:', availableResult.error);
            return;
        }
        
        const available = availableResult.data || {};
        const canPlaceDisc = available.discs > 0;
        const canPlaceRing = available.rings > 0 && available.capturedDiscs > 0; // Rings require a captured disc
        
        console.log(`Available pieces - Discs: ${canPlaceDisc}, Rings: ${canPlaceRing}`);
        
        // Update board state for the selected position
        boardState.selectedPosition = { q, r };
        
        // Clear any previous UI
        if (renderer) {
            renderer.clearActionUI();
            
            // Show the piece placement UI with available options
            renderer.showPiecePlacementUI(q, r, color, canPlaceDisc, canPlaceRing);
        }
        
        // If only one type is available, auto-select it
        if (canPlaceDisc && !canPlaceRing) {
            boardState.selectedPieceType = 'disc';
        } else if (!canPlaceDisc && canPlaceRing) {
            boardState.selectedPieceType = 'ring';
        }
        
    } catch (error) {
        console.error('Error showing piece placement UI:', error);
    }
}

/**
 * Show tile placement UI for a position
 * @param {number} q - Q coordinate
 * @param {number} r - R coordinate
 */
async function showTilePlacementUIForPosition(q, r) {
    console.log(`Showing tile placement UI for position (${q}, ${r})`);
    
    try {
        // Check if this is a valid tile placement position
        const validResult = await apiClient.request('getValidTilePlacements', {
            color: boardState.currentPlayer
        });
        
        if (!validResult.success) {
            console.error('Failed to get valid tile placements:', validResult.error);
            return;
        }
        
        const validPlacements = validResult.data.placements || [];
        const isValidPlacement = validPlacements.some(p => 
            (p.q === q && p.r === r) || (p.x === q && p.z === r)
        );
        
        if (!isValidPlacement) {
            console.warn(`Position (${q}, ${r}) is not a valid tile placement`);
            return;
        }
        
        // Update board state for the selected position
        boardState.selectedPosition = { q, r };
        
        // Clear any previous UI
        if (renderer) {
            renderer.clearActionUI();
            
            // Show the tile placement UI
            renderer.showTilePlacementUI(q, r, boardState.currentPlayer);
        }
    } catch (error) {
        console.error('Error showing tile placement UI:', error);
    }
}

/**
 * Place a tile at the specified position
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} z - Z coordinate
 */
async function placeTile(x, y, z) {
    try {
        const result = await apiClient.request('placeTile', { position: { x, y, z } });
        
        if (!result.success) {
            console.error('Failed to place tile:', result.error);
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
 * Place a piece on the specified tile
 * @param {string} tileId - ID of the tile to place on
 * @param {string} pieceType - Type of piece to place
 */
async function placePiece(tileId, pieceType) {
    try {
        const result = await apiClient.request('placePiece', { tileId, pieceType });
        
        if (!result.success) {
            console.error('Failed to place piece:', result.error);
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
 * Move a piece from one tile to another
 * @param {string} pieceId - ID of the piece to move
 * @param {string} toTileId - ID of the destination tile
 */
async function movePiece(pieceId, toTileId) {
    try {
        const result = await apiClient.request('movePiece', { pieceId, toTileId });
        
        if (!result.success) {
            console.error('Failed to move piece:', result.error);
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
 * Show valid action placeholders
 * This requests the valid moves from the server and displays them on the board
 */
async function showValidActionPlaceholders() {
    console.log('Board module showing valid action placeholders');
    
    if (renderer) {
        renderer.showValidActionPlaceholders();
    } else {
        console.error('Renderer not initialized, cannot show placeholders');
    }
}

/**
 * Toggle the visibility of valid action placeholders
 * @param {boolean} visible - Whether to show or hide the placeholders
 */
function toggleValidActionPlaceholdersVisibility(visible) {
    if (renderer) {
        renderer.updateValidMovesVisibility(visible);
    }
}

/**
 * Initialize the Three.js renderer
 * @param {string} containerId - ID of the container element
 * @returns {boolean} - Success flag
 */
function initializeRenderer(containerId) {
    try {
        console.log('Initializing 3D renderer...');
        
        // Create renderer with the boardState instance
        renderer = new ThreeRenderer(containerId, boardState);
        
        // Initial setup
        renderer.initialize();
        renderer.setupScene();
        
        // Set window resize handler
        window.addEventListener('resize', () => {
            renderer.onWindowResize();
        });
        
        // Set up click and hover events
        renderer.renderer.domElement.addEventListener('click', (event) => {
            // Handle click on the canvas
            renderer.handleClick(event);
        });
        
        renderer.renderer.domElement.addEventListener('mousemove', (event) => {
            // Handle hover on the canvas
            renderer.handleMouseMove(event);
        });
        
        // Start animation loop
        renderer.animate();
        
        // Signal that setup is complete
        eventBus.publish('board:setupComplete', {});
        
        // Load models
        console.log('Loading 3D models...');
        renderer.loadModels().then(() => {
            console.log('3D models loaded successfully');
            eventBus.publish('board:modelsLoaded', {});
        }).catch(error => {
            console.error('Failed to load 3D models:', error);
            eventBus.publish('error', {
                message: 'Failed to load 3D models',
                details: error
            });
        });
        
        return true;
    } catch (error) {
        console.error('Error initializing renderer:', error);
        eventBus.publish('error', {
            message: 'Failed to initialize 3D renderer',
            details: error
        });
        return false;
    }
}

/**
 * Update model settings for the board
 * @param {Object} settings - New model settings
 * @returns {boolean} Whether the settings were updated successfully
 */
function updateModelSettings(settings) {
    console.log('Updating model settings:', settings);
    
    if (!settings) {
        console.warn('No settings provided to updateModelSettings');
        return false;
    }
    
    try {
        // Update the board state with the new settings
        const updatedSettings = boardState.updateModelSettings(settings);
        
        // Apply changes to renderer if initialized
        if (renderer) {
            // Check if we need to reload models
            const needsReload = (
                settings.theme !== undefined || 
                settings.quality !== undefined
            );
            
            if (needsReload) {
                // Reload models with new settings
                renderer.reloadModels(updatedSettings);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Failed to update model settings:', error);
        eventBus.publish('error', {
            message: 'Failed to update model settings',
            details: error.message
        });
        return false;
    }
}

/**
 * Refresh models with current settings
 * @returns {boolean} Whether the refresh was initiated successfully
 */
function refreshModels() {
    console.log('Refreshing models with current settings');
    
    if (!renderer) {
        console.warn('Cannot refresh models - renderer not initialized');
        return false;
    }
    
    try {
        // Get current model settings from board state
        const settings = boardState.getModelSettings();
        
        // Reload models with current settings
        renderer.reloadModels(settings);
        
        return true;
    } catch (error) {
        console.error('Failed to refresh models:', error);
        eventBus.publish('error', {
            message: 'Failed to refresh models',
            details: error.message
        });
        return false;
    }
}

/**
 * Toggle dark mode for the board
 * @param {boolean} [enabled] - Whether to enable dark mode, toggles if not provided
 * @returns {boolean} The new dark mode state
 */
function toggleDarkMode(enabled) {
    console.log(`Toggling dark mode to: ${enabled}`);
    
    // Update board state
    const darkModeEnabled = boardState.toggleDarkMode(enabled);
    
    // Apply to renderer if initialized
    if (renderer) {
        // Update background color based on dark mode setting
        renderer.scene.background = new THREE.Color(
            darkModeEnabled ? 0x222222 : 0xf0f0f0
        );
        
        // Update ground plane to reflect dark mode change
        renderer.createGroundPlane();
        
        // Trigger a render
        renderer.requestRender();
    }
    
    return darkModeEnabled;
}

/**
 * Update background color type
 * @param {string} type - The background type ('default', 'wood', 'stone', 'marble')
 * @returns {boolean} Whether the update was successful
 */
function updateBackgroundColor(type) {
    console.log(`Updating background color to: ${type}`);
    
    // Update board state using our helper function
    setBackgroundColor(type);
    
    // Apply to renderer if initialized
    if (renderer && renderer.updateBackgroundTexture) {
        renderer.updateBackgroundTexture(type);
        return true;
    }
    
    return false;
}

/**
 * Update board visualization settings
 * @param {Object} settings - Settings object
 * @param {boolean} [settings.darkMode] - Whether dark mode is enabled
 * @param {string} [settings.backgroundColor] - Background color type
 * @param {boolean} [settings.animationsEnabled] - Whether animations are enabled
 * @param {Object} [settings.modelSettings] - Model settings
 * @returns {boolean} Whether the update was successful
 */
function updateBoardSettings(settings) {
    console.log('Updating board settings:', settings);
    
    if (!settings) {
        console.warn('No settings provided to updateBoardSettings');
        return false;
    }
    
    try {
        // Handle dark mode
        if (settings.darkMode !== undefined) {
            toggleDarkMode(settings.darkMode);
        }
        
        // Handle background color
        if (settings.backgroundColor !== undefined) {
            updateBackgroundColor(settings.backgroundColor);
        }
        
        // Handle animations
        if (settings.animationsEnabled !== undefined) {
            toggleAnimations(settings.animationsEnabled);
        }
        
        // Handle model settings
        if (settings.modelSettings) {
            updateModelSettings(settings.modelSettings);
        }
        
        return true;
    } catch (error) {
        console.error('Failed to update board settings:', error);
        eventBus.publish('error', {
            message: 'Failed to update board settings',
            details: error.message
        });
        return false;
    }
}

/**
 * Reset the scene and optionally keep current settings
 * @param {boolean} [keepSettings=true] - Whether to keep current settings
 * @returns {boolean} Whether the reset was successful
 */
function resetScene(keepSettings = true) {
    console.log(`Resetting scene (keeping settings: ${keepSettings})`);
    
    if (!renderer) {
        console.warn('Cannot reset scene - renderer not initialized');
        return false;
    }
    
    try {
        // Save current settings if needed
        const currentSettings = keepSettings ? {
            darkMode: boardState.darkMode,
            backgroundColor: boardState.backgroundColor,
            animationsEnabled: boardState.animationsEnabled,
            modelSettings: getModelSettings()
        } : null;
        
        // Reset state using our helper function
        resetBoardState();
        
        // Reset scene in renderer
        renderer.setupScene();
        
        // Restore settings if needed
        if (currentSettings) {
            updateBoardSettings(currentSettings);
        }
        
        return true;
    } catch (error) {
        console.error('Failed to reset scene:', error);
        eventBus.publish('error', {
            message: 'Failed to reset scene',
            details: error.message
        });
        return false;
    }
}

/**
 * Get the valid tile placements
 * @returns {Array} Array of valid tile placement objects
 */
function getValidTilePlacements() {
    if (!boardState) {
        console.error('Board state not initialized');
        return [];
    }
    
    return boardState.validPlacements || [];
}

/**
 * Get the valid piece placements
 * @returns {Array} Array of valid piece placement objects
 */
function getValidPiecePlacements() {
    if (!boardState) {
        console.error('Board state not initialized');
        return [];
    }
    
    return boardState.validPlacements || [];
}

/**
 * Get valid moves for a specific piece
 * @param {Object} params - Parameters containing coordinates or pieceId
 * @returns {Array} Array of valid move objects
 */
function getValidMoves(params) {
    if (!boardState) {
        console.error('Board state not initialized');
        return [];
    }
    
    return boardState.validMoves || [];
}

/**
 * Get the current model settings
 * @returns {Object} Model settings object
 */
function getModelSettings() {
    if (!boardState) {
        console.error('Board state not initialized');
        return {};
    }
    
    return boardState.modelSettings || {};
}

/**
 * Set the background color
 * @param {string} type - Background color type
 */
function setBackgroundColor(type) {
    if (!boardState) {
        console.error('Board state not initialized');
        return;
    }
    
    // Update the backgroundColor property on the boardState
    boardState.backgroundColor = type;
}

/**
 * Toggle animations
 * @param {boolean} enabled - Whether animations should be enabled
 */
function toggleAnimations(enabled) {
    if (!boardState) {
        console.error('Board state not initialized');
        return;
    }
    
    // Update the animationsEnabled property on the boardState
    boardState.animationsEnabled = enabled;
}

/**
 * Reset the board state
 */
function resetBoardState() {
    if (!boardState) {
        console.error('Board state not initialized');
        return;
    }
    
    // Clear valid moves and placements
    boardState.validMoves = [];
    boardState.validPlacements = [];
    
    // Clear selection state
    boardState.selectedTile = null;
    boardState.selectedPiece = null;
    boardState.hoveredTile = null;
    boardState.hoveredPiece = null;
    
    // Clear highlights
    if (boardState.clearAllHighlights) {
        boardState.clearAllHighlights();
    }
    
    // Clear active action
    boardState.activeActionUI = null;
    
    // Publish the update
    if (boardState.publishBoardStateUpdate) {
        boardState.publishBoardStateUpdate();
    }
}

/**
 * Check if valid moves are currently visible on the board
 * @returns {boolean} Whether valid moves are visible
 */
function isValidMovesVisible() {
    if (!renderer) {
        console.warn('Cannot check valid moves visibility - renderer not initialized');
        return false;
    }
    
    // If the renderer has a method to check this, use it
    if (typeof renderer.isValidMovesVisible === 'function') {
        return renderer.isValidMovesVisible();
    }
    
    // Fallback: if we have valid placements/moves and have called showValidActionPlaceholders
    if (boardState) {
        const hasValidPlacements = Array.isArray(boardState.validPlacements) && 
                                  boardState.validPlacements.length > 0;
        const hasValidMoves = Array.isArray(boardState.validMoves) && 
                             boardState.validMoves.length > 0;
        
        return hasValidPlacements || hasValidMoves;
    }
    
    return false;
}

export default {
    initialize: initializeBoardModule,
    
    // UI actions
    showValidActionPlaceholders,
    selectTile,
    selectPiece,
    
    // Game actions
    startPlaceTileAction,
    startPlacePieceAction,
    startMovePieceAction,
    completeCurrentAction,
    cancelAction,
    
    // Game state interactions
    getValidTilePlacements,
    getValidPiecePlacements,
    getValidMoves,
    isValidMovesVisible,
    
    // Visual settings
    toggleDarkMode,
    updateBackgroundColor,
    updateBoardSettings,
    resetScene,
    
    // Model settings
    updateModelSettings,
    refreshModels,
    getModelSettings
}; 