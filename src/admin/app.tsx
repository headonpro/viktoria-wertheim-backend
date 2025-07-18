import type { StrapiApp } from '@strapi/strapi/admin';
import CropImageInput from './components/CropImageInput';

export default {
  config: {
    locales: [
      // 'ar',
      // 'fr',
      // 'cs',
      // 'de',
      // 'dk',
      // 'es',
      // 'he',
      // 'id',
      // 'it',
      // 'ja',
      // 'ko',
      // 'ms',
      // 'nl',
      // 'no',
      // 'pl',
      // 'pt-BR',
      // 'pt',
      // 'ru',
      // 'sk',
      // 'sv',
      // 'th',
      // 'tr',
      // 'uk',
      // 'vi',
      // 'zh-Hans',
      // 'zh',
    ],
  },
  bootstrap(app: StrapiApp) {
    // TEMPORARILY DISABLED: Custom Fields API not available in Strapi v5
    // TODO: Re-enable when Strapi v5 supports custom fields or find alternative
    /*
    app.customFields.register({
      name: 'crop-image',
      pluginId: 'global',
      type: 'json',
      intlLabel: {
        id: 'crop-image.label',
        defaultMessage: 'Crop Image',
      },
      intlDescription: {
        id: 'crop-image.description',
        defaultMessage: 'Wähle einen Bildausschnitt',
      },
      components: {
        Input: CropImageInput,
      },
    });
    */
    console.log('Admin app bootstrapped successfully', app);
  },
};
