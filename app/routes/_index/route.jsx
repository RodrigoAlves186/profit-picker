import { redirect } from "react-router";
import styles from "./styles.module.css";

// App Store apps must not ask for the shop domain, so this page has no login form.
export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return null;
};

export default function App() {
  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Profit Picker</h1>
        <p className={styles.text}>
          Highlight the product variant you want customers to choose, with a
          badge right on the variant picker.
        </p>
        <p className={styles.text}>
          Install Profit Picker from the Shopify App Store.
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Pick the variant</strong>. Choose which variant of each
            product gets the highlight, right from the Shopify admin.
          </li>
          <li>
            <strong>Customize the badge</strong>. Set the badge text and colors to
            match your store.
          </li>
          <li>
            <strong>Works with your theme</strong>. Turn it on as an app embed in
            the theme editor, with no code changes.
          </li>
        </ul>
        <p className={styles.text}>
          <a href="/privacy">Privacy policy</a>
        </p>
      </div>
    </div>
  );
}
