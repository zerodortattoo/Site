
const MERCADO_PAGO_ACCESS_TOKEN = "APP_USR-6466801855350553-121413-364f00d4384a73a4fd285398ae12f511-486395204";

export default async function handler(req, res) {
    // CORS Setup for Vercel
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        const { email, total, items, paymentMethod, cardData, cpf, affiliateCode } = req.body;

        const descriptionList = items.map(i => i.title).join(", ");
        const description = descriptionList.length > 200 ? descriptionList.substring(0, 197) + "..." : descriptionList;

        const payer = {
            email: email,
            entity_type: "individual",
            type: "customer",
            identification: {}
        };

        const payerCpf = cardData?.cpf || cpf;
        if (payerCpf) {
            payer.identification = {
                type: "CPF",
                number: payerCpf.replace(/\D/g, '')
            };
            if (cardData?.cardName) {
                payer.first_name = cardData.cardName.split(" ")[0];
            }
        }

        let mpPayload = {
            transaction_amount: Number(total.toFixed(2)),
            description: `Pedido: ${description}`,
            payer: payer,
            external_reference: `ORDER-${Date.now()}`,
            metadata: {
                affiliate_id: affiliateCode || null
            }
        };

        if (paymentMethod === 'pix') {
            mpPayload = {
                ...mpPayload,
                payment_method_id: "pix",
                date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString()
            };
        } else if (paymentMethod === 'card') {
            if (!cardData || !cardData.cardNumber) {
                return res.status(400).json({ error: "Dados do cartão incompletos." });
            }

            const tokenPayload = {
                card_number: cardData.cardNumber.replace(/\s/g, ''),
                expiration_month: parseInt(cardData.expiryDate.split('/')[0]),
                expiration_year: parseInt('20' + cardData.expiryDate.split('/')[1]),
                security_code: cardData.cvv,
                cardholder: {
                    name: cardData.cardName,
                    identification: payer.identification
                }
            };

            const tokenRes = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=APP_USR-e2e72b29-9c7d-452d-a27e-d599c16183c0`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tokenPayload)
            });

            if (!tokenRes.ok) {
                const err = await tokenRes.json();
                throw new Error(`Erro ao tokenizar cartão: ${err.message || JSON.stringify(err)}`);
            }

            const tokenData = await tokenRes.json();

            const cleanNum = cardData.cardNumber.replace(/\D/g, '');
            let paymentMethodId = "master";
            if (cleanNum.startsWith('4')) paymentMethodId = "visa";
            if (cleanNum.startsWith('3')) paymentMethodId = "amex";

            mpPayload = {
                ...mpPayload,
                token: tokenData.id,
                installments: 1,
                payment_method_id: paymentMethodId,
                payer: payer
            };
        }

        const response = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `Idem-${Date.now()}-${Math.random()}`
            },
            body: JSON.stringify(mpPayload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Erro MP Response:", data);
            return res.status(response.status).json({ error: data.message || "Erro no gateway de pagamento." });
        }

        let frontendResponse = {
            id: data.id.toString(),
            status: data.status,
            expiresAt: data.date_of_expiration,
        };

        if (paymentMethod === 'pix' && data.point_of_interaction) {
            const transactionData = data.point_of_interaction.transaction_data;
            frontendResponse.qrCodeBase64 = `data:image/png;base64,${transactionData.qr_code_base64}`;
            frontendResponse.copyPaste = transactionData.qr_code;
        }

        res.status(201).json(frontendResponse);

    } catch (error) {
        console.error("Erro no Backend:", error.message);
        res.status(500).json({ error: error.message || "Erro interno no processamento do pedido" });
    }
}
