export function LabelElement({ name, small=false, children }) {
    return (
        <div className="field-wrapper">
            {small ? <h4>{name}</h4> : <h3>{name}</h3>}
            {children}
        </div>
    );
}
