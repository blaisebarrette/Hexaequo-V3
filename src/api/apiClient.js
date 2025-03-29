/**
 * API Client - Core client for the game API
 * 
 * This module provides a client for communicating with the game API.
 * It handles formatting requests, routing, and managing responses.
 */
import { EventBus, EventTypes, eventBus } from './eventBus.js';
import { API } from './apiInterface.js';
import { 
    createRequest, 
    createResponse, 
    createErrorResponse, 
    validateMessage 
} from './messageTypes.js';

/**
 * Base API client - implements common functionality
 */
export class APIClient {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.handlers = new Map();
        this.pendingRequests = new Map();
        this.transportType = 'local'; // 'local' or 'remote'
        
        // Listen for responses to our requests
        this.eventBus.subscribe('api:response', this.handleResponse.bind(this));
        
        // Report errors
        this.eventBus.subscribe('api:error', this.handleError.bind(this));
    }
    
    /**
     * Register a handler for an API method
     * @param {string} method - API method name
     * @param {Function} handler - Handler function
     */
    registerHandler(method, handler) {
        this.handlers.set(method, handler);
    }
    
    /**
     * Register multiple handlers at once
     * @param {Object} handlers - Map of method names to handler functions
     */
    registerHandlers(handlers) {
        for (const [method, handler] of Object.entries(handlers)) {
            this.registerHandler(method, handler);
        }
    }
    
    /**
     * Send a request to the API
     * @param {string} method - API method name
     * @param {Object} params - Request parameters
     * @returns {Promise} Promise that resolves with the response
     */
    request(method, params = {}) {
        // Check if method exists in API definition
        if (!API[method]) {
            return Promise.reject(new Error(`Unknown API method: ${method}`));
        }
        
        // Create formatted request
        const request = createRequest(method, params);
        
        // Return a promise that will resolve when we get a response
        const promise = new Promise((resolve, reject) => {
            this.pendingRequests.set(request.id, { resolve, reject });
        });
        
        // Send the request
        if (this.transportType === 'local') {
            // For local transport, just publish directly to the event bus
            this.eventBus.publish('api:request', request);
        } else {
            // For remote transport, we'd use WebSocket or other method
            // This will be implemented in a future phase
            console.warn('Remote transport not yet implemented');
            // Reject with not implemented error
            const pendingRequest = this.pendingRequests.get(request.id);
            if (pendingRequest) {
                pendingRequest.reject(new Error('Remote transport not implemented'));
                this.pendingRequests.delete(request.id);
            }
        }
        
        return promise;
    }
    
    /**
     * Handle an API response
     * @param {Object} response - Response message
     */
    handleResponse(response) {
        // Validate response message
        if (!validateMessage(response)) {
            console.error('Invalid response format', response);
            return;
        }
        
        // Find the pending request for this response
        const pendingRequest = this.pendingRequests.get(response.id);
        if (!pendingRequest) {
            // No pending request found - might be for another client
            return;
        }
        
        // Remove from pending requests
        this.pendingRequests.delete(response.id);
        
        // Resolve or reject the promise
        if (response.error) {
            pendingRequest.reject(response.error);
        } else {
            pendingRequest.resolve(response.result);
        }
    }
    
    /**
     * Handle an API error
     * @param {Object} error - Error message
     */
    handleError(error) {
        // If the error has an ID, it's for a specific request
        if (error.id) {
            const pendingRequest = this.pendingRequests.get(error.id);
            if (pendingRequest) {
                pendingRequest.reject(error.error);
                this.pendingRequests.delete(error.id);
            }
        } else {
            // If no ID, it's a general error - log it
            console.error('API error:', error);
            
            // Publish an error event
            this.eventBus.publish(EventTypes.ERROR_OCCURRED, {
                source: 'api',
                message: error.message || 'Unknown API error',
                details: error
            });
        }
    }
    
    /**
     * Set the transport type
     * @param {string} type - Transport type ('local' or 'remote')
     */
    setTransportType(type) {
        if (type !== 'local' && type !== 'remote') {
            throw new Error(`Invalid transport type: ${type}`);
        }
        this.transportType = type;
    }
}

/**
 * API Server - processes API requests and provides responses
 */
export class APIServer {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.handlers = new Map();
        
        // Listen for requests
        this.eventBus.subscribe('api:request', this.handleRequest.bind(this));
    }
    
    /**
     * Register a handler for an API method
     * @param {string} method - API method name
     * @param {Function} handler - Handler function
     */
    registerHandler(method, handler) {
        this.handlers.set(method, handler);
    }
    
    /**
     * Register multiple handlers at once
     * @param {Object} handlers - Map of method names to handler functions
     */
    registerHandlers(handlers) {
        for (const [method, handler] of Object.entries(handlers)) {
            this.registerHandler(method, handler);
        }
    }
    
    /**
     * Handle an API request
     * @param {Object} request - Request message
     */
    async handleRequest(request) {
        console.log(`API Request received: method=${request.method}`, request);
        
        // Validate request message
        if (!validateMessage(request)) {
            console.error('Invalid request format', request);
            this.sendError(request.id, { 
                code: 'INVALID_REQUEST', 
                message: 'Invalid request format' 
            });
            return;
        }
        
        // Find handler for this method
        const handler = this.handlers.get(request.method);
        console.log(`Handler for ${request.method}: ${handler ? 'Found' : 'Not Found'}`);
        
        // Debug registered handlers
        console.log('Registered API handlers:', Array.from(this.handlers.keys()));
        
        if (!handler) {
            console.error(`No handler for method: ${request.method}`);
            this.sendError(request.id, { 
                code: 'METHOD_NOT_FOUND', 
                message: `Method not found: ${request.method}` 
            });
            return;
        }
        
        try {
            // Call the handler
            console.log(`Executing handler for ${request.method} with params:`, request.params);
            const result = await handler(request.params);
            console.log(`Handler result for ${request.method}:`, result);
            
            // Send response
            this.sendResponse(request.id, result);
        } catch (error) {
            console.error(`Error handling request for method ${request.method}:`, error);
            this.sendError(request.id, { 
                code: 'INTERNAL_ERROR', 
                message: error.message || 'Internal error',
                details: error
            });
        }
    }
    
    /**
     * Send a response to a request
     * @param {string} id - Request ID
     * @param {Object} result - Response result
     */
    sendResponse(id, result) {
        const response = createResponse(id, result);
        this.eventBus.publish('api:response', response);
    }
    
    /**
     * Send an error response to a request
     * @param {string} id - Request ID
     * @param {Object} error - Error details
     */
    sendError(id, error) {
        const response = createErrorResponse(id, error);
        this.eventBus.publish('api:error', response);
    }
}

// Create singleton instances
export const apiClient = new APIClient(eventBus);
export const apiServer = new APIServer(eventBus); 