import Experience from '@/components/experience/Experience'
import { CHAPTERS } from '@/content/chapters'
import { SOURCES, SOURCE_TYPE_LABEL } from '@/content/sources'

/**
 * The narrative is server-rendered from the same config the WebGL overlay uses.
 * It is visible when WebGL is unavailable and always available to screen readers.
 */
export default function Page() {
  const opened = CHAPTERS.filter((c) => c.available)
  return (
    <main>
      <Experience />
      <article className="text-journey">
        <header>
          <h1>SIRR</h1>
          <p>bir iç seyir</p>
        </header>
        {opened.map((c) => (
          <section key={c.id}>
            <h2>
              0{c.index} · {c.title}
            </h2>
            {c.beats
              .filter((b) => b.kind !== 'title')
              .map((b) => (
                <p key={b.id}>{b.text}</p>
              ))}
            {c.stillLine && <p>{c.stillLine}</p>}
            <h3>Kaynaklar</h3>
            <ul>
              {c.sources.map((id) => (
                <li key={id}>
                  <strong>{SOURCE_TYPE_LABEL[SOURCES[id].type]}:</strong> {SOURCES[id].ref}. {SOURCES[id].summary}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p>
          <small>SIRR çerez kullanmaz ve hiçbir veri toplamaz. Son bölümde bırakabileceğin kelime yalnızca bu tarayıcıda saklanır.</small>
        </p>
        <noscript>
          <p>Bu deneyim JavaScript ve WebGL ile çalışır; yukarıdaki metin aynı yolculuğun yazılı hâlidir.</p>
        </noscript>
      </article>
    </main>
  )
}
