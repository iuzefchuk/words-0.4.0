import { App } from 'vue';
import { LocaleFile, LocaleType, NumberSeparatorType } from '@/gui/plugins/locales/enums.js';
import { NUMBER_SEPARATOR_TYPE_FOR_LOCALE } from '@/gui/plugins/locales/consts.js';
import { ref, watch } from 'vue';

export default {
  async install(app: App) {
    const localeType = ref(document.documentElement.getAttribute('lang') as LocaleType);

    const fileContent = ref<LocaleFileContent | null>(null);

    async function importAllFileContent() {
      fileContent.value = Object.assign(
        {},
        ...(await Promise.all(
          Object.values(LocaleFile).map(async entity => {
            const module = await import(`@/gui/plugins/locales/${localeType.value}/${entity}.json`);
            return { [entity]: module };
          }),
        )),
      );
    }

    function setGlobals() {
      window.localeType = app.config.globalProperties.localeType = localeType;
      window.t = app.config.globalProperties.t = getLocalizedText;
      window.n = app.config.globalProperties.n = getLocalizedNumber;
    }

    const getLocalizedText: LocaleProps['t'] = (string, props) => {
      const [entity, key] = string.split('.');
      if (!fileContent.value) return string;
      let localizedText = fileContent.value[entity]?.[key];
      if (!localizedText) return string;
      if (props) {
        for (const [key, value] of Object.entries(props)) {
          localizedText = localizedText.replaceAll(`{${key}}`, String(value));
        }
      }
      return localizedText;
    };

    const getLocalizedNumber: LocaleProps['n'] = number => {
      return new Intl.NumberFormat(NUMBER_SEPARATOR_TYPE_FOR_LOCALE[localeType.value] || NumberSeparatorType.Comma, {
        maximumFractionDigits: 2,
      }).format(Number(number));
    };

    await importAllFileContent();

    watch(localeType, () => importAllFileContent());

    setGlobals();
  },
};
