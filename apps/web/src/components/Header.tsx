'use client';

import { User } from 'lucide-react';
import Link from 'next/link';
import MiniCart from '@/components/MiniCart';
import SearchBar from '@/components/SearchBar';
import { useSearchParams } from 'next/navigation';

interface HeaderProps {
  showSearch?: boolean;
  searchPlaceholder?: string;
  showSearchDropdown?: boolean;
  className?: string;
}

export default function Header({ 
  showSearch = true,
  searchPlaceholder = "Search products...",
  showSearchDropdown = true,
  className = ""
}: HeaderProps) {
  const searchParams = useSearchParams();
  const currentSearchTerm = searchParams.get('search') || searchParams.get('q') || '';

  return (
    <header className={`bg-black text-white ${className}`}>
      {/* Top Announcement Bar */}
      <div className="bg-black text-white text-center py-2 text-xs">
        <p>Save $5 on your FIRST $30+ order • 25% off ALL code <strong>PRO25</strong> through 1/02/25</p>
      </div>

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img src="/impactlogo.webp" alt="Impact Nutrition" className="h-8" />
          </Link>
          
          {/* Search Bar */}
          {showSearch && (
            <div className="flex-1 max-w-md mx-8">
              <SearchBar 
                placeholder={searchPlaceholder}
                initialValue={currentSearchTerm}
                showDropdown={showSearchDropdown}
              />
            </div>
          )}
          
          {/* Header Actions */}
          <div className="flex items-center gap-6 text-xs">
            <a href="#" className="hover:text-gray-300">Help & Support</a>
            <User className="w-5 h-5 cursor-pointer" />
            <MiniCart />
          </div>
        </div>
        
        {/* Main Navigation */}
        <nav className="border-t border-gray-800">
          <ul className="flex items-center justify-center gap-8 py-3 text-xs font-medium">
            <li>
              <Link 
                href="/products" 
                className="hover:text-gray-300 font-bold"
              >
                SHOP BY PRODUCT
              </Link>
            </li>
            <li><Link href="/#goals-section" className="hover:text-gray-300">SHOP BY GOALS</Link></li>
            <li><a href="#" className="hover:text-gray-300">BUNDLES</a></li>
            <li><a href="#" className="hover:text-gray-300">ATHLETES</a></li>
            <li><a href="#" className="text-red-500 hover:text-red-400">SPECIAL DEALS</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}