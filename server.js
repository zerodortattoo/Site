import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import handlers
import ordersHandler from './api/orders.js';
import orderStatusHandler from './api/orders/[id].js';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serving Static Files (The Site)
app.use(express.static(path.join(__dirname, 'site-protocolo')));

// API Routes
// 1. Create Order
app.post('/api/orders', async (req, res) => {
    try {
        await ordersHandler(req, res);
    } catch (err) {
        console.error("API Error:", err);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

// 2. Check Status
app.get('/api/orders/:id', async (req, res) => {
    try {
        // Vercel Serverless Functions usually get path params in query with directory routing
        // We simulate this by attaching the ID to req.query
        req.query = { ...req.query, id: req.params.id };
        
        await orderStatusHandler(req, res);
    } catch (err) {
        console.error("API Error:", err);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`✅ Server running locally at http://localhost:${PORT}`);
    console.log(`📂 Serving site from: ${path.join(__dirname, 'site-protocolo')}`);
});
