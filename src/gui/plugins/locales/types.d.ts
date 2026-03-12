/* eslint-disable */
import { LocaleFile, LocaleType } from '@/gui/plugins/locales/enums.ts';
import { Ref } from 'vue';

export type LocaleFileContent = Record<LocaleFile, Record<string, string>>;

export type LocaleTextGetter = (string: string, props?: Record<string, string | number>) => string;
export type LocaleNumberGetter = (number: number) => string;

export interface LocaleProps {
  localeType: Ref<LocaleType>;
  t: LocaleTextGetter;
  n: LocaleNumberGetter;
}

declare global {
  interface Window extends LocaleProps {}
}

declare module 'vue' {
  interface ComponentCustomProperties extends LocaleProps {}
}