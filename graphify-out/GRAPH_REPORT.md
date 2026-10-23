# Graph Report - web-pertama  (2026-10-24)

## Corpus Check
- 4 files · ~866 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 12 nodes · 17 edges · 3 communities (1 shown, 2 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- loadGraph
- graph.js

## God Nodes (most connected - your core abstractions)
1. `main()` - 7 edges
2. `loadGraph()` - 4 edges
3. `colorOf()` - 2 edges
4. `glowTexture()` - 2 edges
5. `starfield()` - 2 edges
6. `setBoot()` - 2 edges
7. `PALETTE` - 1 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `loadGraph()`  [EXTRACTED]
  js/graph.js → js/graph-data.js

## Import Cycles
- None detected.

## Communities (3 total, 2 thin omitted)

### Community 2 - "graph.js"
Cohesion: 0.39
Nodes (6): colorOf(), glowTexture(), main(), PALETTE, setBoot(), starfield()

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `main()` connect `graph.js` to `loadGraph`?**
  _High betweenness centrality (0.279) - this node is a cross-community bridge._
- **Why does `loadGraph()` connect `loadGraph` to `graph.js`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._