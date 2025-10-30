'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { X, Clock, CheckCircle, Circle, Edit2, Save, X as XIcon, Trash2 } from 'lucide-react'
import { useToast } from '@/components/toast'

interface TimeTrack {
  id: number
  date: string
  time: number
  comment: string
  was_paid: boolean
  created_at: string
  user?: {
    id: number
    name: string
    position: string
  }
}

interface DayDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date
  onTimeUpdated?: () => void
  userId?: number | null
  currentUserId?: number | null
  isAllStaffMode?: boolean
}

export default function DayDetailsModal({ isOpen, onClose, date, onTimeUpdated, userId, currentUserId, isAllStaffMode }: DayDetailsModalProps) {
  const [timeTracks, setTimeTracks] = useState<TimeTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTrack, setEditingTrack] = useState<number | null>(null)
  const [editComment, setEditComment] = useState('')
  const [editTime, setEditTime] = useState(60) // в минутах
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { success, error } = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchDayDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, date, userId, isAllStaffMode])

  const fetchDayDetails = async () => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      let url = `/api/time-tracks?date=${dateStr}`
      if (userId && !isAllStaffMode) {
        url += `&userId=${userId}`
      } else if (isAllStaffMode) {
        url += `&userId=null`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      setTimeTracks(data)
    } catch (error) {
      console.error('Error fetching day details:', error)
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

  const handleEdit = (track: TimeTrack) => {
    setEditingTrack(track.id)
    setEditComment(track.comment)
    setEditTime(track.time) // сохраняем как число
  }

  const handleTimeChange = (delta: number) => {
    const newTime = editTime + delta
    if (newTime >= 30 && newTime <= 720) {
      setEditTime(newTime)
    }
  }

  const handleCancelEdit = () => {
    setEditingTrack(null)
    setEditComment('')
    setEditTime(60)
  }

  const handleSaveEdit = async (trackId: number) => {
    if (!editComment.trim()) return

    setSaving(true)
    try {
      const response = await fetch('/api/time-tracks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: trackId,
          time: editTime,
          comment: editComment.trim(),
        }),
      })

      if (response.ok) {
        const updatedTrack = await response.json()
        setTimeTracks(prev => 
          prev.map(track => 
            track.id === trackId ? updatedTrack : track
          )
        )
        setEditingTrack(null)
        setEditComment('')
        setEditTime(60)
        success('Запись успешно обновлена')
        // Обновляем календарь
        if (onTimeUpdated) {
          onTimeUpdated()
        }
      } else {
        const errorData = await response.json()
        error(`Ошибка: ${errorData.error || 'Не удалось обновить запись'}`)
      }
    } catch (err) {
      console.error('Error updating time track:', err)
      error('Ошибка при обновлении записи')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (trackId: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) return

    setDeleting(true)
    try {
      const response = await fetch('/api/time-tracks', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: trackId }),
      })

      if (response.ok) {
        setTimeTracks(prev => prev.filter(track => track.id !== trackId))
        success('Запись успешно удалена')
        // Обновляем календарь
        if (onTimeUpdated) {
          onTimeUpdated()
        }
      } else {
        const errorData = await response.json()
        error(`Ошибка: ${errorData.error || 'Не удалось удалить запись'}`)
      }
    } catch (err) {
      console.error('Error deleting time track:', err)
      error('Ошибка при удалении записи')
    } finally {
      setDeleting(false)
    }
  }

  const totalTime = timeTracks.reduce((sum, track) => sum + track.time, 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-gray-200">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>{format(date, 'dd MMMM yyyy', { locale: ru })}</span>
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-indigo-600 mr-2" />
                  <span className="text-sm font-medium text-indigo-700">Общее время:</span>
                </div>
                <span className="text-xl font-bold text-indigo-900">
                  {formatTime(totalTime)}
                </span>
              </div>
            </div>

            {timeTracks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Нет записей времени за этот день</p>
              </div>
            ) : (
              <div className="space-y-4">
                {timeTracks.map((track) => (
                  <div
                    key={track.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    {editingTrack === track.id ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">Редактирование записи</h4>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleSaveEdit(track.id)}
                              disabled={saving || !editComment.trim() || editTime < 30}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                            >
                              <Save className="w-4 h-4" />
                              <span>{saving ? 'Сохранение...' : 'Сохранить'}</span>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={saving}
                              className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                            >
                              <XIcon className="w-4 h-4" />
                              <span>Отмена</span>
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Время
                            </label>
                            <div className="flex items-center space-x-3">
                              <button
                                type="button"
                                onClick={() => handleTimeChange(-30)}
                                disabled={editTime <= 30}
                                className="flex items-center justify-center w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              >
                                -
                              </button>
                              
                              <div className="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg font-medium text-gray-900">
                                <Clock className="w-4 h-4 text-indigo-600 mr-2" />
                                <span>{formatTime(editTime)}</span>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => handleTimeChange(30)}
                                disabled={editTime >= 720}
                                className="flex items-center justify-center w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Комментарий
                            </label>
                            <textarea
                              value={editComment}
                              onChange={(e) => setEditComment(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-gray-900"
                              rows={3}
                              placeholder="Опишите выполненную работу..."
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {isAllStaffMode && track.user && (
                            <div className="mb-2 flex items-center">
                              <span className="font-semibold text-indigo-600">
                                {track.user.name}
                              </span>
                              {track.user.position && (
                                <span className="ml-2 text-xs text-gray-500">
                                  ({track.user.position})
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center mb-2">
                            {track.was_paid ? (
                              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-300 mr-2" />
                            )}
                            <span className="font-medium text-gray-900">
                              {formatTime(track.time)}
                            </span>
                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                              track.was_paid 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {track.was_paid ? 'Оплачено' : 'К доплате'}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2">{track.comment}</p>
                          <p className="text-xs text-gray-500">
                            Добавлено: {format(new Date(track.created_at), 'HH:mm', { locale: ru })}
                          </p>
                        </div>
                        {/* Показываем кнопки редактирования и удаления только для собственных записей */}
                        {currentUserId && userId === currentUserId && (
                          <div className="ml-4 flex space-x-1">
                            {/* Кнопка редактирования только для неоплаченных записей */}
                            {!track.was_paid && (
                              <button
                                onClick={() => handleEdit(track)}
                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Редактировать запись"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {/* Кнопка удаления только для неоплаченных записей */}
                            {!track.was_paid && (
                              <button
                                onClick={() => handleDelete(track.id)}
                                disabled={deleting}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                title="Удалить запись"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
