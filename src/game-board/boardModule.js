/**
 * Board Module - Main entry point for the game board module
 * 
 * This module connects the game board to the API and serves as the
 * main interface for board-related functionality.
 */
import { eventBus } from '../api/eventBus.js';
import { apiClient } from '../api/apiClient.js';
import { boardState } from './core/boardState.js';
import { animationHandler } from './rendering/animationHandler.js';
import ThreeRenderer from './rendering/threeRenderer.js';

// Module-level variables
let renderer = null;

/**
 * Initialize the board module and set up event handlers
 */
export function initializeBoardModule() {
    console.log('Initializing board module...');
    
    // Initialize the 3D renderer
    const boardContainer = document.getElementById('game-board');
    if (boardContainer) {
        console.log('Found game board container, initializing renderer...');
        try {
            renderer = new ThreeRenderer(boardContainer);
            console.log('3D renderer initialized successfully');
        } catch (error) {
            console.error('Error initializing ThreeRenderer:', error);
        }
    } else {
        console.error('Game board container not found');
    }
    
    // Set up event handlers
    setupEventHandlers();
    
    // Register API handlers
    registerAPIHandlers();
    
    return {
        // Export board state and animation handler
        boardState,
        animationHandler,
        renderer,
        
        // Export board module methods
        handleClick,
        handleHover,
        selectTile,
        selectPiece,
        startPlaceTileAction,
        startPlacePieceAction,
        startMovePieceAction,
        cancelAction
    };
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
}

/**
 * Register API handlers related to the board
 */
function registerAPIHandlers() {
    // Any board-specific API handlers can be registered here
    // Most game logic handlers are registered in the logic module
}

/**
 * Handle click on a board position
 * @param {Object} data - Position data {x, y, z, tileId, pieceId}
 */
function handleClick(data) {
    // Handle based on current state and action
    const { tileId, pieceId, x, y, z } = data;
    
    // If there's a piece at this position and we're in the right mode, handle piece select
    if (pieceId && boardState.activeActionUI === 'movePiece') {
        selectPiece(pieceId);
        return;
    }
    
    // If we have a tile, handle tile select
    if (tileId) {
        selectTile({ tileId, x, y, z });
    } else if (x !== undefined && y !== undefined && z !== undefined) {
        // Handle click on position without a tile (for potential tile placement)
        handlePositionClick({ x, y, z });
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
async function startMovePieceAction() {
    try {
        const result = await apiClient.request('startAction', { action: 'movePiece' });
        
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

export default {
    initializeBoardModule
}; 