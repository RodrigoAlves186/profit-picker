import { STARTER_PLAN, GROWTH_PLAN, PRO_PLAN } from "./shopify.server";

export const PLAN_KEYS = ["free", "starter", "growth", "pro"];
export const PLAN_LIMITS = { free: 5, starter: 50, growth: 200, pro: Infinity };
export const BILLING_PLANS = { starter: STARTER_PLAN, growth: GROWTH_PLAN, pro: PRO_PLAN };
export const PAID_PLANS = Object.values(BILLING_PLANS);

const testShopCache = new Map();

// Development stores (ours and the App Review team's) can't be really charged,
// so they get test charges. Every other store pays for real.
// BILLING_TEST=true forces test charges everywhere.
export async function isTestShop(admin, shop) {
  if (process.env.BILLING_TEST === "true") return true;
  if (testShopCache.has(shop)) return testShopCache.get(shop);

  const response = await admin.graphql(`
    #graphql
    query ShopPlan {
      shop { plan { partnerDevelopment } }
    }
  `);
  const data = await response.json();
  const isTest = !!data.data?.shop?.plan?.partnerDevelopment;
  testShopCache.set(shop, isTest);
  return isTest;
}

export async function getCurrentPlan({ admin, billing, session }) {
  const isTest = await isTestShop(admin, session.shop);
  let currentPlan = "free";
  let subscription = null;
  try {
    const check = await billing.check({ plans: PAID_PLANS, isTest });
    if (check.hasActivePayment) {
      subscription = check.appSubscriptions[0];
      const name = subscription?.name?.toLowerCase();
      if (name && PLAN_LIMITS[name] !== undefined) currentPlan = name;
    }
  } catch (e) {
    currentPlan = "free";
  }
  return { currentPlan, limit: PLAN_LIMITS[currentPlan], isTest, subscription };
}

// Walks every product so the count stays right on stores with more than 250 products.
export async function getMarkedProductIds(admin) {
  const ids = [];
  let after = null;
  do {
    const response = await admin.graphql(`
      #graphql
      query MarkedProducts($after: String) {
        products(first: 250, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            markedVariant: metafield(namespace: "profit_picker", key: "variant_id") { id }
          }
        }
      }
    `, { variables: { after } });
    const data = await response.json();
    const page = data.data.products;
    for (const node of page.nodes) {
      if (node.markedVariant) ids.push(node.id);
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return ids;
}
