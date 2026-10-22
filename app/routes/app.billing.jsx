import { useLoaderData, useNavigate, useFetcher } from "react-router";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  Divider,
  List,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getI18n } from "../i18n.server";
import { BILLING_PLANS, PLAN_KEYS, getCurrentPlan } from "../plans.server";

export const loader = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const { t } = getI18n(request);

  const { currentPlan } = await getCurrentPlan({ admin, billing, session });

  const plans = PLAN_KEYS.map((key) => ({
    key,
    billingName: BILLING_PLANS[key] || null,
    name: t(`billing.plans.${key}.name`),
    price: t(`billing.plans.${key}.price`),
    limit: t(`billing.plans.${key}.limit`),
    features: t(`billing.plans.${key}.features`),
  }));

  return {
    currentPlan,
    plans,
    i18n: {
      title: t("billing.title"),
      subtitle: t("billing.subtitle"),
      back: t("billing.back"),
      current: t("billing.current"),
      currentPlan: t("billing.currentPlan"),
      downgradeViaCancel: t("billing.downgradeViaCancel"),
      cancelSubscription: t("billing.cancelSubscription"),
      needMoreTitle: t("billing.needMoreTitle"),
      needMoreText: t("billing.needMoreText"),
    },
    chooseTemplate: t("billing.choose", { plan: "__PLAN__" }),
  };
};

export const action = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const planKey = formData.get("plan");
  const intent = formData.get("intent");
  const { isTest, subscription } = await getCurrentPlan({ admin, billing, session });

  if (intent === "cancel") {
    if (subscription) {
      await billing.cancel({
        subscriptionId: subscription.id,
        isTest,
        prorate: true,
      });
    }
    return { ok: true };
  }

  const billingName = BILLING_PLANS[planKey];
  if (!billingName) return { ok: false };

  await billing.require({
    plans: [billingName],
    isTest,
    onFailure: async () => billing.request({ plan: billingName, isTest }),
  });

  return { ok: true };
};

export default function Billing() {
  const { currentPlan, plans, i18n, chooseTemplate } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const isLoading = fetcher.state !== "idle";

  const handleSelect = (planKey) => {
    const fd = new FormData();
    fd.append("intent", "subscribe");
    fd.append("plan", planKey);
    fetcher.submit(fd, { method: "post" });
  };

  const handleCancel = () => {
    const fd = new FormData();
    fd.append("intent", "cancel");
    fetcher.submit(fd, { method: "post" });
  };

  return (
    <Page
      title={i18n.title}
      subtitle={i18n.subtitle}
      backAction={{ content: i18n.back, onAction: () => navigate("/app") }}
    >
      <Layout>
        <Layout.Section>
          <InlineStack gap="400" wrap>
            {plans.map((plan) => {
              const isCurrent = plan.key === currentPlan;
              return (
                <div key={plan.key} style={{ flex: "1 1 220px", minWidth: 220 }}>
                  <Card>
                    <BlockStack gap="400">
                      <BlockStack gap="100">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="h3" variant="headingLg">{plan.name}</Text>
                          {isCurrent && <Badge tone="success">{i18n.current}</Badge>}
                        </InlineStack>
                        <Text as="p" variant="headingMd" tone="subdued">{plan.price}</Text>
                        <Text as="p" tone="subdued" variant="bodySm">{plan.limit}</Text>
                      </BlockStack>
                      <Divider />
                      <List type="bullet">
                        {plan.features.map((f) => (
                          <List.Item key={f}>{f}</List.Item>
                        ))}
                      </List>
                      <div style={{ marginTop: "auto" }}>
                        {isCurrent ? (
                          plan.key === "free" ? (
                            <Button fullWidth disabled>{i18n.currentPlan}</Button>
                          ) : (
                            <Button fullWidth tone="critical" onClick={handleCancel} loading={isLoading}>
                              {i18n.cancelSubscription}
                            </Button>
                          )
                        ) : plan.key === "free" ? (
                          <Button fullWidth disabled>{i18n.downgradeViaCancel}</Button>
                        ) : (
                          <Button fullWidth variant="primary" onClick={() => handleSelect(plan.key)} loading={isLoading}>
                            {chooseTemplate.replace("__PLAN__", plan.name)}
                          </Button>
                        )}
                      </div>
                    </BlockStack>
                  </Card>
                </div>
              );
            })}
          </InlineStack>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">{i18n.needMoreTitle}</Text>
              <Text as="p" tone="subdued">{i18n.needMoreText}</Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}