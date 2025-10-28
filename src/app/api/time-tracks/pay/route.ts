import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

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
    const { trackIds } = body

    console.log('Pay request:', { trackIds, session: session.user })

    if (!trackIds || !Array.isArray(trackIds) || trackIds.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid trackIds' }, { status: 400 })
    }

    // Обновляем записи как оплаченные
    const result = await prisma.timeTrack.updateMany({
      where: {
        id: {
          in: trackIds.map(id => parseInt(id))
        },
        was_paid: false // Обновляем только неоплаченные записи
      },
      data: {
        was_paid: true
      }
    })

    console.log('Update result:', result)

    return NextResponse.json({ 
      message: `Оплачено ${result.count} записей`,
      count: result.count 
    })
  } catch (error) {
    console.error('Error paying time tracks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
