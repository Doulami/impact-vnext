'use client';

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

interface LongDescriptionRendererProps {
  content: string | unknown;
}

export default function LongDescriptionRenderer({ content }: LongDescriptionRendererProps) {
  // Check if content is a string (HTML)
  if (typeof content === 'string') {
    return (
      <div className="prose prose-lg max-w-none mb-12">
        <div 
          className="text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    );
  }

  // Check if content is an array of Strapi blocks
  if (Array.isArray(content)) {
    return (
      <div className="prose prose-lg max-w-none mb-12 text-gray-700">
        {content.map((block, index) => renderStrapiBlock(block, index))}
      </div>
    );
  }

  // Check if content is a single Strapi block
  if (typeof content === 'object' && content !== null && 'type' in content) {
    return (
      <div className="prose prose-lg max-w-none mb-12 text-gray-700">
        {renderStrapiBlock(content as StrapiBlock, 0)}
      </div>
    );
  }

  return null;
}

function renderTextNode(node: StrapiTextNode, key: number): React.ReactNode {
  if (!node.text) return null;
  
  let text: React.ReactNode = node.text;
  
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
}

function renderStrapiBlock(block: StrapiBlock, index: number): React.ReactNode {
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
      if (!children || children.length === 0) return null;
      const hasContent = children.some(child => {
        if (typeof child === 'string') return child.trim().length > 0;
        return true;
      });
      if (!hasContent) return null;
      return <p key={index} className="mb-4 leading-relaxed">{children}</p>;
    
    case 'heading':
      const HeadingTag = `h${block.level || 2}` as keyof JSX.IntrinsicElements;
      return <HeadingTag key={index} className="font-bold mt-6 mb-3 text-gray-900">{children}</HeadingTag>;
    
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
}
