import { prettyifyName } from "../../../../common/state/utils.mjs";

export function AttributeList({ attributes, excludedAttributes = new Set() }) {
    return (
        <table>
            {Array.from(attributes)
                .filter(attribute => !excludedAttributes.has(attribute.name))
                .map(attribute => {
                    return (
                        <tr key={attribute.name}>
                            <td>{prettyifyName(attribute.name)}</td>
                            <td>{attribute.toString()}</td>
                        </tr>
                    );
                })}
        </table>
    );
}