/**
 * StorageManager - Handles saving and loading game state to/from session storage
 */
import { eventBus, EventTypes } from '../../api/eventBus.js';
import { apiClient } from '../../api/apiClient.js';

export class StorageManager {
    constructor() {
        this.storageKey = 'hexaequo_game_state';
        
        // Set up event listeners for auto-saving
        this.setupAutoSave();
    }
    
    /**
     * Set up event listeners for automatically saving the game
     */
    setupAutoSave() {
        // Save on critical game state changes
        const saveEvents = [
            EventTypes.TURN_ENDED,
            EventTypes.PIECE_PLACED,
            EventTypes.PIECE_MOVED,
            EventTypes.PIECE_CAPTURED,
            EventTypes.TILE_PLACED,
            EventTypes.GAME_ENDED
        ];
        
        // Listen for events and save the game
        for (const eventType of saveEvents) {
            eventBus.subscribe(eventType, async () => {
                try {
                    await apiClient.request('saveGame');
                } catch (error) {
                    console.error('Failed to auto-save game:', error);
                }
            });
        }
    }
    
    /**
     * Save the current game state to session storage
     * @param {Object} state - Serializable game state
     * @returns {boolean} Success status
     */
    saveGame(state) {
        try {
            const serializedState = JSON.stringify(state);
            sessionStorage.setItem(this.storageKey, serializedState);
            return true;
        } catch (error) {
            console.error('Error saving game state:', error);
            
            // Publish error event
            eventBus.publish(EventTypes.ERROR_OCCURRED, {
                source: 'storage',
                message: 'Failed to save game state',
                details: error
            });
            
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
            
            // Publish error event
            eventBus.publish(EventTypes.ERROR_OCCURRED, {
                source: 'storage',
                message: 'Failed to load game state',
                details: error
            });
            
            return null;
        }
    }
    
    /**
     * Clear saved game state from session storage
     * @returns {boolean} Success status
     */
    clearSavedGame() {
        try {
            sessionStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Error clearing saved game:', error);
            
            // Publish error event
            eventBus.publish(EventTypes.ERROR_OCCURRED, {
                source: 'storage',
                message: 'Failed to clear saved game',
                details: error
            });
            
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