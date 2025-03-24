# Hexaequo

A minimalist web interface for the board game Hexaequo. This implementation focuses on providing a clean, 3D visualization of the game board and pieces, with intuitive interactions for gameplay.

## Features

- 3D visualization of the hexagonal game board using Three.js
- Interactive gameplay with intuitive UI
- Support for all Hexaequo game rules
- Dark mode toggle
- Option to show valid moves
- Game state saved in session storage
- PWA support for offline play
- Responsive design for various screen sizes

## Game Rules

### Game Objective
To win a game of Hexaequo, a player must achieve one of the following:
1. Capture all of the opponent's Discs.
2. Capture all of the opponent's Rings.
3. Eliminate all of the opponent's pieces from the game board (the opponent has no active pieces remaining).

**Important Note:** The game ends in a draw ("Ex Aequo") if a player cannot make a move during their turn, or if the game state repeats three times.

### Brief Rules Overview
- Players take turns placing tiles, placing pieces, or moving pieces
- Tiles must be placed adjacent to at least two existing tiles
- Pieces (Discs and Rings) can only be placed on empty tiles of the player's color
- Discs can move to adjacent tiles or jump over pieces
- Rings move exactly two tiles away and can capture opponent pieces

For complete rules, see the Rules section in the application.

## Development

### Project Structure

- `index.html` - Main HTML file
- `src/` - Source code directory
  - `css/` - Stylesheets
  - `js/` - JavaScript files
    - `core/` - Game logic
    - `ui/` - User interface components
    - `utils/` - Utility functions

### Running the Project

Simply open the `index.html` file in a web browser. No build step is required as this project uses vanilla JavaScript.

For the best experience, it's recommended to run the project on a local web server. You can use tools like:

- [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension for Visual Studio Code
- Python's built-in HTTP server: `python -m http.server`
- Node.js [http-server](https://www.npmjs.com/package/http-server) package

### API Integration

The project includes a simple API interface for game state management, which could be used for future integration with server-side implementations for online play or AI opponents.

## Future Enhancements

- AI opponent
- Online multiplayer mode
- Enhanced visual effects
- Tutorials and strategy guides

## License

This project is for educational purposes only. The game Hexaequo concept and rules are the intellectual property of their respective owners. 