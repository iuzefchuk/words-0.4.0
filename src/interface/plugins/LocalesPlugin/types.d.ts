/* eslint-disable */
import { Ref } from 'vue';
import { LocaleNumberGetter, LocaleTextGetter, LocaleType } from './LocalesPlugin.ts';

export interface LocaleProps {
  number: LocaleNumberGetter;
  localeType: Ref<LocaleType>;
  text: LocaleTextGetter;
}

declare global {
  interface Window extends LocaleProps {}
}

declare module 'vue' {
  interface ComponentCustomProperties extends LocaleProps {}
}
