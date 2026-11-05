import { aiConfigured, getModel } from "@/lib/model";
import { magentoConfigured } from "@/lib/magento";

// Viser opsætning uden at afsløre nøgler.
export async function GET() {
  const { provider, id } = getModel();
  return Response.json({
    ai: aiConfigured() ? { provider, model: id } : "mangler nøgle",
    produkter: magentoConfigured ? "magento" : "demo-data (MAGENTO_URL/MAGENTO_TOKEN mangler)",
  });
}
