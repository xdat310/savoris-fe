import { marked } from 'marked'

marked.use({ gfm: true, breaks: true })

/** Renders markdown using the marked library. */
export function Md({ children, className }: { children: string; className?: string }) {
  const html = marked.parse(children) as string
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
