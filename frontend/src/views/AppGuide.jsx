import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { getLang, useLang } from '../lib/i18n.js'

const destinations = [
  { id: 'home', path: '/home', icon: 'house' },
  { id: 'plan', path: '/plan', icon: 'calendar' },
  { id: 'workout', path: '/workout', icon: 'dumbbell' },
  { id: 'exercises', path: '/library', icon: 'list' },
  { id: 'stats', path: '/stats', icon: 'chart' },
  { id: 'history', path: '/history', icon: 'history' },
  { id: 'settings', path: '/settings', icon: 'gear' },
]

const shortcuts = [
  { id: 'workout', path: '/workout', icon: 'dumbbell' },
  { id: 'addExercise', path: '/library?guide=add-to-plan', icon: 'plus' },
  { id: 'history', path: '/history', icon: 'history' },
]

const guide = {
  en: {
    title: 'App guide',
    shortTitle: 'Guide',
    language: 'Guide language',
    shortcutsTitle: 'What would you like to do?',
    shortcuts: {
      workout: 'I want to work out',
      addExercise: 'I want to add an exercise to my plan',
      history: 'I want to see a past workout',
    },
    addToPlan: {
      title: 'Add an exercise to your plan',
      instruction: 'Search for an exercise, tap “Plan” beside it, then choose a routine or create a new one.',
      close: 'Dismiss tip',
    },
    quickStart: 'Your first workout',
    steps: [
      ['Plan', 'Create a routine or load the starter plan. Use the week schedule to assign it to a day.'],
      ['Start', 'Tap Start in the bottom bar to open today’s routine. To choose another routine or a freestyle workout, use “Choose a different workout” on Home.'],
      ['Finish', 'Enter the weight and reps, tick off each completed set, then tap “Finish workout” to save the session to History.'],
    ],
    libraryTips: [
      ['Search', 'Type a Persian or English name.'],
      ['Filter', 'Narrow results by body part, equipment or category, or choose “By muscle.” If your equipment profile hides results, tap “Show all equipment.”'],
      ['Save or add', 'Open a result to star it. Tap “Plan” beside a result to add it to a routine.'],
    ],
    sectionsTitle: 'Where to go',
    sections: {
      home: ['Home', 'See today’s session and your week at a glance. Tap a day to reschedule that day. Log body weight here if the card is enabled.'],
      plan: ['Plan', 'Build reusable routines and assign them to days of the week. Tap a routine to edit it. If Coach is available, open it from the top of Plan.'],
      workout: ['Start or resume', 'Choose a routine, start freestyle and pick exercises as you go, or return to a session in progress with “Resume.”'],
      exercises: ['Exercises', 'Find exercises by name or muscle, filter by equipment, mark favourites and add exercises to a routine.'],
      stats: ['Stats', 'See how your training changes over time. Use the History icon at the top of Stats to find saved sessions.'],
      history: ['History', 'Open a saved workout to see what you logged, or choose “Log a past workout” to add a session you missed.'],
      settings: ['Settings', 'Open the gear on Home to change the app language, weight units, timer and equipment profile. Use Account data management to download a personal backup.'],
    },
  },
  fa: {
    title: 'راهنمای برنامه',
    shortTitle: 'راهنما',
    language: 'زبان راهنما',
    shortcutsTitle: 'می‌خواهید چه کاری انجام دهید؟',
    shortcuts: {
      workout: 'می‌خواهم تمرین کنم',
      addExercise: 'می‌خواهم یک حرکت به برنامه‌ام اضافه کنم',
      history: 'می‌خواهم تمرین قبلی‌ام را ببینم',
    },
    addToPlan: {
      title: 'افزودن حرکت به برنامه',
      instruction: 'حرکت را جست‌وجو کنید، «برنامه» کنار آن را بزنید و برنامهٔ مقصد را انتخاب کنید یا همان‌جا یک برنامهٔ جدید بسازید.',
      close: 'بستن نکته',
    },
    quickStart: 'اولین جلسهٔ تمرین',
    steps: [
      ['برنامه', 'یک برنامهٔ تمرینی بسازید یا «بارگذاری الگوی شروع» را بزنید. سپس در «زمان‌بندی هفتگی» آن را به یک روز اختصاص دهید.'],
      ['شروع', 'برای باز کردن برنامهٔ امروز، «شروع» را در نوار پایین بزنید. برای انتخاب برنامه‌ای دیگر یا تمرین آزاد، در «خانه» روی «انتخاب تمرین دیگر» بزنید.'],
      ['پایان', 'وزنه و تکرار را وارد کنید، هر ست انجام‌شده را تیک بزنید و «پایان تمرین» را بزنید تا جلسه در تاریخچه ذخیره شود.'],
    ],
    libraryTips: [
      ['جست‌وجو', 'نام فارسی یا انگلیسی حرکت را وارد کنید.'],
      ['فیلتر', 'از فیلترهای بخش بدن، تجهیزات و دسته یا گزینهٔ «بر اساس عضله» استفاده کنید. اگر پروفایل تجهیزات نتایج را محدود کرده، «نمایش همهٔ تجهیزات» را بزنید.'],
      ['علاقه‌مندی و افزودن', 'برای ستاره‌دار کردن، حرکت را باز کنید. برای افزودن به برنامهٔ تمرینی، «برنامه» کنار حرکت را بزنید.'],
    ],
    sectionsTitle: 'هر بخش چه کاری انجام می‌دهد؟',
    sections: {
      home: ['خانه', 'جلسهٔ امروز و خلاصهٔ هفته را ببینید. برای جابه‌جایی تمرین یک روز، همان روز را بزنید. اگر کارت وزن بدن فعال باشد، وزن‌تان را هم اینجا ثبت کنید.'],
      plan: ['برنامه', 'برنامهٔ تمرینی بسازید و آن را به روزهای هفته اختصاص دهید. برای ویرایش، روی نام برنامه بزنید. اگر «مربی» فعال باشد، بالای همین صفحه پیدایش می‌کنید.'],
      workout: ['شروع یا ادامهٔ تمرین', 'یک برنامه انتخاب کنید، در تمرین آزاد حرکت‌ها را حین جلسه اضافه کنید یا با «ادامه» به جلسهٔ در حال انجام برگردید.'],
      exercises: ['حرکت‌ها', 'حرکت‌ها را با نام یا عضله پیدا کنید، بر اساس تجهیزات فیلتر کنید و حرکت دلخواه را ستاره‌دار کنید یا به برنامهٔ تمرینی بیفزایید.'],
      stats: ['آمار', 'روند تمرین‌هایتان را در طول زمان ببینید. نماد تاریخچه بالای صفحه، جلسه‌های ذخیره‌شده را باز می‌کند.'],
      history: ['تاریخچه', 'یک جلسهٔ ذخیره‌شده را باز کنید تا جزئیات ثبت‌شده را ببینید. برای اضافه کردن جلسه‌ای که جا افتاده، «ثبت تمرین گذشته» را بزنید.'],
      settings: ['تنظیمات', 'با چرخ‌دندهٔ صفحهٔ خانه وارد تنظیمات شوید. زبان برنامه، واحد وزن، تایمر و پروفایل تجهیزات را از اینجا تغییر دهید. از «مدیریت داده‌های حساب» می‌توانید نسخهٔ پشتیبان شخصی بگیرید.'],
    },
  },
}

export function AppGuideButton({ fromLibrary = false }) {
  const navigate = useNavigate()
  const copy = guide[getLang()] ?? guide.en
  return (
    <Button size="sm" variant="tinted" icon="info" className="app-guide-button" aria-label={copy.title}
      onClick={() => navigate(fromLibrary ? '/guide?from=library' : '/guide')}>
      {copy.shortTitle}
    </Button>
  )
}

export function AddExerciseToPlanTip({ onDismiss }) {
  const lang = getLang() === 'fa' ? 'fa' : 'en'
  const { title, instruction, close } = guide[lang].addToPlan
  return (
    <aside className="library-plan-tip" dir={lang === 'fa' ? 'rtl' : 'ltr'} lang={lang} aria-labelledby="library-plan-tip-title">
      <div>
        <h2 id="library-plan-tip-title">{title}</h2>
        <p>{instruction}</p>
      </div>
      <button className="iconbtn" type="button" onClick={onDismiss} aria-label={close}><Icon name="xmark" /></button>
    </aside>
  )
}

export default function AppGuide() {
  const { search } = useLocation()
  const fromLibrary = new URLSearchParams(search).get('from') === 'library'
  useLang()
  const [selectedLanguage, setSelectedLanguage] = useState(null)
  const lang = selectedLanguage ?? (getLang() === 'fa' ? 'fa' : 'en')
  const rtl = lang === 'fa'
  const copy = guide[lang]
  const heading = useRef(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])

  const back = fromLibrary ? '/library' : '/home'
  const backLabel = copy.sections[fromLibrary ? 'exercises' : 'home'][0]
  const sections = fromLibrary ? destinations.filter(({ id }) => id !== 'exercises') : destinations

  const card = ({ id, path, icon }) => (
    <Link className="app-guide-card" to={path} aria-labelledby={`app-guide-${id}-title`} aria-describedby={`app-guide-${id}-desc`} key={id}>
      <span className="app-guide-card-icon"><Icon name={icon} /></span>
      <div>
        <h3 id={`app-guide-${id}-title`}>{copy.sections[id][0]}</h3>
        <p id={`app-guide-${id}-desc`}>{copy.sections[id][1]}</p>
      </div>
      <Icon className="app-guide-card-arrow" name={rtl ? 'chevronLeft' : 'chevronRight'} />
    </Link>
  )

  return (
    <main className="narrow app-guide" dir={rtl ? 'rtl' : 'ltr'} lang={lang}>
      <div className="app-guide-toolbar">
        <Link className="app-guide-back" to={back}><Icon name={rtl ? 'chevronRight' : 'chevronLeft'} />{backLabel}</Link>
        <div className="app-guide-languages" role="group" aria-label={copy.language} dir="ltr">
          <button type="button" lang="en" aria-pressed={!rtl} onClick={() => setSelectedLanguage('en')}>English</button>
          <button type="button" lang="fa" dir="rtl" aria-pressed={rtl} onClick={() => setSelectedLanguage('fa')}>فارسی</button>
        </div>
      </div>
      <h1 ref={heading} tabIndex={-1}>{copy.title}</h1>
      <nav className="app-guide-shortcuts" aria-labelledby="app-guide-shortcuts">
        <h2 id="app-guide-shortcuts">{copy.shortcutsTitle}</h2>
        {shortcuts.map(({ id, path, icon }) => (
          <Link to={path} key={id}>
            <Icon name={icon} />
            <span>{copy.shortcuts[id]}</span>
            <Icon name={rtl ? 'chevronLeft' : 'chevronRight'} className="app-guide-card-arrow" />
          </Link>
        ))}
      </nav>
      {fromLibrary && (
        <section aria-labelledby="app-guide-library" className="app-guide-start">
          <h2 id="app-guide-library">{copy.sections.exercises[0]}</h2>
          <ul>
            {copy.libraryTips.map(([label, instruction]) => <li key={label}><strong>{label}</strong><span>{instruction}</span></li>)}
          </ul>
        </section>
      )}
      <section aria-labelledby="app-guide-start" className="app-guide-start">
        <h2 id="app-guide-start">{copy.quickStart}</h2>
        <ol>
          {copy.steps.map(([label, instruction]) => <li key={label}><strong>{label}</strong><span>{instruction}</span></li>)}
        </ol>
      </section>
      <section aria-labelledby="app-guide-sections">
        <h2 id="app-guide-sections">{copy.sectionsTitle}</h2>
        <div className="app-guide-grid">{sections.map(card)}</div>
      </section>
    </main>
  )
}
