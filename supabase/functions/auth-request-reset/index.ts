// POST /auth-request-reset { email }
// Emails a single-use reset link (via Resend). Always returns { ok: true } so
// the endpoint never reveals whether an email is registered.
import { json, preflight } from '../_shared/cors.ts'
import { randomToken, sha256Hex } from '../_shared/crypto.ts'
import { adminClient } from '../_shared/session.ts'
import { normalizeEmail } from '../_shared/validation.ts'

const RESET_TTL_MS = 60 * 60 * 1000 // 1 hour

async function sendResetEmail(to: string, name: string, link: string) {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) {
    console.warn('RESEND_API_KEY not set — skipping reset email')
    return
  }
  const from = Deno.env.get('RESEND_FROM') || 'BarTrack <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Réinitialisation de votre mot de passe BarTrack',
      html:
        `<p>Bonjour ${name || ''},</p>` +
        `<p>Vous avez demandé la réinitialisation de votre mot de passe BarTrack.</p>` +
        `<p><a href="${link}">Cliquez ici pour choisir un nouveau mot de passe</a></p>` +
        `<p>Ou copiez ce lien : ${link}</p>` +
        `<p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`,
    }),
  })
  if (!res.ok) console.error('Resend error:', res.status, await res.text())
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: { message: 'method_not_allowed' } }, 405)

  try {
    const { email } = await req.json()
    if (typeof email === 'string' && email.trim()) {
      const admin = adminClient()
      const normEmail = normalizeEmail(email)
      const { data: user } = await admin
        .from('users').select('id, email, display_name').eq('email', normEmail).maybeSingle()

      if (user) {
        const token = randomToken(32)
        const tokenHash = await sha256Hex(token)
        await admin.from('password_reset_tokens').insert({
          user_id: user.id,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + RESET_TTL_MS).toISOString(),
        })
        const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '')
        const link = `${appUrl}/reset-password?token=${token}`
        await sendResetEmail(user.email, user.display_name ?? '', link)
      }
    }
    // Uniform response regardless of whether the email exists.
    return json({ ok: true })
  } catch (e) {
    return json({ error: { message: String((e as Error)?.message || e) } }, 500)
  }
})
