'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/lib/hooks/useSearch';
import { useDebounce } from '@/lib/hooks/useDebounce';
import Link from 'next/link';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export default function SearchBar({ placeholder = "Search products...", className = "" }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Use the search hook with Elasticsearch backend
  const { products, loading, totalItems, setTerm } = useSearch({
    term: debouncedSearchTerm || undefined,
    take: 6, // Limit results for dropdown
  });

  // Update search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm) {
      setTerm(debouncedSearchTerm);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [debouncedSearchTerm, setTerm]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  }, []);

  // Handle search submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Navigate to products page with search term
      router.push(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }, [searchTerm, router]);

  // Handle product selection from dropdown
  const handleProductSelect = useCallback((productSlug: string) => {
    router.push(`/products/${productSlug}`);
    setIsOpen(false);
    setSearchTerm('');
    inputRef.current?.blur();
  }, [router]);

  // Clear search
  const handleClear = useCallback(() => {
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsFocused(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }, []);

  // Show "View all results" option
  const showViewAll = searchTerm.trim() && totalItems > products.length;

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (searchTerm.trim()) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-white text-black px-4 py-2 pr-20 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          autoComplete="off"
        />
        
        {/* Clear button */}
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        
        {/* Search button */}
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 p-1"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>

      {/* Search Results Dropdown */}
      {isOpen && (isFocused || searchTerm) && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-lg z-50 max-h-96 overflow-hidden"
        >
          {loading && (
            <div className="p-4 text-center text-gray-500">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                Searching...
              </div>
            </div>
          )}

          {!loading && products.length === 0 && searchTerm && (
            <div className="p-4 text-center text-gray-500">
              No products found for "{searchTerm}"
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="max-h-80 overflow-y-auto">
              {products.map((product) => (
                <button
                  key={product.productId}
                  onClick={() => handleProductSelect(product.slug)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                >
                  {/* Product Image */}
                  <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                    {product.productAsset?.preview ? (
                      <img 
                        src={product.productAsset.preview + '?preset=thumb'} 
                        alt={product.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {product.productName}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      {product.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-sm font-semibold text-gray-900 flex-shrink-0">
                    {'value' in product.priceWithTax 
                      ? `$${(product.priceWithTax.value / 100).toFixed(2)}`
                      : `$${(product.priceWithTax.min / 100).toFixed(2)} - $${(product.priceWithTax.max / 100).toFixed(2)}`
                    }
                  </div>
                </button>
              ))}

              {/* View all results */}
              {showViewAll && (
                <Link
                  href={`/products?search=${encodeURIComponent(searchTerm)}`}
                  className="w-full p-3 flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-blue-600 font-medium text-sm border-t border-gray-200"
                  onClick={() => setIsOpen(false)}
                >
                  <Search className="w-4 h-4" />
                  View all {totalItems} results for "{searchTerm}"
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}