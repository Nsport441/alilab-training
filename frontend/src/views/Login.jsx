import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, LANGS, getLang } from '../lib/i18n.js'
import { APP_NAME } from '../lib/product.js'
import { DEMO, REPO } from '../lib/demo.js'
import { guestAllowed } from '../lib/guest.js'
import { useState, useEffect } from 'react'
import { Button, Segmented } from '../components/ui.jsx'
import { passwordOn, PasswordRegisterForm, openPasswordSignIn } from '../components/PasswordAuth.jsx'

// AliLab offers one entry method: a profile name (or e-mail) and password.
const passwordUnavailable = () => getLang() === 'fa'
  ? 'ورود با رمز عبور در تنظیمات این سرور فعال نیست. برای فعال‌سازی با مدیر تماس بگیرید.'
  : 'Password sign-in is not enabled on this server. Contact the administrator to enable it.'

function RegisterSheet({ close }) {
  const { loadConfig } = useStore()
  const config = useStore(s => s.config)
  const [name, setName] = useState('')

  // Keep server feature flags authoritative; never offer a registration mode
  // users cannot later sign in with from this password-only entry page.
  useEffect(() => { loadConfig() }, [loadConfig])

  return <>
    <h3>{t('Create your profile')}</h3>
    {passwordOn(config) ? <>
      <div className="muted small" style={{ marginBottom: 14 }}>{t('Pick a name and a password. You sign in with both.')}</div>
      <PasswordRegisterForm close={close} name={name} setName={setName} />
    </> : <p className="alilab-login-notice" role="status">{passwordUnavailable()}</p>}
  </>
}

export default function Login() {
  const { setGuest } = useStore()
  const config = useStore(s => s.config)
  const canGuest = guestAllowed(config)
  const pwOn = passwordOn(config)
  const register = () => useUI.getState().openSheet(close => <RegisterSheet close={close} />)

  const head = <>
    <Segmented className="login-lang" value={getLang()}
      options={[{ value: 'fa', label: LANGS.fa }, { value: 'en', label: LANGS.en }]}
      onChange={v => useStore.getState().update(s => { s.lang = v; s.langAuto = false })} />
    <header className="alilab-login-brand">
      <img className="alilab-mark" src="./alilab-mark.svg" alt="" width="72" height="72" />
      <h1>{APP_NAME}</h1>
      <p>{t('Your workouts. Your weights. Your profile.')}</p>
    </header>
  </>

  return (
    <div className="alilab-login-screen">
      <main className="alilab-login-card">
        {head}
        <section className="alilab-login-content" aria-labelledby="alilab-login-title">
          <h2 id="alilab-login-title">{DEMO ? t('Start the demo') : t('Sign in to your account')}</h2>
          {DEMO ? <>
            <p className="alilab-login-intro">{t('Live demo — everything stays in this browser.')}</p>
            <Button variant="primary" icon="sparkles" onClick={() => setGuest(true)}>{t('Start the demo')}</Button>
            <a className="alilab-login-repo" href={REPO} target="_blank" rel="noopener noreferrer">{t('Self-host it in a minute →')}</a>
          </> : <>
            {pwOn ? <>
              <p className="alilab-login-intro">{t('Use your profile name — or the e-mail you added to it — and your password.')}</p>
              <div className="alilab-login-methods">
                <Button variant="primary" icon="key" onClick={() => openPasswordSignIn()}>{t('Sign in with password')}</Button>
              </div>
              <div className="alilab-login-divider"><span>{t('New here?')}</span></div>
              <Button variant="tinted" icon="sparkles" onClick={register}>{t('Create new profile')}</Button>
            </> : <p className="alilab-login-notice" role="status">{passwordUnavailable()}</p>}
            {canGuest && <div className="alilab-login-guest"><Button variant="ghost" onClick={() => setGuest(true)}>{t('Continue without account')}</Button></div>}
          </>}
        </section>
      </main>
      {!DEMO && <p className="alilab-login-footnote">
        {t('Each profile keeps its own plan, workouts & body weight.')}
      </p>}
    </div>
  )
}
