import { describe, it, expect } from 'vitest';
import { createTestDictionary } from '$/helpers.ts';

describe('Dictionary', () => {
  const dict = createTestDictionary(['CAT', 'CATS', 'CAR', 'CARD', 'DOG', 'DO', 'AT']);

  describe('containsWord', () => {
    it('finds words in the dictionary', () => {
      expect(dict.containsWord('CAT')).toBe(true);
      expect(dict.containsWord('CATS')).toBe(true);
      expect(dict.containsWord('DOG')).toBe(true);
      expect(dict.containsWord('DO')).toBe(true);
      expect(dict.containsWord('AT')).toBe(true);
    });

    it('rejects words not in the dictionary', () => {
      expect(dict.containsWord('ZZZ')).toBe(false);
      expect(dict.containsWord('CA')).toBe(false);
      expect(dict.containsWord('DOGS')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(dict.containsWord('')).toBe(false);
    });

    it('rejects partial prefixes that are not words', () => {
      expect(dict.containsWord('CAR')).toBe(true);
      expect(dict.containsWord('C')).toBe(false);
    });
  });

  describe('containsWords', () => {
    it('returns true when all words exist', () => {
      expect(dict.containsWords(['CAT', 'DOG'])).toBe(true);
    });

    it('returns false when any word is missing', () => {
      expect(dict.containsWords(['CAT', 'ZZZ'])).toBe(false);
    });

    it('returns true for empty array', () => {
      expect(dict.containsWords([])).toBe(true);
    });
  });

  describe('getNode', () => {
    it('returns a node for a valid prefix', () => {
      const node = dict.getNode('CA');
      expect(node).not.toBeNull();
    });

    it('returns null for an invalid prefix', () => {
      const node = dict.getNode('ZZ');
      expect(node).toBeNull();
    });
  });

  describe('isNodeFinal', () => {
    it('returns true for a word-ending node', () => {
      const node = dict.getNode('CAT');
      expect(node).not.toBeNull();
      expect(dict.isNodeFinal(node!)).toBe(true);
    });

    it('returns false for a prefix-only node', () => {
      const node = dict.getNode('CA');
      expect(node).not.toBeNull();
      expect(dict.isNodeFinal(node!)).toBe(false);
    });
  });

  describe('createNextNodeGenerator', () => {
    it('yields child letters from a node', () => {
      const rootNode = dict.firstNode;
      const gen = dict.createNextNodeGenerator({ startNode: rootNode });
      const letters = [...gen].map(([letter]) => letter);
      // Root should have children for C, D, A (first letters of all words)
      expect(letters).toContain('C');
      expect(letters).toContain('D');
      expect(letters).toContain('A');
    });
  });

  describe('allLetters', () => {
    it('contains all letters used in the dictionary', () => {
      expect(dict.allLetters.has('C' as any)).toBe(true);
      expect(dict.allLetters.has('A' as any)).toBe(true);
      expect(dict.allLetters.has('T' as any)).toBe(true);
      expect(dict.allLetters.has('D' as any)).toBe(true);
      expect(dict.allLetters.has('O' as any)).toBe(true);
      expect(dict.allLetters.has('G' as any)).toBe(true);
      expect(dict.allLetters.has('R' as any)).toBe(true);
      expect(dict.allLetters.has('S' as any)).toBe(true);
    });
  });
});
