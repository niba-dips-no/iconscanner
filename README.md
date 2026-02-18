# Icon Scanner

A Figma plugin that identifies and lists icons within your Figma documents using heuristic-based detection.

## Features

- **Scan current page or entire document** for icons
- **Search icons by name** with real-time filtering
- **Filter by library** (local components, external libraries)
- **Filter by color** - multi-select color swatches built from actual icon colors
- **Select all similar icons** on a page at once for bulk updates
- **Click to select** any icon in the canvas and zoom to it
- **Clickable Page/Parent** navigation in icon details
- **Copy Figma links** to any detected icon
- **Navigate to main components** for library instances
- **Resizable window** via drag handle

## How It Works

Icon Scanner uses multi-criteria heuristics to detect icons:

- **Name patterns** - matches common naming conventions (`icon`, `ico-`, `ic_`, etc.)
- **Components and instances** - small, squarish components/instances (8-200px)
- **Remote library instances** - detects icons from external libraries (Material Icons, Font Awesome, etc.) regardless of naming
- **Vector-heavy frames** - small frames/groups containing only vector-like children

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
