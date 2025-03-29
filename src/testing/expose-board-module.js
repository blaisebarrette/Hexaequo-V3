/**
 * Expose Board Module for Testing
 * 
 * This script adapts to the modular architecture by creating a testing interface
 * that uses the API to interact with the board module.
 * 
 * To use this code:
 * 1. Include this script in your HTML after the main.js script
 * 2. Open the console and use: HexaequoTest.initTest()
 * 3. Then use the test functions: HexaequoTest.testTilePlacementUI(0, 0)
 */

(function() {
    console.log('Setting up testing interface for modular architecture...');
    
    // Import required modules
    let apiClient, eventBus;
    
    // Create a testing proxy that routes calls through the API
    const testingProxy = {
        initialized: false,
        
        async initialize() {
            try {
                // Get API references from window.debugHexaequo if available
                if (window.debugHexaequo) {
                    apiClient = window.debugHexaequo.apiClient;
                    eventBus = window.debugHexaequo.eventBus;
                    this.initialized = true;
                    console.log('Test environment initialized using debugHexaequo');
                    return true;
                }
                
                // Try to import directly
                try {
                    const apiModule = await import('../api/apiClient.js');
                    const eventModule = await import('../api/eventBus.js');
                    apiClient = apiModule.apiClient;
                    eventBus = eventModule.eventBus;
                    this.initialized = true;
                    console.log('Test environment initialized using direct imports');
                    return true;
                } catch (importError) {
                    console.error('Could not import API modules:', importError);
                }
                
                console.error('Failed to initialize test environment');
                return false;
            } catch (error) {
                console.error('Error initializing test environment:', error);
                return false;
            }
        },
        
        // API-based testing methods
        async testTilePlacementUI(q, r) {
            if (!this.initialized) await this.initialize();
            console.log(`Testing tile placement UI at (${q}, ${r})`);
            
            try {
                const result = await apiClient.request('showTilePlacementUIForPosition', { q, r });
                console.log('Result:', result);
                return result;
            } catch (error) {
                console.error('Error showing tile placement UI:', error);
                return false;
            }
        },
        
        async testPiecePlacementUI(q, r, color = null) {
            if (!this.initialized) await this.initialize();
            console.log(`Testing piece placement UI at (${q}, ${r})`);
            
            try {
                // Get current player if color not specified
                if (!color) {
                    const state = await apiClient.request('getGameState');
                    color = state.currentPlayer || 'black';
                }
                
                const result = await apiClient.request('showPiecePlacementUIForTile', { q, r, color });
                console.log('Result:', result);
                return result;
            } catch (error) {
                console.error('Error showing piece placement UI:', error);
                return false;
            }
        },
        
        async testAction(action, params = {}) {
            if (!this.initialized) await this.initialize();
            console.log(`Testing action: ${action}`, params);
            
            try {
                const result = await apiClient.request(action, params);
                console.log('Result:', result);
                return result;
            } catch (error) {
                console.error(`Error executing action ${action}:`, error);
                return false;
            }
        },
        
        async getBoardState() {
            if (!this.initialized) await this.initialize();
            
            try {
                return await apiClient.request('getBoardState');
            } catch (error) {
                console.error('Error getting board state:', error);
                return null;
            }
        },
        
        async startPlaceTileAction() {
            return this.testAction('startPlaceTileAction');
        },
        
        async startPlacePieceAction(pieceType) {
            return this.testAction('startPlacePieceAction', { pieceType });
        },
        
        async startMovePieceAction() {
            return this.testAction('startMovePieceAction');
        },
        
        async cancelAction() {
            return this.testAction('cancelAction');
        },
        
        async completeCurrentAction() {
            return this.testAction('completeCurrentAction');
        }
    };
    
    // Export testing functions globally
    window.HexaequoTest = {
        initTest: () => testingProxy.initialize(),
        testTilePlacementUI: (q, r) => testingProxy.testTilePlacementUI(q, r),
        testPiecePlacementUI: (q, r, color) => testingProxy.testPiecePlacementUI(q, r, color),
        startPlaceTileAction: () => testingProxy.startPlaceTileAction(),
        startPlacePieceAction: (pieceType) => testingProxy.startPlacePieceAction(pieceType),
        startMovePieceAction: () => testingProxy.startMovePieceAction(),
        cancelAction: () => testingProxy.cancelAction(),
        completeCurrentAction: () => testingProxy.completeCurrentAction(),
        getBoardState: () => testingProxy.getBoardState()
    };
    
    console.log('HexaequoTest interface created. Use HexaequoTest.initTest() to initialize.');
})(); 