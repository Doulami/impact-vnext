'use client';

import { User, LogIn, LogOut, Settings, Package, ChevronDown, ShoppingBag, Globe } from 'lucide-react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { Suspense, useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/hooks/useCart';
import { useTranslations, useLocale } from 'next-intl';

// Language Switcher Component - Now using dynamic languages from Vendure
function LanguageSwitcher() {
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Import language switcher hook (only if we have the context)
  let availableLanguages: any[] = [];
  let switchLanguage: ((code: string) => void) | null = null;
  let hasMultipleLanguages = false;
  
  try {
    // Try to use Vendure language context
    const { useLanguageSwitcher } = require('@/lib/contexts/VendureLanguageContext');
    const languageContext = useLanguageSwitcher();
    availableLanguages = languageContext.availableLanguages || [];
    switchLanguage = languageContext.switchLanguage;
    hasMultipleLanguages = languageContext.hasMultipleLanguages;
  } catch (error) {
    // Fallback to hardcoded languages if context not available
    console.warn('VendureLanguageContext not available, using fallback languages');
    availableLanguages = [
      { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
      { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
    ];
    hasMultipleLanguages = true;
  }

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

  // Find current language info
  const currentLang = availableLanguages.find(l => l.code === locale) || availableLanguages[0];

  // Handle language switching
  const handleLanguageSwitch = (languageCode: string) => {
    if (switchLanguage) {
      // Use Vendure language switcher if available
      switchLanguage(languageCode);
    } else {
      // Fallback to manual routing
      const router = useRouter();
      const pathname = usePathname();
      const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(\/|$)/, '/');
      router.push(`/${languageCode}${pathWithoutLocale}`);
    }
    setIsOpen(false);
  };

  // Don't render if only one language available
  if (!hasMultipleLanguages || availableLanguages.length <= 1) {
    return null;
  }

  if (!currentLang) {
    return null; // Don't render if no current language found
  }

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
            className="absolute right-0 top-full mt-2 w-44 bg-white text-black shadow-xl border border-gray-200 rounded-lg z-50 py-1"
          >
            {availableLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSwitch(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  locale === lang.code ? 'bg-blue-50 font-medium text-blue-700 border-l-2 border-blue-500' : ''
                }`}
              >
                <span className="text-lg flex-shrink-0">{lang.flag}</span>
                <span className="font-medium">{lang.nativeName}</span>
                {locale === lang.code && lang.isDefault && (
                  <span className="ml-auto text-xs text-blue-600 font-medium">Default</span>
                )}
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
  const t = useTranslations('common');
  const tAccount = useTranslations('account');
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
          {t('login')}
        </Link>
        <Link 
          href="/register" 
          className="bg-white text-black px-3 py-1.5 rounded hover:bg-gray-100 transition-colors font-medium"
        >
          {t('register')}
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
          {customer?.firstName || t('account')}
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
                {tAccount('settings')}
              </Link>
              <Link
                href="/account/orders"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                <Package className="w-4 h-4" />
                {tAccount('orders')}
              </Link>
            </div>

            {/* Logout */}
            <div className="border-t border-gray-200 py-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t('logout')}
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
  showSearchDropdown = true,
  className = ""
}: Omit<HeaderProps, 'searchPlaceholder'>) {
  const t = useTranslations('common');
  const tNav = useTranslations('navigation');
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
                  placeholder={tNav('searchPlaceholder')}
                  initialValue={currentSearchTerm}
                  showDropdown={showSearchDropdown}
                />
              </div>
            )}
            
            {/* Header Actions */}
            <div className="flex items-center gap-4 md:gap-6 text-xs">
              <a href="#" className="hover:text-gray-300 hidden md:inline">{tNav('helpSupport')}</a>
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
                {t('shop').toUpperCase()}
              </Link>
            </li>
            <li><Link href="/#goals-section" className="nav-text">{tNav('shopByGoals')}</Link></li>
            <li><Link href="/bundles" className="nav-text">{t('bundles').toUpperCase()}</Link></li>
            <li><Link href="/blog" className="nav-text">{t('blog').toUpperCase()}</Link></li>
            <li><a href="#" className="nav-text">{tNav('athletes')}</a></li>
            <li>
              <a href="#" className="bg-white text-[var(--brand-primary)] px-4 py-1.5 rounded-md hover:bg-gray-100 transition-colors font-bold shadow-lg">
                {tNav('specialDeals')}
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
              <li><Link href="/blog" className="nav-text">BLOG</Link></li>
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
