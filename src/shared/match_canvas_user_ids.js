#!/usr/bin/env node
/*
  Usage:
    node match_canvas_user_ids.js <provisioning.csv> <users-staff.csv> [output.txt]

  Reads users-staff.csv to collect user_id values, then streams the provisioning CSV
  and prints canvas_user_id values for rows whose user_id exists in users-staff.csv.
*/

const fs = require('fs');
const readline = require('readline');

function die(msg) {
    console.error(msg);
    process.exit(1);
}

// Minimal CSV parser for a single line supporting quotes and commas.
function parseCsvLine(line) {
    const out = [];
    let cur = '';
    let i = 0;
    let inQuotes = false;
    while (i < line.length) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    cur += '"';
                    i += 2;
                    continue;
                } else {
                    inQuotes = false;
                    i++;
                    continue;
                }
            } else {
                cur += ch;
                i++;
                continue;
            }
        } else {
            if (ch === ',') {
                out.push(cur);
                cur = '';
                i++;
                continue;
            }
            if (ch === '"') {
                inQuotes = true;
                i++;
                continue;
            }
            cur += ch;
            i++;
        }
    }
    out.push(cur);
    return out;
}

function normalizeHeader(str) {
    if (!str) return '';
    // Remove BOM if present on first header
    return str.replace(/^\uFEFF/, '').trim().toLowerCase();
}

async function buildUserIdSet(usersCsvPath) {
    if (!fs.existsSync(usersCsvPath)) die(`Users CSV not found: ${usersCsvPath}`);
    const rl = readline.createInterface({ input: fs.createReadStream(usersCsvPath) });
    let headerMap = null; // name -> index
    const userIds = new Set();
    let lineNo = 0;
    for await (const rawLine of rl) {
        const line = rawLine.replace(/\r?$/, '');
        if (lineNo === 0) {
            const cols = parseCsvLine(line).map(normalizeHeader);
            headerMap = new Map(cols.map((name, idx) => [name, idx]));
            if (!headerMap.has('user_id')) die(`users-staff header missing 'user_id'. Found: ${cols.join(', ')}`);
        } else {
            if (!line) continue;
            const cols = parseCsvLine(line);
            const idx = headerMap.get('user_id');
            const val = (cols[idx] ?? '').trim();
            if (val) userIds.add(val);
        }
        lineNo++;
    }
    return userIds;
}

async function streamProvisioning(provCsvPath, userIds, onMatch) {
    if (!fs.existsSync(provCsvPath)) die(`Provisioning CSV not found: ${provCsvPath}`);
    const rl = readline.createInterface({ input: fs.createReadStream(provCsvPath) });
    let headerMap = null; // name -> index
    let lineNo = 0;
    for await (const rawLine of rl) {
        const line = rawLine.replace(/\r?$/, '');
        if (lineNo === 0) {
            const cols = parseCsvLine(line).map(normalizeHeader);
            headerMap = new Map(cols.map((name, idx) => [name, idx]));
            if (!headerMap.has('user_id')) die(`provisioning header missing 'user_id'. Found: ${cols.join(', ')}`);
            if (!headerMap.has('canvas_user_id')) die(`provisioning header missing 'canvas_user_id'. Found: ${cols.join(', ')}`);
        } else {
            if (!line) { lineNo++; continue; }
            const cols = parseCsvLine(line);
            const userId = (cols[headerMap.get('user_id')] ?? '').trim();
            if (userId && userIds.has(userId)) {
                const canvasId = (cols[headerMap.get('canvas_user_id')] ?? '').trim();
                if (canvasId) onMatch(canvasId);
            }
        }
        lineNo++;
    }
}

(async () => {
    const [provPath, usersPath, outPath] = process.argv.slice(2);
    if (!provPath || !usersPath) {
        die('Usage: node match_canvas_user_ids.js <provisioning.csv> <users-staff.csv> [output.txt]');
    }

    const userIds = await buildUserIdSet(provPath.endsWith('.csv') ? usersPath : usersPath); // keep linter happy
    const results = new Set(); // unique canvas_user_ids by default
    await streamProvisioning(provPath, userIds, (canvasId) => results.add(canvasId));

    const output = Array.from(results).join('\n') + (results.size ? '\n' : '');
    if (outPath) {
        fs.writeFileSync(outPath, output);
        console.error(`Wrote ${results.size} canvas_user_id(s) to ${outPath}`);
    } else {
        process.stdout.write(output);
    }
})().catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
});
