import { OnApplicationBootstrap, Injectable } from '@nestjs/common';
import { PluginCommonModule, VendurePlugin, CollectionService, RequestContext, LanguageCode } from '@vendure/core';

@Injectable()
class FeaturedCollectionInitializer implements OnApplicationBootstrap {
    constructor(
        private collectionService: CollectionService,
    ) {}

    async onApplicationBootstrap() {
        const ctx = await this.createContext();
        
        // Check if Featured collection already exists
        const collections = await this.collectionService.findAll(ctx, {});
        const featuredExists = collections.items.some(c => c.slug === 'featured');
        
        if (!featuredExists) {
            await this.collectionService.create(ctx, {
                translations: [
                    {
                        languageCode: LanguageCode.en,
                        name: 'Featured',
                        slug: 'featured',
                        description: 'Featured products displayed on homepage'
                    }
                ],
                filters: [],
                isPrivate: false,
            });
            console.log('✓ Created Featured collection');
        }
    }

    private async createContext(): Promise<RequestContext> {
        return RequestContext.empty();
    }
}

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [FeaturedCollectionInitializer],
})
export class FeaturedCollectionPlugin {}
