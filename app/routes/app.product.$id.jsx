import { useState } from "react";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  ChoiceList,
  TextField,
  Banner,
  Thumbnail,
  Divider,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getI18n } from "../i18n.server";

const PLAN_LIMITS = {
  free: 5,
  starter: 50,
  growth: 200,
  pro: Infinity,
};

const BG_PALETTE = [
  "#1a4d2e", "#c0392b", "#1e4e8c", "#1a1a1a",
  "#e67e22", "#6c3483", "#e91e63", "#f1c40f",
];

const TEXT_PALETTE = [
  "#ffffff", "#1a1a1a", "#f1c40f", "#1a4d2e",
  "#c0392b", "#1e4e8c", "#e67e22", "#e91e63",
];

function ColorPicker({ label, value, onChange, palette, customLabel }) {
  return (
    <BlockStack gap="200">
      <Text as="p" variant="bodyMd">{label}</Text>
      <InlineStack gap="200" wrap blockAlign="center">
        {palette.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={c}
            title={c}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: c,
              border: value.toLowerCase() === c.toLowerCase() ? "3px solid #000" : "2px solid #ddd",
              cursor: "pointer",
              padding: 0,
            }}
          />
        ))}
      </InlineStack>
      <InlineStack gap="200" blockAlign="center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 48,
            height: 36,
            border: "1px solid #ddd",
            borderRadius: 8,
            cursor: "pointer",
            padding: 2,
            background: "transparent",
          }}
          aria-label={customLabel}
        />
        <Text as="span" tone="subdued" variant="bodySm">{value.toUpperCase()}</Text>
      </InlineStack>
    </BlockStack>
  );
}

export const loader = async ({ request, params }) => {
  const { admin, billing } = await authenticate.admin(request);
  const { t } = getI18n(request);
  const productGid = `gid://shopify/Product/${params.id}`;

  let currentPlan = "free";
  try {
    const billingCheck = await billing.check({
      plans: ["Starter", "Growth", "Pro"],
      isTest: true,
    });
    if (billingCheck.hasActivePayment) {
      const planName = billingCheck.appSubscriptions[0]?.name?.toLowerCase();
      if (planName && PLAN_LIMITS[planName] !== undefined) currentPlan = planName;
    }
  } catch (e) {
    currentPlan = "free";
  }

  const response = await admin.graphql(`
    #graphql
    query ProductDetail($id: ID!) {
      product(id: $id) {
        id
        title
        featuredImage { url altText }
        variants(first: 100) {
          edges { node { id title availableForSale price } }
        }
        markedVariant: metafield(namespace: "profit_picker", key: "variant_id") { value }
        badgeText: metafield(namespace: "profit_picker", key: "badge_text") { value }
        badgeColor: metafield(namespace: "profit_picker", key: "badge_color") { value }
        badgeTextColor: metafield(namespace: "profit_picker", key: "badge_text_color") { value }
      }
      productsConnection: products(first: 250) {
        edges {
          node {
            id
            markedVariant: metafield(namespace: "profit_picker", key: "variant_id") { value }
          }
        }
      }
    }
  `, { variables: { id: productGid } });

  const data = await response.json();
  const product = data.data.product;

  const usedCount = data.data.productsConnection.edges
    .filter((e) => e.node.markedVariant?.value)
    .length;

  const isThisProductMarked = !!product.markedVariant?.value;
  const planLocalizedName = t(`billing.plans.${currentPlan}.name`);
  const defaultBadgeText = t("product.defaultBadgeText");

  return {
    product: {
      id: product.id,
      numericId: params.id,
      title: product.title,
      image: product.featuredImage?.url || null,
      imageAlt: product.featuredImage?.altText || product.title,
      variants: product.variants.edges.map((e) => ({
        id: e.node.id,
        numericId: e.node.id.replace("gid://shopify/ProductVariant/", ""),
        title: e.node.title,
        price: e.node.price,
      })),
      markedVariantId: product.markedVariant?.value || null,
      badgeText: product.badgeText?.value || defaultBadgeText,
      badgeColor: product.badgeColor?.value || "#1a4d2e",
      badgeTextColor: product.badgeTextColor?.value || "#ffffff",
    },
    currentPlan,
    usedCount,
    isThisProductMarked,
    i18n: {
      back: t("product.back"),
      planLimitTitle: t("product.planLimitTitle"),
      planLimitText: t("product.planLimitText", { used: usedCount, plan: planLocalizedName }),
      upgradePlan: t("product.upgradePlan"),
      savedTitle: t("product.savedTitle"),
      savedText: t("product.savedText"),
      pickVariant: t("product.pickVariant"),
      badgeStyle: t("product.badgeStyle"),
      badgeText: t("product.badgeText"),
      badgeBgColor: t("product.badgeBgColor"),
      badgeTextColor: t("product.badgeTextColor"),
      preview: t("product.preview"),
      variantPreviewLabel: t("product.variantPreviewLabel"),
      defaultBadgeText,
      customColor: t("product.customColor"),
      removeMarking: t("product.removeMarking"),
      save: t("product.save"),
    },
  };
};

export const action = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const productGid = `gid://shopify/Product/${params.id}`;

  if (intent === "save") {
    const variantId = formData.get("variantId");
    const badgeText = (formData.get("badgeText") || "").slice(0, 20);
    const badgeColor = formData.get("badgeColor");
    const badgeTextColor = formData.get("badgeTextColor");

    await admin.graphql(`
      #graphql
      mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { field message }
        }
      }
    `, {
      variables: {
        metafields: [
          { ownerId: productGid, namespace: "profit_picker", key: "variant_id", type: "single_line_text_field", value: String(variantId) },
          { ownerId: productGid, namespace: "profit_picker", key: "badge_text", type: "single_line_text_field", value: badgeText || "MELHOR ESCOLHA" },
          { ownerId: productGid, namespace: "profit_picker", key: "badge_color", type: "single_line_text_field", value: badgeColor || "#1a4d2e" },
          { ownerId: productGid, namespace: "profit_picker", key: "badge_text_color", type: "single_line_text_field", value: badgeTextColor || "#ffffff" },
        ],
      },
    });

    return { ok: true };
  }

  if (intent === "remove") {
    await admin.graphql(`
      #graphql
      mutation DelMetas($metafields: [MetafieldIdentifierInput!]!) {
        metafieldsDelete(metafields: $metafields) { deletedMetafields { key } }
      }
    `, {
      variables: {
        metafields: [
          { ownerId: productGid, namespace: "profit_picker", key: "variant_id" },
          { ownerId: productGid, namespace: "profit_picker", key: "badge_text" },
          { ownerId: productGid, namespace: "profit_picker", key: "badge_color" },
          { ownerId: productGid, namespace: "profit_picker", key: "badge_text_color" },
        ],
      },
    });
    return { ok: true, removed: true };
  }

  return { ok: false };
};

export default function ProductDetail() {
  const { product, currentPlan, usedCount, isThisProductMarked, i18n } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const [selectedVariant, setSelectedVariant] = useState(
    product.markedVariantId ? [product.markedVariantId] : [product.variants[0]?.numericId]
  );
  const [badgeText, setBadgeText] = useState(product.badgeText);
  const [badgeColor, setBadgeColor] = useState(product.badgeColor);
  const [badgeTextColor, setBadgeTextColor] = useState(product.badgeTextColor);

  const planLimit = PLAN_LIMITS[currentPlan];
  const wouldExceedLimit = !isThisProductMarked && usedCount >= planLimit;

  const choices = product.variants.map((v) => ({
    label: `${v.title} — $${v.price}`,
    value: v.numericId,
  }));

  const handleSave = () => {
    const fd = new FormData();
    fd.append("intent", "save");
    fd.append("variantId", selectedVariant[0]);
    fd.append("badgeText", badgeText);
    fd.append("badgeColor", badgeColor);
    fd.append("badgeTextColor", badgeTextColor);
    fetcher.submit(fd, { method: "post" });
  };

  const handleRemove = () => {
    const fd = new FormData();
    fd.append("intent", "remove");
    fetcher.submit(fd, { method: "post" });
  };

  const isSaving = fetcher.state !== "idle";
  const justSaved = fetcher.data?.ok;

  return (
    <Page
      title={product.title}
      backAction={{ content: i18n.back, onAction: () => navigate("/app") }}
    >
      <Layout>
        {wouldExceedLimit && (
          <Layout.Section>
            <Banner tone="warning" title={i18n.planLimitTitle}>
              <Text as="p">{i18n.planLimitText}</Text>
              <div style={{ marginTop: 8 }}>
                <Button onClick={() => navigate("/app/billing")}>{i18n.upgradePlan}</Button>
              </div>
            </Banner>
          </Layout.Section>
        )}

        {justSaved && !fetcher.data?.removed && (
          <Layout.Section>
            <Banner tone="success" title={i18n.savedTitle}>
              <Text as="p">{i18n.savedText}</Text>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="400" blockAlign="center">
                {product.image && <Thumbnail source={product.image} alt={product.imageAlt} />}
                <Text as="h2" variant="headingMd">{i18n.pickVariant}</Text>
              </InlineStack>
              <Divider />
              <ChoiceList
                title=""
                choices={choices}
                selected={selectedVariant}
                onChange={setSelectedVariant}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">{i18n.badgeStyle}</Text>
              <TextField
                label={i18n.badgeText}
                value={badgeText}
                onChange={setBadgeText}
                maxLength={20}
                showCharacterCount
                autoComplete="off"
              />

              <ColorPicker
                label={i18n.badgeBgColor}
                value={badgeColor}
                onChange={setBadgeColor}
                palette={BG_PALETTE}
                customLabel={i18n.customColor}
              />

              <ColorPicker
                label={i18n.badgeTextColor}
                value={badgeTextColor}
                onChange={setBadgeTextColor}
                palette={TEXT_PALETTE}
                customLabel={i18n.customColor}
              />

              <Divider />
              <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">{i18n.preview}</Text>
                  <div style={{ display: "inline-block", position: "relative", padding: "12px 24px", border: "2px solid #ddd", borderRadius: 10, background: "#fff", minWidth: 80, textAlign: "center" }}>
                    <Text as="span" variant="bodyMd" tone="base">{i18n.variantPreviewLabel}</Text>
                    <span style={{
                      position: "absolute",
                      bottom: -1,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: badgeColor,
                      color: badgeTextColor,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "4px 8px",
                      borderRadius: "6px 6px 0 0",
                      whiteSpace: "nowrap",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}>
                      {badgeText || i18n.defaultBadgeText}
                    </span>
                  </div>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <InlineStack align="space-between">
            {isThisProductMarked ? (
              <Button tone="critical" variant="plain" onClick={handleRemove} loading={isSaving}>
                {i18n.removeMarking}
              </Button>
            ) : <div />}
            <Button variant="primary" onClick={handleSave} disabled={wouldExceedLimit} loading={isSaving}>
              {i18n.save}
            </Button>
          </InlineStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}