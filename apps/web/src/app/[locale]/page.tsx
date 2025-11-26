'use client';

import { FeaturedProducts } from '@/components/FeaturedProducts';
import Link from 'next/link';
import Header from '@/components/Header';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';

// Force dynamic rendering to avoid prerendering errors
export const dynamic = 'force-dynamic';

export default function Home() {
  const t = useTranslations('homepage');
  const tFooter = useTranslations('footer');
  const locale = useLocale();
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header />

      {/* Hero Banner - Split Design */}
      <section id="hero-banner" className="grid lg:grid-cols-2">
        {/* Left - Woman with Protein Shake */}
        <div id="hero-left" className="bg-white relative">
          <img src="/athletesmiling.jpg" alt={t('hero.athleteAlt')} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white p-8 max-w-sm">
              <h2 className="text-3xl font-bold mb-2">{t('hero.save')}</h2>
              <h3 className="text-xl font-bold text-blue-600 mb-4">{t('hero.newProStretch')}</h3>
              <p className="text-sm mb-6">{t('hero.mixInstructions')}</p>
              <Link href={`/${locale}/products`} className="bg-black text-white px-8 py-3 text-sm font-medium hover:bg-gray-800 inline-block">
                {t('hero.shopNow')}
              </Link>
            </div>
          </div>
        </div>
        
        {/* Right - Product Image */}
        <div id="hero-right" className="bg-gradient-to-br from-red-500 to-pink-400 relative">
          <div className="flex items-center justify-center h-full p-12">
            <img src="/products/COLLAGEN-FRUITS.png" alt={t('hero.productAlt')} className="max-w-md" />
          </div>
        </div>
      </section>

      {/* Your Journey Starts Here - Real Products from Vendure */}
      <FeaturedProducts />

      {/* Split Promotional Banners */}
      <section id="promo-banners" className="grid lg:grid-cols-2">
        {/* Green - Creatine Banner */}
        <div id="promo-creatine" className="bg-green-600 text-white p-16 text-center relative">
          <h3 className="text-2xl font-bold mb-4">{t('promos.creatine.title')}</h3>
          <p className="mb-8">{t('promos.creatine.description')}</p>
          <img src="/product-citrulline.png" alt={t('promos.creatine.productAlt')} className="mx-auto max-w-xs mb-6" />
          <Link href={`/${locale}/products`} className="bg-white text-green-600 px-8 py-3 font-medium hover:bg-gray-100 inline-block">
            {t('hero.shopNow')}
          </Link>
        </div>
        
        {/* Orange - Protein Banner */}
        <div id="promo-protein" className="bg-orange-600 text-white p-16 text-center relative">
          <h3 className="text-2xl font-bold mb-4">{t('promos.protein.title')}</h3>
          <p className="mb-8">{t('promos.protein.description')}</p>
          <img src="/product-hydro-eaa.png" alt={t('promos.protein.productAlt')} className="mx-auto max-w-xs mb-6" />
          <button className="bg-white text-orange-600 px-8 py-3 font-medium hover:bg-gray-100">
            {t('promos.protein.takeQuiz')}
          </button>
        </div>
      </section>

      {/* Save on Favorite Supplements */}
      <section id="save-section" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 id="save-title" className="text-3xl font-bold text-center mb-12">{t('save.title')}</h2>
          
          <div id="save-content" className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img src="/woman-kitchen.jpg" alt={t('save.imageAlt')} className="w-full" />
            </div>
            <div className="bg-white p-8">
              <h3 className="text-2xl font-bold mb-4">{t('save.buyMoreTitle')}</h3>
              <ul className="space-y-2 mb-6">
                <li className="text-lg"><strong>{t('save.discount15')}</strong></li>
                <li className="text-lg"><strong>{t('save.discount20')}</strong></li>
                <li className="text-lg"><strong>{t('save.discount25')}</strong></li>
              </ul>
              <Link href={`/${locale}/products`} className="border-2 border-black px-8 py-3 font-medium hover:bg-black hover:text-white inline-block">
                {t('save.shopSale')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Questions Banner */}
      <section id="questions-banner" className="grid lg:grid-cols-2">
        <div className="bg-orange-500 text-white p-16">
          <h2 className="text-4xl font-bold mb-6">{t('questions.title')}</h2>
          <button className="bg-black text-white px-8 py-3 font-medium hover:bg-gray-800">
            {t('questions.getExpertTips')}
          </button>
        </div>
        <div className="bg-gray-100">
          <img src="/sport-cerveau.webp" alt={t('questions.characterAlt')} className="w-full h-full object-cover" />
        </div>
      </section>

      {/* Unlocked Banner */}
      <section id="unlocked-banner" className="grid lg:grid-cols-2">
        <div className="bg-gradient-to-r from-orange-400 to-yellow-300">
          <img src="/athletesmiling.jpg" alt={t('unlocked.athleteAlt')} className="w-full h-full object-cover" />
        </div>
        <div className="bg-yellow-200 p-16 flex flex-col justify-center">
          <h2 className="text-5xl font-bold mb-6">{t('unlocked.title')}</h2>
          <p className="text-xl mb-8"><strong>{t('unlocked.subtitle')}</strong></p>
          <p className="mb-8">{t('unlocked.description')}</p>
          <button className="bg-black text-white px-8 py-3 font-medium hover:bg-gray-800 inline-block">
            {t('unlocked.signUpOffer')}
          </button>
        </div>
      </section>

      {/* Reach Your Potential */}
      <section id="goals-section" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 id="goals-title" className="text-3xl font-bold text-center mb-4">{t('goals.title')}</h2>
          <p className="text-center text-gray-600 mb-12">{t('goals.subtitle')}</p>
          
          <div id="goals-grid" className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <GoalCard title={t('goals.whatsYourGoal')} bg="bg-black" />
            <GoalCard title={t('goals.weightGain')} bg="bg-green-500" />
            <GoalCard title={t('goals.prepareTraining')} bg="bg-purple-500" />
            <GoalCard title={t('goals.recoveryTraining')} bg="bg-red-500" />
            <GoalCard title={t('goals.anytimeEnergy')} bg="bg-blue-500" />
          </div>
        </div>
      </section>

      {/* Education and Resources */}
      <section id="education-section" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 id="education-title" className="text-3xl font-bold text-center mb-12">{t('education.title')}</h2>
          
          <div id="education-grid" className="grid md:grid-cols-3 gap-6">
            <ResourceCard 
              title={t('education.articlesAdvice')}
              image="/resource-articles.jpg"
              exploreText={t('education.exploreMore')}
            />
            <ResourceCard 
              title={t('education.recipes')}
              image="/resource-recipes.jpg"
              exploreText={t('education.exploreMore')}
            />
            <ResourceCard 
              title={t('education.proteinExplained')}
              image="/resource-protein.jpg"
              exploreText={t('education.exploreMore')}
            />
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section id="newsletter-section" className="py-16 bg-white border-t">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-2">{t('newsletter.title')}</h2>
          <h3 className="text-xl font-bold mb-4">{t('newsletter.discount')}</h3>
          <p className="text-sm text-gray-600 mb-8">{t('newsletter.description')}</p>
          
          <div className="flex gap-4 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder={t('newsletter.emailPlaceholder')} 
              className="flex-1 border border-gray-300 px-4 py-3 text-sm"
            />
            <button className="bg-black text-white px-8 py-3 text-sm font-medium hover:bg-gray-800">
              {t('newsletter.signUp')}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="main-footer" className="bg-black text-white py-12">
        <div className="container mx-auto px-4">
          <div id="footer-content" className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div id="footer-support">
              <h4 className="font-bold mb-4 text-sm">{tFooter('customerSupport')}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">{tFooter('contactUs')}</a></li>
                <li><a href="#" className="hover:text-white">{tFooter('shippingReturns')}</a></li>
                <li><a href="#" className="hover:text-white">{tFooter('trackOrder')}</a></li>
                <li><a href="#" className="hover:text-white">{tFooter('faq')}</a></li>
              </ul>
            </div>
            <div id="footer-about">
              <h4 className="font-bold mb-4 text-sm">{tFooter('aboutImpactNutrition')}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">{tFooter('ourStory')}</a></li>
                <li><a href="#" className="hover:text-white">{tFooter('ourQuality')}</a></li>
                <li><a href="#" className="hover:text-white">{tFooter('careers')}</a></li>
                <li><a href="#" className="hover:text-white">{tFooter('athletes')}</a></li>
              </ul>
            </div>
            <div id="footer-explore">
              <h4 className="font-bold mb-4 text-sm">{tFooter('explore')}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">{tFooter('articles')}</a></li>
                <li><a href="#" className="hover:text-white">{tFooter('recipes')}</a></li>
                <li><a href="#" className="hover:text-white">{tFooter('bundles')}</a></li>
                <li><a href="#" className="hover:text-white">{tFooter('samples')}</a></li>
              </ul>
            </div>
            <div id="footer-help">
              <h4 className="font-bold mb-4 text-sm">{tFooter('needHelp')}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">1-800-705-5226</a></li>
              </ul>
            </div>
          </div>
          
          <div id="footer-bottom" className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <div className="flex gap-4 mb-4 md:mb-0">
              <a href="#" className="hover:text-white">{tFooter('termsConditions')}</a>
              <a href="#" className="hover:text-white">{tFooter('privacyPolicy')}</a>
              <a href="#" className="hover:text-white">{tFooter('accessibility')}</a>
            </div>
            <div className="flex gap-4">
              <img src="/payment-visa.png" alt="Visa" className="h-6" />
              <img src="/payment-mastercard.png" alt="Mastercard" className="h-6" />
              <img src="/payment-amex.png" alt="Amex" className="h-6" />
              <img src="/payment-paypal.png" alt="PayPal" className="h-6" />
            </div>
          </div>
          
          <div className="text-center mt-6 text-xs text-gray-500">
            <p>{tFooter('copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}


// Goal Card Component
function GoalCard({ title, bg }: { title: string; bg: string }) {
  return (
    <div className={`${bg} text-white p-8 text-center aspect-square flex flex-col items-center justify-center cursor-pointer hover:opacity-90 transition-opacity`}>
      <div className="mb-4 text-5xl">💪</div>
      <h3 className="font-bold text-sm">{title}</h3>
    </div>
  );
}

// Resource Card Component
function ResourceCard({ title, image, exploreText }: { title: string; image: string; exploreText: string }) {
  return (
    <div className="bg-white border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
      <div className="aspect-video bg-gray-200 flex items-center justify-center">
        <div className="text-4xl">📸</div>
      </div>
      <div className="p-6 text-center">
        <h3 className="font-bold text-sm mb-2">{title}</h3>
        <button className="text-xs underline hover:no-underline">{exploreText}</button>
      </div>
    </div>
  );
}
