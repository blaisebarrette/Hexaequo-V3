/**
 * SettingsModal - Component for displaying and managing game settings
 * 
 * This component handles the settings modal, including appearance settings,
 * game settings, and 3D model settings.
 */
import { eventBus } from '../../api/eventBus.js';
import { apiClient } from '../../api/apiClient.js';
import { MODEL_THEMES, MODEL_QUALITY } from '../../game-board/core/modelConfig.js';

/**
 * SettingsModal class
 */
export class SettingsModal {
    /**
     * Constructor
     * @param {HTMLElement} container - The modal container element
     */
    constructor(container) {
        this.container = container;
        
        if (!this.container) {
            console.error('Settings modal container not found');
            return;
        }
        
        // Initialize state
        this.settings = {
            darkMode: false,
            backgroundColor: 'default',
            showValidMoves: true,
            animationsEnabled: true,
            modelSettings: {
                theme: 'modern',
                quality: 'high',
                useFallbackIfLoadFails: true,
                showLoadingProgress: true
            }
        };
        
        this.availableThemes = [];
        this.availableQualities = [];
        
        // Create modal elements
        this.createModalElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial settings
        this.loadSettings();
    }
    
    /**
     * Create modal elements
     */
    createModalElements() {
        // Modal container
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'modal settings-modal';
        this.container.appendChild(this.modalElement);
        
        // Modal content
        this.modalContent = document.createElement('div');
        this.modalContent.className = 'modal-content';
        this.modalElement.appendChild(this.modalContent);
        
        // Modal header
        const header = document.createElement('div');
        header.className = 'modal-header';
        this.modalContent.appendChild(header);
        
        const title = document.createElement('h2');
        title.textContent = 'Game Settings';
        header.appendChild(title);
        
        const closeButton = document.createElement('button');
        closeButton.className = 'close-button';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => this.close());
        header.appendChild(closeButton);
        
        // Modal body
        const body = document.createElement('div');
        body.className = 'modal-body';
        this.modalContent.appendChild(body);
        
        // Settings sections
        this.createAppearanceSettings(body);
        this.createGameSettings(body);
        this.createModelSettings(body);
        
        // Modal footer
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        this.modalContent.appendChild(footer);
        
        const saveButton = document.createElement('button');
        saveButton.className = 'save-button';
        saveButton.textContent = 'Save Settings';
        saveButton.addEventListener('click', () => this.saveSettings());
        footer.appendChild(saveButton);
        
        const resetButton = document.createElement('button');
        resetButton.className = 'reset-button';
        resetButton.textContent = 'Reset to Defaults';
        resetButton.addEventListener('click', () => this.resetSettings());
        footer.appendChild(resetButton);
        
        // Hide modal by default
        this.modalElement.style.display = 'none';
    }
    
    /**
     * Create appearance settings section
     * @param {HTMLElement} container - Container for this section
     */
    createAppearanceSettings(container) {
        const section = document.createElement('div');
        section.className = 'settings-section';
        container.appendChild(section);
        
        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = 'Appearance';
        section.appendChild(sectionTitle);
        
        // Dark mode toggle
        const darkModeContainer = document.createElement('div');
        darkModeContainer.className = 'setting-item';
        section.appendChild(darkModeContainer);
        
        const darkModeLabel = document.createElement('label');
        darkModeLabel.htmlFor = 'darkMode';
        darkModeLabel.textContent = 'Dark Mode';
        darkModeContainer.appendChild(darkModeLabel);
        
        this.darkModeToggle = document.createElement('input');
        this.darkModeToggle.type = 'checkbox';
        this.darkModeToggle.id = 'darkMode';
        darkModeContainer.appendChild(this.darkModeToggle);
        
        // Background selection
        const bgContainer = document.createElement('div');
        bgContainer.className = 'setting-item';
        section.appendChild(bgContainer);
        
        const bgLabel = document.createElement('label');
        bgLabel.htmlFor = 'background';
        bgLabel.textContent = 'Background Style';
        bgContainer.appendChild(bgLabel);
        
        this.backgroundSelect = document.createElement('select');
        this.backgroundSelect.id = 'background';
        bgContainer.appendChild(this.backgroundSelect);
        
        const bgOptions = [
            { value: 'default', text: 'Default' },
            { value: 'wood', text: 'Wood' },
            { value: 'stone', text: 'Stone' },
            { value: 'marble', text: 'Marble' }
        ];
        
        bgOptions.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option.value;
            optElement.textContent = option.text;
            this.backgroundSelect.appendChild(optElement);
        });
    }
    
    /**
     * Create game settings section
     * @param {HTMLElement} container - Container for this section
     */
    createGameSettings(container) {
        const section = document.createElement('div');
        section.className = 'settings-section';
        container.appendChild(section);
        
        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = 'Game Settings';
        section.appendChild(sectionTitle);
        
        // Show valid moves toggle
        const validMovesContainer = document.createElement('div');
        validMovesContainer.className = 'setting-item';
        section.appendChild(validMovesContainer);
        
        const validMovesLabel = document.createElement('label');
        validMovesLabel.htmlFor = 'showValidMoves';
        validMovesLabel.textContent = 'Show Valid Moves';
        validMovesContainer.appendChild(validMovesLabel);
        
        this.showValidMovesToggle = document.createElement('input');
        this.showValidMovesToggle.type = 'checkbox';
        this.showValidMovesToggle.id = 'showValidMoves';
        validMovesContainer.appendChild(this.showValidMovesToggle);
        
        // Animations toggle
        const animationsContainer = document.createElement('div');
        animationsContainer.className = 'setting-item';
        section.appendChild(animationsContainer);
        
        const animationsLabel = document.createElement('label');
        animationsLabel.htmlFor = 'animations';
        animationsLabel.textContent = 'Enable Animations';
        animationsContainer.appendChild(animationsLabel);
        
        this.animationsToggle = document.createElement('input');
        this.animationsToggle.type = 'checkbox';
        this.animationsToggle.id = 'animations';
        animationsContainer.appendChild(this.animationsToggle);
    }
    
    /**
     * Create model settings section
     * @param {HTMLElement} container - Container for this section
     */
    createModelSettings(container) {
        const section = document.createElement('div');
        section.className = 'settings-section';
        container.appendChild(section);
        
        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = '3D Model Settings';
        section.appendChild(sectionTitle);
        
        // Theme selection
        const themeContainer = document.createElement('div');
        themeContainer.className = 'setting-item';
        section.appendChild(themeContainer);
        
        const themeLabel = document.createElement('label');
        themeLabel.htmlFor = 'modelTheme';
        themeLabel.textContent = 'Model Theme';
        themeContainer.appendChild(themeLabel);
        
        this.themeSelect = document.createElement('select');
        this.themeSelect.id = 'modelTheme';
        themeContainer.appendChild(this.themeSelect);
        
        // Quality selection
        const qualityContainer = document.createElement('div');
        qualityContainer.className = 'setting-item';
        section.appendChild(qualityContainer);
        
        const qualityLabel = document.createElement('label');
        qualityLabel.htmlFor = 'modelQuality';
        qualityLabel.textContent = 'Model Quality';
        qualityContainer.appendChild(qualityLabel);
        
        this.qualitySelect = document.createElement('select');
        this.qualitySelect.id = 'modelQuality';
        qualityContainer.appendChild(this.qualitySelect);
        
        // Fallback toggle
        const fallbackContainer = document.createElement('div');
        fallbackContainer.className = 'setting-item';
        section.appendChild(fallbackContainer);
        
        const fallbackLabel = document.createElement('label');
        fallbackLabel.htmlFor = 'useFallback';
        fallbackLabel.textContent = 'Use Fallback Models if Loading Fails';
        fallbackContainer.appendChild(fallbackLabel);
        
        this.fallbackToggle = document.createElement('input');
        this.fallbackToggle.type = 'checkbox';
        this.fallbackToggle.id = 'useFallback';
        fallbackContainer.appendChild(this.fallbackToggle);
        
        // Reload models button
        const reloadContainer = document.createElement('div');
        reloadContainer.className = 'setting-item button-item';
        section.appendChild(reloadContainer);
        
        this.reloadButton = document.createElement('button');
        this.reloadButton.className = 'reload-button';
        this.reloadButton.textContent = 'Reload Models';
        this.reloadButton.addEventListener('click', () => this.reloadModels());
        reloadContainer.appendChild(this.reloadButton);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for show modal event
        eventBus.subscribe('ui:showModal', (data) => {
            if (data.modal === 'settings') {
                this.open();
            }
        });
        
        // Listen for board state changes
        eventBus.subscribe('board:stateChanged', (data) => {
            if (data.darkMode !== undefined) {
                this.settings.darkMode = data.darkMode;
            }
            
            if (data.backgroundColor !== undefined) {
                this.settings.backgroundColor = data.backgroundColor;
            }
            
            if (data.animationsEnabled !== undefined) {
                this.settings.animationsEnabled = data.animationsEnabled;
            }
            
            if (data.modelSettings) {
                this.settings.modelSettings = { ...this.settings.modelSettings, ...data.modelSettings };
            }
            
            this.updateFormValues();
        });
        
        // Listen for valid moves visibility changes
        eventBus.subscribe('validMoves:visibilityChanged', (data) => {
            this.settings.showValidMoves = data.visible;
            this.updateFormValues();
        });
        
        // Listen for theme select changes
        this.themeSelect.addEventListener('change', () => {
            this.loadAvailableQualities(this.themeSelect.value);
        });
    }
    
    /**
     * Open the settings modal
     */
    open() {
        // Fetch available model themes and qualities
        this.fetchModelOptions();
        
        // Update form values
        this.updateFormValues();
        
        // Show the modal
        this.modalElement.style.display = 'block';
    }
    
    /**
     * Close the settings modal
     */
    close() {
        this.modalElement.style.display = 'none';
    }
    
    /**
     * Load settings from API
     */
    loadSettings() {
        // Get board state (for visual settings)
        apiClient.request('getGameState')
            .then(state => {
                if (state.boardState) {
                    // Update settings from board state
                    this.settings.darkMode = !!state.boardState.darkMode;
                    this.settings.backgroundColor = state.boardState.backgroundColor || 'default';
                    this.settings.animationsEnabled = state.boardState.animationsEnabled !== false;
                    
                    if (state.boardState.modelSettings) {
                        this.settings.modelSettings = {
                            ...this.settings.modelSettings,
                            ...state.boardState.modelSettings
                        };
                    }
                }
                
                // Update UI
                this.updateFormValues();
            })
            .catch(error => {
                console.error('Failed to load settings:', error);
            });
        
        // Get current valid moves visibility
        apiClient.request('isValidMovesVisible')
            .then(result => {
                this.settings.showValidMoves = result.visible;
                this.updateFormValues();
            })
            .catch(error => {
                console.error('Failed to get valid moves visibility:', error);
            });
    }
    
    /**
     * Fetch available model themes and qualities
     */
    fetchModelOptions() {
        apiClient.request('getAvailableModelThemes')
            .then(options => {
                this.availableThemes = options.themes || Object.values(MODEL_THEMES);
                this.availableQualities = options.qualities || Object.values(MODEL_QUALITY);
                
                // Save current theme/quality
                const currentTheme = options.currentTheme || this.settings.modelSettings.theme;
                const currentQuality = options.currentQuality || this.settings.modelSettings.quality;
                
                this.updateModelOptions(currentTheme, currentQuality);
            })
            .catch(error => {
                console.error('Failed to get model options:', error);
                
                // Use hardcoded values if API fails
                this.availableThemes = Object.values(MODEL_THEMES);
                this.availableQualities = Object.values(MODEL_QUALITY);
                
                this.updateModelOptions(
                    this.settings.modelSettings.theme,
                    this.settings.modelSettings.quality
                );
            });
    }
    
    /**
     * Load available qualities for a theme
     * @param {string} theme - Model theme
     */
    loadAvailableQualities(theme) {
        apiClient.request('getAvailableModelThemes')
            .then(options => {
                // If theme is in the available themes, get qualities for it
                if (options.themes && options.themes.includes(theme)) {
                    this.availableQualities = options.qualities || Object.values(MODEL_QUALITY);
                    
                    // Save current quality
                    const currentQuality = options.currentQuality || this.settings.modelSettings.quality;
                    
                    // Update quality options
                    this.updateQualityOptions(currentQuality);
                }
            })
            .catch(error => {
                console.error('Failed to get qualities for theme:', error);
                
                // Use hardcoded values if API fails
                this.availableQualities = Object.values(MODEL_QUALITY);
                this.updateQualityOptions(this.settings.modelSettings.quality);
            });
    }
    
    /**
     * Update model theme and quality options
     * @param {string} currentTheme - Currently selected theme
     * @param {string} currentQuality - Currently selected quality
     */
    updateModelOptions(currentTheme, currentQuality) {
        // Clear existing options
        this.themeSelect.innerHTML = '';
        
        // Add theme options
        this.availableThemes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme;
            option.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
            
            // Set as selected if it matches current theme
            if (theme === currentTheme) {
                option.selected = true;
            }
            
            this.themeSelect.appendChild(option);
        });
        
        // Update quality options
        this.updateQualityOptions(currentQuality);
    }
    
    /**
     * Update quality options
     * @param {string} currentQuality - Currently selected quality
     */
    updateQualityOptions(currentQuality) {
        // Clear existing options
        this.qualitySelect.innerHTML = '';
        
        // Add quality options
        this.availableQualities.forEach(quality => {
            const option = document.createElement('option');
            option.value = quality;
            option.textContent = quality.charAt(0).toUpperCase() + quality.slice(1);
            
            // Set as selected if it matches current quality
            if (quality === currentQuality) {
                option.selected = true;
            }
            
            this.qualitySelect.appendChild(option);
        });
    }
    
    /**
     * Update form values from settings
     */
    updateFormValues() {
        // Update appearance settings
        this.darkModeToggle.checked = this.settings.darkMode;
        this.backgroundSelect.value = this.settings.backgroundColor;
        
        // Update game settings
        this.showValidMovesToggle.checked = this.settings.showValidMoves;
        this.animationsToggle.checked = this.settings.animationsEnabled;
        
        // Update model settings
        if (this.themeSelect.options.length > 0) {
            this.themeSelect.value = this.settings.modelSettings.theme;
        }
        
        if (this.qualitySelect.options.length > 0) {
            this.qualitySelect.value = this.settings.modelSettings.quality;
        }
        
        this.fallbackToggle.checked = this.settings.modelSettings.useFallbackIfLoadFails;
    }
    
    /**
     * Get form values and update settings
     */
    getFormValues() {
        // Get appearance settings
        this.settings.darkMode = this.darkModeToggle.checked;
        this.settings.backgroundColor = this.backgroundSelect.value;
        
        // Get game settings
        this.settings.showValidMoves = this.showValidMovesToggle.checked;
        this.settings.animationsEnabled = this.animationsToggle.checked;
        
        // Get model settings
        this.settings.modelSettings.theme = this.themeSelect.value;
        this.settings.modelSettings.quality = this.qualitySelect.value;
        this.settings.modelSettings.useFallbackIfLoadFails = this.fallbackToggle.checked;
    }
    
    /**
     * Save settings
     */
    saveSettings() {
        // Get form values
        this.getFormValues();
        
        // Apply appearance settings
        eventBus.publish('settings:changed', {
            darkMode: this.settings.darkMode,
            backgroundColor: this.settings.backgroundColor,
            animationsEnabled: this.settings.animationsEnabled,
            modelSettings: this.settings.modelSettings
        });
        
        // Apply game settings
        eventBus.publish('validMoves:visibilityChanged', {
            visible: this.settings.showValidMoves
        });
        
        // Close modal
        this.close();
    }
    
    /**
     * Reset settings to defaults
     */
    resetSettings() {
        // Reset to defaults
        this.settings = {
            darkMode: false,
            backgroundColor: 'default',
            showValidMoves: true,
            animationsEnabled: true,
            modelSettings: {
                theme: 'modern',
                quality: 'high',
                useFallbackIfLoadFails: true,
                showLoadingProgress: true
            }
        };
        
        // Update form values
        this.updateFormValues();
    }
    
    /**
     * Reload models with current settings
     */
    reloadModels() {
        // Get current values from form
        this.getFormValues();
        
        // Set reload flag
        this.settings.modelSettings.reload = true;
        
        // Apply settings
        eventBus.publish('settings:changed', {
            modelSettings: this.settings.modelSettings
        });
        
        // Clear reload flag
        this.settings.modelSettings.reload = false;
    }
} 