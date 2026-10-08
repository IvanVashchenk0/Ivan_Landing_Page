import AppKit
import AVFoundation
import Foundation

struct VideoJob {
  let source: URL
  let output: URL
  let poster: URL
}

enum PreparationError: Error, CustomStringConvertible {
  case usage
  case noVideo(URL)
  case unsupportedExport(URL)
  case exportFailed(URL, String)
  case posterFailed(URL)

  var description: String {
    switch self {
    case .usage:
      return "Usage: prepare-image-recognition.swift SOURCE_DIR DERIVATIVE_DIR POSTER_DIR"
    case .noVideo(let url):
      return "No video track found in \(url.path)"
    case .unsupportedExport(let url):
      return "The source cannot be exported as H.264 MP4: \(url.path)"
    case .exportFailed(let url, let reason):
      return "Video export failed for \(url.path): \(reason)"
    case .posterFailed(let url):
      return "Poster generation failed for \(url.path)"
    }
  }
}

func exportVideo(_ job: VideoJob) async throws {
  let asset = AVURLAsset(url: job.source)
  let tracks = try await asset.loadTracks(withMediaType: .video)
  guard let track = tracks.first else { throw PreparationError.noVideo(job.source) }
  let duration = try await asset.load(.duration)
  let naturalSize = try await track.load(.naturalSize)
  let transform = try await track.load(.preferredTransform)
  let displayedSize = naturalSize.applying(transform)
  let presets = AVAssetExportSession.exportPresets(compatibleWith: asset)
  let preset = presets.contains(AVAssetExportPreset1920x1080) ? AVAssetExportPreset1920x1080 : AVAssetExportPresetHighestQuality
  guard let exporter = AVAssetExportSession(asset: asset, presetName: preset), exporter.supportedFileTypes.contains(.mp4) else {
    throw PreparationError.unsupportedExport(job.source)
  }
  try? FileManager.default.removeItem(at: job.output)
  exporter.shouldOptimizeForNetworkUse = true
  exporter.outputURL = job.output
  exporter.outputFileType = .mp4
  await withCheckedContinuation { continuation in
    exporter.exportAsynchronously { continuation.resume() }
  }
  guard exporter.status == .completed else {
    throw PreparationError.exportFailed(job.source, exporter.error?.localizedDescription ?? "unknown export error")
  }
  let exportedDuration = try await AVURLAsset(url: job.output).load(.duration)

  let generator = AVAssetImageGenerator(asset: asset)
  generator.appliesPreferredTrackTransform = true
  generator.maximumSize = NSSize(width: 1600, height: 1000)
  generator.requestedTimeToleranceBefore = .zero
  generator.requestedTimeToleranceAfter = CMTime(seconds: 0.5, preferredTimescale: 600)
  let posterTime = CMTime(seconds: max(0.25, CMTimeGetSeconds(duration) * 0.42), preferredTimescale: 600)
  let image = try await generator.image(at: posterTime).image
  let representation = NSBitmapImageRep(cgImage: image)
  guard let jpeg = representation.representation(using: .jpeg, properties: [.compressionFactor: 0.84]) else {
    throw PreparationError.posterFailed(job.source)
  }
  try jpeg.write(to: job.poster, options: .atomic)
  let outputSize = try FileManager.default.attributesOfItem(atPath: job.output.path)[.size] as? NSNumber
  let sourceDuration = String(format: "%.3f", CMTimeGetSeconds(duration))
  let outputDuration = String(format: "%.3f", CMTimeGetSeconds(exportedDuration))
  print("Prepared \(job.source.lastPathComponent): source \(sourceDuration)s, video track \(outputDuration)s, \(Int(abs(displayedSize.width)))×\(Int(abs(displayedSize.height))), MP4 \(outputSize?.intValue ?? 0) bytes")
}

guard CommandLine.arguments.count == 4 else {
  fputs("\(PreparationError.usage)\n", stderr)
  exit(1)
}
let sourceDirectory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let derivativeDirectory = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
let posterDirectory = URL(fileURLWithPath: CommandLine.arguments[3], isDirectory: true)
Task {
  do {
    try FileManager.default.createDirectory(at: derivativeDirectory, withIntermediateDirectories: true)
    try FileManager.default.createDirectory(at: posterDirectory, withIntermediateDirectories: true)
    for name in ["full-pipeline", "similarity", "over-write"] {
      try await exportVideo(VideoJob(
        source: sourceDirectory.appendingPathComponent("\(name).mov"),
        output: derivativeDirectory.appendingPathComponent("\(name)-web.mp4"),
        poster: posterDirectory.appendingPathComponent("\(name)-poster.jpg")
      ))
    }
    exit(0)
  } catch {
    fputs("\(error)\n", stderr)
    exit(1)
  }
}
RunLoop.main.run()
