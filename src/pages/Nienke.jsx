import Nav from '../components/Nav.jsx';

// import OriginalTimeline from '../components/timeline/original.jsx';

// import PinkTimeline from '../components/timeline/pink.jsx';

// import TableTimeline from '../components/timeline/table.jsx';

import TableStyled from '../components/timeline/table-styled.jsx';

import DayScroll from '../components/timeline/day-scroll.jsx';


import { useStylesheet }
  from '../hooks/useStylesheet.js';

export default function Nienke() {
  useStylesheet('/styles/timeline.css');

  return (
    <>
      <Nav current="nienke" />

      <main>
        <DayScroll />
        
        <TableStyled />

        {/* <OriginalTimeline />

        <PinkTimeline />

        <TableTimeline /> */}

      </main>
    </>
  );
}