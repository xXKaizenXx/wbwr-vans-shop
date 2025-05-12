import { GraphQLClient } from 'graphql-request';

const SHOPIFY_STORE_URL = 'vans-sa.myshopify.com';
const SHOPIFY_STOREFRONT_TOKEN = 'ef5228ebed75efa3e414855e602b23af';

export const shopifyClient = new GraphQLClient(
  `https://${SHOPIFY_STORE_URL}/api/2024-01/graphql.json`,
  {
    headers: {
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
      'Content-Type': 'application/json',
    },
  }
);