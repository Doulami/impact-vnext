import React from 'react';

export default function Footer() {
  return (
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
            <h4 className="font-bold mb-4 text-sm">About IMPACT NUTRITION</h4>
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
          <p>© 2025 Impact Nutrition</p>
        </div>
      </div>
    </footer>
  );
}