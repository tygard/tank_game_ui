import { useCallback } from "preact/hooks";

export function Select({ spec, value, setValue }) {
    const onChange = useCallback(e => {
        setValue(e.target.value == "unset" ? undefined : spec.options[+e.target.value]);
    }, [setValue, spec]);

    const currentIndex = value !== undefined ? spec.options.indexOf(value) : -1;

    return (
        <div className="radio-container">
            {spec.options.map((element, index) => {
                const value = element.toString();

                return (
                    <div key={index} className="radio-button-wrapper">
                        <label>
                            <input type="radio" value={index} onChange={onChange} checked={index === currentIndex}/>
                            {value}
                        </label>
                    </div>
                );
            })}
        </div>
    );
}

export function SelectPosition({ builtTurnState }) {
    const {locations} = builtTurnState.locationSelector;
    const message = locations?.length > 0 ?
        `${locations.join(", ")} (select a different space to change)` :
        `Select a location on the board`;

    return (
        <span>{message}</span>
    );
}
