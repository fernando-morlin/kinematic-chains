# Kinematic Chain Drawing Canvas

An interactive web application for creating, visualizing and manipulating kinematic chain diagrams.

## Features

- Draw and connect various types of links (binary, ternary, etc.)
- Connect joints to create kinematic chains
- Auto-snap connections when joints are dragged near each other
- Generate graph representations of the kinematic structure
- Import/export diagrams as JSON
- Interactive drag-and-drop manipulation

## Getting Started

1. Clone this repository
2. Open `index.html` in your browser
3. Start creating your kinematic chain:
   - Select a link type from the sidebar
   - Click "Add selected link" to place it on the canvas
   - Drag joints to connect them (they auto-snap when close)
   - Generate a graph representation with the "Generate graph representation" button

## Technologies Used

- HTML5 Canvas and SVG for drawing
- InteractJS for drag-and-drop functionality
- D3.js for graph visualization
- Vanilla JavaScript (ES6+)

## Project Structure

- `src/components/`: UI components and rendering logic
- `src/models/`: Data models for links and connections
- `src/utils/`: Utility functions for geometry, snapping, and file operations
- `assets/examples/`: Example JSON files

## License

MIT