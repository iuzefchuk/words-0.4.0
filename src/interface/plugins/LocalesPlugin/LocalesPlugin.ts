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
    private readonly type: Ref<LocaleType>,
    private readonly content: Ref<LocaleFileContent>,
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

  private async fetchContent(): Promise<void> {
    await Promise.all(
      Object.values(LocaleFile).map(async file => {
        this.content.value[file] = await import(`./${this.type.value}/${file}.json`);
      }),
    );
  }

  private readonly getLocalizedNumber: LocaleNumberGetter = (number: number) => {
    return new Intl.NumberFormat(LocalesPlugin.NUMBER_SEPARATOR_TYPE_FOR_LOCALE[this.type.value], {
      maximumFractionDigits: 2,
    }).format(number);
  };

  private readonly getLocalizedText: LocaleTextGetter = (string: string, props?: object) => {
    const [file, key] = string.split('.');
    if (file === undefined || key === undefined) {
      throw new ReferenceError(`expected locale key in "file.key" format, got "${string}"`);
    }
    const localizedText = this.content.value[file as LocaleFile][key];
    if (localizedText === undefined || localizedText === '') {
      throw new ReferenceError(`locale not found for "${file}.${key}"`);
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
    window.text = globals.text = this.getLocalizedText.bind(this);
    window.number = globals.number = this.getLocalizedNumber.bind(this);
  }
}
