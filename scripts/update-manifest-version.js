#!/usr/bin/env node
/**
 * update-manifest-version.js
 *
 * Features:
 *  - --bump : increments patch version of package.json and syncs to listed manifest.json files
 *  - --set x.y.z : set an explicit version
 *  - --watch : watch source files (js, css, html) and bump patch automatically on change
 *  - --manifests <file1,file2,...> : comma separated list of manifest.json files to sync
 *  - Keeps a backup of each manifest as manifest.json.bak (only first time per run)
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const args = process.argv.slice(2);

function parseArgs() {
    const opts = { manifests: [], bump: false, watch: false, set: null };
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--bump') opts.bump = true;
        else if (a === '--watch') opts.watch = true;
        else if (a === '--set') opts.set = args[++i];
        else if (a === '--manifests') opts.manifests = args[++i].split(',').map(s => s.trim()).filter(Boolean);
    }
    return opts;
}

function readJSON(p) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJSON(p, obj) {
    fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function bumpPatch(v) {
    const parts = v.split('.').map(Number);
    while (parts.length < 3) parts.push(0);
    parts[2] += 1;
    return parts.join('.');
}

function syncVersion(version, manifests) {
    manifests.forEach(mPath => {
        if (!fs.existsSync(mPath)) {
            console.error(`[skip] Manifest not found: ${mPath}`);
            return;
        }
        try {
            const data = readJSON(mPath);
            if (!data.version || data.version !== version) {
                // backup once per run
                const backupPath = mPath + '.bak';
                if (!fs.existsSync(backupPath)) {
                    fs.copyFileSync(mPath, backupPath);
                }
                data.version = version;
                writeJSON(mPath, data);
                console.log(`[updated] ${mPath} -> ${version}`);
            } else {
                console.log(`[unchanged] ${mPath} already at ${version}`);
            }
        } catch (e) {
            console.error(`[error] Failed updating ${mPath}:`, e.message);
        }
    });
}

function main() {
    const opts = parseArgs();
    if (opts.manifests.length === 0) {
        console.error('No manifests provided. Use --manifests path1,path2');
        process.exit(1);
    }

    const pkgPath = path.resolve(__dirname, '..', 'package.json');
    const pkg = readJSON(pkgPath);
    let version = pkg.version || '0.0.1';

    if (opts.set) {
        version = opts.set;
    } else if (opts.bump) {
        version = bumpPatch(version);
    }

    // If version changed vs pkg, persist
    if (version !== pkg.version) {
        pkg.version = version;
        writeJSON(pkgPath, pkg);
        console.log(`[package.json] version set to ${version}`);
    }

    const absManifests = opts.manifests.map(m => path.resolve(__dirname, '..', m));
    syncVersion(version, absManifests);

    if (opts.watch) {
        console.log('Watching for file changes to auto-bump patch version...');
        const watchPaths = [path.resolve(__dirname, '..')];
        let ready = false;
        let bumpInProgress = false;

        const watcher = chokidar.watch(watchPaths, {
            ignored: /(^|[/\\])\../, // ignore dotfiles
            persistent: true,
            ignoreInitial: true,
            depth: 6,
        });

        function triggerBump(event, file) {
            if (bumpInProgress) return;
            bumpInProgress = true;
            try {
                const currentPkg = readJSON(pkgPath);
                const newVersion = bumpPatch(currentPkg.version || '0.0.1');
                currentPkg.version = newVersion;
                writeJSON(pkgPath, currentPkg);
                console.log(`[${event}] ${file} -> bumped to ${newVersion}`);
                syncVersion(newVersion, absManifests);
            } catch (e) {
                console.error('Auto-bump failed:', e.message);
            } finally {
                setTimeout(() => { bumpInProgress = false; }, 500);
            }
        }

        watcher
            .on('ready', () => { ready = true; console.log('Initial scan complete.'); })
            .on('add', file => triggerBump('add', file))
            .on('change', file => triggerBump('change', file))
            .on('unlink', file => triggerBump('unlink', file));
    }
}

main();
