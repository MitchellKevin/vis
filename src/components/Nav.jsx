import { NavLink } from 'react-router-dom';

export default function Nav({ current }) {
  return (
    <nav className="vdb-nav">
      <NavLink className="vdb-nav__home" to="/">← Visdeurbel</NavLink>
      <span className="vdb-nav__divider">/</span>
      <div className="vdb-nav__links">
        <NavLink
          className="vdb-nav__link"
          to="/julius"
          aria-current={current === 'julius' ? 'page' : undefined}
        >Julius</NavLink>
        <NavLink
          className="vdb-nav__link"
          to="/joost"
          aria-current={current === 'joost' ? 'page' : undefined}
        >Joost</NavLink>
        <NavLink
          className="vdb-nav__link"
          to="/mitchell"
          aria-current={current === 'mitchell' ? 'page' : undefined}
        >Mitchell</NavLink>
        <NavLink
          className="vdb-nav__link"
          to="/nienke"
          aria-current={current === 'nienke' ? 'page' : undefined}
        >Nienke</NavLink>
        <NavLink
          className="vdb-nav__link"
          to="/dashboard"
          aria-current={current === 'dashboard' ? 'page' : undefined}
        >Dashboard</NavLink>
      </div>
    </nav>
  );
}
