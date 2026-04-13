/* eslint-disable */
import { Ref } from 'vue';
import { LocaleNumberGetter, LocaleTextGetter, LocaleType } from './LocalesPlugin.ts';

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
