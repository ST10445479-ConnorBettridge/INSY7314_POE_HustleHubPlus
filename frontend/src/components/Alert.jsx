export default function Alert({ kind = 'error', children }) {
  return <div className={`alert alert-${kind}`}>{children}</div>;
}