import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { aggregate, loadData } from './utils.js';
import { TOPO_URL } from './constants.js';

// Custom hook that owns all data-fetching and period-switching logic for the WorldMap page
export default function useJoostData() {
  const [period,        setPeriod       ] = useState('maand');
  const [allEvents,     setAllEvents    ] = useState([]);
  const [countryData,   setCountryData  ] = useState({});
  const [maxEvents,     setMaxEvents    ] = useState(1);
  const [topoFeatures,  setTopoFeatures ] = useState([]);
  const [loading,       setLoading      ] = useState(true);  // true until the first load completes
  const [periodLoading, setPeriodLoading] = useState(false); // true while a period switch is fetching
  const [statsLoaded,   setStatsLoaded  ] = useState(false); // triggers stat card CSS animations

  // Fetch topology and initial event data in parallel on mount
  useEffect(() => {
    (async () => {
      try {
        const [topoData, rawEvents] = await Promise.all([
          d3.json(TOPO_URL),
          loadData('maand'),
        ]);
        const cd = aggregate(rawEvents);
        const mx = Math.max(...Object.values(cd).map(c => c.events), 1);
        setAllEvents(rawEvents);
        setCountryData(cd);
        setMaxEvents(mx);
        setTopoFeatures(topojson.feature(topoData, topoData.objects.countries).features);
        setLoading(false);
        // Small delay so stat cards have rendered before the CSS transition starts
        setTimeout(() => setStatsLoaded(true), 300);
      } catch (err) {
        console.error('Fout bij laden data:', err);
        setLoading(false); // hide spinner even on error
      }
    })();
  }, []); // run once on mount

  // Reloads event data for the given period; no-ops if already active
  async function switchPeriod(p) {
    if (p === period) return;
    setPeriod(p);
    setPeriodLoading(true);
    try {
      const rawEvents = await loadData(p);
      const cd = aggregate(rawEvents);
      const mx = Math.max(...Object.values(cd).map(c => c.events), 1);
      setAllEvents(rawEvents);
      setCountryData(cd);
      setMaxEvents(mx);
    } catch (err) {
      console.error('Fout bij laden periode:', err);
    } finally {
      setPeriodLoading(false);
    }
  }

  return {
    period, allEvents, countryData, maxEvents,
    topoFeatures, loading, periodLoading, statsLoaded,
    switchPeriod,
  };
}