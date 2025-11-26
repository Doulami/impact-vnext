import { Injectable } from '@nestjs/common';
import { RequestContext, LanguageCode } from '@vendure/core';

/**
 * Bundle Translation Service
 * 
 * Provides localized strings for the bundle plugin based on Vendure's
 * selected language context. Supports English and French.
 * 
 * This service ensures 100% translation coverage for:
 * - Error messages
 * - Success messages
 * - Validation messages
 * - Status labels
 * - Field labels and descriptions
 */
@Injectable()
export class BundleTranslationService {
    
    /**
     * All translatable strings organized by language
     * Add new languages by adding a new key with the LanguageCode and translations
     */
    private readonly translations: Record<string, any> = {
        [LanguageCode.en]: {
            // ========== BUNDLE CRUD MESSAGES ==========
            bundleCreated: (name: string) => `Bundle "${name}" created successfully`,
            bundleUpdated: (name: string) => `Bundle "${name}" updated successfully`,
            bundleDeleted: (name: string) => `Bundle "${name}" deleted successfully`,
            bundleNotFound: (id: string) => `Bundle with ID "${id}" not found`,
            
            // ========== LIFECYCLE MESSAGES ==========
            bundlePublished: (name: string) => `Bundle "${name}" published and is now available for purchase`,
            bundleArchived: (name: string) => `Bundle "${name}" archived and is no longer available`,
            bundleMarkedBroken: (name: string) => `Bundle "${name}" marked as broken`,
            bundleRestored: (name: string) => `Bundle "${name}" restored successfully`,
            
            // ========== VALIDATION ERRORS ==========
            nameRequired: 'Bundle name is required',
            discountTypeRequired: 'Discount type is required',
            fixedPriceRequired: 'Fixed price is required when discount type is "fixed"',
            percentOffRequired: 'Percentage off is required when discount type is "percent"',
            percentOffRange: 'Percentage off must be between 0 and 100',
            itemsRequired: 'At least one bundle item is required',
            invalidQuantity: (qty: number) => `Invalid quantity: ${qty}. Must be greater than 0`,
            duplicateVariant: (variantId: string) => `Variant ${variantId} is already in this bundle`,
            
            // ========== STOCK & AVAILABILITY ERRORS ==========
            insufficientStock: 'Insufficient stock for bundle components',
            variantNotFound: (variantId: string) => `Product variant ${variantId} not found`,
            variantOutOfStock: (variantName: string, required: number, available: number) => 
                `"${variantName}" requires ${required} but only ${available} available`,
            bundleNotAvailable: (name: string) => `Bundle "${name}" is not currently available`,
            bundleCapReached: (name: string, cap: number) => 
                `Bundle "${name}" has reached its maximum capacity of ${cap} units`,
            bundleExpired: (name: string) => `Bundle "${name}" is no longer available (expired)`,
            bundleNotYetActive: (name: string, availableFrom: Date) => 
                `Bundle "${name}" will be available from ${availableFrom.toLocaleDateString()}`,
            
            // ========== COMPONENT HEALTH ERRORS ==========
            brokenComponent: (variantName: string) => `Component "${variantName}" is no longer available`,
            disabledComponent: (variantName: string) => `Component "${variantName}" is disabled`,
            deletedComponent: (variantName: string) => `Component "${variantName}" has been deleted`,
            componentPriceChanged: (variantName: string) => `Price for "${variantName}" has changed`,
            
            // ========== LIFECYCLE TRANSITION ERRORS ==========
            cannotPublishDraft: 'Cannot publish: Bundle has validation errors',
            cannotPublishBroken: 'Cannot publish: Bundle has broken components. Fix issues first',
            cannotArchiveNew: 'Cannot archive: Bundle must be saved first',
            alreadyPublished: 'Bundle is already published',
            alreadyArchived: 'Bundle is already archived',
            
            // ========== ORDER ERRORS ==========
            cannotAddToOrder: (reason: string) => `Cannot add bundle to order: ${reason}`,
            cannotAdjustQuantity: (reason: string) => `Cannot adjust bundle quantity: ${reason}`,
            cannotRemoveBundle: (reason: string) => `Cannot remove bundle from order: ${reason}`,
            bundleKeyNotFound: (key: string) => `Bundle with key "${key}" not found in order`,
            invalidBundleQuantity: (qty: number) => `Invalid bundle quantity: ${qty}`,
            
            // ========== PROMOTION ERRORS ==========
            externalPromosNotAllowed: (bundleName: string) => 
                `External promotions are not allowed on bundle "${bundleName}"`,
            promotionConflict: (promoName: string, bundleName: string) => 
                `Promotion "${promoName}" cannot be applied to bundle "${bundleName}"`,
            maxDiscountExceeded: (max: number) => 
                `Maximum cumulative discount of ${max}% would be exceeded`,
            
            // ========== RESERVATION MESSAGES ==========
            reservationCreated: (bundleId: string, qty: number) => 
                `Reserved ${qty} units of bundle ${bundleId}`,
            reservationReleased: (bundleId: string, qty: number) => 
                `Released ${qty} units of bundle ${bundleId}`,
            reservationFailed: (reason: string) => `Reservation failed: ${reason}`,
            
            // ========== STATUS LABELS ==========
            statusLabels: {
                DRAFT: 'Draft',
                ACTIVE: 'Active',
                BROKEN: 'Broken',
                ARCHIVED: 'Archived',
            },
            
            // ========== DISCOUNT TYPE LABELS ==========
            discountTypes: {
                FIXED: 'Fixed Price',
                PERCENT: 'Percentage Off',
            },
            
            // ========== FIELD LABELS ==========
            fields: {
                name: 'Name',
                slug: 'Slug',
                description: 'Description',
                status: 'Status',
                discountType: 'Discount Type',
                fixedPrice: 'Fixed Price',
                percentOff: 'Percentage Off',
                validFrom: 'Available From',
                validTo: 'Available Until',
                bundleCap: 'Bundle Cap',
                allowExternalPromos: 'Allow External Promotions',
                items: 'Bundle Items',
                version: 'Version',
                assets: 'Assets',
                category: 'Category',
                tags: 'Tags',
            },
            
            // ========== FIELD DESCRIPTIONS ==========
            fieldDescriptions: {
                name: 'Display name for the bundle',
                slug: 'URL-friendly identifier',
                description: 'Detailed description of the bundle',
                discountType: 'How the discount is calculated',
                fixedPrice: 'Final price for the entire bundle',
                percentOff: 'Percentage discount off component total (0-100)',
                validFrom: 'Date when bundle becomes available',
                validTo: 'Date when bundle expires',
                bundleCap: 'Maximum number of bundles that can be sold',
                allowExternalPromos: 'Whether external promotion codes can be applied',
            },
            
            // ========== UI MESSAGES ==========
            confirmDelete: (name: string) => `Are you sure you want to delete bundle "${name}"?`,
            confirmPublish: (name: string) => `Publish bundle "${name}" and make it available for purchase?`,
            confirmArchive: (name: string) => `Archive bundle "${name}" and remove it from sale?`,
            unsavedChanges: 'You have unsaved changes. Discard them?',
            
            // ========== SUCCESS MESSAGES ==========
            operationSuccess: 'Operation completed successfully',
            validationPassed: 'Bundle validation passed',
            stockCheckPassed: 'Stock availability check passed',
            
            // ========== COMPUTED FIELDS ==========
            effectivePrice: 'Effective Price',
            totalSavings: 'Total Savings',
            maxAvailable: 'Maximum Available',
            componentTotal: 'Component Total',
            savingsPercentage: 'Savings Percentage',
        },
        
        [LanguageCode.fr]: {
            // ========== BUNDLE CRUD MESSAGES ==========
            bundleCreated: (name: string) => `Bundle "${name}" créé avec succès`,
            bundleUpdated: (name: string) => `Bundle "${name}" mis à jour avec succès`,
            bundleDeleted: (name: string) => `Bundle "${name}" supprimé avec succès`,
            bundleNotFound: (id: string) => `Bundle avec l'ID "${id}" introuvable`,
            
            // ========== LIFECYCLE MESSAGES ==========
            bundlePublished: (name: string) => `Bundle "${name}" publié et maintenant disponible à l'achat`,
            bundleArchived: (name: string) => `Bundle "${name}" archivé et n'est plus disponible`,
            bundleMarkedBroken: (name: string) => `Bundle "${name}" marqué comme cassé`,
            bundleRestored: (name: string) => `Bundle "${name}" restauré avec succès`,
            
            // ========== VALIDATION ERRORS ==========
            nameRequired: 'Le nom du bundle est requis',
            discountTypeRequired: 'Le type de remise est requis',
            fixedPriceRequired: 'Le prix fixe est requis quand le type de remise est "fixe"',
            percentOffRequired: 'Le pourcentage de réduction est requis quand le type de remise est "pourcentage"',
            percentOffRange: 'Le pourcentage de réduction doit être entre 0 et 100',
            itemsRequired: 'Au moins un article de bundle est requis',
            invalidQuantity: (qty: number) => `Quantité invalide : ${qty}. Doit être supérieure à 0`,
            duplicateVariant: (variantId: string) => `La variante ${variantId} est déjà dans ce bundle`,
            
            // ========== STOCK & AVAILABILITY ERRORS ==========
            insufficientStock: 'Stock insuffisant pour les composants du bundle',
            variantNotFound: (variantId: string) => `Variante de produit ${variantId} introuvable`,
            variantOutOfStock: (variantName: string, required: number, available: number) => 
                `"${variantName}" nécessite ${required} mais seulement ${available} disponible`,
            bundleNotAvailable: (name: string) => `Bundle "${name}" n'est pas disponible actuellement`,
            bundleCapReached: (name: string, cap: number) => 
                `Bundle "${name}" a atteint sa capacité maximale de ${cap} unités`,
            bundleExpired: (name: string) => `Bundle "${name}" n'est plus disponible (expiré)`,
            bundleNotYetActive: (name: string, availableFrom: Date) => 
                `Bundle "${name}" sera disponible à partir du ${availableFrom.toLocaleDateString('fr-FR')}`,
            
            // ========== COMPONENT HEALTH ERRORS ==========
            brokenComponent: (variantName: string) => `Le composant "${variantName}" n'est plus disponible`,
            disabledComponent: (variantName: string) => `Le composant "${variantName}" est désactivé`,
            deletedComponent: (variantName: string) => `Le composant "${variantName}" a été supprimé`,
            componentPriceChanged: (variantName: string) => `Le prix de "${variantName}" a changé`,
            
            // ========== LIFECYCLE TRANSITION ERRORS ==========
            cannotPublishDraft: 'Impossible de publier : Le bundle a des erreurs de validation',
            cannotPublishBroken: 'Impossible de publier : Le bundle a des composants cassés. Corrigez les problèmes d\'abord',
            cannotArchiveNew: 'Impossible d\'archiver : Le bundle doit être enregistré d\'abord',
            alreadyPublished: 'Le bundle est déjà publié',
            alreadyArchived: 'Le bundle est déjà archivé',
            
            // ========== ORDER ERRORS ==========
            cannotAddToOrder: (reason: string) => `Impossible d'ajouter le bundle à la commande : ${reason}`,
            cannotAdjustQuantity: (reason: string) => `Impossible d'ajuster la quantité du bundle : ${reason}`,
            cannotRemoveBundle: (reason: string) => `Impossible de retirer le bundle de la commande : ${reason}`,
            bundleKeyNotFound: (key: string) => `Bundle avec la clé "${key}" introuvable dans la commande`,
            invalidBundleQuantity: (qty: number) => `Quantité de bundle invalide : ${qty}`,
            
            // ========== PROMOTION ERRORS ==========
            externalPromosNotAllowed: (bundleName: string) => 
                `Les promotions externes ne sont pas autorisées sur le bundle "${bundleName}"`,
            promotionConflict: (promoName: string, bundleName: string) => 
                `La promotion "${promoName}" ne peut pas être appliquée au bundle "${bundleName}"`,
            maxDiscountExceeded: (max: number) => 
                `La remise cumulative maximale de ${max}% serait dépassée`,
            
            // ========== RESERVATION MESSAGES ==========
            reservationCreated: (bundleId: string, qty: number) => 
                `${qty} unités du bundle ${bundleId} réservées`,
            reservationReleased: (bundleId: string, qty: number) => 
                `${qty} unités du bundle ${bundleId} libérées`,
            reservationFailed: (reason: string) => `Échec de la réservation : ${reason}`,
            
            // ========== STATUS LABELS ==========
            statusLabels: {
                DRAFT: 'Brouillon',
                ACTIVE: 'Actif',
                BROKEN: 'Cassé',
                ARCHIVED: 'Archivé',
            },
            
            // ========== DISCOUNT TYPE LABELS ==========
            discountTypes: {
                FIXED: 'Prix Fixe',
                PERCENT: 'Pourcentage de Réduction',
            },
            
            // ========== FIELD LABELS ==========
            fields: {
                name: 'Nom',
                slug: 'Identifiant',
                description: 'Description',
                status: 'Statut',
                discountType: 'Type de Remise',
                fixedPrice: 'Prix Fixe',
                percentOff: 'Pourcentage de Réduction',
                validFrom: 'Disponible À Partir Du',
                validTo: 'Disponible Jusqu\'au',
                bundleCap: 'Limite du Bundle',
                allowExternalPromos: 'Autoriser les Promotions Externes',
                items: 'Articles du Bundle',
                version: 'Version',
                assets: 'Médias',
                category: 'Catégorie',
                tags: 'Étiquettes',
            },
            
            // ========== FIELD DESCRIPTIONS ==========
            fieldDescriptions: {
                name: 'Nom d\'affichage pour le bundle',
                slug: 'Identifiant compatible URL',
                description: 'Description détaillée du bundle',
                discountType: 'Comment la remise est calculée',
                fixedPrice: 'Prix final pour l\'ensemble du bundle',
                percentOff: 'Pourcentage de réduction sur le total des composants (0-100)',
                validFrom: 'Date à laquelle le bundle devient disponible',
                validTo: 'Date à laquelle le bundle expire',
                bundleCap: 'Nombre maximum de bundles pouvant être vendus',
                allowExternalPromos: 'Si les codes promotionnels externes peuvent être appliqués',
            },
            
            // ========== UI MESSAGES ==========
            confirmDelete: (name: string) => `Êtes-vous sûr de vouloir supprimer le bundle "${name}" ?`,
            confirmPublish: (name: string) => `Publier le bundle "${name}" et le rendre disponible à l'achat ?`,
            confirmArchive: (name: string) => `Archiver le bundle "${name}" et le retirer de la vente ?`,
            unsavedChanges: 'Vous avez des modifications non enregistrées. Les abandonner ?',
            
            // ========== SUCCESS MESSAGES ==========
            operationSuccess: 'Opération réalisée avec succès',
            validationPassed: 'Validation du bundle réussie',
            stockCheckPassed: 'Vérification de la disponibilité du stock réussie',
            
            // ========== COMPUTED FIELDS ==========
            effectivePrice: 'Prix Effectif',
            totalSavings: 'Économies Totales',
            maxAvailable: 'Maximum Disponible',
            componentTotal: 'Total des Composants',
            savingsPercentage: 'Pourcentage d\'Économies',
        },
        
        [LanguageCode.ar]: {
            // ========== BUNDLE CRUD MESSAGES ==========
            bundleCreated: (name: string) => `تم إنشاء الحزمة "${name}" بنجاح`,
            bundleUpdated: (name: string) => `تم تحديث الحزمة "${name}" بنجاح`,
            bundleDeleted: (name: string) => `تم حذف الحزمة "${name}" بنجاح`,
            bundleNotFound: (id: string) => `الحزمة ذات المعرف "${id}" غير موجودة`,
            
            // ========== LIFECYCLE MESSAGES ==========
            bundlePublished: (name: string) => `تم نشر الحزمة "${name}" وهي الآن متاحة للشراء`,
            bundleArchived: (name: string) => `تم أرشفة الحزمة "${name}" ولم تعد متاحة`,
            bundleMarkedBroken: (name: string) => `تم وضع علامة على الحزمة "${name}" كمعطلة`,
            bundleRestored: (name: string) => `تم استعادة الحزمة "${name}" بنجاح`,
            
            // ========== VALIDATION ERRORS ==========
            nameRequired: 'اسم الحزمة مطلوب',
            discountTypeRequired: 'نوع الخصم مطلوب',
            fixedPriceRequired: 'السعر الثابت مطلوب عندما يكون نوع الخصم "ثابت"',
            percentOffRequired: 'نسبة الخصم مطلوبة عندما يكون نوع الخصم "نسبة مئوية"',
            percentOffRange: 'يجب أن تكون نسبة الخصم بين 0 و 100',
            itemsRequired: 'يجب أن تحتوي الحزمة على عنصر واحد على الأقل',
            invalidQuantity: (qty: number) => `كمية غير صالحة: ${qty}. يجب أن تكون أكبر من 0`,
            duplicateVariant: (variantId: string) => `المتغير ${variantId} موجود بالفعل في هذه الحزمة`,
            
            // ========== STOCK & AVAILABILITY ERRORS ==========
            insufficientStock: 'مخزون غير كافٍ لمكونات الحزمة',
            variantNotFound: (variantId: string) => `متغير المنتج ${variantId} غير موجود`,
            variantOutOfStock: (variantName: string, required: number, available: number) => 
                `"${variantName}" يتطلب ${required} ولكن ${available} فقط متاح`,
            bundleNotAvailable: (name: string) => `الحزمة "${name}" غير متاحة حالياً`,
            bundleCapReached: (name: string, cap: number) => 
                `وصلت الحزمة "${name}" إلى سعتها القصوى وهي ${cap} وحدة`,
            bundleExpired: (name: string) => `الحزمة "${name}" لم تعد متاحة (منتهية الصلاحية)`,
            bundleNotYetActive: (name: string, availableFrom: Date) => 
                `ستكون الحزمة "${name}" متاحة من ${availableFrom.toLocaleDateString('ar-SA')}`,
            
            // ========== COMPONENT HEALTH ERRORS ==========
            brokenComponent: (variantName: string) => `المكون "${variantName}" لم يعد متاحاً`,
            disabledComponent: (variantName: string) => `المكون "${variantName}" معطل`,
            deletedComponent: (variantName: string) => `تم حذف المكون "${variantName}"`,
            componentPriceChanged: (variantName: string) => `تغير سعر "${variantName}"`,
            
            // ========== LIFECYCLE TRANSITION ERRORS ==========
            cannotPublishDraft: 'لا يمكن النشر: الحزمة تحتوي على أخطاء في التحقق',
            cannotPublishBroken: 'لا يمكن النشر: الحزمة تحتوي على مكونات معطلة. يرجى إصلاح المشاكل أولاً',
            cannotArchiveNew: 'لا يمكن الأرشفة: يجب حفظ الحزمة أولاً',
            alreadyPublished: 'الحزمة منشورة بالفعل',
            alreadyArchived: 'الحزمة مؤرشفة بالفعل',
            
            // ========== ORDER ERRORS ==========
            cannotAddToOrder: (reason: string) => `لا يمكن إضافة الحزمة إلى الطلب: ${reason}`,
            cannotAdjustQuantity: (reason: string) => `لا يمكن تعديل كمية الحزمة: ${reason}`,
            cannotRemoveBundle: (reason: string) => `لا يمكن إزالة الحزمة من الطلب: ${reason}`,
            bundleKeyNotFound: (key: string) => `الحزمة ذات المفتاح "${key}" غير موجودة في الطلب`,
            invalidBundleQuantity: (qty: number) => `كمية الحزمة غير صالحة: ${qty}`,
            
            // ========== PROMOTION ERRORS ==========
            externalPromosNotAllowed: (bundleName: string) => 
                `العروض الترويجية الخارجية غير مسموح بها على الحزمة "${bundleName}"`,
            promotionConflict: (promoName: string, bundleName: string) => 
                `لا يمكن تطبيق العرض الترويجي "${promoName}" على الحزمة "${bundleName}"`,
            maxDiscountExceeded: (max: number) => 
                `سيتم تجاوز الحد الأقصى للخصم التراكمي البالغ ${max}%`,
            
            // ========== RESERVATION MESSAGES ==========
            reservationCreated: (bundleId: string, qty: number) => 
                `تم حجز ${qty} وحدات من الحزمة ${bundleId}`,
            reservationReleased: (bundleId: string, qty: number) => 
                `تم إطلاق ${qty} وحدات من الحزمة ${bundleId}`,
            reservationFailed: (reason: string) => `فشل الحجز: ${reason}`,
            
            // ========== STATUS LABELS ==========
            statusLabels: {
                DRAFT: 'مسودة',
                ACTIVE: 'نشط',
                BROKEN: 'معطل',
                ARCHIVED: 'مؤرشف',
            },
            
            // ========== DISCOUNT TYPE LABELS ==========
            discountTypes: {
                FIXED: 'سعر ثابت',
                PERCENT: 'نسبة مئوية من الخصم',
            },
            
            // ========== FIELD LABELS ==========
            fields: {
                name: 'الاسم',
                slug: 'المعرف',
                description: 'الوصف',
                status: 'الحالة',
                discountType: 'نوع الخصم',
                fixedPrice: 'السعر الثابت',
                percentOff: 'نسبة الخصم',
                validFrom: 'متاح من',
                validTo: 'متاح حتى',
                bundleCap: 'حد الحزمة',
                allowExternalPromos: 'السماح بالعروض الترويجية الخارجية',
                items: 'عناصر الحزمة',
                version: 'الإصدار',
                assets: 'الوسائط',
                category: 'الفئة',
                tags: 'الوسوم',
            },
            
            // ========== FIELD DESCRIPTIONS ==========
            fieldDescriptions: {
                name: 'اسم العرض للحزمة',
                slug: 'معرف متوافق مع عناوين URL',
                description: 'وصف تفصيلي للحزمة',
                discountType: 'كيفية حساب الخصم',
                fixedPrice: 'السعر النهائي للحزمة بأكملها',
                percentOff: 'نسبة الخصم من إجمالي المكونات (0-100)',
                validFrom: 'التاريخ الذي تصبح فيه الحزمة متاحة',
                validTo: 'التاريخ الذي تنتهي فيه صلاحية الحزمة',
                bundleCap: 'الحد الأقصى لعدد الحزم التي يمكن بيعها',
                allowExternalPromos: 'ما إذا كان يمكن تطبيق رموز ترويجية خارجية',
            },
            
            // ========== UI MESSAGES ==========
            confirmDelete: (name: string) => `هل أنت متأكد من رغبتك في حذف الحزمة "${name}"؟`,
            confirmPublish: (name: string) => `نشر الحزمة "${name}" وجعلها متاحة للشراء؟`,
            confirmArchive: (name: string) => `أرشفة الحزمة "${name}" وإزالتها من البيع؟`,
            unsavedChanges: 'لديك تغييرات غير محفوظة. هل تريد تجاهلها؟',
            
            // ========== SUCCESS MESSAGES ==========
            operationSuccess: 'تمت العملية بنجاح',
            validationPassed: 'تم التحقق من الحزمة بنجاح',
            stockCheckPassed: 'تم التحقق من توفر المخزون بنجاح',
            
            // ========== COMPUTED FIELDS ==========
            effectivePrice: 'السعر الفعلي',
            totalSavings: 'إجمالي التوفير',
            maxAvailable: 'الحد الأقصى المتاح',
            componentTotal: 'إجمالي المكونات',
            savingsPercentage: 'نسبة التوفير',
        }
    };
    
    /**
     * Get the current language from RequestContext, defaulting to English
     * Returns the requested language if supported, otherwise defaults to English
     */
    private getLanguageCode(ctx: RequestContext): string {
        const languageCode = ctx.languageCode;
        
        // Check if we have translations for this language
        if (this.translations[languageCode]) {
            return languageCode;
        }
        
        // Default to English for unsupported languages
        return LanguageCode.en;
    }
    
    /**
     * Get translations for the current context language
     */
    private getTranslations(ctx: RequestContext) {
        const languageCode = this.getLanguageCode(ctx);
        return this.translations[languageCode];
    }
    
    // ========== BUNDLE CRUD METHODS ==========
    bundleCreated(ctx: RequestContext, name: string): string {
        return this.getTranslations(ctx).bundleCreated(name);
    }
    
    bundleUpdated(ctx: RequestContext, name: string): string {
        return this.getTranslations(ctx).bundleUpdated(name);
    }
    
    bundleDeleted(ctx: RequestContext, name: string): string {
        return this.getTranslations(ctx).bundleDeleted(name);
    }
    
    bundleNotFound(ctx: RequestContext, id: string): string {
        return this.getTranslations(ctx).bundleNotFound(id);
    }
    
    // ========== LIFECYCLE METHODS ==========
    bundlePublished(ctx: RequestContext, name: string): string {
        return this.getTranslations(ctx).bundlePublished(name);
    }
    
    bundleArchived(ctx: RequestContext, name: string): string {
        return this.getTranslations(ctx).bundleArchived(name);
    }
    
    bundleMarkedBroken(ctx: RequestContext, name: string): string {
        return this.getTranslations(ctx).bundleMarkedBroken(name);
    }
    
    bundleRestored(ctx: RequestContext, name: string): string {
        return this.getTranslations(ctx).bundleRestored(name);
    }
    
    // ========== VALIDATION ERROR METHODS ==========
    nameRequired(ctx: RequestContext): string {
        return this.getTranslations(ctx).nameRequired;
    }
    
    discountTypeRequired(ctx: RequestContext): string {
        return this.getTranslations(ctx).discountTypeRequired;
    }
    
    fixedPriceRequired(ctx: RequestContext): string {
        return this.getTranslations(ctx).fixedPriceRequired;
    }
    
    percentOffRequired(ctx: RequestContext): string {
        return this.getTranslations(ctx).percentOffRequired;
    }
    
    percentOffRange(ctx: RequestContext): string {
        return this.getTranslations(ctx).percentOffRange;
    }
    
    itemsRequired(ctx: RequestContext): string {
        return this.getTranslations(ctx).itemsRequired;
    }
    
    invalidQuantity(ctx: RequestContext, qty: number): string {
        return this.getTranslations(ctx).invalidQuantity(qty);
    }
    
    duplicateVariant(ctx: RequestContext, variantId: string): string {
        return this.getTranslations(ctx).duplicateVariant(variantId);
    }
    
    // ========== STOCK & AVAILABILITY ERROR METHODS ==========
    insufficientStock(ctx: RequestContext): string {
        return this.getTranslations(ctx).insufficientStock;
    }
    
    variantNotFound(ctx: RequestContext, variantId: string): string {
        return this.getTranslations(ctx).variantNotFound(variantId);
    }
    
    variantOutOfStock(ctx: RequestContext, variantName: string, required: number, available: number): string {
        return this.getTranslations(ctx).variantOutOfStock(variantName, required, available);
    }
    
    bundleNotAvailable(ctx: RequestContext, name: string): string {
        return this.getTranslations(ctx).bundleNotAvailable(name);
    }
    
    bundleCapReached(ctx: RequestContext, name: string, cap: number): string {
        return this.getTranslations(ctx).bundleCapReached(name, cap);
    }
    
    bundleExpired(ctx: RequestContext, name: string): string {
        return this.getTranslations(ctx).bundleExpired(name);
    }
    
    bundleNotYetActive(ctx: RequestContext, name: string, availableFrom: Date): string {
        return this.getTranslations(ctx).bundleNotYetActive(name, availableFrom);
    }
    
    // ========== COMPONENT HEALTH ERROR METHODS ==========
    brokenComponent(ctx: RequestContext, variantName: string): string {
        return this.getTranslations(ctx).brokenComponent(variantName);
    }
    
    disabledComponent(ctx: RequestContext, variantName: string): string {
        return this.getTranslations(ctx).disabledComponent(variantName);
    }
    
    deletedComponent(ctx: RequestContext, variantName: string): string {
        return this.getTranslations(ctx).deletedComponent(variantName);
    }
    
    componentPriceChanged(ctx: RequestContext, variantName: string): string {
        return this.getTranslations(ctx).componentPriceChanged(variantName);
    }
    
    // ========== LIFECYCLE TRANSITION ERROR METHODS ==========
    cannotPublishDraft(ctx: RequestContext): string {
        return this.getTranslations(ctx).cannotPublishDraft;
    }
    
    cannotPublishBroken(ctx: RequestContext): string {
        return this.getTranslations(ctx).cannotPublishBroken;
    }
    
    cannotArchiveNew(ctx: RequestContext): string {
        return this.getTranslations(ctx).cannotArchiveNew;
    }
    
    alreadyPublished(ctx: RequestContext): string {
        return this.getTranslations(ctx).alreadyPublished;
    }
    
    alreadyArchived(ctx: RequestContext): string {
        return this.getTranslations(ctx).alreadyArchived;
    }
    
    // ========== ORDER ERROR METHODS ==========
    cannotAddToOrder(ctx: RequestContext, reason: string): string {
        return this.getTranslations(ctx).cannotAddToOrder(reason);
    }
    
    cannotAdjustQuantity(ctx: RequestContext, reason: string): string {
        return this.getTranslations(ctx).cannotAdjustQuantity(reason);
    }
    
    cannotRemoveBundle(ctx: RequestContext, reason: string): string {
        return this.getTranslations(ctx).cannotRemoveBundle(reason);
    }
    
    bundleKeyNotFound(ctx: RequestContext, key: string): string {
        return this.getTranslations(ctx).bundleKeyNotFound(key);
    }
    
    invalidBundleQuantity(ctx: RequestContext, qty: number): string {
        return this.getTranslations(ctx).invalidBundleQuantity(qty);
    }
    
    // ========== PROMOTION ERROR METHODS ==========
    externalPromosNotAllowed(ctx: RequestContext, bundleName: string): string {
        return this.getTranslations(ctx).externalPromosNotAllowed(bundleName);
    }
    
    promotionConflict(ctx: RequestContext, promoName: string, bundleName: string): string {
        return this.getTranslations(ctx).promotionConflict(promoName, bundleName);
    }
    
    maxDiscountExceeded(ctx: RequestContext, max: number): string {
        return this.getTranslations(ctx).maxDiscountExceeded(max);
    }
    
    // ========== RESERVATION MESSAGE METHODS ==========
    reservationCreated(ctx: RequestContext, bundleId: string, qty: number): string {
        return this.getTranslations(ctx).reservationCreated(bundleId, qty);
    }
    
    reservationReleased(ctx: RequestContext, bundleId: string, qty: number): string {
        return this.getTranslations(ctx).reservationReleased(bundleId, qty);
    }
    
    reservationFailed(ctx: RequestContext, reason: string): string {
        return this.getTranslations(ctx).reservationFailed(reason);
    }
    
    // ========== STATUS LABEL METHODS ==========
    statusLabel(ctx: RequestContext, status: string): string {
        const translations = this.getTranslations(ctx);
        return translations.statusLabels[status as keyof typeof translations.statusLabels] || status;
    }
    
    // ========== DISCOUNT TYPE LABEL METHODS ==========
    discountTypeLabel(ctx: RequestContext, type: string): string {
        const translations = this.getTranslations(ctx);
        return translations.discountTypes[type as keyof typeof translations.discountTypes] || type;
    }
    
    // ========== FIELD LABEL METHODS (for static use without ctx) ==========
    fieldLabel(languageCode: LanguageCode, fieldName: string): string {
        const translations = this.translations[languageCode] || this.translations[LanguageCode.en];
        return translations?.fields?.[fieldName] || fieldName;
    }
    
    fieldDescription(languageCode: LanguageCode, fieldName: string): string {
        const translations = this.translations[languageCode] || this.translations[LanguageCode.en];
        return translations?.fieldDescriptions?.[fieldName] || '';
    }
    
    // ========== UI MESSAGE METHODS ==========
    confirmDelete(ctx: RequestContext, name: string): string {
        return this.getTranslations(ctx).confirmDelete(name);
    }
    
    confirmPublish(ctx: RequestContext, name: string): string {
        return this.getTranslations(ctx).confirmPublish(name);
    }
    
    confirmArchive(ctx: RequestContext, name: string): string {
        return this.getTranslations(ctx).confirmArchive(name);
    }
    
    unsavedChanges(ctx: RequestContext): string {
        return this.getTranslations(ctx).unsavedChanges;
    }
    
    // ========== SUCCESS MESSAGE METHODS ==========
    operationSuccess(ctx: RequestContext): string {
        return this.getTranslations(ctx).operationSuccess;
    }
    
    validationPassed(ctx: RequestContext): string {
        return this.getTranslations(ctx).validationPassed;
    }
    
    stockCheckPassed(ctx: RequestContext): string {
        return this.getTranslations(ctx).stockCheckPassed;
    }
    
    /**
     * Get all supported languages
     */
    getSupportedLanguages(): string[] {
        return Object.keys(this.translations);
    }
    
    /**
     * Check if a language is supported
     */
    isLanguageSupported(languageCode: string): boolean {
        return !!this.translations[languageCode];
    }
}
