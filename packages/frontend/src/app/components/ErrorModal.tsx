"use client";

interface Props {
    message: string;
    onClose: () => void;
}

export function ErrorModal({ message, onClose }: Props) {
    return (
        <div className="modal is-active">
            <div className="modal-background" onClick={onClose} />
            <div className="modal-card">
                <header className="modal-card-head has-background-danger-light">
                    <p className="modal-card-title has-text-danger">Something went wrong</p>
                    <button className="delete" aria-label="close" onClick={onClose} />
                </header>
                <section className="modal-card-body">
                    <p>{message}</p>
                </section>
                <footer className="modal-card-foot" style={{ justifyContent: "flex-end" }}>
                    <button className="button" onClick={onClose}>Dismiss</button>
                </footer>
            </div>
        </div>
    );
}
