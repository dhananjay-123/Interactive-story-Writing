import { Link } from 'react-router-dom'

// A mistyped or long-dead URL. Every other dead end in the app says so and
// offers a way back; without this one, an unmatched route left nothing on the
// page but the navigation bar.
export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center' }}>
      <p className="font-story" style={{ fontSize: '22px', color: 'rgba(var(--text-rgb),var(--ta60))', fontStyle: 'italic', marginBottom: '20px' }}>
        There is no page at this address.
      </p>
      <Link to="/stories" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Back to the library →
      </Link>
    </div>
  )
}
