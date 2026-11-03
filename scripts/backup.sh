#!/usr/bin/env bash
# Copia os dados da Intranet e a auditoria da Central. Os arquivos gerados contêm
# dados pessoais e segredos: mantenha-os fora dos repositórios e com acesso restrito.
set -euo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INTRANET_DIR="${INTRANET_DIR:-/home/intranet/Intranet-IDAM/frontend}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/central-e-intranet}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$BACKUP_DIR" "$WORK/intranet" "$WORK/central/d1"

cp -a "$INTRANET_DIR/data" "$WORK/intranet/data"
if [ -d "$INTRANET_DIR/public/uploads" ]; then
  cp -a "$INTRANET_DIR/public/uploads" "$WORK/intranet/uploads"
fi
if [ -f "$INTRANET_DIR/.env.local" ]; then
  cp -p "$INTRANET_DIR/.env.local" "$WORK/intranet/env.local"
fi
cp -p "$ROOT/.env.local" "$WORK/central/env.local"

# VACUUM INTO gera uma cópia consistente mesmo com a Central em execução.
find "$ROOT/.wrangler/state/v3/d1" -type f -name '*.sqlite' -print0 |
  while IFS= read -r -d '' database; do
    node --no-warnings -e '
      const { DatabaseSync } = require("node:sqlite");
      const [source, target] = process.argv.slice(1);
      new DatabaseSync(source, { readOnly: true }).exec(`VACUUM INTO '\''${target.replaceAll("'\''", "'\'''\''")}'\''`);
      const check = new DatabaseSync(target, { readOnly: true }).prepare("PRAGMA integrity_check").get();
      if (Object.values(check)[0] !== "ok") throw new Error(`Cópia inválida: ${source}`);
    ' "$database" "$WORK/central/d1/$(basename "$database")"
  done

ARCHIVE="$BACKUP_DIR/backup-$STAMP.tar.gz"
tar -czf "$ARCHIVE.tmp" -C "$WORK" intranet central
gzip -t "$ARCHIVE.tmp"
mv "$ARCHIVE.tmp" "$ARCHIVE"

find "$BACKUP_DIR" -maxdepth 1 -name 'backup-*.tar.gz' -mtime "+$RETENTION_DAYS" -delete
echo "$(date '+%F %T') backup criado: $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"
