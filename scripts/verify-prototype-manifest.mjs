#!/usr/bin/env node
/**
 * Verifica docs/prototype-manifest.yaml contra los archivos reales en disco,
 * y (cuando corre en un PR) contra el manifiesto de la rama base.
 *
 * Falla (exit 1) si:
 *   - falta el archivo de screenshot referenciado por una entrada
 *   - el sha256 o los bytes declarados no coinciden con el archivo real
 *   - hay proto_id duplicados
 *
 * Nunca falla solo por diferencias en status/approved_at/approved_by_role/
 * proto_id respecto a la rama base - esas se listan aparte en el resumen
 * como "requieren aprobacion explicita", porque bloquearlas es
 * responsabilidad de la revision obligatoria (CODEOWNERS), no de este script.
 *
 * Uso:
 *   node scripts/verify-prototype-manifest.mjs [--base <ref>] [--repo-root <path>]
 *
 * Con --base, compara ademas contra `git show <ref>:docs/prototype-manifest.yaml`
 * para clasificar entradas como agregadas / eliminadas / modificadas.
 */
import { createHash } from 'node:crypto';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';

function parseArgs(argv) {
  const args = { repoRoot: '.', base: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i] === '--repo-root') args.repoRoot = argv[++i];
  }
  return args;
}

function sha256AndBytes(filePath) {
  const buf = readFileSync(filePath);
  const hash = createHash('sha256').update(buf).digest('hex');
  return { sha256: hash, bytes: statSync(filePath).size };
}

function loadManifest(repoRoot) {
  const manifestPath = path.join(repoRoot, 'docs', 'prototype-manifest.yaml');
  const raw = readFileSync(manifestPath, 'utf-8');
  return loadYaml(raw);
}

function loadManifestAtRef(repoRoot, ref) {
  try {
    const raw = execFileSync('git', ['show', `${ref}:docs/prototype-manifest.yaml`], {
      cwd: repoRoot,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 20,
    });
    return loadYaml(raw);
  } catch (err) {
    console.error(`No se pudo leer el manifiesto en ${ref}: ${err.message}`);
    return null;
  }
}

function indexByProtoId(manifest) {
  const map = new Map();
  for (const s of manifest?.screens ?? []) {
    map.set(s.proto_id, s);
  }
  return map;
}

const PROTECTED_FIELDS = ['status', 'approved_at', 'approved_by_role', 'proto_id'];

function main() {
  const { repoRoot, base } = parseArgs(process.argv.slice(2));
  const manifest = loadManifest(repoRoot);
  const screens = manifest?.screens ?? [];

  const protoIdCounts = new Map();
  for (const s of screens) {
    protoIdCounts.set(s.proto_id, (protoIdCounts.get(s.proto_id) ?? 0) + 1);
  }
  const duplicates = [...protoIdCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id);

  const missing = [];
  const mismatched = [];
  const validated = [];

  for (const s of screens) {
    const rel = s.files?.screenshot;
    if (!rel) continue;
    const fpath = path.join(repoRoot, rel);
    if (!existsSync(fpath)) {
      missing.push({ proto_id: s.proto_id, file: rel });
      continue;
    }
    const real = sha256AndBytes(fpath);
    if (real.sha256 !== s.sha256 || real.bytes !== s.bytes) {
      mismatched.push({
        proto_id: s.proto_id,
        file: rel,
        declared: { sha256: s.sha256, bytes: s.bytes },
        real,
      });
    } else {
      validated.push(s.proto_id);
    }
  }

  let added = [];
  let removed = [];
  let modifiedProtected = [];

  if (base) {
    const baseManifest = loadManifestAtRef(repoRoot, base);
    if (baseManifest) {
      const baseIndex = indexByProtoId(baseManifest);
      const headIndex = indexByProtoId(manifest);

      for (const [id, entry] of headIndex) {
        if (!baseIndex.has(id)) added.push(id);
      }
      for (const [id] of baseIndex) {
        if (!headIndex.has(id)) removed.push(id);
      }
      for (const [id, headEntry] of headIndex) {
        const baseEntry = baseIndex.get(id);
        if (!baseEntry) continue;
        const changedFields = PROTECTED_FIELDS.filter(
          (f) => JSON.stringify(baseEntry[f]) !== JSON.stringify(headEntry[f]),
        );
        if (changedFields.length > 0) {
          modifiedProtected.push({ proto_id: id, changedFields });
        }
      }
    }
  }

  const summaryLines = [];
  summaryLines.push('# Verificacion de docs/prototype-manifest.yaml');
  summaryLines.push('');
  summaryLines.push(`- Entradas totales: ${screens.length}`);
  summaryLines.push(`- Validadas (sha256+bytes coinciden con el archivo real): ${validated.length}`);
  summaryLines.push(`- Archivos faltantes: ${missing.length}`);
  summaryLines.push(`- sha256/bytes que NO coinciden: ${mismatched.length}`);
  summaryLines.push(`- proto_id duplicados: ${duplicates.length}`);
  if (base) {
    summaryLines.push(`- Agregadas respecto a \`${base}\`: ${added.length}`);
    summaryLines.push(`- Eliminadas respecto a \`${base}\`: ${removed.length}`);
    summaryLines.push(
      `- Con cambios en campos protegidos (status/approved_at/approved_by_role/proto_id) - **requieren aprobacion explicita de un CODEOWNER**: ${modifiedProtected.length}`,
    );
  }
  summaryLines.push('');

  if (duplicates.length) {
    summaryLines.push('## proto_id duplicados');
    for (const id of duplicates) summaryLines.push(`- \`${id}\``);
    summaryLines.push('');
  }

  if (missing.length) {
    summaryLines.push('## Archivos faltantes');
    for (const m of missing) summaryLines.push(`- \`${m.proto_id}\`: ${m.file}`);
    summaryLines.push('');
  }

  if (mismatched.length) {
    summaryLines.push('## sha256/bytes que no coinciden con el archivo real');
    for (const m of mismatched) {
      summaryLines.push(
        `- \`${m.proto_id}\` (${m.file}): declarado sha256=${m.declared.sha256?.slice(0, 12)}... bytes=${m.declared.bytes} | real sha256=${m.real.sha256.slice(0, 12)}... bytes=${m.real.bytes}`,
      );
    }
    summaryLines.push('');
  }

  if (base && modifiedProtected.length) {
    summaryLines.push('## Cambios en campos protegidos (requieren aprobacion explicita)');
    for (const m of modifiedProtected) {
      summaryLines.push(`- \`${m.proto_id}\`: ${m.changedFields.join(', ')}`);
    }
    summaryLines.push('');
  }

  if (base && added.length) {
    summaryLines.push('## Entradas agregadas');
    for (const id of added) summaryLines.push(`- \`${id}\``);
    summaryLines.push('');
  }

  if (base && removed.length) {
    summaryLines.push('## Entradas eliminadas');
    for (const id of removed) summaryLines.push(`- \`${id}\``);
    summaryLines.push('');
  }

  const summary = summaryLines.join('\n');
  console.log(summary);

  if (process.env.GITHUB_STEP_SUMMARY) {
    execFileSync('sh', ['-c', `cat >> "$GITHUB_STEP_SUMMARY"`], { input: summary });
  }

  const hasBlockingIssues = missing.length > 0 || mismatched.length > 0 || duplicates.length > 0;
  if (hasBlockingIssues) {
    console.error('\nFALLO: hay archivos faltantes, sha256/bytes desalineados o proto_id duplicados.');
    process.exit(1);
  }

  console.log('\nOK: todas las entradas del manifiesto coinciden con los archivos reales.');
  process.exit(0);
}

main();
