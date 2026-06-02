import Nav from '../components/Nav.jsx';

import OriginalTimeline
  from '../components/timeline/original.jsx';

import PinkTimeline
  from '../components/timeline/pink.jsx';

import TableTimeline
  from '../components/timeline/table.jsx';

import { useStylesheet }
  from '../hooks/useStylesheet.js';

export default function Nienke() {
  useStylesheet('/styles/timeline.css');

  return (
    <>
      <Nav current="nienke" />

      <main>

        <OriginalTimeline />

        <PinkTimeline />

        <TableTimeline />

      </main>
    </>
  );
}