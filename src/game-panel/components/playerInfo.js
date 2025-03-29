/**
 * PlayerInfo - Component for displaying player information and game status
 * 
 * This component handles the display of the current player, game status,
 * and other game state information.
 */
import { eventBus } from '../../api/eventBus.js';

/**
 * PlayerInfo class
 */
export class PlayerInfo {
    /**
     * Constructor
     * @param {HTMLElement} container - The container element for this component
     */
    constructor(container) {
        this.container = container;
        
        if (!this.container) {
            console.error('Player info container not found');
            return;
        }
        
        // Create elements
        this.createElements();
        
        // Initialize with empty state
        this.currentPlayer = null;
        this.gameStatus = 'waiting';
        this.drawReason = null;
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    /**
     * Create the component elements
     */
    createElements() {
        // Clear container
        this.container.innerHTML = '';
        
        // Create status element
        this.statusElement = document.createElement('div');
        this.statusElement.className = 'game-status';
        this.container.appendChild(this.statusElement);
        
        // Create current player indicator
        this.playerIndicator = document.createElement('div');
        this.playerIndicator.className = 'player-indicator';
        this.container.appendChild(this.playerIndicator);
        
        // Create additional info area
        this.infoElement = document.createElement('div');
        this.infoElement.className = 'game-info';
        this.container.appendChild(this.infoElement);
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
                this.drawReason = data.drawReason;
            }
            
            this.render();
        });
    }
    
    /**
     * Update the component with new state data
     * @param {Object} state - Game state data
     */
    update(state) {
        if (!state) return;
        
        // Update state properties
        if (state.currentPlayer !== undefined) {
            this.currentPlayer = state.currentPlayer;
        }
        
        if (state.gameStatus !== undefined) {
            this.gameStatus = state.gameStatus;
            this.drawReason = state.drawReason;
        }
        
        // Re-render the component
        this.render();
    }
    
    /**
     * Render the component based on current state
     */
    render() {
        // Update status text
        let statusText = '';
        let statusClass = '';
        
        switch (this.gameStatus) {
            case 'waiting':
                statusText = 'Waiting for game to start...';
                statusClass = 'status-waiting';
                break;
                
            case 'ongoing':
                statusText = `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)}'s Turn`;
                statusClass = `status-player-${this.currentPlayer}`;
                break;
                
            case 'white_win':
                statusText = 'Game Over - White Wins!';
                statusClass = 'status-game-over status-white-win';
                break;
                
            case 'black_win':
                statusText = 'Game Over - Black Wins!';
                statusClass = 'status-game-over status-black-win';
                break;
                
            case 'draw':
                statusText = 'Game Over - Draw';
                statusClass = 'status-game-over status-draw';
                break;
                
            default:
                statusText = 'Unknown game state';
                statusClass = 'status-unknown';
        }
        
        // Set status text and class
        this.statusElement.textContent = statusText;
        
        // Remove all status classes and add the current one
        this.statusElement.className = 'game-status ' + statusClass;
        
        // Update player indicator
        if (this.gameStatus === 'ongoing') {
            this.playerIndicator.className = `player-indicator player-${this.currentPlayer}`;
            this.playerIndicator.style.display = 'block';
        } else {
            this.playerIndicator.style.display = 'none';
        }
        
        // Update additional info
        if (this.gameStatus === 'draw' && this.drawReason) {
            let reasonText = '';
            
            switch (this.drawReason) {
                case 'repetition':
                    reasonText = 'Position repeated three times';
                    break;
                    
                case 'no_valid_moves':
                    reasonText = 'No valid moves available';
                    break;
                    
                default:
                    reasonText = this.drawReason;
            }
            
            this.infoElement.textContent = `Reason: ${reasonText}`;
            this.infoElement.style.display = 'block';
        } else {
            this.infoElement.style.display = 'none';
        }
    }
    
    /**
     * Get current player
     * @returns {string} - Current player ('black' or 'white')
     */
    getCurrentPlayer() {
        return this.currentPlayer;
    }
    
    /**
     * Get game status
     * @returns {string} - Game status ('waiting', 'ongoing', 'white_win', 'black_win', 'draw')
     */
    getGameStatus() {
        return this.gameStatus;
    }
} 