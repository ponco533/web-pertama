// Muat graph.json hasil graphify dan normalkan untuk visualisasi.
export async function loadGraph(url = "graphify-out/graph.json") {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("graph.json tidak ditemukan (" + res.status + ")");
  const raw = await res.json();
  const nodes = raw.nodes.map(n => ({ ...n, community: n.community ?? 0 }));
  const ids = new Set(nodes.map(n => n.id));
  const links = (raw.links || raw.edges || []).filter(l => ids.has(l.source) && ids.has(l.target));
  return { nodes, links };
}
