/**
 * EventBus - Core communication system for all modules
 * 
 * This class provides a publish-subscribe pattern implementation
 * to enable different parts of the application to communicate
 * without direct coupling.
 */
export class EventBus {
    constructor() {
        this.subscribers = new Map();
        this.messageQueue = [];
        this.processingQueue = false;
    }
    
    /**
     * Subscribe to an event type
     * @param {string} eventType - The event type to subscribe to
     * @param {Function} callback - The function to call when event occurs
     * @param {Object} options - Subscription options
     * @returns {Function} - Unsubscribe function
     */
    subscribe(eventType, callback, options = {}) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, []);
        }
        
        const subscription = { callback, options };
        this.subscribers.get(eventType).push(subscription);
        
        // Return a function to remove this subscription
        return () => {
            const subs = this.subscribers.get(eventType);
            if (!subs) return;
            
            const index = subs.indexOf(subscription);
            if (index !== -1) {
                subs.splice(index, 1);
            }
        };
    }
    
    /**
     * Publish an event to all subscribers
     * @param {string} eventType - The event type to publish
     * @param {Object} data - Event data
     */
    publish(eventType, data = {}) {
        // Add to the message queue
        this.messageQueue.push({
            eventType,
            data,
            timestamp: Date.now()
        });
        
        // Start queue processing if not already in progress
        if (!this.processingQueue) {
            this.processQueue();
        }
    }
    
    /**
     * Process the message queue asynchronously
     * This ensures events are processed in order and prevents stack overflow
     */
    processQueue() {
        this.processingQueue = true;
        
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            const subscribers = this.subscribers.get(message.eventType) || [];
            
            for (const subscription of subscribers) {
                try {
                    subscription.callback(message.data);
                } catch (error) {
                    console.error(`Error in event handler for ${message.eventType}:`, error);
                }
            }
        }
        
        this.processingQueue = false;
    }

    /**
     * Remove all subscriptions for a specific event type
     * @param {string} eventType - The event type to clear
     */
    clear(eventType) {
        if (eventType) {
            this.subscribers.delete(eventType);
        } else {
            this.subscribers.clear();
        }
    }
}

/**
 * Event types enumeration
 * 
 * This contains all the event types used in the application
 * Using constants prevents typos and enables code completion
 */
export const EventTypes = {
    // Game lifecycle events
    GAME_INITIALIZED: 'game:initialized',
    GAME_STARTED: 'game:started',
    GAME_ENDED: 'game:ended',
    
    // Player turn events
    TURN_STARTED: 'turn:started',
    TURN_ENDED: 'turn:ended',
    
    // Game state events
    STATE_CHANGED: 'state:changed',
    VICTORY_ACHIEVED: 'state:victory',
    DRAW_DECLARED: 'state:draw',
    
    // Action events
    ACTION_STARTED: 'action:started',
    ACTION_COMPLETED: 'action:completed',
    ACTION_CANCELLED: 'action:cancelled',
    
    // Piece events
    PIECE_SELECTED: 'piece:selected',
    PIECE_PLACED: 'piece:placed',
    PIECE_MOVED: 'piece:moved',
    PIECE_CAPTURED: 'piece:captured',
    
    // Tile events
    TILE_PLACED: 'tile:placed',
    
    // UI events
    UI_SHOW_VALID_MOVES: 'ui:showValidMoves',
    UI_HIDE_VALID_MOVES: 'ui:hideValidMoves',
    UI_SHOW_PLACEMENT: 'ui:showPlacement',
    UI_HIDE_PLACEMENT: 'ui:hidePlacement',
    
    // Animation events
    ANIMATION_STARTED: 'animation:started',
    ANIMATION_COMPLETED: 'animation:completed',
    
    // Settings events
    SETTINGS_CHANGED: 'settings:changed',
    
    // Error events
    ERROR_OCCURRED: 'error:occurred'
};

// Create a singleton instance for the application
export const eventBus = new EventBus(); 