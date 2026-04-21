import { App, Ref, ref, watch } from 'vue';

export enum LocaleType {
  En = 'en',
}

enum LocaleFile {
  Game = 'game',
}

enum NumberSeparatorType {
  Comma = 'en-US',
  Dot = 'de-DE',
  Space = 'fr-FR',
}

export type LocaleNumberGetter = (number: number) => string;

export type LocaleTextGetter = (string: string, props?: Record<string, number | string>) => string;

type LocaleFileContent = Record<LocaleFile, Record<string, string>>;

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

  private getLocalizedNumber: LocaleNumberGetter = (number: number) => {
    return new Intl.NumberFormat(LocalesPlugin.NUMBER_SEPARATOR_TYPE_FOR_LOCALE[this.type.value] ?? NumberSeparatorType.Comma, {
      maximumFractionDigits: 2,
    }).format(Number(number));
  };

  private getLocalizedText: LocaleTextGetter = (string: string, props?: object) => {
    const [file, key] = string.split('.');
    if (file === undefined || key === undefined) throw new ReferenceError('File and key must be defined');
    const localizedText = this.content.value[file as LocaleFile]?.[key];
    if (localizedText === undefined || localizedText === '') {
      throw new ReferenceError(`Locales file ${file} or key ${key} are incorrect`);
    }
    let result = localizedText;
    if (props !== undefined) {
      for (const [propKey, value] of Object.entries(props)) {
        result = result.replaceAll(`{${propKey}}`, String(value));
      }
    }
    return result;
  };

  private setGlobals(app: App): void {
    const globals = app.config.globalProperties;
    window.localeType = globals.localeType = this.type;
    window.t = globals.t = this.getLocalizedText.bind(this);
    window.n = globals.n = this.getLocalizedNumber.bind(this);
  }
}
