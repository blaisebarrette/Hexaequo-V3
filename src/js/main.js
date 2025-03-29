/**
 * Hexaequo - Main Application Entry Point
 * 
 * This is the main entry point for the Hexaequo game. It initializes
 * all game components using the new API-driven architecture.
 */
import * as THREE from 'three';

// Import API modules
import { apiClient } from '../api/apiClient.js';
import { eventBus } from '../api/eventBus.js';
import { initializeAPIServer } from '../api/apiServer.js';
import { initializeLogicModule } from '../game-logic/logicModule.js';
import { initializeBoardModule } from '../game-board/boardModule.js';
import { initializePanelModule } from '../game-panel/panelModule.js';
import { ThreeRenderer } from '../game-board/rendering/threeRenderer.js';

// Import legacy modules (these will be refactored in Phase 4)
import UIManager from './ui/uiManager.js';
import { StorageManager } from './utils/storageManager.js';

// Global variables
let gameContainer;
let threeRenderer;
let boardModule;
let uiManager;
let storageManager;
let gameRunning = false;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Hexaequo...');
    
    // Get game container
    gameContainer = document.getElementById('game-container');
    
    // Set up viewport height adjustment
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    
    // Initialize API client
    await initializeAPIClient();
    
    // Initialize API components
    initializeAPIServer();
    
    // Initialize game components
    initializeComponents();
    
    // Initialize event listeners
    setupEventListeners();
    
    // Load game or start new
    await loadGameOrStartNew();
});

/**
 * Set viewport height for mobile browsers
 */
function setViewportHeight() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

/**
 * Initialize the API client
 */
async function initializeAPIClient() {
    try {
        // Initialize game logic module (which sets up API handlers)
        initializeLogicModule();
        console.log('Game logic module initialized');
    } catch (error) {
        console.error('Failed to initialize API client:', error);
    }
}

/**
 * Initialize game components
 */
function initializeComponents() {
    // Initialize 3D renderer
    threeRenderer = new ThreeRenderer(gameContainer);
    console.log('3D renderer initialized');
    
    // Initialize board module
    boardModule = initializeBoardModule();
    console.log('Board module initialized');
    
    // Initialize UI manager
    uiManager = new UIManager();
    console.log('UI manager initialized');
    
    // Initialize storage manager
    storageManager = new StorageManager();
    console.log('Storage manager initialized');
    
    // Initialize game panel module
    initializePanelModule();
    
    // Connect legacy components to the new API
    connectLegacyComponents();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Set up game state change listener
    eventBus.subscribe('game:stateChanged', (data) => {
        console.log('Game state changed:', data);
        
        // Update game running flag
        if (data.type === 'new_game' || data.type === 'loaded') {
            gameRunning = true;
        } else if (data.type === 'game_over') {
            gameRunning = false;
        }
    });
    
    // Set up error handler
    eventBus.subscribe('error', (data) => {
        console.error('Game error:', data.message, data.details);
        uiManager.showError(data.message);
    });
    
    // Setup storage events
    setupStorageEvents();
}

/**
 * Setup storage-related event listeners
 */
function setupStorageEvents() {
    // Listen for save requests
    eventBus.subscribe('storage:saveGame', async () => {
        try {
            const result = await apiClient.callAPI('saveGame', {});
            if (result.success) {
                uiManager.showNotification('Game saved');
            } else {
                uiManager.showError('Failed to save game');
            }
        } catch (error) {
            console.error('Error saving game:', error);
            uiManager.showError('Failed to save game');
        }
    });
    
    // Listen for load requests
    eventBus.subscribe('storage:loadGame', async () => {
        try {
            const result = await apiClient.callAPI('loadGame', {});
            if (result.success) {
                uiManager.showNotification('Game loaded');
            } else {
                uiManager.showError('Failed to load game');
            }
        } catch (error) {
            console.error('Error loading game:', error);
            uiManager.showError('Failed to load game');
        }
    });
}

/**
 * Load saved game or start a new one
 */
async function loadGameOrStartNew() {
    try {
        // Check if there's a saved game
        const hasSavedGame = await storageManager.hasSavedGame();
        
        if (hasSavedGame) {
            // Ask user if they want to load the saved game
            const shouldLoad = await uiManager.showConfirmation(
                'Load saved game?',
                'Would you like to load your saved game?'
            );
            
            if (shouldLoad) {
                // Load saved game
                const loadResult = await apiClient.callAPI('loadGame', {});
                
                if (loadResult.success) {
                    uiManager.showNotification('Game loaded');
                    return;
                } else {
                    uiManager.showError('Failed to load saved game');
                }
            }
        }
        
        // Start a new game
        const startResult = await apiClient.callAPI('startNewGame', {});
        
        if (!startResult.success) {
            uiManager.showError('Failed to start new game');
        }
    } catch (error) {
        console.error('Error loading or starting game:', error);
        uiManager.showError('Failed to initialize game');
    }
}

/**
 * Connect legacy components to the new API
 * 
 * This is a temporary adapter that will be removed in Phase 4
 * when all components are fully refactored to use the API.
 */
function connectLegacyComponents() {
    // Update legacy components on state changes
    eventBus.subscribe('game:stateChanged', (data) => {
        // Update UI with game state
        uiManager.updateUI(data);
    });
    
    // Forward game board input to API
    uiManager.onUserAction = (action, data) => {
        switch (action) {
            case 'placeTile':
                boardModule.startPlaceTileAction();
                break;
                
            case 'placePiece':
                boardModule.startPlacePieceAction(data.pieceType);
                break;
                
            case 'movePiece':
                boardModule.startMovePieceAction();
                break;
                
            case 'endTurn':
                apiClient.callAPI('endTurn', {});
                break;
                
            case 'newGame':
                apiClient.callAPI('startNewGame', {});
                break;
                
            case 'saveGame':
                eventBus.publish('storage:saveGame');
                break;
                
            case 'loadGame':
                eventBus.publish('storage:loadGame');
                break;
        }
    };
}

// Export for debugging
window.debugGame = {
    apiClient,
    eventBus,
    boardModule,
    threeRenderer,
    uiManager,
    storageManager
}; 