const express = require('express');
const axios = require('axios');
const skinRenderer = require('./utils/skin-renderer');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));

// --- ÖNBELLEKLEME SİSTEMLERİ ---
const uuidCache = new Map(); // Kullanıcı adı -> UUID eşlemesi için

// --- HELPER FONKSİYON: Kullanıcı Adından UUID Al (Önbellek Destekli) ---
async function getUuid(username) {
    const lowerCaseUsername = username.toLowerCase();
    if (uuidCache.has(lowerCaseUsername)) {
        const cached = uuidCache.get(lowerCaseUsername);
        // Önbellek süresi 1 saat
        if (Date.now() - cached.timestamp < 3600 * 1000) {
            console.log(`[UUID Cache Hit] Found UUID for ${username} in cache.`);
            return cached.uuid;
        }
    }

    console.log(`[UUID Cache Miss] Fetching UUID for ${username} from Mojang API...`);
    const mojangUser = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    const uuid = mojangUser.data.id;

    // Yeni UUID'yi önbelleğe al
    uuidCache.set(lowerCaseUsername, { uuid: uuid, timestamp: Date.now() });
    return uuid;
}

// --- HELPER FONKSİYON: Skin Dokusunu İndir ---
async function getSkinBuffer(uuid) {
    const sessionResp = await axios.get(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
    const textureProperty = sessionResp.data.properties.find(prop => prop.name === 'textures');
    const textureJson = Buffer.from(textureProperty.value, 'base64').toString('utf8');
    const textureData = JSON.parse(textureJson);
    if (!textureData.textures.SKIN) throw new Error('Player has no skin.');
    const skinUrl = textureData.textures.SKIN.url;
    const skinResponse = await axios.get(skinUrl, { responseType: 'arraybuffer' });
    return Buffer.from(skinResponse.data);
}

// --- API ENDPOINT'LERİ ---

// Steve'in UUID'si, yedek olarak kullanılacak
const STEVE_UUID = '8667ba71b85a4004af54457a9734eed7';

app.get('/head/3d/:username', async (req, res) => {
    try {
        const uuid = await getUuid(req.params.username);
        const crafatarUrl = `https://crafatar.com/renders/head/${uuid}?overlay&scale=10`;
        const imageResponse = await axios.get(crafatarUrl, { responseType: 'arraybuffer' });
        res.setHeader('Content-Type', 'image/png');
        res.send(imageResponse.data);
    } catch (error) {
        console.error(`[Fallback] Could not get 3D head for ${req.params.username}. Redirecting to Steve.`);
        res.redirect(`https://crafatar.com/renders/head/${STEVE_UUID}?overlay&scale=10`);
    }
});

app.get('/skin/3d/:username', async (req, res) => {
    try {
        const uuid = await getUuid(req.params.username);
        const crafatarUrl = `https://crafatar.com/renders/body/${uuid}?overlay&scale=10`;
        const imageResponse = await axios.get(crafatarUrl, { responseType: 'arraybuffer' });
        res.setHeader('Content-Type', 'image/png');
        res.send(imageResponse.data);
    } catch (error) {
        console.error(`[Fallback] Could not get 3D body for ${req.params.username}. Redirecting to Steve.`);
        res.redirect(`https://crafatar.com/renders/body/${STEVE_UUID}?overlay&scale=10`);
    }
});

app.get('/head/:username', async (req, res) => {
    try {
        const uuid = await getUuid(req.params.username);
        const skinBuffer = await getSkinBuffer(uuid);
        res.setHeader('Content-Type', 'image/png');
        res.send(await skinRenderer.renderAvatar(skinBuffer));
    } catch (error) { res.status(404).send('Player not found or has no skin.'); }
});

app.get('/head/nonlayer/:username', async (req, res) => {
    try {
        const uuid = await getUuid(req.params.username);
        const skinBuffer = await getSkinBuffer(uuid);
        res.setHeader('Content-Type', 'image/png');
        res.send(await skinRenderer.renderAvatarNoLayer(skinBuffer));
    } catch (error) { res.status(404).send('Player not found or has no skin.'); }
});

app.get('/body/:username', async (req, res) => {
    try {
        const uuid = await getUuid(req.params.username);
        const skinBuffer = await getSkinBuffer(uuid);
        res.setHeader('Content-Type', 'image/png');
        res.send(await skinRenderer.renderBody(skinBuffer));
    } catch (error) { res.status(404).send('Player not found or has no skin.'); }
});

app.get('/skin/:username', async (req, res) => {
    try {
        const uuid = await getUuid(req.params.username);
        res.setHeader('Content-Type', 'image/png');
        res.send(await getSkinBuffer(uuid));
    } catch (error) { res.status(404).send('Player not found or has no skin.'); }
});


// --- WEB SAYFASI ROUTE'LARI ---
app.get('/', (req, res) => {
    res.render('index', {
        title: 'MCC Skins - High Quality Minecraft Skin Renderer & API',
        pageType: 'home',
        skin: null
    });
});

app.get('/player/:username', async (req, res) => {
    const usernameParam = req.params.username;
    try {
        const uuid = await getUuid(usernameParam);
        const sessionResp = await axios.get(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
        const realUsername = sessionResp.data.name;

        const skinData = { username: realUsername };

        res.render('skin', {
            title: `${realUsername}'s Renders - MCC Skins`,
            pageType: 'player',
            skin: skinData,
            error: null
        });
    } catch (error) {
        res.render('skin', {
            title: 'Player Not Found - MCC Skins',
            pageType: 'player',
            skin: null,
            error: `Player "${usernameParam}" not found.`
        });
    }
});


app.listen(port, () => {
    console.log(`MCC Skins server listening at http://localhost:${port}`);
});