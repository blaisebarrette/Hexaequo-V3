/**
 * UI Test Script
 * 
 * This script contains functions to test UI interactions in the Hexaequo game
 * through the API layer, respecting the modular architecture.
 * 
 * Run these functions in the browser console to test different UI features.
 */

// API client reference
let apiClient;

/**
 * Initialize the test environment
 * Will set up API access for testing
 */
async function initTest() {
    // Check if we have access to API
    if (window.debugHexaequo?.apiClient) {
        apiClient = window.debugHexaequo.apiClient;
        console.log('Test environment initialized successfully using debugHexaequo');
        return true;
    }
    
    // Try to import the API client directly
    try {
        const apiModule = await import('../api/apiClient.js');
        apiClient = apiModule.apiClient;
        console.log('Test environment initialized successfully using direct import');
        return true;
    } catch (error) {
        console.error('Failed to import API client:', error);
        console.error('Please ensure the API module is correctly initialized');
        return false;
    }
}

/**
 * Display all available UI elements for testing
 */
async function showUIElements() {
    if (!apiClient) {
        console.error('API client not initialized. Call initTest() first.');
        return;
    }
    
    try {
        // Get the game state to understand what's available
        const state = await apiClient.request('getGameState');
        
        console.log('Current game state:', state);
        console.log('Available UI elements for testing:');
        console.log('- Tile placement UI: testTilePlacementUI(q, r)');
        console.log('- Piece placement UI: testPiecePlacementUI(q, r)');
        console.log('- Validation UI: testValidationUI(q, r)');
        console.log('- Animations: testTilePlacementAnimation(q, r), testPiecePlacementAnimation(q, r, pieceType)');
    } catch (error) {
        console.error('Error getting game state:', error);
    }
}

/**
 * Test tile placement UI
 * @param {number} q - Q coordinate
 * @param {number} r - R coordinate
 */
async function testTilePlacementUI(q = 0, r = 0) {
    if (!apiClient) {
        console.error('API client not initialized. Call initTest() first.');
        return;
    }
    
    try {
        console.log(`Showing tile placement UI at (${q}, ${r})`);
        const result = await apiClient.request('showTilePlacementUIForPosition', { q, r });
        console.log('Result:', result);
    } catch (error) {
        console.error('Error showing tile placement UI:', error);
    }
}

/**
 * Test piece placement UI
 * @param {number} q - Q coordinate
 * @param {number} r - R coordinate
 * @param {boolean} canPlaceDisc - Whether disc placement is available
 * @param {boolean} canPlaceRing - Whether ring placement is available
 */
async function testPiecePlacementUI(q = 0, r = 0, canPlaceDisc = true, canPlaceRing = true) {
    if (!apiClient) {
        console.error('API client not initialized. Call initTest() first.');
        return;
    }
    
    try {
        // Get current player color
        const state = await apiClient.request('getGameState');
        const color = state.currentPlayer || 'black';
        
        console.log(`Showing piece placement UI at (${q}, ${r}) for ${color}`);
        const result = await apiClient.request('showPiecePlacementUIForTile', {
            q, r, color, canPlaceDisc, canPlaceRing
        });
        console.log('Result:', result);
    } catch (error) {
        console.error('Error showing piece placement UI:', error);
    }
}

/**
 * Test validation UI
 * @param {number} q - Q coordinate
 * @param {number} r - R coordinate
 */
async function testValidationUI(q = 0, r = 0) {
    if (!apiClient) {
        console.error('API client not initialized. Call initTest() first.');
        return;
    }
    
    try {
        console.log(`Showing validation UI at (${q}, ${r})`);
        
        // First select a position
        await apiClient.request('selectTile', { q, r });
        
        // Then show validation UI by starting a relevant action
        await apiClient.request('startPlaceTileAction');
        
        console.log('Validation UI should now be shown');
    } catch (error) {
        console.error('Error showing validation UI:', error);
    }
}

/**
 * Test tile placement animation
 * @param {number} q - Q coordinate
 * @param {number} r - R coordinate
 */
async function testTilePlacementAnimation(q = 0, r = 0) {
    if (!apiClient) {
        console.error('API client not initialized. Call initTest() first.');
        return;
    }
    
    try {
        // Get current player color
        const state = await apiClient.request('getGameState');
        const color = state.currentPlayer || 'black';
        
        console.log(`Testing tile placement animation at (${q}, ${r}) for ${color}`);
        
        // Start place tile action
        await apiClient.request('startPlaceTileAction');
        
        // Place a tile through the API
        const result = await apiClient.request('placeTile', { q, r, color });
        console.log('Result:', result);
    } catch (error) {
        console.error('Error testing tile placement animation:', error);
    }
}

/**
 * Test piece placement animation
 * @param {number} q - Q coordinate
 * @param {number} r - R coordinate
 * @param {string} pieceType - Type of piece ('disc' or 'ring')
 */
async function testPiecePlacementAnimation(q = 0, r = 0, pieceType = 'disc') {
    if (!apiClient) {
        console.error('API client not initialized. Call initTest() first.');
        return;
    }
    
    try {
        // Get current player color
        const state = await apiClient.request('getGameState');
        const color = state.currentPlayer || 'black';
        
        console.log(`Testing ${pieceType} placement animation at (${q}, ${r}) for ${color}`);
        
        // Start place piece action
        await apiClient.request('startPlacePieceAction', { pieceType });
        
        // Calculate tile ID
        const tileId = `${q}-${r}`;
        
        // Place a piece through the API
        const result = await apiClient.request('placePiece', { 
            tileId, 
            pieceType,
            color
        });
        console.log('Result:', result);
    } catch (error) {
        console.error('Error testing piece placement animation:', error);
    }
}

/**
 * Test valid moves for a piece
 * @param {number} q - Q coordinate
 * @param {number} r - R coordinate
 */
async function testShowValidMoves(q = 0, r = 0) {
    if (!apiClient) {
        console.error('API client not initialized. Call initTest() first.');
        return;
    }
    
    try {
        console.log(`Showing valid moves for piece at (${q}, ${r})`);
        
        // Start move piece action
        await apiClient.request('startMovePieceAction');
        
        // Calculate piece ID
        const pieceId = `piece_${q}_${r}`;
        
        // Show valid moves by selecting the piece
        const result = await apiClient.request('selectPiece', { pieceId });
        console.log('Result:', result);
    } catch (error) {
        console.error('Error showing valid moves:', error);
    }
}

/**
 * Clear all UI elements by canceling the current action
 */
async function testClearUI() {
    if (!apiClient) {
        console.error('API client not initialized. Call initTest() first.');
        return;
    }
    
    try {
        console.log('Clearing all UI elements');
        const result = await apiClient.request('cancelAction');
        console.log('Result:', result);
    } catch (error) {
        console.error('Error clearing UI:', error);
    }
}

/**
 * Show all pieces on the board
 */
async function showAllPieces() {
    if (!apiClient) {
        console.error('API client not initialized. Call initTest() first.');
        return;
    }
    
    try {
        // Get the game state
        const state = await apiClient.request('getGameState');
        
        if (!state.board || !state.board.pieces) {
            console.log('No pieces found on the board');
            return;
        }
        
        console.log('Pieces on the board:', state.board.pieces);
    } catch (error) {
        console.error('Error getting pieces:', error);
    }
}

// Export for console use
window.HexaequoTest = {
    initTest,
    showUIElements,
    testTilePlacementUI,
    testPiecePlacementUI,
    testValidationUI,
    testTilePlacementAnimation,
    testPiecePlacementAnimation,
    testShowValidMoves,
    testClearUI,
    showAllPieces
}; 