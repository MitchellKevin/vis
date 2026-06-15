import {
    useEffect,
    useState
} from 'react';

import {
    HOURS,
    loadData,
    countPerHour
} from './timeline.js';

import { visData } from '../../scripts/mitchell/constants.js';

export default function DayScroll() {
    const [hourData, setHourData] = useState([]);

    useEffect(() => {
        loadData()
            .then(events => {
                setHourData(countPerHour(events));
            })
            .catch(console.error);
    }, []);

    return (
        <section className='day-scroll' id="timeline">
            <h2>Het ritme van het water</h2>
            <p>Onder het oppervlak staat de tijd nooit stil. Scroll naar beneden en ontdek de dagelijkse planning van de vissen.</p>
            <div className='table-scroll-container'>
                <div aria-hidden="true" className='sticky-container'>
                    <div aria-hidden="true" className="moon"></div>
                    <div aria-hidden="true" className="sun"></div>
                    <div aria-hidden="true" className="water-visual"></div>
                    <div aria-hidden="true" className="canal-bottom">
                        {/* bike image generated with ChatGPT */}
                        <img src="/images/rusty-bike.png" alt="" className='canal-bike'/>
                        {/* https://pngimg.com/image/81796 */}
                        <img src="/images/plastic-bag.png" alt="" className='canal-bag'/>
                    </div> 
                </div>
                <table>
                    <caption className='visually-hidden'>
                        Overzicht van vissen per uur van de dag
                    </caption>
                    <thead className='visually-hidden'>
                        <tr>
                            <th scope="col">Tijd</th>
                            <th scope="col">Hoeveelheid vissen</th>
                            <th scope="col">Meest gespot</th>
                        </tr>
                    </thead>

                    <tbody>
                        {hourData.map((hour, i) => {
                            const time = String(i).padStart(2, '0') + ':00';
                            const visMatch = visData.find(
                                (v) => v.naam.toLowerCase() === hour.topFish?.toLowerCase()
                            );
                            const length = visMatch ? visMatch.lengte : 1;

                            return (
                                <tr key={i}>
                                    <th scope="row" className='timestamp'>
                                        <p>{time}</p>
                                    </th>

                                    <td className='visually-hidden'>
                                        {Math.round(hour.average)} vissen gespot
                                    </td>

                                    <td>
                                        {hour.topFish ? (
                                            <>
                                                <img
                                                    src={`/images/${hour.topFish.toLowerCase()}.png`}
                                                    aria-hidden="true"
                                                    alt=""
                                                    style={{ '--fish-length': length }}
                                                />
                                                <p className='visually-hidden'>De {hour.topFish} is het meest gespot</p>
                                            </>
                                        ) : (
                                            '-'
                                        )}
                                    </td>

                                    <td aria-hidden="true" className='all-info'>
                                        <p>{time}</p>
                                        <p>{Math.round(hour.average)} vissen</p>
                                        <p>#1 vis: {hour.topFish}</p>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div aria-hidden="true" className="background-visual"></div>
            </div>
        </section>
    );
}
