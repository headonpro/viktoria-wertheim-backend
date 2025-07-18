import type { Schema, Struct } from '@strapi/strapi';

export interface SharedAdresse extends Struct.ComponentSchema {
  collectionName: 'components_shared_adresses';
  info: {
    displayName: 'Adresse';
    icon: 'location-arrow';
  };
  attributes: {
    hausnummer: Schema.Attribute.String & Schema.Attribute.Required;
    land: Schema.Attribute.String & Schema.Attribute.DefaultTo<'Deutschland'>;
    ort: Schema.Attribute.String & Schema.Attribute.Required;
    plz: Schema.Attribute.String & Schema.Attribute.Required;
    strasse: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedNotfallkontakt extends Struct.ComponentSchema {
  collectionName: 'components_shared_notfallkontakts';
  info: {
    displayName: 'Notfallkontakt';
    icon: 'phone';
  };
  attributes: {
    beziehung: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    telefon: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.adresse': SharedAdresse;
      'shared.notfallkontakt': SharedNotfallkontakt;
    }
  }
}
