import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { aggregate, loadData } from '../components/world-map/utils.js';
import { TOPO_URL } from '../components/world-map/constants.js';

export default function useJoostData() {
  const [period,        setPeriod       ] = useState('maand');
  const [allEvents,     setAllEvents    ] = useState([]);
  const [countryData,   setCountryData  ] = useState({});
  const [maxEvents,     setMaxEvents    ] = useState(1);
  const [topoFeatures,  setTopoFeatures ] = useState([]);
  const [loading,       setLoading      ] = useState(true);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [statsLoaded,   setStatsLoaded  ] = useState(false);

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
        setTimeout(() => setStatsLoaded(true), 300);
      } catch (err) {
        console.error('Fout bij laden data:', err);
        setLoading(false);
      }
    })();
  }, []);

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
