/**
 * StorageManager - Handles saving and loading game state to/from session storage
 */
export class StorageManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.storageKey = 'hexaequo_game_state';
    }
    
    /**
     * Save the current game state to session storage
     * @param {Object} state - Serializable game state
     */
    saveGame(state) {
        try {
            const serializedState = JSON.stringify(state);
            sessionStorage.setItem(this.storageKey, serializedState);
            return true;
        } catch (error) {
            console.error('Error saving game state:', error);
            return false;
        }
    }
    
    /**
     * Load game state from session storage
     * @returns {Object|null} - The loaded game state or null if not found
     */
    loadGame() {
        try {
            const serializedState = sessionStorage.getItem(this.storageKey);
            
            if (!serializedState) {
                return null;
            }
            
            return JSON.parse(serializedState);
        } catch (error) {
            console.error('Error loading game state:', error);
            return null;
        }
    }
    
    /**
     * Clear saved game state from session storage
     */
    clearSavedGame() {
        try {
            sessionStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Error clearing saved game:', error);
            return false;
        }
    }
    
    /**
     * Check if there is a saved game in session storage
     * @returns {boolean} - True if a saved game exists
     */
    hasSavedGame() {
        return sessionStorage.getItem(this.storageKey) !== null;
    }
    
    /**
     * Create an API function that saves/loads game state via JSON
     * This function can be used for future integration with external systems
     * @param {string} action - 'save', 'load', or 'get_state'
     * @param {Object} [data] - Game state data (for 'save' action)
     * @returns {Object} - Result of the action
     */
    apiFunction(action, data) {
        switch (action) {
            case 'save':
                if (!data) {
                    return { 
                        success: false, 
                        error: 'No data provided for save action' 
                    };
                }
                
                const saveResult = this.saveGame(data);
                return { 
                    success: saveResult, 
                    message: saveResult ? 'Game saved successfully' : 'Failed to save game' 
                };
                
            case 'load':
                const loadedState = this.loadGame();
                if (!loadedState) {
                    return { 
                        success: false, 
                        error: 'No saved game found' 
                    };
                }
                
                return { 
                    success: true, 
                    data: loadedState 
                };
                
            case 'get_state':
                return { 
                    success: true, 
                    data: this.gameState.getSerializableState() 
                };
                
            default:
                return { 
                    success: false, 
                    error: `Unknown action: ${action}` 
                };
        }
    }
} 