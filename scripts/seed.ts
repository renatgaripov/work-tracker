import { seedUsers } from '../src/lib/auth'

async function main() {
  try {
    await seedUsers()
  } catch (error) {
    console.error('Ошибка при создании пользователей:', error)
    process.exit(1)
  }
}

main()
