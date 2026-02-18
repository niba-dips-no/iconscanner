# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Icon Scanner is a Figma plugin that identifies and lists icons within Figma documents. It uses heuristic-based detection to find icons by analyzing node properties like naming patterns, node types, sizes, and aspect ratios.

## Architecture

### Plugin Structure

The plugin follows Figma's standard plugin architecture with two execution contexts:

1. **Main Thread (`code.js`)**: Runs in Figma's plugin sandbox with full access to the Figma API
2. **UI Thread (`ui.html`)**: Runs in an iframe with UI rendering and user interaction

Communication between threads happens via `figma.ui.postMessage()` (main → UI) and `parent.postMessage()` (UI → main).

### Core Detection Logic

The `isLikelyIcon()` function (code.js:59-109) implements multi-criteria icon detection:

- **Name patterns**: Checks for common icon naming conventions using regex patterns (icon, ico-, ic_, etc.)
- **Node types**: Prioritizes COMPONENT, INSTANCE, COMPONENT_SET, VECTOR, BOOLEAN_OPERATION
- **Size constraints**: Icons are typically 8-200px and have aspect ratios between 0.5-2.0
- **Combined heuristics**: Uses AND/OR logic to balance precision and recall

Detection returns `true` when:
- Name matches any icon pattern (code.js:92-93)
- Is a component/instance AND meets size constraints (code.js:96-97)
- Other type-specific combinations (code.js:100-106)

### Scanning Process

The `scanForIcons()` function (code.js:27-56) recursively traverses the node tree:
- Starts from a given page node
- Checks each node with `isLikelyIcon()`
- Recursively processes children for nodes that have them
- Collects metadata: id, name, type, dimensions, page, parent

### Message Protocol

**UI → Main:**
- `scan-page`: Scan current page only
- `scan-document`: Scan all pages in document
- `select-node`: Select and focus a specific node by ID

**Main → UI:**
- `scan-results`: Returns array of icon objects with metadata

## File Structure

- `manifest.json`: Plugin configuration (API version, entry points, permissions)
- `code.js`: Main plugin logic running in Figma's plugin sandbox
- `ui.html`: Self-contained UI (HTML + CSS + JavaScript)

## Development

This plugin has no build process - it runs directly in Figma using the raw source files.

### Testing in Figma

1. Open Figma Desktop
2. Go to Plugins → Development → Import plugin from manifest
3. Select `manifest.json` from this directory
4. Run the plugin on a document with icons

### Modifying Detection Logic

To adjust icon detection sensitivity:
- Modify patterns in `iconNamePatterns` array (code.js:61-68)
- Adjust size constraints: `maxSize`, `minSize` (code.js:82-83)
- Change aspect ratio range (code.js:87-89)
- Update combined criteria logic (code.js:92-106)

### Common Node Types in Figma

- `COMPONENT`: Main component definition
- `INSTANCE`: Instance of a component
- `COMPONENT_SET`: Variant component set
- `VECTOR`: Vector path
- `BOOLEAN_OPERATION`: Combined vector shapes
- `FRAME`/`GROUP`: Container nodes
- `STAR`/`POLYGON`/`ELLIPSE`/`LINE`: Basic shapes

## Key Considerations

- The plugin has no network access (`allowedDomains: ["none"]`)
- All detection is heuristic-based - no AI or external APIs
- Scanning large documents can be slow due to recursive traversal
- Node selection requires handling page switching (code.js:19)
- The plugin uses async iteration for all Figma API operations
