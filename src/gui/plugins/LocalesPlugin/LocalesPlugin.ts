import { App, ref, watch, Ref } from 'vue';

enum NumberSeparatorType {
  Dot = 'de-DE',
  Space = 'fr-FR',
  Comma = 'en-US',
}

enum LocaleFile {
  Game = 'game',
}

export enum LocaleType {
  En = 'en',
}

type LocaleFileContent = Record<LocaleFile, Record<string, string>>;

export type LocaleTextGetter = (string: string, props?: Record<string, string | number>) => string;

export type LocaleNumberGetter = (number: number) => string;

export default class LocalesPlugin {
  private static readonly NUMBER_SEPARATOR_TYPE_FOR_LOCALE = {
    [LocaleType.En]: NumberSeparatorType.Dot,
  };

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
    if (!localizedText) throw new Error(`Locales file ${file} or key ${key} are incorrect`);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        localizedText = localizedText.replaceAll(`{${key}}`, String(value));
      }
    }
    return localizedText;
  };

  private getLocalizedNumber: LocaleNumberGetter = (number: number) => {
    return new Intl.NumberFormat(
      LocalesPlugin.NUMBER_SEPARATOR_TYPE_FOR_LOCALE[this.type.value] || NumberSeparatorType.Comma,
      {
        maximumFractionDigits: 2,
      },
    ).format(Number(number));
  };
}
