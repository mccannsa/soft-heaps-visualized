import cytoscape from "cytoscape";

class CytoscapeFacade {
  constructor(containerId, props) {
    this.cy = cytoscape(
      Object.assign(
        {
          container: document.getElementById(containerId),
          elements: [],
        },
        props
      )
    );
    this.numNodes = 0;
    this.numEdges = 0;
    this.queue = [];
    this.isReady = true;
    this.duration = 500; // animation duration in milliseconds
    this.intervalId = setInterval(() => {
      this.run();
    }, 1);
    this.numParents = 0;
    this.animate = true;
  }

  async addEdge(sourceId, targetId) {
    let id = `e${this.numEdges++}`;
    console.log(`adding edge ${id}`);
    let eles = this.cy.add({
      group: "edges",
      data: { id: id, source: sourceId, target: targetId }
    })

    if (eles.length > 0) {
      return Promise.resolve(id);
    }
    return Promise.reject(-1);
  }

  async addCompoundNode() {
    let id = `n${this.numNodes++}`;
    let eles = this.cy.add({
      group: "nodes",
      data: { id: id, isParent: true }
    });
    
    if (eles.length > 0)
      return Promise.resolve(id);

    return Promise.reject(-1);
  }

  async addNode(x = 0, y = 0, props = {}) {
    let id = `n${this.numNodes++}`;
    console.log(`adding node ${id}`);
    let eles = this.cy.add({
      group: "nodes",
      data: Object.assign({ id: id }, props),
      position: { x: x, y: y },
    });

    if (eles.length > 0) {
      await this.highlightNode(id);
      return Promise.resolve(id);
    }
    return Promise.reject(-1);
  }

  addNodeById(id) {
    this.queueAnimation(() => {
      this.cy.add({
        group: "nodes",
        data: {id: id}
      });
      this.isReady = true;
    })
  }

  doubleSpeed() {
    this.duration /= 2;
  }

  getNode(node) {
    return this.cy.$(`node#${node.cy.id}`);
  }

  getNodeById(id) {
    this.cy.$(`node#${id}`);
  }

  async getNodePosition(id) {
    return this.cy.$(`node#${id}`).position();
  }

  getNodesWith(properties) {}

  halveSpeed() {
    this.duration *= 2;
  }

  async highlightNode(id, options = {}) {
    let node = this.cy.$(`node#${id}`);
    let ani = node.animation(Object.assign({
      style: {
        "background-color": "orchid"
      },
      duration: this.duration
    }, options));

    return ani.play().promise('complete').then(() => {
      ani.reverse().play().promise('complete').then(() => {
        return;
      });
    });
  }

  /*
  highlightNode(node, props = {}) {
    let cyNode = this.getNode(node);
    let options = undefined;
    if (cyNode.data("corrupt")) {
      options = {
        style: {
          "background-color": "black",
        },
        duration: this.duration,
        complete: () => {
          cyNode.animate({
            style: {
              "background-color": "red",
            },
            duration: this.duration,
            complete: () => {
              // this.updateNodeLayout(node);
              this.isReady = true;
              console.log("queue ready");
            },
          });
        },
      };
    } else {
      options = {
        style: {
          "background-color": "orchid",
        },
        duration: this.duration,
        complete: () => {
          cyNode.animate({
            style: {
              "background-color": "lavender",
            },
            duration: this.duration,
            complete: () => {
              // this.updateNodeLayout(node);
              this.isReady = true;
              console.log("queue ready");
            },
          });
        },
      };
    }

    options = Object.assign(options, props);
    cyNode.animate(options);
  }
  */

  moveEdge(id, source, target) {
    this.queueAnimation(() => {
      console.log(
        `moving edge ${id}: new source node ${source.cy.id}, new target node ${target.cy.id}`
      );
      this.cy.$(`edge#${id}`).move(source.cy.id, target.cy.id);
      this.isReady = true;
    });
  }

  async moveNode(nodeId, parentId) {
    let node = this.cy.$(`node#${nodeId}`);
    if (node.parent().length > 0) {
      node = node.parent();
    }
    node.move({ parent: parentId });
    return Promise.resolve(parentId);
  }

  pushAnimation(animation) {
    this.queue.unshift(
      this.cy.animation({
        complete: () => animation(),
      })
    );
  }

  queueAnimation(animation) {
    this.queue.push(
      this.cy.animation({
        complete: () => animation(),
      })
    );
  }

  async removeNode(id) {
    console.log(`removing node ${id}`);
    let parent = this.cy.$(`node#${id}`).parent();
    this.cy.remove(`node#${id}`);
    if (parent.children("[id ^= 'n']").length === 0) {
      this.cy.remove(`node#${parent.data("id")}`)
    }
  }

  removeEdge(id) {
    this.queueAnimation(() => {
      console.log(`removing edge ${id}`);
      this.cy.remove(`edge#${id}`);
      this.isReady = true;
    });
  }

  async replaceNode(n1Id, n2Id) {
    console.log(`replacing node ${n1Id} with node ${n2Id}`);
    let n1 = this.cy.$(`node#${n1Id}`);
    if (n1.parent().length > 0) {
      n1 = n1.parent();
    }
    let options = {
      position: { x: n1.position("x"), y: n1.position("y") },
    };
    this.cy.remove(`node#${n1Id}`);
    await this.shiftNodeTo(n2Id, options.position.x, options.position.y);
  }

  run() {
    if (this.animate && this.isReady && this.queue.length > 0) {
      this.isReady = false;
      this.queue.shift().play();
    }
  }

  async shiftAllNodes(x, y) {
      console.log("shifting all nodes");
      let options = {
        name: "preset",
        fit: false, // whether to fit to viewport
        animate: true, // whether to transition the node positions
        animationDuration: this.duration, // duration of animation in ms if enabled
        transform: function (node, position) {
          position.x = position.x + x;
          position.y = position.y + y;
          return position;
        }
      };
      return this.cy.layout(options).run().promiseOn('layoutstop').then(() => {
        return true;
      });
  }

  async shiftNode(id, x, y) {
    let node = this.cy.$(`node#${id}`);
    let pos = {
      x: node.position('x') + x,
      y: node.position('y') + y
    };
    let ani = node.animation({
      position: pos,
      duration: this.duration
    });
    node.addClass("highlighted");
    return ani.play().promise('completed').then(() => {
      // node.position('x', node.position('x') + x);
      // node.position('y', node.position('y') + y);
      node.removeClass("highlighted");
      return pos;
    })
  }

  async shiftNodeTo(id, x, y) {
    console.log(`shifting node ${id}`);
    let options = {
      position: { x: x, y: y },
    };
    let node = this.cy.$(`node#${id}`);
    let ani = node.animation(options);
    return ani.play().promise('complete').then(() => {
      return true;
    })
  }

  async swapNodes(n1Id, n2Id) {
    console.log(`swapping nodes ${n1Id} and ${n2Id}`);
    let n1 = this.cy.$(`node#${n1Id}`)
    let n2 = this.cy.$(`node#${n2Id}`);

    if (n1.parent().length > 0) {
      n1 = n1.parent();
    }
    if (n2.parent().length > 0) {
      n2 = n2.parent();
    }

    let n1Pos = await this.getNodePosition(n1Id);
    let n2Pos = await this.getNodePosition(n2Id);

    console.log(n1Pos);
    console.log(n2Pos);

    await this.shiftNodeTo(n1Id, n2Pos.x, n2Pos.y);
    await this.shiftNodeTo(n2Id, n1Pos.x, n1Pos.y);
    return { n1: await this.getNodePosition(n1Id), n2: await this.getNodePosition(n2Id) }
  }

  toggleAnimation() {
    this.animate = !this.animate;
    console.log(`toggle ${this.animate}`);
  }

  updateData(node, key, value) {
    this.queueAnimation(() => {
      this.getNode(node).data(key, value);
      this.highlightNode(node);
    });
  }

  updateDataQuietly(node, key, value) {
    this.queueAnimation(() => {
      this.getNode(node).data(key, value);
      this.isReady = true;
    });
  }

  updateNodeLayout(node) {
    this.pushAnimation(() => {
      console.log("updating layout");
      let cyNode = this.getNode(node);
      if (cyNode.parent().length > 0) {
        console.log(`updating parent layout`);
        cyNode = cyNode.parent();
        cyNode.children().layout({
          name: "breadthfirst",
          fit: false, // whether to fit to viewport
          animate: true, // whether to transition the node positions
          animationDuration: this.duration, // duration of animation in ms if enabled
          transform: function (node, position) {
            // position.x = position.x + x;
            // position.y = position.y + y;
            return position;
          },
          stop: () => {
            this.isReady = true;
          }
        }).run();
      } else {
        this.isReady = true;
      }
    });
  }

  updateNodeLayoutById(id) {
    this.pushAnimation(() => {
      console.log("updating layout");
      let cyNode = this.cy.$(`node#${id}`);
      if (cyNode.parent().length > 0) {
        console.log(`updating parent layout`);
        cyNode = cyNode.parent();
        cyNode.children().layout({
          name: "breadthfirst",
          fit: false, // whether to fit to viewport
          animate: true, // whether to transition the node positions
          animationDuration: this.duration, // duration of animation in ms if enabled
          transform: function (node, position) {
            // position.x = position.x + x;
            // position.y = position.y + y;
            return position;
          },
          stop: () => {
            this.isReady = true;
          }
        }).run();
      } else {
        this.isReady = true;
      }
    });
  }
}

export { CytoscapeFacade };
