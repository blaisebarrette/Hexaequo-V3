/**
 * ModalManager - Component for handling game modals
 * 
 * This component manages the game modals, such as settings, rules,
 * new game confirmation, and notifications.
 */
import { eventBus } from '../../api/eventBus.js';
import { apiClient } from '../../api/apiClient.js';

/**
 * ModalManager class
 */
export class ModalManager {
    /**
     * Constructor
     * @param {HTMLElement} container - The container element for this component
     */
    constructor(container) {
        this.container = container;
        
        if (!this.container) {
            console.error('Modal container not found');
            return;
        }
        
        // Initialize state
        this.activeModal = null;
        this.settings = null;
        
        // Create modal elements
        this.createElements();
        
        // Load settings
        this.loadSettings();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    /**
     * Create modal elements
     */
    createElements() {
        // Create modal overlay
        this.modalOverlay = document.createElement('div');
        this.modalOverlay.className = 'modal-overlay';
        this.modalOverlay.addEventListener('click', (e) => {
            // Close modal when clicking outside modal content
            if (e.target === this.modalOverlay) {
                this.closeModal();
            }
        });
        this.container.appendChild(this.modalOverlay);
        
        // Create modals container
        this.modalsContainer = document.createElement('div');
        this.modalsContainer.className = 'modals-container';
        this.modalOverlay.appendChild(this.modalsContainer);
        
        // Create settings modal
        this.createSettingsModal();
        
        // Create rules modal
        this.createRulesModal();
        
        // Create notification modal
        this.createNotificationModal();
        
        // Create confirmation modal
        this.createConfirmationModal();
    }
    
    /**
     * Create settings modal
     */
    createSettingsModal() {
        // Settings modal
        this.settingsModal = document.createElement('div');
        this.settingsModal.className = 'modal settings-modal';
        this.settingsModal.dataset.modal = 'settings';
        this.modalsContainer.appendChild(this.settingsModal);
        
        // Modal header
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        this.settingsModal.appendChild(modalHeader);
        
        // Modal title
        const modalTitle = document.createElement('h2');
        modalTitle.className = 'modal-title';
        modalTitle.textContent = 'Settings';
        modalHeader.appendChild(modalTitle);
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => this.closeModal());
        modalHeader.appendChild(closeButton);
        
        // Modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        this.settingsModal.appendChild(modalContent);
        
        // Settings form
        const settingsForm = document.createElement('form');
        settingsForm.className = 'settings-form';
        modalContent.appendChild(settingsForm);
        
        // Dark mode setting
        const darkModeGroup = document.createElement('div');
        darkModeGroup.className = 'settings-group';
        settingsForm.appendChild(darkModeGroup);
        
        const darkModeLabel = document.createElement('label');
        darkModeLabel.htmlFor = 'dark-mode';
        darkModeLabel.textContent = 'Dark Mode';
        darkModeGroup.appendChild(darkModeLabel);
        
        this.darkModeToggle = document.createElement('input');
        this.darkModeToggle.type = 'checkbox';
        this.darkModeToggle.id = 'dark-mode';
        this.darkModeToggle.className = 'settings-toggle';
        darkModeGroup.appendChild(this.darkModeToggle);
        
        // Animations setting
        const animationsGroup = document.createElement('div');
        animationsGroup.className = 'settings-group';
        settingsForm.appendChild(animationsGroup);
        
        const animationsLabel = document.createElement('label');
        animationsLabel.htmlFor = 'animations';
        animationsLabel.textContent = 'Animations';
        animationsGroup.appendChild(animationsLabel);
        
        this.animationsToggle = document.createElement('input');
        this.animationsToggle.type = 'checkbox';
        this.animationsToggle.id = 'animations';
        this.animationsToggle.className = 'settings-toggle';
        animationsGroup.appendChild(this.animationsToggle);
        
        // Sound setting
        const soundGroup = document.createElement('div');
        soundGroup.className = 'settings-group';
        settingsForm.appendChild(soundGroup);
        
        const soundLabel = document.createElement('label');
        soundLabel.htmlFor = 'sound';
        soundLabel.textContent = 'Sound';
        soundGroup.appendChild(soundLabel);
        
        this.soundToggle = document.createElement('input');
        this.soundToggle.type = 'checkbox';
        this.soundToggle.id = 'sound';
        this.soundToggle.className = 'settings-toggle';
        soundGroup.appendChild(this.soundToggle);
        
        // Modal footer
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        this.settingsModal.appendChild(modalFooter);
        
        // Save button
        const saveButton = document.createElement('button');
        saveButton.className = 'modal-button save';
        saveButton.textContent = 'Save';
        saveButton.addEventListener('click', () => this.saveSettings());
        modalFooter.appendChild(saveButton);
    }
    
    /**
     * Create rules modal
     */
    createRulesModal() {
        // Rules modal
        this.rulesModal = document.createElement('div');
        this.rulesModal.className = 'modal rules-modal';
        this.rulesModal.dataset.modal = 'rules';
        this.modalsContainer.appendChild(this.rulesModal);
        
        // Modal header
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        this.rulesModal.appendChild(modalHeader);
        
        // Modal title
        const modalTitle = document.createElement('h2');
        modalTitle.className = 'modal-title';
        modalTitle.textContent = 'Game Rules';
        modalHeader.appendChild(modalTitle);
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => this.closeModal());
        modalHeader.appendChild(closeButton);
        
        // Modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        this.rulesModal.appendChild(modalContent);
        
        // Rules content
        const rulesContent = document.createElement('div');
        rulesContent.className = 'rules-content';
        modalContent.appendChild(rulesContent);
        
        // Rules text (example)
        rulesContent.innerHTML = `
            <h3>Game Objective</h3>
            <p>The goal of Hexaequo is to create connected patterns on the hexagonal board while blocking your opponent.</p>
            
            <h3>Game Components</h3>
            <ul>
                <li><strong>Hexagonal Tiles:</strong> Used to expand the board.</li>
                <li><strong>Discs:</strong> Basic playing pieces that can be placed on empty spaces.</li>
                <li><strong>Rings:</strong> Special pieces that can capture opponent pieces.</li>
            </ul>
            
            <h3>Turn Structure</h3>
            <p>On your turn, you must do one of the following actions:</p>
            <ol>
                <li>Place a tile to expand the board</li>
                <li>Place a disc or ring on an empty space</li>
                <li>Move one of your pieces to an adjacent empty space</li>
            </ol>
            
            <h3>Winning</h3>
            <p>You win by creating connected lines of your pieces or by capturing enough of your opponent's pieces.</p>
        `;
        
        // Modal footer
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        this.rulesModal.appendChild(modalFooter);
        
        // Close button
        const closeButton2 = document.createElement('button');
        closeButton2.className = 'modal-button close';
        closeButton2.textContent = 'Close';
        closeButton2.addEventListener('click', () => this.closeModal());
        modalFooter.appendChild(closeButton2);
    }
    
    /**
     * Create notification modal
     */
    createNotificationModal() {
        // Notification modal
        this.notificationModal = document.createElement('div');
        this.notificationModal.className = 'modal notification-modal';
        this.notificationModal.dataset.modal = 'notification';
        this.modalsContainer.appendChild(this.notificationModal);
        
        // Modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        this.notificationModal.appendChild(modalContent);
        
        // Notification message
        this.notificationMessage = document.createElement('p');
        this.notificationMessage.className = 'notification-message';
        modalContent.appendChild(this.notificationMessage);
        
        // Modal footer
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        this.notificationModal.appendChild(modalFooter);
        
        // OK button
        const okButton = document.createElement('button');
        okButton.className = 'modal-button ok';
        okButton.textContent = 'OK';
        okButton.addEventListener('click', () => this.closeModal());
        modalFooter.appendChild(okButton);
    }
    
    /**
     * Create confirmation modal
     */
    createConfirmationModal() {
        // Confirmation modal
        this.confirmationModal = document.createElement('div');
        this.confirmationModal.className = 'modal confirmation-modal';
        this.confirmationModal.dataset.modal = 'confirmation';
        this.modalsContainer.appendChild(this.confirmationModal);
        
        // Modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        this.confirmationModal.appendChild(modalContent);
        
        // Confirmation message
        this.confirmationMessage = document.createElement('p');
        this.confirmationMessage.className = 'confirmation-message';
        modalContent.appendChild(this.confirmationMessage);
        
        // Modal footer
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        this.confirmationModal.appendChild(modalFooter);
        
        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.className = 'modal-button cancel';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => {
            this.closeModal();
            if (this.onConfirmCancel) {
                this.onConfirmCancel();
            }
        });
        modalFooter.appendChild(cancelButton);
        
        // Confirm button
        const confirmButton = document.createElement('button');
        confirmButton.className = 'modal-button confirm';
        confirmButton.textContent = 'Confirm';
        confirmButton.addEventListener('click', () => {
            this.closeModal();
            if (this.onConfirmAccept) {
                this.onConfirmAccept();
            }
        });
        modalFooter.appendChild(confirmButton);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for modal show events
        eventBus.subscribe('ui:showModal', (data) => {
            if (data.modal === 'settings') {
                this.showSettingsModal();
            } else if (data.modal === 'rules') {
                this.showRulesModal();
            } else if (data.modal === 'notification') {
                this.showNotification(data.message);
            } else if (data.modal === 'confirmation') {
                this.showConfirmation(data.message, data.onConfirm, data.onCancel);
            }
        });
        
        // Listen for settings changes
        eventBus.subscribe('settings:changed', (settings) => {
            this.updateSettingsUI(settings);
        });
    }
    
    /**
     * Show settings modal
     */
    showSettingsModal() {
        this.showModal('settings');
    }
    
    /**
     * Show rules modal
     */
    showRulesModal() {
        this.showModal('rules');
    }
    
    /**
     * Show notification
     * @param {string} message - Notification message
     */
    showNotification(message) {
        this.notificationMessage.textContent = message;
        this.showModal('notification');
    }
    
    /**
     * Show confirmation
     * @param {string} message - Confirmation message
     * @param {Function} onConfirm - Callback when confirmed
     * @param {Function} onCancel - Callback when cancelled
     */
    showConfirmation(message, onConfirm, onCancel) {
        this.confirmationMessage.textContent = message;
        this.onConfirmAccept = onConfirm;
        this.onConfirmCancel = onCancel;
        this.showModal('confirmation');
    }
    
    /**
     * Show modal
     * @param {string} modalName - Modal to show
     */
    showModal(modalName) {
        // Hide all modals
        const modals = this.modalsContainer.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
        
        // Show specified modal
        const modal = this.modalsContainer.querySelector(`.modal[data-modal="${modalName}"]`);
        if (modal) {
            modal.classList.add('active');
            this.modalOverlay.classList.add('active');
            this.activeModal = modalName;
        }
    }
    
    /**
     * Close modal
     */
    closeModal() {
        // Hide all modals
        const modals = this.modalsContainer.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
        
        // Hide overlay
        this.modalOverlay.classList.remove('active');
        this.activeModal = null;
    }
    
    /**
     * Load settings
     */
    async loadSettings() {
        try {
            // Get settings from local storage
            const settings = localStorage.getItem('hexaequo_settings');
            if (settings) {
                this.settings = JSON.parse(settings);
            } else {
                // Use default settings
                this.settings = {
                    darkMode: true,
                    animations: true,
                    sound: true
                };
            }
            
            // Update UI
            this.updateSettingsUI(this.settings);
            
            // Publish settings loaded event
            eventBus.publish('settings:loaded', this.settings);
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }
    
    /**
     * Save settings
     */
    saveSettings() {
        // Get settings from UI
        const settings = {
            darkMode: this.darkModeToggle.checked,
            animations: this.animationsToggle.checked,
            sound: this.soundToggle.checked
        };
        
        // Save settings
        try {
            localStorage.setItem('hexaequo_settings', JSON.stringify(settings));
            this.settings = settings;
            
            // Publish settings changed event
            eventBus.publish('settings:changed', settings);
            
            // Show success notification
            this.showNotification('Settings saved successfully');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showNotification('Failed to save settings');
        }
    }
    
    /**
     * Update settings UI
     * @param {Object} settings - Settings object
     */
    updateSettingsUI(settings) {
        if (!settings) return;
        
        // Update toggles
        if (settings.darkMode !== undefined) {
            this.darkModeToggle.checked = settings.darkMode;
        }
        
        if (settings.animations !== undefined) {
            this.animationsToggle.checked = settings.animations;
        }
        
        if (settings.sound !== undefined) {
            this.soundToggle.checked = settings.sound;
        }
    }
}