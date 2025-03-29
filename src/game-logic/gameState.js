/**
 * GameState - Core game state manager for Hexaequo
 * 
 * This module manages the state of the game including:
 * - Current player's turn
 * - Board state (tiles and pieces)
 * - Available pieces for each player
 * - Captured pieces
 * - Game status (ongoing, victory, draw)
 */
import { eventBus, EventTypes } from '../api/eventBus.js';
import * as Rules from './rules.js';

export class GameState {
    constructor() {
        // Initialize empty state
        this.reset();
    }
    
    /**
     * Reset the game state to initial values
     */
    reset() {
        this.currentPlayer = 'black'; // 'black' or 'white'
        this.gameStatus = 'ongoing'; // 'ongoing', 'black_win', 'white_win', 'draw'
        this.winner = null; // 'black', 'white', or null
        this.drawReason = null; // 'no_moves' or 'repetition' or null
        
        // Board state with tiles and pieces
        this.board = {
            tiles: {}, // Map of q,r coordinates to tile data {color: 'black'|'white', piece: null|object}
            positionHistory: [] // For tracking repeated positions
        };
        
        // Available and captured pieces
        this.pieces = {
            black: {
                tilesAvailable: 9,
                discsAvailable: 6,
                ringsAvailable: 3,
                discsCaptured: 0,
                ringsCaptured: 0
            },
            white: {
                tilesAvailable: 9,
                discsAvailable: 6,
                ringsAvailable: 3,
                discsCaptured: 0,
                ringsCaptured: 0
            }
        };
        
        // Turn action state
        this.currentAction = null; // 'place_tile', 'place_piece', 'move_piece', null
        this.selectedPiece = null; // {q, r, type: 'disc'|'ring'}
        this.turnHistory = []; // For tracking actions within a single turn
        
        // Emit reset event
        eventBus.publish('game:stateChanged', { 
            type: 'reset',
            state: this.getSerializableState()
        });
    }
    
    /**
     * Setup a new game with initial state
     */
    setupNewGame() {
        console.log('GameState: Setting up new game');
        this.reset();
        
        // Place initial tiles (2 black and 2 white)
        // Using axial coordinates (q,r) where q is the column and r is the row
        console.log('GameState: Placing initial tiles');
        this.placeTile(0, 0, 'black');
        this.placeTile(1, 0, 'black');
        this.placeTile(0, 1, 'white');
        this.placeTile(1, 1, 'white');
        
        // Place initial discs
        console.log('GameState: Placing initial pieces');
        this.placePiece(0, 0, 'black', 'disc');
        this.placePiece(1, 1, 'white', 'disc');
        
        // Save the initial state
        this.savePositionToHistory();
        
        // Log the state we're about to send
        const state = this.getSerializableState();
        console.log('GameState: New game state ready, board has', 
                    state.board.tiles.length, 'tiles and', 
                    state.board.pieces.length, 'pieces');
        
        // Emit new game event
        eventBus.publish('game:stateChanged', {
            type: 'new_game',
            state
        });
    }
    
    /* Game Actions */
    
    /**
     * Place a tile at the specified coordinates
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @param {string} color - Tile color ('black' or 'white')
     * @returns {boolean} - True if successful, false otherwise
     */
    placeTile(q, r, color) {
        // Validate the placement
        if (!Rules.canPlaceTile(this, q, r, color)) {
            return false;
        }
        
        const key = `${q},${r}`;
        
        // Place the tile
        this.board.tiles[key] = { 
            color, 
            piece: null 
        };
        
        // Update available tiles
        this.pieces[color].tilesAvailable--;
        
        // Add to turn history if during a turn
        if (this.currentAction === 'place_tile') {
            this.turnHistory.push({
                action: 'place_tile',
                q,
                r,
                color
            });
        }
        
        // Emit event
        eventBus.publish(EventTypes.TILE_PLACED, {
            q,
            r,
            color
        });
        
        // Emit state changed event
        eventBus.publish('game:stateChanged', { 
            type: 'tile_placed',
            state: this.getSerializableState()
        });
        
        return true;
    }
    
    /**
     * Place a piece at the specified coordinates
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @param {string} color - Piece color ('black' or 'white')
     * @param {string} type - Piece type ('disc' or 'ring')
     * @returns {boolean} - True if successful, false otherwise
     */
    placePiece(q, r, color, type) {
        // Validate the placement
        if (!Rules.canPlacePiece(this, q, r, color, type)) {
            return false;
        }
        
        const key = `${q},${r}`;
        const tile = this.board.tiles[key];
        
        // For rings, return a captured disc to the opponent
        if (type === 'ring' && this.currentPlayer === color) {
            const opponentColor = color === 'black' ? 'white' : 'black';
            this.pieces[color].discsCaptured--;
            this.pieces[opponentColor].discsAvailable++;
        }
        
        // Place the piece
        tile.piece = { type, color };
        
        // Update available pieces
        const pieceProperty = `${type}sAvailable`;
        this.pieces[color][pieceProperty]--;
        
        // Add to turn history if during a turn
        if (this.currentAction === 'place_piece') {
            this.turnHistory.push({
                action: 'place_piece',
                q,
                r,
                color,
                type
            });
        }
        
        // Emit event
        eventBus.publish(EventTypes.PIECE_PLACED, {
            q,
            r,
            color,
            type
        });
        
        // Emit state changed event
        eventBus.publish('game:stateChanged', { 
            type: 'piece_placed',
            state: this.getSerializableState()
        });
        
        return true;
    }
    
    /**
     * Move a piece from one position to another
     * @param {number} fromQ - Starting Q coordinate
     * @param {number} fromR - Starting R coordinate
     * @param {number} toQ - Destination Q coordinate
     * @param {number} toR - Destination R coordinate
     * @returns {boolean} - True if successful, false otherwise
     */
    movePiece(fromQ, fromR, toQ, toR) {
        // Validate the move
        const moveResult = Rules.canMovePiece(this, fromQ, fromR, toQ, toR);
        if (!moveResult.valid) {
            return false;
        }
        
        const fromKey = `${fromQ},${fromR}`;
        const toKey = `${toQ},${toR}`;
        
        const sourceTile = this.board.tiles[fromKey];
        const destTile = this.board.tiles[toKey];
        const piece = sourceTile.piece;
        
        // Handle disc movement
        if (piece.type === 'disc') {
            // If it's a jump, check for capture
            if (Rules.isValidJump(fromQ, fromR, toQ, toR)) {
                const jumpedHex = moveResult.jumpedHex;
                const jumpedKey = `${jumpedHex.q},${jumpedHex.r}`;
                const jumpedTile = this.board.tiles[jumpedKey];
                
                // Capture the jumped piece if it's an opponent's
                if (jumpedTile.piece && jumpedTile.piece.color !== this.currentPlayer) {
                    this.capturePiece(jumpedHex.q, jumpedHex.r);
                }
            }
        } 
        // Handle ring movement
        else if (piece.type === 'ring') {
            // Capture the piece at the destination if there is one
            if (destTile.piece) {
                this.capturePiece(toQ, toR);
            }
        }
        
        // Move the piece
        destTile.piece = { ...piece };
        sourceTile.piece = null;
        
        // Add to turn history if during a turn
        if (this.currentAction === 'move_piece') {
            this.turnHistory.push({
                action: 'move_piece',
                fromQ,
                fromR,
                toQ,
                toR,
                piece
            });
        }
        
        // Emit event
        eventBus.publish(EventTypes.PIECE_MOVED, {
            pieceType: piece.type,
            color: piece.color,
            fromQ: fromQ,
            fromR: fromR,
            toQ: toQ,
            toR: toR
        });
        
        // Emit state changed event
        eventBus.publish('game:stateChanged', { 
            type: 'piece_moved',
            state: this.getSerializableState()
        });
        
        return true;
    }
    
    /**
     * Capture a piece at the specified coordinates
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @returns {boolean} - True if successful, false otherwise
     */
    capturePiece(q, r) {
        const key = `${q},${r}`;
        const tile = this.board.tiles[key];
        
        if (!tile || !tile.piece) {
            return false;
        }
        
        const pieceColor = tile.piece.color;
        const pieceType = tile.piece.type;
        const opponentColor = pieceColor === 'black' ? 'white' : 'black';
        
        // Save piece info before removing
        const capturedPiece = { ...tile.piece };
        
        // Update captured counts
        const capturedProperty = `${pieceType}sCaptured`;
        this.pieces[opponentColor][capturedProperty]++;
        
        // Remove the piece from the board
        tile.piece = null;
        
        // Emit captured event
        eventBus.publish(EventTypes.PIECE_CAPTURED, {
            q,
            r,
            piece: capturedPiece
        });
        
        return true;
    }
    
    /**
     * Start an action phase for the current turn
     * @param {string} action - The action to start ('place_tile', 'place_piece', 'move_piece')
     * @param {Object} data - Additional data for the action
     * @returns {boolean} - True if action was started, false otherwise
     */
    startAction(action, data = {}) {
        if (this.gameStatus !== 'ongoing') {
            return false;
        }
        
        if (this.currentAction) {
            // Already in an action
            return false;
        }
        
        // Save game state before action
        this.saveGameState();
        
        // Set current action
        this.currentAction = action;
        
        // Handle specific action setup
        if (action === 'move_piece') {
            if (data.q !== undefined && data.r !== undefined) {
                this.selectedPiece = { q: data.q, r: data.r };
            }
        }
        
        // Emit action started event
        eventBus.publish(EventTypes.ACTION_STARTED, {
            action,
            data
        });
        
        return true;
    }
    
    /**
     * Cancel the current action
     * @returns {boolean} - True if action was cancelled, false otherwise
     */
    cancelAction() {
        if (!this.currentAction) {
            return false;
        }
        
        // Restore saved state
        this.restoreGameState();
        
        // Clear action
        const cancelledAction = this.currentAction;
        this.currentAction = null;
        this.selectedPiece = null;
        
        // Emit action cancelled event
        eventBus.publish(EventTypes.ACTION_CANCELLED, {
            action: cancelledAction
        });
        
        return true;
    }
    
    /**
     * Complete the current action
     * @returns {boolean} - True if action was completed, false otherwise
     */
    completeAction() {
        if (!this.currentAction) {
            return false;
        }
        
        // Clear action
        const completedAction = this.currentAction;
        this.currentAction = null;
        this.selectedPiece = null;
        
        // Emit action completed event
        eventBus.publish(EventTypes.ACTION_COMPLETED, {
            action: completedAction,
            turnHistory: [...this.turnHistory]
        });
        
        return true;
    }
    
    /**
     * End the current player's turn
     * @returns {boolean} - True if turn was ended, false otherwise
     */
    endTurn() {
        if (this.gameStatus !== 'ongoing') {
            return false;
        }
        
        if (this.currentAction) {
            // Can't end turn during an action
            return false;
        }
        
        // Emit turn ended event
        eventBus.publish(EventTypes.TURN_ENDED, {
            player: this.currentPlayer,
            turnHistory: [...this.turnHistory]
        });
        
        // Check for victory or draw conditions
        this.checkGameEndConditions();
        
        // Clear turn history
        this.turnHistory = [];
        
        // Record the current position to history (for repetition detection)
        this.savePositionToHistory();
        
        // Switch player if game is still ongoing
        if (this.gameStatus === 'ongoing') {
            this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
            
            // Emit turn started event
            eventBus.publish(EventTypes.TURN_STARTED, {
                player: this.currentPlayer
            });
        }
        
        // Emit state changed event
        eventBus.publish('game:stateChanged', { 
            type: 'turn_ended',
            state: this.getSerializableState()
        });
        
        return true;
    }
    
    /**
     * Check if the game has ended (victory or draw)
     */
    checkGameEndConditions() {
        // Check for victory
        const victoryResult = Rules.checkVictoryConditions(this);
        if (victoryResult) {
            this.gameStatus = victoryResult.gameStatus;
            this.winner = victoryResult.winner;
            
            // Emit victory event
            eventBus.publish(EventTypes.VICTORY_ACHIEVED, {
                winner: this.winner,
                reason: victoryResult.reason
            });
            
            // Emit game ended event
            eventBus.publish(EventTypes.GAME_ENDED, {
                result: 'victory',
                winner: this.winner,
                reason: victoryResult.reason
            });
            
            return;
        }
        
        // Check for draw
        const nextPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        const drawResult = Rules.checkDrawConditions(this, nextPlayer);
        if (drawResult) {
            this.gameStatus = drawResult.gameStatus;
            this.drawReason = drawResult.drawReason;
            
            // Emit draw event
            eventBus.publish(EventTypes.DRAW_DECLARED, {
                reason: this.drawReason
            });
            
            // Emit game ended event
            eventBus.publish(EventTypes.GAME_ENDED, {
                result: 'draw',
                reason: this.drawReason
            });
        }
    }
    
    /* Helper Methods */
    
    /**
     * Get all valid moves for a piece at the specified coordinates
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @returns {Array} - Array of valid move coordinates
     */
    getValidMoves(q, r) {
        return Rules.getValidMoves(this, q, r);
    }
    
    /**
     * Get all valid tile placements for the current player
     * @returns {Array} - Array of valid placement coordinates
     */
    getValidTilePlacements() {
        return Rules.getValidTilePlacements(this, this.currentPlayer);
    }
    
    /**
     * Get all valid piece placements for the current player
     * @param {string} type - Piece type ('disc' or 'ring')
     * @returns {Array} - Array of valid placement coordinates
     */
    getValidPiecePlacements(type) {
        return Rules.getValidPiecePlacements(this, this.currentPlayer, type);
    }
    
    /**
     * Save the current position to history (for draw detection)
     */
    savePositionToHistory() {
        // Create a simplified representation of the board for position comparison
        const position = JSON.stringify(this.board.tiles);
        this.board.positionHistory.push(position);
    }
    
    /* State Serialization */
    
    /**
     * Get a serializable representation of the game state
     * @returns {Object} - Serializable game state
     */
    getSerializableState() {
        // Convert tile map to array format for rendering
        const tilesArray = [];
        const piecesArray = [];
        
        // Process tiles and pieces
        Object.entries(this.board.tiles).forEach(([key, tile]) => {
            // Parse q,r coordinates from the key
            const [q, r] = key.split(',').map(Number);
            
            // Create tile object for renderer
            const tileObj = {
                id: `tile_${q}_${r}`,
                q: q,
                r: r,
                color: tile.color // Use 'black' or 'white' directly as renderer expects
            };
            
            tilesArray.push(tileObj);
            
            // If there's a piece on this tile, add it to pieces array
            if (tile.piece) {
                const pieceObj = {
                    id: `piece_${q}_${r}`,
                    tileId: tileObj.id,
                    q: q,
                    r: r,
                    type: tile.piece.type,
                    color: tile.piece.color // Use 'black' or 'white' directly
                };
                
                piecesArray.push(pieceObj);
            }
        });
        
        console.log('Serialized game state:', {
            tiles: tilesArray.length, 
            pieces: piecesArray.length,
            sampleTile: tilesArray[0], 
            samplePiece: piecesArray[0]
        });
        
        return {
            currentPlayer: this.currentPlayer,
            gameStatus: this.gameStatus,
            winner: this.winner,
            drawReason: this.drawReason,
            board: {
                tiles: tilesArray,
                pieces: piecesArray,
                positionHistory: [...this.board.positionHistory]
            },
            pieces: JSON.parse(JSON.stringify(this.pieces)),
            currentAction: this.currentAction,
            selectedPiece: this.selectedPiece ? { ...this.selectedPiece } : null,
            turnHistory: [...this.turnHistory]
        };
    }
    
    /**
     * Load state from a saved game
     * @param {Object} saveData - Saved game state
     * @returns {boolean} - True if state was loaded successfully
     */
    loadFromSave(saveData) {
        try {
            this.currentPlayer = saveData.currentPlayer;
            this.gameStatus = saveData.gameStatus;
            this.winner = saveData.winner;
            this.drawReason = saveData.drawReason;
            
            // Initialize empty board tiles
            this.board = {
                tiles: {},
                positionHistory: [...(saveData.board.positionHistory || [])]
            };
            
            // If we're loading from the old format (board.tiles is an object)
            if (saveData.board.tiles && typeof saveData.board.tiles === 'object' && !Array.isArray(saveData.board.tiles)) {
                // Direct copy from old format
                this.board.tiles = { ...saveData.board.tiles };
            }
            // If we're loading from the new format (board.tiles is an array of tile objects)
            else if (Array.isArray(saveData.board.tiles)) {
                // Process each tile in the array
                saveData.board.tiles.forEach(tile => {
                    // Extract q,r from the id (tile_q_r)
                    const [_, q, r] = tile.id.split('_').map(part => isNaN(part) ? part : Number(part));
                    const key = `${q},${r}`;
                    
                    // Create tile in the internal format
                    this.board.tiles[key] = {
                        color: tile.type === 'dark' ? 'black' : 'white',
                        piece: null
                    };
                });
                
                // Process pieces if they exist
                if (Array.isArray(saveData.board.pieces)) {
                    saveData.board.pieces.forEach(piece => {
                        // Extract q,r from the id (piece_q_r)
                        const [_, q, r] = piece.id.split('_').map(part => isNaN(part) ? part : Number(part));
                        const key = `${q},${r}`;
                        
                        // Make sure the tile exists
                        if (this.board.tiles[key]) {
                            // Add the piece to the tile
                            this.board.tiles[key].piece = {
                                type: piece.type,
                                color: piece.player
                            };
                        }
                    });
                }
            }
            
            this.pieces = JSON.parse(JSON.stringify(saveData.pieces));
            this.currentAction = saveData.currentAction;
            this.selectedPiece = saveData.selectedPiece ? { ...saveData.selectedPiece } : null;
            this.turnHistory = [...(saveData.turnHistory || [])];
            
            // Emit state changed event
            eventBus.publish('game:stateChanged', { 
                type: 'loaded',
                state: this.getSerializableState()
            });
            
            return true;
        } catch (error) {
            console.error('Error loading game state:', error);
            return false;
        }
    }
    
    /**
     * Save the current game state before a player's turn
     * Used to restore state if a move is cancelled
     */
    saveGameState() {
        // Deep clone the game state
        this.savedState = this.getSerializableState();
    }
    
    /**
     * Restore the game state from the saved state
     * Used when a move is cancelled
     * @returns {boolean} - True if state was restored successfully
     */
    restoreGameState() {
        if (!this.savedState) return false;
        
        // Restore game state
        return this.loadFromSave(this.savedState);
    }
}

// Create and export singleton instance
export const gameState = new GameState(); 