'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { DynamicZoneBlock, RichTextBlock, MediaBlock, QuoteBlock, SliderBlock } from '@/lib/types/blog';
import { getStrapiMediaUrl } from '@/lib/strapi-client';

interface BlockRendererProps {
  blocks: DynamicZoneBlock[];
}

// Rich Text Block Component
function RichTextBlockComponent({ block }: { block: RichTextBlock }) {
  return (
    <div 
      className="prose prose-lg max-w-none mb-8"
      dangerouslySetInnerHTML={{ __html: block.body }}
    />
  );
}

// Media Block Component
function MediaBlockComponent({ block }: { block: MediaBlock }) {
  const mediaUrl = block.file?.data?.attributes
    ? getStrapiMediaUrl(block.file.data.attributes.url)
    : null;

  if (!mediaUrl) return null;

  const isVideo = block.file.data.attributes.mime.startsWith('video/');

  return (
    <div className="my-8">
      {isVideo ? (
        <video
          src={mediaUrl}
          controls
          className="w-full rounded-lg"
        />
      ) : (
        <img
          src={mediaUrl}
          alt={block.file.data.attributes.alternativeText || 'Media'}
          className="w-full rounded-lg"
        />
      )}
      {block.file.data.attributes.caption && (
        <p className="text-sm text-gray-500 text-center mt-2 italic">
          {block.file.data.attributes.caption}
        </p>
      )}
    </div>
  );
}

// Quote Block Component
function QuoteBlockComponent({ block }: { block: QuoteBlock }) {
  return (
    <div className="my-8 bg-gray-50 border-l-4 border-[var(--brand-primary)] p-6 rounded-r-lg">
      <div className="flex gap-4">
        <Quote className="w-8 h-8 text-[var(--brand-primary)] flex-shrink-0" />
        <div>
          {block.title && (
            <h4 className="font-bold text-lg mb-2">{block.title}</h4>
          )}
          <p className="text-gray-700 italic">{block.body}</p>
        </div>
      </div>
    </div>
  );
}

// Slider Block Component
function SliderBlockComponent({ block }: { block: SliderBlock }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = block.files?.data || [];

  if (images.length === 0) return null;

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  return (
    <div className="my-8 relative">
      <div className="aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden relative">
        <img
          src={getStrapiMediaUrl(images[currentIndex].attributes.url) || ''}
          alt={images[currentIndex].attributes.alternativeText || `Slide ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />

        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-colors"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex
                      ? 'bg-white'
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Caption */}
      {images[currentIndex].attributes.caption && (
        <p className="text-sm text-gray-500 text-center mt-2 italic">
          {images[currentIndex].attributes.caption}
        </p>
      )}
    </div>
  );
}

// Main Block Renderer
export default function BlockRenderer({ blocks }: BlockRendererProps) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <div className="article-content">
      {blocks.map((block, index) => {
        switch (block.__component) {
          case 'shared.rich-text':
            return <RichTextBlockComponent key={index} block={block} />;
          case 'shared.media':
            return <MediaBlockComponent key={index} block={block} />;
          case 'shared.quote':
            return <QuoteBlockComponent key={index} block={block} />;
          case 'shared.slider':
            return <SliderBlockComponent key={index} block={block} />;
          default:
            console.warn('Unknown block component:', (block as any).__component);
            return null;
        }
      })}
    </div>
  );
}
