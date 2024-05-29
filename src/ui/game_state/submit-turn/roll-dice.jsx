import { prettyifyName } from "../../../utils.js";
import { imageBackground } from "../../../versions/base/descriptors.js";
import { LabelElement } from "./base.jsx";
import { Select } from "./select.jsx";

export function RollDice({ spec, value, setValue, allowManualRolls }) {
    if(value === undefined) {
        setValue({ type: "die-roll", manual: false });
        return;
    }

    const selectManualRoll = () => {
        setValue({
            type: "die-roll",
            manual: true,
            dice: spec.expandedDice.map(() => undefined),
        });
    };

    // The number of dice has changed
    if(value.manual && spec.expandedDice.length !== value.dice.length) {
        selectManualRoll();
        return;
    }

    const selectRollType = rollType => {
        if(rollType == "Manual Roll") {
            selectManualRoll();
        }
        else {
            setValue({ type: "die-roll", manual: false });
        }
    };

    let diceSection;
    if(value.manual) {
        let dieNumber;
        let dieName;

        diceSection = (
            <div className="submit-turn-field-wrapper">
                {spec.expandedDice.map((die, index) => {
                    const setDieValue = newRoll => {
                        setValue({
                            ...value,
                            dice: [...value.dice.slice(0, index), newRoll, ...value.dice.slice(index + 1)]
                        });
                    };

                    // Count the number of die of each type
                    if(dieName != die.name) {
                        dieName = die.name;
                        dieNumber = 0;
                    }

                    ++dieNumber;

                    return (
                        <LabelElement key={index} name={`${prettyifyName(die.name)} ${dieNumber}`} small>
                            <Select
                                spec={{ options: die.sideNames }}
                                value={value.dice[index]}
                                setValue={setDieValue}></Select>
                        </LabelElement>
                    );
                })}
            </div>
        );
    }

    return (
        <>
            {allowManualRolls ?
                <Select
                    spec={{ options: ["Auto Roll", "Manual Roll"] }}
                    value={value.manual ? "Manual Roll" : "Auto Roll"}
                    setValue={selectRollType}></Select> : undefined}
            <p>
                {value.manual ? "Roll the following dice" : "The following dice will be rolled on submit"}
                <ul>
                    {spec.describeDice().map(description => {
                        return (
                            <li key={description}>{description}</li>
                        );
                    })}
                </ul>
            </p>
            {diceSection}
        </>
    );
}

export function DieRollResults({ rollLogEntry, onClose }) {
    const rollFields = Object.keys(rollLogEntry.dieRolls)
        .map(key => [key, rollLogEntry.dieRolls[key]])
        .filter(field => !rollLogEntry.rawLogEntry[field[0]].manual);

    // Nothing was rolled close the view
    if(rollFields.length === 0) {
        onClose();
    }

    return (
        <div className="submit-turn-box">
            <div className="submit-turn-title">
                <h2>Die Roll Results</h2>
                <div>
                    <button onClick={onClose}>Close</button>
                </div>
            </div>
            <div className="roll-result-body">
                {rollFields.map(([fieldName, field]) => {
                    return (
                        <div key={fieldName}>
                            <h3>{prettyifyName(fieldName)}</h3>
                            <p>
                                {field.map(dieSide => {
                                    const style = {
                                        background: imageBackground(dieSide.icon),
                                        backgroundSize: "cover", // Stretch to fit
                                    };

                                    return (
                                        <div className="die-box" style={style} key={dieSide.display}>
                                            {dieSide.icon === undefined ?
                                                <span>{dieSide.display}</span> :
                                                undefined}
                                        </div>
                                    );
                                })}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}