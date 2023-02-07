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
    this.queue = [];
    this.isReady = true;
    this.isSynchronized = false;
    this.duration = 400; // animation duration in milliseconds
    this.intervalId = setInterval(() => {
      this.run();
    }, 100);
    this.numParents = 0;
  }

  addEdge(id, source, target) {
    this.queueAnimation(() => {
      console.log(`adding edge ${id} from ${source.cy.id} to ${target.cy.id}`);
      this.cy.add({
        group: "edges",
        data: { id: id, source: source.cy.id, target: target.cy.id },
      });
      this.isReady = true;
    });
  }

  addNode(node, props = {}) {
    this.queueAnimation(() => {
      console.log(`adding node ${node.cy.id}`);
      let data = { id: node.cy.id };
      data = Object.assign(data, props); // adds any properties in props to data
      this.cy.add({
        group: "nodes",
        data: data,
        position: { x: node.cy.position.x, y: node.cy.position.y },
      });
      this.highlightNode(node);
    });
  }

  endSync() {
    this.queueAnimation(() => {
      console.log("ending sync");
      this.isSynchronized = false;
      setTimeout(() => {
        this.isReady = true;
      }, this.duration);
    });
  }

  getNode(node) {
    return this.cy.$(`node#${node.cy.id}`);
  }

  getNodesWith(properties) {}

  highlightNode(node, props = {}) {
    let cyNode = this.getNode(node);
    let options = {
      style: {
        "background-color": "orchid",
      },
      complete: () => {
        cyNode.animate({
          style: {
            "background-color": "lavender",
          },
          complete: () => {
            this.isReady = true;
            console.log("queue ready");
          },
        });
      },
    };
    options = Object.assign(options, props);
    cyNode.animate(options);
  }

  moveEdge(id, source, target) {
    this.queueAnimation(() => {
      console.log(
        `moving edge ${id}: new source node ${source.cy.id}, new target node ${target.cy.id}`
      );
      this.cy.$(`edge#${id}`).move(source.cy.id, target.cy.id);
      this.isReady = true;
    });
  }

  queueAnimation(animation) {
    this.queue.push(
      this.cy.animation({
        complete: () => animation(),
      })
    );
  }

  removeNode(node) {
    this.queueAnimation(() => {
      console.log(`removing node ${node.cy.id}`);
      this.cy.remove(`node#${node.cy.id}`);
      this.isReady = true;
    });
  }

  removeEdge(id) {
    this.queueAnimation(() => {
      console.log(`removing edge ${id}`);
      this.cy.remove(`edge#${id}`);
      this.isReady = true;
    });
  }

  replaceNode(n1, n2) {
    this.queueAnimation(() => {
      console.log(n2.key);
      console.log(`replacing node ${n1.cy.id} with node ${n2.cy.id}`);
      let cyN1 = this.getNode(n1);
      let options = {
        position: { x: cyN1.position("x"), y: cyN1.position("y") },
      };
      this.removeNode(n1);
      this.highlightNode(n2, options);
    });
  }

  run() {
    if (this.isSynchronized && this.queue.length > 0) {
      this.queue.shift().play();
    } else if (this.isReady && this.queue.length > 0) {
      this.isReady = false;
      this.queue.shift().play();
    }
  }

  shiftAllNodes(x, y) {
    this.queueAnimation(() => {
      console.log("shifting all nodes");
      let options = {
        name: "preset",
        fit: false, // whether to fit to viewport
        animate: true, // whether to transition the node positions
        animationDuration: 400, // duration of animation in ms if enabled
        transform: function (node, position) {
          position.x = position.x + x;
          position.y = position.y + y;
          return position;
        },
        stop: () => {
          this.isReady = true;
        },
      };
      this.cy.layout(options).run();
    });
  }

  /*
   * returns list of cytoscape nodes
   */
  getSubtree(node) {
    let nodes = [];
    if (node.cy && node.cy.id) {
      nodes.push(this.getNode(node));
      nodes.concat(this.getSubtree(node.left));
      nodes.concat(this.getSubtree(node.right));
    }
    return nodes;
  }

  shiftNode(node, x, y) {
    this.queueAnimation(() => {
      let cyNode = this.getNode(node);
      // let oldPos = {
      //   x: cyNode.position("x"),
      //   y: cyNode.position("y"),
      // }
      // let children = cyNode.connectedNodes().filter(`edge#${node.cy.edges.next}`);
      let options = {
        position: {
          x: cyNode.position("x") + x,
          y: cyNode.position("y") + y,
        },
        // complete: () => {
        //   if (children.length > 0) {
        //     let dx = cyNode.position("x") - oldPos.x;
        //     let dy = cyNode.position("y") - oldPos.y;
        //     children.animate({
        //       position: {
        //         x: children.positions("x") + dx,
        //         y: children.positions("y") + dy
        //       },
        //       complete: () => {
        //         this.isReady = true;
        //       }
        //     })
        //   } else {
        //     this.isReady = true;
        //   }
        // }
      };
      this.highlightNode(node, options);
      // cyNode.animate(options)
    });
  }

  shiftNodeTo(node, x, y) {
    this.queueAnimation(() => {
      console.log(`shifting node ${node.cy.id}`);
      // let cyNode = this.getNode(node);
      // let dx = x - cyNode.position("x");
      // let dy = y - cyNode.position("y");
      // let children = cyNode.connectedNodes().filter(`edge#${node.cy.edges.next}`);
      let options = {
        position: { x: x, y: y },
        // complete: () => {
        //   if (children.length > 0) {
        //     children.animate({
        //       position: {
        //         x: children.positions("x") + dx,
        //         y: children.positions("y") + dy
        //       },
        //       complete: () => {
        //         this.isReady = true;
        //       }
        //     })
        //   } else {
        //     this.isReady = true;
        //   }
        // }
      };
      this.highlightNode(node, options);
      // cyNode.animate(options)
    });
  }

  startSync() {
    this.queueAnimation(() => {
      console.log("starting sync");
      this.isSynchronized = true;
      this.isReady = false;
      this.run();
    });
  }

  swapNodes(n1, n2) {
    this.queueAnimation(() => {
      console.log(`swapping nodes ${n1.cy.id} and ${n2.cy.id}`);
      let cyN1 = this.getNode(n1);
      let cyN2 = this.getNode(n2);

      // let n1Children = cyN1.connectedNodes().filter(`edge#${n1.cy.edges.next}`)
      // let n2Children = cyN2.connectedNodes().filter(`edge#${n2.cy.edges.next}`)

      // let oldN1 = {
      //   x: cyN1.position("x"),
      //   y: cyN1.position("y")
      // }

      // let oldN2 = {
      //   x: cyN2.position("x"),
      //   y: cyN2.position("y")
      // }

      let n2Options = {
        position: { x: cyN1.position("x"), y: cyN1.position("y") },
        // complete: () => {
        //   if (n2Children.length > 0) {
        //     let dx = cyN2.position("x") - oldN2.x;
        //     let dy = cyN2.position("y") - oldN2.y;
        //     n1Children.animate({
        //       position: {
        //         x: n2Children.positions("x") + dx,
        //         y: n2Children.positions("y") + dy
        //       },
        //       complete: () => {
        //         this.isReady = true;
        //       }
        //     })
        //   } else {
        //     this.isReady = true;
        //   }
        // }
      };

      let n1Options = {
        position: { x: cyN2.position("x"), y: cyN2.position("y") },
        // complete: () => {
        //   if (n1Children.length > 0) {
        //     let dx = cyN1.position("x") - oldN1.x;
        //     let dy = cyN1.position("y") - oldN1.y;
        //     n1Children.animate({
        //       position: {
        //         x: n1Children.positions("x") + dx,
        //         y: n1Children.positions("y") + dy
        //       },
        //       complete: () => {
        //         cyN2.animate(n2Options)
        //       }
        //     })
        //   } else {
        //     cyN2.animate(n2Options)
        //   }
        // }
      };
      // cyN1.animate(n1Options)
      this.highlightNode(n1, n1Options);
      this.highlightNode(n2, n2Options);
    });
  }

  updateData(node, key, value) {
    this.queueAnimation(() => {
      this.getNode(node).data(key, value);
      this.highlightNode(node);
    });
  }
}

export { CytoscapeFacade };
