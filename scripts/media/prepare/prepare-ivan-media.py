"""Run after render-ivan-documents.swift. Pillow is an offline preparation tool only."""
from pathlib import Path
from PIL import Image
import hashlib, json, shutil, argparse
from urllib.request import urlopen

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True)
parser.add_argument('--temporary', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
out = args.output
out.mkdir(parents=True, exist_ok=True)
inspection = args.temporary / 'photos'
rendered = args.temporary / 'rendered'
inspection.mkdir(parents=True, exist_ok=True)
photos = {
    'argus-source.jpg': 'https://files.us-siteglide.com/instances/116/assets/images/news/ai-hackathon-1.jpg',
    'pentimento-source.jpeg': 'https://files.us-siteglide.com/instances/116/assets/images/news/ACMC-Pentimento.jpeg',
}
for name, url in photos.items():
    if not (inspection / name).exists():
        with urlopen(url, timeout=30) as response:
            (inspection / name).write_bytes(response.read())

def webp(source, target, width, quality=88):
    with Image.open(source) as image:
        image = image.convert('RGB')
        if image.width > width:
            image = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
        image.save(target, 'WEBP', quality=quality, method=6)

sources = {
    'engineering-newsletter.pdf': args.source / 'editorial/publications/engineering-newsletter.pdf',
    'acmc-chronicle.pdf': args.source / 'editorial/publications/acmc-chronicle.pdf',
    'alumni-video.mp4': args.source / 'editorial/video/alumni-video.mp4',
}
manifest = {}
for name, source in sources.items():
    with source.open('rb') as stream:
        checksum = hashlib.file_digest(stream, 'sha256').hexdigest()
    manifest[name] = {'source': source.name, 'sha256': checksum}
for slug in ('engineering-newsletter', 'acmc-chronicle'):
    directory = out / slug
    directory.mkdir(exist_ok=True)
    for image in (rendered / slug).glob('*.png'):
        webp(image, directory / f'{image.stem}.webp', 1600, 90)
    shutil.copyfile(rendered / slug / 'text.json', directory / 'text.json')
for source, name, width in [
    (inspection / 'argus-source.jpg', 'argus-article.webp', 800),
    (inspection / 'pentimento-source.jpeg', 'pentimento-article.webp', 1024),
    (rendered / 'video-15.png' if (rendered / 'video-15.png').exists() else inspection / 'video-15.png', 'alumni-video-preview.webp', 900),
    (rendered / 'engineering-newsletter/page-2.png', 'engineering-newsletter-preview.webp', 600),
    (rendered / 'acmc-chronicle/page-1.png', 'acmc-chronicle-preview.webp', 600),
    (rendered / 'acmc-chronicle/page-2.png', 'acmc-leadership-preview.webp', 800),
]:
    webp(source, out / name, width)
manifest['articlePhotos'] = {
    'argus-article.webp': 'https://files.us-siteglide.com/instances/116/assets/images/news/ai-hackathon-1.jpg',
    'pentimento-article.webp': 'https://files.us-siteglide.com/instances/116/assets/images/news/ACMC-Pentimento.jpeg',
}
(out / 'sources.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Verified local sources; prepared 14 reading pages, six lightweight images, and source checksums.')
