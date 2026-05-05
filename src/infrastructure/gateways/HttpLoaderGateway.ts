import { LoaderGateway } from '@/application/types/ports.ts';

export default class HttpLoaderGateway {
  static async load(url: string): Promise<ArrayBufferLike> {
    const gzUrl = `${url}.gz`;
    const response = await fetch(gzUrl);
    if (!response.ok) throw new Error(`failed to fetch ${gzUrl}: ${String(response.status)} ${response.statusText}`);
    const buffer = await HttpLoaderGateway.decompressIfGzipped(await response.arrayBuffer());
    if (typeof SharedArrayBuffer === 'undefined') return buffer;
    const shared = new SharedArrayBuffer(buffer.byteLength);
    new Uint8Array(shared).set(new Uint8Array(buffer));
    return shared;
  }

  private static async decompressIfGzipped(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) return buffer;
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
  }
}

HttpLoaderGateway satisfies LoaderGateway;
