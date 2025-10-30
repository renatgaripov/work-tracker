'use client'

import { useEffect, useMemo, useState } from 'react'
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

  const metrics = useMemo(() => {
    if (!userInfo) return null
    const rates = userInfo.rates
    const totalTracks = tracks.length
    const paidTracks = tracks.filter(t => t.was_paid).length
    const unpaidTracks = totalTracks - paidTracks
    const totalMinutes = tracks.reduce((s, t) => s + t.time, 0)
    const totalHours = totalMinutes / 60

    // по месяцам для среднего без нулевых
    const mapMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const minutesByMonth = new Map<string, number>()
    const earningsByMonth = new Map<string, number>()

    let totalEarnings = 0
    let unpaidEarnings = 0
    for (const tr of tracks) {
      const d = new Date(tr.date)
      const rate = getRateForDate(rates, d) || 0
      const earn = (tr.time / 60) * rate
      totalEarnings += earn
      if (!tr.was_paid) unpaidEarnings += earn
      const key = mapMonthKey(d)
      minutesByMonth.set(key, (minutesByMonth.get(key) || 0) + tr.time)
      earningsByMonth.set(key, (earningsByMonth.get(key) || 0) + earn)
    }

    const nonZeroMonthsHours = Array.from(minutesByMonth.values()).filter(v => v > 0).map(v => v / 60)
    const nonZeroMonthsEarnings = Array.from(earningsByMonth.values()).filter(v => v > 0)
    const avgHoursPerMonth = nonZeroMonthsHours.length ? nonZeroMonthsHours.reduce((a, b) => a + b, 0) / nonZeroMonthsHours.length : 0
    const avgEarningsPerMonth = nonZeroMonthsEarnings.length ? nonZeroMonthsEarnings.reduce((a, b) => a + b, 0) / nonZeroMonthsEarnings.length : 0

    // стаж: с первого трека или created_at — что раньше
    const firstTrackDate = tracks.length ? new Date(Math.min(...tracks.map(t => new Date(t.date).getTime()))) : null
    const createdAt = new Date(userInfo.created_at)
    const tenureStart = firstTrackDate ? (firstTrackDate < createdAt ? firstTrackDate : createdAt) : createdAt
    const tenureDays = Math.max(0, Math.floor((Date.now() - tenureStart.getTime()) / (1000 * 60 * 60 * 24)))

    const currentRate = getRateForDate(rates, new Date()) || 0

    return {
      totalTracks,
      paidTracks,
      unpaidTracks,
      totalHours,
      totalEarnings,
      unpaidEarnings,
      avgHoursPerMonth,
      avgEarningsPerMonth,
      tenureStart,
      tenureDays,
      currentRate,
    }
  }, [tracks, userInfo])

  if (loading || !userInfo || !metrics) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 text-gray-900">
      <div className="flex items-center space-x-3">
        <UserIcon className="w-8 h-8 text-indigo-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Личный кабинет</h2>
          <p className="text-sm text-gray-600">{userInfo.name} — {userInfo.role === 'user' ? 'Сотрудник' : userInfo.role}</p>
        </div>
      </div>
      {/* Персональная информация */}
      <section className="space-y-4 bg-white rounded-lg shadow p-6">
        <h3 className="text-base font-semibold text-gray-900">Персональная информация</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="text-xs text-gray-500">ID пользователя</div>
            <div className="text-lg font-medium">{userInfo.id}</div>
          </div>
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="text-xs text-gray-500">Логин</div>
            <div className="text-lg font-medium">{userInfo.login}</div>
          </div>
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="text-xs text-gray-500">Имя</div>
            <div className="text-lg font-medium">{userInfo.name}</div>
          </div>
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="text-xs text-gray-500">Должность</div>
            <div className="text-lg font-medium">{userInfo.position}</div>
          </div>
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="text-xs text-gray-500">Роль</div>
            <div className="text-lg font-medium">{userInfo.role === 'admin' ? 'Администратор' : userInfo.role === 'moderator' ? 'Руководитель' : 'Сотрудник'}</div>
          </div>
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="text-xs text-gray-500 flex items-center space-x-2"><DollarSign className="w-4 h-4 text-emerald-600" /><span>Текущая ставка</span></div>
            <div className="text-lg font-medium flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>{formatInt(metrics.currentRate)} ₽/ч</span>
            </div>
          </div>
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="text-xs text-gray-500">Стаж работы (с)</div>
            <div className="text-lg font-medium">{new Date(metrics.tenureStart).toLocaleDateString('ru-RU')}</div>
          </div>
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="text-xs text-gray-500">Стаж</div>
            <div className="text-lg font-medium">{(() => {
              const days = metrics.tenureDays
              if (days < 30) return `${days} дн.`
              const months = Math.floor(days / 30)
              if (months < 12) return `${months} мес.`
              const years = Math.floor(months / 12)
              const restMonths = months % 12
              return restMonths > 0 ? `${years} г. ${restMonths} мес.` : `${years} г.`
            })()}</div>
          </div>
        </div>
      </section>

      {/* Время и трекинг */}
      <section className="space-y-4 bg-white rounded-lg shadow p-6">
        <h3 className="text-base font-semibold text-gray-900">Время и трекинг</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="text-xs text-gray-500 flex items-center space-x-2"><ClipboardList className="w-4 h-4 text-indigo-600" /><span>Всего треков</span></div>
            <div className="text-lg font-medium">{formatInt(metrics.totalTracks)}</div>
          </div>
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="text-xs text-gray-500 flex items-center space-x-2"><XCircle className="w-4 h-4 text-red-600" /><span>Неоплаченных треков</span></div>
            <div className="text-lg font-medium">{formatInt(metrics.unpaidTracks)}</div>
          </div>
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="text-xs text-gray-500 flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span>Оплаченных треков</span></div>
            <div className="text-lg font-medium">{formatInt(metrics.paidTracks)}</div>
          </div>
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="text-xs text-gray-500">Всего часов</div>
            <div className="text-lg font-medium flex items-center space-x-2"><Clock3 className="w-4 h-4 text-indigo-600" /><span>{metrics.totalHours.toFixed(1)}</span></div>
          </div>
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="text-xs text-gray-500">Среднее часов/мес (без нулевых)</div>
            <div className="text-lg font-medium">{metrics.avgHoursPerMonth.toFixed(1)}</div>
          </div>
        </div>
      </section>

      {/* Деньги */}
      <section className="space-y-4 bg-white rounded-lg shadow p-6">
        <h3 className="text-base font-semibold text-gray-900">Деньги</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="text-xs text-gray-500 flex items-center space-x-2"><CircleDollarSign className="w-4 h-4 text-emerald-600" /><span>Всего заработано</span></div>
            <div className="text-lg font-medium flex items-center space-x-2"><CalendarClock className="w-4 h-4 text-emerald-600" /><span>{formatMoney(metrics.totalEarnings)}</span></div>
          </div>
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="text-xs text-gray-500 flex items-center space-x-2"><CircleDollarSign className="w-4 h-4 text-indigo-600" /><span>Средняя выручка/мес (без нулевых)</span></div>
            <div className="text-lg font-medium">{formatMoney(metrics.avgEarningsPerMonth)}</div>
          </div>
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="text-xs text-gray-500 flex items-center space-x-2"><CircleDollarSign className="w-4 h-4 text-red-600" /><span>Ожидает оплаты</span></div>
            <div className="text-lg font-medium">{formatMoney(metrics.unpaidEarnings)}</div>
          </div>
        </div>
      </section>

      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center space-x-2">
          <History className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">История ставок</h3>
        </div>
        <div className="p-4">
          {userInfo.rates.length === 0 ? (
            <div className="text-sm text-gray-500">История ставок отсутствует</div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ставка</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действует с</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userInfo.rates.map((r) => (
                    <tr key={r.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.rate} ₽/ч</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(r.valid_from).toLocaleDateString('ru-RU')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


