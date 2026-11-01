// Public privacy policy, linked from the App Store listing. No auth.
const CONTACT_EMAIL = "contato@rm17.com.br";
const UPDATED = "November 1, 2026";

export const meta = () => [{ title: "Profit Picker - Privacy Policy" }];

const page = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "40px 20px",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  lineHeight: 1.6,
  color: "#1a1a1a",
};

export default function Privacy() {
  return (
    <main style={page}>
      <h1>Profit Picker — Privacy Policy</h1>
      <p><em>Last updated: {UPDATED}</em></p>

      <p>
        Profit Picker (&quot;the App&quot;) lets Shopify merchants highlight one variant
        of a product with a badge on their storefront. This policy explains what
        information the App accesses and how it is used.
      </p>

      <h2>Information we access</h2>
      <ul>
        <li>
          <strong>Store information:</strong> your shop domain and the access token
          Shopify gives the App when you install it. These are stored in our
          database so the App can work in your Shopify admin.
        </li>
        <li>
          <strong>Products:</strong> product titles, images and variants, read only
          to show them in the App. The variant you choose and the badge text and
          colors are saved as metafields on your products, inside your Shopify store.
        </li>
        <li>
          <strong>Billing:</strong> your plan subscription is handled by Shopify. We
          never see or store payment details.
        </li>
      </ul>

      <h2>Customer data</h2>
      <p>
        The App does not access, collect or store any personal information about
        your customers.
      </p>

      <h2>How we use information</h2>
      <p>
        Only to provide the App&apos;s features. We do not sell, rent or share your
        information with third parties, except the service providers that host
        the App (Render for the server and Neon for the database).
      </p>

      <h2>Data retention and deletion</h2>
      <p>
        When you uninstall the App, we delete your store&apos;s session data. Shopify
        also sends us a data deletion request 48 hours after uninstall, which we
        honor. Badge settings stored as metafields remain in your store until
        you remove them.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>

      <hr style={{ margin: "40px 0" }} />

      <h1>Profit Picker — Política de Privacidade</h1>
      <p><em>Última atualização: 1 de novembro de 2026</em></p>

      <p>
        O Profit Picker (&quot;o App&quot;) permite que lojistas da Shopify destaquem uma
        variante de um produto com um selo na loja virtual. Esta política explica
        quais informações o App acessa e como elas são usadas.
      </p>

      <h2>Informações que acessamos</h2>
      <ul>
        <li>
          <strong>Dados da loja:</strong> o domínio da loja e o token de acesso que a
          Shopify entrega ao App na instalação. Eles ficam guardados no nosso banco
          de dados para o App funcionar no admin da Shopify.
        </li>
        <li>
          <strong>Produtos:</strong> títulos, imagens e variantes, lidos apenas para
          exibi-los no App. A variante escolhida e o texto e as cores do selo ficam
          salvos como metafields nos seus produtos, dentro da sua loja Shopify.
        </li>
        <li>
          <strong>Cobrança:</strong> a assinatura do plano é feita pela Shopify. Nunca
          vemos nem guardamos dados de pagamento.
        </li>
      </ul>

      <h2>Dados de clientes</h2>
      <p>
        O App não acessa, coleta nem guarda nenhuma informação pessoal dos seus
        clientes.
      </p>

      <h2>Como usamos as informações</h2>
      <p>
        Apenas para oferecer as funções do App. Não vendemos, alugamos nem
        compartilhamos suas informações com terceiros, exceto os serviços que
        hospedam o App (Render para o servidor e Neon para o banco de dados).
      </p>

      <h2>Retenção e exclusão de dados</h2>
      <p>
        Ao desinstalar o App, apagamos os dados de sessão da sua loja. A Shopify
        também nos envia um pedido de exclusão 48 horas após a desinstalação, que
        cumprimos. As configurações do selo salvas como metafields continuam na
        sua loja até você removê-las.
      </p>

      <h2>Contato</h2>
      <p>
        Dúvidas sobre esta política: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </main>
  );
}
