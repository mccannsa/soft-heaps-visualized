import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";

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
    cytoscape.use(dagre);
    this.queue = [];
    this.isReady = true;
    this.isSynchronized = false;
    this.duration = 400; // animation duration in milliseconds
    this.intervalId = setInterval(() => {
      this.run();
    }, 1);
    this.numParents = 0;
    this.animate = true;
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

  getNodeById(id) {
    this.cy.$(`node#${id}`);
  }

  getNodesWith(properties) {}

  halveSpeed() {
    this.duration *= 2;
  }

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

  highlightNodeById(id, props = {}) {
    let cyNode = this.cy.$(`node#${id}`);
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
              // this.updateNodeLayoutById(id);
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
              // this.updateNodeLayoutById(id);
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

  moveEdge(id, source, target) {
    this.queueAnimation(() => {
      console.log(
        `moving edge ${id}: new source node ${source.cy.id}, new target node ${target.cy.id}`
      );
      this.cy.$(`edge#${id}`).move(source.cy.id, target.cy.id);
      this.isReady = true;
    });
  }

  moveNode(node, parentId) {
    this.queueAnimation(() => {
      console.log(
        `moving node ${node.cy.id} to parent ${parentId}`
      );
      if (node.cy) {
        let cyNode = this.getNode(node);
        if (cyNode.parent().length > 0) {
          cyNode = cyNode.parent();
        }
        cyNode.move({ parent: parentId });
      }
      this.isReady = true;
    });
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

  removeNode(node) {
    this.queueAnimation(() => {
      console.log(`removing node ${node.cy.id}`);
      let parent = this.getNode(node).parent();
      this.cy.remove(`node#${node.cy.id}`);
      if (parent.children("[id ^= 'n']").length === 0) {
        console.log(`HERE ${parent.data("id")}`);
        this.cy.remove(`node#${parent.data("id")}`)
      }
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
      console.log(`replacing node ${n1.cy.id} with node ${n2.cy.id}`);
      let cyN1 = this.getNode(n1);
      if (cyN1.parent().length > 0) {
        cyN1 = cyN1.parent();
      }
      let options = {
        position: { x: cyN1.position("x"), y: cyN1.position("y") },
      };
      this.cy.remove(`node#${n1.cy.id}`);
      this.highlightNode(n2, options);
    });
  }

  run() {
    if (this.isSynchronized && this.queue.length > 0) {
      this.queue.shift().play();
    } else if (this.animate && this.isReady && this.queue.length > 0) {
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
        animationDuration: this.duration, // duration of animation in ms if enabled
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

  shiftNode(node, x, y) {
    this.queueAnimation(() => {
      let cyNode = this.getNode(node);
      if (cyNode.parent().length > 0) {
        console.log(`parent of ${node.cy.id}: ${cyNode.parent()}`);
        cyNode = cyNode.parent();
      }
      let options = {
        position: {
          x: cyNode.position("x") + x,
          y: cyNode.position("y") + y,
        },
      };
      this.highlightNodeById(cyNode.data("id"), options);
    });
  }

  shiftNodeTo(node, x, y) {
    this.queueAnimation(() => {
      console.log(`shifting node ${node.cy.id}`);
      let options = {
        position: { x: x, y: y },
      };
      this.highlightNode(node, options);
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

      let n1HasParent = cyN1.parent().length > 0;
      let n2HasParent = cyN2.parent().length > 0;

      if (n1HasParent && n2HasParent && cyN1.parent() === cyN2.parent()) {
        console.log(`${n1.cy.id} parent: ${cyN1.parent()}; ${n2.cy.id} parent: ${cyN2.parent()}`);
      } else {
        if (n1HasParent) {
          cyN1 = cyN1.parent();
        }
        if (n2HasParent) {
          cyN2 = cyN2.parent();
        }
      }

      let n2Options = {
        position: { x: cyN1.position("x"), y: cyN1.position("y") },
      };
      let n1Options = {
        position: { x: cyN2.position("x"), y: cyN2.position("y") },
      };
      this.highlightNodeById(cyN1.data("id"), n1Options);
      this.highlightNodeById(cyN2.data("id"), n2Options);
    });
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
