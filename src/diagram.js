import JointAPI, { LinkElement, removeScalableBackground, setScalableBackground, setStencilDir, setupLinkHover, SnapManager, ViewportManager } from './joint/index.ts';

// Default paper configuration
// Paths that start with / need BASE_URL prepended if not root
function resolvePath(path) {
  if (!path) return path;
  if (path.startsWith('/') && import.meta.env.BASE_URL !== '/') {
    return import.meta.env.BASE_URL.replace(/\/$/, '') + path;
  }
  return path;
}

const DEFAULT_PAPER_CONFIG = {
  width: 3200,
  height: 1800,
  backgroundImage: null,
  backgroundOpacity: 0.3,
  stencilDir: '/stencils',
  gridSize: 10,
};

// Default color filters for status
const DEFAULT_FILTERS = {
  // Asbestos, #7f8c8d
  osUnknown: [127, 140, 141],
  // Emerald, #2ecc71
  osOk: [46, 204, 113],
  // Sunflower, #f1c40f
  osAlarm: [241, 196, 15],
  // #404040
  osUnreach: [64, 64, 64],
  // Pomegranate, #c0392b
  osDown: [192, 57, 43],
};

export class DiagramEditor {
  constructor(containerId, paperConfig = {}) {
    this.containerId = containerId;
    this.paperConfig = { ...DEFAULT_PAPER_CONFIG, ...paperConfig };

    // Resolve paths for stencil directory and background image
    let stencilPath = resolvePath(this.paperConfig.stencilDir);
    setStencilDir(stencilPath);
    
    const backgroundImagePath = resolvePath(this.paperConfig.backgroundImage);
    if (backgroundImagePath && backgroundImagePath !== this.paperConfig.backgroundImage) {
      this.paperConfig.backgroundImage = backgroundImagePath;
    }

    const containerEl = document.getElementById(containerId);

    this.paper = JointAPI.createPaper(
      containerEl,
      DEFAULT_FILTERS,
      {
        width: this.paperConfig.width,
        height: this.paperConfig.height,
        gridSize: this.paperConfig.gridSize,
        interactive: false, // Disable default interactions - we'll handle them manually
        drawGrid: true,
        // No CSS background - using SVG background instead for scaling
        defaultConnectionPoint: { name: 'boundary' },
        // ToDo test use viewport manager
        // Restrict element movement to current viewport (visible screen area)
        restrictTranslate: (elementView) => {
          const element = elementView.model;
          // Get icon size from attributes
          const iconAttrs = element.attr('icon') || {};
          const iconWidth = Number(iconAttrs.width) || 64;
          const iconHeight = Number(iconAttrs.height) || 64;

          // Calculate label height (label is below icon)
          // Label uses fontSize 12, can be multi-line
          // const titleText = element.attr('title/text') || '';
          // const lineCount = titleText ? titleText.split('\n').length : 1;
          // const labelHeight = lineCount * 12 + 4; // fontSize * lines + padding

          const elWidth = iconWidth;
          // const elHeight = iconHeight + labelHeight;
          const elHeight = iconHeight;

          // Get current viewport bounds in world coordinates
          // This is called dynamically, so it updates as viewport changes
          if (this.viewport) {
            const bounds = this.viewport.getState().bounds;
            // Add padding to prevent element from touching screen edge
            const padding = 5;
            return {
              x: bounds.x + padding,
              y: bounds.y + padding,
              width: bounds.width - elWidth - padding * 2,
              height: bounds.height + elHeight + padding * 2,
            };
          }

          // Fallback to paper bounds if viewport not initialized yet
          return {
            x: 0,
            y: 0,
            width: this.paperConfig.width - elWidth,
            height: this.paperConfig.height + elHeight,
          };
        },
      }
    );
    this.graph = this.paper.model;

    // JointJS sets inline width/height on paper.el, overriding CSS flex layout.
    // Clear them so flex: 1 controls the container size.
    containerEl.style.removeProperty('width');
    containerEl.style.removeProperty('height');

    // Set scalable SVG background (scales with zoom/pan)
    if (this.paperConfig.backgroundImage) {
      setScalableBackground(this.paper, this.viewport, {
        image: this.paperConfig.backgroundImage,
        width: this.paperConfig.width,
        height: this.paperConfig.height,
        opacity: this.paperConfig.backgroundOpacity,
      });
    }

    // Initialize ViewportManager
    this.viewport = new ViewportManager(this.paper, {
      paperWidth: this.paperConfig.width,
      paperHeight: this.paperConfig.height,
      minZoom: 0.1,
      maxZoom: 10,
      zoomStep: 0.1,
    });

    // Initialize SnapManager
    this.snap = new SnapManager(this.paper, {
      gridSize: this.paperConfig.gridSize,
      showGuides: true,
      guideColor: '#2196F3',
    });

    this.setupEvents();

    // After layout: set SVG to actual container size and fit content
    requestAnimationFrame(() => {
      this.paper.setDimensions(containerEl.clientWidth, containerEl.clientHeight);
      this.viewport.zoomToFit();
    });
  }

  setupEvents() {
    JointAPI.enablePanZoom(this.paper, {
      minZoom: 0.1,
      maxZoom: 10,
      zoomStep: 0.1,
      onViewportChange: () => this.viewport.notifyChange(),
    });

    // Setup link hover highlighters
    setupLinkHover(this.paper);

    this.paper.on('element:pointerdblclick', (elementView) => {
      const element = elementView.model;
      const currentText = element.attr('label/text') || 'Element';
      const newText = prompt('Введите текст:', currentText);
      if (newText !== null) {
        element.attr('label/text', newText);
      }
    });

    // Адаптивный размер и пересчёт viewport при resize
    window.addEventListener('resize', () => {
      // Clear JointJS inline dimensions so flex layout recomputes
      this.paper.el.style.removeProperty('width');
      this.paper.el.style.removeProperty('height');
      this.paper.setDimensions(this.paper.el.clientWidth, this.paper.el.clientHeight);
    });
  }

  /**
   * Update paper configuration and recreate paper if needed
   */
  updatePaperConfig(paperConfig) {
    this.paperConfig = { ...this.paperConfig, ...paperConfig };

    // Resolve paths for stencil directory and background image
    let stencilPath = resolvePath(this.paperConfig.stencilDir);
    setStencilDir(stencilPath);
    
    // Update background image with resolved path
    const backgroundImagePath = resolvePath(this.paperConfig.backgroundImage);
    if (backgroundImagePath && backgroundImagePath !== this.paperConfig.backgroundImage) {
      this.paperConfig.backgroundImage = backgroundImagePath;
    }

    // Update paper dimensions
    this.paper.setDimensions(this.paperConfig.width, this.paperConfig.height);

    // Update grid size
    if (this.paperConfig.gridSize) {
      this.paper.options.gridSize = this.paperConfig.gridSize;
    }

    // Update scalable background
    if (this.paperConfig.backgroundImage) {
      setScalableBackground(this.paper, this.viewport, {
        image: this.paperConfig.backgroundImage,
        width: this.paperConfig.width,
        height: this.paperConfig.height,
        opacity: this.paperConfig.backgroundOpacity,
      });
    } else {
      removeScalableBackground(this.paper);
    }

    // Update viewport manager dimensions (keep same instance to preserve listeners)
    this.viewport.updatePaperSize(this.paperConfig.width, this.paperConfig.height);
  }

  /**
   * Zoom to fit entire diagram in viewport
   */
  zoomToFit() {
    this.viewport.zoomToFit();
  }

  /**
   * Zoom in
   */
  zoomIn() {
    this.viewport.zoomIn();
  }

  /**
   * Zoom out
   */
  zoomOut() {
    this.viewport.zoomOut();
  }

  /**
   * Set zoom by percentage (100% = fit)
   */
  setZoom(percent) {
    this.viewport.setZoomPercent(percent);
  }

  /**
   * Get current zoom percentage
   */
  getZoom() {
    return this.viewport.getZoomPercent();
  }

  /**
   * Toggle snap mode (grid/free)
   */
  toggleSnap() {
    return this.snap.toggleMode();
  }

  /**
   * Set snap mode
   */
  setSnapMode(mode) {
    this.snap.setMode(mode);
  }

  /**
   * Get current snap mode
   */
  getSnapMode() {
    return this.snap.mode;
  }

  createElement(x, y, text = 'Element') {
    const rect = new JointAPI.shapes.standard.Rectangle();
    rect.position(x, y);
    rect.resize(100, 40);
    rect.attr({
      body: {
        fill: '#ffffff',
        stroke: '#333333',
        strokeWidth: 2
      },
      label: {
        text: text,
        fill: '#333333',
        fontSize: 14
      }
    });
    rect.addTo(this.graph);
    return rect;
  }

  createLink(source, target) {
    const link = new LinkElement();
    link.source(source);
    link.target(target);
    link.attr({
      line: {
        stroke: '#333333',
        strokeWidth: 2,
      }
    });
    link.set('z', -1);
    link.addTo(this.graph);
    return link;
  }

  clear() {
    removeScalableBackground(this.paper);
    this.graph.clear();
  }

  toJSON() {
    const graphJSON = this.graph.toJSON();
    const {x, y, width, height} = this.graph.getBBox().inflate(10);
    // Export in new format with paperConfig + graphData
    const result = {
      paperConfig: {...this.paperConfig, width, height},
      graphData: graphJSON,
    };
    return result;
  }

  /**
   * Load from JSON - supports both old format (cells array) and new format (paperConfig + graphData)
   */
  fromJSON(json) {
    this.graph.clear();

    // Check if new format with paperConfig
    if (json.paperConfig && json.graphData) {
      // Update paper config
      this.updatePaperConfig(json.paperConfig);
      // Load graph data
      this.graph.fromJSON(json.graphData);
    } else {
      // Old format - just cells array
      // Calculate paper dimensions from element positions
      const bounds = this.viewport.calculateBoundsFromCells(json.cells || []);

      if (bounds) {
        const padding = 200; // Add padding around content
        this.updatePaperConfig({
          backgroundImage: null, // Clear background for old format
          width: bounds.maxX - bounds.minX + padding * 2,
          height: bounds.maxY - bounds.minY + padding * 2,
        });
      }

      this.graph.fromJSON(json);
    }

    // After layout: resize SVG and fit content
    requestAnimationFrame(() => {
      this.paper.el.style.removeProperty('width');
      this.paper.el.style.removeProperty('height');
      this.paper.setDimensions(this.paper.el.clientWidth, this.paper.el.clientHeight);
      this.viewport.zoomToFit();
    });
  }

  async loadFromFile(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    this.fromJSON(data);
  }

  exportToFile(filename = 'diagram.json') {
    const data = JSON.stringify(this.toJSON(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Демо-данные
  createDemo() {
    this.clear();
    const el1 = this.createElement(100, 100, 'Start');
    const el2 = this.createElement(300, 100, 'Process');
    const el3 = this.createElement(500, 100, 'End');

    this.createLink(el1, el2);
    this.createLink(el2, el3);
  }
}
