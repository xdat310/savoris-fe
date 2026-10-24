import { marked } from 'marked'

const renderer = new marked.Renderer()

marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    html({ text }) {
      return text.replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]!)
    },
    link(token) {
      const isBareCloudinaryUrl = token.href?.startsWith('https://res.cloudinary.com/') &&
        (token.autolink || token.text === token.href)
      return isBareCloudinaryUrl ? '' : renderer.link(token)
    },
  },
})

/** Renders markdown using the marked library. */
export function Md({ children, className }: { children: string; className?: string }) {
  const html = marked.parse(children) as string
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
