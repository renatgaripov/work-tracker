import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем, что пользователь - админ
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = await params
    const userId = parseInt(resolvedParams.id)

    // Получаем историю ставок пользователя
    const rates = await prisma.userRate.findMany({
      where: { user_id: userId },
      orderBy: { valid_from: 'desc' }
    })

    return NextResponse.json(rates)
  } catch (error) {
    console.error('Error fetching user rates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем, что пользователь - админ
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = await params
    const userId = parseInt(resolvedParams.id)
    const body = await request.json()
    const { rateId, rate, valid_from } = body

    if (!rateId) {
      return NextResponse.json({ error: 'Укажите ID ставки' }, { status: 400 })
    }

    // Проверяем, что ставка принадлежит этому пользователю
    const existingRate = await prisma.userRate.findUnique({
      where: { id: rateId }
    })

    if (!existingRate || existingRate.user_id !== userId) {
      return NextResponse.json({ error: 'Ставка не найдена' }, { status: 404 })
    }

    if (!rate || isNaN(rate) || rate <= 0) {
      return NextResponse.json({ error: 'Некорректная ставка' }, { status: 400 })
    }

    if (!valid_from) {
      return NextResponse.json({ error: 'Укажите дату начала действия' }, { status: 400 })
    }

    // Обновляем существующую ставку
    const updatedRate = await prisma.userRate.update({
      where: { id: rateId },
      data: {
        rate: parseFloat(rate),
        valid_from: valid_from
      }
    })

    return NextResponse.json(updatedRate)
  } catch (error) {
    console.error('Error updating user rate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем, что пользователь - админ
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = await params
    const userId = parseInt(resolvedParams.id)
    const body = await request.json()
    const { rate, valid_from } = body

    if (!rate || isNaN(rate) || rate <= 0) {
      return NextResponse.json({ error: 'Некорректная ставка' }, { status: 400 })
    }

    if (!valid_from) {
      return NextResponse.json({ error: 'Укажите дату начала действия' }, { status: 400 })
    }

    // Создаем новую ставку с указанной датой
    const newRate = await prisma.userRate.create({
      data: {
        user_id: userId,
        rate: parseFloat(rate),
        valid_from: new Date(valid_from)
      }
    })

    return NextResponse.json(newRate)
  } catch (error) {
    console.error('Error creating user rate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
