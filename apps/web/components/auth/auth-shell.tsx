import type { ReactNode } from "react";
import { KeyRound, Mail, RefreshCw } from "lucide-react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-screen">
      <aside className="auth-context" aria-label="About this authentication example">
        <a className="auth-wordmark" href="/" aria-label="Project Starter home">
          <span className="auth-mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <span>Project Starter</span>
        </a>

        <div className="auth-context-copy">
          <h1>A project starter with a complete account lifecycle.</h1>
          <p>Follow one email and password flow from registration through ongoing access.</p>
        </div>

        <ul className="auth-benefits">
          <li>
            <Mail aria-hidden="true" />
            <span>
              <strong>Verify email</strong>
              <small>Confirm an address before signing in.</small>
            </span>
          </li>
          <li>
            <KeyRound aria-hidden="true" />
            <span>
              <strong>Reset password</strong>
              <small>Recover access through a one-time link.</small>
            </span>
          </li>
          <li>
            <RefreshCw aria-hidden="true" />
            <span>
              <strong>Manage sessions</strong>
              <small>Refresh valid sessions through the API.</small>
            </span>
          </li>
        </ul>
        <p className="auth-context-caption">
          A working example for contributors building from this starter.
        </p>
      </aside>

      <section className="auth-panel">
        <a
          className="auth-wordmark auth-wordmark-mobile"
          href="/"
          aria-label="Project Starter home"
        >
          <span className="auth-mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <span>Project Starter</span>
        </a>
        <div className="auth-content">{children}</div>
        <footer className="auth-footer">
          <span>Project Starter</span>
          <span aria-hidden="true">·</span>
          <span>Account &amp; access example</span>
        </footer>
      </section>
    </main>
  );
}
