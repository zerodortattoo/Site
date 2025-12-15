
const MERCADO_PAGO_ACCESS_TOKEN = "APP_USR-6466801855350553-121413-364f00d4384a73a4fd285398ae12f511-486395204";

export default async function handler(req, res) {
    // CORS Setup
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

    const { id } = req.query; // Vercel provides path params in query

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ status: "pending" });
        }

        const data = await response.json();
        res.json({
            id: id,
            status: data.status
        });

    } catch (error) {
        console.error("Erro Check Status:", error);
        res.json({ id, status: "pending" });
    }
}
