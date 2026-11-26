import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Instansiasi PrismaClient menyesuaikan lingkungan:
 *
 * - TURSO_DATABASE_URL terpasang  → koneksi remote libSQL (Turso) melalui
 *   driver adapter. Dipakai di produksi (Vercel) dan saat development ingin
 *   mengarah ke database cloud yang sama. Catatan: `PrismaLibSQL` pada
 *   adapter v6 adalah factory — menerima config libSQL ({url, authToken})
 *   dan membuat client-nya sendiri; JANGAN lewatkan `datasourceUrl` karena
 *   konfigurasi datasource kustom tidak kompatibel dengan driver adapter.
 * - Tanpa TURSO_DATABASE_URL      → SQLite lokal (file DATABASE_URL), untuk
 *   development offline / self-host.
 *
 * Catatan teknis: event log 'query' tidak didukung ketika memakai driver
 * adapter, sehingga jalur Turso hanya melog 'error'.
 */
function instantiatePrisma(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL

  if (tursoUrl) {
    return new PrismaClient({
      adapter: new PrismaLibSQL({
        url: tursoUrl,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }),
      log: ['error'],
    })
  }

  return new PrismaClient({
    // Log query hanya di development agar konsol produksi tidak banjir log
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? instantiatePrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
