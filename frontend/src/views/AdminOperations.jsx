import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const unknown = 'نامشخص'
const value = v => v == null ? unknown : String(v)
const comparisons = { same: 'یکسان', different: 'متفاوت', unknown }
const statuses = { running: 'در حال اجرا', failed: 'ناموفق', pending: 'در انتظار', stopped: 'متوقف', unknown }
const when = v => v && Number.isFinite(Date.parse(v)) ? new Date(v).toLocaleString('fa-IR') : unknown
const fullSha = v => typeof v === 'string' && /^[a-f0-9]{40}$/i.test(v) ? v.toLowerCase() : null
const compareSha = (a, b) => {
  const left = fullSha(a), right = fullSha(b)
  return left && right ? left === right ? 'same' : 'different' : 'unknown'
}

// The browser can still be running an older service-worker cached bundle.
// The separately fetched /release-build.json represents the Web server's
// currently served static build, not an authenticated Runflare deployment claim.
export function ReleaseCenter({ tick }) {
  const [data, setData] = useState(null)
  const [servedWeb, setServedWeb] = useState(null)
  const [apiError, setApiError] = useState(false)
  const [webError, setWebError] = useState(false)

  useEffect(() => {
    let active = true
    setData(null); setServedWeb(null); setApiError(false); setWebError(false)
    api('/api/admin/releases')
      .then(d => { if (active) setData(d) })
      .catch(() => { if (active) setApiError(true) })
    // A query nonce protects observations from older service workers that do
    // not yet know to bypass this path. No platform token is sent to the Web.
    api('/release-build.json?check=' + Date.now(), { cache: 'no-store', timeout: 5000 })
      .then(d => {
        if (active) setServedWeb({
          commit: fullSha(d?.commit),
          version: typeof d?.version === 'string' && d.version.length <= 120 ? d.version : null,
          checkedAt: new Date().toISOString(),
        })
      })
      .catch(() => { if (active) setWebError(true) })
    return () => { active = false }
  }, [tick])

  const browserCommit = typeof __APP_COMMIT__ === 'undefined' ? null : fullSha(__APP_COMMIT__)
  const browserVersion = typeof __APP_VERSION__ === 'undefined' ? unknown : __APP_VERSION__
  const githubCommit = fullSha(data?.github?.commit)
  const apiCommit = fullSha(data?.runtime?.commit)
  const webCommit = fullSha(servedWeb?.commit)
  const checks = [
    ['GitHub در برابر API پاسخ‌دهنده', compareSha(githubCommit, apiCommit)],
    ['GitHub در برابر Web پاسخ‌دهنده', compareSha(githubCommit, webCommit)],
    ['API و Web پاسخ‌دهنده', compareSha(apiCommit, webCommit)],
    ['Web پاسخ‌دهنده و نسخه مرورگر', compareSha(webCommit, browserCommit)],
  ]
  const anyDifferent = checks.some(([, status]) => status === 'different')
  const allSame = checks.every(([, status]) => status === 'same')
  const evidence = data?.deployed
  const evidenceAge = evidence?.observedAt ? Date.now() - Date.parse(evidence.observedAt) : null
  const evidenceStale = evidenceAge != null && (!Number.isFinite(evidenceAge) || evidenceAge > 24 * 60 * 60 * 1000 || evidenceAge < -5 * 60 * 1000)

  return <section className="card" aria-labelledby="release-title">
    <h2 id="release-title">مدیریت نسخه‌ها و انتشار</h2>
    <p className="adm-lead">اطلاعات این بخش خواندنی است و هیچ استقراری را شروع نمی‌کند. مقایسه فقط برابری Commit را می‌سنجد؛ «متفاوت» به معنی جلوتر یا عقب‌تر بودن نیست.</p>
    <p className="adm-hint">زمان هر مشاهده مشخص شده است. نسخه API از پاسخ سرور، نسخه Web از فایل سرو‌شده و نسخه مرورگر از همین برنامه خوانده می‌شود؛ هیچ‌کدام به‌تنهایی شناسه قطعی استقرار یا Image در Runflare نیستند.</p>
    {apiError && <p role="alert">دریافت نسخه API یا GitHub ناموفق بود؛ اطلاعات آن نامشخص است.</p>}
    {webError && <p role="alert">نسخه Web پاسخ‌دهنده دریافت نشد؛ احتمالاً نسخه سرور قدیمی است یا اتصال برقرار نیست.</p>}

    <h3>وضعیت هماهنگی نسخه‌ها</h3>
    <p className="adm-release-summary" role="status">{allSame ? 'Commit هر چهار منبع مشاهده‌شده یکسان است؛ وضعیت پلتفرم Runflare جداگانه بررسی می‌شود.' :
      anyDifferent ? 'دست‌کم دو نسخه مشاهده‌شده متفاوت‌اند؛ پیش از انتشار بعدی، منبع هر اختلاف را بررسی کنید.' :
      'برای نتیجه قطعی، Commit کامل تمام منابع لازم است؛ موارد نامشخص به معنای خطا یا تطبیق نیستند.'}</p>
    <dl className="adm-facts" data-testid="release-comparisons">
      {checks.map(([label, status]) => <div key={label}><dt>{label}</dt><dd>{comparisons[status]}</dd></div>)}
    </dl>

    <h3>نسخه‌های مشاهده‌شده</h3>
    <dl className="adm-facts">
      <dt>آخرین Commit در GitHub (main)</dt><dd><bdi>{value(githubCommit)}</bdi></dd>
      <dt>زمان بررسی GitHub</dt><dd>{when(data?.github?.checkedAt)}</dd>
      <dt>Commit API پاسخ‌دهنده</dt><dd><bdi>{value(apiCommit)}</bdi></dd>
      <dt>نسخه API پاسخ‌دهنده</dt><dd><bdi>{value(data?.runtime?.version)}</bdi></dd>
      <dt>زمان مشاهده API</dt><dd>{when(data?.runtime?.checkedAt)}</dd>
      <dt>Commit Web پاسخ‌دهنده (فایل انتشار)</dt><dd><bdi>{value(webCommit)}</bdi></dd>
      <dt>نسخه Web پاسخ‌دهنده</dt><dd><bdi>{value(servedWeb?.version)}</bdi></dd>
      <dt>زمان مشاهده Web</dt><dd>{when(servedWeb?.checkedAt)}</dd>
      <dt>Commit نسخه Web در مرورگر</dt><dd><bdi>{value(browserCommit)}</bdi></dd>
      <dt>نسخه Web در مرورگر</dt><dd><bdi>{browserVersion}</bdi></dd>
    </dl>

    <details className="adm-release-evidence">
      <summary>شواهد مستقل Runflare (در صورت ثبت توسط مدیر)</summary>
      <p className="adm-hint">این قسمت API زنده Runflare نیست؛ اطلاعات اختیاری از فایل شواهد مورد تأیید مدیر خوانده می‌شود. هرگز وضعیت Running را از شماره نسخه حدس نمی‌زنیم.</p>
      <dl className="adm-facts">
        <dt>منبع مشاهده</dt><dd><bdi>{value(evidence?.source)}</bdi></dd>
        <dt>زمان مشاهده Runflare</dt><dd>{when(evidence?.observedAt)}</dd>
        <dt>تازگی شواهد</dt><dd>{!evidence ? unknown : evidenceStale ? 'قدیمی یا خارج از بازه زمانی معتبر (بیش از ۲۴ ساعت)' : 'ثبت‌شده در ۲۴ ساعت اخیر؛ نه الزاماً وضعیت فعلی'}</dd>
      </dl>
      {['api', 'web'].map(service => {
        const d = evidence?.[service]
        return <section key={service}>
          <h3>شواهد استقرار {service === 'api' ? 'API' : 'Web'}</h3>
          <dl className="adm-facts">
            <dt>Commit ثبت‌شده</dt><dd><bdi>{value(d?.commit)}</bdi></dd>
            <dt>Image digest</dt><dd><bdi>{value(d?.image)}</bdi></dd>
            <dt>نسخه ثبت‌شده</dt><dd><bdi>{value(d?.version)}</bdi></dd>
            <dt>زمان انتشار ثبت‌شده</dt><dd>{when(d?.deployedAt)}</dd>
            <dt>وضعیت هنگام مشاهده</dt><dd>{statuses[d?.status] || unknown}</dd>
          </dl>
        </section>
      })}
      <dl className="adm-facts">
        {[['githubApi', 'GitHub و API ثبت‌شده در Runflare'], ['githubWeb', 'GitHub و Web ثبت‌شده در Runflare'],
          ['apiWeb', 'API و Web ثبت‌شده در Runflare'], ['runtimeApi', 'API پاسخ‌دهنده و شواهد Runflare']].map(([key, label]) =>
          <div key={key}><dt>{label}</dt><dd>{comparisons[data?.comparisons?.[key]] || unknown}</dd></div>)}
      </dl>
      {!evidence && <p className="adm-hint">شواهد معتبر استقرار Runflare ارائه نشده است. مشخصات ساخت جایگزین شواهد پلتفرم نیست.</p>}
    </details>
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
