// A heading that rises into view one line at a time, each line sliding up from behind its own edge.
// The lines are written out explicitly so the breaks are designed, not left to the browser.
export function Lines({ as: Tag = 'h2', lines, className = '', delay = 0, ...rest }) {
  return (
    <Tag className={`lines ${className}`} style={{ '--d0': `${delay}s` }} {...rest}>
      {lines.map((line, i) => (
        <span className="ln" key={i}>
          <span style={{ '--i': i }}>{line}</span>
        </span>
      ))}
    </Tag>
  );
}
