const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const https = require('https');
const app = express();

// 1. Tell Express to trust Render's proxy to get the real User IP
app.set('trust proxy', true);
app.use(cookieParser());

// Connection pooling for high volume
const gaClient = axios.create({
    httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 100 }),
    timeout: 10000
});

const TARGET_URL = "https://www.zenithummedia.com/case-studies?utm_source=google&utm_medium=medium&utm_campaign=DEBUG3&utm_id=Visit_frame";
const MEASUREMENT_ID = "G-SNCY0K36MC";

async function runServerSideTracking(ids) {
    //const initialBuffer = 5000;

    console.log(`pv started ...`)
    await sendPing(ids, 'page_view1', { 
        '_et': 0
    })
    console.log("pv ended ...")

    const scrollDelay1 = Math.floor(Math.random() * (25000 - 20000 + 1) + 20000);

    await new Promise(resolve => setTimeout(resolve, scrollDelay1));
    console.log(`Scroll started in ${scrollDelay1} sec`)
    await sendPing(ids, 'scroll', { 
        'epn.percent_scrolled': 90,
        '_et': scrollDelay1.toString()
    })
    console.log(`Scroll endeded ...`)

    const scrollDelay2 = Math.floor(Math.random() * (100000 - 90000 + 1) + 90000);

    await new Promise(resolve => setTimeout(resolve, scrollDelay2));
    console.log(`Final session started in ${scrollDelay2} sec`)
    await sendPing(ids, 'final_session', { 
        '_et': scrollDelay2.toString()
    })
    console.log(`Final session ended`)

}


async function sendPing(ids, eventName, extraParam={}) {     
      

      const params = new URLSearchParams({
        v: '2',
        tid: MEASUREMENT_ID,
        cid: ids.clientId,
        dl: TARGET_URL,
        sid: ids.sessionId,
        uip: ids.userIp,
        _uip: ids.userIp,    // <--- FIXES THE LOCATION (India vs US)
        en: eventName,
        session_engaged: 1,
        campaign_source: 'google',
        campaign_medium: 'medium',
        campaign_name: 'TARBUZ3march',
        _dbg: '1',
        
        z: Math.floor(Math.random() * 1000000000).toString(),
        ...extraParam 
      });

    try {
        await gaClient.get(`https://www.google-analytics.com/g/collect?${params.toString()}`, {
            headers: { 
                'User-Agent': ids.userAgent,
                'X-Forwarded-For': ids.userIp 
            }
        });
        console.log(`[GA4] ${eventName} sent for IP: ${ids.userIp}`);
    } catch (err) {
        // Silent fail for high volume
    }
}

app.all('/', (req, res) => {
    
    const gaCookie = req.cookies['_ga'] || '';
    const clientId = gaCookie.split('.').slice(-2).join('.') || `100.${Date.now()}`;
    
    const sidKey = `_ga_${MEASUREMENT_ID.slice(2)}`;
    const sessionCookie = req.cookies?.[sidKey] || '';
    const sessionId = sessionCookie.split('.')[2] || Math.round(Date.now() / 1000).toString();
    
    // Get real user IP from Render's headers
    const userIp = (req.headers['x-forwarded-for'] || req.ip ||  '').split(',')[0].trim().replace('::ffff:', ''); 
    const userAgent = req.headers['user-agent'] || 'Mozilla/5.0';

    const ids = {
        clientId: clientId,
        sessionId: sessionId,
        userIp,
        userAgent
    };

    runServerSideTracking(ids);

    // 3. Instant 307 Redirect
    res.set({
        'Location': TARGET_URL,
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
    });

    res.status(307).send();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Location-Corrected Scaler active on port ${PORT}`));