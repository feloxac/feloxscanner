const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const https = require('https');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const API_BASE = 'https://yourdomain.com/api';

const APP_ICON_PATH_CANDIDATES = [
    path.join(__dirname, 'build', 'icon.png'),
    path.join(__dirname, 'logo.webp')
];
const APP_ICON_PATH = APP_ICON_PATH_CANDIDATES.find((p) => fs.existsSync(p));

const DEFINITE_CHEATS = [
    'susano', 'redengine', 'redengine.exe', 'forte', 'forte.exe',
    'keyser', 'keyser.exe', 'cfxsense', 'cfxsense.exe',
    'macho', 'macho.exe', 'skript.gg', 'eulen', 'hydra', 'water.exe',
    'ftptd', 'ftptd.exe'
];

const LUA_CHEAT_STRONG = [
    'macho', 'susano', 'redengine', 'red engine', 'cfxsense', 'skript.gg',
    'eulen', 'hydra cheat', 'forte cheat', 'keyser',
    'aimbot', 'wallhack', 'triggerbot', 'norecoil', 'no_recoil',
    'speedhack', 'speed_hack', 'godmode', 'god_mode',
    'killaura', 'kill_aura', 'silentaim', 'silent_aim',
    'magicbullet', 'magic_bullet', 'flyhack', 'fly_hack',
    'moneyhack', 'money_hack', 'teleport_hack',
    'executorlib', 'executor_lib', 'cheat_menu',
    'hack_menu', 'esp_menu', 'aimbot_menu'
];

const LUA_CHEAT_WEAK = [
    'noclip', 'esp_draw', 'draw_esp', 'esp_box', 'esp_line', 'esp_player',
    'troll_menu', 'troll_player', 'crash_player', 'kick_player',
    'give_item', 'giveitem', 'spawn_item', 'add_money', 'addmoney',
    'kill_all', 'killall', 'kill_player',
    'setplayerinvincible', 'setsuperjumpthisframe',
    'setrunsprintmultiplierforplayer', 'networkresurrectlocalplayer',
    'clearplayerwantedlevel', 'networksetinspectmode',
    'giveweapontoped', 'setentitycoords', 'setentityhealth',
    'setentityvisible', 'setplayermodel'
];

const SAFE_LUA_PATHS = [
    'fivem.app\\citizen', 'lua-language-server', 'sumneko.lua',
    'luapackages', '\\meta\\', '\\library\\', '\\locale\\',
    'node_modules', '.vscode', '\\server\\meta\\', 'roblox\\versions'
];

const CHEAT_HASHES = [
    '501E421CB23574DF752C920B32E7FBEF5A8D0200C7388452708FD13F3761FD3C'
];

const BROWSER_CHEAT_KEYWORDS = [
    'macho', 'susano', 'skript.gg', 'keyser', 'redengine', 'nagasaki',
    'wentra', 'adminpower', 'forte', 'cfxsense', 'eulen', 'hydra',
    'macho fivem', 'susano fivem', 'keyser fivem', 'redengine fivem',
    'nagasaki fivem', 'wentra fivem', 'adminpower fivem', 'forte fivem',
    'cfxsense fivem', 'skript gg', 'skriptgg',
    'fivem hile', 'fivem cheat', 'fivem aimbot', 'fivem hack',
    'fivem wallhack', 'fivem esp', 'fivem triggerbot', 'fivem norecoil',
    'fivem speedhack', 'fivem godmode', 'fivem money hack',
    'fivem mod menu', 'fivem lua executor', 'fivem script executor',
    'fivem injector', 'fivem inject', 'fivem external cheat',
    'fivem internal cheat', 'fivem private cheat', 'fivem legit cheat',
    'fivem rage cheat', 'fivem hwid spoofer', 'fivem bypass tool',
    'fivem undetectable cheat',
    'gta v hile', 'gta v cheat', 'gta 5 hile', 'gta 5 cheat',
    'fivem undetected', 'fivem bypass', 'fivem anti cheat bypass',
    'redengine.net', 'cfxsense.com',
    'fivem free cheat', 'fivem paid cheat', 'fivem premium cheat'
];

const ARTIFACT_CHEAT_KEYWORDS = Array.from(new Set([
    ...DEFINITE_CHEATS,
    'macho', 'susano', 'redengine', 'keyser', 'cfxsense', 'forte',
    'skript.gg', 'skriptgg', 'nagasaki', 'wentra', 'adminpower',
    'aimbot', 'wallhack', 'triggerbot', 'norecoil',
    'lua executor', 'luaexecutor', 'mod menu', 'modmenu',
    'fivem cheat', 'fivem hile', 'fivem aimbot', 'fivem bypass',
    'ftptd'
])).map((item) => String(item).toLowerCase());

const SKIP_FOLDERS = [
    'c:\\windows', 'c:\\program files', 'c:\\program files (x86)',
    'c:\\$recycle.bin', 'c:\\system volume information',
    'c:\\programdata\\microsoft', 'c:\\programdata\\packages',
    'c:\\users\\default', 'c:\\users\\public\\appdata',
    'c:\\intel', 'c:\\nvidia', 'c:\\amd', 'c:\\drivers',
    'c:\\perflogs', 'c:\\recovery', 'c:\\inetpub'
];

const SKIP_PATTERNS = [
    /^api-ms-win/, /^msvcp/, /^msvcr/, /^ucrtbase/, /^vcruntime/,
    /^kernel32/, /^user32/, /^gdi32/, /^shell32/, /^ole32/,
    /^system\./, /^mscorlib/, /^windows\./, /^microsoft\./,
    /^natives_/, /^citizen/, /^gta-/, /^rage-/, /^universal_/
];

const MAX_DIR_THREATS = 300;
const MAX_USB_EVENTS = 35;
const MAX_RECENT_ITEMS = 60;
const MAX_TEMP_FILES = 7000;
const MAX_TEMP_THREATS = 150;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value) {
    return String(value || '').toLowerCase();
}

function formatTimestamp(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Unknown time';
    return d.toISOString().replace('T', ' ').slice(0, 19);
}

function createThreat(type, itemPath, details) {
    return {
        type,
        path: itemPath,
        details,
        severity: 'threat'
    };
}

function createInfo(type, itemPath, details) {
    return {
        type,
        path: itemPath,
        details,
        severity: 'info'
    };
}

function dedupeFindings(items) {
    const seen = new Set();
    const out = [];
    for (const item of items || []) {
        if (!item || typeof item !== 'object') continue;
        const key = `${item.type}|${item.path}|${item.details}|${item.severity || 'threat'}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
    }
    return out;
}

function findCheatKeyword(text) {
    const lower = normalizeText(text);
    for (const keyword of ARTIFACT_CHEAT_KEYWORDS) {
        if (lower.includes(keyword)) return keyword;
    }
    return '';
}

function shouldSkipFolder(folderPath) {
    const lowerPath = normalizeText(folderPath);
    return SKIP_FOLDERS.some((skip) => lowerPath.startsWith(skip) || lowerPath.includes(skip));
}

function shouldSkipFile(fileName) {
    const lowerName = normalizeText(fileName);
    return SKIP_PATTERNS.some((pattern) => pattern.test(lowerName));
}

function isDefiniteCheat(filePath) {
    const lowerPath = normalizeText(filePath);
    const parts = lowerPath.split('\\');
    const fileName = parts[parts.length - 1];
    for (const cheat of DEFINITE_CHEATS) {
        const lowerCheat = normalizeText(cheat);
        if (fileName === lowerCheat || fileName.startsWith(lowerCheat + '.')) return true;
        if (parts.some((p) => normalizeText(p) === lowerCheat)) return true;
    }
    return false;
}

function getFileHash(filePath) {
    return new Promise((resolve) => {
        try {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);
            stream.on('data', (chunk) => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex').toUpperCase()));
            stream.on('error', () => resolve(null));
        } catch (e) {
            resolve(null);
        }
    });
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 500,
        height: 600,
        backgroundColor: '#06060b',
        icon: APP_ICON_PATH,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true
        },
        autoHideMenuBar: true,
        resizable: false,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#06060b',
            symbolColor: '#ffffff'
        }
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

function apiPost(endpoint, data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        const fullUrl = API_BASE + endpoint;
        const urlObj = new URL(fullUrl);

        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(responseData));
                } catch (e) {
                    reject(new Error('Invalid response: ' + responseData.substring(0, 200)));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

ipcMain.handle('validate-key', async (_event, key) => {
    try {
        const result = await apiPost('/scanner_validate_pin.php', { pin: key });
        return result;
    } catch (e) {
        return { valid: false, error: 'Connection failed. Check your internet.' };
    }
});

async function scanDirectory(dirPath, extensions) {
    let fileCount = 0;
    let threatCount = 0;
    const threats = [];
    const filesToScan = [];
    let dirCount = 0;

    async function collectFiles(currentDir) {
        if (shouldSkipFolder(currentDir)) return;

        try {
            const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
            dirCount++;
            if (dirCount % 50 === 0) await sleep(0);

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    const name = normalizeText(entry.name);
                    if (['.git', 'node_modules', '.vscode', 'temp', 'tmp', 'cache', '__pycache__'].includes(name)) continue;
                    await collectFiles(fullPath);
                } else if (entry.isFile()) {
                    const ext = normalizeText(path.extname(entry.name));
                    if (extensions.includes(ext) && !shouldSkipFile(entry.name)) {
                        filesToScan.push({ path: fullPath, name: entry.name, ext });
                    }
                }
            }
        } catch (e) {
        }
    }

    await collectFiles(dirPath);

    for (let i = 0; i < filesToScan.length; i++) {
        const file = filesToScan[i];
        fileCount++;
        if (i % 20 === 0) await sleep(0);

        if (isDefiniteCheat(file.path)) {
            threatCount++;
            if (threats.length < MAX_DIR_THREATS) {
                threats.push(createThreat('CHEAT', file.path, 'Known cheat detected'));
            }
            continue;
        }

        if (['.exe', '.dll', '.asi', '.rpf'].includes(file.ext)) {
            const keyword = findCheatKeyword(`${file.name} ${file.path}`);
            if (keyword) {
                threatCount++;
                if (threats.length < MAX_DIR_THREATS) {
                    if (file.ext === '.rpf') {
                        threats.push(createThreat('RPF ARTIFACT', file.path, `Suspicious RPF keyword: ${keyword}`));
                    } else {
                        threats.push(createThreat('EXECUTABLE ARTIFACT', file.path, `Suspicious executable keyword: ${keyword}`));
                    }
                }
            }
        }

        if (['.exe', '.dll'].includes(file.ext)) {
            const hash = await getFileHash(file.path);
            if (hash && CHEAT_HASHES.includes(hash)) {
                threatCount++;
                if (threats.length < MAX_DIR_THREATS) {
                    threats.push(createThreat('HASH MATCH', file.path, 'Hash matched known cheat'));
                }
            }
        }

        if (file.ext === '.lua') {
            const lowerPath = normalizeText(file.path);
            if (SAFE_LUA_PATHS.some((safePath) => lowerPath.includes(normalizeText(safePath)))) {
                continue;
            }

            try {
                const stats = fs.statSync(file.path);
                if (stats.size > 5 * 1024 * 1024) continue;

                const content = await fs.promises.readFile(file.path, 'utf-8');
                const lowerContent = normalizeText(content);

                const strongMatch = LUA_CHEAT_STRONG.filter((kw) => lowerContent.includes(kw));
                if (strongMatch.length >= 1) {
                    threatCount++;
                    if (threats.length < MAX_DIR_THREATS) {
                        threats.push(createThreat('CHEAT LUA', file.path, strongMatch.slice(0, 3).join(' | ')));
                    }
                    continue;
                }

                const weakMatch = LUA_CHEAT_WEAK.filter((kw) => lowerContent.includes(kw));
                if (weakMatch.length >= 3) {
                    threatCount++;
                    if (threats.length < MAX_DIR_THREATS) {
                        threats.push(createThreat('CHEAT LUA', file.path, weakMatch.slice(0, 3).join(' | ')));
                    }
                }
            } catch (e) {
            }
        }
    }

    return {
        count: fileCount,
        threats: threatCount,
        threatList: dedupeFindings(threats)
    };
}

async function scanBrowserHistory() {
    const findings = [];
    const localAppData = process.env.LOCALAPPDATA || '';
    const appData = process.env.APPDATA || '';

    const browsers = [
        { name: 'Chrome', paths: [path.join(localAppData, 'Google', 'Chrome', 'User Data')] },
        { name: 'Edge', paths: [path.join(localAppData, 'Microsoft', 'Edge', 'User Data')] },
        {
            name: 'Opera',
            paths: [
                path.join(appData, 'Opera Software', 'Opera Stable'),
                path.join(appData, 'Opera Software', 'Opera GX Stable')
            ]
        },
        { name: 'Brave', paths: [path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data')] }
    ];

    for (const browser of browsers) {
        for (const basePath of browser.paths) {
            const historyFiles = [];

            if (browser.name !== 'Opera') {
                try {
                    const entries = await fs.promises.readdir(basePath, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory() && (entry.name === 'Default' || entry.name.startsWith('Profile '))) {
                            const historyFile = path.join(basePath, entry.name, 'History');
                            if (fs.existsSync(historyFile)) historyFiles.push(historyFile);
                        }
                    }
                } catch (e) {
                }
            } else {
                const historyFile = path.join(basePath, 'History');
                if (fs.existsSync(historyFile)) historyFiles.push(historyFile);
            }

            for (const historyFile of historyFiles) {
                try {
                    const tempFile = path.join(app.getPath('temp'), `felox_hist_${Date.now()}_${Math.random().toString(16).slice(2)}.tmp`);
                    await fs.promises.copyFile(historyFile, tempFile);
                    const contentBuffer = await fs.promises.readFile(tempFile);
                    const lowerContent = contentBuffer.toString('latin1').toLowerCase();

                    const foundKeywords = [];
                    for (const keyword of BROWSER_CHEAT_KEYWORDS) {
                        if (lowerContent.includes(keyword.toLowerCase())) {
                            foundKeywords.push(keyword);
                        }
                    }

                    if (foundKeywords.length > 0) {
                        const uniqueKeywords = Array.from(new Set(foundKeywords));
                        const profileName = path.basename(path.dirname(historyFile)) || 'Default';
                        const browserLabel = browser.name === 'Opera' ? browser.name : `${browser.name} (${profileName})`;
                        findings.push(createThreat('BROWSER', browserLabel, uniqueKeywords.join(' | ')));
                    }

                    try {
                        await fs.promises.unlink(tempFile);
                    } catch (e) {
                    }
                } catch (e) {
                }
            }
        }
    }

    return dedupeFindings(findings);
}

async function scanUsbActivity() {
    const findings = [];

    function pushUsbInfo(source, details) {
        if (findings.length >= MAX_USB_EVENTS) return;
        findings.push(createInfo('USB ACTIVITY', source, details));
    }

    const setupApiPath = path.join(process.env.WINDIR || 'C:\\Windows', 'INF', 'setupapi.dev.log');
    if (fs.existsSync(setupApiPath)) {
        try {
            const fd = await fs.promises.open(setupApiPath, 'r');
            const stat = await fd.stat();
            const readSize = Math.min(stat.size, 4 * 1024 * 1024);
            const start = Math.max(0, stat.size - readSize);
            const buffer = Buffer.alloc(readSize);
            await fd.read(buffer, 0, readSize, start);
            await fd.close();

            const lines = buffer.toString('utf8').split(/\r?\n/);
            let currentHeader = '';
            for (const rawLine of lines) {
                if (findings.length >= MAX_USB_EVENTS) break;
                const line = String(rawLine || '').trim();
                if (!line) continue;

                if (line.startsWith('>>>') && line.includes('[')) {
                    currentHeader = line.replace(/^>+\s*/, '').slice(0, 120);
                }

                if (/USBSTOR|USB\\VID_|VID_[0-9A-F]{4}&PID_[0-9A-F]{4}/i.test(line)) {
                    const detail = `${currentHeader ? currentHeader + ' | ' : ''}${line}`.slice(0, 220);
                    pushUsbInfo('SetupAPI', detail);
                }
            }
        } catch (e) {
        }
    }

    try {
        const regResult = await execFileAsync(
            'reg',
            ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\MountPoints2'],
            { windowsHide: true, maxBuffer: 2 * 1024 * 1024 }
        );

        const rows = String(regResult.stdout || '').split(/\r?\n/);
        for (const row of rows) {
            if (findings.length >= MAX_USB_EVENTS) break;
            const trimmed = row.trim();
            if (!trimmed || !trimmed.startsWith('HKEY_')) continue;
            const idx = trimmed.indexOf('MountPoints2\\');
            if (idx === -1) continue;
            const mountPath = trimmed.substring(idx + 'MountPoints2\\'.length).trim();
            if (!mountPath) continue;
            pushUsbInfo('MountPoints2', `Mounted target: ${mountPath}`);
        }
    } catch (e) {
    }

    try {
        const psScript = [
            "$events = Get-WinEvent -LogName 'Microsoft-Windows-DriverFrameworks-UserMode/Operational' -MaxEvents 200 -ErrorAction SilentlyContinue |",
            "Where-Object { $_.Message -match 'USB|VID_' } |",
            "Select-Object -First 20 TimeCreated,Id,Message;",
            "if ($events) { $events | ConvertTo-Json -Compress -Depth 4 }"
        ].join(' ');

        const psResult = await execFileAsync(
            'powershell',
            ['-NoProfile', '-Command', psScript],
            { windowsHide: true, maxBuffer: 4 * 1024 * 1024 }
        );

        const raw = String(psResult.stdout || '').trim();
        if (raw) {
            let parsed = [];
            try {
                parsed = JSON.parse(raw);
            } catch (e) {
                parsed = [];
            }
            if (!Array.isArray(parsed)) parsed = [parsed];

            for (const evt of parsed) {
                if (findings.length >= MAX_USB_EVENTS) break;
                if (!evt) continue;
                const id = evt.Id != null ? String(evt.Id) : 'Unknown';
                const when = formatTimestamp(evt.TimeCreated);
                const msg = String(evt.Message || '').replace(/\s+/g, ' ').trim().slice(0, 140);
                pushUsbInfo('EventLog', `Event ${id} | ${when} | ${msg}`);
            }
        }
    } catch (e) {
    }

    return {
        items: dedupeFindings(findings),
        threatsFound: 0
    };
}

async function scanRecentExecutionArtifacts() {
    const findings = [];
    let threatsFound = 0;

    function pushRecentInfo(label, details) {
        if (findings.length >= MAX_RECENT_ITEMS) return;
        findings.push(createInfo('RECENT EXECUTION', label, details));
    }

    const prefetchDir = path.join(process.env.WINDIR || 'C:\\Windows', 'Prefetch');
    if (fs.existsSync(prefetchDir)) {
        try {
            const entries = await fs.promises.readdir(prefetchDir, { withFileTypes: true });
            const pfFiles = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pf'));

            const meta = [];
            for (const entry of pfFiles) {
                const fullPath = path.join(prefetchDir, entry.name);
                const stat = await fs.promises.stat(fullPath).catch(() => null);
                if (!stat) continue;
                meta.push({
                    name: entry.name,
                    fullPath,
                    mtimeMs: stat.mtimeMs
                });
            }

            meta.sort((a, b) => b.mtimeMs - a.mtimeMs);

            for (const file of meta.slice(0, 40)) {
                const exeName = file.name.replace(/-[A-F0-9]{8}\.pf$/i, '.exe');
                const runHint = formatTimestamp(file.mtimeMs);
                pushRecentInfo(exeName, `Last run hint: ${runHint} | Source: Prefetch`);

                const keyword = findCheatKeyword(`${file.name} ${exeName}`);
                if (keyword) {
                    threatsFound++;
                    findings.push(createThreat('PREFETCH', file.fullPath, `Suspicious prefetch keyword: ${keyword} | Last run hint: ${runHint}`));
                }
            }
        } catch (e) {
        }
    }

    const recentLinksDir = path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Recent');
    if (fs.existsSync(recentLinksDir)) {
        try {
            const entries = await fs.promises.readdir(recentLinksDir, { withFileTypes: true });
            const links = [];

            for (const entry of entries) {
                if (!entry.isFile()) continue;
                if (!entry.name.toLowerCase().endsWith('.lnk')) continue;
                const fullPath = path.join(recentLinksDir, entry.name);
                const stat = await fs.promises.stat(fullPath).catch(() => null);
                if (!stat) continue;
                links.push({
                    name: entry.name,
                    mtimeMs: stat.mtimeMs
                });
            }

            links.sort((a, b) => b.mtimeMs - a.mtimeMs);
            for (const link of links.slice(0, 20)) {
                pushRecentInfo(link.name, `Recent link updated: ${formatTimestamp(link.mtimeMs)} | Source: Recent Links`);
            }
        } catch (e) {
        }
    }

    return {
        items: dedupeFindings(findings),
        threatsFound
    };
}

function shouldSkipTempDir(name) {
    const lower = normalizeText(name);
    return [
        'gpucache',
        'code cache',
        'shadercache',
        'd3dscache',
        'npm-cache',
        'pip',
        'cache'
    ].includes(lower);
}

async function scanTempArtifacts() {
    const findings = [];
    let threatsFound = 0;
    let scannedFiles = 0;

    const roots = Array.from(new Set([
        os.tmpdir(),
        process.env.TEMP || '',
        process.env.TMP || '',
        path.join(process.env.LOCALAPPDATA || '', 'Temp'),
        'C:\\Windows\\Temp'
    ].filter((dir) => dir && fs.existsSync(dir))));

    const allowedExt = new Set([
        '.exe', '.dll', '.asi', '.lua', '.txt', '.log', '.json',
        '.zip', '.rar', '.7z', '.tmp', '.dat', '.bin', '.cfg'
    ]);

    for (const rootDir of roots) {
        const stack = [{ dir: rootDir, depth: 0 }];

        while (stack.length > 0 && scannedFiles < MAX_TEMP_FILES && threatsFound < MAX_TEMP_THREATS) {
            const current = stack.pop();
            if (!current) continue;

            let entries = [];
            try {
                entries = await fs.promises.readdir(current.dir, { withFileTypes: true });
            } catch (e) {
                continue;
            }

            for (const entry of entries) {
                if (scannedFiles >= MAX_TEMP_FILES || threatsFound >= MAX_TEMP_THREATS) break;
                const fullPath = path.join(current.dir, entry.name);

                if (entry.isDirectory()) {
                    if (current.depth >= 2) continue;
                    if (shouldSkipTempDir(entry.name)) continue;
                    stack.push({ dir: fullPath, depth: current.depth + 1 });
                    continue;
                }

                if (!entry.isFile()) continue;

                scannedFiles++;
                if (scannedFiles % 250 === 0) await sleep(0);

                const lowerName = normalizeText(entry.name);
                const ext = path.extname(lowerName);
                if (!allowedExt.has(ext)) continue;

                const keyword = findCheatKeyword(`${lowerName} ${normalizeText(fullPath)}`);
                if (!keyword) continue;

                const stat = await fs.promises.stat(fullPath).catch(() => null);
                const modified = stat ? formatTimestamp(stat.mtimeMs) : 'Unknown time';

                findings.push(createThreat('TEMP ARTIFACT', fullPath, `Matched keyword: ${keyword} | Modified: ${modified}`));
                threatsFound++;
            }
        }
    }

    findings.unshift(createInfo('TEMP SUMMARY', 'Temp Scan', `Scanned files: ${scannedFiles} | Suspicious artifacts: ${threatsFound}`));

    return {
        items: dedupeFindings(findings),
        threatsFound
    };
}

ipcMain.on('start-scan', async (event, scanKey) => {
    const allFindings = [];
    let totalThreats = 0;
    const startTime = Date.now();

    const sendProgress = (percent, text) => {
        event.reply('scan-progress', { percent, text });
    };

    function mergeResult(result) {
        if (!result) return;
        if (Array.isArray(result.items)) {
            allFindings.push(...result.items);
        }
        if (Number.isFinite(result.threatsFound)) {
            totalThreats += result.threatsFound;
        }
    }

    try {
        sendProgress(5, 'Scanning user profiles...');
        const userRes = await scanDirectory('C:\\Users', ['.exe', '.dll', '.lua', '.rpf', '.asi']);
        mergeResult({ items: userRes.threatList, threatsFound: userRes.threats });

        sendProgress(20, 'Scanning C:\\ drive...');
        const rootRes = await scanDirectory('C:\\', ['.exe', '.dll', '.lua', '.rpf', '.asi']);
        mergeResult({ items: rootRes.threatList, threatsFound: rootRes.threats });

        sendProgress(38, 'Scanning ProgramData...');
        const pdRes = await scanDirectory(process.env.PROGRAMDATA || 'C:\\ProgramData', ['.exe', '.dll', '.lua', '.rpf', '.asi']);
        mergeResult({ items: pdRes.threatList, threatsFound: pdRes.threats });

        sendProgress(54, 'Checking FiveM mods...');
        const fiveMPath = path.join(process.env.LOCALAPPDATA || '', 'FiveM', 'FiveM.app');
        if (fs.existsSync(fiveMPath)) {
            const pluginsDir = path.join(fiveMPath, 'plugins');
            if (fs.existsSync(pluginsDir)) {
                const plugins = fs.readdirSync(pluginsDir).filter((f) => f.endsWith('.asi') || f.endsWith('.dll'));
                for (const pluginFile of plugins) {
                    const pluginPath = path.join(pluginsDir, pluginFile);
                    if (isDefiniteCheat(pluginFile)) {
                        totalThreats++;
                        allFindings.push(createThreat('CHEAT', pluginPath, 'FiveM plugin cheat'));
                        continue;
                    }
                    const pluginKeyword = findCheatKeyword(`${pluginFile} ${pluginPath}`);
                    if (pluginKeyword) {
                        totalThreats++;
                        allFindings.push(createThreat('EXECUTABLE ARTIFACT', pluginPath, `Suspicious plugin keyword: ${pluginKeyword}`));
                    }
                }
            }
        }

        sendProgress(68, 'Scanning browser history...');
        const browserThreats = await scanBrowserHistory();
        if (browserThreats.length > 0) {
            totalThreats += browserThreats.length;
            allFindings.push(...browserThreats);
        }

        sendProgress(78, 'Collecting USB activity...');
        mergeResult(await scanUsbActivity());

        sendProgress(86, 'Collecting recent execution traces...');
        mergeResult(await scanRecentExecutionArtifacts());

        sendProgress(93, 'Scanning prefetch/temp artifacts...');
        mergeResult(await scanTempArtifacts());
    } catch (e) {
        allFindings.push(createInfo('SCAN ERROR', 'Scanner', `Scan stage failed: ${String(e && e.message ? e.message : e).slice(0, 200)}`));
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const dedupedFindings = dedupeFindings(allFindings);

    sendProgress(97, 'Uploading results...');

    try {
        await apiPost('/scanner_upload_result.php', {
            pin: scanKey,
            threats_count: totalThreats,
            duration: duration + 's',
            scan_data: dedupedFindings
        });
    } catch (e) {
    }

    sendProgress(100, 'Complete');
    event.reply('scan-complete', { threats: totalThreats });
});