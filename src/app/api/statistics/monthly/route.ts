import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma, getUserRateForDate } from '@/lib/prisma'
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Если указан userId, проверяем права доступа (admin и moderator могут смотреть всех)
    if (userId && session.user.role !== 'admin' && session.user.role !== 'moderator' && parseInt(userId) !== parseInt(session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Если userId не указан, используем текущего пользователя
    const targetUserId = userId ? parseInt(userId) : parseInt(session.user.id)

    // Получаем пользователя со ставками
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { rates: true }
    })

    // Получаем данные за последние 12 месяцев
    const now = new Date()
    const startDate = subMonths(now, 12)
    const months = eachMonthOfInterval({ start: startDate, end: now })

    const monthlyStats = []

    for (const month of months) {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)
      const monthKey = format(month, 'yyyy-MM')

      // Получаем все треки за месяц
      const timeTracks = await prisma.timeTrack.findMany({
        where: {
          user_id: targetUserId,
          date: {
            gte: monthStart,
            lt: monthEnd
          }
        },
        include: {
          user: {
            select: {
              name: true,
              position: true
            }
          }
        },
        orderBy: {
          date: 'desc'
        }
      })

      // Группируем данные (теперь только один пользователь)
      const users: { [userId: string]: { name: string; position: string; totalMinutes: number; paidMinutes: number; unpaidMinutes: number; totalEarnings: number; paidEarnings: number; unpaidEarnings: number; rate: number; tracks: typeof timeTracks } } = {}
      let totalMinutes = 0
      let paidMinutes = 0
      let unpaidMinutes = 0
      const totalTracks = timeTracks.length
      let paidTracks = 0
      let totalEarnings = 0
      let paidEarnings = 0
      let unpaidEarnings = 0

      if (timeTracks.length > 0) {
        const firstTrack = timeTracks[0]
        const userId = firstTrack.user_id.toString()
        const rate = getUserRateForDate(user?.rates || []) ?? 0
        
        users[userId] = {
          name: firstTrack.user.name,
          position: firstTrack.user.position,
          totalMinutes: 0,
          paidMinutes: 0,
          unpaidMinutes: 0,
          totalEarnings: 0,
          paidEarnings: 0,
          unpaidEarnings: 0,
          rate: rate,
          tracks: []
        }

        timeTracks.forEach(track => {
          // Получаем ставку именно на дату этой записи
          const trackRate = getUserRateForDate(user?.rates || [], new Date(track.date)) ?? 0
          const trackEarnings = trackRate > 0 ? (track.time / 60) * trackRate : 0
          
          // Добавляем ставку к треку для использования на фронтенде, избегая any
          const trackWithRate = track as typeof track & { rate: number }
          trackWithRate.rate = trackRate
          
          users[userId].totalMinutes += track.time
          users[userId].totalEarnings += trackEarnings
          users[userId].tracks.push(trackWithRate)
          
          if (track.was_paid) {
            users[userId].paidMinutes += track.time
            users[userId].paidEarnings += trackEarnings
            paidMinutes += track.time
            paidEarnings += trackEarnings
            paidTracks++
          } else {
            users[userId].unpaidMinutes += track.time
            users[userId].unpaidEarnings += trackEarnings
            unpaidMinutes += track.time
            unpaidEarnings += trackEarnings
          }
          
          totalMinutes += track.time
          totalEarnings += trackEarnings
        })
      }

      monthlyStats.push({
        month: monthKey,
        totalMinutes,
        paidMinutes,
        unpaidMinutes,
        totalTracks,
        paidTracks,
        totalEarnings,
        paidEarnings,
        unpaidEarnings,
        users
      })
    }

    return NextResponse.json(monthlyStats.reverse()) // Сортируем от старых к новым
  } catch (error) {
    console.error('Error fetching monthly statistics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
