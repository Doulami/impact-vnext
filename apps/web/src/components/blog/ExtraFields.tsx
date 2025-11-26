'use client';

interface ExtraFieldsProps {
  extras: Record<string, unknown>;
}

// Strapi Block Types (Slate.js format)
interface StrapiTextNode {
  type: 'text';
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
}

interface StrapiBlock {
  type: string;
  children?: (StrapiTextNode | StrapiBlock)[];
  format?: string;
  level?: number;
  url?: string;
}

/**
 * Component to automatically display any extra fields from Strapi
 * that aren't explicitly mapped in the Article type.
 */
export default function ExtraFields({ extras }: ExtraFieldsProps) {
  // Filter out system fields and empty values
  const displayableExtras = Object.entries(extras).filter(
    ([key, value]) => {
      // Skip internal/system fields
      if (key.startsWith('__') || key.startsWith('_')) {
        return false;
      }
      // Skip common Strapi system fields
      const systemFields = ['id', 'documentId', 'locale', 'localizations'];
      if (systemFields.includes(key)) {
        return false;
      }
      // Skip null/undefined
      if (value === null || value === undefined) {
        return false;
      }
      // Skip empty arrays
      if (Array.isArray(value) && value.length === 0) {
        return false;
      }
      // Skip empty objects
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
        return false;
      }
      return true;
    }
  );

  if (displayableExtras.length === 0) {
    return null;
  }

  /**
   * Format field key to human-readable label
   */
  const formatFieldName = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  };

  /**
   * Check if value is a Strapi rich text block
   */
  const isStrapiBlock = (obj: any): boolean => {
    return (
      obj &&
      typeof obj === 'object' &&
      'type' in obj &&
      'children' in obj &&
      Array.isArray(obj.children)
    );
  };

  /**
   * Render Strapi text node with formatting
   */
  const renderTextNode = (node: StrapiTextNode, key: number): React.ReactNode => {
    if (!node.text) return null;
    
    let text: React.ReactNode = node.text;
    
    // Apply formatting from innermost to outermost
    if (node.code) {
      text = <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{text}</code>;
    }
    if (node.strikethrough) {
      text = <s>{text}</s>;
    }
    if (node.underline) {
      text = <u>{text}</u>;
    }
    if (node.italic) {
      text = <em>{text}</em>;
    }
    if (node.bold) {
      text = <strong>{text}</strong>;
    }
    
    return <span key={key}>{text}</span>;
  };

  /**
   * Render a single Strapi block
   */
  const renderStrapiBlock = (block: StrapiBlock, index: number): React.ReactNode => {
    if (!block || !block.type) return null;

    const children = block.children?.map((child, i) => {
      if (!child) return null;
      if ('text' in child) {
        return renderTextNode(child as StrapiTextNode, i);
      }
      if ('type' in child) {
        return renderStrapiBlock(child as StrapiBlock, i);
      }
      return null;
    }).filter(Boolean);

    switch (block.type) {
      case 'paragraph':
        // Skip empty paragraphs
        if (!children || children.length === 0) return null;
        const hasContent = children.some(child => {
          if (typeof child === 'string') return child.trim().length > 0;
          return true;
        });
        if (!hasContent) return null;
        return <p key={index} className="mb-4 leading-relaxed">{children}</p>;
      
      case 'heading':
        const HeadingTag = `h${block.level || 2}` as keyof React.JSX.IntrinsicElements;
        return <HeadingTag key={index} className="font-bold mt-6 mb-3">{children}</HeadingTag>;
      
      case 'list':
        const ListTag = block.format === 'ordered' ? 'ol' : 'ul';
        const listClass = block.format === 'ordered' ? 'list-decimal' : 'list-disc';
        return (
          <ListTag key={index} className={`${listClass} ml-6 mb-4 space-y-2`}>
            {children}
          </ListTag>
        );
      
      case 'list-item':
        return <li key={index}>{children}</li>;
      
      case 'quote':
        return (
          <blockquote key={index} className="border-l-4 border-[var(--brand-primary)] pl-4 italic my-4 text-gray-700">
            {children}
          </blockquote>
        );
      
      case 'code':
        return (
          <pre key={index} className="bg-gray-100 p-4 rounded my-4 overflow-x-auto">
            <code>{children}</code>
          </pre>
        );
      
      case 'link':
        return (
          <a 
            key={index}
            href={block.url}
            className="text-[var(--brand-primary)] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        );
      
      default:
        return <div key={index}>{children}</div>;
    }
  };

  /**
   * Render value based on type
   */
  const renderValue = (value: unknown): React.ReactNode => {
    // Try to parse if it's a JSON string
    let parsedValue = value;
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        // Not valid JSON, continue with original value
      }
    }

    // Check if array of strings that might be JSON
    if (Array.isArray(parsedValue) && parsedValue.length > 0 && typeof parsedValue[0] === 'string') {
      try {
        // Try to parse each string as JSON
        const parsed = parsedValue.map(item => {
          if (typeof item === 'string' && (item.startsWith('{') || item.startsWith('['))) {
            return JSON.parse(item);
          }
          return item;
        });
        // Check if they're Strapi blocks after parsing
        if (parsed.length > 0 && isStrapiBlock(parsed[0])) {
          parsedValue = parsed;
        }
      } catch (e) {
        // Continue with original
      }
    }

    // Check if it's a single Strapi block
    if (isStrapiBlock(parsedValue)) {
      return (
        <div className="prose prose-lg max-w-none text-gray-700">
          {renderStrapiBlock(parsedValue as StrapiBlock, 0)}
        </div>
      );
    }

    // Check if it's an array of Strapi blocks
    if (Array.isArray(parsedValue) && parsedValue.length > 0) {
      console.log('Checking array for Strapi blocks:', parsedValue[0]);
      if (isStrapiBlock(parsedValue[0])) {
        console.log('Rendering as Strapi blocks!');
        return (
          <div className="prose prose-lg max-w-none text-gray-700">
            {parsedValue.map((block, index) => {
              const rendered = renderStrapiBlock(block as StrapiBlock, index);
              console.log(`Block ${index} rendered:`, rendered);
              return rendered;
            })}
          </div>
        );
      }
    }

    // Use parsed value for remaining checks
    value = parsedValue;

    // String
    if (typeof value === 'string') {
      // Check if it's HTML content
      if (value.includes('<') && value.includes('>')) {
        return (
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        );
      }
      // Check if it's a URL
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return (
          <a 
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--brand-primary)] hover:underline"
          >
            {value}
          </a>
        );
      }
      return <span className="text-gray-700">{value}</span>;
    }

    // Number
    if (typeof value === 'number') {
      return <span className="text-gray-700 font-mono">{value}</span>;
    }

    // Boolean
    if (typeof value === 'boolean') {
      return (
        <span className={`px-2 py-1 rounded text-sm ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }

    // Array (non-Strapi blocks)
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      
      // Debug: log the array to see what we're dealing with
      console.log('Array value:', value);
      console.log('First item:', value[0]);
      console.log('Is first item a Strapi block?', isStrapiBlock(value[0]));
      
      return (
        <ul className="list-disc list-inside space-y-1">
          {value.map((item, index) => {
            // Try to render as Strapi block
            if (isStrapiBlock(item)) {
              return (
                <li key={index} className="text-gray-700">
                  {renderStrapiBlock(item as StrapiBlock, index)}
                </li>
              );
            }
            // Render as string or JSON
            return (
              <li key={index} className="text-gray-700">
                {typeof item === 'string' ? item : JSON.stringify(item, null, 2)}
              </li>
            );
          })}
        </ul>
      );
    }

    // Object
    if (typeof value === 'object' && value !== null) {
      return (
        <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    return null;
  };

  return (
    <div className="mt-12 pt-8 border-t">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
      <div className="space-y-4">
        {displayableExtras.map(([key, value]) => (
          <div key={key} className="bg-gray-50 p-4 rounded-lg">
            <dt className="text-sm font-medium text-gray-600 mb-2">
              {formatFieldName(key)}
            </dt>
            <dd className="text-gray-900">
              {renderValue(value)}
            </dd>
          </div>
        ))}
      </div>
    </div>
  );
}
