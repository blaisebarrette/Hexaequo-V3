/**
 * Loading Overlay Component
 * Displays a loading overlay with progress during 3D model loading
 */
import { eventBus } from '../../api/eventBus.js';

export class LoadingOverlay {
    /**
     * Constructor
     * @param {HTMLElement} container - The container element to append the overlay to
     */
    constructor(container) {
        this.container = container;
        this.visible = false;
        this.progress = 0;
        this.loadedItems = 0;
        this.totalItems = 0;
        this.failedItems = [];
        
        // Create overlay element
        this.createOverlay();
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Create the overlay DOM elements
     */
    createOverlay() {
        // Create overlay container
        this.overlay = document.createElement('div');
        this.overlay.className = 'loading-overlay';
        this.container.appendChild(this.overlay);
        
        // Create loading spinner
        this.spinner = document.createElement('div');
        this.spinner.className = 'loading-spinner';
        this.overlay.appendChild(this.spinner);
        
        // Create progress indicator
        this.progressElement = document.createElement('div');
        this.progressElement.className = 'loading-progress';
        this.progressElement.textContent = 'Loading 3D models... 0%';
        this.overlay.appendChild(this.progressElement);
        
        // Create message element
        this.messageElement = document.createElement('div');
        this.messageElement.className = 'loading-message';
        this.messageElement.textContent = 'Preparing game assets...';
        this.overlay.appendChild(this.messageElement);
    }
    
    /**
     * Set up event listeners for model loading events
     */
    setupEventListeners() {
        // Listen for model load progress updates
        eventBus.subscribe('board:modelLoadProgress', (data) => {
            this.updateProgress(data);
        });
        
        // Listen for individual model load progress
        eventBus.subscribe('board:modelLoadItemProgress', (data) => {
            this.updateItemProgress(data);
        });
        
        // Listen for models loaded event (completion)
        eventBus.subscribe('board:modelsLoaded', (data) => {
            this.handleModelsLoaded(data);
        });
        
        // Listen for model retry completion
        eventBus.subscribe('board:modelRetryComplete', (data) => {
            this.handleRetryComplete(data);
        });
    }
    
    /**
     * Show the loading overlay
     */
    show() {
        if (!this.visible) {
            this.visible = true;
            this.overlay.classList.add('active');
        }
    }
    
    /**
     * Hide the loading overlay
     */
    hide() {
        if (this.visible) {
            this.visible = false;
            this.overlay.classList.remove('active');
        }
    }
    
    /**
     * Update progress based on loaded models
     * @param {Object} data - Progress data
     */
    updateProgress(data) {
        const { loaded, total, progress, name } = data;
        
        // Show overlay if not already visible
        this.show();
        
        // Update progress tracking
        this.loadedItems = loaded;
        this.totalItems = total;
        this.progress = progress;
        
        // Update progress text
        const percentage = Math.round(progress * 100);
        this.progressElement.textContent = `Loading 3D models... ${percentage}%`;
        
        // Update message
        this.messageElement.textContent = `Loaded ${name} (${loaded}/${total})`;
    }
    
    /**
     * Update progress for individual model loading
     * @param {Object} data - Item progress data
     */
    updateItemProgress(data) {
        const { name, progress } = data;
        
        // Update message with current item progress
        this.messageElement.textContent = `Loading ${name}... ${progress}%`;
    }
    
    /**
     * Handle models loaded event
     * @param {Object} data - Models loaded data
     */
    handleModelsLoaded(data) {
        const { success, failedModels } = data;
        
        if (success) {
            // All models loaded successfully
            this.messageElement.textContent = 'All models loaded successfully!';
            
            // Hide overlay after a short delay
            setTimeout(() => {
                this.hide();
            }, 1000);
        } else {
            // Some models failed to load
            this.failedItems = failedModels;
            
            const failCount = failedModels.length;
            this.messageElement.textContent = `${failCount} models failed to load. Using fallback geometries.`;
            
            // Update progress to show completion
            this.progressElement.textContent = 'Loading complete with errors';
            
            // Hide overlay after a longer delay so user can see the message
            setTimeout(() => {
                this.hide();
            }, 3000);
        }
    }
    
    /**
     * Handle model retry completion
     * @param {Object} data - Retry completion data
     */
    handleRetryComplete(data) {
        const { retried, succeeded, failed } = data;
        
        if (retried > 0) {
            this.show();
            
            if (succeeded === retried) {
                // All retries succeeded
                this.messageElement.textContent = `Successfully reloaded all ${succeeded} models!`;
            } else {
                // Some retries failed
                this.messageElement.textContent = `Reloaded ${succeeded}/${retried} models. ${failed} failed.`;
            }
            
            // Hide overlay after a delay
            setTimeout(() => {
                this.hide();
            }, 2000);
        }
    }
} 