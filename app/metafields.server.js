const DEFINITIONS = [
  { key: "variant_id", name: "Profit Picker - Variant ID" },
  { key: "badge_text", name: "Profit Picker - Badge Text" },
  { key: "badge_color", name: "Profit Picker - Badge Color" },
  { key: "badge_text_color", name: "Profit Picker - Badge Text Color" },
];

// Runs after install/auth. Creating a definition that already exists just
// returns a userError, so this is safe to repeat.
export async function ensureMetafieldDefinitions(admin) {
  for (const d of DEFINITIONS) {
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
      console.error(`Failed to create metafield definition ${d.key}`, e);
    }
  }
}
