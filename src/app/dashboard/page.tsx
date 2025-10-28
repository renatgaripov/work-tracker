'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Calendar from '@/components/calendar'
import Statistics from '@/components/statistics'
import AddTimeModal from '@/components/add-time-modal'
import DayDetailsModal from '@/components/day-details-modal'
import UserSelector from '@/components/user-selector'
import Navigation from '@/components/navigation'
import { ToastContainer, useToast } from '@/components/toast'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toasts, success, error, removeToast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
    } else {
      // По умолчанию выбираем текущего пользователя
      setSelectedUserId(parseInt(session.user.id))
    }
  }, [session, status, router])

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    setShowDetailsModal(true)
  }

  const handleAddTime = (date: Date) => {
    setSelectedDate(date)
    setShowAddModal(true)
  }

  const handleTimeAdded = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleGoToToday = () => {
    setCurrentMonth(new Date())
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="pl-1">
              <h1 className="text-3xl font-bold text-gray-900">Календарь</h1>
              <p className="mt-2 text-gray-600">Записи времени работы</p>
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

          {/* Statistics */}
          <Statistics 
            userId={selectedUserId} 
            selectedMonth={currentMonth}
            onGoToToday={handleGoToToday}
            refreshKey={refreshKey}
          />

          {/* Calendar */}
          <Calendar
            key={refreshKey}
            onDayClick={handleDayClick}
            onAddTime={handleAddTime}
            userId={selectedUserId}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            currentUserId={parseInt(session.user.id)}
            onGoToToday={handleGoToToday}
          />
        </div>
      </main>

      {/* Modals */}
      {selectedDate && (
        <>
          <AddTimeModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            date={selectedDate}
            onTimeAdded={handleTimeAdded}
            onSuccess={success}
            onError={error}
          />
          
          <DayDetailsModal
            isOpen={showDetailsModal}
            onClose={() => setShowDetailsModal(false)}
            date={selectedDate}
            onTimeUpdated={handleTimeAdded}
            userId={selectedUserId}
            currentUserId={parseInt(session.user.id)}
          />
        </>
      )}
      
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
