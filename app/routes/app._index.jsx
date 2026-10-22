import { useLoaderData, useNavigate } from "react-router";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  ResourceList,
  ResourceItem,
  Thumbnail,
  EmptyState,
  ProgressBar,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getI18n } from "../i18n.server";

const PLAN_LIMITS = {
  free: { key: "free", limit: 5 },
  starter: { key: "starter", limit: 50 },
  growth: { key: "growth", limit: 200 },
  pro: { key: "pro", limit: Infinity },
};



async function ensureMetafieldDefinitions(admin) {
  const defs = [
    { key: "variant_id", name: "Profit Picker - Variant ID" },
    { key: "badge_text", name: "Profit Picker - Badge Text" },
    { key: "badge_color", name: "Profit Picker - Badge Color" },
    { key: "badge_text_color", name: "Profit Picker - Badge Text Color" },
  ];
  for (const d of defs) {
    try {
      await admin.graphql(`
        #graphql
        mutation CreateDef($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition { id }
            userErrors { field message code }
          }
        }
      `, {
        variables: {
          definition: {
            name: d.name,
            namespace: "profit_picker",
            key: d.key,
            type: "single_line_text_field",
            ownerType: "PRODUCT",
            access: { storefront: "PUBLIC_READ" },
          },
        },
      });
    } catch (e) {
      // ignore (already exists)
    }
  }
}

export const loader = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const { t } = getI18n(request);

  await ensureMetafieldDefinitions(admin);

  let currentPlan = "free";
  try {
    const billingCheck = await billing.check({
      plans: ["Starter", "Growth", "Pro"],
      isTest: true,
    });
    if (billingCheck.hasActivePayment) {
      const planName = billingCheck.appSubscriptions[0]?.name?.toLowerCase();
      if (planName && PLAN_LIMITS[planName]) currentPlan = planName;
    }
  } catch (e) {
    currentPlan = "free";
  }

  const response = await admin.graphql(`
    #graphql
    query ProductsWithMarked {
      products(first: 50, sortKey: UPDATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            featuredImage { url altText }
            totalVariants
            markedVariant: metafield(namespace: "profit_picker", key: "variant_id") { value }
          }
        }
      }
    }
  `);
  const data = await response.json();
  const products = data.data.products.edges.map((e) => ({
    id: e.node.id,
    numericId: e.node.id.replace("gid://shopify/Product/", ""),
    title: e.node.title,
    image: e.node.featuredImage?.url || null,
    imageAlt: e.node.featuredImage?.altText || e.node.title,
    variantCount: e.node.totalVariants,
    markedVariantId: e.node.markedVariant?.value || null,
  }));

  const usedCount = products.filter((p) => p.markedVariantId).length;
  const planInfo = PLAN_LIMITS[currentPlan];
  const planName = t(`billing.plans.${planInfo.key}.name`);

  const extensionHandle = "profit-picker-badge";
  const embedHandle = "app_embed";
  const apiKey = process.env.SHOPIFY_API_KEY;
  const activateUrl = `https://${session.shop}/admin/themes/current/editor?context=apps&template=product&activateAppId=${apiKey}/${embedHandle}&target=mainSection`;

  return {
    products,
    currentPlan,
    usedCount,
    planName,
    planLimit: planInfo.limit === Infinity ? null : planInfo.limit,
    activateUrl,
    i18n: {
      title: t("app.name"),
      subtitle: t("app.subtitle"),
      managePlan: t("index.managePlan"),
      currentPlan: t("index.currentPlan", { plan: planName }),
      productsMarked: planInfo.limit === Infinity
        ? t("index.productsMarkedUnlimited", { used: usedCount })
        : t("index.productsMarked", { used: usedCount, limit: planInfo.limit }),
      limitReached: t("index.limitReached"),
      available: t("index.available"),
      limitBannerTitle: t("index.limitBannerTitle"),
      limitBannerText: t("index.limitBannerText"),
      upgradeNow: t("index.upgradeNow"),
      noProductsHeading: t("index.noProductsHeading"),
      noProductsText: t("index.noProductsText"),
      variantSingular: t("index.variantSingular"),
      variantPlural: t("index.variantPlural"),
      marked: t("index.marked"),
      notMarked: t("index.notMarked"),
      activateTitle: t("index.activateTitle"),
      activateText: t("index.activateText"),
      activateButton: t("index.activateButton"),
    },
  };
};

export default function Index() {
  const { products, planLimit, usedCount, i18n, activateUrl } = useLoaderData();
  const navigate = useNavigate();
  const limitReached = planLimit !== null && usedCount >= planLimit;
  const progressPct = planLimit === null ? 0 : Math.min(100, (usedCount / planLimit) * 100);

  return (
    <Page
      title={i18n.title}
      subtitle={i18n.subtitle}
      primaryAction={{
        content: i18n.managePlan,
        onAction: () => navigate("/app/billing"),
      }}
    >
      <Layout>
        <Layout.Section>
          <Banner tone="info" title={i18n.activateTitle}>
            <Text as="p">{i18n.activateText}</Text>
            <div style={{ marginTop: 8 }}>
              <Button url={activateUrl} target="_blank" variant="primary">
                {i18n.activateButton}
              </Button>
            </div>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">{i18n.currentPlan}</Text>
                  <Text as="p" tone="subdued">{i18n.productsMarked}</Text>
                </BlockStack>
                <Badge tone={limitReached ? "critical" : "success"}>
                  {limitReached ? i18n.limitReached : i18n.available}
                </Badge>
              </InlineStack>
              {planLimit !== null && (
                <ProgressBar progress={progressPct} tone={limitReached ? "critical" : "primary"} />
              )}
              {limitReached && (
                <Banner tone="warning" title={i18n.limitBannerTitle}>
                  <Text as="p">{i18n.limitBannerText}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Button onClick={() => navigate("/app/billing")}>{i18n.upgradeNow}</Button>
                  </div>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card padding="0">
            {products.length === 0 ? (
              <div style={{ padding: 24 }}>
                <EmptyState
                  heading={i18n.noProductsHeading}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>{i18n.noProductsText}</p>
                </EmptyState>
              </div>
            ) : (
              <ResourceList
                resourceName={{ singular: i18n.variantSingular, plural: i18n.variantPlural }}
                items={products}
                renderItem={(product) => {
                  const media = product.image ? (
                    <Thumbnail source={product.image} alt={product.imageAlt} size="small" />
                  ) : (
                    <Thumbnail source="" alt="" size="small" />
                  );
                  return (
                    <ResourceItem
                      id={product.id}
                      media={media}
                      onClick={() => navigate(`/app/product/${product.numericId}`)}
                      accessibilityLabel={product.title}
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <Text as="h3" variant="bodyMd" fontWeight="semibold">{product.title}</Text>
                          <Text as="p" tone="subdued" variant="bodySm">
                            {product.variantCount} {product.variantCount === 1 ? i18n.variantSingular : i18n.variantPlural}
                          </Text>
                        </BlockStack>
                        {product.markedVariantId ? (
                          <Badge tone="success">{i18n.marked}</Badge>
                        ) : (
                          <Badge>{i18n.notMarked}</Badge>
                        )}
                      </InlineStack>
                    </ResourceItem>
                  );
                }}
              />
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}