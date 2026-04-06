import Dictionary from '@/domain/models/Dictionary.ts';
import areEqual from '$/areEqual.ts';

let dictionary: Dictionary;

beforeAll(async () => {
  dictionary = await Dictionary.create();
});

describe('Dictionary', () => {
  describe('word lookup', () => {
    it('should return correct result for single valid word', () => {
      expect(dictionary.containsAllWords(['CAT'])).toBe(true);
    });

    it('should return correct result for single invalid word', () => {
      expect(dictionary.containsAllWords(['ABCDEF'])).toBe(false);
    });

    it('should return correct result for multiple valid words', () => {
      expect(dictionary.containsAllWords(['CAT', 'DOG', 'MOUSE'])).toBe(true);
    });

    it('should return correct result for multiple invalid words', () => {
      expect(dictionary.containsAllWords(['ABCDEF', 'GHIJKL'])).toBe(false);
    });

    it('should return correct result for multiple valid and invalid words', () => {
      expect(dictionary.containsAllWords(['CAT', 'ABCDEF'])).toBe(false);
    });
  });

  describe('node', () => {
    it('should be final for valid word', () => {
      const node = dictionary.getNode('CAT')!;
      expect(dictionary.isNodeFinal(node)).toBe(true);
    });

    it('should not be final for prefix', () => {
      const node = dictionary.getNode('CA')!;
      expect(dictionary.isNodeFinal(node)).toBe(false);
    });

    it('should not be final for invalid id', () => {
      expect(() => dictionary.isNodeFinal(999999)).toThrow();
    });
  });

  describe('node traversal', () => {
    it('should return node for valid word', () => {
      expect(dictionary.getNode('CAT')).not.toBeNull();
    });

    it('should not return node for invalid word', () => {
      expect(dictionary.getNode('ABCDEF')).toBeNull();
    });

    it('should return node for a existent prefix', () => {
      expect(dictionary.getNode('CA')).not.toBeNull();
    });

    it('should not return node for non-existent prefix', () => {
      expect(dictionary.getNode('ZX')).toBeNull();
    });

    it('should return node from starting node when provided', () => {
      const caNode = dictionary.getNode('CA')!;
      expect(caNode).not.toBeNull();
      // From CA node, "T" should reach CAT
      const catNode = dictionary.getNode('T', caNode)!;
      expect(catNode).not.toBeNull();
    });
  });

  describe('snapshot', () => {
    it('should capture and restore rootNode', () => {
      const { rootNode } = dictionary.snapshot;
      const restoredDictionary = Dictionary.restoreFromSnapshot(dictionary.snapshot);
      expect(areEqual(restoredDictionary.snapshot.rootNode, rootNode)).toBe(true);
    });

    it('should capture and restore nodeById', () => {
      const { nodeById } = dictionary.snapshot;
      const restoredDictionary = Dictionary.restoreFromSnapshot(dictionary.snapshot);
      expect(areEqual(restoredDictionary.snapshot.nodeById, nodeById)).toBe(true);
    });

    it('should capture and restore allLetters', () => {
      const { allLetters } = dictionary.snapshot;
      const restoredDictionary = Dictionary.restoreFromSnapshot(dictionary.snapshot);
      expect(areEqual(restoredDictionary.snapshot.allLetters, allLetters)).toBe(true);
    });
  });
});
