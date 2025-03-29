/**
 * Model Configuration - Manages 3D model configurations and paths
 * 
 * This module provides a centralized way to retrieve model paths
 * based on theme and quality settings.
 */

// Available model themes
export const MODEL_THEMES = {
    CLASSIC: 'classic',
    MODERN: 'modern',
    FANTASY: 'fantasy',
    MINIMAL: 'minimal'
};

// Available model quality levels
export const MODEL_QUALITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
};

// Default model configuration
export const DEFAULT_MODEL_CONFIG = {
    theme: MODEL_THEMES.CLASSIC,
    quality: MODEL_QUALITY.MEDIUM
};

// Base path for models
const BASE_MODEL_PATH = '/assets/models';

/**
 * Get the base path for a specific theme and quality
 * @param {string} theme - The theme name
 * @param {string} quality - The quality level
 * @returns {string} The base path for the models
 */
function getBasePath(theme, quality) {
    return `${BASE_MODEL_PATH}/${theme}/${quality}`;
}

/**
 * Model paths for each theme and quality level
 * Structure: theme -> quality -> model type -> path
 */
const MODEL_PATHS = {
    [MODEL_THEMES.CLASSIC]: {
        [MODEL_QUALITY.LOW]: {
            tile: `${BASE_MODEL_PATH}/classic/low/tile.glb`,
            whitePiece: `${BASE_MODEL_PATH}/classic/low/white_piece.glb`,
            blackPiece: `${BASE_MODEL_PATH}/classic/low/black_piece.glb`
        },
        [MODEL_QUALITY.MEDIUM]: {
            tile: `${BASE_MODEL_PATH}/classic/medium/tile.glb`,
            whitePiece: `${BASE_MODEL_PATH}/classic/medium/white_piece.glb`,
            blackPiece: `${BASE_MODEL_PATH}/classic/medium/black_piece.glb`
        },
        [MODEL_QUALITY.HIGH]: {
            tile: `${BASE_MODEL_PATH}/classic/high/tile.glb`,
            whitePiece: `${BASE_MODEL_PATH}/classic/high/white_piece.glb`,
            blackPiece: `${BASE_MODEL_PATH}/classic/high/black_piece.glb`
        }
    },
    [MODEL_THEMES.MODERN]: {
        [MODEL_QUALITY.LOW]: {
            tile: `${BASE_MODEL_PATH}/modern/low/tile.glb`,
            whitePiece: `${BASE_MODEL_PATH}/modern/low/white_piece.glb`,
            blackPiece: `${BASE_MODEL_PATH}/modern/low/black_piece.glb`
        },
        [MODEL_QUALITY.MEDIUM]: {
            tile: `${BASE_MODEL_PATH}/modern/medium/tile.glb`,
            whitePiece: `${BASE_MODEL_PATH}/modern/medium/white_piece.glb`,
            blackPiece: `${BASE_MODEL_PATH}/modern/medium/black_piece.glb`
        },
        [MODEL_QUALITY.HIGH]: {
            tile: `${BASE_MODEL_PATH}/modern/high/tile.glb`,
            whitePiece: `${BASE_MODEL_PATH}/modern/high/white_piece.glb`,
            blackPiece: `${BASE_MODEL_PATH}/modern/high/black_piece.glb`
        }
    },
    [MODEL_THEMES.FANTASY]: {
        [MODEL_QUALITY.LOW]: {
            tile: `${BASE_MODEL_PATH}/fantasy/low/tile.glb`,
            whitePiece: `${BASE_MODEL_PATH}/fantasy/low/white_piece.glb`,
            blackPiece: `${BASE_MODEL_PATH}/fantasy/low/black_piece.glb`
        },
        [MODEL_QUALITY.MEDIUM]: {
            tile: `${BASE_MODEL_PATH}/fantasy/medium/tile.glb`,
            whitePiece: `${BASE_MODEL_PATH}/fantasy/medium/white_piece.glb`,
            blackPiece: `${BASE_MODEL_PATH}/fantasy/medium/black_piece.glb`
        },
        [MODEL_QUALITY.HIGH]: {
            tile: `${BASE_MODEL_PATH}/fantasy/high/tile.glb`,
            whitePiece: `${BASE_MODEL_PATH}/fantasy/high/white_piece.glb`,
            blackPiece: `${BASE_MODEL_PATH}/fantasy/high/black_piece.glb`
        }
    },
    [MODEL_THEMES.MINIMAL]: {
        [MODEL_QUALITY.LOW]: {
            tile: `${BASE_MODEL_PATH}/minimal/low/tile.glb`,
            whitePiece: `${BASE_MODEL_PATH}/minimal/low/white_piece.glb`,
            blackPiece: `${BASE_MODEL_PATH}/minimal/low/black_piece.glb`
        },
        [MODEL_QUALITY.MEDIUM]: {
            tile: `${BASE_MODEL_PATH}/minimal/medium/tile.glb`,
            whitePiece: `${BASE_MODEL_PATH}/minimal/medium/white_piece.glb`,
            blackPiece: `${BASE_MODEL_PATH}/minimal/medium/black_piece.glb`
        },
        [MODEL_QUALITY.HIGH]: {
            tile: `${BASE_MODEL_PATH}/minimal/high/tile.glb`,
            whitePiece: `${BASE_MODEL_PATH}/minimal/high/white_piece.glb`,
            blackPiece: `${BASE_MODEL_PATH}/minimal/high/black_piece.glb`
        }
    }
};

/**
 * Get model paths for a specific theme and quality
 * @param {string} theme - The theme to use (default: classic)
 * @param {string} quality - The quality level to use (default: medium)
 * @returns {Object} Object with paths for each model type
 */
export function getModelPaths(theme = DEFAULT_MODEL_CONFIG.theme, quality = DEFAULT_MODEL_CONFIG.quality) {
    // Validate theme and quality, fallback to defaults if invalid
    const validTheme = Object.values(MODEL_THEMES).includes(theme) ? theme : DEFAULT_MODEL_CONFIG.theme;
    const validQuality = Object.values(MODEL_QUALITY).includes(quality) ? quality : DEFAULT_MODEL_CONFIG.quality;
    
    console.log(`Getting model paths for theme: ${validTheme}, quality: ${validQuality}`);
    
    // Return paths for the validated theme and quality
    return MODEL_PATHS[validTheme][validQuality];
}

/**
 * Get all available themes
 * @returns {Array<string>} Array of theme names
 */
export function getAvailableThemes() {
    return Object.values(MODEL_THEMES);
}

/**
 * Get all available quality levels
 * @returns {Array<string>} Array of quality level names
 */
export function getAvailableQualityLevels() {
    return Object.values(MODEL_QUALITY);
}

// Export the modelConfig object with all methods
export default {
    DEFAULT_MODEL_CONFIG,
    MODEL_THEMES,
    MODEL_QUALITY,
    getModelPaths,
    getAvailableThemes,
    getAvailableQualityLevels
}; 