import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as ShopifyAppBridgeProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import polarisTranslationsEn from "@shopify/polaris/locales/en.json";
import polarisTranslationsPtBr from "@shopify/polaris/locales/pt-BR.json";
import { authenticate } from "../shopify.server";
import { getI18n } from "../i18n.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const { locale, t } = getI18n(request);

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    locale,
    nav: {
      products: t("app.nav.products"),
      plans: t("app.nav.plans"),
    },
  };
};

export default function App() {
  const { apiKey, locale, nav } = useLoaderData();
  const polarisTranslations = locale === "pt-BR" ? polarisTranslationsPtBr : polarisTranslationsEn;

  return (
    <ShopifyAppBridgeProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={polarisTranslations}>
        <s-app-nav>
          <s-link href="/app">{nav.products}</s-link>
          <s-link href="/app/billing">{nav.plans}</s-link>
        </s-app-nav>
        <Outlet />
      </PolarisAppProvider>
    </ShopifyAppBridgeProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};