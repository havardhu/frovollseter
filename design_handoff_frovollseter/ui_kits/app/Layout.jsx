// Frovollseter — Layout (header + nav + footer)
// Requires: Components.jsx exported to window

const { useState } = React;

const NAV_ITEMS = [
  { id: "road",    label: "Veiforhold" },
  { id: "news",    label: "Nyheter" },
  { id: "webcams", label: "Webkameraer" },
  { id: "links",   label: "Nyttige lenker" },
];

function Layout({ page, setPage, dark, toggleDark, isAuthenticated, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={"frv-app" + (dark ? " dark" : "")}>
      <header className="frv-header">
        <div className="frv-header-inner">
          <a className="frv-logo" onClick={() => setPage("road")}>🏔️ <span className="frv-logo-text">Frovollseter</span></a>

          {/* Desktop nav */}
          <nav className="frv-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={"frv-nav-link" + (page === item.id ? " active" : "")}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="frv-header-actions">
            <button className="frv-btn frv-btn-ghost frv-btn-icon" onClick={toggleDark} title="Bytt tema">
              {dark
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>
            {isAuthenticated
              ? <button className="frv-btn frv-btn-ghost frv-btn-icon" onClick={onLogout} title="Logg ut">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
              : <button className="frv-btn frv-btn-default frv-btn-sm" onClick={() => setPage("login")}>Logg inn</button>
            }
            {/* Mobile menu toggle */}
            <button className="frv-btn frv-btn-ghost frv-btn-icon frv-mobile-menu-btn" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              }
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="frv-mobile-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); setMenuOpen(false); }}
                className={"frv-nav-link frv-mobile-nav-link" + (page === item.id ? " active" : "")}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="frv-main">
        {children}
      </main>

      <footer className="frv-footer">
        Frovollseter · Non-profit veglag og hytteeierlag
      </footer>
    </div>
  );
}

Object.assign(window, { Layout, NAV_ITEMS });
