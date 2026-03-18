import 'dotenv/config'
import bcrypt from 'bcryptjs'
import postgres from 'postgres'

const [username, password] = process.argv.slice(2)
if (!username || !password) {
  console.error('Usage: pnpm create-user <username> <password>')
  process.exit(1)
}
if (password.length < 8) {
  console.error('Error: password must be at least 8 characters')
  process.exit(1)
}

const sql = postgres(process.env.DATABASE_URL)
const passwordHash = await bcrypt.hash(password, 12)
const [user] = await sql`
  INSERT INTO users (id, username, password_hash)
  VALUES (gen_random_uuid(), ${username}, ${passwordHash})
  RETURNING id, username, created_at
`
console.log('Created user:', user)
await sql.end()
