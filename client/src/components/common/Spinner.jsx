export function Spinner() {
  return <div className="spinner" role="status" aria-label="loading" />;
}

export function PageSpinner() {
  return (
    <div className="spinner-page">
      <Spinner />
    </div>
  );
}
