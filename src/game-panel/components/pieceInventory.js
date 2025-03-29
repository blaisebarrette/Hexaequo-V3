/**
 * PieceInventory - Component for displaying and managing available game pieces
 * 
 * This component handles displaying the available pieces for each player,
 * piece selection, and piece inventory management.
 */
import { eventBus } from '../../api/eventBus.js';

/**
 * PieceInventory class
 */
export class PieceInventory {
    /**
     * Constructor
     * @param {HTMLElement} container - The container element for this component
     */
    constructor(container) {
        this.container = container;
        
        if (!this.container) {
            console.error('Piece inventory container not found');
            return;
        }
        
        // Initialize state
        this.pieces = {
            black: {
                tiles: { available: 9, total: 9 },
                discs: { available: 6, total: 6, captured: 0 },
                rings: { available: 3, total: 3, captured: 0 }
            },
            white: {
                tiles: { available: 9, total: 9 },
                discs: { available: 6, total: 6, captured: 0 },
                rings: { available: 3, total: 3, captured: 0 }
            }
        };
        
        this.selectedPieceType = null;
        this.currentPlayer = null;
        
        // Callback for piece selection - to be set by parent
        this.onPieceSelected = null;
        
        // Create elements
        this.createElements();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    /**
     * Create inventory elements
     */
    createElements() {
        // Clear container
        this.container.innerHTML = '';
        
        // Create inventory container for each player
        this.playerInventories = {};
        
        // Piece types to display
        const pieceTypes = ['tiles', 'discs', 'rings'];
        
        for (const player of ['black', 'white']) {
            // Create player inventory container
            const playerInventory = document.createElement('div');
            playerInventory.className = `player-inventory player-${player}`;
            this.container.appendChild(playerInventory);
            
            // Create player label
            const playerLabel = document.createElement('h3');
            playerLabel.textContent = `${player.charAt(0).toUpperCase() + player.slice(1)} pieces`;
            playerInventory.appendChild(playerLabel);
            
            // Create piece containers
            const piecesContainer = document.createElement('div');
            piecesContainer.className = 'pieces-container';
            playerInventory.appendChild(piecesContainer);
            
            // Store piece elements for easy access
            const pieceElements = {};
            
            // Create elements for each piece type
            for (const pieceType of pieceTypes) {
                const pieceContainer = document.createElement('div');
                pieceContainer.className = `piece-container piece-${pieceType}`;
                piecesContainer.appendChild(pieceContainer);
                
                // Piece icon/visual
                const pieceIcon = document.createElement('div');
                pieceIcon.className = `piece-icon ${pieceType} ${player}`;
                pieceContainer.appendChild(pieceIcon);
                
                // Create counter for available pieces
                const availableCounter = document.createElement('span');
                availableCounter.className = 'piece-counter available';
                pieceContainer.appendChild(availableCounter);
                
                // Create counter for captured pieces
                if (pieceType !== 'tiles') {
                    const capturedCounter = document.createElement('span');
                    capturedCounter.className = 'piece-counter captured';
                    capturedCounter.innerHTML = '<small>(Captured: <span class="value">0</span>)</small>';
                    pieceContainer.appendChild(capturedCounter);
                }
                
                // Add click handler for piece selection
                pieceContainer.addEventListener('click', () => {
                    if (player === this.currentPlayer && this.pieces[player][pieceType].available > 0) {
                        this.selectPieceType(pieceType);
                    }
                });
                
                // Store reference to elements
                pieceElements[pieceType] = {
                    container: pieceContainer,
                    icon: pieceIcon,
                    availableCounter: availableCounter.querySelector('.value') || availableCounter,
                    capturedCounter: pieceContainer.querySelector('.captured .value')
                };
            }
            
            this.playerInventories[player] = {
                container: playerInventory,
                pieces: pieceElements
            };
        }
        
        // Update counters
        this.updateCounters();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for game state changes
        eventBus.subscribe('game:stateChanged', (data) => {
            // Update current player
            if (data.currentPlayer !== undefined) {
                this.currentPlayer = data.currentPlayer;
                this.updatePlayerHighlight();
            }
            
            // Update piece inventory
            if (data.pieces) {
                this.updatePieceInventory(data.pieces);
            }
        });
        
        // Listen for piece selection
        eventBus.subscribe('ui:pieceTypeSelected', (data) => {
            this.selectPieceType(data.pieceType);
        });
        
        // Listen for action completion to clear selection
        eventBus.subscribe('action:completed', () => {
            this.clearSelection();
        });
        
        eventBus.subscribe('action:cancelled', () => {
            this.clearSelection();
        });
    }
    
    /**
     * Update the component with new state data
     * @param {Object} state - Game state data
     */
    update(state) {
        if (!state) return;
        
        // Update current player
        if (state.currentPlayer !== undefined) {
            this.currentPlayer = state.currentPlayer;
            this.updatePlayerHighlight();
        }
        
        // Update piece inventory
        if (state.pieces) {
            this.updatePieceInventory(state.pieces);
        }
    }
    
    /**
     * Update piece inventory based on game state
     * @param {Object} pieces - Piece data from game state
     */
    updatePieceInventory(pieces) {
        for (const player of ['black', 'white']) {
            if (pieces[player]) {
                const playerPieces = pieces[player];
                
                // Update local state
                this.pieces[player].tiles.available = playerPieces.tilesAvailable || 0;
                this.pieces[player].discs.available = playerPieces.discsAvailable || 0;
                this.pieces[player].discs.captured = playerPieces.discsCaptured || 0;
                this.pieces[player].rings.available = playerPieces.ringsAvailable || 0;
                this.pieces[player].rings.captured = playerPieces.ringsCaptured || 0;
            }
        }
        
        // Update UI counters
        this.updateCounters();
    }
    
    /**
     * Update piece counter displays
     */
    updateCounters() {
        for (const player of ['black', 'white']) {
            const inventory = this.playerInventories[player];
            
            // Update tiles
            inventory.pieces.tiles.availableCounter.textContent = 
                this.pieces[player].tiles.available;
            
            // Update discs
            inventory.pieces.discs.availableCounter.textContent = 
                this.pieces[player].discs.available;
            inventory.pieces.discs.capturedCounter.textContent = 
                this.pieces[player].discs.captured;
            
            // Update rings
            inventory.pieces.rings.availableCounter.textContent = 
                this.pieces[player].rings.available;
            inventory.pieces.rings.capturedCounter.textContent = 
                this.pieces[player].rings.captured;
        }
    }
    
    /**
     * Highlight the current player's inventory
     */
    updatePlayerHighlight() {
        // Remove active class from all inventories
        for (const player of ['black', 'white']) {
            this.playerInventories[player].container.classList.remove('active');
        }
        
        // Add active class to current player's inventory
        if (this.currentPlayer) {
            this.playerInventories[this.currentPlayer].container.classList.add('active');
        }
    }
    
    /**
     * Select a piece type for placement
     * @param {string} pieceType - Type of piece ('tiles', 'discs', 'rings')
     */
    selectPieceType(pieceType) {
        // Don't allow selection if not current player
        if (!this.currentPlayer) return;
        
        // Clear any existing selection
        this.clearSelection();
        
        // Check if the player has available pieces of this type
        if (this.pieces[this.currentPlayer][pieceType].available <= 0) {
            return;
        }
        
        // Set selected piece type
        this.selectedPieceType = pieceType;
        
        // Highlight the selected piece container
        const pieceContainer = this.playerInventories[this.currentPlayer].pieces[pieceType].container;
        pieceContainer.classList.add('selected');
        
        // Call the selection callback
        if (this.onPieceSelected) {
            this.onPieceSelected(pieceType);
        }
    }
    
    /**
     * Clear the current piece selection
     */
    clearSelection() {
        if (!this.selectedPieceType) return;
        
        // Clear highlights from all piece containers
        for (const player of ['black', 'white']) {
            for (const pieceType of ['tiles', 'discs', 'rings']) {
                this.playerInventories[player].pieces[pieceType].container.classList.remove('selected');
            }
        }
        
        this.selectedPieceType = null;
    }
    
    /**
     * Highlight available pieces that can be placed
     * @param {string} action - Current action ('placeTile', 'placePiece')
     */
    highlightAvailablePieces(action) {
        // Clear all highlights
        this.clearHighlights();
        
        // Don't highlight if not current player
        if (!this.currentPlayer) return;
        
        // Highlight based on action
        if (action === 'placeTile') {
            // Highlight tiles
            const tileContainer = this.playerInventories[this.currentPlayer].pieces.tiles.container;
            if (this.pieces[this.currentPlayer].tiles.available > 0) {
                tileContainer.classList.add('available');
            }
        } else if (action === 'placePiece') {
            // Highlight discs and rings
            const discContainer = this.playerInventories[this.currentPlayer].pieces.discs.container;
            const ringContainer = this.playerInventories[this.currentPlayer].pieces.rings.container;
            
            if (this.pieces[this.currentPlayer].discs.available > 0) {
                discContainer.classList.add('available');
            }
            
            // For rings, we need at least one captured disc
            if (this.pieces[this.currentPlayer].rings.available > 0 && 
                this.pieces[this.currentPlayer].discs.captured > 0) {
                ringContainer.classList.add('available');
            }
        }
    }
    
    /**
     * Clear all piece highlights
     */
    clearHighlights() {
        for (const player of ['black', 'white']) {
            for (const pieceType of ['tiles', 'discs', 'rings']) {
                this.playerInventories[player].pieces[pieceType].container.classList.remove('available');
            }
        }
    }
    
    /**
     * Get the currently selected piece type
     * @returns {string|null} - Selected piece type or null if none selected
     */
    getSelectedPieceType() {
        return this.selectedPieceType;
    }
} 