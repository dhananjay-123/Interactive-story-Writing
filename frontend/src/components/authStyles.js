// Shared field styling for the auth + create forms, matching the app's ink/gold theme.

export const inputStyle = {
  width: '100%',
  background: 'rgba(var(--panel-rgb),var(--pa04))',
  border: '1px solid rgba(var(--panel-rgb),var(--pa10))',
  borderRadius: '3px',
  padding: '12px 16px',
  color: 'var(--parchment)',
  fontSize: '15px',
  outline: 'none',
  transition: 'border-color 0.2s ease',
  fontFamily: 'inherit',
}

export const labelStyle = {
  display: 'block',
  fontSize: '11px',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'rgba(var(--text-rgb),var(--ta40))',
  marginBottom: '8px',
}

export const focusBorder = (e) => {
  e.target.style.borderColor = 'rgba(var(--gold-rgb),0.4)'
}

export const blurBorder = (e) => {
  e.target.style.borderColor = 'rgba(var(--panel-rgb),var(--pa10))'
}
