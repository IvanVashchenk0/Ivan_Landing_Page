# AHU Digitalization Pipeline

The ME category preview uses `ahu.preview`. It autoplays muted and inline only while at least 20% visible, loops, pauses offscreen or in a hidden tab, and remains a static poster under reduced motion until the visitor requests playback.

The dedicated route contains exactly five exhibits:

1. **Scanning** — `ahu.scanning`
2. **3D Model Generation** — `ahu.model-generation`
3. **Digital AHU Application** — `ahu.application`
4. **Engineering Output** — `ahu.engineering-output`
5. **Complete Pipeline** — `ahu.complete-pipeline`

Each exhibit starts with a committed real-frame poster and `preload="none"`. Its heavy source URL is attached only while that exhibit is visible, then it autoplays muted, inline, and looped with native controls. A single-active coordinator releases the previous source as the visitor reaches the next exhibit, preventing parallel downloads. Reduced motion keeps each poster static until explicit playback. The project route suppresses the category preview so the page contains only the requested five video exhibits.

The six supplied files were inspected before registration. All are 1280×720 H.264 MP4s with AAC audio and `moov` before `mdat`; the originals therefore already satisfy the browser-delivery requirements and remain byte-identical in ignored `media-source/projects/ahu-digitalization/`.
