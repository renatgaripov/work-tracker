'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { User as UserIcon, DollarSign, Clock3, CalendarClock, History, CircleDollarSign, ClipboardList, CheckCircle2, XCircle } from 'lucide-react'

type Rate = { id: number; rate: number; valid_from: string }
type TimeTrack = {
  id: number
  user_id: number
  date: string
  time: number
  comment: string
  was_paid: boolean
}

function getRateForDate(rates: Rate[], date: Date): number | null {
  if (!rates || rates.length === 0) return null
  const target = rates
    .map(r => ({ ...r, valid_from: new Date(r.valid_from) }))
    .filter(r => r.valid_from <= date)
    .sort((a, b) => b.valid_from.getTime() - a.valid_from.getTime())
  return target.length > 0 ? target[0].rate : null
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [userInfo, setUserInfo] = useState<{
    id: number
    login: string
    name: string
    position: string
    role: string
    created_at: string
    rates: Rate[]
    timeTracksCount: number
  } | null>(null)
  const [tracks, setTracks] = useState<TimeTrack[]>([])
  const [loading, setLoading] = useState(true)

  const formatInt = (value: number) => value.toLocaleString('ru-RU')
  const formatMoney = (value: number) => `${Math.round(value).toLocaleString('ru-RU')} ₽`

  useEffect(() => {
    if (status === 'loading') return
    // доступно только для сотрудников
    if (!session) {
      router.push('/login')
      return
    }
    const userWithRole = session.user as unknown as { role: string }
    if (userWithRole.role !== 'user') {
      router.push('/dashboard')
      return
    }

    const load = async () => {
      try {
        const meRes = await fetch('/api/users/me')
        if (!meRes.ok) throw new Error('me failed')
        const me = await meRes.json()
        setUserInfo(me)

        const ttRes = await fetch(`/api/time-tracks?userId=${me.id}`)
        if (!ttRes.ok) throw new Error('tracks failed')
        const tts = await ttRes.json()
        setTracks(tts)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [session, status, router])

  if (loading || !userInfo) {
    return (
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`h-12 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} animate-pulse rounded`} />
          ))}
        </div>
      </div>
    )
  }

  const rates = userInfo.rates
  const totalTracks = tracks.length
  const paidTracks = tracks.filter(t => t.was_paid).length
  const unpaidTracks = totalTracks - paidTracks
  const totalMinutes = tracks.reduce((s, t) => s + t.time, 0)
  const totalHours = totalMinutes / 60
  const paidMinutes = tracks.filter(t => t.was_paid).reduce((s, t) => s + t.time, 0)
  const unpaidMinutes = totalMinutes - paidMinutes
  const paidHours = paidMinutes / 60
  const unpaidHours = unpaidMinutes / 60

  let totalEarnings = 0
  let unpaidEarnings = 0
  for (const tr of tracks) {
    const d = new Date(tr.date)
    const rate = getRateForDate(rates, d) || 0
    const earn = (tr.time / 60) * rate
    totalEarnings += earn
    if (!tr.was_paid) unpaidEarnings += earn
  }

  const currentRate = getRateForDate(rates, new Date()) || 0

  // Стаж
  const firstTrackDate = tracks.length ? new Date(Math.min(...tracks.map(t => new Date(t.date).getTime()))) : null
  const createdAt = new Date(userInfo.created_at)
  const tenureStart = firstTrackDate ? (firstTrackDate < createdAt ? firstTrackDate : createdAt) : createdAt
  const tenureDays = Math.max(0, Math.floor((Date.now() - tenureStart.getTime()) / (1000 * 60 * 60 * 24)))
  const tenureYears = Math.floor(tenureDays / 365)
  const tenureMonths = Math.floor((tenureDays % 365) / 30)

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
      <div className="flex items-center space-x-3 mb-6">
        <UserIcon className="w-8 h-8 text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-900">Личный кабинет</h2>
      </div>

      <form className="space-y-6">
        {/* Основная информация - полосатая сетка */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border rounded-lg overflow-hidden">
          {[
            { label: 'ID пользователя', value: userInfo.id },
            { label: 'Логин', value: userInfo.login },
            { label: 'Имя', value: userInfo.name },
            { label: 'Должность', value: userInfo.position },
            { label: 'Роль', value: userInfo.role === 'admin' ? 'Администратор' : userInfo.role === 'moderator' ? 'Руководитель' : 'Сотрудник' },
            { 
              label: 'Текущая ставка (₽/ч)', 
              value: formatInt(currentRate),
              icon: <DollarSign className="w-4 h-4 text-emerald-600" />
            },
          ].map((item, index) => (
            <div 
              key={item.label} 
              className={`p-4 flex items-start ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
            >
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {item.icon && <span className="mr-1">{item.icon}</span>}
                  {item.label}
                </label>
                <div className="text-gray-900">{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Стаж - как отдельная полосатая строка */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border rounded-lg overflow-hidden">
          <div className="p-4 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-1">Стаж работы (с)</label>
            <div className="text-gray-900">{new Date(tenureStart).toLocaleDateString('ru-RU')}</div>
          </div>
          <div className="p-4 bg-white">
            <label className="block text-sm font-medium text-gray-700 mb-1">Стаж</label>
            <div className="text-gray-900">
              {tenureYears > 0 && `${tenureYears} лет `}
              {tenureMonths > 0 && `${tenureMonths} мес.`}
            </div>
          </div>
        </div>

        {/* Треки времени - полосатые карточки */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Трекинг времени</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-50 flex items-center">
              <ClipboardList className="w-5 h-5 text-indigo-600 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Всего треков</div>
                <div className="text-gray-900 font-medium">{formatInt(totalTracks)}</div>
              </div>
            </div>
            <div className="p-4 bg-white flex items-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Оплачено</div>
                <div className="text-gray-900 font-medium">{formatInt(paidTracks)}</div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex items-center">
              <XCircle className="w-5 h-5 text-red-600 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Не оплачено</div>
                <div className="text-gray-900 font-medium">{formatInt(unpaidTracks)}</div>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-0 border rounded-lg overflow-hidden">
            <div className="p-4 bg-white flex items-center">
              <Clock3 className="w-5 h-5 text-indigo-600 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Всего часов</div>
                <div className="text-gray-900 font-medium">{totalHours.toFixed(1)}</div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex items-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Оплачено</div>
                <div className="text-gray-900 font-medium">{paidHours.toFixed(1)}</div>
              </div>
            </div>
            <div className="p-4 bg-white flex items-center">
              <XCircle className="w-5 h-5 text-red-600 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Не оплачено</div>
                <div className="text-gray-900 font-medium">{unpaidHours.toFixed(1)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Финансы - полосатые карточки */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Финансовая информация</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-50 flex items-center">
              <CalendarClock className="w-5 h-5 text-emerald-600 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Всего заработано</div>
                <div className="text-gray-900 font-medium">{formatMoney(totalEarnings)}</div>
              </div>
            </div>
            <div className="p-4 bg-white flex items-center">
              <CircleDollarSign className="w-5 h-5 text-red-600 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Ожидает оплаты</div>
                <div className="text-gray-900 font-medium">{formatMoney(unpaidEarnings)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* История ставок - полосатая таблица */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center space-x-2">
            <History className="w-5 h-5 text-gray-600" />
            <span>История ставок</span>
          </h3>
          {userInfo.rates.length === 0 ? (
            <div className="text-sm text-gray-500">История ставок отсутствует</div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ставка (₽/ч)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">С даты</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {userInfo.rates.map((r, index) => (
                    <tr key={r.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{formatInt(r.rate)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{new Date(r.valid_from).toLocaleDateString('ru-RU')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}