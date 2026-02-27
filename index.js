const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const app = express();

app.use(cookieParser());

const TARGET_URL = "https://www.zenithummedia.com/case-studies?utm_source=google&utm_medium=medium&utm_campaign=DEBUG&utm_id=Visit_frame";
const MEASUREMENT_ID = "G-SNCY0K36MC";

/**
 * Background task to "lock in" session duration
 */
async function finalizeSessionDuration(clientId, sessionId, userAgent) {
    // Generate a random duration between 90,000ms and 100,000ms
    const randomDuration = Math.floor(Math.random() * (100000 - 90000 + 1) + 90000);
    
    console.log(`Holding session for: ${randomDuration / 1000} seconds...`);

    // Wait for the random duration
    await new Promise(resolve => setTimeout(resolve, randomDuration));

    const payload = new URLSearchParams({
        v: '2',
        tid: MEASUREMENT_ID,
        cid: clientId,
        sid: sessionId,
        en: 'session_duration_finalized', 
        _et: randomDuration.toString(), // The secret to forcing the duration
        seg: '1',
        debug_mode: '1'                 // Allows for easy verification
    });

    try {
        await axios.post(`https://www.google-analytics.com/g/collect?${payload.toString()}`, {}, {
            headers: { 'User-Agent': userAgent }
        });
        console.log(`Success: Session duration recorded as ${randomDuration / 1000}s`);
    } catch (err) {
        console.error("Final ping failed:", err.message);
    }
}

app.all('/', (req, res) => {
    const gaCookie = req.cookies['_ga'] || '';
    const sessionCookie = req.cookies[`_ga_${MEASUREMENT_ID.slice(2)}`] || '';

    // Extract or generate IDs
    const clientId = gaCookie ? 
       gaCookie.split('.').slice(-2).join('.') : `100.${Date.now()}`;
    const sessionId = sessionCookie ? sessionCookie.split('.')[2] :  Date.now().toString();
    const userAgent = req.headers['user-agent'] || 'Mozilla/5.0';

    // Start background timer
    finalizeSessionDuration(clientId, sessionId, userAgent);

    // Instant Redirect
    res.set({
        'Location': TARGET_URL,
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    res.status(307).send();
});

app.listen(3000, () => console.log('Verifier active on port 3000'));