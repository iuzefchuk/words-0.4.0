import { FileService } from '@/application/types/ports.ts';

export default class FetchFileService implements FileService {
  private static async decompressIfGzipped(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) return buffer;
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
  }

  async loadSharedArrayBuffer(url: string): Promise<SharedArrayBuffer> {
    if (typeof SharedArrayBuffer === 'undefined') {
      throw new Error('SharedArrayBuffer is unavailable; set COOP/COEP headers to enable it');
    }
    const gzUrl = `${url}.gz`;
    const response = await fetch(gzUrl);
    if (!response.ok) throw new Error(`failed to fetch ${gzUrl}: ${String(response.status)} ${response.statusText}`);
    const buffer = await FetchFileService.decompressIfGzipped(await response.arrayBuffer());
    const shared = new SharedArrayBuffer(buffer.byteLength);
    new Uint8Array(shared).set(new Uint8Array(buffer));
    return shared;
  }
}
