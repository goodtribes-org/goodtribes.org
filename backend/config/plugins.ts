import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  meilisearch: {
    config: {
      host: env('MEILI_HOST', 'http://localhost:7700'),
      apiKey: env('MEILI_MASTER_KEY'),
    },
  },
});

export default config;
