// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 600, resize: true });

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
  }
};

// Function to scan for icons in a page
async function scanForIcons(page) {
  const icons = [];

  async function traverse(node, parentName = null) {
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
        parent: parentName,
        link: `https://www.figma.com/file/${figma.fileKey}?node-id=${encodeURIComponent(node.id)}`
      };

      // If it's an instance, get the main component information
      if (node.type === 'INSTANCE' && node.mainComponent) {
        const mainComp = node.mainComponent;

        // Get library name
        let libraryName = 'Local Components';

        if (mainComp.remote && mainComp.key) {
          // For remote components, use importComponentByKeyAsync to get library info
          try {
            const importedNode = await figma.importComponentByKeyAsync(mainComp.key);

            // Now walk up from the imported node to get the document name
            let current = importedNode;
            while (current.parent) {
              current = current.parent;
            }

            // The root should be the DOCUMENT with the library file name
            if (current.type === 'DOCUMENT' && current.name) {
              libraryName = current.name;
            } else {
              libraryName = 'External Library';
            }

          } catch (e) {
            libraryName = 'External Library';
            console.log('Error getting library name:', e);
          }
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
        await traverse(child, node.name);
      }
    }
  }

  await traverse(page);
  return icons;
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

  // Check if it's a vector or boolean operation (common for icon graphics)
  const isVectorType = node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION' || node.type === 'STAR' || node.type === 'POLYGON' || node.type === 'ELLIPSE' || node.type === 'LINE';

  // Check if it's a frame/group with icon-like characteristics
  const isFrameOrGroup = node.type === 'FRAME' || node.type === 'GROUP';

  // Size-based heuristics (icons are typically small and square-ish)
  const maxSize = 200; // pixels
  const minSize = 8; // pixels
  const width = node.width;
  const height = node.height;
  const aspectRatio = width / height;
  const isSmallAndSquarish = width <= maxSize && height <= maxSize &&
                             width >= minSize && height >= minSize &&
                             aspectRatio >= 0.5 && aspectRatio <= 2;

  // Combine criteria
  if (nameMatchesPattern) {
    return true;
  }

  if (isComponentOrInstance && isSmallAndSquarish) {
    return true;
  }

  return false;
}
