// Simulator perpustakaan braille: teks -> sel 6 titik -> halaman, plus total BOM.
// Logika konversi & paginasi sama dengan yang akan dipakai firmware ESP32.

import { initMechanism } from "./braille-mech.js";

const $ = id => document.getElementById(id);

// Titik: 1-2-3 kolom kiri (atas ke bawah), 4-5-6 kolom kanan.
const LETTERS = {
  a: "1", b: "12", c: "14", d: "145", e: "15", f: "124", g: "1245", h: "125", i: "24", j: "245",
  k: "13", l: "123", m: "134", n: "1345", o: "135", p: "1234", q: "12345", r: "1235", s: "234", t: "2345",
  u: "136", v: "1236", w: "2456", x: "1346", y: "13456", z: "1356",
};
const PUNCT = { ",": "2", ";": "23", ":": "25", ".": "256", "?": "236", "!": "235", "-": "36", "'": "3", "(": "2356", ")": "2356" };
const NUMBER_SIGN = "3456", CAPITAL_SIGN = "6", LETTER_SIGN = "56";
const DIGITS = "1234567890";

const cell = (dots, ch) => ({ dots: new Set(dots.split("").map(Number)), ch });

// Satu kata -> daftar sel (Braille Grade 1).
function encodeWord(word) {
  const out = [];
  let inNumber = false;
  for (const raw of word) {
    const lower = raw.toLowerCase();
    if (DIGITS.includes(raw)) {
      if (!inNumber) { out.push(cell(NUMBER_SIGN, "#")); inNumber = true; }
      out.push(cell(LETTERS["abcdefghij"[DIGITS.indexOf(raw)]], raw));
    } else if (LETTERS[lower]) {
      if (inNumber && "abcdefghij".includes(lower)) out.push(cell(LETTER_SIGN, "·"));
      inNumber = false;
      if (raw !== lower) out.push(cell(CAPITAL_SIGN, "^"));
      out.push(cell(LETTERS[lower], raw));
    } else if (PUNCT[raw]) {
      inNumber = false;
      out.push(cell(PUNCT[raw], raw));
    }
  }
  return out;
}

// Teks -> halaman berisi baris berisi sel, dengan word-wrap.
export function paginate(text, cols, rows) {
  const lines = [];
  let line = [], lineText = "";
  const pushLine = () => { lines.push({ cells: line, text: lineText.trim() }); line = []; lineText = ""; };
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let cells = encodeWord(word);
    if (line.length && line.length + 1 + cells.length > cols) pushLine();
    if (line.length) line.push(cell("", " "));
    while (cells.length > cols) { line.push(...cells.splice(0, cols - line.length)); pushLine(); }
    line.push(...cells); lineText += " " + word;
  }
  if (line.length) pushLine();
  const pages = [];
  for (let i = 0; i < lines.length; i += rows) pages.push(lines.slice(i, i + rows));
  return pages;
}

function renderCell(c) {
  const el = document.createElement("span");
  el.className = "bcell";
  el.setAttribute("aria-hidden", "true");
  for (const d of [1, 4, 2, 5, 3, 6]) {
    const dot = document.createElement("i");
    if (c && c.dots.has(d)) dot.className = "up";
    el.appendChild(dot);
  }
  return el;
}

async function initSimulator() {
  const res = await fetch("../data/books.json", { cache: "no-store" });
  const lib = await res.json();
  const COLS = lib.cellsPerLine, ROWS = lib.linesPerPage;
  const sel = $("book"), board = $("board");
  let pages = [], page = 0, book;

  lib.books.forEach(b => sel.add(new Option(b.title + " — " + b.author, b.id)));

  function draw(animate) {
    board.innerHTML = "";
    const lines = pages[page] || [];
    for (let r = 0; r < ROWS; r++) {
      const row = document.createElement("div");
      row.className = "brow";
      const cells = lines[r] ? lines[r].cells : [];
      for (let c = 0; c < COLS; c++) {
        const el = renderCell(cells[c]);
        if (animate) el.style.animationDelay = (r * COLS + c) * 12 + "ms";
        row.appendChild(el);
      }
      board.appendChild(row);
    }
    if (animate) board.classList.remove("refresh"), void board.offsetWidth, board.classList.add("refresh");
    const plain = lines.map(l => l.text).join(" ");
    $("ink").textContent = plain;
    $("pageno").textContent = (page + 1) + " / " + pages.length;
    $("prev").disabled = page === 0;
    $("next").disabled = page >= pages.length - 1;
    $("live").textContent = book.title + ", halaman " + (page + 1) + " dari " + pages.length + ". " + plain;
    document.dispatchEvent(new CustomEvent("braille:page", { detail: { lines, page } }));
  }

  function open(id) {
    book = lib.books.find(b => b.id === id);
    pages = paginate(book.text, COLS, ROWS);
    page = 0; draw(true);
  }
  const go = d => { const p = page + d; if (p >= 0 && p < pages.length) { page = p; draw(true); } };

  sel.onchange = () => open(sel.value);
  $("prev").onclick = () => go(-1);
  $("next").onclick = () => go(1);
  $("sim").addEventListener("keydown", e => {
    if (e.target === sel) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { go(1); e.preventDefault(); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { go(-1); e.preventDefault(); }
  });
  $("toggle-ink").onclick = e => {
    const show = $("ink").hidden;
    $("ink").hidden = !show;
    e.target.setAttribute("aria-pressed", String(show));
  };
  open(lib.books[0].id);
}

function initBom() {
  const fmt = n => "Rp " + n.toLocaleString("id-ID");
  let total = 0;
  document.querySelectorAll("#bom tbody tr").forEach(tr => {
    const qty = +tr.dataset.qty, price = +tr.dataset.price, sub = qty * price;
    total += sub;
    tr.querySelector(".q").textContent = qty;
    tr.querySelector(".p").textContent = fmt(price);
    tr.querySelector(".s").textContent = fmt(sub);
  });
  $("bom-total").textContent = fmt(total);
  $("hero-cost").textContent = "± Rp " + (Math.round(total / 10000) / 100).toLocaleString("id-ID") + " jt";
}

initBom();
initMechanism();
initSimulator().catch(err => { $("live").textContent = "Gagal memuat katalog buku: " + err.message; });
