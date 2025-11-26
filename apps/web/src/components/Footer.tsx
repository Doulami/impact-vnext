import React from 'react';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('footer');
  return (
    <footer id="main-footer" className="bg-black text-white py-12">
      <div className="container mx-auto px-4">
        <div id="footer-content" className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div id="footer-support">
            <h4 className="font-bold mb-4 text-sm">{t('customerSupport')}</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">{t('contactUs')}</a></li>
              <li><a href="#" className="hover:text-white">{t('shippingReturns')}</a></li>
              <li><a href="#" className="hover:text-white">{t('trackOrder')}</a></li>
              <li><a href="#" className="hover:text-white">{t('faq')}</a></li>
            </ul>
          </div>
          <div id="footer-about">
            <h4 className="font-bold mb-4 text-sm">{t('aboutImpactNutrition')}</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">{t('ourStory')}</a></li>
              <li><a href="#" className="hover:text-white">{t('ourQuality')}</a></li>
              <li><a href="#" className="hover:text-white">{t('careers')}</a></li>
              <li><a href="#" className="hover:text-white">{t('athletes')}</a></li>
            </ul>
          </div>
          <div id="footer-explore">
            <h4 className="font-bold mb-4 text-sm">{t('explore')}</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">{t('articles')}</a></li>
              <li><a href="#" className="hover:text-white">{t('recipes')}</a></li>
              <li><a href="/bundles" className="hover:text-white">{t('bundles')}</a></li>
              <li><a href="#" className="hover:text-white">{t('samples')}</a></li>
            </ul>
          </div>
          <div id="footer-help">
            <h4 className="font-bold mb-4 text-sm">{t('needHelp')}</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">1-800-705-5226</a></li>
            </ul>
          </div>
        </div>
        
        <div id="footer-bottom" className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
          <div className="flex gap-4 mb-4 md:mb-0">
            <a href="#" className="hover:text-white">{t('termsConditions')}</a>
            <a href="#" className="hover:text-white">{t('privacyPolicy')}</a>
            <a href="#" className="hover:text-white">{t('accessibility')}</a>
          </div>
          <div className="flex gap-4">
            <img src="/payment-visa.png" alt="Visa" className="h-6" />
            <img src="/payment-mastercard.png" alt="Mastercard" className="h-6" />
            <img src="/payment-amex.png" alt="Amex" className="h-6" />
            <img src="/payment-paypal.png" alt="PayPal" className="h-6" />
          </div>
        </div>
        
        <div className="text-center mt-6 text-xs text-gray-500">
          <p>{t('copyright')}</p>
        </div>
      </div>
    </footer>
  );
}