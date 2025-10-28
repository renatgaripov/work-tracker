'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/navigation'
import UserSelector from '@/components/user-selector'
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

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toasts, error, removeToast } = useToast()
  const [monthlyData, setMonthlyData] = useState<MonthlyEarnings[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
    } else {
      // По умолчанию выбираем текущего пользователя
      setSelectedUserId(parseInt(session.user.id))
      fetchAnalytics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router])

  useEffect(() => {
    if (selectedUserId) {
      fetchAnalytics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      let url = '/api/analytics/monthly-earnings'
      if (selectedUserId) {
        url += `?userId=${selectedUserId}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      setMonthlyData(data)
    } catch (err) {
      console.error('Error fetching analytics:', err)
      error('Ошибка загрузки аналитики')
    } finally {
      setLoading(false)
    }
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

  const totalEarnings = monthlyData.reduce((sum, month) => sum + month.earnings, 0)
  const totalHours = monthlyData.reduce((sum, month) => sum + month.hours, 0)
  
  // Фильтруем месяцы с активностью (больше 0 часов или больше 0 заработка)
  const activeMonths = monthlyData.filter(month => month.hours > 0 || month.earnings > 0)
  const averageMonthly = activeMonths.length > 0 ? totalEarnings / activeMonths.length : 0
  
  // Статистика для заработка
  const maxEarnings = monthlyData.length > 0 ? Math.max(...monthlyData.map(m => m.earnings)) : 0
  
  // Статистика для часов
  const averageHours = activeMonths.length > 0 ? totalHours / activeMonths.length : 0
  const maxHours = monthlyData.length > 0 ? Math.max(...monthlyData.map(m => m.hours)) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="pl-1">
              <h1 className="text-3xl font-bold text-gray-900">Аналитика</h1>
              <p className="mt-2 text-gray-600">График заработка за последние 12 месяцев</p>
            </div>
            
            {/* User Selector for Admin and Moderator */}
            {(session.user.role === 'admin' || session.user.role === 'moderator') && (
              <UserSelector
                onUserChange={setSelectedUserId}
                selectedUserId={selectedUserId}
                currentUserId={parseInt(session.user.id)}
              />
            )}
          </div>

          {/* Charts */}
          <div className="space-y-8">
            {/* Earnings Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-green-500">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Общий заработок</p>
                    <p className="text-2xl font-bold text-gray-900">{formatMoney(totalEarnings)} ₽</p>
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
                    <p className="text-2xl font-bold text-gray-900">{formatMoney(averageMonthly)} ₽</p>
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
                    <p className="text-2xl font-bold text-gray-900">{formatMoney(maxEarnings)} ₽</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Заработок по месяцам</h2>
              
              {monthlyData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Нет данных для отображения</p>
                </div>
              ) : (
                <div className="h-80">
                  <Line
                    data={{
                      labels: monthlyData.map(month => 
                        format(new Date(month.month + '-01'), 'MMM', { locale: ru })
                      ),
                      datasets: [
                        {
                          label: 'Заработок (₽)',
                          data: monthlyData.map(month => month.earnings),
                          borderColor: 'rgb(99, 102, 241)',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          tension: 0.4,
                          pointBackgroundColor: 'rgb(99, 102, 241)',
                          pointBorderColor: 'rgb(99, 102, 241)',
                          pointRadius: 6,
                          pointHoverRadius: 8,
                          fill: true,
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                        title: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `Заработок: ${formatMoney(context.parsed.y || 0)} ₽`
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
                    <p className="text-2xl font-bold text-gray-900">{formatTime(totalHours * 60)}</p>
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
                    <p className="text-2xl font-bold text-gray-900">{formatTime(averageHours * 60)}</p>
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
                    <p className="text-2xl font-bold text-gray-900">{formatTime(maxHours * 60)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hours Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Работа в часах по месяцам</h2>
              
              {monthlyData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Нет данных для отображения</p>
                </div>
              ) : (
                <div className="h-80">
                  <Line
                    data={{
                      labels: monthlyData.map(month => 
                        format(new Date(month.month + '-01'), 'MMM', { locale: ru })
                      ),
                      datasets: [
                        {
                          label: 'Часы',
                          data: monthlyData.map(month => month.hours),
                          borderColor: 'rgb(34, 197, 94)',
                          backgroundColor: 'rgba(34, 197, 94, 0.1)',
                          tension: 0.4,
                          pointBackgroundColor: 'rgb(34, 197, 94)',
                          pointBorderColor: 'rgb(34, 197, 94)',
                          pointRadius: 6,
                          pointHoverRadius: 8,
                          fill: true,
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                        title: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `Часы: ${(context.parsed.y || 0).toFixed(1)}ч`
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
