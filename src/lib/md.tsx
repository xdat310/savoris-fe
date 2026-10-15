// Minimal markdown renderer: **bold**, *italic*, _italic_, \n\n paragraphs, \n line-break
// Escapes HTML first so no XSS risk from CMS-supplied content.

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function inline(s: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
    .replace(/_([^_\n]+?)_/g, '<em>$1</em>')
}

/** Renders markdown text as one or more <p> elements with the given className. */
export function Md({ children, className }: { children: string; className?: string }) {
  const blocks = children.split(/\n\n+/).filter(Boolean)
  if (blocks.length === 1) {
    const html = blocks[0].split('\n').map(inline).join('<br />')
    return <p className={className} dangerouslySetInnerHTML={{ __html: html }} />
  }
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        const html = b.split('\n').map(inline).join('<br />')
        return <p key={i} dangerouslySetInnerHTML={{ __html: html }} style={{ margin: '0 0 0.8em' }} />
      })}
    </div>
  )
}
