# Icon Scanner

A Figma plugin that identifies and lists icons within your Figma documents using heuristic-based detection.

## Features

- **Scan current page or entire document** for icons
- **Search icons by name** with real-time filtering
- **Filter by library** (local components, external libraries)
- **Click to select** any icon in the canvas and zoom to it
- **Copy Figma links** to any detected icon
- **Navigate to main components** for library instances
- **Resizable window** to fit your workflow

## How It Works

Icon Scanner uses multi-criteria heuristics to detect icons:

- **Name patterns** - matches common naming conventions (`icon`, `ico-`, `ic_`, etc.)
- **Node types** - prioritizes components, instances, vectors, and boolean operations
- **Size constraints** - icons are typically 8-200px with near-square aspect ratios

## Installation

1. Open Figma Desktop
2. Go to **Plugins > Development > Import plugin from manifest**
3. Select `manifest.json` from this directory
4. Run the plugin from the Plugins menu

## File Structure

```
iconscanner/
├── manifest.json   # Plugin configuration
├── code.js         # Main thread - Figma API, scanning logic
├── ui.html         # UI thread - interface, search, filtering
└── CLAUDE.md       # AI assistant context
```

## Development

No build process required - edit the source files directly and reload the plugin in Figma.
