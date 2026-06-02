import {
    useEffect,
    useState
} from 'react';

import {
    HOURS,
    loadData,
    countPerHour
} from './timeline.js';

import TimelineStatic from './timeline-static.jsx';

export default function Table() {
    const [hourData, setHourData] = useState([]);

    useEffect(() => {
        loadData()
            .then(events => {
                setHourData(countPerHour(events));
            })
            .catch(console.error);
    }, []);

    return (
        <TimelineStatic>
            <table aria-label="Vissen per uur tabel">
                <caption>
                    Overzicht van vissen per uur
                </caption>
                <thead>
                    <tr>
                        <th scope="col">Tijd</th>
                        <th scope="col">Hoeveelheid</th>
                        <th scope="col">Meest gespot</th>
                    </tr>
                </thead>

                <tbody>
                    {hourData.map((hour, i) => {
                        const time =
                            String(i).padStart(2, '0') + ':00';

                        return (
                            <tr key={i}>

                                <th scope="row">
                                    {time}
                                </th>

                                <td>
                                    {Math.round(hour.average)} vissen
                                </td>

                                <td>
                                    {hour.topFish ? (
                                        <img
                                            src={`/images/${hour.topFish.toLowerCase()}.png`}
                                            alt={hour.topFish}
                                        />
                                    ) : (
                                        '-'
                                    )}
                                </td>

                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </TimelineStatic>
    );
}