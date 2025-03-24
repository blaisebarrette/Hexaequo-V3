/**
 * UIManager - Handles the 2D user interface elements and interactions
 */
export class UIManager {
    constructor(gameState, renderer, gameBoard) {
        this.gameState = gameState;
        this.renderer = renderer;
        this.gameBoard = gameBoard;
        
        // UI elements
        this.currentPlayerElement = document.getElementById('current-player');
        this.settingsButton = document.getElementById('settings-button');
        this.settingsModal = document.getElementById('settings-modal');
        this.rulesModal = document.getElementById('rules-modal');
        this.closeButtons = document.querySelectorAll('.close-button');
        this.showValidMovesCheckbox = document.getElementById('show-valid-moves');
        this.darkModeCheckbox = document.getElementById('dark-mode');
        this.rulesButton = document.getElementById('rules-button');
        
        // Piece counters
        this.counters = {
            black: {
                tilesAvailable: document.getElementById('black-tiles-available'),
                discsAvailable: document.getElementById('black-discs-available'),
                discsCaptured: document.getElementById('black-discs-captured'),
                ringsAvailable: document.getElementById('black-rings-available'),
                ringsCaptured: document.getElementById('black-rings-captured')
            },
            white: {
                tilesAvailable: document.getElementById('white-tiles-available'),
                discsAvailable: document.getElementById('white-discs-available'),
                discsCaptured: document.getElementById('white-discs-captured'),
                ringsAvailable: document.getElementById('white-rings-available'),
                ringsCaptured: document.getElementById('white-rings-captured')
            }
        };
        
        // Initialize UI
        this.initEventListeners();
        this.loadSettings();
        this.initRulesContent();
        this.updateUI();
    }
    
    /**
     * Initialize event listeners for UI elements
     */
    initEventListeners() {
        // Settings button
        this.settingsButton.addEventListener('click', () => {
            this.openModal(this.settingsModal);
        });
        
        // Rules button
        this.rulesButton.addEventListener('click', () => {
            this.openModal(this.rulesModal);
        });
        
        // Close buttons
        this.closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal');
                this.closeModal(modal);
            });
        });
        
        // Click outside modal to close
        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                this.closeModal(event.target);
            }
        });
        
        // Show valid moves toggle
        this.showValidMovesCheckbox.addEventListener('change', () => {
            this.saveSettings();
            // Refresh the board if we're in the middle of moving a piece
            if (this.gameState.currentAction === 'move_piece' && this.gameState.selectedPiece) {
                const { q, r } = this.gameState.selectedPiece;
                const validMoves = this.gameState.getValidMoves(q, r);
                this.renderer.showPieceMovementUI(q, r, validMoves);
            }
        });
        
        // Dark mode toggle
        this.darkModeCheckbox.addEventListener('change', () => {
            this.toggleDarkMode();
            this.saveSettings();
        });
        
        // Toggle valid move indicators when the checkbox is changed
        document.getElementById('show-valid-moves').addEventListener('change', () => {
            this.renderer.updateValidMovesVisibility();
        });
    }
    
    /**
     * Open a modal
     * @param {HTMLElement} modal - The modal to open
     */
    openModal(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
    }
    
    /**
     * Close a modal
     * @param {HTMLElement} modal - The modal to close
     */
    closeModal(modal) {
        modal.classList.remove('active');
        modal.classList.add('hidden');
    }
    
    /**
     * Toggle dark mode
     */
    toggleDarkMode() {
        document.body.classList.toggle('dark-mode', this.darkModeCheckbox.checked);
    }
    
    /**
     * Save UI settings to local storage
     */
    saveSettings() {
        const settings = {
            showValidMoves: this.showValidMovesCheckbox.checked,
            darkMode: this.darkModeCheckbox.checked
        };
        
        localStorage.setItem('hexaequo_settings', JSON.stringify(settings));
    }
    
    /**
     * Load UI settings from local storage
     */
    loadSettings() {
        const savedSettings = localStorage.getItem('hexaequo_settings');
        
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            this.showValidMovesCheckbox.checked = settings.showValidMoves;
            this.darkModeCheckbox.checked = settings.darkMode;
            
            // Apply dark mode if enabled
            this.toggleDarkMode();
        }
    }
    
    /**
     * Update the UI to reflect the current game state
     */
    updateUI() {
        // Update current player
        this.updateCurrentPlayer();
        
        // Update piece counts
        this.updatePieceCounts();
        
        // Show valid action placeholders for the current turn
        if (this.gameState.gameStatus === 'ongoing' && !this.gameState.currentAction) {
            this.renderer.showValidActionPlaceholders();
        }
    }
    
    /**
     * Update the current player display
     */
    updateCurrentPlayer() {
        let statusText = '';
        
        if (this.gameState.gameStatus === 'ongoing') {
            statusText = `${this.gameState.currentPlayer.charAt(0).toUpperCase() + this.gameState.currentPlayer.slice(1)} player's turn`;
        } else if (this.gameState.gameStatus === 'black_win') {
            statusText = 'Game over! Black wins!';
        } else if (this.gameState.gameStatus === 'white_win') {
            statusText = 'Game over! White wins!';
        } else if (this.gameState.gameStatus === 'draw') {
            statusText = `Game over! Draw (${this.gameState.drawReason === 'repetition' ? 'position repeated three times' : 'no valid moves'})`;
        }
        
        this.currentPlayerElement.textContent = statusText;
    }
    
    /**
     * Update the piece counts display
     */
    updatePieceCounts() {
        for (const color of ['black', 'white']) {
            this.counters[color].tilesAvailable.textContent = this.gameState.pieces[color].tilesAvailable;
            this.counters[color].discsAvailable.textContent = this.gameState.pieces[color].discsAvailable;
            this.counters[color].discsCaptured.textContent = this.gameState.pieces[color].discsCaptured;
            this.counters[color].ringsAvailable.textContent = this.gameState.pieces[color].ringsAvailable;
            this.counters[color].ringsCaptured.textContent = this.gameState.pieces[color].ringsCaptured;
        }
    }
    
    /**
     * Initialize the rules content in the rules modal
     */
    initRulesContent() {
        const rulesContent = document.querySelector('.rules-content');
        
        rulesContent.innerHTML = `
            <h3>Game Objective</h3>
            <p>To win a game of Hexaequo, a player must achieve one of the following:</p>
            <ol>
                <li>Capture all of the opponent's Discs.</li>
                <li>Capture all of the opponent's Rings.</li>
                <li>Eliminate all of the opponent's pieces from the game board (the opponent has no active pieces remaining).</li>
            </ol>
            <p><strong>Important Note:</strong> The game ends in a draw ("Ex Aequo") if a player cannot make a move during their turn, or if the game state repeats three times.</p>
            
            <h3>Game Components</h3>
            <ul>
                <li><strong>Tiles:</strong> 9 tiles of each color.</li>
                <li><strong>Discs:</strong> 6 discs of each color.</li>
                <li><strong>Rings:</strong> 3 rings of each color.</li>
            </ul>
            
            <h3>Setup</h3>
            <ol>
                <li>Place two tiles of each color adjacent to each other to form a small initial grid.</li>
                <li>Position one disc of each color at the edges of the tiles, matching their respective colors.</li>
                <li>The player with the black pieces starts the game.</li>
            </ol>
            
            <h3>Gameplay - Turn Sequence</h3>
            <p>During their turn, a player can perform one of the following actions:</p>
            
            <h4>1. Place a Tile</h4>
            <ul>
                <li>A tile must be placed adjacent to at least two tiles already on the board.</li>
            </ul>
            
            <h4>2. Place a Piece</h4>
            <ul>
                <li>A piece (Disc or Ring) must be placed on an empty tile of the player's color.</li>
                <li>To place a Ring, the player must return one captured Disc to their opponent.</li>
            </ul>
            
            <h4>3. Move a Piece</h4>
            <ul>
                <li><strong>Disc Movement:</strong>
                    <ul>
                        <li>A Disc can move to an adjacent empty tile.</li>
                        <li>Alternatively, a Disc can perform one or more successive jumps over any pieces, capturing only opponent's pieces in the process, if any are jumped over.</li>
                    </ul>
                </li>
                <li><strong>Ring Movement:</strong>
                    <ul>
                        <li>A Ring moves by performing a single jump of exactly two tiles distance.</li>
                        <li>A Ring can capture an opponent's piece by landing on it, but cannot end its move on a tile occupied by a Disc or Ring of its own color.</li>
                    </ul>
                </li>
            </ul>
        `;
    }
} 