'use client'

import { useState, useEffect } from 'react'
import { Clock, DollarSign, Calendar, TrendingUp } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface Statistics {
  totalMinutes: number
  totalHours: number
  remainingMinutes: number
  totalTracks: number
  paidMinutes: number
  unpaidMinutes: number
  uniqueDays: number
  totalEarnings: number
  paidEarnings: number
  unpaidEarnings: number
  userRate: number
}

interface StatsCardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  color: string
}

function StatsCard({ title, value, subtitle, icon, color }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface StatisticsProps {
  userId?: number | null
  selectedMonth?: Date
  onGoToToday?: () => void
  refreshKey?: number
}

export default function Statistics({ userId, selectedMonth, refreshKey }: StatisticsProps) {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatistics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, userId, refreshKey])

  const fetchStatistics = async () => {
    try {
      if (!selectedMonth) return
      
      const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
      const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')
      
      // Используем существующий API статистики
      let url = `/api/statistics?period=month&startDate=${startDate}&endDate=${endDate}`
      if (userId) {
        url += `&userId=${userId}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}ч ${mins}м`
    }
    return `${mins}м`
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(Math.round(amount))
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!stats) {
    return <div>Ошибка загрузки статистики</div>
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Общее время"
          value={formatTime(stats.totalMinutes)}
          subtitle={`${stats.totalTracks} записей`}
          icon={<Clock className="w-6 h-6 text-white" />}
          color="bg-blue-500"
        />
        
        <StatsCard
          title="Оплачено"
          value={stats.userRate > 0 ? `${formatMoney(stats.paidEarnings)} ₽` : formatTime(stats.paidMinutes)}
          subtitle={stats.userRate > 0 ? "оплаченная сумма" : "оплаченное время"}
          icon={<DollarSign className="w-6 h-6 text-white" />}
          color="bg-green-500"
        />
        
        <StatsCard
          title="К оплате"
          value={stats.userRate > 0 ? `${formatMoney(stats.unpaidEarnings)} ₽` : formatTime(stats.unpaidMinutes)}
          subtitle={stats.userRate > 0 ? "сумма к оплате" : "неоплаченное время"}
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          color="bg-yellow-500"
        />
        
        <StatsCard
          title="Заработок"
          value={stats.userRate > 0 ? `${formatMoney(stats.totalEarnings)} ₽` : `${stats.totalTracks} записей`}
          subtitle={stats.userRate > 0 ? "общий заработок" : "всего записей"}
          icon={<Calendar className="w-6 h-6 text-white" />}
          color="bg-purple-500"
        />
      </div>
    </div>
  )
}
