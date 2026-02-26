const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const app = express();

app.use(cookieParser());

const TARGET_URL = "https://www.zenithummedia.com/case-studies?utm_source=google&utm_medium=medium&utm_campaign=LEMDA&utm_id=Visit_frame";
const MEASUREMENT_ID = "G-SNCY0K36MC";

/**
 * Manages background session activity
 */
async function processBackgroundActivity(clientId, sessionId, userAgent) {
    let elapsedDuration = 0;
    const maxDuration = 82500; // 82.5 seconds

    while (elapsedDuration < maxDuration) {
        // Random interval between 8-12 seconds
        const interval = Math.floor(Math.random() * (12000 - 8000 + 1) + 8000);
        await new Promise(resolve => setTimeout(resolve, interval));
        elapsedDuration += interval;

        const eventTypes = ['page_view', 'user_engagement', 'scroll'];
        const currentEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];

        const params = new URLSearchParams({
            v: '2',
            tid: MEASUREMENT_ID,
            cid: clientId,
            sid: sessionId,
            en: currentEvent,
            _et: interval.toString(),
            seg: '1',
            dr: ''
        });

        try {
            await axios.post(
                `https://www.google-analytics.com/g/collect?${params.toString()}`,
                {},
                { headers: { 'User-Agent': userAgent } }
            );
        } catch (error) {
            // Silent fail
        }
    }
}

app.all('/', (req, res) => {
    // Safely extract cookies
    const gaCookie = req.cookies['_ga'] || null;
    const sessionCookie = req.cookies[`_ga_${MEASUREMENT_ID.slice(2)}`] || null;

    // FIX 1: Proper fallback + null safety
    const clientId = gaCookie
        ? gaCookie.split('.').slice(-2).join('.')
        : `100.${Date.now()}`;

    // FIX 2: Remove invalid .Date.now() and add safety check
    const sessionId = sessionCookie
        ? sessionCookie.split('.')[2]
        : Date.now().toString();

    const userAgent = req.headers['user-agent'] || 'Mozilla/5.0';

    // Run background task without blocking response
    processBackgroundActivity(clientId, sessionId, userAgent).catch(() => {});

    // 307 Redirect
    res.set({
        'Location': TARGET_URL,
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
    });

    res.status(307).send();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Traffic manager active on port ${PORT}`));