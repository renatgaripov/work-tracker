'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, User, BarChart3, Home, Users, TrendingUp, Lock } from 'lucide-react'
import { config } from '@/lib/config'

export default function Navigation() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const navItems = [
    {
      name: 'Дашборд',
      href: '/dashboard',
      icon: Home,
      current: pathname === '/dashboard'
    },
    {
      name: 'Работа',
      href: '/work',
      icon: BarChart3,
      current: pathname === '/work'
    },
    {
      name: 'Аналитика',
      href: '/analytics',
      icon: TrendingUp,
      current: pathname === '/analytics'
    },
    // @ts-expect-error: тадо
    ...(session?.user?.role === 'admin' || session?.user?.role === 'moderator' ? [{
      name: 'Штат',
      href: '/users',
      icon: Users,
      current: pathname === '/users'
    }] : []),
    {
      name: 'FAQ',
      href: '/faq',
      icon: TrendingUp,
      current: pathname === '/faq'
    },
  ]

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {config.company_name}
              </h1>
            </div>
            
            <div className="flex space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.name}
                    onClick={() => router.push(item.href)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                      item.current
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/profile')}
              className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <User className="w-5 h-5 text-gray-500" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{session?.user.name}</p>
                <p className="text-xs text-gray-500">{session?.user.role === 'admin' ? 'Администратор' : session?.user.role === 'moderator' ? 'Руководитель' : 'Сотрудник'}</p>
              </div>
            </button>
            
            <button
              onClick={() => router.push('/change-password')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <Lock className="w-5 h-5" />
              <span>Сменить пароль</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
