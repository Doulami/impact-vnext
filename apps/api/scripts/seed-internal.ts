import 'dotenv/config';
import {
  bootstrap,
  ChannelService,
  LanguageCode,
  ProductService,
  ProductVariantService,
  RequestContextService,
} from '@vendure/core';
import { config } from '../src/vendure-config';

async function main() {
  const app = await bootstrap(config);
  try {
    const rctx = app.get(RequestContextService);
    const channelService = app.get(ChannelService);
    const productService = app.get(ProductService);
    const productVariantService = app.get(ProductVariantService);

    const defaultChannel = await channelService.getDefaultChannel();
    const ctx = await rctx.create({
      apiType: 'admin',
      channelOrToken: defaultChannel,
      languageCode: LanguageCode.en,
    });

    // Create a simple product
    const created = await productService.create(ctx, {
      enabled: true,
      facetValueIds: [],
      assetIds: [],
      translations: [
        {
          languageCode: LanguageCode.en,
          name: 'Demo Whey Protein',
          slug: 'demo-whey-protein',
          description: 'High-quality whey protein for muscle recovery',
        },
      ],
    });

    // Create a single variant
    await productVariantService.create(ctx, [
      {
        productId: created.id,
        sku: 'WHEY-1KG',
        stockOnHand: 100,
        trackInventory: 1 as any,
        price: 2999,
        taxCategoryId: null as any,
        translations: [{ languageCode: LanguageCode.en, name: '1 KG Tub' }],
        facetValueIds: [],
        optionIds: [],
      },
    ]);

    // Second product
    const created2 = await productService.create(ctx, {
      enabled: true,
      facetValueIds: [],
      assetIds: [],
      translations: [
        {
          languageCode: LanguageCode.en,
          name: 'Creatine Monohydrate',
          slug: 'creatine-monohydrate',
          description: 'Performance supplement for power and strength',
        },
      ],
    });

    await productVariantService.create(ctx, [
      {
        productId: created2.id,
        sku: 'CREATINE-300G',
        stockOnHand: 150,
        trackInventory: 1 as any,
        price: 1999,
        taxCategoryId: null as any,
        translations: [{ languageCode: LanguageCode.en, name: '300 g Jar' }],
        facetValueIds: [],
        optionIds: [],
      },
    ]);

    // eslint-disable-next-line no-console
    console.log('Internal seed completed: 2 products with single variants each.');
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Internal seed failed:', e);
  process.exit(1);
});


