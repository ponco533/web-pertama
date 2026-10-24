# Graph Report - web-pertama  (2026-10-24)

## Corpus Check
- 8 files · ~4,007 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .css 1)

## Summary
- 27 nodes · 36 edges · 6 communities (4 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c797d045`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- loadGraph
- graph.js
- CLAUDE.md
- braille.js
- initSimulator

## God Nodes (most connected - your core abstractions)
1. `main()` - 7 edges
2. `paginate()` - 4 edges
3. `loadGraph()` - 4 edges
4. `cell()` - 3 edges
5. `encodeWord()` - 3 edges
6. `initSimulator()` - 3 edges
7. `draw()` - 3 edges
8. `open()` - 3 edges
9. `renderCell()` - 2 edges
10. `colorOf()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `loadGraph()`  [EXTRACTED]
  js/graph.js → js/graph-data.js

## Import Cycles
- None detected.

## Communities (6 total, 2 thin omitted)

### Community 2 - "graph.js"
Cohesion: 0.39
Nodes (6): colorOf(), glowTexture(), main(), PALETTE, setBoot(), starfield()

### Community 3 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): graphify, Skill aktif untuk proyek ini, Wajib di awal sesi

### Community 4 - "braille.js"
Cohesion: 0.43
Nodes (5): cell(), encodeWord(), LETTERS, paginate(), PUNCT

### Community 5 - "initSimulator"
Cohesion: 0.67
Nodes (4): initSimulator(), draw(), open(), renderCell()

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `main()` connect `graph.js` to `loadGraph`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `loadGraph()` connect `loadGraph` to `graph.js`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `initSimulator()` connect `initSimulator` to `braille.js`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._