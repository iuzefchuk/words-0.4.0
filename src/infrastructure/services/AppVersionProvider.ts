import { VersionProvider } from '@/application/ports.ts';

export default class AppVersionProvider implements VersionProvider {
  get version(): string {
    return APP_VERSION;
  }
}
