import { Injectable } from '@nestjs/common';
import { RequestContext, TransactionalConnection, GlobalSettingsService } from '@vendure/core';

export interface BundleConfig {
  siteWidePromosAffectBundles: 'Exclude' | 'Allow';
  maxCumulativeDiscountPctForBundleChildren: number;
}

@Injectable()
export class BundleConfigService {
  constructor(
    private connection: TransactionalConnection,
    private globalSettingsService: GlobalSettingsService
  ) {}

  async getConfig(ctx: RequestContext): Promise<BundleConfig> {
    const settings = await this.globalSettingsService.getSettings(ctx);
    
    return {
      siteWidePromosAffectBundles: (settings.customFields?.bundleSiteWidePromosAffectBundles as 'Exclude' | 'Allow') || 'Exclude',
      maxCumulativeDiscountPctForBundleChildren: (settings.customFields?.bundleMaxCumulativeDiscountPct as number) || 0.50
    };
  }

  async updateConfig(
    ctx: RequestContext,
    config: Partial<BundleConfig>
  ): Promise<BundleConfig> {
    const currentSettings = await this.globalSettingsService.getSettings(ctx);
    
    const updatedSettings = await this.globalSettingsService.updateSettings(ctx, {
      customFields: {
        ...currentSettings.customFields,
        bundleSiteWidePromosAffectBundles: config.siteWidePromosAffectBundles ?? currentSettings.customFields?.bundleSiteWidePromosAffectBundles ?? 'Exclude',
        bundleMaxCumulativeDiscountPct: config.maxCumulativeDiscountPctForBundleChildren ?? currentSettings.customFields?.bundleMaxCumulativeDiscountPct ?? 0.50
      }
    });

    return {
      siteWidePromosAffectBundles: updatedSettings.customFields?.bundleSiteWidePromosAffectBundles as 'Exclude' | 'Allow' || 'Exclude',
      maxCumulativeDiscountPctForBundleChildren: updatedSettings.customFields?.bundleMaxCumulativeDiscountPct as number || 0.50
    };
  }
}
