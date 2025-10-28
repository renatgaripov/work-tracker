'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Plus } from 'lucide-react'

// Кастомная локаль для правильного отображения месяцев в именительном падеже
const customRuLocale = {
  ...ru,
  localize: {
    ...ru.localize,
    month: (month: number) => {
      const months = [
        'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
        'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
      ]
      return months[month]
    }
  }
}

interface TimeTrack {
  id: number
  date: string
  time: number
  comment: string
  was_paid: boolean
}

interface CalendarProps {
  onDayClick: (date: Date) => void
  onAddTime: (date: Date) => void
  userId?: number | null
  currentMonth?: Date
  onMonthChange?: (month: Date) => void
  currentUserId?: number | null
  onGoToToday?: () => void
}

export default function Calendar({ onDayClick, onAddTime, userId, currentMonth, onMonthChange, currentUserId, onGoToToday }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(currentMonth || new Date())
  const [timeTracks, setTimeTracks] = useState<TimeTrack[]>([])
  const [loading, setLoading] = useState(true)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  // Добавляем 1 день к концу месяца чтобы включить последний день
  const monthEndPlusOne = new Date(monthEnd)
  monthEndPlusOne.setDate(monthEndPlusOne.getDate() + 1)
  const days = eachDayOfInterval({ start: monthStart, end: monthEndPlusOne })

  // Добавляем пустые дни в начале месяца для правильного отображения
  // В России неделя начинается с понедельника (1), а не с воскресенья (0)
  const firstDayOfWeek = monthStart.getDay()
  const emptyDays = Array.from({ length: firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 }, () => null)

  useEffect(() => {
    fetchTimeTracks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, userId])

  // Синхронизируем с внешним состоянием месяца
  useEffect(() => {
    if (currentMonth && !isSameMonth(currentMonth, currentDate)) {
      setCurrentDate(currentMonth)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth])

  const fetchTimeTracks = async () => {
    try {
      const startDate = format(monthStart, 'yyyy-MM-dd')
      const endDate = format(monthEnd, 'yyyy-MM-dd')
      
      let url = `/api/time-tracks?startDate=${startDate}&endDate=${endDate}`
      if (userId) {
        url += `&userId=${userId}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      setTimeTracks(data)
    } catch (error) {
      console.error('Error fetching time tracks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTimeForDate = (date: Date) => {
    return timeTracks
      .filter(track => {
        const trackDate = new Date(track.date)
        return isSameDay(trackDate, date)
      })
      .reduce((total, track) => total + track.time, 0)
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}ч ${mins}м`
    }
    return `${mins}м`
  }

  const goToPreviousMonth = () => {
    const newDate = subMonths(currentDate, 1)
    setCurrentDate(newDate)
    if (onMonthChange) {
      onMonthChange(newDate)
    }
  }

  const goToNextMonth = () => {
    const newDate = addMonths(currentDate, 1)
    setCurrentDate(newDate)
    if (onMonthChange) {
      onMonthChange(newDate)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }, (_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {format(currentDate, 'MMMM yyyy', { locale: customRuLocale })}
        </h2>
        <div className="flex items-center space-x-2">
          {onGoToToday && (
            <button
              onClick={onGoToToday}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm cursor-pointer"
            >
              Сегодня
            </button>
          )}
          <div className="flex space-x-2">
            <button
              onClick={goToPreviousMonth}
              className="p-3 hover:bg-gray-100 rounded-lg transition-colors text-gray-700 hover:text-gray-900 text-xl font-bold cursor-pointer"
            >
              ←
            </button>
            <button
              onClick={goToNextMonth}
              className="p-3 hover:bg-gray-100 rounded-lg transition-colors text-gray-700 hover:text-gray-900 text-xl font-bold cursor-pointer"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="h-20"></div>
        ))}
        
        {days.filter(day => isSameMonth(day, currentDate)).map((day) => {
          const timeForDay = getTimeForDate(day)
          const isToday = isSameDay(day, new Date())
          const isCurrentMonth = isSameMonth(day, currentDate)
          
          return (
            <div
              key={day.toISOString()}
              className={`
                group h-20 border rounded-lg p-2 cursor-pointer transition-all hover:shadow-md
                ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                ${isToday ? 'ring-2 ring-indigo-500' : ''}
                ${timeForDay > 0 ? 'border-green-300 bg-green-50' : 'border-gray-200'}
              `}
              onClick={() => onDayClick(day)}
            >
              <div className="flex justify-between items-start h-full">
                <div>
                  <div className={`text-sm font-medium ${isCurrentMonth ? 'text-gray-900' : 'text-gray-500'}`}>
                    {format(day, 'd')}
                  </div>
                  {timeForDay > 0 && (
                    <div className="text-xs text-green-600 mt-1">
                      {formatTime(timeForDay)}
                    </div>
                  )}
                </div>
                {/* Показываем кнопку добавления времени только для собственного календаря */}
                {currentUserId && userId === currentUserId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddTime(day)
                    }}
                    className="opacity-70 hover:opacity-100 hover:bg-indigo-100 rounded p-1 transition-all"
                    title="Добавить время"
                  >
                    <Plus className="w-4 h-4 text-indigo-600" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
