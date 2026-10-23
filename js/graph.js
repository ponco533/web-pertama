import { loadGraph } from "./graph-data.js";

const $ = id => document.getElementById(id);
const PALETTE = ["#3de6ff", "#ffb43d", "#ff4d5e", "#37ff8b", "#b58cff", "#ff7ad9", "#7aa8ff", "#e8ff4d"];
const colorOf = n => PALETTE[(n.community ?? 0) % PALETTE.length];

function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.25, "rgba(255,255,255,.6)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function starfield(scene) {
  const N = 1500, pos = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) pos[i] = (Math.random() - .5) * 3000;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x6fd8ff, size: 1.6, transparent: true, opacity: .55 })));
}

function setBoot(p) { $("bar").style.width = p + "%"; }

async function main() {
  setBoot(25);
  const data = await loadGraph();
  const deg = {};
  data.links.forEach(l => { deg[l.source] = (deg[l.source] || 0) + 1; deg[l.target] = (deg[l.target] || 0) + 1; });
  $("s-n").textContent = data.nodes.length;
  $("s-l").textContent = data.links.length;
  $("s-c").textContent = new Set(data.nodes.map(n => n.community)).size;
  setBoot(60);

  const tex = glowTexture();
  const Graph = ForceGraph3D()($("g"))
    .backgroundColor("#04080f")
    .graphData(data)
    .showNavInfo(false)
    .nodeLabel(n => n.label)
    .nodeThreeObject(n => {
      const s = 5 + Math.sqrt(deg[n.id] || 0) * 4, col = new THREE.Color(colorOf(n));
      const group = new THREE.Group();
      group.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
      group.children[0].scale.set(s * 4, s * 4, 1);
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(s / 2, 1), new THREE.MeshBasicMaterial({ color: col, wireframe: true }));
      group.add(core);
      return group;
    })
    .linkColor(() => "rgba(61,230,255,.45)")
    .linkWidth(.6)
    .linkDirectionalParticles(2)
    .linkDirectionalParticleWidth(1.8)
    .linkDirectionalParticleSpeed(.006)
    .linkDirectionalParticleColor(() => "#ffb43d")
    .onNodeClick(focus);

  starfield(Graph.scene());
  Graph.scene().add(new THREE.AmbientLight(0xffffff, .6));

  // Auto-rotate orbit
  let rotate = true, angle = 0, dist = 260;
  Graph.cameraPosition({ z: dist });
  setInterval(() => {
    if (!rotate) return;
    angle += Math.PI / 1400;
    Graph.cameraPosition({ x: dist * Math.sin(angle), z: dist * Math.cos(angle) });
  }, 16);

  function focus(n) {
    const r = 1 + 70 / Math.hypot(n.x || 1, n.y || 1, n.z || 1);
    rotate = false; $("b-rot").textContent = "Auto-rotate: OFF";
    Graph.cameraPosition({ x: n.x * r, y: n.y * r, z: n.z * r }, n, 1200);
    $("i-title").textContent = n.label;
    const nb = data.links.filter(l => (l.source.id ?? l.source) === n.id || (l.target.id ?? l.target) === n.id).length;
    $("i-body").innerHTML = [
      n.source_file ? "File: " + n.source_file + (n.source_location ? " (" + n.source_location + ")" : "") : "Konsep eksternal",
      "Cluster: " + (n.community_name ?? n.community),
      "Koneksi: " + nb,
    ].join("<br>");
  }

  $("b-rot").onclick = () => { rotate = !rotate; $("b-rot").textContent = "Auto-rotate: " + (rotate ? "ON" : "OFF"); };
  $("b-reset").onclick = () => { rotate = true; $("b-rot").textContent = "Auto-rotate: ON"; Graph.cameraPosition({ x: 0, y: 0, z: dist }, { x: 0, y: 0, z: 0 }, 1000); };
  $("search").addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    const q = e.target.value.trim().toLowerCase();
    const hit = data.nodes.find(n => n.label.toLowerCase().includes(q));
    if (hit) focus(hit);
  });
  addEventListener("resize", () => Graph.width(innerWidth).height(innerHeight));

  setBoot(100);
  setTimeout(() => { $("boot").style.opacity = 0; setTimeout(() => $("boot").remove(), 800); }, 500);
}

main().catch(err => {
  $("boot").innerHTML = "<div>Gagal memuat peta: " + err.message + "</div><div style='color:var(--dim);text-transform:none'>Jalankan lewat server: python -m http.server 8000</div>";
});
