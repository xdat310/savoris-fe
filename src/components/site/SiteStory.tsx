import { ArrowRight } from 'lucide-react'
import { Md } from '../../lib/md'
import type { SiteSection } from '../../api/site'
import { cloudinaryDeliveryUrl } from '../../lib/cloudinary'

function cdnUrl(url: string, w: number) {
  return cloudinaryDeliveryUrl(url, `f_auto,q_auto,w_${w}`)
}

function safeStoryLink(url?: string) {
  const href = url?.trim()
  return href && !/^(javascript|data|vbscript):/i.test(href) ? href : undefined
}

function StoryBlock({ s, index }: { s: SiteSection; index: number }) {
  const flip = s.image_side ? s.image_side === 'left' : index % 2 === 1
  const link = safeStoryLink(s.link_url)

  return (
    <article
      className={`story-block${flip ? ' story-block--flip' : ''}`}
    >
      <div className="story-media">
        <img
          src={cdnUrl(s.image_url, 960)}
          srcSet={`${cdnUrl(s.image_url, 640)} 640w, ${cdnUrl(s.image_url, 960)} 960w`}
          sizes="(max-width:900px) 100vw, 45vw"
          alt={s.image_alt ?? s.title}
          loading={index === 0 ? 'eager' : 'lazy'}
        />
        <div className="story-vignette" aria-hidden="true" />
      </div>
      <div className="story-copy">
        <h2 className="story-title">
          {s.title.split('\n').map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}
        </h2>
        <Md className="story-body md-render">{s.body}</Md>
        {s.link_text && link && (
          <a className="story-link" href={link}>
            {s.link_text} <ArrowRight size={14} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  )
}

interface Props { sections?: SiteSection[] }

export function SiteStory({ sections }: Props) {
  const data = (sections ?? []).filter((s) => s.visible && (s.title || s.body || s.image_url)).sort((a, b) => a.order - b.order)
  if (data.length === 0) return null
  return (
    <section className="story-wrap" id="ve-chung-toi" aria-label="Câu chuyện của chúng tôi">
      {data.map((s, i) => <StoryBlock key={s.id} s={s} index={i} />)}
    </section>
  )
}
