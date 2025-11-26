// Function to generate preview pathname based on content type and document
const getPreviewPathname = (uid: string, { locale, document }): string | null => {
  const { slug } = document;
  
  // Handle different content types with their specific URL patterns
  switch (uid) {
    // Handle blog articles
    case "api::article.article": {
      if (!slug) {
        return "/blog"; // Blog listing page
      }
      return `/blog/${slug}`; // Individual article page
    }
    default: {
      return null; // No preview for other content types
    }
  }
};

export default ({ env }) => {
  // Get environment variables
  const clientUrl = env("CLIENT_URL") || "http://localhost:3001"; // Frontend application URL
  const previewSecret = env("PREVIEW_SECRET") || "my-secret-preview-token"; // Secret key for preview authentication

  return {
    auth: {
      secret: env('ADMIN_JWT_SECRET'),
    },
    apiToken: {
      salt: env('API_TOKEN_SALT'),
    },
    transfer: {
      token: {
        salt: env('TRANSFER_TOKEN_SALT'),
      },
    },
    secrets: {
      encryptionKey: env('ENCRYPTION_KEY'),
    },
    flags: {
      nps: env.bool('FLAG_NPS', true),
      promoteEE: env.bool('FLAG_PROMOTE_EE', true),
    },
    preview: {
      enabled: true, // Enable preview functionality
      config: {
        allowedOrigins: clientUrl, // Restrict preview access to specific domain
        async handler(uid, { documentId, locale, status }) {
          try {
            // Fetch the complete document from Strapi
            const document = await strapi.documents(uid).findOne({ documentId });
            
            if (!document) {
              console.error('Document not found:', documentId);
              return null;
            }
            
            // Generate the preview pathname based on content type and document
            const pathname = getPreviewPathname(uid, { locale, document });

            // Disable preview if the pathname is not found
            if (!pathname) {
              return null;
            }

            // Use Next.js draft mode passing it a secret key and the content-type status
            const urlSearchParams = new URLSearchParams({
              url: pathname,
              secret: previewSecret,
              status: status || 'draft',
            });
            return `${clientUrl}/api/preview?${urlSearchParams}`;
          } catch (error) {
            console.error('Preview handler error:', error);
            return null;
          }
        },
      },
    },
  };
};
