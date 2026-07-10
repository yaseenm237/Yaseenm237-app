/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A basic structure for spatial indexing to speed up KNN searches
// This will be useful for our Hybrid Grid + Vector algorithm

export type Point = {
  x: number;
  y: number;
  rectId: string; // WasteRect ki ID taaki hum wapas us par aa sakein
  w: number;      // Width of the waste rect
  h: number;      // Height of the waste rect
};

export class KDNode {
  point: Point;
  left: KDNode | null = null;
  right: KDNode | null = null;
  axis: 'x' | 'y';

  constructor(point: Point, axis: 'x' | 'y') {
    this.point = point;
    this.axis = axis;
  }
}

export class KDTree {
  root: KDNode | null = null;

  // Insert points (WasteRect Centroids)
  insert(point: Point) {
    this.root = this._insert(this.root, point, 'x');
  }

  private _insert(node: KDNode | null, point: Point, axis: 'x' | 'y'): KDNode {
    if (!node) return new KDNode(point, axis);

    const nextAxis = axis === 'x' ? 'y' : 'x';
    if (point[axis] < node.point[axis]) {
      node.left = this._insert(node.left, point, nextAxis);
    } else {
      node.right = this._insert(node.right, point, nextAxis);
    }
    return node;
  }

  // Nearest Neighbor Search (KNN core)
  findNearest(targetX: number, targetY: number): Point | null {
    let best: Point | null = null;
    let minDistance = Infinity;

    const search = (node: KDNode | null) => {
      if (!node) return;

      const d2 = Math.pow(node.point.x - targetX, 2) + Math.pow(node.point.y - targetY, 2);
      if (d2 < minDistance) {
        minDistance = d2;
        best = node.point;
      }

      const axis = node.axis;
      const diff = (targetX - node.point.x) * (axis === 'x' ? 1 : 0) + (targetY - node.point.y) * (axis === 'y' ? 1 : 0);

      // Recursive search strategy
      const near = diff < 0 ? node.left : node.right;
      const far = diff < 0 ? node.right : node.left;

      search(near);
      if (Math.pow(diff, 2) < minDistance) {
        search(far);
      }
    };

    search(this.root);
    return best;
  }
}
