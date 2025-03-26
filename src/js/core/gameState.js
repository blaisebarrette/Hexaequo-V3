/**
 * GameState - Manages the state of the game including:
 * - Current player's turn
 * - Board state (tiles and pieces)
 * - Available pieces for each player
 * - Captured pieces
 * - Game status (ongoing, victory, draw)
 */
export class GameState {
    constructor() {
        // Initialize empty state
        this.reset();
        
        // Event callbacks
        this.onChangeCallbacks = [];
    }
    
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
    }
    
    setupNewGame() {
        this.reset();
        
        // Place initial tiles (2 black and 2 white)
        // Using axial coordinates (q,r) where q is the column and r is the row
        this.placeTile(0, 0, 'black');
        this.placeTile(1, 0, 'black');
        this.placeTile(0, 1, 'white');
        this.placeTile(1, 1, 'white');
        
        // Place initial discs
        this.placePiece(0, 0, 'black', 'disc');
        this.placePiece(1, 1, 'white', 'disc');
        
        // Save the initial state
        this.savePositionToHistory();
    }
    
    /* Game Actions */
    
    placeTile(q, r, color) {
        if (color !== 'black' && color !== 'white') {
            throw new Error('Invalid color');
        }
        
        // Check if the coordinates are already occupied
        const key = `${q},${r}`;
        if (this.board.tiles[key]) {
            return false;
        }
        
        // Check if the player has tiles available
        if (this.pieces[color].tilesAvailable <= 0) {
            return false;
        }
        
        // Place the tile
        this.board.tiles[key] = { 
            color, 
            piece: null 
        };
        
        // Update available tiles
        this.pieces[color].tilesAvailable--;
        
        // Notify state change
        this.notifyStateChange();
        return true;
    }
    
    placePiece(q, r, color, type) {
        if (color !== 'black' && color !== 'white') {
            throw new Error('Invalid color');
        }
        
        if (type !== 'disc' && type !== 'ring') {
            throw new Error('Invalid piece type');
        }
        
        const key = `${q},${r}`;
        
        // Check if tile exists and is the correct color
        const tile = this.board.tiles[key];
        if (!tile || tile.color !== color || tile.piece) {
            return false;
        }
        
        // Check if the player has the piece available
        const pieceProperty = `${type}sAvailable`;
        if (this.pieces[color][pieceProperty] <= 0) {
            return false;
        }
        
        // For rings, check if player has captured discs to return
        if (type === 'ring' && this.currentPlayer === color) {
            const opponentColor = color === 'black' ? 'white' : 'black';
            if (this.pieces[color].discsCaptured <= 0) {
                return false;
            }
            // Return a captured disc to the opponent
            this.pieces[color].discsCaptured--;
            this.pieces[opponentColor].discsAvailable++;
        }
        
        // Place the piece
        tile.piece = { type, color };
        
        // Update available pieces
        this.pieces[color][pieceProperty]--;
        
        // Notify state change
        this.notifyStateChange();
        return true;
    }
    
    movePiece(fromQ, fromR, toQ, toR) {
        const fromKey = `${fromQ},${fromR}`;
        const toKey = `${toQ},${toR}`;
        
        // Check if source tile has a piece
        const sourceTile = this.board.tiles[fromKey];
        if (!sourceTile || !sourceTile.piece) {
            return false;
        }
        
        // Check if the piece belongs to the current player
        if (sourceTile.piece.color !== this.currentPlayer) {
            return false;
        }
        
        // Check if destination tile exists and is empty
        const destTile = this.board.tiles[toKey];
        if (!destTile) {
            return false;
        }
        
        // Handle different piece movement rules
        const piece = sourceTile.piece;
        
        if (piece.type === 'disc') {
            // Disc movement: adjacent or jump
            if (this.isAdjacentMove(fromQ, fromR, toQ, toR)) {
                // Simple adjacent move
                if (destTile.piece) {
                    return false; // Destination is occupied
                }
                
                // Move the piece
                destTile.piece = { ...piece };
                sourceTile.piece = null;
                
            } else if (this.isValidJump(fromQ, fromR, toQ, toR)) {
                // Jump move - check if there's a piece to jump over
                const jumpedQ = (fromQ + toQ) / 2;
                const jumpedR = (fromR + toR) / 2;
                const jumpedKey = `${jumpedQ},${jumpedR}`;
                const jumpedTile = this.board.tiles[jumpedKey];
                
                if (!jumpedTile || !jumpedTile.piece) {
                    return false; // No piece to jump over
                }
                
                if (destTile.piece) {
                    return false; // Destination is occupied
                }
                
                // Capture the jumped piece if it's an opponent's
                if (jumpedTile.piece.color !== this.currentPlayer) {
                    this.capturePiece(jumpedQ, jumpedR);
                }
                
                // Move the piece
                destTile.piece = { ...piece };
                sourceTile.piece = null;
                
            } else {
                return false; // Invalid move
            }
            
        } else if (piece.type === 'ring') {
            // Ring movement: exactly 2 tiles distance
            if (!this.isRingMove(fromQ, fromR, toQ, toR)) {
                return false; // Not a valid ring move
            }
            
            // Check if destination has opponent's piece to capture
            if (destTile.piece) {
                if (destTile.piece.color === this.currentPlayer) {
                    return false; // Can't capture own piece
                }
                
                // Capture the piece
                this.capturePiece(toQ, toR);
            }
            
            // Move the ring
            destTile.piece = { ...piece };
            sourceTile.piece = null;
        }
        
        // Notify state change
        this.notifyStateChange();
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
        
        // Update captured counts
        const capturedProperty = `${pieceType}sCaptured`;
        this.pieces[opponentColor][capturedProperty]++;
        
        // Remove the piece from the board
        tile.piece = null;
        
        // We'll check for victory when the turn is finalized, not here
        // This allows the player to cancel the move even if it would result in a win
        
        return true;
    }
    
    endTurn() {
        // Check for victory or draw conditions - only now do we finalize the game result
        this.checkVictoryConditions();
        this.checkDrawConditions();
        
        // Clear the current action and selection
        this.currentAction = null;
        this.selectedPiece = null;
        this.turnHistory = [];
        
        // Record the current position to history (for repetition detection)
        this.savePositionToHistory();
        
        // Switch player if game is still ongoing
        if (this.gameStatus === 'ongoing') {
            this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        }
        
        // Notify state change
        this.notifyStateChange();
    }
    
    /* Helper Methods */
    
    isAdjacentMove(q1, r1, q2, r2) {
        // In axial coordinates, adjacent hexes have a distance of 1
        const dq = q2 - q1;
        const dr = r2 - r1;
        
        // Calculate the Manhattan distance in axial coordinates
        const distance = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
        return distance === 1;
    }
    
    isValidJump(q1, r1, q2, r2) {
        // Jump is 2 tiles away in a straight line
        const dq = q2 - q1;
        const dr = r2 - r1;
        
        // Check if the distance is 2 and the hex is in a straight line
        if (Math.abs(dq) === 2 && dr === 0) return true; // Horizontal jump
        if (Math.abs(dr) === 2 && dq === 0) return true; // Vertical jump
        if (Math.abs(dq) === 2 && Math.abs(dr) === 2 && dq + dr === 0) return true; // Diagonal jump
        
        return false;
    }
    
    isRingMove(q1, r1, q2, r2) {
        // Ring moves exactly 2 tiles in any direction
        const dq = q2 - q1;
        const dr = r2 - r1;
        
        // Calculate the Manhattan distance in axial coordinates
        const distance = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
        return distance === 2;
    }
    
    getValidMoves(q, r) {
        const key = `${q},${r}`;
        const tile = this.board.tiles[key];
        
        console.log(`Checking valid moves for (${q},${r})`);
        
        if (!tile || !tile.piece || tile.piece.color !== this.currentPlayer) {
            console.log(`No valid moves: tile=${!!tile}, piece=${!!tile?.piece}, color match=${tile?.piece?.color === this.currentPlayer}`);
            return [];
        }
        
        const validMoves = [];
        const piece = tile.piece;
        
        console.log(`Finding moves for ${piece.color} ${piece.type} at (${q},${r})`);
        
        // Check all potential destinations
        for (const destKey in this.board.tiles) {
            const [destQ, destR] = destKey.split(',').map(Number);
            
            // Skip the source tile
            if (destQ === q && destR === r) continue;
            
            if (piece.type === 'disc') {
                // Check adjacent move
                if (this.isAdjacentMove(q, r, destQ, destR)) {
                    const destTile = this.board.tiles[destKey];
                    if (!destTile.piece) {
                        console.log(`Found valid adjacent move to (${destQ},${destR})`);
                        validMoves.push({ q: destQ, r: destR });
                    }
                }
                
                // Check jump move
                if (this.isValidJump(q, r, destQ, destR)) {
                    const jumpedQ = (q + destQ) / 2;
                    const jumpedR = (r + destR) / 2;
                    const jumpedKey = `${jumpedQ},${jumpedR}`;
                    const jumpedTile = this.board.tiles[jumpedKey];
                    const destTile = this.board.tiles[destKey];
                    
                    if (jumpedTile && jumpedTile.piece && !destTile.piece) {
                        console.log(`Found valid jump move to (${destQ},${destR})`);
                        validMoves.push({ q: destQ, r: destR });
                    }
                }
            } else if (piece.type === 'ring') {
                // Check ring move (exactly 2 tiles away)
                if (this.isRingMove(q, r, destQ, destR)) {
                    const destTile = this.board.tiles[destKey];
                    
                    // Can land on empty tile or capture opponent's piece
                    if (!destTile.piece || destTile.piece.color !== this.currentPlayer) {
                        console.log(`Found valid ring move to (${destQ},${destR})`);
                        validMoves.push({ q: destQ, r: destR });
                    }
                }
            }
        }
        
        console.log(`Total valid moves: ${validMoves.length}`);
        return validMoves;
    }
    
    getValidTilePlacements(color) {
        if (this.pieces[color].tilesAvailable <= 0) {
            return [];
        }
        
        // For an empty board, any position is valid
        if (Object.keys(this.board.tiles).length === 0) {
            return [{ q: 0, r: 0 }];
        }
        
        // For initial setup (first 4 tiles), allow specific positions
        if (Object.keys(this.board.tiles).length < 4) {
            // Check which initial positions are still available
            const initialPositions = [
                { q: 0, r: 0 }, { q: 1, r: 0 }, 
                { q: 0, r: 1 }, { q: 1, r: 1 }
            ];
            
            return initialPositions.filter(pos => {
                const key = `${pos.q},${pos.r}`;
                return !this.board.tiles[key];
            });
        }
        
        // For normal gameplay, a tile must be adjacent to at least 2 existing tiles
        const validPlacements = [];
        const existingPositions = new Set(Object.keys(this.board.tiles));
        
        // Track all potential positions adjacent to existing tiles
        const potentialPositions = new Map();
        
        // Check all adjacent hexes to existing tiles
        for (const key of existingPositions) {
            const [q, r] = key.split(',').map(Number);
            
            // Check all 6 adjacent hexes
            const adjacentHexes = [
                { q: q+1, r: r }, { q: q+1, r: r-1 },
                { q: q, r: r-1 }, { q: q-1, r: r },
                { q: q-1, r: r+1 }, { q: q, r: r+1 }
            ];
            
            for (const adjHex of adjacentHexes) {
                const adjKey = `${adjHex.q},${adjHex.r}`;
                
                // Skip if this hex already has a tile
                if (existingPositions.has(adjKey)) continue;
                
                // Count this potential position
                if (!potentialPositions.has(adjKey)) {
                    potentialPositions.set(adjKey, { 
                        q: adjHex.q, 
                        r: adjHex.r, 
                        adjacentTiles: 1 
                    });
                } else {
                    const data = potentialPositions.get(adjKey);
                    data.adjacentTiles++;
                }
            }
        }
        
        // Add positions with at least 2 adjacent tiles
        for (const [key, data] of potentialPositions.entries()) {
            if (data.adjacentTiles >= 2) {
                validPlacements.push({ q: data.q, r: data.r });
            }
        }
        
        return validPlacements;
    }
    
    getValidPiecePlacements(color, type) {
        // Check if player has pieces available
        const pieceProperty = `${type}sAvailable`;
        if (this.pieces[color][pieceProperty] <= 0) {
            return [];
        }
        
        // For rings, check if player has captured discs to return
        if (type === 'ring' && color === this.currentPlayer && this.pieces[color].discsCaptured <= 0) {
            return [];
        }
        
        // Find all empty tiles of the player's color
        const validPlacements = [];
        
        for (const key in this.board.tiles) {
            const tile = this.board.tiles[key];
            
            if (tile.color === color && !tile.piece) {
                const [q, r] = key.split(',').map(Number);
                validPlacements.push({ q, r });
            }
        }
        
        return validPlacements;
    }
    
    checkVictoryConditions() {
        const blackDiscsOnBoard = this.countPiecesOnBoard('black', 'disc');
        const blackRingsOnBoard = this.countPiecesOnBoard('black', 'ring');
        const whiteDiscsOnBoard = this.countPiecesOnBoard('white', 'disc');
        const whiteRingsOnBoard = this.countPiecesOnBoard('white', 'ring');
        
        // Check if all of opponent's discs are captured
        if (whiteDiscsOnBoard === 0 && this.pieces.white.discsAvailable === 0) {
            this.gameStatus = 'black_win';
            this.winner = 'black';
            return;
        }
        
        if (blackDiscsOnBoard === 0 && this.pieces.black.discsAvailable === 0) {
            this.gameStatus = 'white_win';
            this.winner = 'white';
            return;
        }
        
        // Check if all of opponent's rings are captured
        if (whiteRingsOnBoard === 0 && this.pieces.white.ringsAvailable === 0) {
            this.gameStatus = 'black_win';
            this.winner = 'black';
            return;
        }
        
        if (blackRingsOnBoard === 0 && this.pieces.black.ringsAvailable === 0) {
            this.gameStatus = 'white_win';
            this.winner = 'white';
            return;
        }
        
        // Check if opponent has no pieces on board
        if (whiteDiscsOnBoard === 0 && whiteRingsOnBoard === 0) {
            this.gameStatus = 'black_win';
            this.winner = 'black';
            return;
        }
        
        if (blackDiscsOnBoard === 0 && blackRingsOnBoard === 0) {
            this.gameStatus = 'white_win';
            this.winner = 'white';
            return;
        }
    }
    
    checkDrawConditions() {
        // Check for position repetition
        if (this.checkPositionRepetition()) {
            this.gameStatus = 'draw';
            this.drawReason = 'repetition';
            return;
        }
        
        // Check if current player can make any moves
        const nextPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        
        // Check if player can place a tile
        if (this.pieces[nextPlayer].tilesAvailable > 0 && 
            this.getValidTilePlacements(nextPlayer).length > 0) {
            return; // Can place a tile
        }
        
        // Check if player can place a piece
        if ((this.pieces[nextPlayer].discsAvailable > 0 && 
             this.getValidPiecePlacements(nextPlayer, 'disc').length > 0) ||
            (this.pieces[nextPlayer].ringsAvailable > 0 && 
             this.pieces[nextPlayer].discsCaptured > 0 &&
             this.getValidPiecePlacements(nextPlayer, 'ring').length > 0)) {
            return; // Can place a piece
        }
        
        // Check if player can move any pieces
        for (const key in this.board.tiles) {
            const [q, r] = key.split(',').map(Number);
            const tile = this.board.tiles[key];
            
            if (tile.piece && tile.piece.color === nextPlayer) {
                if (this.getValidMoves(q, r).length > 0) {
                    return; // Can move a piece
                }
            }
        }
        
        // If we get here, the player can't make any moves
        this.gameStatus = 'draw';
        this.drawReason = 'no_moves';
    }
    
    countPiecesOnBoard(color, type) {
        let count = 0;
        
        for (const key in this.board.tiles) {
            const tile = this.board.tiles[key];
            if (tile.piece && tile.piece.color === color && tile.piece.type === type) {
                count++;
            }
        }
        
        return count;
    }
    
    savePositionToHistory() {
        // Create a simplified representation of the board for position comparison
        const position = JSON.stringify(this.board.tiles);
        this.board.positionHistory.push(position);
    }
    
    checkPositionRepetition() {
        // Check if current position has been repeated three times
        const currentPosition = JSON.stringify(this.board.tiles);
        
        let repetitionCount = 0;
        for (const position of this.board.positionHistory) {
            if (position === currentPosition) {
                repetitionCount++;
            }
        }
        
        return repetitionCount >= 3;
    }
    
    /* State Serialization */
    
    getSerializableState() {
        return {
            currentPlayer: this.currentPlayer,
            gameStatus: this.gameStatus,
            winner: this.winner,
            drawReason: this.drawReason,
            board: this.board,
            pieces: this.pieces
        };
    }
    
    loadFromSave(saveData) {
        this.currentPlayer = saveData.currentPlayer;
        this.gameStatus = saveData.gameStatus;
        this.winner = saveData.winner;
        this.drawReason = saveData.drawReason;
        this.board = saveData.board;
        this.pieces = saveData.pieces;
        
        // Notify state change
        this.notifyStateChange();
    }
    
    /* Event Handling */
    
    onStateChange(callback) {
        this.onChangeCallbacks.push(callback);
    }
    
    notifyStateChange() {
        for (const callback of this.onChangeCallbacks) {
            callback(this);
        }
    }

    /**
     * Save the current game state before a player's turn
     * Used to restore state if a move is cancelled
     */
    saveGameState() {
        // Deep clone the board tiles and pieces
        this.savedState = {
            board: {
                tiles: JSON.parse(JSON.stringify(this.board.tiles)),
                positionHistory: [...this.board.positionHistory]
            },
            currentPlayer: this.currentPlayer,
            currentAction: this.currentAction,
            selectedPiece: this.selectedPiece ? { ...this.selectedPiece } : null,
            pieces: JSON.parse(JSON.stringify(this.pieces)),
            gameStatus: this.gameStatus,
            winner: this.winner,
            drawReason: this.drawReason
        };
    }

    /**
     * Restore the game state from the saved state
     * Used when a move is cancelled
     */
    restoreGameState() {
        if (!this.savedState) return false;
        
        // Restore board state
        this.board.tiles = JSON.parse(JSON.stringify(this.savedState.board.tiles));
        this.board.positionHistory = [...this.savedState.board.positionHistory];
        this.currentPlayer = this.savedState.currentPlayer;
        this.currentAction = this.savedState.currentAction;
        this.selectedPiece = this.savedState.selectedPiece ? { ...this.savedState.selectedPiece } : null;
        this.pieces = JSON.parse(JSON.stringify(this.savedState.pieces));
        this.gameStatus = this.savedState.gameStatus;
        this.winner = this.savedState.winner;
        this.drawReason = this.savedState.drawReason;
        
        // Notify that state has changed
        this.notifyStateChange();
        return true;
    }
} 