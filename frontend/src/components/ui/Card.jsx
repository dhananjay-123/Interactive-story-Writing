// The standard raised surface.
//
// `interactive` adds the lift, and it responds to :focus-within as well as
// :hover — the card is usually a link, and a keyboard reader landing on it
// should get the same feedback a mouse user does. Previously that lift was a
// useState(hovered) in each card, which meant a re-render per mouse-over and
// nothing at all on Tab.

export default function Card({
  as: Tag = 'div',
  interactive = false,
  padding = 'var(--s-6)',
  className = '',
  style,
  children,
  ...rest
}) {
  return (
    <Tag
      className={`ct-card${interactive ? ' ct-card--interactive' : ''} ${className}`}
      style={{ padding, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
