'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/navigation'
import UserSelector from '@/components/user-selector'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CheckCircle, Circle, DollarSign, Clock, ChevronDown } from 'lucide-react'
import { useToast, ToastContainer } from '@/components/toast'

interface TimeTrack {
  id: number
  date: string
  time: number
  comment: string
  was_paid: boolean
  rate?: number
  user: {
    name: string
    position: string
  }
}

interface MonthlyStats {
  month: string
  totalMinutes: number
  paidMinutes: number
  unpaidMinutes: number
  totalTracks: number
  paidTracks: number
  totalEarnings: number
  paidEarnings: number
  unpaidEarnings: number
  users: {
    [userId: string]: {
      name: string
      position: string
      totalMinutes: number
      paidMinutes: number
      unpaidMinutes: number
      totalEarnings: number
      paidEarnings: number
      unpaidEarnings: number
      rate: number
      tracks: TimeTrack[]
    }
  }
}

export default function StatisticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toasts, success, error, removeToast } = useToast()
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTracks, setSelectedTracks] = useState<number[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false)
  const monthDropdownRef = useRef<HTMLDivElement>(null)
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
    } else {
      // По умолчанию выбираем текущего пользователя
      setSelectedUserId(parseInt(session.user.id))
      fetchMonthlyStats()
    }
  }, [session, status, router])

  useEffect(() => {
    if (selectedUserId) {
      fetchMonthlyStats(true) // Сохраняем выбор месяца при смене пользователя
    }
  }, [selectedUserId])

  // Закрываем dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Обновляем состояние indeterminate для чекбокса "Выбрать все"
  useEffect(() => {
    if (selectAllCheckboxRef.current && selectedMonth) {
      const currentMonthData = monthlyStats.find(month => month.month === selectedMonth)
      if (currentMonthData) {
        const allUnpaidTracks = Object.values(currentMonthData.users).flatMap(userData => 
          userData.tracks.filter(track => !track.was_paid)
        );
        const allUnpaidTracksIds = allUnpaidTracks.map(track => track.id);
        const someSelected = selectedTracks.length > 0 && selectedTracks.length < allUnpaidTracksIds.length;
        selectAllCheckboxRef.current.indeterminate = someSelected;
      }
    }
  }, [selectedTracks, monthlyStats, selectedMonth])

  const fetchMonthlyStats = async (preserveSelection = false) => {
    try {
      let url = '/api/statistics/monthly'
      if (selectedUserId) {
        url += `?userId=${selectedUserId}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      setMonthlyStats(data)
      
      // Устанавливаем текущий месяц как выбранный только при первой загрузке
      if (!preserveSelection) {
        const currentMonth = format(new Date(), 'yyyy-MM')
        setSelectedMonth(currentMonth)
      }
    } catch (error) {
      console.error('Error fetching monthly stats:', error)
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

  const handleTrackSelect = (trackId: number) => {
    setSelectedTracks(prev => 
      prev.includes(trackId) 
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    )
  }

  const handlePaySelected = async () => {
    if (selectedTracks.length === 0) return

    try {
      const response = await fetch('/api/time-tracks/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackIds: selectedTracks }),
      })

      const result = await response.json()

      if (response.ok) {
        setSelectedTracks([])
        fetchMonthlyStats(true) // Обновляем данные, сохраняя выбор месяца и пользователя
        success(`Оплачено ${result.count} записей`)
      } else {
        console.error('Error paying tracks:', result)
        error('Ошибка при оплате записей')
      }
    } catch (err) {
      console.error('Error paying tracks:', err)
      error('Ошибка при оплате записей')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const currentMonthData = monthlyStats.find(month => month.month === selectedMonth)

  const handleSelectAll = () => {
    if (!currentMonthData) return
    
    const allUnpaidTracks = Object.values(currentMonthData.users)
      .flatMap(userData => userData.tracks.filter(track => !track.was_paid).map(track => track.id))
    
    if (selectedTracks.length === allUnpaidTracks.length) {
      setSelectedTracks([])
    } else {
      setSelectedTracks(allUnpaidTracks)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="pl-1">
              <h1 className="text-3xl font-bold text-gray-900">Работа</h1>
              <p className="mt-2 text-gray-600">Помесячная детализация</p>
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

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Помесячная детализация</h2>
            
            {/* Выбор месяца */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Выберите месяц:
              </label>
              <div className="relative inline-block" ref={monthDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                  className="w-64 px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg text-left font-medium text-gray-900 hover:border-indigo-400 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>
                      {selectedMonth 
                        ? format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: ru })
                        : 'Выберите месяц'}
                    </span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-indigo-600 transition-transform flex-shrink-0 ml-2 ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMonthDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-indigo-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    {monthlyStats.map((month) => (
                      <button
                        key={month.month}
                        type="button"
                        onClick={() => {
                          setSelectedMonth(month.month)
                          setIsMonthDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-3 text-left transition-all hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 font-medium ${
                          selectedMonth === month.month
                            ? 'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-900'
                            : 'text-gray-700 hover:text-indigo-700'
                        }`}
                      >
                        <span className="flex items-center space-x-3">
                          {selectedMonth === month.month && (
                            <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                          )}
                          <span>
                            {format(new Date(month.month + '-01'), 'MMMM yyyy', { locale: ru })}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {currentMonthData && (
              <div className="space-y-6">
                {/* Общая статистика месяца */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Clock className="w-8 h-8 text-blue-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-blue-600">Общее время</p>
                        <p className="text-2xl font-bold text-blue-900">{formatTime(currentMonthData.totalMinutes)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-green-600">Оплачено</p>
                        <p className="text-2xl font-bold text-green-900">
                          {currentMonthData.paidEarnings > 0 ? `${formatMoney(currentMonthData.paidEarnings)} ₽` : formatTime(currentMonthData.paidMinutes)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Circle className="w-8 h-8 text-yellow-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-yellow-600">К оплате</p>
                        <p className="text-2xl font-bold text-yellow-900">
                          {currentMonthData.unpaidEarnings > 0 ? `${formatMoney(currentMonthData.unpaidEarnings)} ₽` : formatTime(currentMonthData.unpaidMinutes)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="w-8 h-8 text-purple-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-purple-600">Заработок</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {currentMonthData.totalEarnings > 0 ? `${formatMoney(currentMonthData.totalEarnings)} ₽` : `${currentMonthData.totalTracks} записей`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Детали по пользователям */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Детализация времени</h3>
                    {(session.user.role === 'admin' || session.user.role === 'moderator') && (() => {
                      const allUnpaidTracks = Object.values(currentMonthData.users).flatMap(userData => 
                        userData.tracks.filter(track => !track.was_paid)
                      );
                      const allUnpaidTracksIds = allUnpaidTracks.map(track => track.id);
                      const allSelected = allUnpaidTracksIds.length > 0 && selectedTracks.length === allUnpaidTracksIds.length;
                      
                      return (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={selectAllCheckboxRef}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-gray-700">Выбрать все</span>
                        </label>
                      );
                    })()}
                  </div>
                  
                  {Object.keys(currentMonthData.users).length === 0 || Object.values(currentMonthData.users).every(userData => userData.tracks.length === 0) ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
                      <div className="text-center">
                        <Circle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-lg font-medium text-gray-700">Работа не проводилась</p>
                        <p className="text-sm text-gray-500 mt-1">В выбранном месяце нет записей времени</p>
                      </div>
                    </div>
                  ) : (
                    Object.entries(currentMonthData.users).map(([userId, userData]) => (
                    <div key={userId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h4 className="font-medium text-gray-900">{userData.name}</h4>
                          <p className="text-sm text-gray-500">{userData.position}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            Всего: {formatTime(userData.totalMinutes)}
                          </p>
                          <p className="text-sm text-green-600">
                            Оплачено: {formatTime(userData.paidMinutes)}
                          </p>
                          <p className="text-sm text-yellow-600">
                            К оплате: {formatTime(userData.unpaidMinutes)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Список записей */}
                      <div className="space-y-2">
                        {userData.tracks.map((track) => (
                          <div
                            key={track.id}
                            className={`flex items-start justify-between p-3 rounded-lg border ${
                              track.was_paid ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                            }`}
                          >
                            <div className="flex items-start space-x-3 flex-1 min-w-0">
                              {(session.user.role === 'admin' || session.user.role === 'moderator') && !track.was_paid && (
                                <input
                                  type="checkbox"
                                  checked={selectedTracks.includes(track.id)}
                                  onChange={() => handleTrackSelect(track.id)}
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{track.comment}</p>
                                <p className="text-xs text-gray-500">
                                  {format(new Date(track.date), 'dd MMMM yyyy', { locale: ru })} - {formatTime(track.time)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                              {track.rate && track.rate > 0 && (
                                <>
                                  <span className="text-sm font-medium text-gray-700">
                                    {formatMoney((track.time / 60) * track.rate)} ₽
                                  </span>
                                  {track.was_paid ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-yellow-500" />
                                  )}
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    track.was_paid 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {track.was_paid ? 'Оплачено' : 'К оплате'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
                </div>

                {/* Кнопка оплаты для админа */}
                {session.user.role === 'admin' && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">
                      Выбрано для оплаты: {selectedTracks.length}
                    </p>
                    {selectedTracks.length > 0 && (
                      <button
                        onClick={handlePaySelected}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Оплатить выбранные ({selectedTracks.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
