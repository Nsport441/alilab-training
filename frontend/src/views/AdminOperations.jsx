import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const unknown = 'نامشخص'
const value = v => v == null ? unknown : String(v)
const comparisons = { same: 'یکسان', different: 'متفاوت', unknown }
const statuses = { running: 'در حال اجرا', failed: 'ناموفق', pending: 'در انتظار', stopped: 'متوقف', unknown }
const when = v => v ? new Date(v).toLocaleString('fa-IR') : unknown

export function ReleaseCenter({ tick }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    setData(null); setError(false)
    api('/api/admin/releases').then(d => { if (active) setData(d) }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [tick])
  return <section className="card" aria-labelledby="release-title">
    <h2 id="release-title">مدیریت نسخه‌ها و انتشار</h2>
    <p className="adm-lead">اطلاعات ساخت، نسخه بازشده در مرورگر و شواهد استقرار مستقل هستند. اختلاف commit به معنی جلوتر یا عقب‌تر بودن نیست.</p>
    {error && <p role="alert">دریافت اطلاعات انتشار ناموفق بود؛ وضعیت نامشخص است. دوباره تازه‌سازی کنید.</p>}
    <dl className="adm-facts">
      <dt>آخرین commit در GitHub (main)</dt><dd><bdi>{value(data?.github?.commit)}</bdi></dd>
      <dt>زمان بررسی GitHub</dt><dd>{when(data?.github?.checkedAt)}</dd>
      <dt>نسخه API پاسخ‌دهنده</dt><dd><bdi>{value(data?.runtime?.version)}</bdi></dd>
      <dt>commit ساخت API پاسخ‌دهنده</dt><dd><bdi>{value(data?.runtime?.commit)}</bdi></dd>
      <dt>نسخه Web بازشده در مرورگر</dt><dd><bdi>{typeof __APP_VERSION__ === 'undefined' ? unknown : __APP_VERSION__}</bdi></dd>
      <dt>commit Web بازشده در مرورگر</dt><dd><bdi>{typeof __APP_COMMIT__ === 'undefined' ? unknown : value(__APP_COMMIT__)}</bdi></dd>
      <dt>منبع شواهد Runflare (ثبت اپراتور)</dt><dd><bdi>{value(data?.deployed?.source)}</bdi></dd>
      <dt>زمان مشاهده شواهد</dt><dd>{when(data?.deployed?.observedAt)}</dd>
    </dl>
    {['api', 'web'].map(service => {
      const d = data?.deployed?.[service]
      return <section key={service}><h3>استقرار {service === 'api' ? 'API' : 'Web'} در Runflare</h3>
        <dl className="adm-facts">
          <dt>commit</dt><dd><bdi>{value(d?.commit)}</bdi></dd>
          <dt>image (digest)</dt><dd><bdi>{value(d?.image)}</bdi></dd>
          <dt>نسخه ثبت‌شده</dt><dd><bdi>{value(d?.version)}</bdi></dd>
          <dt>زمان انتشار</dt><dd>{when(d?.deployedAt)}</dd>
          <dt>وضعیت هنگام مشاهده</dt><dd>{statuses[d?.status] || unknown}</dd>
        </dl></section>
    })}
    <dl className="adm-facts">
      {[['githubApi', 'GitHub و API مستقر'], ['githubWeb', 'GitHub و Web مستقر'], ['apiWeb', 'API و Web مستقر'], ['runtimeApi', 'API پاسخ‌دهنده و شواهد استقرار']].map(([key, label]) =>
        <div key={key}><dt>{label}</dt><dd>{comparisons[data?.comparisons?.[key]] || unknown}</dd></div>)}
    </dl>
    {!data?.deployed && <p className="adm-hint">شواهد معتبر استقرار Runflare ارائه نشده است. زمان ساخت یا شماره نسخه جایگزین شواهد استقرار نمی‌شود.</p>}
  </section>
}

export function SystemHealth({ tick }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    let active = true
    setData(null)
    api('/api/admin/system-health').then(d => { if (active) setData(d) }).catch(() => {})
    return () => { active = false }
  }, [tick])
  return <section className="card"><h2>مرکز سلامت سیستم</h2>
    <dl className="adm-facts">
      <dt>زمان بررسی</dt><dd>{when(data?.checkedAt)}</dd>
      <dt>پاسخ API</dt><dd>{data?.api === 'responding' ? 'پاسخ دریافت شد' : unknown}</dd>
      <dt>خواندن فایل پایگاه داده</dt><dd>{data ? data.storageReadable ? 'موفق' : 'ناموفق' : unknown}</dd>
      <dt>زمان کارکرد پردازش (ثانیه)</dt><dd>{value(data?.uptimeSeconds)}</dd>
      <dt>ثبت فعالیت‌ها</dt><dd>{data ? data.auditEnabled ? 'فعال' : 'غیرفعال' : unknown}</dd>
      <dt>نوشتن روی دیسک / سلامت Runflare</dt><dd>{unknown}</dd>
    </dl><p className="adm-hint">این بررسی فقط وضعیت خواندن و پاسخ همین پردازش را نشان می‌دهد.</p>
  </section>
}
