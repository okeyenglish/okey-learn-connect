import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import bbbLogin from "@/assets/bbb-login.png";
import bbbRoom from "@/assets/bbb-room.png";
import bbbAudioChoice from "@/assets/bbb-audio-choice.png";
import bbbMicPermission from "@/assets/bbb-mic-permission.png";
import bbbMainScreen from "@/assets/bbb-main-screen.png";
import bbbControls from "@/assets/bbb-controls.png";
import bbbTools from "@/assets/bbb-tools.png";

export default function CallsForTeachers() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Инструкция для преподавателя</h1>
          <p className="text-xl text-muted-foreground">Как проводить онлайн-уроки</p>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-8 pr-4">
            {/* Пример комнаты */}
            <Card className="p-6">
              <p className="text-muted-foreground">
                Пример комнаты:{" "}
                <code className="bg-muted px-2 py-1 rounded text-sm">
                  https://calls.okey-english.ru/b/ann-lo3-xsl-2ra
                </code>
              </p>
            </Card>

            {/* Раздел 0 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">0</span>
                Подготовка (за 5–10 минут до урока)
              </h2>
              <Card className="p-6">
                <ul className="space-y-3 list-disc list-inside">
                  <li>Откройте <strong>Chrome</strong> или <strong>Edge</strong> (рекомендуются).</li>
                  <li>Наденьте <strong>гарнитуру</strong> (микрофон на наушниках).</li>
                  <li>Закройте лишние вкладки/запущенные звонки (Zoom/WhatsApp/Telegram).</li>
                  <li>Проверьте, что сайт может использовать микрофон/камеру:
                    <ul className="ml-6 mt-2 space-y-1">
                      <li>В адресной строке браузера нажмите на «🔒» → Разрешить <strong>Микрофон</strong> и <strong>Камеру</strong> для <code className="bg-muted px-1 rounded text-sm">calls.okey-english.ru</code>.</li>
                    </ul>
                  </li>
                  <li>При необходимости подключите кабельный интернет или будьте рядом с роутером (для стабильного WebRTC).</li>
                </ul>
              </Card>
            </section>

            <Separator />

            {/* Раздел 1 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                Вход в комнату
              </h2>
              <Card className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Вариант A — по ссылке (проще):</h3>
                  <ol className="space-y-2 list-decimal list-inside">
                    <li>Перейдите по ссылке комнаты: <code className="bg-muted px-2 py-1 rounded text-sm">https://calls.okey-english.ru/b/ann-lo3-xsl-2ra</code></li>
                    <li>Введите <strong>имя</strong>, нажмите <strong>Join</strong> / <strong>Присоединиться</strong>.</li>
                  </ol>
                  <div className="mt-4">
                    <img src={bbbLogin} alt="Вход в систему" className="rounded-lg border shadow-sm w-full" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Вариант B — через личный кабинет (Greenlight)</h3>
                  <ol className="space-y-2 list-decimal list-inside">
                    <li>Откройте <code className="bg-muted px-2 py-1 rounded text-sm">https://calls.okey-english.ru</code></li>
                    <li>Войдите (логин/пароль, если выданы): вверху <strong>Войти</strong> → введите e-mail и пароль.</li>
                    <li>Зайдите в свою комнату и нажмите <strong>Старт</strong> → откроется интерфейс.</li>
                  </ol>
                  <div className="mt-4">
                    <img src={bbbRoom} alt="Комната преподавателя" className="rounded-lg border shadow-sm w-full" />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground italic">
                  Оба варианта приведут на интерфейс системы для проведения онлайн-уроков.
                </p>
              </Card>
            </section>

            <Separator />

            {/* Раздел 2 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                Подключение звука
              </h2>
              <Card className="p-6 space-y-4">
                <ol className="space-y-3 list-decimal list-inside">
                  <li>При появлении вопроса <strong>«Как подключиться к вебинару?»</strong> выберите <strong>Микрофон</strong>.</li>
                  <li>Браузер спросит доступ: нажмите <strong>Разрешить</strong> (микрофон/камера).</li>
                  <li>Пройдите <strong>эхо-тест</strong> (вы услышите свой голос). Если слышите — нажмите <strong>Да</strong> / <strong>I hear myself</strong>.</li>
                </ol>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Выбор аудио:</p>
                    <img src={bbbAudioChoice} alt="Выбор микрофона или только слушать" className="rounded-lg border shadow-sm w-full" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Разрешение доступа:</p>
                    <img src={bbbMicPermission} alt="Разрешение микрофона" className="rounded-lg border shadow-sm w-full" />
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg mt-4">
                  <p className="font-semibold mb-2">Если не слышите:</p>
                  <ul className="space-y-2 list-disc list-inside text-sm">
                    <li>В выпадающем списке <strong>Микрофон</strong> выберите нужное устройство.</li>
                    <li>Проверьте системные настройки звука (Mic Input не «0»).</li>
                    <li>Нажмите стрелочку рядом с иконкой микрофона → <strong>Подключиться к аудио заново</strong>.</li>
                  </ul>
                </div>

                <p className="text-sm text-muted-foreground italic">
                  Если у ученика слабая связь — он может выбрать <strong>Только слушать</strong> (без микрофона).
                </p>
              </Card>
            </section>

            <Separator />

            {/* Раздел 3 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
                Базовые элементы управления (нижняя панель)
              </h2>
              <Card className="p-6 space-y-4">
                <div>
                  <img src={bbbControls} alt="Панель управления" className="rounded-lg border shadow-sm w-full mb-4" />
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-2xl">🎙️</span>
                    <div>
                      <strong>Микрофон</strong> — включить/выключить звук.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-2xl">📷</span>
                    <div>
                      <strong>Камера</strong> — включить/выключить видео.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-2xl">🖥️</span>
                    <div>
                      <strong>Демонстрация экрана</strong> — показать экран/вкладку/окно.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-2xl">⏺️</span>
                    <div>
                      <strong>Запись</strong> (если включено для комнаты) — «Включить запись».
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-2xl">↔️</span>
                    <div>
                      Стрелки слева/справа от «Слайд 1» — листать презентацию (если загружена).
                    </div>
                  </li>
                </ul>
              </Card>
            </section>

            <Separator />

            {/* Раздел 4 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
                Правая вертикальная панель инструментов
              </h2>
              <Card className="p-6 space-y-4">
                <p className="text-muted-foreground">Вы видите узкую колонку инструментов на презентации/доске:</p>
                
                <div className="grid md:grid-cols-[200px_1fr] gap-6">
                  <div>
                    <img src={bbbTools} alt="Инструменты для работы с доской" className="rounded-lg border shadow-sm w-full" />
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="text-xl">🖱️</span>
                      <div>
                        <strong>Выделение/указатель</strong> — курсор для указки.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-xl">✋</span>
                      <div>
                        <strong>Рука</strong> — «перемещение/рука» по холсту.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-xl">✏️</span>
                      <div>
                        <strong>Карандаш</strong> — рисование от руки.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-xl">⬛</span>
                      <div>
                        <strong>Прямоугольник</strong> — фигуры (прямоугольник/эллипс).
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-xl">↗️</span>
                      <div>
                        <strong>Стрелка/линия</strong> — линии/стрелки.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-xl font-bold">T</span>
                      <div>
                        <strong>Текст</strong> — текстовая аннотация.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-xl">🧽</span>
                      <div>
                        <strong>Ластик</strong> — стереть размеченные элементы.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-xl">🗑️</span>
                      <div>
                        <strong>Корзина</strong> (внизу) — очистить аннотации с текущего слайда.
                      </div>
                    </li>
                  </ul>
                </div>

                <p className="text-sm text-muted-foreground italic">
                  Эти инструменты работают на <strong>загруженной презентации</strong> или на чистой «белой доске».
                </p>
              </Card>
            </section>

            <Separator />

            {/* Раздел 5 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
                Чат, участники, заметки (левая панель)
              </h2>
              <Card className="p-6 space-y-4">
                <div>
                  <img src={bbbMainScreen} alt="Главный экран с чатом и участниками" className="rounded-lg border shadow-sm w-full mb-4" />
                </div>
                <ul className="space-y-3 list-disc list-inside">
                  <li><strong>Общий чат</strong> — сообщения всем.</li>
                  <li><strong>Пользователи</strong> — список участников; можно <strong>выключать звук</strong> учащимся, назначать <strong>презентера</strong>.</li>
                  <li><strong>Общие заметки</strong> — совместный текстовый блок (для конспектов).</li>
                </ul>
              </Card>
            </section>

            <Separator />

            {/* Раздел 6 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">6</span>
                Загрузка презентации / раздаток
              </h2>
              <Card className="p-6 space-y-3">
                <ol className="space-y-2 list-decimal list-inside">
                  <li>Откройте меню «троеточие» <strong>⋮</strong> в области презентации → <strong>Загрузить презентацию</strong>.</li>
                  <li>Выберите PDF/PPT/изображения. Система конвертирует их в слайды.</li>
                  <li>Листайте стрелками, размечайте инструментами панели справа.</li>
                </ol>
                <p className="text-sm bg-muted p-3 rounded-lg">
                  <strong>Рекомендация:</strong> заранее готовьте PDF для стабильной конвертации.
                </p>
              </Card>
            </section>

            <Separator />

            {/* Раздел 7 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">7</span>
                Демонстрация экрана
              </h2>
              <Card className="p-6">
                <ol className="space-y-2 list-decimal list-inside">
                  <li>Нажмите <strong>Демонстрация экрана</strong>.</li>
                  <li>Выберите <strong>вкладку браузера / окно / весь экран</strong>.</li>
                  <li>Нажмите <strong>Поделиться</strong>.</li>
                  <li>Чтобы остановить — снова нажмите на кнопку экрана.</li>
                </ol>
              </Card>
            </section>

            <Separator />

            {/* Раздел 8 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">8</span>
                Камеры учеников
              </h2>
              <Card className="p-6 space-y-3">
                <ul className="space-y-2 list-disc list-inside">
                  <li>Попросите ученика нажать <strong>Камера</strong> и <strong>Разрешить</strong> в браузере.</li>
                  <li>Если камера не включается — пусть перезагрузит вкладку, выберет устройство в выпадающем списке камеры, закроет другие приложения, использующие камеру.</li>
                </ul>
              </Card>
            </section>

            <Separator />

            {/* Раздел 9 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">9</span>
                Запись занятия (если доступна)
              </h2>
              <Card className="p-6 space-y-3">
                <ul className="space-y-2 list-disc list-inside">
                  <li>Вверху нажмите <strong>Включить запись</strong> → в конце <strong>Остановить запись</strong>.</li>
                  <li>Запись появится в списке «Записи комнаты» (в интерфейсе личного кабинета Greenlight) после обработки.</li>
                </ul>
              </Card>
            </section>

            <Separator />

            {/* Раздел 10 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">10</span>
                Быстрые советы по связи
              </h2>
              <Card className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="bg-orange-50 dark:bg-orange-950 border-l-4 border-orange-500 p-3 rounded">
                    <p className="font-semibold">Если эхо:</p>
                    <p className="text-sm">Кто-то слушает через колонки. Попросите надеть наушники или выключить микрофон.</p>
                  </div>

                  <div className="bg-red-50 dark:bg-red-950 border-l-4 border-red-500 p-3 rounded">
                    <p className="font-semibold mb-2">Если не слышно:</p>
                    <ul className="text-sm space-y-1 list-disc list-inside ml-2">
                      <li>Переподключите аудио (стрелка рядом с микрофоном → <strong>Подключиться заново</strong>).</li>
                      <li>Проверьте разрешение браузера «Микрофон: Разрешить» (значок «🔒» возле адреса).</li>
                      <li>На macOS: <strong>Системные настройки → Безопасность и конфиденциальность → Микрофон</strong> (разрешить Chrome).</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-950 border-l-4 border-yellow-500 p-3 rounded">
                    <p className="font-semibold">Если видео/экран не грузятся:</p>
                    <p className="text-sm">Отключите VPN/прокси; перезапустите браузер.</p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500 p-3 rounded">
                    <p className="text-sm">Стабильная работа WebRTC требует открытых исходящих <strong>UDP-портов 16384–32768</strong> (обычно у домашнего интернета всё ок).</p>
                  </div>
                </div>
              </Card>
            </section>

            <Separator />

            {/* Раздел 11 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">11</span>
                Типовой сценарий урока (шпаргалка)
              </h2>
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10">
                <ol className="space-y-3 list-decimal list-inside">
                  <li>Зашли по ссылке → <strong>Микрофон</strong> → разрешили доступ → прошли эхо-тест.</li>
                  <li>Нажали <strong>Включить запись</strong> (если нужна).</li>
                  <li><strong>Загрузили презентацию</strong> или включили <strong>Демонстрацию экрана</strong>.</li>
                  <li>Работаете с инструментами (карандаш/текст/фигуры).</li>
                  <li>В чат — ссылки на упражнения/домашнее.</li>
                  <li>В конце — <strong>Остановить запись</strong> → попрощались → закрыли вкладку.</li>
                </ol>
              </Card>
            </section>

            <Separator />

            {/* Раздел 12 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">12</span>
                Короткая памятка для ученика
              </h2>
              <Card className="p-6 bg-muted">
                <p className="text-sm mb-3 text-muted-foreground">(можно отправлять перед уроком)</p>
                <pre className="bg-background p-4 rounded-lg text-sm overflow-x-auto">
{`1) Откройте ссылку: https://calls.okey-english.ru/b/ann-lo3-xsl-2ra
2) Введите имя и нажмите Присоединиться.
3) Выберите «Микрофон» и нажмите «Разрешить» доступ к микрофону/камере.
4) Пройдите эхо-тест (если слышите себя — подтвердите).
5) Наденьте наушники. По необходимости включите камеру.`}
                </pre>
              </Card>
            </section>

            <Separator />

            {/* Раздел 13 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">13</span>
                Частые вопросы
              </h2>
              <Card className="p-6 space-y-4">
                <div>
                  <p className="font-semibold mb-2">Можно ли войти с телефона?</p>
                  <p className="text-sm text-muted-foreground">Да, через мобильный браузер (Chrome). Но для преподавателя настоятельно рекомендуется ПК/ноутбук.</p>
                </div>
                <Separator />
                <div>
                  <p className="font-semibold mb-2">Презентация не листается?</p>
                  <p className="text-sm text-muted-foreground">Убедитесь, что вы <strong>презентер</strong> (значок рядом с вашим именем) — ведущий может передавать права.</p>
                </div>
                <Separator />
                <div>
                  <p className="font-semibold mb-2">Белая доска не рисует?</p>
                  <p className="text-sm text-muted-foreground">Включите инструмент <strong>Карандаш</strong> или <strong>Текст</strong> на правой панели; проверьте, что выбран текущий слайд.</p>
                </div>
              </Card>
            </section>

            <div className="pb-8"></div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
