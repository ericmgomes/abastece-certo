const target = process.argv[2] || "http://localhost:8087/api/whatsapp/webhook";
const phone = process.argv[3] || "5511999999999";
const text = process.argv.slice(4).join(" ") || "oi";

const payload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "test-entry",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "551122223333",
              phone_number_id: "test-phone-number-id"
            },
            contacts: [
              {
                wa_id: phone,
                profile: {
                  name: "Teste WhatsApp"
                }
              }
            ],
            messages: [
              {
                from: phone,
                id: `wamid.${Date.now()}`,
                timestamp: String(Math.floor(Date.now() / 1000)),
                type: "text",
                text: {
                  body: text
                }
              }
            ]
          }
        }
      ]
    }
  ]
};

async function main() {
  const response = await fetch(target, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const raw = await response.text();
  console.log(`Status: ${response.status}`);
  try {
    console.log(JSON.stringify(JSON.parse(raw), null, 2));
  } catch {
    console.log(raw);
  }
}

main().catch((error) => {
  const errors = error?.cause?.errors || [];
  const refused =
    error?.cause?.code === "ECONNREFUSED" ||
    errors.some((item) => item?.code === "ECONNREFUSED");

  if (refused) {
    console.error(`Nao consegui conectar em ${target}.`);
    console.error("");
    console.error("Antes, suba a API local com:");
    console.error("  npx vercel dev --listen 8087");
    console.error("");
    console.error("Se estiver usando outra porta, informe a URL completa:");
    console.error(
      "  node scripts/simulate-whatsapp-webhook.js http://localhost:3000/api/whatsapp/webhook"
    );
    process.exitCode = 1;
    return;
  }

  console.error(error);
  process.exitCode = 1;
});
