/* eslint-disable */
import { LocaleType, LocaleFile } from '@/gui/plugins/locales/enums.ts';
import { Ref } from 'vue';

declare global {

  type LocaleFileContent = Record<LocaleFile | string, Record<string, string>>;

  interface LocaleProps {
    localeType: Ref<LocaleType>;
    t: (string: string, props?: Record<string, string | number>) => string;
    n: (number: number) => string;
  }

  interface Window extends LocaleProps {}
}

declare module 'vue' {
  interface ComponentCustomProperties extends LocaleProps {}
}

export {};
