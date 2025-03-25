import { GameBoard } from './core/gameBoard.js';
import { GameState } from './core/gameState.js';
import { UIManager } from './ui/uiManager.js';
import { ThreeRenderer } from './ui/threeRenderer.js';
import { StorageManager } from './utils/storageManager.js';

// Set correct viewport height for mobile browsers
function setMobileViewportHeight() {
    // First we get the viewport height and multiply it by 1% to get a value for a vh unit
    let vh = window.innerHeight * 0.01;
    // Then we set the value in the --vh custom property to the root of the document
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Initialize game components
document.addEventListener('DOMContentLoaded', () => {
    // Fix mobile viewport height issues
    setMobileViewportHeight();
    window.addEventListener('resize', setMobileViewportHeight);
    window.addEventListener('orientationchange', setMobileViewportHeight);
    
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
    
    // Handle zoom behavior
    setupZoomHandling(threeRenderer);
}); 

/**
 * Setup custom zoom handling for the game board only
 * @param {ThreeRenderer} renderer - The 3D renderer instance
 */
function setupZoomHandling(renderer) {
    const gameBoard = document.getElementById('game-board');
    
    // Prevent default pinch zoom behavior
    document.addEventListener('touchmove', function(e) {
        if (e.touches.length > 1) {
            // Only prevent default if the touch is on the game board
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            // Get touch coordinates
            const touch1Element = document.elementFromPoint(touch1.clientX, touch1.clientY);
            const touch2Element = document.elementFromPoint(touch2.clientX, touch2.clientY);
            
            // Check if both touches are on the game board
            const isOnGameBoard = gameBoard.contains(touch1Element) && gameBoard.contains(touch2Element);
            
            if (isOnGameBoard) {
                e.preventDefault();
                
                // Calculate distance between two fingers
                const dist = Math.hypot(
                    touch1.clientX - touch2.clientX,
                    touch1.clientY - touch2.clientY
                );
                
                // If we have a previous distance, calculate zoom factor
                if (renderer.previousTouchDistance) {
                    const zoomFactor = dist / renderer.previousTouchDistance;
                    
                    // Apply zoom to the camera
                    if (renderer.camera) {
                        if (zoomFactor > 1.05) { // Zoom in
                            renderer.zoomIn(zoomFactor);
                        } else if (zoomFactor < 0.95) { // Zoom out
                            renderer.zoomOut(1/zoomFactor);
                        }
                    }
                }
                
                // Store current distance for next comparison
                renderer.previousTouchDistance = dist;
            }
        }
    }, { passive: false });
    
    // Reset touch distance when touch ends
    document.addEventListener('touchend', function() {
        renderer.previousTouchDistance = null;
    });
    
    // Reset touch distance when touch is cancelled
    document.addEventListener('touchcancel', function() {
        renderer.previousTouchDistance = null;
    });
} 