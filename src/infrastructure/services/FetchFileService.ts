import { FileService } from '@/application/types/ports.ts';

export default class FetchFileService implements FileService {
  async loadSharedArrayBuffer(url: string): Promise<SharedArrayBuffer> {
    if (typeof SharedArrayBuffer === 'undefined') {
      throw new Error('SharedArrayBuffer is unavailable; set COOP/COEP headers to enable it');
    }
    const response = await fetch(`${url}.gz`);
    if (!response.ok) throw new Error(`failed to fetch ${url}.gz: ${String(response.status)} ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    const shared = new SharedArrayBuffer(buffer.byteLength);
    new Uint8Array(shared).set(new Uint8Array(buffer));
    return shared;
  }
}
