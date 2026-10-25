import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { webauthnOK, passkeyLogin, passkeyRegister, bio } from '../lib/api.js'
import { hasData } from '../store/useStore.js'
import { t, LANGS, getLang } from '../lib/i18n.js'
import { APP_NAME } from '../lib/product.js'
import { DEMO, REPO } from '../lib/demo.js'
import { guestAllowed } from '../lib/guest.js'
import { useState, useRef, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { Button, Segmented } from '../components/ui.jsx'
import { askAddDeviceData } from '../sheets.jsx'
import { passwordOn, PasswordRegisterForm, openPasswordSignIn } from '../components/PasswordAuth.jsx'
import { openDeviceLinkRedeem } from '../components/Passkeys.jsx'

function RegisterSheet({ close }) {
  const { setUser, pushState, pullState, loadConfig } = useStore()
  const config = useStore(s => s.config)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const inviteOnly = !!config?.invite_only
  // A password is offered only where the instance allows it (#118), and is the only choice in a
  // browser that cannot make a passkey. Where both work, the passkey stays the first one.
  const pwOn = passwordOn(config)
  const [how, setHow] = useState(webauthnOK() ? 'passkey' : 'password')
  const ref = useRef(null)
  useEffect(() => { setTimeout(() => ref.current?.focus(), 250) }, [])
  // Boot already fetched this; retry here only if that attempt failed, so the invite field still
  // appears on an instance whose config arrived late rather than never.
  useEffect(() => { loadConfig() }, [loadConfig])
  const go = async () => {
    const n = name.trim()
    if (!n) { useUI.getState().toast(t('Enter a name')); return }
    if (inviteOnly && !code.trim()) { useUI.getState().toast(t('An invite code is required')); return }
    try {
      const u = await passkeyRegister(n, code.trim())
      setUser(u); close()
      if (hasData(useStore.getState().S)) { await pushState(); useUI.getState().toast(t('Profile created — data from this device moved into it')) }
      else { await pullState(); useUI.getState().toast(t('Welcome, {0}', u.name)) }
    } catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') useUI.getState().toast(e.message || t('Registration failed')) }
  }
  const choose = pwOn && webauthnOK() && <>
    <Segmented options={[{ value: 'passkey', label: t('Passkey'), icon: 'person' }, { value: 'password', label: t('Password'), icon: 'key' }]}
      value={how} onChange={setHow} />
    <div style={{ height: 12 }} />
  </>
  if (pwOn && how === 'password') return <>
    <h3>{t('Create your profile')}</h3>
    {choose}
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Pick a name and a password. You sign in with both.')}</div>
    <PasswordRegisterForm close={close} inviteOnly={inviteOnly} name={name} setName={setName} code={code} setCode={setCode} />
  </>
  return <>
    <h3>{t('Create your profile')}</h3>
    {choose}
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Pick a name, then confirm with {0}. The passkey is saved in your device — no password needed.', bio())}</div>
    <input ref={ref} className="input" placeholder={t('Your name')} maxLength={40} value={name} onChange={e => setName(e.target.value)} />
    {inviteOnly && <>
      <div style={{ height: 10 }} />
      <input className="input" placeholder={t('Invite code')} maxLength={40} value={code}
        onChange={e => setCode(e.target.value.toUpperCase())} style={{ letterSpacing: '.14em', fontWeight: 600, textAlign: 'center' }} />
      <div className="dim small" style={{ marginTop: 6 }}>{t('This app is invite-only — enter the code you were given.')}</div>
    </>}
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={go}>{t('Create passkey')}</Button>
  </>
}

export default function Login() {
  const { setUser, adoptProfile, setGuest } = useStore()
  const config = useStore(s => s.config)
  const canGuest = guestAllowed(config)
  const pwOn = passwordOn(config)
  const register = () => useUI.getState().openSheet(close => <RegisterSheet close={close} />)
  const signIn = async () => {
    try { const u = await passkeyLogin(); setUser(u, { adopt: true }); await adoptProfile(askAddDeviceData); useUI.getState().toast(t('Welcome back, {0}', u.name)) }
    catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') useUI.getState().toast(e.message || t('Sign-in failed')) }
  }
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

  // Keep authentication and account creation exactly as they were: this view
  // changes only presentation, not the passkey/password/device-link flows.
  return (
    <div className="alilab-login-screen">
      <main className="alilab-login-card">
        {head}
        <section className="alilab-login-content" aria-labelledby="alilab-login-title">
          <h2 id="alilab-login-title">{DEMO ? t('Start the demo') : t('Sign in to your account')}</h2>
          {DEMO ? <>
            <p className="alilab-login-intro">{t('Live demo — everything stays in this browser.')}</p>
            <Button variant="primary" icon="sparkles" onClick={() => setGuest(true)}>{t('Start the demo')}</Button>
            <p className="alilab-login-notice">{t('This demo runs entirely in your browser on example data — nothing is sent anywhere. Passkey sign-in and sync across your devices come with the openGym server, which you get by self-hosting it.')}</p>
            <a className="alilab-login-repo" href={REPO} target="_blank" rel="noopener noreferrer">{t('Self-host it in a minute →')}</a>
          </> : <>
            <p className="alilab-login-intro">{t('Choose your preferred sign-in method.')}</p>
            {webauthnOK() ? <>
              <div className="alilab-login-methods">
                <Button variant="primary" icon="person" onClick={signIn}>{t('Sign in with passkey')}</Button>
                {pwOn && <Button variant="secondary" icon="key" onClick={() => openPasswordSignIn()}>{t('Sign in with password')}</Button>}
              </div>
              <div className="alilab-login-divider"><span>{t('New here?')}</span></div>
              <Button variant="tinted" icon="sparkles" onClick={register}>{t('Create new profile')}</Button>
              <div className="alilab-login-extra">
                {/* A second device joins the existing profile instead of creating a duplicate. */}
                <Button variant="ghost" icon="qr" onClick={openDeviceLinkRedeem}>{t('Use a code from your other device')}</Button>
              </div>
            </> : pwOn ? <>
              <p className="alilab-login-notice">{t("This browser doesn't support passkeys — sign in with your name and password instead.")}</p>
              <Button variant="primary" icon="key" onClick={() => openPasswordSignIn()}>{t('Sign in with password')}</Button>
              <div className="alilab-login-divider"><span>{t('New here?')}</span></div>
              <Button variant="tinted" icon="sparkles" onClick={register}>{t('Create new profile')}</Button>
            </> : <p className="alilab-login-notice">{canGuest
              ? t("This browser doesn't support passkeys — you can still use openGym locally on this device.")
              : t("This browser doesn't support passkeys, and this instance requires an account. Try a browser or device with passkey support.")}</p>}
            {canGuest && <div className="alilab-login-guest"><Button variant="ghost" onClick={() => setGuest(true)}>{t('Continue without account')}</Button></div>}
          </>}
        </section>
      </main>
      {!DEMO && <p className="alilab-login-footnote">
        {pwOn ? t('Passkeys use {0}. A password works too, where passkeys do not.', bio()) : t('Passkeys use {0} — no passwords.', bio())}
        <span>{t('Each profile keeps its own plan, workouts & body weight.')}</span>
      </p>}
    </div>
  )
}
