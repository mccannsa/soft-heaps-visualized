<template>
  <div>
    <p>&epsi; = {{ eps }} &rarr; T = {{ Math.ceil(Math.log2(3 / eps)) }}</p>
  </div>
  <br />
  <div>
    Operations:
    <button @click="find_min()">find-min</button>
    <button @click="delete_min()">delete-min</button>
    <button @click="insert(this.input)">insert</button>
    <input
      v-model="input"
      type="text"
      name="input"
      id="input"
      v-on:keypress="submit"
    />
  </div>
  <br />
  <div>
    Animation Controls:
    <button @click="toggleAnimation()">Toggle Animation</button>
    <button @click="this.heap.cf.halveSpeed()">0.5x</button>
    <button @click="this.heap.cf.doubleSpeed()">2x</button>
  </div>
  <br />
  <div>
    <span v-for="item in removed" :key="item.key" class="removed-item">{{
      item.key
    }}</span>
  </div>
  <div id="cy"></div>
</template>

<script>
import { Item, AnimatedSoftHeap } from "../scripts/AnimatedSoftHeap";

export default {
  name: "SoftHeap",
  data() {
    return {
      heap: null,
      eps: 0.5,
      input: "",
      removed: [],
    };
  },
  methods: {
    submit(event) {
      if (event.key == "Enter") {
        this.insert(this.input);
      }
    },

    insert(input) {
      const tokens = input.split(" ");
      let items = [];

      for (let i = 0; i < tokens.length; i++) {
        if (isNaN(tokens[i])) {
          window.alert("This visualization only accepts integers!");
          return;
        }

        // if user entered leading/trailing spaces,
        // empty strings exist in the first/last index
        // of tokens. Ignore these strings.
        if (tokens[i] !== "") {
          items.push(parseInt(tokens[i]));
        }
      }
      this.input = "";

      items.forEach((element) => {
        let item = new Item(element);
        this.heap.ptr = this.heap.insert(item, this.heap.ptr);
      });
    },

    find_min() {
      let min = this.heap.find_min(this.heap.ptr);
      console.log(min);
    },

    delete_min() {
      let min = this.heap.find_min(this.heap.ptr);
      this.heap = this.heap.delete_min(this.heap.ptr);
      console.log(min);
    },

    toggleAnimation() {
      this.heap.toggleAnimation();
    }
  },

  mounted() {
    let res = window.prompt("Enter the error rate (set to 0.5 by default)");
    if (res != null && res != "" && !isNaN(res) && res >= 0 && res <= 1) {
      this.eps = parseFloat(res);
    }
    let cyProps = {
      style: [
        {
          selector: "[key]",
          style: {
            label: "data(key)",
          },
        },
        {
          selector: "node[id ^= 'n']",
          style: {
            "background-color": "lavender",
            "border-width": 2,
            "border-color": "black",
            "text-valign": "center",
          },
        },
        {
          selector: "node[?corrupt]",
          style: {
            "background-color": "red",
            "border-width": 2,
            "border-color": "black",
            "text-valign": "center",
          },
        },
        {
          selector: "[id ^= 'p']",
          style: {
            "background-opacity": "0",
            // "border-opacity": "0"
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "black",
            "target-arrow-color": "#ccc",
            "target-arrow-shape": "none",
            "curve-style": "straight",
          },
        },
        {
          selector: "[id ^= 'x']",
          style: {
            "line-color": "red",
          },
        },
      ],
    };
    this.heap = new AnimatedSoftHeap("cy", cyProps, this.eps);
    document.getElementById("input").focus();
  },
};
</script>

<style>
.removed-item {
  margin-right: 0.5em;
}

#cy {
  height: 600px;
  width: 1000px;
  border: 2px solid black;
}
</style>
