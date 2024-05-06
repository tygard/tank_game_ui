export function OpenHours({ openHours }) {
    if(!openHours || openHours.schedules.length === 0) return;

    return (
        <>
            <h3>Schedule</h3>
            <p>Offical Time: {openHours.getCurrentTime()}</p>
            <table className="pretty-table">
                <tr>
                    <th>Days</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                </tr>
                {openHours.schedules.map(schedule => {
                    return (
                        <tr>
                            <td>{schedule.daysOfWeek.join(", ")}</td>
                            <td>{schedule.startTime}</td>
                            <td>{schedule.endTime}</td>
                        </tr>
                    );
                })}
            </table>
        </>
    );
}