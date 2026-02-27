const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const app = express();

app.use(cookieParser());

const TARGET_URL = "https://www.zenithummedia.com/case-studies?utm_source=google&utm_medium=medium&utm_campaign=DEBUG&utm_id=Visit_frame";
const MEASUREMENT_ID = "G-SNCY0K36MC";


function getGaIdentifiers(cookies) {
    const gaCookie = cookies['_ga'] || '';
    const clientId = gaCookie.split('.').slice(-2).join('.') || `100.${Math.round(Math.random() * 1000000000)}`;

    const sidKey = `_ga_${MEASUREMENT_ID.slice(2)}`;
    const sessionCookie = cookies[sidKey] || '';
    const sessionId = sessionCookie.split('.')[2] || Math.round(Date.now() / 1000).toString();

    return { clientId, sessionId };
}


async function sendGaPing(clientId, sessionId, userAgent, eventName, engagementTime = 0) {
    const params = new URLSearchParams({
        v: '2',
        tid: MEASUREMENT_ID,
        cid: clientId,
        sid: sessionId,
        en: eventName,
        seg: '1',
        _dbg: '1' // Ensures visibility in DebugView
    });

    if (engagementTime > 0) {
        params.append('_et', engagementTime.toString());
    }

    try {
        await axios.get(`https://www.google-analytics.com/g/collect?${params.toString()}`, {
            headers: { 'User-Agent': userAgent }
        });
        console.log(`[GA4] Event sent: ${eventName} (${engagementTime/1000}s)`);
    } catch (err) {
        console.error(`[GA4 Error] ${eventName} failed:, err.message`);
    }
}

async function handleSessionLifecycle(clientId, sessionId, userAgent) {
    // 1. IMMEDIATE WARM-UP PING
    // This "registers" the session so GA4 is ready for the final update
    await sendGaPing(clientId, sessionId, userAgent, 'session_start_warmup');

    // 2. RANDOM WAIT (90-100s)
    const randomDuration = Math.floor(Math.random() * (100000 - 90000 + 1) + 90000);
    console.log(`[Timer] Waiting ${randomDuration / 1000}s to finalize duration...`);
    
    await new Promise(resolve => setTimeout(resolve, randomDuration));

    // 3. FINAL DURATION PING
    await sendGaPing(clientId, sessionId, userAgent, 'session_duration_finalized', randomDuration);
}

app.all('/', (req, res) => {
    const { clientId, sessionId } = getGaIdentifiers(req.cookies);
    const userAgent = req.headers['user-agent'] || 'Mozilla/5.0';

    // Start background lifecycle (Immediate + Delayed)
    handleSessionLifecycle(clientId, sessionId, userAgent);

    // Instant 307 Redirect
    res.set({
        'Location': TARGET_URL,
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    res.status(307).send();
});

app.listen(3000, () => console.log('Verifier with Warm-up Ping active on port 3000'));