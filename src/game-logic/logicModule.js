/**
 * LogicModule - Main entry point for the game logic
 * 
 * This module connects the game state and rules to the API layer,
 * handling API requests and dispatching events. It serves as the
 * central coordination point for game logic.
 */
import { eventBus, EventTypes } from '../api/eventBus.js';
import { apiServer } from '../api/apiClient.js';
import { gameState } from './gameState.js';
import * as Rules from './rules.js';

/**
 * Initialize the logic module
 */
export function initializeLogicModule() {
    // Register API handlers
    registerAPIHandlers();
    
    // Initialize game state
    gameState.reset();
    
    // Emit initialization event
    eventBus.publish(EventTypes.GAME_INITIALIZED, {
        state: gameState.getSerializableState()
    });
}

/**
 * Register handlers for API methods
 */
function registerAPIHandlers() {
    // Game State API Handlers
    apiServer.registerHandlers({
        // Get the current game state
        getGameState: () => {
            return gameState.getSerializableState();
        },
        
        // Start a new game with default setup
        startNewGame: () => {
            gameState.setupNewGame();
            return {
                success: true,
                state: gameState.getSerializableState()
            };
        },
        
        // End the current player's turn
        endTurn: () => {
            const result = gameState.endTurn();
            return {
                success: result,
                state: gameState.getSerializableState()
            };
        },
        
        // Save the current game state
        saveGame: () => {
            const state = gameState.getSerializableState();
            eventBus.publish('storage:saveGame', { state });
            return { success: true };
        },
        
        // Load a saved game state
        loadGame: (params) => {
            const { state } = params;
            const success = gameState.loadFromSave(state);
            return { success, state: gameState.getSerializableState() };
        }
    });
    
    // Board Action API Handlers
    apiServer.registerHandlers({
        // Place a tile at the specified coordinates
        placeTile: (params) => {
            const { q, r, color } = params;
            const result = gameState.placeTile(q, r, color);
            return {
                success: result,
                state: gameState.getSerializableState()
            };
        },
        
        // Place a piece at the specified coordinates
        placePiece: (params) => {
            const { q, r, color, type } = params;
            const result = gameState.placePiece(q, r, color, type);
            return {
                success: result,
                state: gameState.getSerializableState()
            };
        },
        
        // Move a piece from one position to another
        movePiece: (params) => {
            const { fromQ, fromR, toQ, toR } = params;
            const result = gameState.movePiece(fromQ, fromR, toQ, toR);
            return {
                success: result,
                state: gameState.getSerializableState()
            };
        },
        
        // Get valid moves for a piece at the specified coordinates
        getValidMoves: (params) => {
            const { q, r } = params;
            const moves = gameState.getValidMoves(q, r);
            return { moves };
        },
        
        // Get valid tile placements for the specified color
        getValidTilePlacements: (params) => {
            const { color } = params;
            const placements = Rules.getValidTilePlacements(gameState, color || gameState.currentPlayer);
            return { placements };
        },
        
        // Get valid piece placements for the specified color and type
        getValidPiecePlacements: (params) => {
            const { color, type } = params;
            const placements = Rules.getValidPiecePlacements(
                gameState, 
                color || gameState.currentPlayer, 
                type
            );
            return { placements };
        },
        
        // Cancel the current action
        cancelAction: () => {
            const result = gameState.cancelAction();
            return {
                success: result,
                state: gameState.getSerializableState()
            };
        },
        
        // Complete the current action
        completeAction: () => {
            const result = gameState.completeAction();
            return {
                success: result,
                state: gameState.getSerializableState()
            };
        },
        
        // Start an action
        startAction: (params) => {
            const { action, data } = params;
            const result = gameState.startAction(action, data);
            return {
                success: result,
                state: gameState.getSerializableState()
            };
        }
    });
}

/**
 * Get the game state
 * @returns {Object} The current game state
 */
export function getGameState() {
    return gameState.getSerializableState();
}

// Remove the auto-initialization
// initializeLogicModule(); 