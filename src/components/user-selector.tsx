'use client'

import { useState, useEffect, useRef } from 'react'
import { User, ChevronDown } from 'lucide-react'

interface User {
  id: number
  name: string
  position: string
  login: string
  role?: string
}

interface UserSelectorProps {
  onUserChange: (userId: number | null) => void
  selectedUserId: number | null
  currentUserId: number
  isAllStaffMode?: boolean
  onAllStaffModeChange?: (enabled: boolean) => void
}

export default function UserSelector({ onUserChange, selectedUserId, currentUserId, isAllStaffMode, onAllStaffModeChange }: UserSelectorProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  // Закрываем dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        // показываем только сотрудников
        const employees = (data as User[]).filter(u => (u.role ?? 'user') === 'user')
        setUsers(employees)
      } else {
        console.error('Error fetching users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedUser = users.find(user => user.id === (selectedUserId || undefined))
  
  let displayName = 'Загрузка...'
  if (isAllStaffMode) {
    displayName = 'Весь штат'
  } else if (selectedUser) {
    displayName = `${selectedUser.name} (${selectedUser.position})`
  }

  if (loading) {
    return (
      <div className="min-w-80">
        <div className="animate-pulse h-12 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg"></div>
      </div>
    )
  }

  const allUsers: (User & { isAllStaff?: boolean })[] = [
    { id: -1, name: 'Весь штат', position: '', login: '', isAllStaff: true },
    ...users.filter(user => user.id !== currentUserId)
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="min-w-80 px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg text-left font-medium text-gray-900 hover:border-indigo-400 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between cursor-pointer"
      >
        <span className="flex items-center space-x-2 flex-1">
          <User className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span className="truncate">{displayName}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-indigo-600 transition-transform flex-shrink-0 ml-2 ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {isDropdownOpen && (
        <div className="absolute top-full right-0 mt-2 min-w-80 bg-white border border-indigo-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {allUsers.map((user) => {
            const isSelected = 'isAllStaff' in user && user.isAllStaff 
              ? isAllStaffMode 
              : (selectedUserId || currentUserId) === user.id
              
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  if ('isAllStaff' in user && user.isAllStaff) {
                    if (onAllStaffModeChange) {
                      onAllStaffModeChange(true)
                    }
                    onUserChange(null)
                  } else {
                    if (onAllStaffModeChange) {
                      onAllStaffModeChange(false)
                    }
                    onUserChange(user.id === currentUserId ? currentUserId : user.id)
                  }
                  setIsDropdownOpen(false)
                }}
                className={`w-full px-4 py-3 text-left transition-all hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 font-medium ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-900'
                    : 'text-gray-700 hover:text-indigo-700'
                }`}
              >
                <span className="flex items-center space-x-3">
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                  )}
                  <span>
                    {'isAllStaff' in user && user.isAllStaff
                      ? 'Весь штат'
                      : `${user.name} (${user.position})`}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
