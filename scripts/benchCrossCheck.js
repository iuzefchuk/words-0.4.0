// Standalone micro-benchmark for the cross-check path.
// - Loads the real dictionary.bin trie (Int32Array, 27 slots/node).
// - Compares: compute-as-Set vs compute-as-bitmap, and Set.has vs bitmask AND.
// Run with: node scripts/benchCrossCheck.js

import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const FIRST = 'A'.charCodeAt(0);
const LETTERS = 26;

const raw = readFileSync(new URL('../public/dictionary.bin', import.meta.url));
const data = new Int32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
const ROOT = 0;

function getNode(start, word) {
  let cur = start;
  for (let i = 0; i < word.length; i++) {
    const next = data[cur + 1 + word.charCodeAt(i) - FIRST];
    if (next === 0) return -1;
    cur = next;
  }
  return cur;
}

function isFinal(node) {
  return data[node] === 1;
}

// Pick ~400 real (prefix, suffix) pairs by walking random words to random split points.
// Read words from scripts/dictionary.txt — capped and uppercased.
const words = readFileSync(new URL('./dictionary.txt', import.meta.url), 'utf8')
  .split('\n')
  .map(w => w.trim().toUpperCase())
  .filter(w => w.length >= 3 && w.length <= 9 && /^[A-Z]+$/.test(w));
const SAMPLE = 400;
const pairs = [];
for (let i = 0; i < SAMPLE; i++) {
  const w = words[(i * 2654435761) >>> 0 % words.length] ?? 'ABLE';
  const split = 1 + (i % (w.length - 1));
  const prefix = w.slice(0, split);
  const suffix = w.slice(split);
  pairs.push({ prefix, suffix: i % 3 === 0 ? '' : suffix });
}

// --- A) Compute returning Set<string> (today's shape) ---
function computeAsSet(prefix, suffix) {
  const prefixNode = prefix ? getNode(ROOT, prefix) : ROOT;
  if (prefixNode < 0) return new Set();
  const out = new Set();
  for (let i = 0; i < LETTERS; i++) {
    const child = data[prefixNode + 1 + i];
    if (child === 0) continue;
    if (!suffix) {
      out.add(String.fromCharCode(FIRST + i));
    } else {
      const sn = getNode(child, suffix);
      if (sn >= 0 && isFinal(sn)) out.add(String.fromCharCode(FIRST + i));
    }
  }
  return out;
}

// --- B) Compute returning 32-bit bitmask ---
function computeAsMask(prefix, suffix) {
  const prefixNode = prefix ? getNode(ROOT, prefix) : ROOT;
  if (prefixNode < 0) return 0;
  let mask = 0;
  for (let i = 0; i < LETTERS; i++) {
    const child = data[prefixNode + 1 + i];
    if (child === 0) continue;
    if (!suffix) {
      mask |= 1 << i;
    } else {
      const sn = getNode(child, suffix);
      if (sn >= 0 && isFinal(sn)) mask |= 1 << i;
    }
  }
  return mask;
}

// Warmup
for (const p of pairs) {
  computeAsSet(p.prefix, p.suffix);
  computeAsMask(p.prefix, p.suffix);
}

function timeCompute(fn, label) {
  const ITERS = 50;
  const t0 = performance.now();
  let sink = 0;
  for (let r = 0; r < ITERS; r++) {
    for (const p of pairs) {
      const v = fn(p.prefix, p.suffix);
      sink += typeof v === 'number' ? v : v.size;
    }
  }
  const dt = performance.now() - t0;
  const perCall = (dt * 1e6) / (ITERS * pairs.length); // ns
  console.log(`${label}: ${dt.toFixed(2)} ms total, ${perCall.toFixed(0)} ns/compute (sink=${sink})`);
  return dt;
}

console.log(`\n=== Cross-check compute (${pairs.length} unique entries per iter) ===`);
const setCompute = timeCompute(computeAsSet, 'Set<Letter> compute');
const maskCompute = timeCompute(computeAsMask, 'Uint32 mask compute');
console.log(`speedup: ${(setCompute / maskCompute).toFixed(2)}x`);

// --- Hot loop: simulate calculateAndExploreResolution's 26-letter gate ---
// For each candidate, we iterate 26 child slots and check membership.
// Build two equivalent result tables for a fixed set of 200 "cells".
const CELLS = 200;
const sampleSet = [];
const sampleMask = new Uint32Array(CELLS);
for (let i = 0; i < CELLS; i++) {
  const p = pairs[i % pairs.length];
  sampleSet.push(computeAsSet(p.prefix, p.suffix));
  sampleMask[i] = computeAsMask(p.prefix, p.suffix);
}

// Fake "node children" pattern: for each candidate iterate all 26 letters (worst case).
function hotSet(cellIdx, countBuf) {
  const s = sampleSet[cellIdx];
  let local = 0;
  for (let i = 0; i < LETTERS; i++) {
    const letter = String.fromCharCode(FIRST + i);
    if (s.has(letter)) local++;
  }
  countBuf[0] += local;
}

function hotMask(cellIdx, countBuf) {
  const m = sampleMask[cellIdx];
  let local = 0;
  for (let i = 0; i < LETTERS; i++) {
    if ((m >>> i) & 1) local++;
  }
  countBuf[0] += local;
}

function timeHot(fn, label) {
  const CANDIDATES = 500_000;
  const buf = new Uint32Array(1);
  // Warmup
  for (let i = 0; i < 10_000; i++) fn(i % CELLS, buf);
  const t0 = performance.now();
  for (let i = 0; i < CANDIDATES; i++) fn(i % CELLS, buf);
  const dt = performance.now() - t0;
  const perCall = (dt * 1e6) / CANDIDATES;
  console.log(`${label}: ${dt.toFixed(2)} ms for ${CANDIDATES} candidates, ${perCall.toFixed(1)} ns/candidate (sink=${buf[0]})`);
  return dt;
}

console.log('\n=== Hot-loop membership (26-letter gate per candidate) ===');
const setHot = timeHot(hotSet, 'Set.has per letter');
const maskHot = timeHot(hotMask, 'bit test per letter');
console.log(`speedup: ${(setHot / maskHot).toFixed(2)}x`);

// --- GC / allocation estimate ---
const N = 400;
const tSet0 = performance.now();
const junkA = [];
for (let i = 0; i < N; i++) junkA.push(computeAsSet(pairs[i % pairs.length].prefix, pairs[i % pairs.length].suffix));
const tSet1 = performance.now();
const tMask0 = performance.now();
const maskArr = new Uint32Array(N);
for (let i = 0; i < N; i++) maskArr[i] = computeAsMask(pairs[i % pairs.length].prefix, pairs[i % pairs.length].suffix);
const tMask1 = performance.now();
console.log('\n=== Full-table build (one worker turn, ~400 entries) ===');
console.log(`Set table build:  ${(tSet1 - tSet0).toFixed(2)} ms`);
console.log(`Mask table build: ${(tMask1 - tMask0).toFixed(2)} ms`);
console.log(`Junk pinned to prevent elision: ${junkA.length}`);
