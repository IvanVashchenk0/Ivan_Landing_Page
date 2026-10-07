const ARGUS_YOUTUBE_EMBED = 'https://www.youtube-nocookie.com/embed/nWmL6yigrqI?start=55&autoplay=0&controls=1&playsinline=1&rel=0'

export function WorkingProduct() {
  return <div className="argus-console argus-video-frame">
    <iframe src={ARGUS_YOUTUBE_EMBED} title="Argus working product demonstration" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
  </div>
}
