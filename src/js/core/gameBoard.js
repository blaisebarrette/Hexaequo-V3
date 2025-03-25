/**
 * GameBoard - Manages the hexagonal grid system and game interactions
 * Uses axial (q,r) coordinates for the hex grid
 */
export class GameBoard {
    constructor(gameState, renderer) {
        this.gameState = gameState;
        this.renderer = renderer;
        
        // Event callback references
        this.onClickHandler = this.onClick.bind(this);
        
        // Initialize interaction
        this.setupInteractions();
    }
    
    setupInteractions() {
        // Add click handler to the renderer's DOM element
        this.renderer.domElement.addEventListener('click', this.onClickHandler);
    }
    
    /**
     * Convert screen coordinates to hex grid coordinates
     * @param {number} x - Screen x coordinate
     * @param {number} y - Screen y coordinate
     * @returns {Object|null} - Hex coordinates {q, r} or null if no valid hex
     */
    screenToHex(x, y) {
        // This will be implemented in the renderer which handles the 3D scene
        return this.renderer.screenToHex(x, y);
    }
    
    /**
     * Handle click events on the game board
     * @param {Event} event - The click event
     */
    async onClick(event) {
        // Get mouse position relative to the canvas
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        console.log('Click detected');
        
        // First check if we clicked on icon buttons (cancel, validate, disc, ring)
        if (this.renderer.isCancelClicked(x, y)) {
            console.log('Cancel button clicked');
            this.cancelAction();
            return;
        } else if (this.renderer.isValidateClicked(x, y)) {
            console.log('Validate button clicked');
            
            if (this.gameState.currentAction === 'place_tile') {
                // For tile placement confirmation
                console.log('Validating tile placement');
                
                // Find the selected hex coordinates from temp tile model
                const tempTile = this.renderer.tempTileModel;
                if (tempTile && tempTile.userData) {
                    this.finalizeTilePlacement(tempTile.userData.q, tempTile.userData.r);
                }
                return;
            } else if (this.gameState.currentAction === 'place_piece') {
                // For piece placement confirmation
                console.log('Validating piece placement');
                
                // Check if we have a selected piece type
                if (this.gameState.selectedPiece && this.gameState.selectedPiece.type) {
                    const selectedPiece = this.gameState.selectedPiece;
                    console.log('Selected piece for validation:', selectedPiece);
                    
                    if (selectedPiece.q !== undefined && selectedPiece.r !== undefined) {
                        this.finalizePiecePlacement(
                            selectedPiece.q,
                            selectedPiece.r,
                            selectedPiece.type
                        );
                    } else {
                        console.warn('Selected piece does not have valid coordinates', selectedPiece);
                        
                        // Try to get coordinates from the tempPieceModel
                        if (this.renderer.tempPieceModel && this.renderer.tempPieceModel.userData) {
                            const userData = this.renderer.tempPieceModel.userData;
                            console.log('Found piece data from tempPieceModel:', userData);
                            
                            if (userData.q !== undefined && userData.r !== undefined && userData.pieceType) {
                                this.finalizePiecePlacement(
                                    userData.q,
                                    userData.r,
                                    userData.pieceType
                                );
                            }
                        }
                    }
                } else {
                    console.warn('No piece type selected for validation');
                    
                    // Try to get info from tempPieceModel as a fallback
                    if (this.renderer.tempPieceModel && this.renderer.tempPieceModel.userData) {
                        const userData = this.renderer.tempPieceModel.userData;
                        console.log('Found piece data from tempPieceModel:', userData);
                        
                        if (userData.q !== undefined && userData.r !== undefined && userData.pieceType) {
                            this.finalizePiecePlacement(
                                userData.q,
                                userData.r,
                                userData.pieceType
                            );
                        }
                    } else {
                        // Check for temp-piece reference in UI group
                        const tempPiece = this.renderer.uiGroup.children.find(
                            child => child.userData && child.userData.type === 'temp-piece'
                        );
                        
                        if (tempPiece && tempPiece.userData) {
                            console.log('Found temp-piece reference:', tempPiece.userData);
                            
                            // If we have temp-piece but no type, use 'disc' as default when only disc is available
                            const currentPlayer = this.gameState.currentPlayer;
                            const canPlaceDisc = this.gameState.pieces[currentPlayer].discsAvailable > 0;
                            const canPlaceRing = this.gameState.pieces[currentPlayer].ringsAvailable > 0 &&
                                               this.gameState.pieces[currentPlayer].discsCaptured > 0;
                            
                            if (canPlaceDisc && !canPlaceRing) {
                                this.finalizePiecePlacement(
                                    tempPiece.userData.q,
                                    tempPiece.userData.r,
                                    'disc'
                                );
                            } else if (!canPlaceDisc && canPlaceRing) {
                                this.finalizePiecePlacement(
                                    tempPiece.userData.q,
                                    tempPiece.userData.r,
                                    'ring'
                                );
                            }
                        }
                    }
                }
                
                return;
            } else if (this.gameState.currentAction === 'move_piece') {
                // For piece movement confirmation
                console.log('Validating piece movement');
                
                // First clear UI elements to drop the piece back to its resting position
                this.renderer.clearActionUI(true);
                
                // Update the board to show the piece in its final position
                this.renderer.updateBoard();
                
                // End the turn
                this.gameState.endTurn();
                return;
            }
        } else if (this.renderer.isDiscClicked(x, y)) {
            console.log('Disc button clicked');
            if (this.gameState.currentAction === 'place_piece') {
                console.log('Current action is place_piece - looking for coordinates');
                
                // Get the clicked disc model for animation
                const discModel = this.renderer.isDiscClicked(x, y);
                
                // Find the coordinates from the temporary piece
                const tempPiece = this.renderer.uiGroup.children.find(
                    child => child.userData && child.userData.type === 'temp-piece'
                );
                
                if (tempPiece && discModel && discModel !== true) {
                    console.log(`Found temp piece at (${tempPiece.userData.q}, ${tempPiece.userData.r})`);
                    const position = this.renderer.hexToWorld(tempPiece.userData.q, tempPiece.userData.r);
                    
                    // First animate the piece selection
                    this.renderer.animatePieceSelection(discModel, position, 'disc')
                        .then(() => {
                            // Then hide the other piece option
                            const ringModel = this.renderer.uiGroup.children.find(
                                child => child.userData && 
                                        child.userData.type === 'ui-icon' && 
                                        child.userData.pieceType === 'ring'
                            );
                            
                            if (ringModel) {
                                ringModel.visible = false;
                            }
                            
                            // Show the validation UI
                            this.renderer.showValidationUI(tempPiece.userData.q, tempPiece.userData.r);
                            
                            // Update selected piece type
                            this.gameState.selectedPiece = { 
                                type: 'disc', 
                                q: tempPiece.userData.q, 
                                r: tempPiece.userData.r,
                                color: tempPiece.userData.color
                            };
                        });
                    return;
                } else {
                    console.log('No temp piece or disc model found, checking selectedPiece');
                    // If there's no temp piece yet, get coords from the selected tile
                    const selectedTile = this.gameState.selectedPiece;
                    if (selectedTile && selectedTile.q !== undefined && selectedTile.r !== undefined) {
                        console.log(`Found selectedPiece at (${selectedTile.q}, ${selectedTile.r})`);
                        this.finalizePiecePlacement(selectedTile.q, selectedTile.r, 'disc');
                        return;
                    }
                }
                
                // Try to find coordinates from UI group userData
                console.log('Searching UI group for any object with coordinates');
                const pieceUI = this.renderer.uiGroup.children.find(
                    child => child.userData && child.userData.q !== undefined && child.userData.r !== undefined
                );
                
                if (pieceUI) {
                    console.log(`Found UI element with coordinates at (${pieceUI.userData.q}, ${pieceUI.userData.r})`);
                    this.finalizePiecePlacement(pieceUI.userData.q, pieceUI.userData.r, 'disc');
                }
                return;
            }
        } else if (this.renderer.isRingClicked(x, y)) {
            console.log('Ring button clicked');
            if (this.gameState.currentAction === 'place_piece') {
                console.log('Current action is place_piece - looking for coordinates');
                
                // Get the clicked ring model for animation
                const ringModel = this.renderer.isRingClicked(x, y);
                
                // Find the coordinates from the temporary piece
                const tempPiece = this.renderer.uiGroup.children.find(
                    child => child.userData && child.userData.type === 'temp-piece'
                );
                
                if (tempPiece && ringModel && ringModel !== true) {
                    console.log(`Found temp piece at (${tempPiece.userData.q}, ${tempPiece.userData.r})`);
                    const position = this.renderer.hexToWorld(tempPiece.userData.q, tempPiece.userData.r);
                    
                    // First animate the piece selection
                    this.renderer.animatePieceSelection(ringModel, position, 'ring')
                        .then(() => {
                            // Then hide the other piece option
                            const discModel = this.renderer.uiGroup.children.find(
                                child => child.userData && 
                                        child.userData.type === 'ui-icon' && 
                                        child.userData.pieceType === 'disc'
                            );
                            
                            if (discModel) {
                                discModel.visible = false;
                            }
                            
                            // Show the validation UI
                            this.renderer.showValidationUI(tempPiece.userData.q, tempPiece.userData.r);
                            
                            // Update selected piece type
                            this.gameState.selectedPiece = { 
                                type: 'ring', 
                                q: tempPiece.userData.q, 
                                r: tempPiece.userData.r,
                                color: tempPiece.userData.color
                            };
                        });
                    return;
                } else {
                    console.log('No temp piece or ring model found, checking selectedPiece');
                    // If there's no temp piece yet, get coords from the selected tile
                    const selectedTile = this.gameState.selectedPiece;
                    if (selectedTile && selectedTile.q !== undefined && selectedTile.r !== undefined) {
                        console.log(`Found selectedPiece at (${selectedTile.q}, ${selectedTile.r})`);
                        this.finalizePiecePlacement(selectedTile.q, selectedTile.r, 'ring');
                        return;
                    }
                }
                
                // Try to find coordinates from UI group userData
                console.log('Searching UI group for any object with coordinates');
                const pieceUI = this.renderer.uiGroup.children.find(
                    child => child.userData && child.userData.q !== undefined && child.userData.r !== undefined
                );
                
                if (pieceUI) {
                    console.log(`Found UI element with coordinates at (${pieceUI.userData.q}, ${pieceUI.userData.r})`);
                    this.finalizePiecePlacement(pieceUI.userData.q, pieceUI.userData.r, 'ring');
                }
                return;
            }
        }
        
        // Check if we clicked on other UI controls
        if (this.renderer.checkUIClick(x, y)) {
            console.log('UI element clicked');
            return; // UI element was clicked, don't process as board click
        }
        
        // Convert screen coordinates to hex grid coordinates
        const hex = this.screenToHex(x, y);
        if (!hex) {
            console.log('Click did not hit a valid hex');
            return; // Click didn't hit a valid hex
        }
        
        console.log(`Clicked on hex (${hex.q}, ${hex.r})`, hex);
        
        // Check if we clicked on a valid action indicator
        const isValidActionIndicator = hex.action !== undefined;
        console.log(`Is valid action indicator: ${isValidActionIndicator}`);
        
        // Get the current state of the game
        const currentPlayer = this.gameState.currentPlayer;
        const currentAction = this.gameState.currentAction;
        console.log(`Current player: ${currentPlayer}, Current action: ${currentAction}`);
        
        // Handle the click based on the current action
        if (!currentAction) {
            // No action in progress - start a new action
            if (isValidActionIndicator) {
                console.log(`Processing valid action indicator: ${hex.action}`);
                // Handle click on valid action indicator
                if (hex.action === 'place_tile') {
                    this.gameState.currentAction = 'place_tile';
                    this.renderer.showTilePlacementUI(hex.q, hex.r, currentPlayer);
                } else if (hex.action === 'place_piece') {
                    this.gameState.currentAction = 'place_piece';
                    this.renderer.showPiecePlacementUI(
                        hex.q, hex.r, currentPlayer, 
                        hex.canPlaceDisc, hex.canPlaceRing
                    );
                } else if (hex.action === 'move_piece') {
                    this.gameState.currentAction = 'move_piece';
                    
                    // Save the current game state before the move
                    this.gameState.saveGameState();
                    
                    this.gameState.selectedPiece = { 
                        q: hex.sourceQ, 
                        r: hex.sourceR, 
                        type: hex.pieceType 
                    };
                    
                    // Get valid moves for the piece
                    const validMoves = this.gameState.getValidMoves(hex.sourceQ, hex.sourceR);
                    this.renderer.showPieceMovementUI(hex.sourceQ, hex.sourceR, validMoves);
                }
            } else {
                console.log(`Regular click, starting action with startAction(${hex.q}, ${hex.r})`);
                // Regular click - use the existing startAction method
                this.startAction(hex.q, hex.r);
            }
        } else if (currentAction === 'place_tile') {
            // Player is placing a tile - handle validation or cancellation
            // Already handled at the beginning of this function
        } else if (currentAction === 'place_piece') {
            // Player is placing a piece - handle piece selection, validation, or cancellation
            // Already handled at the beginning of this function
        } else if (currentAction === 'move_piece') {
            // Handle piece movement selection
            if (isValidActionIndicator && hex.action === 'move_piece') {
                // Player clicked on a valid move indicator
                const selectedPiece = this.gameState.selectedPiece;
                
                if (selectedPiece) {
                    console.log('Selected piece before move:', selectedPiece);
                    
                    // Ensure we have the color of the piece
                    const fromKey = `${selectedPiece.q},${selectedPiece.r}`;
                    const sourceTile = this.gameState.board.tiles[fromKey];
                    const pieceColor = sourceTile && sourceTile.piece ? sourceTile.piece.color : this.gameState.currentPlayer;
                    
                    // Clear valid move indicators first
                    this.renderer.clearValidMoveIndicators();
                    
                    // Animate the piece movement
                    await this.renderer.animatePieceMovement(
                        selectedPiece.q,
                        selectedPiece.r,
                        hex.q,
                        hex.r
                    );
                    
                    // Then update the game state with the move
                    const success = this.gameState.movePiece(
                        selectedPiece.q,
                        selectedPiece.r,
                        hex.q,
                        hex.r
                    );
                    
                    if (success) {
                        // Log piece info before and after the move
                        console.log('Moved piece:', selectedPiece);
                        const tileKey = `${hex.q},${hex.r}`;
                        const pieceAfterMove = this.gameState.board.tiles[tileKey].piece;
                        console.log('Piece after move:', pieceAfterMove);
                        
                        // If it's a disc that has moved, check for further jumps
                        if (selectedPiece.type === 'disc') {
                            const allValidMoves = this.gameState.getValidMoves(hex.q, hex.r);
                            
                            // After a jump, only show other jumps (not adjacent moves)
                            // Get only jumps (moves that are not adjacent)
                            const furtherJumps = allValidMoves.filter(move => 
                                !this.gameState.isAdjacentMove(hex.q, hex.r, move.q, move.r)
                            );
                            
                            // Only continue if there are jump moves available
                            if (furtherJumps.length > 0) {
                                console.log('Further jumps available:', furtherJumps);
                                // Update the selected piece for further jumps
                                this.gameState.selectedPiece = { 
                                    q: hex.q, 
                                    r: hex.r,
                                    type: 'disc',
                                    color: pieceColor
                                };
                                
                                // First show validation UI to make both cancel and validate visible
                                this.renderer.showValidationUI(hex.q, hex.r);
                                
                                // Then show movement UI for the new position with further jumps
                                // but with a flag to keep both icons visible
                                this.renderer.showFurtherJumpUI(hex.q, hex.r, furtherJumps);
                                return;
                            }
                        }
                        
                        // Always show validation UI after a piece is moved 
                        // (not just for further jumps)
                        this.gameState.selectedPiece = { 
                            q: hex.q, 
                            r: hex.r,
                            type: selectedPiece.type,
                            color: pieceColor
                        };
                        this.renderer.showValidationUI(hex.q, hex.r);
                        
                        // Note: We don't automatically end the turn anymore
                        // The player must click "Validate" to end their turn
                    }
                }
            } else {
                // Regular click on the board while moving a piece (unchanged)
                const selectedPiece = this.gameState.selectedPiece;
                if (selectedPiece) {
                    const validMoves = this.gameState.getValidMoves(selectedPiece.q, selectedPiece.r);
                    const isMoveValid = validMoves.some(move => move.q === hex.q && move.r === hex.r);
                    
                    if (isMoveValid) {
                        console.log('Selected piece before move:', selectedPiece);
                        
                        // Ensure we have the color of the piece
                        const fromKey = `${selectedPiece.q},${selectedPiece.r}`;
                        const sourceTile = this.gameState.board.tiles[fromKey];
                        const pieceColor = sourceTile && sourceTile.piece ? sourceTile.piece.color : this.gameState.currentPlayer;
                        
                        // Clear valid move indicators first
                        this.renderer.clearValidMoveIndicators();
                        
                        // Animate the piece movement
                        await this.renderer.animatePieceMovement(
                            selectedPiece.q,
                            selectedPiece.r,
                            hex.q,
                            hex.r
                        );
                        
                        // Then update the game state with the move
                        const success = this.gameState.movePiece(
                            selectedPiece.q, 
                            selectedPiece.r, 
                            hex.q, 
                            hex.r
                        );
                        
                        if (success) {
                            // Log piece info before and after the move
                            console.log('Moved piece:', selectedPiece);
                            const tileKey = `${hex.q},${hex.r}`;
                            const pieceAfterMove = this.gameState.board.tiles[tileKey].piece;
                            console.log('Piece after move:', pieceAfterMove);
                            
                            // If it's a disc that has moved, check for further jumps
                            if (selectedPiece.type === 'disc') {
                                const allValidMoves = this.gameState.getValidMoves(hex.q, hex.r);
                                
                                // After a jump, only show other jumps (not adjacent moves)
                                // Get only jumps (moves that are not adjacent)
                                const furtherJumps = allValidMoves.filter(move => 
                                    !this.gameState.isAdjacentMove(hex.q, hex.r, move.q, move.r)
                                );
                                
                                // Only continue if there are jump moves available
                                if (furtherJumps.length > 0) {
                                    console.log('Further jumps available:', furtherJumps);
                                    // Update the selected piece for further jumps
                                    this.gameState.selectedPiece = { 
                                        q: hex.q, 
                                        r: hex.r,
                                        type: 'disc',
                                        color: pieceColor
                                    };
                                    
                                    // First show validation UI to make both cancel and validate visible
                                    this.renderer.showValidationUI(hex.q, hex.r);
                                    
                                    // Then show movement UI for the new position with further jumps
                                    // but with a flag to keep both icons visible
                                    this.renderer.showFurtherJumpUI(hex.q, hex.r, furtherJumps);
                                    return;
                                }
                            }
                            
                            // Always show validation UI after a piece is moved 
                            // (not just for further jumps)
                            this.gameState.selectedPiece = { 
                                q: hex.q, 
                                r: hex.r,
                                type: selectedPiece.type,
                                color: pieceColor
                            };
                            this.renderer.showValidationUI(hex.q, hex.r);
                            
                            // Note: We don't automatically end the turn anymore
                            // The player must click "Validate" to end their turn
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Start a new action at the specified coordinates
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     */
    async startAction(q, r) {
        const key = `${q},${r}`;
        const currentPlayer = this.gameState.currentPlayer;
        const tile = this.gameState.board.tiles[key];
        
        // Case 1: Click on a valid tile placement
        if (this.gameState.pieces[currentPlayer].tilesAvailable > 0) {
            const validTilePlacements = this.gameState.getValidTilePlacements(currentPlayer);
            const isValidPlacement = validTilePlacements.some(placement => 
                placement.q === q && placement.r === r
            );
            
            if (isValidPlacement) {
                console.log('Case 1: Valid tile placement');
                this.gameState.currentAction = 'place_tile';
                this.gameState.selectedTile = { q, r };
                this.renderer.showTilePlacementUI(q, r, currentPlayer);
                return;
            }
        }
        
        // Case 2: Click on a valid piece placement
        if (tile && tile.color === currentPlayer && !tile.piece) {
            const canPlaceDisc = this.gameState.pieces[currentPlayer].discsAvailable > 0;
            const canPlaceRing = this.gameState.pieces[currentPlayer].ringsAvailable > 0 &&
                                this.gameState.pieces[currentPlayer].discsCaptured > 0;
            
            if (canPlaceDisc || canPlaceRing) {
                console.log('Case 2: Valid piece placement');
                this.gameState.currentAction = 'place_piece';
                this.gameState.selectedPiece = { q, r };
                this.renderer.showPiecePlacementUI(q, r, currentPlayer, canPlaceDisc, canPlaceRing);
                return;
            }
        }
        
        // Case 3: Click on the player's own piece to move it
        if (tile && tile.piece && tile.piece.color === currentPlayer) {
            console.log(`Case 3: Piece movement - piece: ${JSON.stringify(tile.piece)}`);
            const validMoves = this.gameState.getValidMoves(q, r);
            
            console.log(`Valid moves found: ${validMoves.length}`);
            
            if (validMoves.length > 0) {
                // Show the piece movement UI
                this.gameState.currentAction = 'move_piece';
                
                // Save the current game state before the move
                this.gameState.saveGameState();
                
                this.gameState.selectedPiece = { q, r, type: tile.piece.type };
                await this.renderer.showPieceMovementUI(q, r, validMoves);
                return;
            } else {
                console.log('No valid moves for this piece');
            }
        } else {
            console.log('Not a valid piece to move');
        }
        
        console.log('No valid action found for this click');
    }
    
    /**
     * Cancel the current action
     */
    cancelAction() {
        // Store the current action for reference
        const previousAction = this.gameState.currentAction;
        const selectedPiece = this.gameState.selectedPiece;

        // If we were in the process of moving a piece, restore the saved game state
        if (previousAction === 'move_piece') {
            console.log('Cancelling move piece action, restoring original state');
            // Restore the game state from before the move
            this.gameState.restoreGameState();
            
            // Ensure currentAction and selectedPiece are explicitly reset
            this.gameState.currentAction = null;
            this.gameState.selectedPiece = null;
        } else {
            // For other actions, just reset the current state
            // Reset game state
            this.gameState.currentAction = null;
            this.gameState.selectedPiece = null;
        }
        
        // Clear UI elements with animation for dropping piece
        this.renderer.clearActionUI(true);
        
        // Explicitly update the visual board to match the game state
        this.renderer.updateBoard();
        
        // Show valid action placeholders for the new turn
        this.renderer.showValidActionPlaceholders();
    }
    
    /**
     * Finalize a tile placement action
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     */
    async finalizeTilePlacement(q, r) {
        const currentPlayer = this.gameState.currentPlayer;
        
        // Log for debugging purposes
        console.log(`Finalizing tile placement at (${q}, ${r}) for player ${currentPlayer}`);
        
        const success = this.gameState.placeTile(q, r, currentPlayer);
        
        if (success) {
            console.log('Tile placement successful, ending turn');
            
            // Clear UI elements first
            this.gameState.currentAction = null;
            
            // Animate the tile placement
            await this.renderer.animateTilePlacement(q, r, currentPlayer);
            
            // Clear remaining UI elements
            this.renderer.clearActionUI();
            
            // End the turn
            this.gameState.endTurn();
            
            // Valid action placeholders will be updated via the state change callback in UIManager
        } else {
            console.log('Tile placement failed, cancelling action');
            this.cancelAction();
        }
    }
    
    /**
     * Finalize a piece placement action
     * @param {number} q - Hex q coordinate
     * @param {number} r - Hex r coordinate
     * @param {string} pieceType - 'disc' or 'ring'
     */
    async finalizePiecePlacement(q, r, pieceType) {
        const currentPlayer = this.gameState.currentPlayer;
        
        // Log for debugging purposes
        console.log(`Finalizing ${pieceType} placement at (${q}, ${r}) for player ${currentPlayer}`);
        
        const success = this.gameState.placePiece(q, r, currentPlayer, pieceType);
        
        if (success) {
            console.log('Piece placement successful, ending turn');
            
            // Clear UI elements first
            this.gameState.currentAction = null;
            
            // Animate the piece placement
            await this.renderer.animatePiecePlacement(q, r, currentPlayer, pieceType);
            
            // Clear remaining UI elements
            this.renderer.clearActionUI();
            
            // End the turn
            this.gameState.endTurn();
            
            // Valid action placeholders will be updated via the state change callback in UIManager
        } else {
            console.log('Piece placement failed, cancelling action');
            this.cancelAction();
        }
    }
    
    /**
     * Clean up resources when the game board is no longer needed
     */
    destroy() {
        // Remove event listeners
        this.renderer.domElement.removeEventListener('click', this.onClickHandler);
    }
} 