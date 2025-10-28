import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma, getUserRateForDate } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем, что пользователь - админ или модератор
    if (session.user.role !== 'admin' && session.user.role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      include: {
        rates: {
          orderBy: {
            valid_from: 'desc'
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Получаем текущую ставку для каждого пользователя
    const usersWithRates = users.map((user) => {
      const currentRate = getUserRateForDate(user.rates)
      return {
        id: user.id,
        login: user.login,
        name: user.name,
        position: user.position,
        role: user.role,
        created_at: user.created_at,
        rate: currentRate,
        rates: user.rates
      }
    })

    return NextResponse.json(usersWithRates)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем, что пользователь - админ
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { login, password, name, position, role } = body

    if (!login || !password || !name || !position) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Проверяем, что логин уникален
    const existingUser = await prisma.user.findUnique({
      where: { login }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User with this login already exists' }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        login,
        password: hashedPassword,
        name,
        position,
        role: role || 'user'
      },
      select: {
        id: true,
        login: true,
        name: true,
        position: true,
        role: true,
        created_at: true
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}