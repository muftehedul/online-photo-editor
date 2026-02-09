# Online Photo Editor

A web-based photo editor with Photoshop-like features built with HTML5 Canvas, JavaScript, and CSS.

## Features

### Drawing Tools
- 🖌️ Brush - Freehand drawing
- 🧹 Eraser - Remove content
- ⬚ Selection - Select areas
- ✂️ Crop - Crop images with preview
- ↔️ Transform - Transform selections
- 🕐 History Brush - Paint from history
- ▭ Rectangle - Draw rectangles
- ○ Circle - Draw circles
- ╱ Line - Draw straight lines
- T Text - Add text
- 🪣 Fill - Fill areas with color

### Auto Enhance
- ✨ Auto Enhance - Automatic optimization
- Auto Contrast - Balance contrast
- Auto Color - Correct color balance

### Preset Filters (12)
- Grayscale, Sepia, Invert
- Vintage, Cold, Warm
- Dramatic, Vivid, Noir
- Sunset, Ocean, Cyberpunk

### Advanced Adjustments (12)
- Brightness, Contrast, Exposure
- Highlights, Shadows
- Saturation, Vibrance
- Temperature, Tint
- Sharpness, Blur, Vignette

### Layer System
- Multiple layers support
- Layer visibility toggle
- Add/delete layers
- Layer management panel

### Canvas Features
- Multi-tab canvas support
- Zoom in/out (10% - 300%)
- Zoom controls with percentage display
- Responsive canvas wrapper

### History & Undo
- Full undo/redo support (Ctrl+Z / Ctrl+Y)
- History panel with clickable states
- Jump to any previous state
- Action tracking

### Persistence
- LocalStorage integration
- Auto-save functionality
- Restore work on page reload
- Settings persistence

### Keyboard Shortcuts
- B - Brush
- E - Eraser
- S - Selection
- C - Crop
- T - Transform/Text
- H - History Brush
- R - Rectangle
- O - Circle
- L - Line
- F - Fill
- Ctrl+Z - Undo
- Ctrl+Y - Redo

## Usage

1. Open `index.html` in a web browser
2. Load an image or start drawing
3. Use tools from the left sidebar
4. Apply filters and adjustments from the right sidebar
5. Your work auto-saves to browser localStorage
6. Export your work using the Save button

## File Structure

```
├── index.html      # Main HTML structure
├── script.js       # Core editor functionality
├── style.css       # Styling and layout
├── filters.js      # Filter and adjustment algorithms
└── README.md       # Documentation
```

## Browser Compatibility

Works in all modern browsers that support:
- HTML5 Canvas
- LocalStorage
- ES6 JavaScript

## Features in Detail

### Crop Tool
- Click and drag to select crop area
- Dark overlay shows what will be removed
- Drag selection to reposition
- ✓ button to apply, ✕ to cancel

### Image Loading
- Automatic resize for large images (max 1200x800)
- Maintains aspect ratio
- Supports all common image formats

### LocalStorage
- Saves canvas content as PNG
- Stores last 10 history states
- Preserves tool settings
- Automatic save after actions

## Development

Built with vanilla JavaScript - no frameworks required.

## License

Open source - feel free to use and modify.

## Author

Created with Kiro AI Assistant
