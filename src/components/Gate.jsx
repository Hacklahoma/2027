import { useEffect, useRef, useState } from 'react';

// Preview lock: the site stays behind a password until launch.
// This is a light gate for a preview, not real security: it keeps casual visitors out,
// but the page code is public. For real protection, use Netlify's password protection.
// Only the SHA-256 of the password is stored here, never the word itself. The check ignores case:
// whatever is typed is lowercased first, so this is the hash of the lowercase password.
// TODO: remove this gate (and the robots noindex in preview/index.html) at launch.
const HASH = '2e5335b960bc215d86a3bb30d8478f4cef5c9117978ccbc63baf7fed6fa43103';
const KEY = 'hk27-preview';

const sha256 = async (text) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
};
const remembered = () => { try { return localStorage.getItem(KEY) === HASH; } catch { return false; } };

export default function Gate({ children }) {
  const [open, setOpen] = useState(remembered);
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);

  useEffect(() => { if (!open) input.current?.focus(); }, [open]);

  if (open) return children;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if ((await sha256(input.current.value.trim().toLowerCase())) === HASH) {
        try { localStorage.setItem(KEY, HASH); } catch { /* private window: they'll be asked again next visit */ }
        setOpen(true);
        return;
      }
      setWrong(true);
      input.current.select();
    } catch {
      setWrong(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="gate">
      <form className="gate-box" onSubmit={submit}>
        <p className="gate-mark">hacklahoma</p>
        <p className="gate-note">The 2027 site is in preview.</p>
        <label className="gate-label" htmlFor="gate-pw">Password</label>
        <div className="gate-row">
          <input
            id="gate-pw" ref={input} type="password" autoComplete="current-password"
            aria-invalid={wrong} aria-describedby={wrong ? 'gate-err' : undefined}
            onChange={() => wrong && setWrong(false)}
          />
          <button type="submit" disabled={busy}>Enter</button>
        </div>
        <p className="gate-err" id="gate-err" role="alert">{wrong ? 'That password isn’t right. Try again.' : ''}</p>
      </form>
    </main>
  );
}
