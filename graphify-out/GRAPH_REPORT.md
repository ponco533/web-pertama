# Graph Report - web-pertama  (2026-10-24)

## Corpus Check
- 9 files · ~5,429 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .css 1)

## Summary
- 45 nodes · 79 edges · 9 communities (6 shown, 3 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `873c0ee7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- braille-mech.js
- graph.js
- CLAUDE.md
- braille.js
- initMechanism
- finish
- loop
- run

## God Nodes (most connected - your core abstractions)
1. `initMechanism()` - 16 edges
2. `main()` - 7 edges
3. `step()` - 6 edges
4. `finish()` - 6 edges
5. `setPhase()` - 5 edges
6. `run()` - 5 edges
7. `rowPattern()` - 4 edges
8. `syncPinsFromPhys()` - 4 edges
9. `loop()` - 4 edges
10. `start()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `loadGraph()`  [EXTRACTED]
  js/graph.js → js/graph-data.js

## Import Cycles
- None detected.

## Communities (9 total, 3 thin omitted)

### Community 0 - "braille-mech.js"
Cohesion: 0.47
Nodes (5): el(), pageTime(), pinCenter(), pinX(), rowPattern()

### Community 2 - "graph.js"
Cohesion: 0.31
Nodes (7): colorOf(), loadGraph(), glowTexture(), main(), PALETTE, setBoot(), starfield()

### Community 3 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): graphify, Skill aktif untuk proyek ini, Wajib di awal sesi

### Community 4 - "braille.js"
Cohesion: 0.29
Nodes (9): cell(), encodeWord(), initSimulator(), draw(), open(), LETTERS, paginate(), PUNCT (+1 more)

### Community 5 - "initMechanism"
Cohesion: 0.83
Nodes (4): initMechanism(), changeView(), render(), syncPinsFromPhys()

### Community 6 - "finish"
Cohesion: 0.67
Nodes (4): finish(), setPhase(), step(), targetsFor()

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `initMechanism()` connect `initMechanism` to `braille-mech.js`, `braille.js`, `finish`, `loop`, `run`?**
  _High betweenness centrality (0.227) - this node is a cross-community bridge._