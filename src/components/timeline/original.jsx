import {
    useEffect,
    useState
} from 'react';

import {
    HOURS,
    SCALE,
    loadData,
    countPerHour
} from './timeline.js';

import TimelineStatic
    from './timeline-static.jsx';

export default function OriginalTimeline() {
    const [hourData, setHourData] =
        useState([]);

    const [scrollOffset, setScrollOffset] =
        useState(0);

    useEffect(() => {
        loadData()
            .then(events => {
                setHourData(
                    countPerHour(events)
                );
            })
            .catch(console.error);
    }, []);

    const maxFish = Math.max(
        ...hourData.map(
            hour => hour.average || 0
        ),
        1
    );

    return (
        <TimelineStatic title="Vissen per uur overzicht" className="original">
            <p>
                Aantal gespotte vissen per uur per maand,
                <br />
                De meest gespotte vis per uur per maand.
            </p>

            <div className="timeline-container">
                <div className="legend">
                    <img
                        src="/images/snoek.png"
                        alt="Snoek icoon"
                    />
                    <p>= {SCALE} vissen</p>
                </div>

                <div className="bars">
                    {hourData.map((_, i) => {
                        const hour =
                            (i + scrollOffset) % HOURS;

                        const hourInfo = hourData[hour];

                        if (!hourInfo) return null;

                        const height = Math.round(
                            (hourInfo.average / maxFish) * 240
                        );

                        const fishCount = Math.ceil(
                            hourInfo.average / SCALE
                        );

                        const fishUrl = hourInfo.topFish
                            ? `/images/${encodeURIComponent(
                                hourInfo.topFish.toLowerCase()
                            )}.png`
                            : '';

                        return (
                            <div className="bar-col" key={hour}>
                                {hourInfo.average > 0 && (
                                    <span className="bar-count">
                                        {String(hour).padStart(2, '0')}
                                        :00
                                    </span>
                                )}

                                <div
                                    className="bar-fill"
                                    style={{ height: `${height}px` }}
                                >
                                    {fishCount > 0 &&
                                        fishUrl &&
                                        Array.from({
                                            length: fishCount
                                        }).map((_, idx) => (
                                            <img
                                                key={idx}
                                                src={fishUrl}
                                                alt={hourInfo.topFish}
                                            />
                                        ))}
                                </div>

                                <div className="tooltip">
                                    Gemiddeld {hourInfo.average.toFixed()}
                                    {' '}vissen gespot om{' '}
                                    {String(hour).padStart(2, '0')}
                                    :00.
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="timeline-controls">
                    <button
                        className="btn scroll-left"
                        onClick={() =>
                            setScrollOffset(prev =>
                                (prev - 1 + HOURS) % HOURS
                            )
                        }
                    >
                        ← Uur naar links
                    </button>

                    <button
                        className="btn scroll-right"
                        onClick={() =>
                            setScrollOffset(prev =>
                                (prev + 1) % HOURS
                            )
                        }
                    >
                        Uur naar rechts →
                    </button>
                </div>
            </div>

        </TimelineStatic>
    );
}