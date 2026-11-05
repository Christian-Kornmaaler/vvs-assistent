import { debugAllowed, debugConfigured } from "@/lib/debug";
import { aiConfigured, getModel } from "@/lib/model";
import { magentoConfigured, magentoInfo, magentoPing } from "@/lib/magento";

// Viser opsætning uden at afsløre nøgler. ?ping=1 tester også forbindelsen til Magento.
export async function GET(req: Request) {
  const { provider, id } = getModel();
  const ping = new URL(req.url).searchParams.has("ping") && debugAllowed(req);
  return Response.json(
    {
      ai: aiConfigured() ? { provider, model: id } : "mangler nøgle",
      fejlsoegning: debugConfigured() ? "nøgle sat" : "ingen nøgle",
      produkter: magentoConfigured ? "magento" : "demo-data (MAGENTO_URL/MAGENTO_TOKEN mangler)",
      ...(magentoConfigured ? { magento: magentoInfo() } : {}),
      ...(ping && magentoConfigured ? { forbindelse: await magentoPing() } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
