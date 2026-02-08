export class MapConverter {
  constructor(mapData) {
    this.mapData = mapData;
    this.portToNode = this.buildPortMap();
  }

  // port_id -> node_id (same as portObjects in Old.js)
  buildPortMap() {
    const map = {};
    for (const node of this.mapData.nodes) {
      for (const port of node.ports || []) {
        map[port.id] = node.id;
      }
    }
    return map;
  }

  // ShapeRegistry.getId with global replace
  static getImageId(shape) {
    return 'img-' + shape.replace(/\//g, '-').replace(/ /g, '-').replace(/_/g, '-');
  }

  convertNode(node) {
    return {
      type: 'noc.ImageIconElement',
      id: node.id,
      position: {
        x: node.x,
        y: node.y,
      },
      attrs: {
        icon: {
          href: '#' + MapConverter.getImageId(node.shape),
          width: String(node.shape_width),
          height: String(node.shape_height),
          status: 'Unknown',
        },
        title: {
          text: node.name,
        },
        ipaddr: {
          text: node.address || '',
        },
      },
    };
  }

  convertLink(link) {
    const srcId = this.portToNode[link.ports[0]];
    const dstId = this.portToNode[link.ports[1]];

    if (srcId === undefined || dstId === undefined) {
      return null;
    }

    return {
      type: 'noc.LinkElement',
      id: link.id,
      source: { id: srcId },
      target: { id: dstId },
      attrs: {
        connector: link.connector || 'normal',
        bw: link.bw,
        in_bw: link.in_bw,
        out_bw: link.out_bw,
        method: link.method,
      },
    };
  }

  convert() {
    const cells = [];

    for (const node of this.mapData.nodes) {
      cells.push(this.convertNode(node));
    }

    for (const link of this.mapData.links) {
      const cell = this.convertLink(link);
      if (cell) {
        cells.push(cell);
      }
    }

    return { cells };
  }
}
