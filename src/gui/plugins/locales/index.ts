import { App, ref, watch, Ref } from 'vue';
import { LocaleFile, LocaleType, NumberSeparatorType } from '@/gui/plugins/locales/enums.ts';
import { NUMBER_SEPARATOR_TYPE_FOR_LOCALE } from '@/gui/plugins/locales/constants.ts';
import { LocaleFileContent, LocaleNumberGetter, LocaleTextGetter } from '@/gui/plugins/locales/types.js';

export default class LocalesPlugin {
  private constructor(
    private type: Ref<LocaleType>,
    private content: Ref<LocaleFileContent>,
  ) {}

  static create(): LocalesPlugin {
    const type = ref(document.documentElement.getAttribute('lang') as LocaleType);
    const content = ref({} as LocaleFileContent);
    return new LocalesPlugin(type, content);
  }

  async install(app: App): Promise<void> {
    await this.fetchContent();
    watch(this.type, () => this.fetchContent());
    this.setGlobals(app);
  }

  private async fetchContent() {
    await Promise.all(
      Object.values(LocaleFile).map(async file => {
        this.content.value[file] = await import(`./${this.type.value}/${file}.json`);
      }),
    );
  }

  private setGlobals(app: App): void {
    const globals = app.config.globalProperties;
    window.localeType = globals.localeType = this.type;
    window.t = globals.t = this.getLocalizedText.bind(this);
    window.n = globals.n = this.getLocalizedNumber.bind(this);
  }

  private getLocalizedText: LocaleTextGetter = (string: string, props?: object) => {
    const [file, key] = string.split('.');
    if (!this.content.value) throw new Error('Locales didn`t fetch content');
    let localizedText = this.content.value[file as LocaleFile]?.[key];
    if (!localizedText) throw new Error('Locales file or key are incorrect');
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        localizedText = localizedText.replaceAll(`{${key}}`, String(value));
      }
    }
    return localizedText;
  };

  private getLocalizedNumber: LocaleNumberGetter = (number: number) => {
    return new Intl.NumberFormat(NUMBER_SEPARATOR_TYPE_FOR_LOCALE[this.type.value] || NumberSeparatorType.Comma, {
      maximumFractionDigits: 2,
    }).format(Number(number));
  };
}
