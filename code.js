// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 600 });

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'scan-page') {
    const icons = await scanForIcons(figma.currentPage);
    figma.ui.postMessage({ type: 'scan-results', icons });
  } else if (msg.type === 'scan-document') {
    const allIcons = [];
    for (const page of figma.root.children) {
      const icons = await scanForIcons(page);
      allIcons.push(...icons);
    }
    figma.ui.postMessage({ type: 'scan-results', icons: allIcons });
  } else if (msg.type === 'resize') {
    figma.ui.resize(msg.width, msg.height);
  } else if (msg.type === 'select-node') {
    const node = await figma.getNodeByIdAsync(msg.id);
    if (node) {
      // Navigate to the node's page if needed
      let targetPage = figma.currentPage;

      // Walk up the parent tree to find the page
      let current = node.parent;
      while (current) {
        if (current.type === 'PAGE') {
          targetPage = current;
          break;
        }
        current = current.parent;
      }

      figma.currentPage = targetPage;
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
    } else {
      // Node not found - it might be in an external library
      figma.notify('Could not find node. It may be in an external library file.', { error: true });
    }
  } else if (msg.type === 'select-nodes') {
    const nodes = [];
    for (const id of msg.ids) {
      const node = await figma.getNodeByIdAsync(id);
      if (node) nodes.push(node);
    }
    if (nodes.length > 0) {
      // Navigate to the page of the first node
      let current = nodes[0].parent;
      while (current) {
        if (current.type === 'PAGE') {
          figma.currentPage = current;
          break;
        }
        current = current.parent;
      }
      figma.currentPage.selection = nodes;
      figma.viewport.scrollAndZoomIntoView(nodes);
      figma.notify(`Selected ${nodes.length} icon${nodes.length > 1 ? 's' : ''}`);
    }
  }
};

// Function to scan for icons in a page
async function scanForIcons(page) {
  const icons = [];

  async function traverse(node, parentName = null, parentId = null) {
    // Check if this node is likely an icon based on various criteria
    const isIcon = await isLikelyIcon(node);

    if (isIcon) {
      const iconData = {
        id: node.id,
        name: node.name,
        type: node.type,
        width: Math.round(node.width),
        height: Math.round(node.height),
        page: page.name,
        pageId: page.id,
        parent: parentName,
        parentId: parentId,
        link: `https://www.figma.com/file/${figma.fileKey}?node-id=${encodeURIComponent(node.id)}`,
        colors: extractColors(node, 5)
      };

      // If it's an instance, get the main component information
      if (node.type === 'INSTANCE') {
        let mainComp = null;
        try {
          mainComp = await node.getMainComponentAsync();
        } catch (e) {
          mainComp = node.mainComponent || null;
        }

        if (!mainComp) {
          icons.push(iconData);
          return;
        }

        // Get library name
        let libraryName = 'Local Components';

        if (mainComp.remote) {
          libraryName = 'External Library';
        }

        iconData.linkedFrom = {
          name: mainComp.name,
          id: mainComp.id,
          link: `https://www.figma.com/file/${figma.fileKey}?node-id=${encodeURIComponent(mainComp.id)}`,
          library: libraryName,
          isRemote: mainComp.remote || false
        };
        iconData.library = libraryName;
      } else if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
        iconData.library = 'Local Components';
      }

      icons.push(iconData);
      // Don't traverse children of detected icons to avoid duplicates
      return;
    }

    // Traverse children if the node has them
    if ('children' in node) {
      for (const child of node.children) {
        await traverse(child, node.name, node.id);
      }
    }
  }

  await traverse(page);
  return icons;
}

// Convert Figma RGB (0-1) to hex string
function rgbToHex(color) {
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  return '#' + r + g + b;
}

// Extract unique solid colors from a node and its children
function extractColors(node, maxColors) {
  const colors = new Set();

  function collect(n) {
    if (colors.size >= maxColors) return;

    const fills = n.fills;
    if (fills && Array.isArray(fills)) {
      for (const fill of fills) {
        if (fill.type === 'SOLID' && fill.visible !== false && fill.color) {
          colors.add(rgbToHex(fill.color));
        }
      }
    }

    const strokes = n.strokes;
    if (strokes && Array.isArray(strokes)) {
      for (const stroke of strokes) {
        if (stroke.type === 'SOLID' && stroke.visible !== false && stroke.color) {
          colors.add(rgbToHex(stroke.color));
        }
      }
    }

    if ('children' in n) {
      for (const child of n.children) {
        if (colors.size >= maxColors) return;
        collect(child);
      }
    }
  }

  collect(node);
  return Array.from(colors).slice(0, maxColors);
}

// Function to determine if a node is likely an icon
async function isLikelyIcon(node) {
  // Check by name patterns (common icon naming conventions)
  const iconNamePatterns = [
    /icon/i,
    /ico-/i,
    /-icon/i,
    /^ic_/i,
    /^icon_/i,
    /\.icon/i
  ];

  const nameMatchesPattern = iconNamePatterns.some(pattern => pattern.test(node.name));

  // Check if it's a component or instance (icons are often components)
  const isComponentOrInstance = node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'COMPONENT_SET';

  // Size-based heuristics (icons are typically small and square-ish)
  const maxSize = 200; // pixels
  const minSize = 8; // pixels
  const width = node.width;
  const height = node.height;
  const aspectRatio = width / height;
  const isSmallAndSquarish = width <= maxSize && height <= maxSize &&
                             width >= minSize && height >= minSize &&
                             aspectRatio >= 0.5 && aspectRatio <= 2;

  // Name matches icon pattern -> icon
  if (nameMatchesPattern) {
    return true;
  }

  // Small component/instance -> icon
  if (isComponentOrInstance && isSmallAndSquarish) {
    return true;
  }

  // Instance from a remote library that is small and squarish -> icon
  // This catches material icons, font awesome, etc. that don't have "icon" in name
  if (node.type === 'INSTANCE') {
    try {
      const mainComp = await node.getMainComponentAsync();
      if (mainComp && mainComp.remote && isSmallAndSquarish) {
        return true;
      }
    } catch (e) {
      // fallback: already covered by isComponentOrInstance check above
    }
  }

  // Frame/group that contains only vectors and is small -> likely an icon
  if ((node.type === 'FRAME' || node.type === 'GROUP') && isSmallAndSquarish && 'children' in node) {
    const children = node.children;
    if (children.length > 0 && children.length <= 20) {
      const allVectorLike = children.every(c =>
        c.type === 'VECTOR' || c.type === 'BOOLEAN_OPERATION' ||
        c.type === 'STAR' || c.type === 'POLYGON' ||
        c.type === 'ELLIPSE' || c.type === 'LINE' ||
        c.type === 'RECTANGLE' || c.type === 'FRAME' || c.type === 'GROUP'
      );
      if (allVectorLike) {
        return true;
      }
    }
  }

  return false;
}
