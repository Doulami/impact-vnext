'use client';

import { User, Menu } from 'lucide-react';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import Link from 'next/link';
import MiniCart from '@/components/MiniCart';
import SearchBar from '@/components/SearchBar';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Top Announcement Bar */}
      <div id="top-announcement" className="bg-black text-white text-center py-2 text-xs">
        <p>Save $5 on your FIRST $30+ order • 25% off ALL code <strong>PRO25</strong> through 1/02/25</p>
      </div>

      {/* Header */}
      <header id="main-header" className="bg-black text-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            {/* Logo */}
            <Link href="/" id="header-logo" className="flex items-center">
              <img src="/impactlogo.webp" alt="Impact Nutrition" className="h-8" />
            </Link>
            
            {/* Search Bar */}
            <div id="header-search" className="flex-1 max-w-md mx-8">
              <SearchBar placeholder="Search products..." />
            </div>
            
            {/* Header Actions */}
            <div id="header-actions" className="flex items-center gap-6 text-xs">
              <a href="#" className="hover:text-gray-300">Help & Support</a>
              <User className="w-5 h-5 cursor-pointer" />
              <MiniCart />
            </div>
          </div>
          
          {/* Main Navigation */}
          <nav id="main-nav" className="border-t border-gray-800">
            <ul className="flex items-center justify-center gap-8 py-3 text-xs font-medium">
              <li><Link href="/products" className="hover:text-gray-300">SHOP BY PRODUCT</Link></li>
              <li><a href="#goals-section" className="hover:text-gray-300">SHOP BY GOALS</a></li>
              <li><a href="#" className="hover:text-gray-300">BUNDLES</a></li>
              <li><a href="#" className="hover:text-gray-300">ATHLETES</a></li>
              <li><a href="#" className="text-red-500 hover:text-red-400">SPECIAL DEALS</a></li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Hero Banner - Split Design */}
      <section id="hero-banner" className="grid lg:grid-cols-2">
        {/* Left - Woman with Protein Shake */}
        <div id="hero-left" className="bg-white relative">
          <img src="/athletesmiling.jpg" alt="Woman with protein shake" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white p-8 max-w-sm">
              <h2 className="text-3xl font-bold mb-2">Save & Replenish Like a PRO: 30% OFF</h2>
              <h3 className="text-xl font-bold text-blue-600 mb-4">NEW PRO Stretch</h3>
              <p className="text-sm mb-6">Mix 1 serving (1 scoop) of Optimum PRO25in 8-10oz of cold water</p>
              <Link href="/products" className="bg-black text-white px-8 py-3 text-sm font-medium hover:bg-gray-800 inline-block">
                SHOP NOW
              </Link>
            </div>
          </div>
        </div>
        
        {/* Right - Product Image */}
        <div id="hero-right" className="bg-gradient-to-br from-red-500 to-pink-400 relative">
          <div className="flex items-center justify-center h-full p-12">
            <img src="/products/COLLAGEN-FRUITS.png" alt="Collagen-C Product" className="max-w-md" />
          </div>
        </div>
      </section>

      {/* Your Journey Starts Here - Real Products from Vendure */}
      <FeaturedProducts />

      {/* Split Promotional Banners */}
      <section id="promo-banners" className="grid lg:grid-cols-2">
        {/* Green - Creatine Banner */}
        <div id="promo-creatine" className="bg-green-600 text-white p-16 text-center relative">
          <h3 className="text-2xl font-bold mb-4">The future of Creatine is Here!</h3>
          <p className="mb-8">It all Happen on 11 Stop by & warm Support</p>
          <img src="/product-citrulline.png" alt="Citrulline" className="mx-auto max-w-xs mb-6" />
          <Link href="/products" className="bg-white text-green-600 px-8 py-3 font-medium hover:bg-gray-100 inline-block">
            SHOP NOW
          </Link>
        </div>
        
        {/* Orange - Protein Banner */}
        <div id="promo-protein" className="bg-orange-600 text-white p-16 text-center relative">
          <h3 className="text-2xl font-bold mb-4">How Much Protein Do I Need?</h3>
          <p className="mb-8">Find out for make recommendation base you protein</p>
          <img src="/product-hydro-eaa.png" alt="Hydro EAA" className="mx-auto max-w-xs mb-6" />
          <button className="bg-white text-orange-600 px-8 py-3 font-medium hover:bg-gray-100">
            TAKE THE QUIZ
          </button>
        </div>
      </section>

      {/* Save on Favorite Supplements */}
      <section id="save-section" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 id="save-title" className="text-3xl font-bold text-center mb-12">Save on your favorite supplements</h2>
          
          <div id="save-content" className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img src="/woman-kitchen.jpg" alt="Woman in kitchen" className="w-full" />
            </div>
            <div className="bg-white p-8">
              <h3 className="text-2xl font-bold mb-4">Buy More Save More</h3>
              <ul className="space-y-2 mb-6">
                <li className="text-lg"><strong>15% Off</strong> Orders $100 or More</li>
                <li className="text-lg"><strong>20% Off</strong> Orders $150 or More</li>
                <li className="text-lg"><strong>25% Off</strong> Orders $200 or More</li>
              </ul>
              <Link href="/products" className="border-2 border-black px-8 py-3 font-medium hover:bg-black hover:text-white inline-block">
                SHOP SALE
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Questions Banner */}
      <section id="questions-banner" className="grid lg:grid-cols-2">
        <div className="bg-orange-500 text-white p-16">
          <h2 className="text-4xl font-bold mb-6">Questions about sports nutrition?</h2>
          <button className="bg-black text-white px-8 py-3 font-medium hover:bg-gray-800">
            GET EXPERT TIPS HERE
          </button>
        </div>
        <div className="bg-gray-100">
          <img src="/sport-cerveau.webp" alt="ON Character" className="w-full h-full object-cover" />
        </div>
      </section>

      {/* Unlocked Banner */}
      <section id="unlocked-banner" className="grid lg:grid-cols-2">
        <div className="bg-gradient-to-r from-orange-400 to-yellow-300">
          <img src="/athletesmiling.jpg" alt="Athlete" className="w-full h-full object-cover" />
        </div>
        <div className="bg-yellow-200 p-16 flex flex-col justify-center">
          <h2 className="text-5xl font-bold mb-6">Unlocked.</h2>
          <p className="text-xl mb-8"><strong>WELCOME 3.0 IS HERE!</strong></p>
          <p className="mb-8">Tracking the weight you've gained or and body start</p>
          <button className="bg-black text-white px-8 py-3 font-medium hover:bg-gray-800 inline-block">
            SIGN UP AND GET 5% OFF
          </button>
        </div>
      </section>

      {/* Reach Your Potential */}
      <section id="goals-section" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 id="goals-title" className="text-3xl font-bold text-center mb-4">Reach your potential</h2>
          <p className="text-center text-gray-600 mb-12">Optimum Nutrition products to fit your specific health</p>
          
          <div id="goals-grid" className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <GoalCard title="What's your goal?" bg="bg-black" />
            <GoalCard title="Weight gain" bg="bg-green-500" />
            <GoalCard title="Prepare before training" bg="bg-purple-500" />
            <GoalCard title="Recovery after training" bg="bg-red-500" />
            <GoalCard title="Anytime energy" bg="bg-blue-500" />
          </div>
        </div>
      </section>

      {/* Education and Resources */}
      <section id="education-section" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 id="education-title" className="text-3xl font-bold text-center mb-12">Education and Resources</h2>
          
          <div id="education-grid" className="grid md:grid-cols-3 gap-6">
            <ResourceCard 
              title="ARTICLES & ADVICE"
              image="/resource-articles.jpg"
            />
            <ResourceCard 
              title="PROTEIN-PACKED RECIPES"
              image="/resource-recipes.jpg"
            />
            <ResourceCard 
              title="Protein Explained"
              image="/resource-protein.jpg"
            />
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section id="newsletter-section" className="py-16 bg-white border-t">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-2">SIGN UP TO OUR NEWSLETTER</h2>
          <h3 className="text-xl font-bold mb-4">AND GET 15% OFF YOUR FIRST ORDER</h3>
          <p className="text-sm text-gray-600 mb-8">Celebrate Friendship & Save! Special offer for Newcomers. Enjoy 15% off your 1st order!</p>
          
          <div className="flex gap-4 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Email address" 
              className="flex-1 border border-gray-300 px-4 py-3 text-sm"
            />
            <button className="bg-black text-white px-8 py-3 text-sm font-medium hover:bg-gray-800">
              SIGN UP
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="main-footer" className="bg-black text-white py-12">
        <div className="container mx-auto px-4">
          <div id="footer-content" className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div id="footer-support">
              <h4 className="font-bold mb-4 text-sm">Customer Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Shipping & Returns</a></li>
                <li><a href="#" className="hover:text-white">Track Order</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
            <div id="footer-about">
              <h4 className="font-bold mb-4 text-sm">About OPTIMUM NUTRITION</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Our Story</a></li>
                <li><a href="#" className="hover:text-white">Our Quality</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Athletes</a></li>
              </ul>
            </div>
            <div id="footer-explore">
              <h4 className="font-bold mb-4 text-sm">Explore</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Articles</a></li>
                <li><a href="#" className="hover:text-white">Recipes</a></li>
                <li><a href="#" className="hover:text-white">Bundles</a></li>
                <li><a href="#" className="hover:text-white">Samples</a></li>
              </ul>
            </div>
            <div id="footer-help">
              <h4 className="font-bold mb-4 text-sm">Need Help?</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">1-800-705-5226</a></li>
              </ul>
            </div>
          </div>
          
          <div id="footer-bottom" className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <div className="flex gap-4 mb-4 md:mb-0">
              <a href="#" className="hover:text-white">Terms & Conditions</a>
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Accessibility</a>
            </div>
            <div className="flex gap-4">
              <img src="/payment-visa.png" alt="Visa" className="h-6" />
              <img src="/payment-mastercard.png" alt="Mastercard" className="h-6" />
              <img src="/payment-amex.png" alt="Amex" className="h-6" />
              <img src="/payment-paypal.png" alt="PayPal" className="h-6" />
            </div>
          </div>
          
          <div className="text-center mt-6 text-xs text-gray-500">
            <p>© 2025 Optimum Nutrition</p>
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
function ResourceCard({ title, image }: { title: string; image: string }) {
  return (
    <div className="bg-white border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
      <div className="aspect-video bg-gray-200 flex items-center justify-center">
        <div className="text-4xl">📸</div>
      </div>
      <div className="p-6 text-center">
        <h3 className="font-bold text-sm mb-2">{title}</h3>
        <button className="text-xs underline hover:no-underline">EXPLORE MORE</button>
      </div>
    </div>
  );
}
