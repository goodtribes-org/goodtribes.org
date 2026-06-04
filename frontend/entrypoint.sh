#!/bin/sh
set -e
npx prisma migrate resolve --applied "20260601000000_baseline" 2>/dev/null || true
npx prisma migrate deploy
exec node server.js
