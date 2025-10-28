import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId') || session.user.id

    const whereClause: Record<string, unknown> = { user_id: parseInt(userId) }
    
    if (date) {
      const start = new Date(date)
      const end = new Date(date)
      end.setDate(end.getDate() + 1)
      
      whereClause.date = {
        gte: start,
        lt: end
      }
    } else if (startDate && endDate) {
      const endDateObj = new Date(endDate)
      endDateObj.setDate(endDateObj.getDate() + 1) // Добавляем 1 день чтобы включить последний день месяца
      
      whereClause.date = {
        gte: new Date(startDate),
        lt: endDateObj
      }
    }

    const timeTracks = await prisma.timeTrack.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            position: true
          }
        }
      }
    })

    return NextResponse.json(timeTracks)
  } catch (error) {
    console.error('Error fetching time tracks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { date, time, comment } = body

    if (!date || !time || !comment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const timeTrack = await prisma.timeTrack.create({
      data: {
        user_id: parseInt(session.user.id),
        date: new Date(date),
        time: parseInt(time),
        comment
      },
      include: {
        user: {
          select: {
            name: true,
            position: true
          }
        }
      }
    })

    return NextResponse.json(timeTrack)
  } catch (error) {
    console.error('Error creating time track:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, time, comment } = body

    if (!id || !time || !comment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Проверяем, что запись принадлежит текущему пользователю
    const existingTrack = await prisma.timeTrack.findFirst({
      where: {
        id: parseInt(id),
        user_id: parseInt(session.user.id)
      }
    })

    if (!existingTrack) {
      return NextResponse.json({ error: 'Time track not found or access denied' }, { status: 404 })
    }

    // Проверяем, что запись не оплачена
    if (existingTrack.was_paid) {
      return NextResponse.json({ error: 'Cannot edit paid time track' }, { status: 400 })
    }

    const timeTrack = await prisma.timeTrack.update({
      where: { id: parseInt(id) },
      data: {
        time: parseInt(time),
        comment
      },
      include: {
        user: {
          select: {
            name: true,
            position: true
          }
        }
      }
    })

    return NextResponse.json(timeTrack)
  } catch (error) {
    console.error('Error updating time track:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Проверяем, что запись принадлежит текущему пользователю
    const existingTrack = await prisma.timeTrack.findFirst({
      where: {
        id: parseInt(id),
        user_id: parseInt(session.user.id)
      }
    })

    if (!existingTrack) {
      return NextResponse.json({ error: 'Time track not found or access denied' }, { status: 404 })
    }

    // Проверяем, что запись не оплачена
    if (existingTrack.was_paid) {
      return NextResponse.json({ error: 'Cannot delete paid time track' }, { status: 400 })
    }

    await prisma.timeTrack.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting time track:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
