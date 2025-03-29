/**
 * Panel Module - Main entry point for the game panel UI
 * 
 * This module serves as the central point for UI-related functionality,
 * connecting UI elements to the API and managing user interactions.
 */
import { eventBus } from '../api/eventBus.js';
import { apiClient } from '../api/apiClient.js';
import { PlayerInfo } from './components/playerInfo.js';
import { PieceInventory } from './components/pieceInventory.js';
import { ActionButtons } from './components/actionButtons.js';
import { ModalManager } from './components/modalManager.js';
import { SettingsModal } from './components/settingsModal.js';

// Panel components
let playerInfo = null;
let pieceInventory = null;
let actionButtons = null;
let modalManager = null;
let settingsModal = null;

// Settings
let settings = {
    darkMode: true,
    animations: true,
    sound: true
};

/**
 * Initialize the panel module
 * @param {Object} config - Configuration object
 */
export function initializePanelModule(config = {}) {
    console.log('Initializing Panel Module');
    
    // Get containers
    const panelContainer = document.getElementById('game-panel');
    const playerInfoContainer = document.getElementById('player-info');
    const pieceInventoryContainer = document.getElementById('piece-inventory');
    const actionButtonsContainer = document.getElementById('action-buttons');
    const modalContainer = document.getElementById('modal-container');
    
    // Initialize components
    playerInfo = new PlayerInfo(playerInfoContainer);
    pieceInventory = new PieceInventory(pieceInventoryContainer);
    actionButtons = new ActionButtons(actionButtonsContainer);
    modalManager = new ModalManager(modalContainer);
    settingsModal = new SettingsModal(modalContainer);
    
    // Setup event listeners
    setupEventListeners();
    
    // Set up callback functions
    setupCallbacks();
    
    // Load settings
    loadSettings();
    
    // Request initial game state
    requestGameState();
    
    console.log('Panel Module initialized');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Game state events
    eventBus.subscribe('game:stateChanged', handleGameStateChanged);
    
    // Action events
    eventBus.subscribe('action:started', handleActionStarted);
    eventBus.subscribe('action:completed', handleActionCompleted);
    eventBus.subscribe('action:cancelled', handleActionCancelled);
    
    // Error events
    eventBus.subscribe('error:occurred', handleError);
    
    // Settings events
    eventBus.subscribe('settings:loaded', handleSettingsLoaded);
    eventBus.subscribe('settings:changed', handleSettingsChanged);
}

/**
 * Setup callbacks for UI components
 */
function setupCallbacks() {
    // Set up action buttons callbacks
    if (actionButtons) {
        actionButtons.onActionSelected = handleActionSelected;
        actionButtons.onEndTurnClicked = handleEndTurnClicked;
        actionButtons.onNewGameClicked = handleNewGameClicked;
    }
    
    // Set up piece inventory callbacks
    if (pieceInventory) {
        pieceInventory.onPieceSelected = handlePieceSelected;
    }
}

/**
 * Request the current game state
 */
async function requestGameState() {
    try {
        const response = await apiClient.request('getGameState');
        if (response.success) {
            handleGameStateChanged(response.data);
        }
    } catch (error) {
        console.error('Error fetching game state:', error);
        showError('Failed to load game state');
    }
}

/**
 * Handle game state changed event
 * @param {Object} state - Game state
 */
function handleGameStateChanged(state) {
    // Update all components with new state
    if (playerInfo) {
        playerInfo.update(state);
    }
    
    if (pieceInventory) {
        pieceInventory.update(state);
    }
    
    if (actionButtons) {
        actionButtons.update(state);
    }
    
    // Apply theme based on settings
    applyTheme();
}

/**
 * Handle action started event
 * @param {Object} data - Action data
 */
function handleActionStarted(data) {
    const { action, player } = data;
    
    // Update UI components based on action
    if (pieceInventory) {
        pieceInventory.highlightAvailablePieces(action, player);
    }
    
    if (actionButtons) {
        actionButtons.setActiveAction(action);
    }
}

/**
 * Handle action completed event
 */
function handleActionCompleted() {
    // Clear any highlights or selections
    if (pieceInventory) {
        pieceInventory.clearHighlights();
    }
    
    if (actionButtons) {
        actionButtons.clearActiveAction();
    }
}

/**
 * Handle action cancelled event
 */
function handleActionCancelled() {
    // Clear any highlights or selections
    if (pieceInventory) {
        pieceInventory.clearHighlights();
    }
    
    if (actionButtons) {
        actionButtons.clearActiveAction();
    }
}

/**
 * Handle error event
 * @param {Object} data - Error data
 */
function handleError(data) {
    const { message } = data;
    showError(message);
}

/**
 * Handle settings loaded event
 * @param {Object} loadedSettings - Settings object
 */
function handleSettingsLoaded(loadedSettings) {
    settings = loadedSettings;
    applyTheme();
}

/**
 * Handle settings changed event
 * @param {Object} changedSettings - Settings object
 */
function handleSettingsChanged(changedSettings) {
    settings = changedSettings;
    applyTheme();
}

/**
 * Handle action selected
 * @param {string} action - Selected action
 */
async function handleActionSelected(action) {
    try {
        // Start the selected action
        const response = await apiClient.request('startAction', { action });
        
        if (!response.success) {
            showError(response.message || 'Failed to start action');
        }
    } catch (error) {
        console.error('Error starting action:', error);
        showError('Failed to start action');
    }
}

/**
 * Handle piece selected
 * @param {string} pieceType - Type of piece selected
 * @param {string} pieceColor - Color of piece selected
 */
function handlePieceSelected(pieceType, pieceColor) {
    // Publish event for piece selected
    eventBus.publish('ui:pieceSelected', { 
        pieceType,
        pieceColor
    });
}

/**
 * Handle end turn clicked
 */
async function handleEndTurnClicked() {
    try {
        const response = await apiClient.request('endTurn');
        
        if (!response.success) {
            showError(response.message || 'Failed to end turn');
        }
    } catch (error) {
        console.error('Error ending turn:', error);
        showError('Failed to end turn');
    }
}

/**
 * Handle new game clicked
 */
function handleNewGameClicked() {
    // Show confirmation dialog
    showConfirmation(
        'Are you sure you want to start a new game?',
        startNewGame
    );
}

/**
 * Start a new game
 */
async function startNewGame() {
    try {
        const response = await apiClient.request('startNewGame');
        
        if (!response.success) {
            showError(response.message || 'Failed to start new game');
        } else {
            showNotification('New game started');
        }
    } catch (error) {
        console.error('Error starting new game:', error);
        showError('Failed to start new game');
    }
}

/**
 * Apply theme based on settings
 */
function applyTheme() {
    // Get root element
    const root = document.documentElement;
    
    // Apply dark mode
    if (settings.darkMode) {
        root.classList.add('dark-mode');
    } else {
        root.classList.remove('dark-mode');
    }
    
    // Apply animations
    if (settings.animations) {
        root.classList.add('animations-enabled');
    } else {
        root.classList.remove('animations-enabled');
    }
}

/**
 * Show notification
 * @param {string} message - Notification message
 */
function showNotification(message) {
    eventBus.publish('ui:showModal', {
        modal: 'notification',
        message
    });
}

/**
 * Show error
 * @param {string} message - Error message
 */
function showError(message) {
    console.error('Error:', message);
    
    eventBus.publish('ui:showModal', {
        modal: 'notification',
        message: `Error: ${message}`
    });
}

/**
 * Show confirmation
 * @param {string} message - Confirmation message
 * @param {Function} onConfirm - Callback when confirmed
 * @param {Function} onCancel - Callback when cancelled
 */
function showConfirmation(message, onConfirm, onCancel) {
    eventBus.publish('ui:showModal', {
        modal: 'confirmation',
        message,
        onConfirm,
        onCancel
    });
}

/**
 * Save settings
 * @param {Object} newSettings - Settings to save
 */
function saveSettings(newSettings) {
    try {
        localStorage.setItem('hexaequo_settings', JSON.stringify(newSettings));
        settings = newSettings;
        
        // Publish settings changed event
        eventBus.publish('settings:changed', settings);
        
        // Show success notification
        showNotification('Settings saved successfully');
    } catch (error) {
        console.error('Failed to save settings:', error);
        showError('Failed to save settings');
    }
}

/**
 * Load settings
 */
function loadSettings() {
    try {
        // Get settings from local storage
        const storedSettings = localStorage.getItem('hexaequo_settings');
        if (storedSettings) {
            settings = JSON.parse(storedSettings);
        } else {
            // Use default settings
            settings = getDefaultSettings();
        }
        
        // Publish settings loaded event
        eventBus.publish('settings:loaded', settings);
    } catch (error) {
        console.error('Failed to load settings:', error);
        settings = getDefaultSettings();
    }
}

/**
 * Get default settings
 * @returns {Object} Default settings
 */
function getDefaultSettings() {
    return {
        darkMode: true,
        animations: true,
        sound: true
    };
}

// Export the initialize function
export default {
    initializePanelModule
}; 