import "./error_message.css";

export function ErrorMessage({ error }) {
    error = error?.message || error;

    return (
        <div className="error-message">Error: {error}</div>
    )
}