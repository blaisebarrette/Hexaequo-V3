/**
 * API Interface - Defines the methods available in the game API
 * 
 * This module serves as documentation and typing for all available
 * API methods. It defines the parameter types and return values for each method.
 */

/**
 * Game State API Methods
 * 
 * These methods handle fetching and modifying the core game state.
 */
export const GameStateAPI = {
    /**
     * Get the current game state
     * @returns {Object} The current game state
     */
    getGameState: {
        params: [],
        description: 'Get the current game state'
    },
    
    /**
     * Start a new game with default setup
     * @returns {Object} The new game state
     */
    startNewGame: {
        params: [],
        description: 'Start a new game with default setup'
    },
    
    /**
     * End the current player's turn
     * @returns {Object} Updated game state
     */
    endTurn: {
        params: [],
        description: 'End the current player\'s turn'
    },
    
    /**
     * Save the current game state
     * @returns {boolean} Success status
     */
    saveGame: {
        params: [],
        description: 'Save the current game state'
    },
    
    /**
     * Load a saved game state
     * @returns {Object} Loaded game state
     */
    loadGame: {
        params: [],
        description: 'Load a saved game state'
    }
};

/**
 * Board Action API Methods
 * 
 * These methods handle specific game actions on the board.
 */
export const BoardActionAPI = {
    /**
     * Place a tile at the specified coordinates
     * @param {number} q - Q coordinate in axial coordinate system
     * @param {number} r - R coordinate in axial coordinate system
     * @param {string} color - Tile color ('black' or 'white')
     * @returns {boolean} Success status
     */
    placeTile: {
        params: ['q', 'r', 'color'],
        description: 'Place a tile at the specified coordinates'
    },
    
    /**
     * Place a piece at the specified coordinates
     * @param {number} q - Q coordinate in axial coordinate system
     * @param {number} r - R coordinate in axial coordinate system
     * @param {string} color - Piece color ('black' or 'white')
     * @param {string} type - Piece type ('disc' or 'ring')
     * @returns {boolean} Success status
     */
    placePiece: {
        params: ['q', 'r', 'color', 'type'],
        description: 'Place a piece at the specified coordinates'
    },
    
    /**
     * Move a piece from one position to another
     * @param {number} fromQ - Starting Q coordinate
     * @param {number} fromR - Starting R coordinate
     * @param {number} toQ - Destination Q coordinate
     * @param {number} toR - Destination R coordinate
     * @returns {boolean} Success status
     */
    movePiece: {
        params: ['fromQ', 'fromR', 'toQ', 'toR'],
        description: 'Move a piece from one position to another'
    },
    
    /**
     * Get valid moves for a piece at the specified coordinates
     * @param {number} q - Q coordinate in axial coordinate system
     * @param {number} r - R coordinate in axial coordinate system
     * @returns {Array} Array of valid move coordinates
     */
    getValidMoves: {
        params: ['q', 'r'],
        description: 'Get valid moves for a piece at the specified coordinates'
    },
    
    /**
     * Get valid tile placements for the specified color
     * @param {string} color - Tile color ('black' or 'white')
     * @returns {Array} Array of valid placement coordinates
     */
    getValidTilePlacements: {
        params: ['color'],
        description: 'Get valid tile placements for the specified color'
    },
    
    /**
     * Get valid piece placements for the specified color and type
     * @param {string} color - Piece color ('black' or 'white')
     * @param {string} type - Piece type ('disc' or 'ring')
     * @returns {Array} Array of valid placement coordinates
     */
    getValidPiecePlacements: {
        params: ['color', 'type'],
        description: 'Get valid piece placements for the specified color and type'
    },
    
    /**
     * Cancel the current action
     * @returns {boolean} Success status
     */
    cancelAction: {
        params: [],
        description: 'Cancel the current action'
    }
};

/**
 * UI API Methods
 * 
 * These methods handle user interface state and interactions.
 */
export const UIAPI = {
    /**
     * Show valid move indicators
     * @param {number} q - Q coordinate of selected piece
     * @param {number} r - R coordinate of selected piece
     * @param {Array} moves - Array of valid move coordinates
     */
    showValidMoves: {
        params: ['q', 'r', 'moves'],
        description: 'Show valid move indicators'
    },
    
    /**
     * Hide valid move indicators
     */
    hideValidMoves: {
        params: [],
        description: 'Hide valid move indicators'
    },
    
    /**
     * Get whether valid moves are currently visible
     * @returns {boolean} Whether valid moves are visible
     */
    isValidMovesVisible: {
        params: [],
        description: 'Get whether valid moves are currently visible'
    },
    
    /**
     * Show piece placement UI at the specified coordinates
     * @param {number} q - Q coordinate in axial coordinate system
     * @param {number} r - R coordinate in axial coordinate system
     * @param {string} color - Piece color ('black' or 'white')
     * @param {Object} options - Options for piece placement UI
     */
    showPiecePlacementUI: {
        params: ['q', 'r', 'color', 'options'],
        description: 'Show piece placement UI at the specified coordinates'
    },
    
    /**
     * Show tile placement UI at the specified coordinates
     * @param {number} q - Q coordinate in axial coordinate system
     * @param {number} r - R coordinate in axial coordinate system
     * @param {string} color - Tile color ('black' or 'white')
     */
    showTilePlacementUI: {
        params: ['q', 'r', 'color'],
        description: 'Show tile placement UI at the specified coordinates'
    },
    
    /**
     * Clear all UI action elements
     */
    clearActionUI: {
        params: [],
        description: 'Clear all UI action elements'
    },
    
    /**
     * Update UI to reflect current game state
     */
    updateUI: {
        params: [],
        description: 'Update UI to reflect current game state'
    },
    
    /**
     * Show tile placement UI for a position
     * @param {number} q - Q coordinate
     * @param {number} r - R coordinate
     */
    showTilePlacementUIForPosition: {
        params: {
            q: 'number',
            r: 'number'
        }
    },
    
    /**
     * Show piece placement UI for a tile
     * @param {number} q - Q coordinate
     * @param {number} r - R coordinate
     * @param {string} color - The color of the piece
     */
    showPiecePlacementUIForTile: {
        params: {
            q: 'number',
            r: 'number',
            color: 'string'
        }
    },
    
    /**
     * Toggle visibility of valid action placeholders
     * @param {boolean} visible - Whether placeholders should be visible
     */
    toggleValidActionPlaceholdersVisibility: {
        params: {
            visible: 'boolean'
        }
    },
    
    /**
     * Select a piece type
     * @param {string} pieceType - The type of piece to select
     */
    selectPieceType: {
        params: {
            pieceType: 'string'
        }
    },
    
    /**
     * Get the current board state
     */
    getBoardState: {
        params: {}
    },
    
    /**
     * Toggle dark mode
     * @param {boolean} enabled - Whether to enable dark mode
     */
    toggleDarkMode: {
        params: {
            enabled: 'boolean'
        }
    },
    
    /**
     * Update the background color
     * @param {string} type - The background type ('default', 'wood', 'stone', 'marble')
     */
    updateBackgroundColor: {
        params: {
            type: 'string'
        }
    },
    
    /**
     * Update board visualization settings
     * @param {Object} settings - Settings object with properties:
     *   - darkMode: boolean
     *   - backgroundColor: string
     *   - animationsEnabled: boolean
     *   - modelSettings: Object
     */
    updateBoardSettings: {
        params: {
            settings: 'object'
        }
    },
    
    /**
     * Reset the scene
     * @param {boolean} keepSettings - Whether to keep current settings
     */
    resetScene: {
        params: {
            keepSettings: 'boolean'
        }
    },
    
    /**
     * Get the current model settings
     */
    getModelSettings: {
        params: {}
    },
    
    /**
     * Update model settings
     * @param {Object} settings - Model settings object with properties:
     *   - theme: string
     *   - quality: string
     */
    updateModelSettings: {
        params: {
            settings: 'object'
        }
    },
    
    /**
     * Refresh models with current settings
     */
    refreshModels: {
        params: {}
    },
    
    /**
     * Get available model themes
     */
    getAvailableModelThemes: {
        params: {}
    },
    
    /**
     * Get available model quality levels
     */
    getAvailableModelQualities: {
        params: {}
    }
};

/**
 * Animation API methods
 */
export const AnimationAPI = {
    /**
     * Animate tile placement
     * @param {number} q - Q coordinate
     * @param {number} r - R coordinate
     * @param {string} color - Tile color
     */
    animateTilePlacement: {
        params: ['q', 'r', 'color'],
        description: 'Animate tile placement'
    },
    
    /**
     * Animate piece placement
     * @param {number} q - Q coordinate
     * @param {number} r - R coordinate
     * @param {string} color - Piece color
     * @param {string} type - Piece type
     */
    animatePiecePlacement: {
        params: ['q', 'r', 'color', 'type'],
        description: 'Animate piece placement'
    },
    
    /**
     * Animate piece movement
     * @param {number} fromQ - Starting Q coordinate
     * @param {number} fromR - Starting R coordinate
     * @param {number} toQ - Destination Q coordinate
     * @param {number} toR - Destination R coordinate
     */
    animatePieceMovement: {
        params: ['fromQ', 'fromR', 'toQ', 'toR'],
        description: 'Animate piece movement'
    },
    
    /**
     * Animate piece capture
     * @param {number} q - Q coordinate of the captured piece
     * @param {number} r - R coordinate of the captured piece
     */
    animatePieceCapture: {
        params: ['q', 'r'],
        description: 'Animate piece capture'
    },
    
    /**
     * Toggle whether animations are enabled
     * @param {boolean} enabled - Whether animations should be enabled
     */
    setAnimationsEnabled: {
        params: ['enabled'],
        description: 'Toggle whether animations are enabled'
    }
};

/**
 * Asset API Methods
 * 
 * These methods handle asset loading and configuration.
 */
export const AssetAPI = {
    /**
     * Get textures for game elements
     * @returns {Object} Object containing texture URLs
     */
    getTextures: {
        params: [],
        description: 'Get textures for game elements'
    }
};

/**
 * Model Configuration API Methods
 * 
 * These methods handle 3D model loading and configuration.
 */
export const ModelConfigAPI = {
    /**
     * Get the current model loading status
     * @returns {Object} Model loading status and configuration
     */
    getModelLoadingStatus: {
        params: [],
        description: 'Get the current model loading status'
    },
    
    /**
     * Retry loading failed models
     * @param {Array} models - Names of models to retry loading
     * @returns {Object} Updated loading status
     */
    retryModelLoading: {
        params: ['models'],
        description: 'Retry loading failed models'
    },
    
    /**
     * Configure model loading parameters
     * @param {Object} config - Configuration options
     * @returns {Object} Updated configuration
     */
    configureModelLoading: {
        params: ['config'],
        description: 'Configure model loading parameters'
    },
    
    /**
     * Get available model themes and qualities
     * @returns {Object} Available themes and qualities
     */
    getAvailableModelThemes: {
        params: [],
        description: 'Get available model themes and qualities'
    },
    
    /**
     * Set the current model theme
     * @param {Object} params - Theme parameters
     * @returns {Object} Result of the theme change
     */
    setModelTheme: {
        params: ['theme', 'quality'],
        description: 'Set the current model theme'
    }
};

// Combine all API methods into a single object
export const API = {
    ...GameStateAPI,
    ...BoardActionAPI,
    ...UIAPI,
    ...AnimationAPI,
    ...AssetAPI,
    ...ModelConfigAPI
}; 