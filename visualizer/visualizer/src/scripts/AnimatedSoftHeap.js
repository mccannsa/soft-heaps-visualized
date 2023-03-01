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

  async defill(x, inserting) {
    await this.fill(x, inserting);
    if (inserting && x.rank > this.T && x.rank % 2 == 0 && x.left != nil) {
      this.cf.updateData(x, "corrupt", true);
      await this.fill(x, inserting);
    }
  }

  async fill(x, inserting) {
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
      await this.defill(x.left, inserting);
    }
  }

  async rank_swap(H) {
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

  async key_swap(H) {
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

  async reorder(H, k) {
    if (H.next.rank < k) {
      H = await this.rank_swap(H);
      H.next = await this.reorder(H.next, k);
    }
    return this.key_swap(H);
  }

  async make_root(elem) {
    let x = new Node();
    elem.next = elem;
    x.set = elem;
    x.key = elem.key;
    x.rank = 0;
    x.left = nil;
    x.right = nil;
    x.next = nil;
    x.cy = {};

    await this.cf.shiftAllNodes(100, 0);
    let id = await this.cf.addNode(100, 100, {
      key: x.key,
      corrupt: false
    });

    if (id === -1) return Promise.reject('addfail');

    x.cy.id = id;
    return Promise.resolve(x);
  }

  async link(x, y) {
    let z = new Node();
    z.set = null;
    z.rank = x.rank + 1;
    z.left = x;
    z.right = y;

    z.cy = {
      id: null,
      edges: {
        left: null,
        right: null,
        next: null,
      },
      parent: null
    };

    let zPos = {
      x: this.cf.getNodePosition(z.left.cy.id).x + this.cf.getNodePosition(z.right.cy.id).y / 2,
      y: this.cf.getNodePosition(z.left.cy.id).x,
    }

    this.cf.shiftNode(x.cy.id, 0, 50);
    await this.cf.shiftNode(y.cy.id, 0, 50);

    z.cy.parent = await this.cf.addCompoundNode();
    z.cy.id = await this.cf.addNode(zPos.x, zPos.y, { parent: z.cy.parent });

    this.cf.moveNode(z.left.cy.id, z.cy.parent);
    this.cf.moveNode(z.right.cy.id, z.cy.parent);
    z.cy.edges.left = this.cf.addEdge(z.cy.id, z.left.cy.id);
    z.cy.edges.right = await this.cf.addEdge(z.cy.id, z.right.cy.id);

    await this.defill(z, true);
    return z;
  }

  async meldable_insert(x, H) {
    if (x.rank < H.rank) {
      x.next = await this.key_swap(H);
      // add an edge to the next node if that node is not nil
      if (H.key !== Infinity) {
        x.cy.edges.next = `e${this.numEdges++}`;
        this.cf.addEdge(x.cy.edges.next, x, H);
      }
      return x;
    }
    console.log(x.key);
    console.log(H.key);
    return await this.meldable_insert(await this.link(x, H), await this.rank_swap(H.next));
  }

  async meldable_meld(H1, H2) {
    if (H1.rank > H2.rank) {
      let temp = H1;
      H1 = H2;
      H2 = temp;
    }

    if (H2 == nil) {
      return H1;
    }

    return await this.meldable_insert(H1, await this.meldable_meld(await this.rank_swap(H1.next), H2));
  }

  find_min(H) {
    this.cf.highlightNode(H);
    return { item: H.set.next, key: H.key };
  }

  async delete_min(H) {
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
        await this.defill(H, false);
      }
      H = await this.reorder(H, k);
      return H;
    }
  }

  async insert(elem, H) {
    H = await this.key_swap(
      await this.meldable_insert(await this.make_root(elem), await this.rank_swap(H))
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
