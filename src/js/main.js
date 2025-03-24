import { GameBoard } from './core/gameBoard.js';
import { GameState } from './core/gameState.js';
import { UIManager } from './ui/uiManager.js';
import { ThreeRenderer } from './ui/threeRenderer.js';
import { StorageManager } from './utils/storageManager.js';

// Initialize game components
document.addEventListener('DOMContentLoaded', () => {
    // Initialize game state
    const gameState = new GameState();
    
    // Initialize 3D renderer
    const threeRenderer = new ThreeRenderer(
        document.getElementById('game-board'),
        gameState
    );
    
    // Initialize game board logic
    const gameBoard = new GameBoard(gameState, threeRenderer);
    
    // Initialize UI manager
    const uiManager = new UIManager(gameState, threeRenderer, gameBoard);
    
    // Initialize storage manager
    const storageManager = new StorageManager(gameState);
    
    // Load game if saved in session
    const savedGame = storageManager.loadGame();
    if (savedGame) {
        gameState.loadFromSave(savedGame);
        threeRenderer.updateBoard();
        uiManager.updateUI();
    } else {
        // Setup initial game state
        gameState.setupNewGame();
        threeRenderer.setupScene();
        uiManager.updateUI();
    }
    
    // Start animation loop
    threeRenderer.animate();
    
    // Setup auto-save on game state changes
    gameState.onStateChange(() => {
        storageManager.saveGame(gameState.getSerializableState());
        uiManager.updateUI();
    });
}); 