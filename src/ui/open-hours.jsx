export function OpenHours({ openHours, debug }) {
    if(!openHours || openHours.schedules.length === 0) return;

    const showHolidays = openHours.schedules.find(schedule => schedule.holidays.length > 0);

    return (
        <>
            <h3>Schedule</h3>
            <p>Offical Time: {openHours.getCurrentTime()}</p>
            <table className="pretty-table">
                <tr>
                    <th>Days</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    {showHolidays ? <th>Holidays</th> : undefined}
                    {debug ? <th>Auto Start Day</th> : undefined}
                </tr>
                {openHours.schedules.map(schedule => {
                    return (
                        <tr key={`${schedule.daysOfWeek}-${schedule.startTime}`}>
                            <td>{schedule.daysOfWeek.join(", ")}</td>
                            <td>{schedule.startTime}</td>
                            <td>{schedule.endTime}</td>
                            {showHolidays ? <td>{schedule.holidays.join(", ")}</td> : undefined}
                            {debug ? <td>{schedule.autoStartOfDay ? "yes" : "no"}</td> : undefined}
                        </tr>
                    );
                })}
            </table>
        </>
    );
}