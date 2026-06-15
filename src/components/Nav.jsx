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
      </div>
    </nav>
  );
}
