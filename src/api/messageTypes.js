/**
 * Message Types - Defines the structure of messages used in the API
 * 
 * This module provides constants and helpers for creating properly formatted
 * messages for the API communication between different modules.
 */

/**
 * Message type constants
 */
export const MessageTypes = {
    REQUEST: 'request',
    RESPONSE: 'response',
    EVENT: 'event',
    ERROR: 'error'
};

/**
 * Create a properly formatted API request message
 * @param {string} method - API method name
 * @param {Object} params - Request parameters
 * @param {string} [id] - Optional request ID (generated if not provided)
 * @returns {Object} Formatted request message
 */
export function createRequest(method, params = {}, id = null) {
    return {
        id: id || generateId(),
        type: MessageTypes.REQUEST,
        method,
        params,
        timestamp: Date.now()
    };
}

/**
 * Create a properly formatted API response message
 * @param {string} id - Request ID this response corresponds to
 * @param {Object} result - Response result data
 * @returns {Object} Formatted response message
 */
export function createResponse(id, result = {}) {
    return {
        id,
        type: MessageTypes.RESPONSE,
        result,
        error: null,
        timestamp: Date.now()
    };
}

/**
 * Create a properly formatted API error response
 * @param {string} id - Request ID this error corresponds to
 * @param {Object} error - Error details
 * @returns {Object} Formatted error message
 */
export function createErrorResponse(id, error = {}) {
    return {
        id,
        type: MessageTypes.ERROR,
        result: null,
        error,
        timestamp: Date.now()
    };
}

/**
 * Create a properly formatted event message
 * @param {string} event - Event type
 * @param {Object} data - Event data
 * @returns {Object} Formatted event message
 */
export function createEvent(event, data = {}) {
    return {
        type: MessageTypes.EVENT,
        event,
        data,
        timestamp: Date.now()
    };
}

/**
 * Generate a unique ID for requests
 * @returns {string} Unique ID
 */
function generateId() {
    return `req_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
}

/**
 * Validate that a message conforms to the expected format
 * @param {Object} message - Message to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function validateMessage(message) {
    if (!message || typeof message !== 'object') {
        return false;
    }
    
    // Check type is present and valid
    if (!message.type || !Object.values(MessageTypes).includes(message.type)) {
        return false;
    }
    
    // Type-specific validation
    switch (message.type) {
        case MessageTypes.REQUEST:
            return Boolean(message.id && message.method);
        case MessageTypes.RESPONSE:
            return Boolean(message.id && (message.result !== undefined));
        case MessageTypes.ERROR:
            return Boolean(message.id && message.error);
        case MessageTypes.EVENT:
            return Boolean(message.event);
        default:
            return false;
    }
} 