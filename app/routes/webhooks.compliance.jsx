import { authenticate } from "../shopify.server";
import db from "../db.server";

// Mandatory privacy webhooks (customers/data_request, customers/redact, shop/redact).
// authenticate.webhook answers 401 on an invalid HMAC, as App Review requires.
// The app stores no customer data, so only shop/redact has anything to erase.
export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (topic === "SHOP_REDACT") {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
