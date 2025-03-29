/**
 * Rules - Enforces the rules of the Hexaequo game
 * 
 * This module handles validation of game actions according to the rules
 * of Hexaequo, separating rule enforcement from game state management.
 */

/**
 * Check if a move is to an adjacent hex
 * @param {number} q1 - Starting Q coordinate
 * @param {number} r1 - Starting R coordinate
 * @param {number} q2 - Destination Q coordinate
 * @param {number} r2 - Destination R coordinate
 * @returns {boolean} True if the move is to an adjacent hex
 */
export function isAdjacentMove(q1, r1, q2, r2) {
    // In axial coordinates, adjacent hexes have a distance of 1
    const dq = q2 - q1;
    const dr = r2 - r1;
    
    // Calculate the Manhattan distance in axial coordinates
    const distance = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
    return distance === 1;
}

/**
 * Check if a move is a valid jump (2 tiles away in a straight line)
 * @param {number} q1 - Starting Q coordinate
 * @param {number} r1 - Starting R coordinate
 * @param {number} q2 - Destination Q coordinate
 * @param {number} r2 - Destination R coordinate
 * @returns {boolean} True if the move is a valid jump
 */
export function isValidJump(q1, r1, q2, r2) {
    // Jump is 2 tiles away in a straight line
    const dq = q2 - q1;
    const dr = r2 - r1;
    
    // Check if the distance is 2 and the hex is in a straight line
    if (Math.abs(dq) === 2 && dr === 0) return true; // Horizontal jump
    if (Math.abs(dr) === 2 && dq === 0) return true; // Vertical jump
    if (Math.abs(dq) === 2 && Math.abs(dr) === 2 && dq + dr === 0) return true; // Diagonal jump
    
    return false;
}

/**
 * Check if a move is a valid ring move (exactly 2 tiles away in any direction)
 * @param {number} q1 - Starting Q coordinate
 * @param {number} r1 - Starting R coordinate
 * @param {number} q2 - Destination Q coordinate
 * @param {number} r2 - Destination R coordinate
 * @returns {boolean} True if the move is a valid ring move
 */
export function isRingMove(q1, r1, q2, r2) {
    // Ring moves exactly 2 tiles in any direction
    const dq = q2 - q1;
    const dr = r2 - r1;
    
    // Calculate the Manhattan distance in axial coordinates
    const distance = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
    return distance === 2;
}

/**
 * Get the coordinates of a hex between two hexes (for jump validation)
 * @param {number} q1 - Starting Q coordinate
 * @param {number} r1 - Starting R coordinate
 * @param {number} q2 - Destination Q coordinate
 * @param {number} r2 - Destination R coordinate
 * @returns {Object|null} The coordinates of the hex between, or null if not in a straight line
 */
export function getJumpedHex(q1, r1, q2, r2) {
    if (!isValidJump(q1, r1, q2, r2)) {
        return null;
    }
    
    // The jumped hex is halfway between the start and end
    return {
        q: (q1 + q2) / 2,
        r: (r1 + r2) / 2
    };
}

/**
 * Check if a player can place a tile at the specified coordinates
 * @param {Object} gameState - The current game state
 * @param {number} q - Q coordinate
 * @param {number} r - R coordinate
 * @param {string} color - Tile color ('black' or 'white')
 * @returns {boolean} True if the tile placement is valid
 */
export function canPlaceTile(gameState, q, r, color) {
    if (color !== 'black' && color !== 'white') {
        return false;
    }
    
    // Check if the coordinates are already occupied
    const key = `${q},${r}`;
    if (gameState.board.tiles[key]) {
        return false;
    }
    
    // Check if the player has tiles available
    if (gameState.pieces[color].tilesAvailable <= 0) {
        return false;
    }
    
    // For an empty board, any position is valid
    if (Object.keys(gameState.board.tiles).length === 0) {
        return true;
    }
    
    // For initial setup (first 4 tiles), allow specific positions
    if (Object.keys(gameState.board.tiles).length < 4) {
        // Initial positions for the first 4 tiles
        const initialPositions = [
            { q: 0, r: 0 }, { q: 1, r: 0 }, 
            { q: 0, r: 1 }, { q: 1, r: 1 }
        ];
        
        // Check if this position is in the initial positions
        return initialPositions.some(pos => pos.q === q && pos.r === r);
    }
    
    // For normal gameplay, a tile must be adjacent to at least 2 existing tiles
    let adjacentTiles = 0;
    const adjacentHexes = [
        { q: q+1, r: r }, { q: q+1, r: r-1 },
        { q: q, r: r-1 }, { q: q-1, r: r },
        { q: q-1, r: r+1 }, { q: q, r: r+1 }
    ];
    
    for (const adjHex of adjacentHexes) {
        const adjKey = `${adjHex.q},${adjHex.r}`;
        if (gameState.board.tiles[adjKey]) {
            adjacentTiles++;
        }
    }
    
    return adjacentTiles >= 2;
}

/**
 * Check if a player can place a piece at the specified coordinates
 * @param {Object} gameState - The current game state
 * @param {number} q - Q coordinate
 * @param {number} r - R coordinate
 * @param {string} color - Piece color ('black' or 'white')
 * @param {string} type - Piece type ('disc' or 'ring')
 * @returns {boolean} True if the piece placement is valid
 */
export function canPlacePiece(gameState, q, r, color, type) {
    if (color !== 'black' && color !== 'white') {
        return false;
    }
    
    if (type !== 'disc' && type !== 'ring') {
        return false;
    }
    
    const key = `${q},${r}`;
    
    // Check if tile exists and is the correct color
    const tile = gameState.board.tiles[key];
    if (!tile || tile.color !== color || tile.piece) {
        return false;
    }
    
    // Check if the player has the piece available
    const pieceProperty = `${type}sAvailable`;
    if (gameState.pieces[color][pieceProperty] <= 0) {
        return false;
    }
    
    // For rings, check if player has captured discs to return
    if (type === 'ring' && gameState.currentPlayer === color) {
        if (gameState.pieces[color].discsCaptured <= 0) {
            return false;
        }
    }
    
    return true;
}

/**
 * Check if a player can move a piece from one position to another
 * @param {Object} gameState - The current game state
 * @param {number} fromQ - Starting Q coordinate
 * @param {number} fromR - Starting R coordinate
 * @param {number} toQ - Destination Q coordinate
 * @param {number} toR - Destination R coordinate
 * @returns {Object} Result object with validity and reason
 */
export function canMovePiece(gameState, fromQ, fromR, toQ, toR) {
    const fromKey = `${fromQ},${fromR}`;
    const toKey = `${toQ},${toR}`;
    
    // Check if source tile has a piece
    const sourceTile = gameState.board.tiles[fromKey];
    if (!sourceTile || !sourceTile.piece) {
        return { valid: false, reason: 'No piece at source position' };
    }
    
    // Check if the piece belongs to the current player
    if (sourceTile.piece.color !== gameState.currentPlayer) {
        return { valid: false, reason: 'Piece does not belong to current player' };
    }
    
    // Check if destination tile exists
    const destTile = gameState.board.tiles[toKey];
    if (!destTile) {
        return { valid: false, reason: 'No tile at destination position' };
    }
    
    // Handle different piece movement rules
    const piece = sourceTile.piece;
    
    if (piece.type === 'disc') {
        // Disc movement: adjacent or jump
        if (isAdjacentMove(fromQ, fromR, toQ, toR)) {
            // Simple adjacent move - destination must be empty
            if (destTile.piece) {
                return { valid: false, reason: 'Destination is occupied' };
            }
            return { valid: true };
            
        } else if (isValidJump(fromQ, fromR, toQ, toR)) {
            // Jump move - check if there's a piece to jump over
            const jumpedHex = getJumpedHex(fromQ, fromR, toQ, toR);
            const jumpedKey = `${jumpedHex.q},${jumpedHex.r}`;
            const jumpedTile = gameState.board.tiles[jumpedKey];
            
            if (!jumpedTile || !jumpedTile.piece) {
                return { valid: false, reason: 'No piece to jump over' };
            }
            
            if (destTile.piece) {
                return { valid: false, reason: 'Destination is occupied' };
            }
            
            return { valid: true, jumpedHex };
        } else {
            return { valid: false, reason: 'Invalid move for disc' };
        }
        
    } else if (piece.type === 'ring') {
        // Ring movement: exactly 2 tiles distance
        if (!isRingMove(fromQ, fromR, toQ, toR)) {
            return { valid: false, reason: 'Invalid move for ring' };
        }
        
        // Check if destination has own piece (can't capture own piece)
        if (destTile.piece && destTile.piece.color === gameState.currentPlayer) {
            return { valid: false, reason: 'Cannot capture own piece' };
        }
        
        return { valid: true, captureTarget: destTile.piece ? { q: toQ, r: toR } : null };
    }
    
    return { valid: false, reason: 'Unknown piece type' };
}

/**
 * Get all valid moves for a piece at the specified coordinates
 * @param {Object} gameState - The current game state
 * @param {number} q - Q coordinate
 * @param {number} r - R coordinate
 * @returns {Array} Array of valid move coordinates
 */
export function getValidMoves(gameState, q, r) {
    const key = `${q},${r}`;
    const tile = gameState.board.tiles[key];
    
    if (!tile || !tile.piece || tile.piece.color !== gameState.currentPlayer) {
        return [];
    }
    
    const validMoves = [];
    const piece = tile.piece;
    
    // Check all potential destinations
    for (const destKey in gameState.board.tiles) {
        const [destQ, destR] = destKey.split(',').map(Number);
        
        // Skip the source tile
        if (destQ === q && destR === r) continue;
        
        const moveResult = canMovePiece(gameState, q, r, destQ, destR);
        if (moveResult.valid) {
            validMoves.push({ q: destQ, r: destR, ...moveResult });
        }
    }
    
    return validMoves;
}

/**
 * Get all valid tile placements for the specified color
 * @param {Object} gameState - The current game state
 * @param {string} color - Tile color ('black' or 'white')
 * @returns {Array} Array of valid placement coordinates
 */
export function getValidTilePlacements(gameState, color) {
    if (gameState.pieces[color].tilesAvailable <= 0) {
        return [];
    }
    
    // For an empty board, any position is valid (use origin)
    if (Object.keys(gameState.board.tiles).length === 0) {
        return [{ q: 0, r: 0 }];
    }
    
    // For initial setup (first 4 tiles), allow specific positions
    if (Object.keys(gameState.board.tiles).length < 4) {
        // Check which initial positions are still available
        const initialPositions = [
            { q: 0, r: 0 }, { q: 1, r: 0 }, 
            { q: 0, r: 1 }, { q: 1, r: 1 }
        ];
        
        return initialPositions.filter(pos => {
            const key = `${pos.q},${pos.r}`;
            return !gameState.board.tiles[key];
        });
    }
    
    // For normal gameplay, a tile must be adjacent to at least 2 existing tiles
    const validPlacements = [];
    const existingPositions = new Set(Object.keys(gameState.board.tiles));
    
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

/**
 * Get all valid piece placements for the specified color and type
 * @param {Object} gameState - The current game state
 * @param {string} color - Piece color ('black' or 'white')
 * @param {string} type - Piece type ('disc' or 'ring')
 * @returns {Array} Array of valid placement coordinates
 */
export function getValidPiecePlacements(gameState, color, type) {
    // Check if player has pieces available
    const pieceProperty = `${type}sAvailable`;
    if (gameState.pieces[color][pieceProperty] <= 0) {
        return [];
    }
    
    // For rings, check if player has captured discs to return
    if (type === 'ring' && color === gameState.currentPlayer && gameState.pieces[color].discsCaptured <= 0) {
        return [];
    }
    
    // Find all empty tiles of the player's color
    const validPlacements = [];
    
    for (const key in gameState.board.tiles) {
        const tile = gameState.board.tiles[key];
        
        if (tile.color === color && !tile.piece) {
            const [q, r] = key.split(',').map(Number);
            validPlacements.push({ q, r });
        }
    }
    
    return validPlacements;
}

/**
 * Check for victory conditions in the current game state
 * @param {Object} gameState - The current game state
 * @returns {Object|null} Victory result or null if game is ongoing
 */
export function checkVictoryConditions(gameState) {
    const blackDiscsOnBoard = countPiecesOnBoard(gameState, 'black', 'disc');
    const blackRingsOnBoard = countPiecesOnBoard(gameState, 'black', 'ring');
    const whiteDiscsOnBoard = countPiecesOnBoard(gameState, 'white', 'disc');
    const whiteRingsOnBoard = countPiecesOnBoard(gameState, 'white', 'ring');
    
    // Check if all of opponent's discs are captured
    if (whiteDiscsOnBoard === 0 && gameState.pieces.white.discsAvailable === 0) {
        return {
            gameStatus: 'black_win',
            winner: 'black',
            reason: 'All white discs captured'
        };
    }
    
    if (blackDiscsOnBoard === 0 && gameState.pieces.black.discsAvailable === 0) {
        return {
            gameStatus: 'white_win',
            winner: 'white',
            reason: 'All black discs captured'
        };
    }
    
    // Check if all of opponent's rings are captured
    if (whiteRingsOnBoard === 0 && gameState.pieces.white.ringsAvailable === 0) {
        return {
            gameStatus: 'black_win',
            winner: 'black',
            reason: 'All white rings captured'
        };
    }
    
    if (blackRingsOnBoard === 0 && gameState.pieces.black.ringsAvailable === 0) {
        return {
            gameStatus: 'white_win',
            winner: 'white',
            reason: 'All black rings captured'
        };
    }
    
    // Check if opponent has no pieces on board
    if (whiteDiscsOnBoard === 0 && whiteRingsOnBoard === 0) {
        return {
            gameStatus: 'black_win',
            winner: 'black',
            reason: 'No white pieces on board'
        };
    }
    
    if (blackDiscsOnBoard === 0 && blackRingsOnBoard === 0) {
        return {
            gameStatus: 'white_win',
            winner: 'white',
            reason: 'No black pieces on board'
        };
    }
    
    return null;
}

/**
 * Check for draw conditions in the current game state
 * @param {Object} gameState - The current game state
 * @param {string} nextPlayer - The next player ('black' or 'white')
 * @returns {Object|null} Draw result or null if game is ongoing
 */
export function checkDrawConditions(gameState, nextPlayer) {
    // Check for position repetition
    if (checkPositionRepetition(gameState)) {
        return {
            gameStatus: 'draw',
            drawReason: 'repetition'
        };
    }
    
    // Check if next player can make any moves
    
    // Check if player can place a tile
    if (gameState.pieces[nextPlayer].tilesAvailable > 0 && 
        getValidTilePlacements(gameState, nextPlayer).length > 0) {
        return null; // Can place a tile
    }
    
    // Check if player can place a piece
    if ((gameState.pieces[nextPlayer].discsAvailable > 0 && 
         getValidPiecePlacements(gameState, nextPlayer, 'disc').length > 0) ||
        (gameState.pieces[nextPlayer].ringsAvailable > 0 && 
         gameState.pieces[nextPlayer].discsCaptured > 0 &&
         getValidPiecePlacements(gameState, nextPlayer, 'ring').length > 0)) {
        return null; // Can place a piece
    }
    
    // Check if player can move any pieces
    for (const key in gameState.board.tiles) {
        const [q, r] = key.split(',').map(Number);
        const tile = gameState.board.tiles[key];
        
        if (tile.piece && tile.piece.color === nextPlayer) {
            if (getValidMoves(gameState, q, r).length > 0) {
                return null; // Can move a piece
            }
        }
    }
    
    // If we get here, the player can't make any moves
    return {
        gameStatus: 'draw',
        drawReason: 'no_moves'
    };
}

/**
 * Count pieces of a specific color and type on the board
 * @param {Object} gameState - The current game state
 * @param {string} color - Piece color ('black' or 'white')
 * @param {string} type - Piece type ('disc' or 'ring')
 * @returns {number} Number of pieces on the board
 */
export function countPiecesOnBoard(gameState, color, type) {
    let count = 0;
    
    for (const key in gameState.board.tiles) {
        const tile = gameState.board.tiles[key];
        if (tile.piece && tile.piece.color === color && tile.piece.type === type) {
            count++;
        }
    }
    
    return count;
}

/**
 * Check if the current position has been repeated three times
 * @param {Object} gameState - The current game state
 * @returns {boolean} True if the position has been repeated three times
 */
export function checkPositionRepetition(gameState) {
    // Create a simplified representation of the board for position comparison
    const currentPosition = JSON.stringify(gameState.board.tiles);
    
    let repetitionCount = 0;
    for (const position of gameState.board.positionHistory) {
        if (position === currentPosition) {
            repetitionCount++;
        }
    }
    
    return repetitionCount >= 3;
} 