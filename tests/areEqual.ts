export default function areEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) && Array.isArray(b)) return areArraysEqual(a, b);
  if (a instanceof Map && b instanceof Map) return areMapsEqual(a, b);
  if (a instanceof Set && b instanceof Set) return areSetsEqual(a, b);
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (a instanceof Map !== b instanceof Map) return false;
  if (a instanceof Set !== b instanceof Set) return false;
  return areObjectsEqual(a as Record<string, unknown>, b as Record<string, unknown>);
}

function areArraysEqual(firstArray: ReadonlyArray<unknown>, secondArray: ReadonlyArray<unknown>): boolean {
  if (!Array.isArray(firstArray) || !Array.isArray(secondArray)) {
    throw new Error('Both args must be arrays');
  }
  return firstArray.length === secondArray.length && firstArray.every((v, i) => areEqual(v, secondArray[i]));
}

function areMapsEqual(firstMap: ReadonlyMap<unknown, unknown>, secondMap: ReadonlyMap<unknown, unknown>): boolean {
  if (!(firstMap instanceof Map) || !(secondMap instanceof Map)) {
    throw new Error('Both args must be maps');
  }
  if (firstMap.size !== secondMap.size) return false;
  for (const [key, val] of firstMap) if (!secondMap.has(key) || !areEqual(secondMap.get(key), val)) return false;
  return true;
}

function areObjectsEqual(firstObj: Record<string, unknown>, secondObj: Record<string, unknown>): boolean {
  if (typeof firstObj !== 'object' || firstObj === null || typeof secondObj !== 'object' || secondObj === null) {
    throw new Error('Both args must be objects');
  }
  if (Object.is(firstObj, secondObj)) return true;
  const keysA = Object.keys(firstObj);
  const keysB = Object.keys(secondObj);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(secondObj, key)) return false;
    if (!areEqual(firstObj[key], secondObj[key])) return false;
  }
  return true;
}

function areSetsEqual(firstSet: ReadonlySet<unknown>, secondSet: ReadonlySet<unknown>): boolean {
  if (!(firstSet instanceof Set) || !(secondSet instanceof Set)) {
    throw new Error('Both args must be sets');
  }
  if (firstSet.size !== secondSet.size) return false;
  for (const val of firstSet) {
    let found = false;
    for (const other of secondSet) {
      if (areEqual(val, other)) {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}
