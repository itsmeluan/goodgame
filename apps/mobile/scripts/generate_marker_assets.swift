import AppKit

struct MarkerPalette {
  let fill: NSColor
  let glyph: NSColor
  let badgeFill: NSColor
  let badgeStroke: NSColor
  let badgeText: NSColor
}

enum MarkerGlyph {
  case meetup
  case venue
  case cluster
  case draft
}

let designCanvasSize: CGFloat = 96
let canvasSize: CGFloat = 64
let markerScale: CGFloat = canvasSize / designCanvasSize

func s(_ value: CGFloat) -> CGFloat {
  value * markerScale
}

let circleRect = NSRect(x: s(16), y: s(16), width: s(64), height: s(64))
let shadowRect = NSRect(x: s(12), y: s(12), width: s(72), height: s(72))
let badgeRect = NSRect(x: s(55), y: s(55), width: s(28), height: s(28))
let borderColor = NSColor(calibratedWhite: 1, alpha: 0.2)
let innerRingColor = NSColor(calibratedWhite: 1, alpha: 0.08)
let shadowColor = NSColor(calibratedWhite: 0, alpha: 0.18)

let meetupPalette = MarkerPalette(
  fill: NSColor(calibratedRed: 244 / 255, green: 161 / 255, blue: 112 / 255, alpha: 1),
  glyph: NSColor(calibratedWhite: 0.11, alpha: 1),
  badgeFill: NSColor(calibratedWhite: 0.09, alpha: 1),
  badgeStroke: NSColor(calibratedWhite: 0.94, alpha: 0.18),
  badgeText: NSColor(calibratedWhite: 0.98, alpha: 1)
)

let overduePalette = MarkerPalette(
  fill: NSColor(calibratedRed: 0.87, green: 0.5, blue: 0.53, alpha: 1),
  glyph: NSColor(calibratedWhite: 0.98, alpha: 1),
  badgeFill: NSColor(calibratedWhite: 0.18, alpha: 1),
  badgeStroke: NSColor(calibratedWhite: 0.94, alpha: 0.18),
  badgeText: NSColor(calibratedWhite: 0.98, alpha: 1)
)

let venuePalette = MarkerPalette(
  fill: NSColor(calibratedRed: 0.31, green: 0.35, blue: 0.38, alpha: 1),
  glyph: NSColor(calibratedWhite: 0.98, alpha: 1),
  badgeFill: NSColor(calibratedWhite: 0.12, alpha: 1),
  badgeStroke: NSColor(calibratedWhite: 0.94, alpha: 0.18),
  badgeText: NSColor(calibratedWhite: 0.98, alpha: 1)
)

let clusterPalette = MarkerPalette(
  fill: NSColor(calibratedRed: 0.14, green: 0.17, blue: 0.2, alpha: 1),
  glyph: NSColor(calibratedWhite: 0.95, alpha: 1),
  badgeFill: NSColor(calibratedWhite: 0.18, alpha: 1),
  badgeStroke: NSColor(calibratedWhite: 0.94, alpha: 0.18),
  badgeText: NSColor(calibratedWhite: 0.98, alpha: 1)
)

let draftPalette = MarkerPalette(
  fill: NSColor(calibratedRed: 247 / 255, green: 177 / 255, blue: 132 / 255, alpha: 1),
  glyph: NSColor(calibratedWhite: 0.12, alpha: 1),
  badgeFill: NSColor(calibratedWhite: 0.12, alpha: 1),
  badgeStroke: NSColor(calibratedWhite: 0.94, alpha: 0.18),
  badgeText: NSColor(calibratedWhite: 0.98, alpha: 1)
)

let projectRoot = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let outputDirectory = projectRoot.appendingPathComponent("apps/mobile/assets/map", isDirectory: true)

func drawBaseCircle(_ palette: MarkerPalette) {
  shadowColor.setFill()
  NSBezierPath(ovalIn: shadowRect).fill()

  let circlePath = NSBezierPath(ovalIn: circleRect)
  let gradient = NSGradient(colors: [
    palette.fill.blended(withFraction: 0.18, of: .white) ?? palette.fill,
    palette.fill,
    palette.fill.blended(withFraction: 0.16, of: .black) ?? palette.fill,
  ])
  gradient?.draw(in: circlePath, angle: -90)

  borderColor.setStroke()
  circlePath.lineWidth = s(1.2)
  circlePath.stroke()

  innerRingColor.setStroke()
  let innerRingPath = NSBezierPath(ovalIn: circleRect.insetBy(dx: s(3.5), dy: s(3.5)))
  innerRingPath.lineWidth = s(1.2)
  innerRingPath.stroke()
}

func drawMeetupGlyph(color: NSColor) {
  color.setStroke()
  color.setFill()

  let dieRect = NSRect(x: s(35), y: s(35), width: s(26), height: s(26))
  let diePath = NSBezierPath(roundedRect: dieRect, xRadius: s(5), yRadius: s(5))
  diePath.lineWidth = s(2.6)
  diePath.stroke()

  let dotSize: CGFloat = s(5)
  let offset: CGFloat = s(6.5)
  let center = NSPoint(x: dieRect.midX, y: dieRect.midY)
  let centers = [
    NSPoint(x: center.x - offset, y: center.y + offset),
    NSPoint(x: center.x + offset, y: center.y + offset),
    center,
    NSPoint(x: center.x - offset, y: center.y - offset),
    NSPoint(x: center.x + offset, y: center.y - offset),
  ]

  centers.forEach { center in
    NSBezierPath(
      ovalIn: NSRect(
        x: center.x - dotSize / 2,
        y: center.y - dotSize / 2,
        width: dotSize,
        height: dotSize
      )
    ).fill()
  }
}

func drawVenueGlyph(color: NSColor) {
  color.setStroke()
  color.setFill()

  let lineWidth: CGFloat = s(2.6)
  let bodyRect = NSRect(x: s(38), y: s(33), width: s(20), height: s(15))
  let bodyPath = NSBezierPath(roundedRect: bodyRect, xRadius: s(2.5), yRadius: s(2.5))
  bodyPath.lineWidth = lineWidth
  bodyPath.stroke()

  let awningTopY: CGFloat = s(56)
  let awningBottomY: CGFloat = s(47)
  let awningLeftX: CGFloat = s(34.5)
  let awningRightX: CGFloat = s(61.5)
  let stripeWidth: CGFloat = s(5.2)
  let startX: CGFloat = s(35.5)
  let stripeGap: CGFloat = s(1.1)

  let awningOutline = NSBezierPath()
  awningOutline.lineWidth = lineWidth
  awningOutline.lineCapStyle = .round
  awningOutline.lineJoinStyle = .round
  awningOutline.move(to: NSPoint(x: awningLeftX, y: awningTopY))
  awningOutline.line(to: NSPoint(x: awningRightX, y: awningTopY))
  awningOutline.line(to: NSPoint(x: awningRightX - 2, y: awningBottomY))
  awningOutline.line(to: NSPoint(x: awningLeftX + 2, y: awningBottomY))
  awningOutline.close()
  awningOutline.stroke()

  for index in 0..<4 {
    let x = startX + CGFloat(index) * (stripeWidth + stripeGap)
    let stripeRect = NSRect(x: x, y: awningBottomY, width: stripeWidth, height: awningTopY - awningBottomY)
    let stripePath = NSBezierPath(roundedRect: stripeRect, xRadius: s(1.4), yRadius: s(1.4))
    stripePath.fill()
  }

  let doorway = NSBezierPath(
    roundedRect: NSRect(x: s(45), y: s(33), width: s(6), height: s(9)),
    xRadius: s(1.4),
    yRadius: s(1.4)
  )
  doorway.lineWidth = s(2)
  doorway.stroke()

  let windowLine = NSBezierPath()
  windowLine.lineWidth = s(2)
  windowLine.lineCapStyle = .round
  windowLine.move(to: NSPoint(x: s(39.5), y: s(42.5)))
  windowLine.line(to: NSPoint(x: s(44), y: s(42.5)))
  windowLine.move(to: NSPoint(x: s(52), y: s(42.5)))
  windowLine.line(to: NSPoint(x: s(56.5), y: s(42.5)))
  windowLine.stroke()
}

func drawClusterGlyph(color: NSColor) {
  color.setFill()
  let offsets: [(CGFloat, CGFloat)] = [
    (s(39), s(49)),
    (s(51), s(49)),
    (s(39), s(37)),
    (s(51), s(37)),
  ]

  offsets.forEach { x, y in
    NSBezierPath(
      roundedRect: NSRect(x: x, y: y, width: s(8), height: s(8)),
      xRadius: s(2.5),
      yRadius: s(2.5)
    ).fill()
  }
}

func drawDraftGlyph(color: NSColor) {
  color.setStroke()
  let path = NSBezierPath()
  path.lineWidth = s(3)
  path.lineCapStyle = .round
  path.move(to: NSPoint(x: s(48), y: s(58)))
  path.line(to: NSPoint(x: s(48), y: s(38)))
  path.move(to: NSPoint(x: s(38), y: s(48)))
  path.line(to: NSPoint(x: s(58), y: s(48)))
  path.stroke()
  NSBezierPath(ovalIn: NSRect(x: s(43), y: s(43), width: s(10), height: s(10))).stroke()
}

func drawBadge(label: String, palette: MarkerPalette) {
  palette.badgeFill.setFill()
  let badgePath = NSBezierPath(roundedRect: badgeRect, xRadius: s(11), yRadius: s(11))
  badgePath.fill()

  palette.badgeStroke.setStroke()
  badgePath.lineWidth = s(1.6)
  badgePath.stroke()

  let paragraph = NSMutableParagraphStyle()
  paragraph.alignment = .center
  let fontSize: CGFloat = max(s(label == "9+" ? 12 : 14), 4)
  let attributes: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: fontSize, weight: .heavy),
    .foregroundColor: palette.badgeText,
    .paragraphStyle: paragraph,
  ]

  let textSize = (label as NSString).size(withAttributes: attributes)
  let textRect = NSRect(
    x: badgeRect.midX - textSize.width / 2,
    y: badgeRect.midY - textSize.height / 2 - s(0.3),
    width: textSize.width,
    height: textSize.height
  )
  (label as NSString).draw(in: textRect, withAttributes: attributes)
}

func buildMarkerImage(
  glyph: MarkerGlyph,
  palette: MarkerPalette,
  badgeLabel: String?,
  renderScale: CGFloat = 1
) -> NSImage {
  let pixelCanvasSize = canvasSize * renderScale
  guard
    let bitmap = NSBitmapImageRep(
      bitmapDataPlanes: nil,
      pixelsWide: Int(pixelCanvasSize),
      pixelsHigh: Int(pixelCanvasSize),
      bitsPerSample: 8,
      samplesPerPixel: 4,
      hasAlpha: true,
      isPlanar: false,
      colorSpaceName: .deviceRGB,
      bytesPerRow: 0,
      bitsPerPixel: 0
    ),
    let context = NSGraphicsContext(bitmapImageRep: bitmap)
  else {
    fatalError("Unable to create bitmap graphics context for marker asset generation")
  }

  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = context

  context.cgContext.scaleBy(x: renderScale, y: renderScale)

  NSColor.clear.setFill()
  NSBezierPath(rect: NSRect(x: 0, y: 0, width: canvasSize, height: canvasSize)).fill()

  drawBaseCircle(palette)

  switch glyph {
  case .meetup:
    drawMeetupGlyph(color: palette.glyph)
  case .venue:
    drawVenueGlyph(color: palette.glyph)
  case .cluster:
    drawClusterGlyph(color: palette.glyph)
  case .draft:
    drawDraftGlyph(color: palette.glyph)
  }

  if let badgeLabel {
    drawBadge(label: badgeLabel, palette: palette)
  }

  context.flushGraphics()
  NSGraphicsContext.restoreGraphicsState()

  let image = NSImage(size: NSSize(width: canvasSize, height: canvasSize))
  image.addRepresentation(bitmap)
  return image
}

func save(_ image: NSImage, to fileName: String) throws {
  let url = outputDirectory.appendingPathComponent(fileName)
  guard
    let bitmap = image.representations.compactMap({ $0 as? NSBitmapImageRep }).first,
    let data = bitmap.representation(using: .png, properties: [:])
  else {
    fatalError("Unable to encode marker asset \(fileName) as PNG")
  }
  try data.write(to: url)
}

func generateMarkerSet(prefix: String, glyph: MarkerGlyph, palette: MarkerPalette) throws {
  try save(buildMarkerImage(glyph: glyph, palette: palette, badgeLabel: nil), to: "\(prefix).png")
  try save(buildMarkerImage(glyph: glyph, palette: palette, badgeLabel: nil, renderScale: 2), to: "\(prefix)@2x.png")
  try save(buildMarkerImage(glyph: glyph, palette: palette, badgeLabel: nil, renderScale: 3), to: "\(prefix)@3x.png")

  for count in 2...9 {
    try save(
      buildMarkerImage(glyph: glyph, palette: palette, badgeLabel: String(count)),
      to: "\(prefix)-\(count).png"
    )
    try save(
      buildMarkerImage(glyph: glyph, palette: palette, badgeLabel: String(count), renderScale: 2),
      to: "\(prefix)-\(count)@2x.png"
    )
    try save(
      buildMarkerImage(glyph: glyph, palette: palette, badgeLabel: String(count), renderScale: 3),
      to: "\(prefix)-\(count)@3x.png"
    )
  }

  try save(buildMarkerImage(glyph: glyph, palette: palette, badgeLabel: "9+"), to: "\(prefix)-9plus.png")
  try save(
    buildMarkerImage(glyph: glyph, palette: palette, badgeLabel: "9+", renderScale: 2),
    to: "\(prefix)-9plus@2x.png"
  )
  try save(
    buildMarkerImage(glyph: glyph, palette: palette, badgeLabel: "9+", renderScale: 3),
    to: "\(prefix)-9plus@3x.png"
  )
}

try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
try generateMarkerSet(prefix: "marker-meetup", glyph: .meetup, palette: meetupPalette)
try generateMarkerSet(prefix: "marker-meetup-overdue", glyph: .meetup, palette: overduePalette)
try generateMarkerSet(prefix: "marker-venue", glyph: .venue, palette: venuePalette)
try generateMarkerSet(prefix: "marker-cluster", glyph: .cluster, palette: clusterPalette)
try save(buildMarkerImage(glyph: .draft, palette: draftPalette, badgeLabel: nil), to: "marker-draft.png")
try save(buildMarkerImage(glyph: .draft, palette: draftPalette, badgeLabel: nil, renderScale: 2), to: "marker-draft@2x.png")
try save(buildMarkerImage(glyph: .draft, palette: draftPalette, badgeLabel: nil, renderScale: 3), to: "marker-draft@3x.png")
print("Generated marker assets in \(outputDirectory.path)")
