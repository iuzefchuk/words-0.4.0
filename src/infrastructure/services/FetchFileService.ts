import { FileService } from '@/application/types/ports.ts';

export default class FetchFileService implements FileService {
  async loadSharedArrayBuffer(url: string): Promise<SharedArrayBuffer> {
    if (typeof SharedArrayBuffer === 'undefined') {
      throw new Error('SharedArrayBuffer is not available. Ensure COOP/COEP headers are set.');
    }
    const response = await fetch(`${url}.gz`);
    if (!response.ok) throw new Error(`Failed to fetch ${url}.gz: ${response.status}`);
    const buffer = await response.arrayBuffer();
    const shared = new SharedArrayBuffer(buffer.byteLength);
    new Uint8Array(shared).set(new Uint8Array(buffer));
    return shared;
  }
}
