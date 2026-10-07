// Offline asset preparation; no PDF renderer is shipped to the browser.
// Invoked by npm run media:prepare with explicit local source/output paths.
import Foundation
import PDFKit
import AppKit
import AVFoundation

guard CommandLine.arguments.count == 3 else { fatalError("Usage: render-ivan-documents.swift SOURCE OUTPUT") }
let source = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let output = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
let sources = [
    ("engineering-newsletter", source.appendingPathComponent("editorial/publications/engineering-newsletter.pdf").path),
    ("acmc-chronicle", source.appendingPathComponent("editorial/publications/acmc-chronicle.pdf").path)
]
for (slug, path) in sources {
    guard let document = PDFDocument(url: URL(fileURLWithPath: path)) else { fatalError("Unable to read \(path)") }
    let directory = output.appendingPathComponent(slug, isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    var texts: [String] = []
    for index in 0..<document.pageCount {
        let page = document.page(at: index)!
        let bounds = page.bounds(for: .mediaBox)
        let image = page.thumbnail(of: NSSize(width: 1600, height: 1600 * bounds.height / bounds.width), for: .mediaBox)
        let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
        try bitmap.representation(using: .png, properties: [:])!.write(to: directory.appendingPathComponent("page-\(index + 1).png"))
        texts.append(page.string ?? "")
    }
    try JSONSerialization.data(withJSONObject: texts, options: [.prettyPrinted, .withoutEscapingSlashes]).write(to: directory.appendingPathComponent("text.json"))
    print("\(slug): \(document.pageCount) pages")
}
let clip = AVURLAsset(url: source.appendingPathComponent("editorial/video/alumni-video.mp4"))
let frames = AVAssetImageGenerator(asset: clip)
frames.appliesPreferredTrackTransform = true
frames.maximumSize = CGSize(width: 900, height: 600)
let poster = try frames.copyCGImage(at: CMTime(seconds: 15, preferredTimescale: 600), actualTime: nil)
try NSBitmapImageRep(cgImage: poster).representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent("video-15.png"))
