export default function Nav({ current }) {
  const links = [
    { key: 'julius',    label: 'Julius',    href: '/julius'    },
    { key: 'joost',     label: 'Joost',     href: '/joost'     },
    { key: 'mitchell',  label: 'Mitchell',  href: '/mitchell'  },
    { key: 'nienke',    label: 'Nienke',    href: '/nienke'    },
    { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  ];
  return (
    <nav className="vdb-nav">
      <a className="vdb-nav__home" href="/">← Visdeurbel</a>
      <span className="vdb-nav__divider">/</span>
      <div className="vdb-nav__links">
        {links.map(l => (
          <a
            key={l.key}
            className="vdb-nav__link"
            aria-current={current === l.key ? 'page' : undefined}
            href={l.href}
          >
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}