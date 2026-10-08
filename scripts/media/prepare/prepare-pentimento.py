"""Separate web derivatives only. Requires FFmpeg and Pillow; never rewrites masters."""
import argparse, hashlib, json, os, pathlib, shutil, subprocess
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--ffmpeg', default=os.environ.get('FFMPEG', shutil.which('ffmpeg')))
parser.add_argument('--model-frame', required=True, help='Verified real-model PNG from the repack render comparison')
args = parser.parse_args()
if not pathlib.Path(args.model_frame).is_file():
    parser.error('The verified real-model capture is missing; no substitute is generated.')
if not args.ffmpeg:
    parser.error('Supply --ffmpeg /path/to/ffmpeg')
root = pathlib.Path(__file__).resolve().parents[3]
source = root / 'media-source/projects/pentimento/sarah_checkin.mp4'
output = source.with_name('sarah_checkin-web.mp4')
public = root / 'public/media/projects/pentimento'
cache = root / '.cache/pentimento-performance'
public.mkdir(parents=True, exist_ok=True); cache.mkdir(parents=True, exist_ok=True)
manifest = json.loads((root / 'scripts/media/manifest.json').read_text())['assets']
protected = [a for a in manifest.values() if a['sourcePath'].startswith('projects/pentimento/') and a['sourcePath'].split('/')[-1] in ['Textured_mesh_1.glb','Textured_mesh_1_binary-repacked.glb','sarah_checkin.MOV','sarah_checkin.mp4']]
def verify():
    for asset in protected:
        with (root / 'media-source' / asset['sourcePath']).open('rb') as f:
            assert hashlib.file_digest(f, 'sha256').hexdigest() == asset['sha256'], asset['sourcePath']
verify()
if output.exists():
    parser.error('Web derivative already exists; refusing to overwrite it.')
command = [args.ffmpeg, '-nostdin', '-n', '-i', str(source), '-map', '0:v:0', '-vf', 'setpts=(PTS-STARTPTS)/5,fps=30', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-profile:v', 'high', '-level:v', '4.1', '-pix_fmt', 'yuv420p', '-g', '60', '-keyint_min', '30', '-movflags', '+faststart', str(output)]
subprocess.run(command, check=True)
frame = cache / 'input-poster.png'
subprocess.run([args.ffmpeg, '-nostdin', '-y', '-ss', '2', '-i', str(output), '-frames:v', '1', str(frame)], check=True)
with Image.open(frame) as image:
    image.thumbnail((1280,720)); image.save(public / 'input-poster.webp', quality=88, method=6)
with Image.open(args.model_frame) as image:
    image.save(public / 'model-still.webp', quality=92, method=6)
verify()
report = {'command': command, 'source': str(source.relative_to(root)), 'output': str(output.relative_to(root)), 'size': output.stat().st_size, 'sha256': hashlib.file_digest(output.open('rb'), 'sha256').hexdigest(), 'modelFrame': args.model_frame, 'posters': {p.name:p.stat().st_size for p in public.glob('*.webp')}}
(cache / 'preparation.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
