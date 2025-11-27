import { LayoutBlock, HeroSectionBlock, ContentSectionBlock } from '@/lib/types/strapi';
import { getStrapiMediaUrl } from '@/lib/strapi-client';
import Image from 'next/image';
import Link from 'next/link';

interface BlockRendererProps {
  blocks: LayoutBlock[];
}

export function BlockRenderer({ blocks }: BlockRendererProps) {
  return (
    <>
      {blocks.map((block, index) => {
        // Use component type + id to create unique key, fallback to index
        const key = `${block.__component}-${block.id || index}`;
        
        switch (block.__component) {
          case 'blocks.hero-section':
            return <HeroSection key={key} block={block} />;
          case 'blocks.content-section':
            return <ContentSection key={key} block={block} />;
          default:
            return null;
        }
      })}
    </>
  );
}

function HeroSection({ block }: { block: HeroSectionBlock }) {
  const bgImage = block.backgroundImage?.data?.attributes?.url
    ? getStrapiMediaUrl(block.backgroundImage.data.attributes.url)
    : null;

  return (
    <section
      className="relative min-h-[500px] flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 text-white"
      style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {bgImage && <div className="absolute inset-0 bg-black/40" />}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-4">
          {block.headline}
        </h1>
        {block.subheadline && (
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            {block.subheadline}
          </p>
        )}
        <div className="flex gap-4 justify-center flex-wrap">
          {block.primaryButtonLabel && block.primaryButtonUrl && (
            <Link
              href={block.primaryButtonUrl}
              className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              {block.primaryButtonLabel}
            </Link>
          )}
          {block.secondaryButtonLabel && block.secondaryButtonUrl && (
            <Link
              href={block.secondaryButtonUrl}
              className="px-8 py-3 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              {block.secondaryButtonLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function ContentSection({ block }: { block: ContentSectionBlock }) {
  const image = block.image?.data?.attributes?.url
    ? getStrapiMediaUrl(block.image.data.attributes.url)
    : null;

  const hasImage = !!image;
  const imageOnLeft = block.imageAlignment === 'left';
  const imageOnRight = block.imageAlignment === 'right';
  const imageOnCenter = block.imageAlignment === 'center';

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {block.title && (
          <h2 className="text-4xl font-bold mb-8 text-center text-gray-900">
            {block.title}
          </h2>
        )}
        
        {!hasImage && (
          <div className="prose prose-lg max-w-4xl mx-auto">
            <div dangerouslySetInnerHTML={{ __html: block.body }} />
          </div>
        )}

        {hasImage && imageOnCenter && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 relative h-96 rounded-lg overflow-hidden">
              <Image
                src={image}
                alt={block.title || ''}
                fill
                className="object-cover"
              />
            </div>
            <div className="prose prose-lg mx-auto">
              <div dangerouslySetInnerHTML={{ __html: block.body }} />
            </div>
          </div>
        )}

        {hasImage && (imageOnLeft || imageOnRight) && (
          <div className={`grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto ${imageOnRight ? 'md:grid-flow-dense' : ''}`}>
            <div className={imageOnRight ? 'md:col-start-2' : ''}>
              <div className="relative h-96 rounded-lg overflow-hidden">
                <Image
                  src={image}
                  alt={block.title || ''}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className={imageOnRight ? 'md:col-start-1 md:row-start-1' : ''}>
              <div className="prose prose-lg">
                <div dangerouslySetInnerHTML={{ __html: block.body }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
