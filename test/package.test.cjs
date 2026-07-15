const { execFileSync } = require('node:child_process');
const { mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const test = require('node:test');

const root = resolve(__dirname, '..');
const temp = mkdtempSync(join(root, '.package-test-'));
const consumer = join(temp, 'consumer');
const packageDirectory = join(consumer, 'node_modules', 'koa-x-router');

const run = (command, args, options = {}) =>
    execFileSync(command, args, {
        cwd: consumer,
        encoding: 'utf8',
        env: { ...process.env, npm_config_cache: join(temp, 'npm-cache') },
        stdio: 'pipe',
        ...options,
    });

test.before(() => {
    const packResult = JSON.parse(
        execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temp], {
            cwd: root,
            encoding: 'utf8',
            env: { ...process.env, npm_config_cache: join(temp, 'npm-cache'), npm_config_dry_run: 'false' },
        }),
    );
    const tarball = join(temp, packResult[0].filename);

    mkdirSync(join(consumer, 'node_modules'), { recursive: true });
    execFileSync('tar', ['-xzf', tarball, '-C', join(consumer, 'node_modules')]);
    renameSync(join(consumer, 'node_modules', 'package'), packageDirectory);
    writeFileSync(join(consumer, 'package.json'), '{ "private": true, "type": "module" }\n');
});

test.after(() => rmSync(temp, { force: true, recursive: true }));

test('loads every public entry from ESM and CommonJS with shared identities', () => {
    run('node', [
        '--input-type=module',
        '--eval',
        `
            import assert from 'node:assert/strict';
            import { createRequire } from 'node:module';
            import { Router } from 'koa-x-router';
            import { JoiAdaptor } from 'koa-x-router/joi';
            import { ZodAdaptor } from 'koa-x-router/zod';
            const require = createRequire(import.meta.url);
            assert.equal(Router, require('koa-x-router').Router);
            assert.equal(JoiAdaptor, require('koa-x-router/joi').JoiAdaptor);
            assert.equal(ZodAdaptor, require('koa-x-router/zod').ZodAdaptor);
        `,
    ]);
});

test('does not load optional validation peers from the root entry', () => {
    run('node', [
        '--eval',
        `
            const Module = require('node:module');
            const load = Module._load;
            Module._load = function (request, ...args) {
                if (['joi', 'zod', 'joi-to-swagger', '@asteasolutions/zod-to-openapi'].includes(request)) {
                    throw new Error('root entry loaded optional adapter dependency: ' + request);
                }
                return load.call(this, request, ...args);
            };
            require('koa-x-router');
        `,
    ]);
});

test('provides types for Node10 CommonJS, NodeNext CommonJS, NodeNext ESM, and bundlers', () => {
    writeFileSync(
        join(consumer, 'consumer.ts'),
        `import { Router } from 'koa-x-router';\nimport { JoiAdaptor } from 'koa-x-router/joi';\nimport { ZodAdaptor } from 'koa-x-router/zod';\nvoid [Router, JoiAdaptor, ZodAdaptor];\n`,
    );
    writeFileSync(
        join(consumer, 'consumer.mts'),
        `import { Router } from 'koa-x-router';\nimport { JoiAdaptor } from 'koa-x-router/joi';\nimport { ZodAdaptor } from 'koa-x-router/zod';\nvoid [Router, JoiAdaptor, ZodAdaptor];\n`,
    );
    writeFileSync(
        join(consumer, 'consumer.cts'),
        `import { Router } from 'koa-x-router';\nimport { JoiAdaptor } from 'koa-x-router/joi';\nimport { ZodAdaptor } from 'koa-x-router/zod';\nvoid [Router, JoiAdaptor, ZodAdaptor];\n`,
    );
    writeFileSync(
        join(consumer, 'tsconfig.node10.json'),
        JSON.stringify({
            compilerOptions: {
                module: 'CommonJS',
                moduleResolution: 'Node10',
                esModuleInterop: true,
                noEmit: true,
                strict: true,
            },
            files: ['./consumer.ts'],
        }),
    );
    writeFileSync(
        join(consumer, 'tsconfig.nodenext.json'),
        JSON.stringify({
            compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext', noEmit: true, strict: true },
            files: ['./consumer.mts', './consumer.cts'],
        }),
    );
    writeFileSync(
        join(consumer, 'tsconfig.bundler.json'),
        JSON.stringify({
            compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler', noEmit: true, strict: true },
            files: ['./consumer.mts'],
        }),
    );

    const tsc = join(root, 'node_modules', '.bin', 'tsc');
    run(tsc, ['-p', 'tsconfig.node10.json']);
    run(tsc, ['-p', 'tsconfig.nodenext.json']);
    run(tsc, ['-p', 'tsconfig.bundler.json']);
});

test('bundles and executes all entries with Vite SSR', () => {
    writeFileSync(
        join(consumer, 'vite-entry.mjs'),
        `import assert from 'node:assert/strict';\nimport { Router } from 'koa-x-router';\nimport { JoiAdaptor } from 'koa-x-router/joi';\nimport { ZodAdaptor } from 'koa-x-router/zod';\nassert.equal(typeof Router, 'function');\nassert.equal(JoiAdaptor.name, 'joi');\nassert.equal(ZodAdaptor.name, 'zod');\n`,
    );
    writeFileSync(
        join(consumer, 'vite.config.mjs'),
        `export default { logLevel: 'silent', build: { ssr: './vite-entry.mjs', outDir: './vite-dist' }, ssr: { noExternal: true } };\n`,
    );

    const vite = join(root, 'node_modules', '.bin', 'vite');
    run(vite, ['build', '--config', 'vite.config.mjs']);
    const outputDirectory = join(consumer, 'vite-dist');
    const output = join(
        outputDirectory,
        readdirSync(outputDirectory).find((file) => /vite-entry\.[cm]?js$/.test(file)),
    );
    run('node', [output]);
});
