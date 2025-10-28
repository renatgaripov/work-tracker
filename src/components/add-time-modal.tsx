'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { X, Clock, Save, ChevronDown } from 'lucide-react'
import { useToast } from '@/components/toast'

interface AddTimeModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date
  onTimeAdded: () => void
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

export default function AddTimeModal({ isOpen, onClose, date, onTimeAdded, onSuccess, onError }: AddTimeModalProps) {
  const { success: fallbackSuccess, error: fallbackError } = useToast()
  const [comment, setComment] = useState('')
  const [time, setTime] = useState(240) // в минутах (4 часа)
  const [loading, setLoading] = useState(false)

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}ч ${mins}м`
    }
    return `${mins}м`
  }

  const handleTimeChange = (delta: number) => {
    const newTime = time + delta
    if (newTime >= 30 && newTime <= 720) {
      setTime(newTime)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/time-tracks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: format(date, 'yyyy-MM-dd'),
          time: time,
          comment: comment.trim(),
        }),
      })

      if (response.ok) {
        setComment('')
        setTime(240) // 4 часа по умолчанию
        onTimeAdded()
        onClose()
        if (onSuccess) {
          onSuccess('Время успешно добавлено')
        } else {
          fallbackSuccess('Время успешно добавлено')
        }
      } else {
        const errorData = await response.json()
        const errorMessage = `Ошибка: ${errorData.error || 'Не удалось добавить время'}`
        if (onError) {
          onError(errorMessage)
        } else {
          fallbackError(errorMessage)
        }
      }
    } catch (err) {
      console.error('Error adding time track:', err)
      const errorMessage = 'Ошибка при добавлении времени'
      if (onError) {
        onError(errorMessage)
      } else {
        fallbackError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 ease-out scale-100 opacity-100 border border-gray-200">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>Добавить время</span>
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Дата:</span> {format(date, 'dd MMMM yyyy', { locale: ru })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Время работы
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => handleTimeChange(-30)}
                  disabled={time <= 30}
                  className="flex items-center justify-center w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  -
                </button>
                
                <div className="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg font-medium text-gray-900">
                  <Clock className="w-4 h-4 text-indigo-600 mr-2" />
                  <span>{formatTime(time)}</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => handleTimeChange(30)}
                  disabled={time >= 720}
                  className="flex items-center justify-center w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                Комментарий
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Опишите, что делали..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 transition-colors resize-none"
                required
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading || !comment.trim()}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Добавление...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Добавить</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
