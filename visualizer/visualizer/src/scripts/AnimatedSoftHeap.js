import { CytoscapeFacade } from "./CytoscapeFacade";

class Item {
  constructor(key) {
    this.key = key;
    this.next = this;
  }
}

class Node {
  constructor() {}
}

let nil = new Node();
nil.set = nil;
nil.key = Infinity;
nil.rank = Infinity;
nil.left = nil;
nil.right = nil;
nil.next = nil;

class AnimatedSoftHeap {
  constructor(containerId, cyProps, epsilon) {
    this.epsilon = epsilon;
    this.T = Math.ceil(Math.log2(3 / epsilon));
    this.start = { x: 100, y: 100 };
    this.cf = new CytoscapeFacade(containerId, cyProps);
    this.numNodes = 0;
    this.numEdges = 0;
    this.numParents = 0;
    this.ptr = nil;
  }

  // make_heap() {
  //   return nil;
  // }

  defill(x, inserting) {
    this.fill(x, inserting);
    if (inserting && x.rank > this.T && x.rank % 2 == 0 && x.left != nil) {
      this.cf.updateData(x, "corrupt", true);
      this.fill(x, inserting);
    }
  }

  fill(x, inserting) {
    if (x.left != nil && x.right != nil && x.left.key > x.right.key) {
      this.cf.swapNodes(x.left, x.right);
      let tempEdge = x.cy.edges.left;
      x.cy.edges.left = x.cy.edges.right;
      x.cy.edges.right = tempEdge;

      let temp = x.left;
      x.left = x.right;
      x.right = temp;
    }

    x.key = x.left.key;

    // TODO: visualize
    if (x.set == null) {
      x.set = x.left.set;
    } else {
      let temp = x.set.next;
      x.set.next = x.left.set.next;
      x.left.set.next = temp;
      this.cf.updateDataQuietly(x, "corrupt", true);
    }

    this.cf.updateData(x, "key", x.left.key);

    x.left.set = null;

    if (x.left.left.key == Infinity) {
      if (x.right.cy) {
        this.cf.replaceNode(x.left, x.right);
      } else {
        this.cf.removeNode(x.left);
      }
      x.left = x.right;
      x.right = nil;
    } else {
      this.defill(x.left, inserting);
    }
  }

  rank_swap(H) {
    let x = H.next;
    if (H.rank <= x.rank) {
      return H;
    }

    if (x.next.key !== Infinity) {
      this.cf.moveEdge(H.cy.edges.next, H, x.next);
      this.cf.moveEdge(x.cy.edges.next, x, H);
    } else if (x.key === Infinity && H.key !== Infinity) {
      this.cf.removeEdge(H.cy.edges.next);
    }

    if (H.key !== Infinity) {
      this.cf.swapNodes(H, x);
    }

    H.next = x.next;
    x.next = H;
    return x;
  }

  key_swap(H) {
    let x = H.next;
    if (H.key < x.key) {
      return H;
    }

    if (x.next.key !== Infinity) {
      this.cf.moveEdge(H.cy.edges.next, H, x.next);
      this.cf.moveEdge(x.cy.edges.next, x, H);
    } else if (x.key === Infinity && H.key !== Infinity) {
      this.cf.removeEdge(H.cy.edges.next);
    }

    if (H.key !== Infinity) {
      this.cf.swapNodes(H, x);
    }

    H.next = x.next;
    x.next = H;
    return x;
  }

  reorder(H, k) {
    if (H.next.rank < k) {
      H = this.rank_swap(H);
      H.next = this.reorder(H.next, k);
    }
    return this.key_swap(H);
  }

  make_root(elem) {
    let x = new Node();
    elem.next = elem;
    x.set = elem;
    x.key = elem.key;
    x.rank = 0;
    x.left = nil;
    x.right = nil;
    x.next = nil;
    x.cy = {
      id: `n${this.numNodes++}`,
      position: {
        x: 100,
        y: 100,
      },
      edges: {
        left: null,
        right: null,
        next: null,
      },
    };

    this.cf.shiftAllNodes(100, 0);
    this.cf.addNode(x, {
      key: x.key,
      corrupt: false,
    });

    return x;
  }

  link(x, y) {
    let z = new Node();
    z.set = null;
    z.rank = x.rank + 1;
    z.left = x;
    z.right = y;

    z.cy = {
      id: `n${this.numNodes++}`,
      position: {
        x: Math.abs((x.cy.position.x + y.cy.position.x) / 2),
        y: x.cy.position.y,
      },
      edges: {
        left: `e${this.numEdges++}`,
        right: `e${this.numEdges++}`,
        next: null,
      },
      parent: `p${this.numParents++}`,
    };

    // this.cf.startSync();
    if (x.next && x.next.key !== Infinity) {
      this.cf.removeEdge(x.cy.edges.next);
    }
    if (y.next && y.next.key !== Infinity) {
      this.cf.removeEdge(y.cy.edges.next);
    }
    this.cf.shiftNode(x, 0, 50);
    this.cf.shiftNode(y, 0, 50);
    this.cf.addNodeById(z.cy.parent);
    this.cf.addNode(z, { parent: z.cy.parent });
    this.cf.moveNode(x, z.cy.parent);
    this.cf.moveNode(y, z.cy.parent);
    this.cf.addEdge(z.cy.edges.left, z, x);
    this.cf.addEdge(z.cy.edges.right, z, y);
    // this.cf.endSync();

    this.defill(z, true);
    return z;
  }

  meldable_insert(x, H) {
    if (x.rank < H.rank) {
      x.next = this.key_swap(H);
      // add an edge to the next node if that node is not nil
      if (H.key !== Infinity) {
        x.cy.edges.next = `e${this.numEdges++}`;
        this.cf.addEdge(x.cy.edges.next, x, H);
      }
      return x;
    }
    return this.meldable_insert(this.link(x, H), this.rank_swap(H.next));
  }

  meldable_meld(H1, H2) {
    if (H1.rank > H2.rank) {
      let temp = H1;
      H1 = H2;
      H2 = temp;
    }

    if (H2 == nil) {
      return H1;
    }

    this.meldable_insert(H1, this.meldable_meld(this.rank_swap(H1.next), H2));
  }

  find_min(H) {
    this.cf.highlightNode(H);
    return { item: H.set.next, key: H.key };
  }

  delete_min(H) {
    let elem = H.set.next;
    if (elem.next != elem) {
      H.set.next = elem.next;
      return H;
    } else {
      H.set = null;
      let k = H.rank;
      if (H.left.key === Infinity) {
        console.log(H);
        this.cf.removeNode(H);
        H = H.next;
      } else {
        this.defill(H, false);
      }
      H = this.reorder(H, k);
      return H;
    }
  }

  insert(elem, H) {
    H = this.key_swap(
      this.meldable_insert(this.make_root(elem), this.rank_swap(H))
    );
    return H;
  }

  meld(H1, H2) {
    return this.key_swap(
      this.meldable_meld(this.rank_swap(H1), this.rank_swap(H2))
    );
  }

  toggleAnimation() {
    this.cf.toggleAnimation();
  }
}

export { Item, AnimatedSoftHeap };
