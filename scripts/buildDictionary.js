/* eslint-disable no-console */
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

class DictionaryBuilder {
  static ENTRIES_PER_NODE = 27; // 1 (isFinal) + 26 (children A-Z)

  static FIRST_LETTER_CODE = 65; // 'A'

  static buildFromFile(wordsPath) {
    const text = readFileSync(wordsPath, 'utf-8');
    const words = [
      ...new Set(
        text
          .split('\n')
          .map(line => line.trim().toUpperCase())
          .filter(line => line.length > 0 && /^[A-Z]+$/.test(line)),
      ),
    ];
    console.log(`Words: ${words.length.toLocaleString()}`);
    const trie = DictionaryBuilder.#buildTrie(words);
    const buffer = DictionaryBuilder.#flatten(trie);
    console.log(`Nodes: ${(buffer.length / DictionaryBuilder.ENTRIES_PER_NODE).toLocaleString()}`);
    console.log(`Size: ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
    return buffer;
  }

  static verify(buffer, words) {
    let allOk = true;
    for (const word of words) {
      const found = DictionaryBuilder.#containsWord(buffer, word);
      console.log(`  ${word}: ${found ? 'OK' : 'MISSING!'}`);
      if (!found) allOk = false;
    }
    return allOk;
  }

  static #buildTrie(words) {
    const root = { children: Object.create(null), isFinal: false };
    for (const word of words) {
      let node = root;
      for (let idx = 0; idx < word.length; idx++) {
        const letter = word[idx];
        if (!node.children[letter]) {
          node.children[letter] = { children: Object.create(null), isFinal: false };
        }
        node = node.children[letter];
      }
      node.isFinal = true;
    }
    return root;
  }

  static #containsWord(buffer, word) {
    let offset = 0;
    for (let idx = 0; idx < word.length; idx++) {
      const childOffset = buffer[offset + 1 + (word.charCodeAt(idx) - DictionaryBuilder.FIRST_LETTER_CODE)];
      if (!childOffset) return false;
      offset = childOffset;
    }
    return buffer[offset] === 1;
  }

  static #countNodes(node) {
    let count = 1;
    for (const key in node.children) {
      count += DictionaryBuilder.#countNodes(node.children[key]);
    }
    return count;
  }

  static #flatten(root) {
    const nodeCount = DictionaryBuilder.#countNodes(root);
    const entriesPerNode = DictionaryBuilder.ENTRIES_PER_NODE;
    const buffer = new Int32Array(nodeCount * entriesPerNode);
    let nextOffset = 0;

    function visit(node) {
      const base = nextOffset;
      nextOffset += entriesPerNode;
      buffer[base] = node.isFinal ? 1 : 0;
      for (const letter in node.children) {
        buffer[base + 1 + (letter.charCodeAt(0) - DictionaryBuilder.FIRST_LETTER_CODE)] = visit(node.children[letter]);
      }
      return base;
    }

    visit(root);
    if (nextOffset !== nodeCount * entriesPerNode) {
      throw new Error(`Expected ${nodeCount * entriesPerNode} entries, got ${nextOffset}`);
    }
    return buffer;
  }
}

// Build
const buffer = DictionaryBuilder.buildFromFile('scripts/dictionary.txt');
writeFileSync('public/dictionary.bin', Buffer.from(buffer.buffer));
writeFileSync('public/dictionary.bin.gz', gzipSync(Buffer.from(buffer.buffer)));
console.log('Written to public/dictionary.bin and public/dictionary.bin.gz');

// Verify
if (!DictionaryBuilder.verify(buffer, ['AA', 'CAT', 'DOG', 'HELLO', 'ZYZZYVAS', 'ZZZ'])) {
  process.exit(1);
}
