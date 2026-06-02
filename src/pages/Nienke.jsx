// import { useEffect, useState } from 'react';
// import Nav from '../components/Nav.jsx';
// import { useStylesheet } from '../hooks/useStylesheet.js';

// const HOURS = 24;
// const SCALE = 30;

// async function loadData() {
//   const response = await fetch('/json/event-maand.json');
//   const text = await response.text();

//   return text
//     .trim()
//     .split('\n')
//     .map(line => JSON.parse(line));
// }

// function countPerHour(events) {
//   const hours = Array.from({ length: HOURS }, () => ({
//     total: 0,
//     days: new Set(),
//     fishCounts: new Map(),
//     average: 0,
//     topFish: null
//   }));

//   events.forEach(event => {
//     if (event.event_name !== 'uploadedFish') return;

//     const [date, time] = event.created_at.split(' ');
//     const hour = parseInt(time.slice(0, 2), 10);

//     hours[hour].total++;
//     hours[hour].days.add(date);

//     const fish =
//       event.referrer_query.match(/fish=([^&]+)/)?.[1];

//     if (!fish || fish === 'unknown' || fish === 'onbekend') {
//       return;
//     }

//     hours[hour].fishCounts.set(
//       fish,
//       (hours[hour].fishCounts.get(fish) || 0) + 1
//     );
//   });

//   hours.forEach(hour => {
//     const dayCount = hour.days.size || 1;

//     hour.average = hour.total / dayCount;

//     let topFish = null;
//     let topCount = 0;

//     for (const [fish, count] of hour.fishCounts) {
//       if (count > topCount) {
//         topCount = count;
//         topFish = fish;
//       }
//     }

//     hour.topFish = topFish;
//   });

//   return hours;
// }

// function TimelineSection({ compact = false }) {
//   const [hourData, setHourData] = useState([]);
//   const [scrollOffset, setScrollOffset] = useState(0);

//   useEffect(() => {
//     loadData()
//       .then(events => {
//         setHourData(countPerHour(events));
//       })
//       .catch(err => {
//         console.error(err);
//       });
//   }, []);

//   const maxFish = Math.max(
//     ...hourData.map(hour => hour.average || 0),
//     1
//   );

//   return (
//     <section>
//       <h2>Tijdlijn</h2>

//       <p>
//         Hoe laat op de dag heb je de meeste kans
//         op een vis?
//       </p>

//       <p>
//         Aantal gespotte vissen per uur per maand,
//         <br />
//         De meest gespotte vis per uur per maand.
//       </p>

//       <div className="timeline-container">

//         <div className="legend">
//           <img
//             src="/images/snoek.png"
//             alt="Snoek icoon"
//           />

//           <p>= {SCALE} vissen</p>
//         </div>

//         <div className="bars">

//           {compact && (
//             <div
//               aria-label=""
//               className="background"
//             />
//           )}

//           {hourData.map((_, i) => {
//             const hour =
//               (i + scrollOffset) % HOURS;

//             const hourInfo = hourData[hour];

//             if (!hourInfo) return null;

//             const height = Math.round(
//               (hourInfo.average / maxFish) * 240
//             );

//             const fishCount = Math.ceil(
//               hourInfo.average / SCALE
//             );

//             const fishUrl = hourInfo.topFish
//               ? `/images/${encodeURIComponent(
//                   hourInfo.topFish.toLowerCase()
//                 )}.png`
//               : '';

//             return (
//               <div
//                 className="bar-col"
//                 key={hour}
//               >
//                 {hourInfo.average > 0 && (
//                   <span className="bar-count">
//                     {String(hour).padStart(2, '0')}
//                     :00
//                   </span>
//                 )}

//                 <div
//                   className="bar-fill"
//                   style={{
//                     height: `${height}px`
//                   }}
//                 >
//                   {fishCount > 0 &&
//                     fishUrl &&
//                     Array.from({
//                       length: fishCount
//                     }).map((_, idx) => (
//                       <img
//                         key={idx}
//                         src={fishUrl}
//                         alt={hourInfo.topFish}
//                       />
//                     ))}
//                 </div>

//                 <div className="tooltip">
//                   Gemiddeld{' '}
//                   {hourInfo.average.toFixed()}
//                   {' '}vissen gespot om{' '}
//                   {String(hour).padStart(2, '0')}
//                   :00.
//                 </div>
//               </div>
//             );
//           })}
//         </div>

//         <div className="timeline-controls">
//           <button
//             className="btn scroll-left"
//             onClick={() =>
//               setScrollOffset(prev =>
//                 (prev - 1 + HOURS) % HOURS
//               )
//             }
//           >
//             {compact
//               ? '←'
//               : '← Uur naar links'}
//           </button>

//           <button
//             className="btn scroll-right"
//             onClick={() =>
//               setScrollOffset(prev =>
//                 (prev + 1) % HOURS
//               )
//             }
//           >
//             {compact
//               ? '→'
//               : 'Uur naar rechts →'}
//           </button>

//           {compact && <div aria-label="" />}
//         </div>
//       </div>
//     </section>
//   );
// }

// export default function Nienke() {
//   useStylesheet('/styles/timeline.css');
//   return (
//     <>
//       <Nav current="nienke" />

//       <main>

//         <TimelineSection />

//         <TimelineSection compact />

//       </main>
//     </>
//   );
// }



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