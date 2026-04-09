import { CompressionService } from '@/application/types.ts';

export default class FetchCompressionService implements CompressionService {
  async fetchAndDecompress(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
    if (isGzip) {
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      writer.write(bytes);
      writer.close();
      return new Response(stream.readable).text();
    }
    return new TextDecoder().decode(buffer);
  }
}
