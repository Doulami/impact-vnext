import 'dotenv/config';

const ADMIN_API_URL = process.env.VENDURE_ADMIN_API_URL || 'http://localhost:3000/admin-api';
const SUPERADMIN_USERNAME = process.env.SUPERADMIN_USERNAME as string;
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD as string;

async function gql<T>(query: string, variables?: any, token?: string, cookie?: string): Promise<T> {
  const res = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

async function login(): Promise<{ cookie?: string }> {
  const res = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation Login($username: String!, $password: String!) {
          login(username: $username, password: $password) { __typename }
        }
      `,
      variables: { username: SUPERADMIN_USERNAME, password: SUPERADMIN_PASSWORD },
    }),
  });
  const setCookie = res.headers.get('set-cookie') || undefined;
  const body = await res.json();
  if (body.errors) {
    throw new Error(JSON.stringify(body.errors, null, 2));
  }
  return { cookie: setCookie };
}

async function ensureCollection(cookie: string, slug: string, name: string): Promise<string> {
  // Try to create a collection; if it exists, ignore error
  const data = await gql<{ createCollection: { id: string } }>(
    `
      mutation CreateCollection($input: CreateCollectionInput!) {
        createCollection(input: $input) { id }
      }
    `,
    { input: { translations: [{ languageCode: 'en', name }], filters: [], parentId: null } },
    undefined,
    cookie
  ).catch(() => null as any);
  return data?.createCollection?.id ?? '';
}

async function createSimpleProduct(cookie: string) {
  // 1) Create Product
  const p = await gql<{ createProduct: { id: string } }>(
    `
      mutation CreateProduct($input: CreateProductInput!) {
        createProduct(input: $input) { id }
      }
    `,
    {
      input: {
        enabled: true,
        assetIds: [],
        facetValueIds: [],
        translations: [
          {
            languageCode: 'en',
            name: 'Demo Whey Protein',
            slug: 'demo-whey-protein',
            description: 'High-quality whey protein for muscle recovery',
          },
        ],
      },
    },
    undefined,
    cookie
  );

  const productId = p.createProduct.id;

  // 2) Create a ProductVariant
  await gql(
    `
      mutation CreateProductVariants($input: [CreateProductVariantInput!]!) {
        createProductVariants(input: $input) { id }
      }
    `,
    {
      input: [
        {
          productId,
          sku: 'WHEY-1KG',
          stockOnHand: 100,
          trackInventory: true,
          price: 2999,
          translations: [{ languageCode: 'en', name: '1 KG Tub' }],
          facetValueIds: [],
          taxCategoryId: null,
          optionIds: [],
        },
      ],
    },
    undefined,
    cookie
  );
}

async function main() {
  if (!SUPERADMIN_USERNAME || !SUPERADMIN_PASSWORD) {
    throw new Error('Missing SUPERADMIN_USERNAME or SUPERADMIN_PASSWORD in environment.');
  }
  const { cookie } = await login();
  if (!cookie) {
    throw new Error('Login did not return a session cookie.');
  }
  await ensureCollection(cookie, 'supplements', 'Supplements');
  await createSimpleProduct(cookie);
  console.log('Demo product seeded.');
}

main().catch((e) => {
  console.error('Product seed failed:', e);
  process.exit(1);
});


