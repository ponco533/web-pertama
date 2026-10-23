// Ringkasan graph untuk kartu statistik di console.
import { loadGraph } from "./graph-data.js";
loadGraph().then(({ nodes, links }) => {
  document.getElementById("n-nodes").textContent = nodes.length;
  document.getElementById("n-links").textContent = links.length;
  document.getElementById("n-comm").textContent = new Set(nodes.map(n => n.community)).size;
}).catch(() => {});
