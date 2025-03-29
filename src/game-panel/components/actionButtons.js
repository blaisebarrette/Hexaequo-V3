/**
 * ActionButtons - Component for game control buttons
 * 
 * This component handles the action buttons for game control,
 * such as placing tiles, pieces, moving pieces, and other game actions.
 */
import { eventBus } from '../../api/eventBus.js';

/**
 * ActionButtons class
 */
export class ActionButtons {
    /**
     * Constructor
     * @param {HTMLElement} container - The container element for this component
     */
    constructor(container) {
        this.container = container;
        
        if (!this.container) {
            console.error('Action buttons container not found');
            return;
        }
        
        // Initialize state
        this.gameStatus = 'waiting';
        this.currentPlayer = null;
        this.activeAction = null;
        
        // Callback functions - to be set by parent
        this.onActionSelected = null;
        this.onEndTurnClicked = null;
        this.onNewGameClicked = null;
        
        // Create elements
        this.createElements();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    /**
     * Create button elements
     */
    createElements() {
        // Clear container
        this.container.innerHTML = '';
        
        // Create button container
        this.buttonsContainer = document.createElement('div');
        this.buttonsContainer.className = 'action-buttons-container';
        this.container.appendChild(this.buttonsContainer);
        
        // Game action buttons
        this.actionButtons = document.createElement('div');
        this.actionButtons.className = 'game-action-buttons';
        this.buttonsContainer.appendChild(this.actionButtons);
        
        // Place tile button
        this.placeTileButton = document.createElement('button');
        this.placeTileButton.className = 'action-button place-tile';
        this.placeTileButton.textContent = 'Place Tile';
        this.placeTileButton.addEventListener('click', () => this.handleActionButtonClick('placeTile'));
        this.actionButtons.appendChild(this.placeTileButton);
        
        // Place piece button
        this.placePieceButton = document.createElement('button');
        this.placePieceButton.className = 'action-button place-piece';
        this.placePieceButton.textContent = 'Place Piece';
        this.placePieceButton.addEventListener('click', () => this.handleActionButtonClick('placePiece'));
        this.actionButtons.appendChild(this.placePieceButton);
        
        // Move piece button
        this.movePieceButton = document.createElement('button');
        this.movePieceButton.className = 'action-button move-piece';
        this.movePieceButton.textContent = 'Move Piece';
        this.movePieceButton.addEventListener('click', () => this.handleActionButtonClick('movePiece'));
        this.actionButtons.appendChild(this.movePieceButton);
        
        // End turn button
        this.endTurnButton = document.createElement('button');
        this.endTurnButton.className = 'action-button end-turn';
        this.endTurnButton.textContent = 'End Turn';
        this.endTurnButton.addEventListener('click', () => this.handleEndTurnClick());
        this.actionButtons.appendChild(this.endTurnButton);
        
        // Game control buttons
        this.controlButtons = document.createElement('div');
        this.controlButtons.className = 'game-control-buttons';
        this.buttonsContainer.appendChild(this.controlButtons);
        
        // New game button
        this.newGameButton = document.createElement('button');
        this.newGameButton.className = 'control-button new-game';
        this.newGameButton.textContent = 'New Game';
        this.newGameButton.addEventListener('click', () => this.handleNewGameClick());
        this.controlButtons.appendChild(this.newGameButton);
        
        // Settings button
        this.settingsButton = document.createElement('button');
        this.settingsButton.className = 'control-button settings';
        this.settingsButton.textContent = 'Settings';
        this.settingsButton.addEventListener('click', () => this.handleSettingsClick());
        this.controlButtons.appendChild(this.settingsButton);
        
        // Rules button
        this.rulesButton = document.createElement('button');
        this.rulesButton.className = 'control-button rules';
        this.rulesButton.textContent = 'Rules';
        this.rulesButton.addEventListener('click', () => this.handleRulesClick());
        this.controlButtons.appendChild(this.rulesButton);
        
        // Update button state
        this.updateButtonState();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for game state changes
        eventBus.subscribe('game:stateChanged', (data) => {
            if (data.currentPlayer !== undefined) {
                this.currentPlayer = data.currentPlayer;
            }
            
            if (data.gameStatus !== undefined) {
                this.gameStatus = data.gameStatus;
            }
            
            this.updateButtonState();
        });
        
        // Listen for action events
        eventBus.subscribe('action:started', (data) => {
            this.setActiveAction(data.action);
        });
        
        eventBus.subscribe('action:completed', () => {
            this.clearActiveAction();
        });
        
        eventBus.subscribe('action:cancelled', () => {
            this.clearActiveAction();
        });
    }
    
    /**
     * Update the component with new state data
     * @param {Object} state - Game state data
     */
    update(state) {
        if (!state) return;
        
        if (state.currentPlayer !== undefined) {
            this.currentPlayer = state.currentPlayer;
        }
        
        if (state.gameStatus !== undefined) {
            this.gameStatus = state.gameStatus;
        }
        
        this.updateButtonState();
    }
    
    /**
     * Update button state based on game state
     */
    updateButtonState() {
        const isGameInProgress = this.gameStatus === 'ongoing';
        
        // Enable/disable action buttons based on game state
        this.placeTileButton.disabled = !isGameInProgress;
        this.placePieceButton.disabled = !isGameInProgress;
        this.movePieceButton.disabled = !isGameInProgress;
        this.endTurnButton.disabled = !isGameInProgress;
        
        // Add/remove active class for action buttons
        this.placeTileButton.classList.toggle('active', this.activeAction === 'placeTile');
        this.placePieceButton.classList.toggle('active', this.activeAction === 'placePiece');
        this.movePieceButton.classList.toggle('active', this.activeAction === 'movePiece');
        
        // Add current player class to action buttons
        if (this.currentPlayer) {
            // Remove all player classes
            this.actionButtons.classList.remove('player-black', 'player-white');
            // Add current player class
            this.actionButtons.classList.add(`player-${this.currentPlayer}`);
        }
    }
    
    /**
     * Handle action button click
     * @param {string} action - Action type
     */
    handleActionButtonClick(action) {
        // If action is already active, cancel it
        if (this.activeAction === action) {
            this.handleCancelAction();
            return;
        }
        
        // Call the action callback
        if (this.onActionSelected) {
            this.onActionSelected(action);
        }
    }
    
    /**
     * Handle end turn button click
     */
    handleEndTurnClick() {
        // First cancel any active action
        if (this.activeAction) {
            this.handleCancelAction();
        }
        
        // Call the end turn callback
        if (this.onEndTurnClicked) {
            this.onEndTurnClicked();
        }
    }
    
    /**
     * Handle new game button click
     */
    handleNewGameClick() {
        // First cancel any active action
        if (this.activeAction) {
            this.handleCancelAction();
        }
        
        // Call the new game callback
        if (this.onNewGameClicked) {
            this.onNewGameClicked();
        }
    }
    
    /**
     * Handle settings button click
     */
    handleSettingsClick() {
        // Show settings modal
        eventBus.publish('ui:showModal', { 
            modal: 'settings'
        });
    }
    
    /**
     * Handle rules button click
     */
    handleRulesClick() {
        // Show rules modal
        eventBus.publish('ui:showModal', { 
            modal: 'rules'
        });
    }
    
    /**
     * Handle cancel action
     */
    handleCancelAction() {
        // Cancel current action
        eventBus.publish('ui:cancelAction');
        
        // Clear active action
        this.clearActiveAction();
    }
    
    /**
     * Set active action
     * @param {string} action - Action type
     */
    setActiveAction(action) {
        this.activeAction = action;
        this.updateButtonState();
    }
    
    /**
     * Clear active action
     */
    clearActiveAction() {
        this.activeAction = null;
        this.updateButtonState();
    }
    
    /**
     * Enable or disable a specific button
     * @param {string} buttonType - Button type ('placeTile', 'placePiece', 'movePiece', 'endTurn')
     * @param {boolean} enabled - Whether the button should be enabled
     */
    setButtonEnabled(buttonType, enabled) {
        const buttonMap = {
            'placeTile': this.placeTileButton,
            'placePiece': this.placePieceButton,
            'movePiece': this.movePieceButton,
            'endTurn': this.endTurnButton,
            'newGame': this.newGameButton
        };
        
        const button = buttonMap[buttonType];
        if (button) {
            button.disabled = !enabled;
        }
    }
} 