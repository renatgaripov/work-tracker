'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/navigation'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { TrendingUp, DollarSign } from 'lucide-react'
import { useToast, ToastContainer } from '@/components/toast'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface MonthlyEarnings {
  month: string
  earnings: number
  hours: number
}

interface User {
  id: number
  name: string
  position: string
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toasts, error, removeToast } = useToast()
  const [monthlyData, setMonthlyData] = useState<{[userId: number]: MonthlyEarnings[]}>({})
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [enabledUsers, setEnabledUsers] = useState<number[]>([])

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
    } else {
      fetchAnalytics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      // @ts-expect-error: тадо
      const isAdminOrModerator = session?.user?.role === 'admin' || session?.user?.role === 'moderator'
      // @ts-expect-error: тадо
      const currentUserId = parseInt(session?.user?.id as string)
      
      if (isAdminOrModerator) {
        // Для админа и модератора получаем всех сотрудников
        const usersResponse = await fetch('/api/users')
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          const staffUsers = (usersData as Array<User & { role?: string }>).filter((u) => (u.role ?? 'user') === 'user')
          setUsers(staffUsers)
          
          // Включаем всех по умолчанию
          const userIds = staffUsers.map((u: User) => u.id)
          setEnabledUsers(userIds)
          
          // Загружаем данные для каждого сотрудника
          const dataPromises = staffUsers.map(async (user: User) => {
            const response = await fetch(`/api/analytics/monthly-earnings?userId=${user.id}`)
            const data = await response.json()
            return { userId: user.id, data }
          })
          
          const results = await Promise.all(dataPromises)
          const dataMap: {[userId: number]: MonthlyEarnings[]} = {}
          results.forEach(({ userId, data }) => {
            dataMap[userId] = data
          })
          
          setMonthlyData(dataMap)
        }
      } else {
        // Для обычного пользователя загружаем только его данные
        const response = await fetch(`/api/analytics/monthly-earnings?userId=${currentUserId}`)
        const data = await response.json()
        
        const currentUser = { id: currentUserId, name: String(session?.user?.name || 'Вы'), position: '' }
        setUsers([currentUser])
        setEnabledUsers([currentUserId])
        
        setMonthlyData({ [currentUserId]: data })
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
      error('Ошибка загрузки аналитики')
    } finally {
      setLoading(false)
    }
  }

  const toggleUser = (userId: number) => {
    setEnabledUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }
  
  const toggleAll = () => {
    setEnabledUsers(prev => 
      prev.length === users.length ? [] : users.map(u => u.id)
    )
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(Math.round(amount))
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}ч ${mins}м`
    }
    return `${mins}м`
  }

  // Палитра цветов для каждого сотрудника
  const getColorForUser = (index: number) => {
    const colors = [
      { border: 'rgb(99, 102, 241)', bg: 'rgba(99, 102, 241, 0.1)' }, // indigo
      { border: 'rgb(34, 197, 94)', bg: 'rgba(34, 197, 94, 0.1)' }, // green
      { border: 'rgb(239, 68, 68)', bg: 'rgba(239, 68, 68, 0.1)' }, // red
      { border: 'rgb(251, 146, 60)', bg: 'rgba(251, 146, 60, 0.1)' }, // orange
      { border: 'rgb(147, 51, 234)', bg: 'rgba(147, 51, 234, 0.1)' }, // purple
      { border: 'rgb(236, 72, 153)', bg: 'rgba(236, 72, 153, 0.1)' }, // pink
      { border: 'rgb(59, 130, 246)', bg: 'rgba(59, 130, 246, 0.1)' }, // blue
      { border: 'rgb(168, 85, 247)', bg: 'rgba(168, 85, 247, 0.1)' }, // violet
    ]
    return colors[index % colors.length]
  }

  // Получаем месяцы для отображения
  const getMonths = () => {
    const monthSet = new Set<string>()
    Object.values(monthlyData).forEach(data => {
      data.forEach(item => monthSet.add(item.month))
    })
    return Array.from(monthSet).sort()
  }

  // Получаем общую статистику
  const getTotalStats = () => {
    const months = getMonths()
    let totalEarnings = 0
    let totalHours = 0

    enabledUsers.forEach(userId => {
      const data = monthlyData[userId] || []
      data.forEach(month => {
        totalEarnings += month.earnings
        totalHours += month.hours
      })
    })

    const activeMonths = months.filter(month => {
      let hasActivity = false
      enabledUsers.forEach(userId => {
        const data = monthlyData[userId] || []
        const monthData = data.find(m => m.month === month)
        if (monthData && (monthData.hours > 0 || monthData.earnings > 0)) {
          hasActivity = true
        }
      })
      return hasActivity
    })

    return {
      totalEarnings,
      totalHours,
      averageMonthly: activeMonths.length > 0 ? totalEarnings / activeMonths.length : 0,
      maxEarnings: months.reduce((max, month) => {
        let monthTotal = 0
        enabledUsers.forEach(userId => {
          const data = monthlyData[userId] || []
          const monthData = data.find(m => m.month === month)
          if (monthData) monthTotal += monthData.earnings
        })
        return Math.max(max, monthTotal)
      }, 0),
      averageHours: activeMonths.length > 0 ? totalHours / activeMonths.length : 0,
      maxHours: months.reduce((max, month) => {
        let monthTotal = 0
        enabledUsers.forEach(userId => {
          const data = monthlyData[userId] || []
          const monthData = data.find(m => m.month === month)
          if (monthData) monthTotal += monthData.hours
        })
        return Math.max(max, monthTotal)
      }, 0),
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка аналитики...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const stats = getTotalStats()
  const months = getMonths()
  
  // @ts-expect-error: тадо
  const isAdminOrModerator = session?.user?.role === 'admin' || session?.user?.role === 'moderator'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="pl-1">
            <h1 className="text-3xl font-bold text-gray-900">Аналитика</h1>
            <p className="mt-2 text-gray-600">
              {isAdminOrModerator 
                ? 'График заработка всех сотрудников за последние 12 месяцев'
                : 'График вашего заработка за последние 12 месяцев'}
            </p>
          </div>

          {/* Charts */}
          <div className="space-y-8">
            {/* Interactive Legend */}
            {users.length > 0 && isAdminOrModerator && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Сотрудники</h3>
                  <button
                    onClick={toggleAll}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    {enabledUsers.length === users.length ? 'Выключить всех' : 'Включить всех'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {users.map((user, index) => {
                    const isEnabled = enabledUsers.includes(user.id)
                    const color = getColorForUser(index)
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleUser(user.id)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all ${
                          isEnabled
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{
                            backgroundColor: isEnabled ? color.border : '#d1d5db',
                          }}
                        ></div>
                        <span className={`font-medium ${isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                          {user.name}
                        </span>
                        <div className={`w-4 h-4 rounded border ${
                          isEnabled ? 'bg-indigo-600 border-indigo-600' : 'border-gray-400'
                        } flex items-center justify-center`}>
                          {isEnabled && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Earnings Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-green-500">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Общий заработок</p>
                    <p className="text-2xl font-bold text-gray-900">{formatMoney(stats.totalEarnings)} ₽</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-blue-500">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Среднее за месяц</p>
                    <p className="text-2xl font-bold text-gray-900">{formatMoney(stats.averageMonthly)} ₽</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-purple-500">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Максимум за месяц</p>
                    <p className="text-2xl font-bold text-gray-900">{formatMoney(stats.maxEarnings)} ₽</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Заработок по месяцам</h2>
              
              {months.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Нет данных для отображения</p>
                </div>
              ) : (
                <div className="h-80">
                  <Line
                    data={{
                      labels: months.map(month => 
                        format(new Date(month + '-01'), 'MMM', { locale: ru })
                      ),
                      datasets: enabledUsers.map((userId, index) => {
                        const user = users.find(u => u.id === userId)
                        const data = monthlyData[userId] || []
                        const color = getColorForUser(index)
                        const earningsData = months.map(month => {
                          const monthData = data.find(m => m.month === month)
                          return monthData?.earnings || 0
                        })
                        return {
                          label: user?.name || 'Неизвестно',
                          data: earningsData,
                          borderColor: color.border,
                          backgroundColor: color.bg,
                          tension: 0.4,
                          pointBackgroundColor: color.border,
                          pointBorderColor: color.border,
                          pointRadius: 5,
                          pointHoverRadius: 7,
                          fill: false,
                        }
                      })
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        title: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.dataset.label}: ${formatMoney(context.parsed.y || 0)} ₽`
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          type: 'linear' as const,
                          display: true,
                          position: 'left' as const,
                          title: {
                            display: true,
                            text: 'Заработок (₽)'
                          },
                          ticks: {
                            callback: function(value) {
                              return formatMoney(value as number) + ' ₽'
                            }
                          },
                          beginAtZero: true,
                        },
                      },
                    }}
                  />
                </div>
              )}
            </div>

            {/* Hours Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-green-500">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Всего часов</p>
                    <p className="text-2xl font-bold text-gray-900">{formatTime(stats.totalHours * 60)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-blue-500">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Среднее за месяц</p>
                    <p className="text-2xl font-bold text-gray-900">{formatTime(stats.averageHours * 60)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-purple-500">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Максимум за месяц</p>
                    <p className="text-2xl font-bold text-gray-900">{formatTime(stats.maxHours * 60)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hours Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Работа в часах по месяцам</h2>
              
              {months.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Нет данных для отображения</p>
                </div>
              ) : (
                <div className="h-80">
                  <Line
                    data={{
                      labels: months.map(month => 
                        format(new Date(month + '-01'), 'MMM', { locale: ru })
                      ),
                      datasets: enabledUsers.map((userId, index) => {
                        const user = users.find(u => u.id === userId)
                        const data = monthlyData[userId] || []
                        const color = getColorForUser(index)
                        return {
                          label: user?.name || 'Неизвестно',
                          data: months.map(month => {
                            const monthData = data.find(m => m.month === month)
                            return monthData?.hours || 0
                          }),
                          borderColor: color.border,
                          backgroundColor: color.bg,
                          tension: 0.4,
                          pointBackgroundColor: color.border,
                          pointBorderColor: color.border,
                          pointRadius: 5,
                          pointHoverRadius: 7,
                          fill: false,
                        }
                      })
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        title: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.dataset.label}: ${(context.parsed.y || 0).toFixed(1)}ч`
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          type: 'linear' as const,
                          display: true,
                          position: 'left' as const,
                          title: {
                            display: true,
                            text: 'Часы'
                          },
                          ticks: {
                            callback: function(value) {
                              return value + 'ч'
                            }
                          },
                          beginAtZero: true,
                        },
                      },
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
