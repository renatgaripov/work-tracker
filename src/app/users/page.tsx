'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/navigation'
import { Plus, Edit, Trash2, Save, X, ChevronDown, User, DollarSign } from 'lucide-react'
import { useToast, ToastContainer } from '@/components/toast'

interface User {
  id: number
  login: string
  name: string
  position: string
  role: string
  rate: number | null
  created_at: string
  rates: { id: number, rate: number, valid_from: string }[]
}

interface UserRate {
  id: number
  rate: number
  valid_from: string
}


export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toasts, success, error, removeToast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
  const [showRateModal, setShowRateModal] = useState(false)
  const [rateUser, setRateUser] = useState<User | null>(null)
  const [editingRate, setEditingRate] = useState<UserRate | null>(null)
  const [rateFormData, setRateFormData] = useState({ rate: '', valid_from: '' })
  const [rateModalRates, setRateModalRates] = useState<UserRate[]>([])
  const [formData, setFormData] = useState({
    login: '',
    password: '',
    name: '',
    position: '',
    role: 'user'
  })
  const [editFormData, setEditFormData] = useState({
    login: '',
    password: '',
    name: '',
    position: ''
  })

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      // @ts-expect-error: тадо
    } else if (session.user.role !== 'admin' && session.user.role !== 'moderator') {
      router.push('/dashboard')
    } else {
      fetchUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      
      if (response.ok) {
        setUsers(data)
      } else {
        error(`Ошибка: ${data.error}`)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      error('Ошибка при загрузке пользователей')
    } finally {
      setLoading(false)
    }
  }


  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowCreateForm(false)
        setFormData({ login: '', password: '', name: '', position: '', role: 'user' })
        fetchUsers()
        success('Пользователь создан успешно')
      } else {
        const errorData = await response.json()
        error(`Ошибка: ${errorData.error}`)
      }
    } catch (err) {
      console.error('Error creating user:', err)
      error('Ошибка при создании пользователя')
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingUser) return

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      })

      if (response.ok) {
        setShowEditModal(false)
        setEditingUser(null)
        setEditFormData({ login: '', password: '', name: '', position: '' })
        fetchUsers()
        success('Пользователь обновлен успешно')
      } else {
        const errorData = await response.json()
        error(`Ошибка: ${errorData.error}`)
      }
    } catch (err) {
      console.error('Error updating user:', err)
      error('Ошибка при обновлении пользователя')
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchUsers()
        success('Пользователь удален успешно')
      } else {
        const errorData = await response.json()
        error(`Ошибка: ${errorData.error}`)
      }
    } catch (err) {
      console.error('Error deleting user:', err)
      error('Ошибка при удалении пользователя')
    }
  }

  const startEdit = (user: User) => {
    setEditingUser(user)
    setEditFormData({
      login: user.login,
      password: '', // Пароль не показываем, оставляем пустым
      name: user.name,
      position: user.position
    })
    setShowEditModal(true)
  }

  const startRateEdit = async (user: User, rate?: UserRate) => {
    setRateUser(user)
    setEditingRate(rate || null)
    if (rate) {
      setRateFormData({ 
        rate: rate.rate.toString(), 
        valid_from: new Date(rate.valid_from).toISOString().split('T')[0] 
      })
    } else {
      setRateFormData({ rate: '', valid_from: new Date().toISOString().split('T')[0] })
    }
    
    // Загружаем историю ставок
    try {
      const response = await fetch(`/api/users/${user.id}/rates`)
      if (response.ok) {
        const rates = await response.json()
        setRateModalRates(rates)
      }
    } catch (err) {
      console.error('Error fetching rates:', err)
      setRateModalRates([])
    }
    
    setShowRateModal(true)
  }

  const cancelRateEdit = () => {
    setShowRateModal(false)
    setRateUser(null)
    setEditingRate(null)
    setRateFormData({ rate: '', valid_from: '' })
    setRateModalRates([])
  }

  const cancelEdit = () => {
    setShowEditModal(false)
    setEditingUser(null)
    setEditFormData({ login: '', password: '', name: '', position: '' })
  }

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!rateUser) return

    if (!rateFormData.rate || !rateFormData.valid_from) {
      error('Заполните все поля')
      return
    }

    try {
      let response
      if (editingRate) {
        // Обновляем существующую ставку
        response = await fetch(`/api/users/${rateUser.id}/rates`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rateId: editingRate.id,
            rate: parseFloat(rateFormData.rate),
            valid_from: new Date(rateFormData.valid_from).toISOString()
          })
        })
      } else {
        // Создаем новую ставку
        response = await fetch(`/api/users/${rateUser.id}/rates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rate: parseFloat(rateFormData.rate),
            valid_from: new Date(rateFormData.valid_from).toISOString()
          })
        })
      }

      if (response.ok) {
        success(editingRate ? 'Ставка обновлена успешно' : 'Ставка добавлена успешно')
        
        // Перезагружаем список пользователей для обновления данных
        fetchUsers()
        
        // Обновляем историю ставок в модальном окне ставок
        try {
          const ratesResponse = await fetch(`/api/users/${rateUser.id}/rates`)
          if (ratesResponse.ok) {
            const rates = await ratesResponse.json()
            setRateModalRates(rates)
          }
        } catch (err) {
          console.error('Error fetching updated rates:', err)
        }
        
        // Сбрасываем форму добавления новой ставки
        setEditingRate(null)
        setRateFormData({ rate: '', valid_from: new Date().toISOString().split('T')[0] })
      } else {
        const errorData = await response.json()
        error(`Ошибка: ${errorData.error}`)
      }
    } catch (err) {
      console.error('Error updating rate:', err)
      error('Ошибка при сохранении ставки')
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

  // @ts-expect-error: тадо
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'moderator')) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="pl-1">
              <h1 className="text-3xl font-bold text-gray-900">Штат</h1>
              <p className="mt-2 text-gray-600">Управление сотрудниками</p>
            </div>
            
            {/* @ts-expect-error: тадо */}
            {session.user.role === 'admin' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Добавить сотрудника</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">

            {/* Форма создания пользователя */}
            {showCreateForm && (
              <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Создать нового пользователя
                      </h3>
                      <button
                        onClick={() => setShowCreateForm(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Логин</label>
                          <input
                            type="text"
                            value={formData.login}
                            onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 transition-colors"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 transition-colors"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Имя</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 transition-colors"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Должность</label>
                          <input
                            type="text"
                            value={formData.position}
                            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 transition-colors"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Роль</label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                              className="w-full px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg text-left font-medium text-gray-900 hover:border-indigo-400 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between cursor-pointer"
                            >
                              <span className="flex items-center space-x-2">
                                <User className="w-4 h-4 text-indigo-600" />
                                <span>{formData.role === 'admin' ? 'Администратор' : formData.role === 'moderator' ? 'Модератор' : 'Пользователь'}</span>
                              </span>
                              <ChevronDown className={`w-4 h-4 text-indigo-600 transition-transform flex-shrink-0 ml-2 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isRoleDropdownOpen && (
                              <div className="absolute top-full left-0 mt-2 w-full bg-white border border-indigo-200 rounded-lg shadow-lg z-50">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, role: 'user' })
                                    setIsRoleDropdownOpen(false)
                                  }}
                                  className={`w-full px-4 py-3 text-left transition-all hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 font-medium ${
                                    formData.role === 'user'
                                      ? 'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-900'
                                      : 'text-gray-700 hover:text-indigo-700'
                                  }`}
                                >
                                  <span className="flex items-center space-x-3">
                                    {formData.role === 'user' && (
                                      <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                                    )}
                                    <span>Пользователь</span>
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, role: 'moderator' })
                                    setIsRoleDropdownOpen(false)
                                  }}
                                  className={`w-full px-4 py-3 text-left transition-all hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 font-medium ${
                                    formData.role === 'moderator'
                                      ? 'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-900'
                                      : 'text-gray-700 hover:text-indigo-700'
                                  }`}
                                >
                                  <span className="flex items-center space-x-3">
                                    {formData.role === 'moderator' && (
                                      <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                                    )}
                                    <span>Модератор</span>
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, role: 'admin' })
                                    setIsRoleDropdownOpen(false)
                                  }}
                                  className={`w-full px-4 py-3 text-left transition-all hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 font-medium ${
                                    formData.role === 'admin'
                                      ? 'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-900'
                                      : 'text-gray-700 hover:text-indigo-700'
                                  }`}
                                >
                                  <span className="flex items-center space-x-3">
                                    {formData.role === 'admin' && (
                                      <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                                    )}
                                    <span>Администратор</span>
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-3 pt-6">
                        <button
                          type="submit"
                          className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                        >
                          <Save className="w-4 h-4" />
                          <span>Создать</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateForm(false)}
                          className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                        >
                          <X className="w-4 h-4" />
                          <span>Отмена</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Список пользователей */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Логин</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Имя</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Должность</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ставка</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Роль</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Создан</th>
                    {/* @ts-expect-error: тадо */}
                    {session.user.role === 'admin' && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.login}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.position}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.rate ? (
                          <span className="font-medium">{user.rate} ₽/ч</span>
                        ) : (
                          <span className="text-gray-400">Не указана</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-red-100 text-red-800' 
                            : user.role === 'moderator'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role === 'admin' ? 'Администратор' : user.role === 'moderator' ? 'Модератор' : 'Пользователь'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      {/* @ts-expect-error: тадо */}
                      {session.user.role === 'admin' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 text-right">
                          {/* @ts-expect-error: тадо */}
                          {user.role === 'admin' && user.id !== parseInt(session?.user?.id || '0') ? (
                            <span className="text-gray-400 text-sm">Недоступно</span>
                          ) : (
                            <div className="flex space-x-2 justify-end">
                              <button
                                onClick={() => startRateEdit(user)}
                                className="p-1 text-green-600 hover:text-green-900 hover:bg-green-50 rounded transition-colors cursor-pointer"
                                title="Изменить ставку"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => startEdit(user)}
                                className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                title="Редактировать"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {user.role !== 'admin' ? (
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="Удалить"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <div className="p-1 text-gray-300 cursor-not-allowed" title="Удаление недоступно">
                                  <Trash2 className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Модальное окно редактирования */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 ease-out scale-100 opacity-100 border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Редактировать пользователя: {editingUser.login}
                </h3>
                <button
                  onClick={cancelEdit}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Логин</label>
                  <input
                    type="text"
                    value={editFormData.login}
                    onChange={(e) => setEditFormData({ ...editFormData, login: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Новый пароль (оставьте пустым, чтобы не менять)</label>
                  <input
                    type="password"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 transition-colors"
                    placeholder="Введите новый пароль или оставьте пустым"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Имя</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Должность</label>
                  <input
                    type="text"
                    value={editFormData.position}
                    onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 transition-colors"
                    required
                  />
                </div>
                <div className="flex space-x-3 pt-6">
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    <Save className="w-4 h-4" />
                    <span>Сохранить</span>
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    <X className="w-4 h-4" />
                    <span>Отмена</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно изменения ставки */}
      {showRateModal && rateUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out scale-100 opacity-100 border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Ставки: {rateUser.name}
                </h3>
                <button
                  onClick={cancelRateEdit}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Форма добавления новой ставки */}
              <div className="mb-8 pb-8 border-b border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  {editingRate ? 'Редактирование ставки' : 'Добавить ставку'}
                </h4>
                <form onSubmit={handleUpdateRate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ставка в час (₽)</label>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      value={rateFormData.rate}
                      onChange={(e) => setRateFormData({ ...rateFormData, rate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 transition-colors"
                      placeholder="Например: 1500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Действует с</label>
                    <input
                      type="date"
                      value={rateFormData.valid_from}
                      onChange={(e) => setRateFormData({ ...rateFormData, valid_from: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 transition-colors"
                      required
                    />
                    <p className="mt-1 text-sm text-gray-500">Можно указать дату из прошлого или будущего</p>
                  </div>
                  <div className="flex space-x-3 pt-2">
                    <button
                      type="submit"
                      className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingRate ? 'Изменить' : 'Добавить'}</span>
                    </button>
                    {editingRate && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRate(null)
                          setRateFormData({ rate: '', valid_from: new Date().toISOString().split('T')[0] })
                        }}
                        className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                      >
                        <X className="w-4 h-4" />
                        <span>Отмена</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>
              
              {/* История ставок */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">История ставок</h4>
                {rateModalRates.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ставка</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действует с</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rateModalRates.map((rate) => (
                          <tr key={rate.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {rate.rate} ₽/ч
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(rate.valid_from).toLocaleDateString('ru-RU')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              <button
                                onClick={() => startRateEdit(rateUser, rate)}
                                className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 p-1 rounded transition-colors cursor-pointer"
                                title="Редактировать"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">История ставок отсутствует</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
