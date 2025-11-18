'use client';

import { User, LogIn, LogOut, Settings, Package, ChevronDown, ShoppingBag, Globe } from 'lucide-react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/hooks/useCart';
import { useLanguage, type LanguageCode } from '@/lib/contexts/LanguageContext';

// Language Switcher Component
function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages: { code: LanguageCode; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 md:gap-2 hover:text-gray-300 transition-colors text-xs"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden md:inline">{currentLang.flag}</span>
        <span className="md:hidden">{currentLang.flag}</span>
        <ChevronDown className="w-3 h-3 hidden md:inline" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          <div 
            ref={dropdownRef}
            className="absolute right-0 top-full mt-2 w-36 bg-white text-black shadow-xl border border-gray-200 rounded-lg z-50 py-1"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  language === lang.code ? 'bg-gray-100 font-medium' : ''
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                {lang.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// User Menu Component
function UserMenu() {
  const { isAuthenticated, customer, logout, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  if (isLoading) {
    return (
      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-4 text-xs">
        <Link 
          href="/login" 
          className="hover:text-gray-300 flex items-center gap-1"
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </Link>
        <Link 
          href="/register" 
          className="bg-white text-black px-3 py-1.5 rounded hover:bg-gray-100 transition-colors font-medium"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:text-gray-300 transition-colors text-xs"
      >
        <User className="w-5 h-5" />
        <span className="hidden sm:inline">
          {customer?.firstName || 'Account'}
        </span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          <div 
            ref={dropdownRef}
            className="absolute right-0 top-full mt-2 w-48 bg-white text-black shadow-xl border border-gray-200 rounded-lg z-50 py-2"
          >
            {/* User Info */}
            <div className="px-4 py-2 border-b border-gray-200">
              <p className="font-medium text-sm">
                {customer?.firstName} {customer?.lastName}
              </p>
              <p className="text-xs text-gray-600">
                {customer?.emailAddress}
              </p>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <Link
                href="/account"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Account Settings
              </Link>
              <Link
                href="/account/orders"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                <Package className="w-4 h-4" />
                Order History
              </Link>
            </div>

            {/* Logout */}
            <div className="border-t border-gray-200 py-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface HeaderProps {
  showSearch?: boolean;
  searchPlaceholder?: string;
  showSearchDropdown?: boolean;
  className?: string;
}

function HeaderContent({ 
  showSearch = true,
  searchPlaceholder = "Search products...",
  showSearchDropdown = true,
  className = ""
}: HeaderProps) {
  const searchParams = useSearchParams();
  const currentSearchTerm = searchParams.get('search') || searchParams.get('q') || '';
  const { totalItems, openCart } = useCart();

  return (
    <>
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
            <div className="flex items-center gap-4 md:gap-6 text-xs">
              <a href="#" className="hover:text-gray-300 hidden md:inline">Help & Support</a>
              <LanguageSwitcher />
              <UserMenu />
              {/* Cart Button */}
              <button
                onClick={openCart}
                className="relative hover:text-gray-300 transition-colors"
                aria-label="Shopping cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Navigation - Full Width */}
      <nav id="main-navigation" className="border-t border-gray-800 nav-gradient-wave">
        <div className="container mx-auto px-4">
          <ul className="flex items-center justify-center gap-8 py-3 text-xs font-medium">
            <li>
              <Link 
                href="/products" 
                className="nav-text font-bold"
              >
                SHOP BY PRODUCT
              </Link>
            </li>
            <li><Link href="/#goals-section" className="nav-text">SHOP BY GOALS</Link></li>
            <li><Link href="/bundles" className="nav-text">BUNDLES</Link></li>
            <li><a href="#" className="nav-text">ATHLETES</a></li>
            <li>
              <a href="#" className="bg-white text-[var(--brand-primary)] px-4 py-1.5 rounded-md hover:bg-gray-100 transition-colors font-bold shadow-lg">
                SPECIAL DEALS
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}

export default function Header(props: HeaderProps) {
  return (
    <Suspense fallback={
      <>
        <header className={`bg-black text-white ${props.className || ''}`}>
          <div className="bg-black text-white text-center py-2 text-xs">
            <p>Save $5 on your FIRST $30+ order • 25% off ALL code <strong>PRO25</strong> through 1/02/25</p>
          </div>
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between py-3">
              <Link href="/" className="flex items-center">
                <img src="/impactlogo.webp" alt="Impact Nutrition" className="h-8" />
              </Link>
              {props.showSearch !== false && (
                <div className="flex-1 max-w-md mx-8">
                  <SearchBar 
                    placeholder={props.searchPlaceholder || "Search products..."}
                    showDropdown={props.showSearchDropdown !== false}
                  />
                </div>
              )}
              <div className="flex items-center gap-6 text-xs">
                <a href="#" className="hover:text-gray-300">Help & Support</a>
                <User className="w-5 h-5 cursor-pointer" />
                <ShoppingBag className="w-5 h-5 cursor-pointer" />
              </div>
            </div>
          </div>
        </header>
        
        <nav id="main-navigation" className="border-t border-gray-800 nav-gradient-wave">
          <div className="container mx-auto px-4">
            <ul className="flex items-center justify-center gap-8 py-3 text-xs font-medium">
              <li>
                <Link href="/products" className="nav-text font-bold">SHOP BY PRODUCT</Link>
              </li>
              <li><Link href="/#goals-section" className="nav-text">SHOP BY GOALS</Link></li>
              <li><Link href="/bundles" className="nav-text">BUNDLES</Link></li>
              <li><a href="#" className="nav-text">ATHLETES</a></li>
              <li>
                <a href="#" className="bg-white text-[var(--brand-primary)] px-4 py-1.5 rounded-md hover:bg-gray-100 transition-colors font-bold shadow-lg">
                  SPECIAL DEALS
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </>
    }>
      <HeaderContent {...props} />
    </Suspense>
  );
}
