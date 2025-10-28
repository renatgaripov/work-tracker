import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

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
    const { login, password, name, position } = body

    if (!name || !position || !login) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Проверяем, что пользователь существует
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Нельзя редактировать других админов
    if (existingUser.role === 'admin' && userId !== parseInt(session.user.id)) {
      return NextResponse.json({ error: 'Cannot edit other administrators' }, { status: 403 })
    }

    // Проверяем уникальность логина, если он изменился
    if (login !== existingUser.login) {
      const existingLogin = await prisma.user.findUnique({
        where: { login }
      })
      if (existingLogin) {
        return NextResponse.json({ error: 'Login already exists' }, { status: 400 })
      }
    }

    // Подготавливаем данные для обновления
    const updateData: Record<string, unknown> = {
      login,
      name,
      position
    }

    // Добавляем пароль только если он указан
    if (password && password.trim() !== '') {
      updateData.password = await hashPassword(password)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Нельзя удалить самого себя
    if (userId === parseInt(session.user.id)) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
    }

    // Проверяем, что пользователь существует
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Нельзя удалять других админов
    if (existingUser.role === 'admin') {
      return NextResponse.json({ error: 'Cannot delete administrators' }, { status: 403 })
    }

    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}