'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

interface ProductOption {
  id: string;
  name: string;
  code: string;
  groupId: string;
}

interface ProductOptionGroup {
  id: string;
  name: string;
  code: string;
  options: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  priceWithTax: number;
  stockLevel: string;
  featuredAsset?: {
    id: string;
    preview: string;
  };
  options: ProductOption[];
}

interface VariantSelectorProps {
  optionGroups: ProductOptionGroup[];
  variants: ProductVariant[];
  selectedOptions: Record<string, string>;
  onVariantChange: (variantId: string, selectedOptions: Record<string, string>) => void;
}

export function VariantSelector({
  optionGroups,
  variants,
  selectedOptions,
  onVariantChange,
}: VariantSelectorProps) {
  // Helper function to find variant by selected options
  const findVariantByOptions = (optionsMap: Record<string, string>) => {
    return variants.find(variant => {
      // Check if this variant matches all selected options
      return Object.entries(optionsMap).every(([groupId, optionId]) => {
        return variant.options.some(opt => opt.groupId === groupId && opt.id === optionId);
      });
    });
  };

  const handleOptionChange = (groupId: string, optionId: string) => {
    const newOptions = {
      ...selectedOptions,
      [groupId]: optionId
    };
    
    // Find matching variant
    const matchingVariant = findVariantByOptions(newOptions);
    if (matchingVariant) {
      onVariantChange(matchingVariant.id, newOptions);
    }
  };

  if (!optionGroups || optionGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {optionGroups.map((optionGroup) => {
        const selectedOptionId = selectedOptions[optionGroup.id];
        
        return (
          <div key={optionGroup.id}>
            <label className="block text-sm font-semibold mb-2">
              {optionGroup.name}:
            </label>
            <div className="relative">
              <select
                value={selectedOptionId || ''}
                onChange={(e) => handleOptionChange(optionGroup.id, e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg bg-white text-base font-medium focus:ring-2 focus:ring-black focus:border-transparent appearance-none cursor-pointer"
              >
                {optionGroup.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 pointer-events-none" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
