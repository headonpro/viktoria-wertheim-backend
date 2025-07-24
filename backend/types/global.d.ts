/// <reference types="jest" />

declare global {
  namespace NodeJS {
    interface Global {
      strapi: any;
    }
  }

  var strapi: any;
}

export {};