import { useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, SortIcon } from './Icon'

// A real data table.
//
// The admin screens were stacks of cards pretending to be a list: no column
// alignment, so nothing could be compared down a column; no sorting; no
// pagination; and a moderation queue that grew without bound. Cards are the
// right answer on a phone and the wrong one on a moderator's desktop, so this
// renders as a table above 720px and collapses to the card stack below it —
// same data, same actions, one component.
//
// Columns are declared, not hardcoded:
//   { key, header, render?, sortable?, sortValue?, align?, width?, primary? }
//
// `primary` marks the column that becomes the heading in card mode. Sorting is
// client-side on the rows it is handed, which is the right scope here — these
// lists are administrative and already bounded by a filter.

export default function DataTable({
  columns,
  rows,
  rowKey = (r) => r._id || r.id,
  pageSize = 12,
  caption,
  empty = null,
  zebra = true,
  className = '',
}) {
  const [sort, setSort] = useState({ key: null, dir: null })
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    if (!sort.key || !sort.dir) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return rows
    const value = col.sortValue || ((row) => row[col.key])
    // Copy before sorting: mutating the caller's array in place makes the
    // parent's state change identity-silently and the list stops re-rendering.
    return [...rows].sort((a, b) => {
      const av = value(a), bv = value(b)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' })
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort, columns])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  const visible = pageSize > 0 ? sorted.slice(current * pageSize, current * pageSize + pageSize) : sorted

  // Unsorted → ascending → descending → unsorted. The third state matters:
  // without it there is no way back to the order the server sent.
  const toggleSort = (key) => {
    setPage(0)
    setSort((s) => {
      if (s.key !== key) return { key, dir: 'asc' }
      if (s.dir === 'asc') return { key, dir: 'desc' }
      return { key: null, dir: null }
    })
  }

  if (rows.length === 0 && empty) return empty

  const primaryCol = columns.find((c) => c.primary) || columns[0]

  return (
    <div className={`ct-table-wrap ${className}`}>
      <div className="ct-table-scroll">
        <table className="ct-table">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((col) => {
                const active = sort.key === col.key
                const dir = active ? sort.dir : null
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={{ width: col.width, textAlign: col.align || 'left' }}
                    // aria-sort is what tells a screen reader the column is
                    // ordered, and which way.
                    aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        className="ct-table__sort"
                        onClick={() => toggleSort(col.key)}
                      >
                        {col.header}
                        <SortIcon dir={dir} />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className={zebra ? 'ct-table--zebra' : ''}>
            {visible.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((col) => (
                  <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card mode. Same rows, same renderers — the column header becomes the
          field label so nothing loses its meaning on a narrow screen. */}
      <div className="ct-table-cards">
        {visible.map((row) => (
          <div key={rowKey(row)} className="ct-table-card">
            <div className="ct-table-card__head">
              {primaryCol.render ? primaryCol.render(row) : row[primaryCol.key]}
            </div>
            <dl className="ct-table-card__fields">
              {columns.filter((c) => c !== primaryCol && !c.hideOnCard).map((col) => (
                <div key={col.key} className="ct-table-card__row">
                  <dt>{col.header}</dt>
                  <dd>{col.render ? col.render(row) : row[col.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {pageCount > 1 && (
        <nav className="ct-pagination" aria-label="Pagination">
          <button
            type="button"
            className="ct-btn ct-btn--ghost ct-btn--sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={current === 0}
          >
            <ChevronLeftIcon size={13} /> Prev
          </button>
          {/* A range, not a page-number strip: with a filter above the table the
              exact page number is rarely what anyone is looking for. */}
          <span className="ct-pagination__status" aria-live="polite">
            {current * pageSize + 1}–{Math.min((current + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <button
            type="button"
            className="ct-btn ct-btn--ghost ct-btn--sm"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={current >= pageCount - 1}
          >
            Next <ChevronRightIcon size={13} />
          </button>
        </nav>
      )}
    </div>
  )
}
