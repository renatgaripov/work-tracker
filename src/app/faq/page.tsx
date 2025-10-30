'use client'

import Navigation from '@/components/navigation'

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">FAQ / Руководство по системе</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Роли и общий процесс</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><span className="font-semibold">Руководитель</span> запрашивает у <span className="font-semibold">Администратора</span> создание учётки <span className="font-semibold">Сотрудника</span> и выставление почасовой ставки.</li>
              <li>После создания учётки <span className="font-semibold">Сотрудник</span> обязан сразу сменить пароль в разделе «Сменить пароль».</li>
              <li><span className="font-semibold">Руководитель</span> отслеживает по календарю активность своей команды, смотрит статистику и графики, отмечает аппрувленные работы как оплаченные.</li>
              <li><span className="font-semibold">Сотрудники</span> трекают свою работу в календаре: фиксируют время и добавляют комментарии к задачам.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Права и ограничения</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><span className="font-semibold">Сотрудник</span> видит только свою статистику: заработок, часы и записи.</li>
              <li><span className="font-semibold">Сотрудник</span> может редактировать или удалить свой трекинг прямо в ячейке календаря, но только до момента его оплаты.</li>
              <li><span className="font-semibold">Руководитель</span> не может редактировать треки <span className="font-semibold">Сотрудников</span>.</li>
              <li><span className="font-semibold">Руководитель</span> может инициировать изменение ставки часа через запрос к <span className="font-semibold">Администратору</span>.</li>
              <li><span className="font-semibold">Руководитель</span> и <span className="font-semibold">Администратор</span> могут помечать аппрувленные записи как оплаченные. После оплаты запись становится неизменяемой.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Где что находится</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Раздел «Дашборд» — календарь и основная рабочая страница.</li>
              <li>Раздел «Работа» — детализация по людям, статистика и оплата аппрувленных записей (для <span className="font-semibold">Руководителей</span> и <span className="font-semibold">Администраторов</span>).</li>
              <li>Раздел «Аналитика» — сводные графики и показатели.</li>
              <li>Раздел «Штат» — просмотр для <span className="font-semibold">Руководителей</span>; полное управление у <span className="font-semibold">Администратора</span>. Отсюда админ и руководитель могут открыть личный кабинет любого сотрудника (иконка профиля в строке).</li>
              <li>Раздел «Сменить пароль» — смена пароля для любого пользователя после первого входа и далее при необходимости.</li>
              <li>Личный кабинет — персональная страница сотрудника с текущей ставкой, стажем, сводкой по часам (всего/оплачено/не оплачено), финансам и историей ставок.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Быстрые правила</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Оплаченные записи нельзя редактировать или удалять.</li>
              <li>Сотрудник имеет доступ только к своим данным.</li>
              <li>Руководители не меняют треки, только их апрув/оплата и аналитика.</li>
              <li>Изменение ставки производится только через администратора.</li>
              <li>Пароль меняем сразу после получения учётки.</li>
              <li>Иконка профиля в меню кликабельна только у роли «Сотрудник»; у админа/руководителя — серая и неактивная. В кабинет сотрудника админ/руководитель заходят из раздела «Штат».</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}


