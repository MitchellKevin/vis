import {
    useEffect,
    useState
} from 'react';

import {
    HOURS,
    loadData,
    countPerHour
} from './timeline.js';

export default function Table() {
    const [hourData, setHourData] = useState([]);
    const maxValue = Math.max(...hourData.map(h => h.average));

    useEffect(() => {
        loadData()
            .then(events => setHourData(countPerHour(events)))
            .catch(console.error);
    }, []);

    return (
        <section className='scroll-driven'>
            <h2>Piekuren onder water</h2>
            <p>Hoe laat op de dag heb je de meeste kans op een vis?</p>
            <table aria-label="Vissen per uur tabel" tabIndex={0} role='grid'>
                <caption className="visually-hidden">
                    Overzicht van vissen per uur
                </caption>

                <thead className="visually-hidden">
                    <tr>
                        <th scope="col">Tijd</th>
                        <th scope="col">Gemiddeld aantal vissen en meest geziene vis</th>
                    </tr>
                </thead>

                <tbody>
                    {hourData.map((hour, i) => {
                        const time = String(i).padStart(2, '0') + ':00';
                        const tooltipId = `tooltip-${i}`;
                        const roundedAverage = Math.round(hour.average);

                        return (
                            <tr key={i}>
                                <th scope="row" className="timestamp">
                                    {time}
                                </th>

                                <td aria-describedby={tooltipId}>
                                    <div
                                        className="bar-fill"
                                        style={{ width: `${(hour.average / maxValue) * 100}%` }}
                                        aria-hidden="true"
                                    >
                                        <span className="amount">{roundedAverage}</span>
                                        {hour.topFish && (
                                            <img src={`/images/${hour.topFish.toLowerCase()}.png`} alt="" />
                                        )}
                                    </div>

                                    <span id={tooltipId} className="tooltip">
                                        {hour.topFish
                                            ? `Om ${time} worden er gemiddeld ${roundedAverage} vissen gespot. De ${hour.topFish} wordt het meest gezien.`
                                            : `Om ${time} zijn er geen visdata beschikbaar.`
                                        }
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>
    );
}