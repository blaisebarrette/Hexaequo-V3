/**
 * Hexaequo - Main Application Entry Point
 * 
 * This is the root entry point for the Hexaequo game using the new modular architecture.
 * It initializes and connects all the modules developed during the implementation phases:
 * - Phase 1: Core API & Event System
 * - Phase 2: Game Logic Module
 * - Phase 3: Game Board Module
 * - Phase 4: Game Panel Module
 */

// Import core modules
import { eventBus } from './api/eventBus.js';
import { apiClient, apiServer } from './api/apiClient.js';

// Import and initialize game modules
import { initializeLogicModule } from './game-logic/logicModule.js';
import { initializeBoardModule } from './game-board/boardModule.js';
import { initializePanelModule } from './game-panel/panelModule.js';

// Application state
let isInitialized = false;
let gameContainer = null;
let boardRenderer = null;
let modelsLoaded = false;

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Hexaequo...');
    
    // Get main container
    gameContainer = document.querySelector('.game-container');
    if (!gameContainer) {
        console.error('Game container not found');
        return;
    }
    
    // Set viewport height for mobile browsers
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    
    try {
        // Initialize modules in correct order
        await initializeApplication();
        
        // Setup global error handling
        setupErrorHandling();
        
        // Subscribe to model loading event
        eventBus.subscribe('board:modelsLoaded', () => {
            console.log('3D models loaded successfully');
            modelsLoaded = true;
            // Load game or start new once models are loaded
            loadGameOrStartNew();
        });
        
        // Subscribe to setup complete event
        eventBus.subscribe('board:setupComplete', () => {
            console.log('Board setup complete');
            // If models weren't loaded via event, start game anyway after 5 seconds
            if (!modelsLoaded) {
                setTimeout(() => {
                    if (!modelsLoaded) {
                        console.warn('Timeout waiting for 3D models to load, proceeding anyway');
                        loadGameOrStartNew();
                    }
                }, 5000);
            }
        });
        
        console.log('Hexaequo initialization complete');
    } catch (error) {
        console.error('Failed to initialize Hexaequo:', error);
        showErrorMessage('Failed to initialize game. Please refresh the page.');
    }
});

/**
 * Initialize the application and all modules
 */
async function initializeApplication() {
    if (isInitialized) return;
    
    try {
        // 1. Initialize game logic module (handles game rules and state)
        initializeLogicModule();
        console.log('Game logic module initialized');
        
        // 2. Initialize game board module (handles 3D rendering and interactions)
        const boardInitialized = initializeBoardModule();
        if (!boardInitialized) {
            throw new Error('Failed to initialize board module');
        }
        console.log('Game board module initialized');
        
        // 3. Initialize game panel module (handles UI elements and controls)
        initializePanelModule();
        console.log('Game panel module initialized');
        
        // Check API status
        console.log('Checking API initialization:');
        checkAPIStatus();
        
        // Setup event listeners for module communication
        setupModuleCommunication();
        
        // Mark as initialized
        isInitialized = true;
    } catch (error) {
        console.error('Error during initialization:', error);
        throw new Error('Failed to initialize application modules');
    }
}

/**
 * Set viewport height for mobile browsers
 */
function setViewportHeight() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

/**
 * Setup error handling
 */
function setupErrorHandling() {
    // Listen for error events from all modules
    eventBus.subscribe('error', (data) => {
        console.error('Game error:', data.message, data.details || '');
        showErrorMessage(data.message);
    });
    
    // Global error handler
    window.addEventListener('error', (event) => {
        console.error('Unhandled error:', event.error);
        eventBus.publish('error', {
            message: 'An unexpected error occurred',
            details: event.error?.message || ''
        });
    });
}

/**
 * Show error message to user
 * @param {string} message Error message
 */
function showErrorMessage(message) {
    // Use the UI modal if available
    eventBus.publish('ui:showModal', {
        modal: 'notification',
        message: `Error: ${message}`
    });
}

/**
 * Load saved game or start a new one
 */
async function loadGameOrStartNew() {
    try {
        // Check if there's a saved game directly from localStorage
        const hasSavedGame = sessionStorage.getItem('hexaequo_game_state') !== null;
        
        if (hasSavedGame) {
            // Show confirmation dialog
            eventBus.publish('ui:showModal', {
                modal: 'confirmation',
                message: 'Would you like to load your saved game?',
                onConfirm: loadSavedGame,
                onCancel: startNewGame
            });
        } else {
            // Start a new game
            await startNewGame();
        }
    } catch (error) {
        console.error('Error checking for saved game:', error);
        await startNewGame();
    }
}

/**
 * Load saved game
 */
async function loadSavedGame() {
    // If models aren't loaded yet, wait a bit
    if (!modelsLoaded) {
        console.log('Waiting for 3D models to load before continuing...');
        
        // Create a promise that resolves when models are loaded or after timeout
        await new Promise(resolve => {
            // Set up a one-time event listener for model loading
            const modelLoadedListener = () => {
                clearTimeout(timeoutId);
                resolve();
            };
            
            // Set up a timeout in case models never load
            const timeoutId = setTimeout(() => {
                eventBus.unsubscribe('board:modelsLoaded', modelLoadedListener);
                console.warn('Timeout waiting for models to load, proceeding anyway');
                resolve();
            }, 5000);
            
            // Listen for the model loaded event
            eventBus.subscribe('board:modelsLoaded', modelLoadedListener);
            
            // If models are already loaded, resolve immediately
            if (modelsLoaded) {
                clearTimeout(timeoutId);
                resolve();
            }
        });
    }
    
    try {
        // Get saved state from sessionStorage
        const savedState = sessionStorage.getItem('hexaequo_game_state');
        
        if (!savedState) {
            console.error('No saved game found');
            await startNewGame();
            return;
        }
        
        // Parse the saved state
        const state = JSON.parse(savedState);
        
        // Load the game with the saved state
        const result = await apiClient.request('loadGame', { state });
        
        // Check if the response is successful or contains valid game state
        if (!result || (result.success === false)) {
            console.error('Failed to load game:', result?.error || 'Unknown error');
            await startNewGame();
        } else {
            console.log('Game loaded successfully');
            
            // Extract game state - either directly or from state property
            const gameState = result.state || result;
            
            // Publish game state changed event
            eventBus.publish('game:stateChanged', {
                type: 'loaded',
                state: gameState
            });
        }
    } catch (error) {
        console.error('Error loading game:', error);
        await startNewGame();
    }
}

/**
 * Start a new game
 */
async function startNewGame() {
    // If models aren't loaded yet, wait a bit
    if (!modelsLoaded) {
        console.log('Waiting for 3D models to load before starting new game...');
        
        // Create a promise that resolves when models are loaded or after timeout
        await new Promise(resolve => {
            // Set up a one-time event listener for model loading
            const modelLoadedListener = () => {
                clearTimeout(timeoutId);
                resolve();
            };
            
            // Set up a timeout in case models never load
            const timeoutId = setTimeout(() => {
                eventBus.unsubscribe('board:modelsLoaded', modelLoadedListener);
                console.warn('Timeout waiting for models to load, proceeding anyway');
                resolve();
            }, 5000);
            
            // Listen for the model loaded event
            eventBus.subscribe('board:modelsLoaded', modelLoadedListener);
            
            // If models are already loaded, resolve immediately
            if (modelsLoaded) {
                clearTimeout(timeoutId);
                resolve();
            }
        });
    }
    
    try {
        console.log('Starting new game...');
        
        // Log before making the request
        console.log('About to send startNewGame request');
        
        const result = await apiClient.request('startNewGame');
        
        // Log the response
        console.log('startNewGame response:', result);
        
        // Check if the response is successful or contains valid game state
        if (!result || (result.success === false)) {
            console.error('Failed to start new game:', result?.error || 'Unknown error');
            showErrorMessage('Failed to start new game: ' + (result?.error || 'Unknown error'));
        } else {
            console.log('New game started successfully');
            
            // Extract game state - either directly or from state property
            const gameState = result.state || result;
            
            // Detailed logging of board state
            console.log('Game state structure:', {
                hasBoard: !!gameState.board,
                hasTiles: !!(gameState.board && gameState.board.tiles),
                tileCount: gameState.board?.tiles?.length || 0,
                pieceCount: gameState.board?.pieces?.length || 0
            });
            
            if (gameState.board?.tiles?.length > 0) {
                console.log('First tile:', gameState.board.tiles[0]);
            }
            
            if (gameState.board?.pieces?.length > 0) {
                console.log('First piece:', gameState.board.pieces[0]);
            }
            
            // Publish game state changed event
            eventBus.publish('game:stateChanged', {
                type: 'new_game',
                state: gameState
            });
        }
    } catch (error) {
        console.error('Error starting new game:', error);
        showErrorMessage('Failed to start new game: ' + (error.message || 'Unknown error'));
    }
}

/**
 * Check the API initialization status
 */
function checkAPIStatus() {
    console.log('Checking API status...');
    
    // Check if API handlers are registered
    if (apiServer && apiServer.handlers) {
        console.log('API handlers registered:', Array.from(apiServer.handlers.keys()));
    } else {
        console.log('No API handlers registered');
    }
    
    // Check event subscriptions
    console.log('Event subscriptions:', eventBus.subscribers);
    
    return {
        apiHandlers: apiServer ? Array.from(apiServer.handlers.keys()) : [],
        eventSubscriptions: eventBus.subscribers ? Array.from(eventBus.subscribers.keys()) : []
    };
}

/**
 * Setup communication between modules
 * All module interaction must go through the API or event bus
 */
function setupModuleCommunication() {
    // Subscribe to the board module initialization event
    eventBus.subscribe('board:initialized', (data) => {
        console.log('Board module initialization completed:', data);
    });
    
    // Subscribe to model loading events
    eventBus.subscribe('board:modelsLoaded', (data) => {
        console.log('3D models loaded successfully:', data);
        modelsLoaded = true;
        
        // Load game or start new once models are loaded
        loadGameOrStartNew();
    });
}

// Export for debugging
// WARNING: This export bypasses the modular architecture and should only be used for debugging
// It should be removed or disabled in production builds
window.debugHexaequo = {
    eventBus,
    apiClient,
    apiServer,
    isInitialized,
    
    // Use API-based methods instead of direct access
    debug: {
        startNewGame: () => apiClient.request('startNewGame'),
        loadSavedGame: () => {
            const savedState = sessionStorage.getItem('hexaequo_game_state');
            if (savedState) {
                return apiClient.request('loadGame', { state: JSON.parse(savedState) });
            }
            return Promise.reject(new Error('No saved game found'));
        },
        checkAPIStatus
    }
}; 