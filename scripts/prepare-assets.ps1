param(
  [string]$SourceRoot = "C:\Users\Victor\Documents\ArquivosCodex",
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$FfmpegPath = ""
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$photoSource = Get-ChildItem -LiteralPath $SourceRoot -Directory |
  Where-Object { $_.Name -like "M*morias" } |
  ForEach-Object { Join-Path $_.FullName "FotosDasMemorias" } |
  Select-Object -First 1
$audioSource = Get-ChildItem -LiteralPath $SourceRoot -Directory |
  Where-Object { $_.Name -like "M*sicas" } |
  Select-Object -First 1 -ExpandProperty FullName
$photoOutput = Join-Path $ProjectRoot "public\media\photos"
$audioOutput = Join-Path $ProjectRoot "public\media\audio"

New-Item -ItemType Directory -Path $photoOutput -Force | Out-Null
New-Item -ItemType Directory -Path $audioOutput -Force | Out-Null

$photoGroups = @(
  @("06-06-2025.jpg", "06-06-2025 (2).jpg", "07-06-2025.png", "07-06-2025 (2).jpg", "07-06-2025 (2).png"),
  @("29-06-2025.jpg"),
  @("10-07-2025.jpg"),
  @("09-08-2025.jpg"),
  @("11-10-2025.jpg", "11-10-2025 (2).jpg", "11-10-2026.jpg", "12-10-2025.jpg", "12-10-2025 (2).jpg"),
  @("02-11-2026.jpg", "04-11-2025.jpg", "04-11-2025 (2).jpg", "04-11-2025 (3).jpg"),
  @("21-11-2025.jpg", "21-11-2025.png"),
  @("30-11-2025.jpg", "30-11-2025 (2).jpg", "30-11-2025 (3).jpg"),
  @("07-12-2025.jpg", "10-12-2025.jpg"),
  @("25-12-2025.jpg"),
  @("01-01-2026.jpg", "11-01-2026.jpg", "11-01-2026 (2).jpg"),
  @("01-02-2026.jpg", "01-02-2026 (2).jpg"),
  @("08-02-2026.jpg", "08-02-2026 (2).jpg", "08-02-2026 (3).jpg"),
  @("22-02-2026.jpg", "22-02-2026 (2).jpg"),
  @("22-03-2026.jpg", "29-03-2026.jpg"),
  @("12-04-2026.jpg"),
  @("02-05-2026.jpg", "02-05-2026 (2).jpg"),
  @("23-05-2026.jpg"),
  @("07-06-2026.jpg", "07-06-2026 (2).jpg", "07-06-2026 (3).jpg"),
  @("25-07-2026.jpg", "25-07-2026 (2).jpg")
)

$songPatterns = @(
  "Tribalistas - J* Sei Namorar*",
  "Tribalistas - Velha Inf*ncia*",
  "Vanessa da Mata - Ainda Bem*",
  "Alian*a - Tribalistas*",
  "Ana Gabriela, anavitoria*No Escuro*",
  "ANAVIT*RIA - Ai, Amor*",
  "ANAVIT*RIA - Cor de Marte*",
  "ANAVIT*RIA, Lenine - Lisboa*",
  "Alex Warren - Ordinary*",
  "Damiano David - The First Time*",
  "Daniel Caesar - Japanese Denim*",
  "H.E.R. - Best Part*",
  "Keyshia Cole - Love*",
  "Miley Cyrus - Adore You*",
  "Paramore - The Only Exception*",
  "Gigi Perez - Sailor Song*",
  "K. - Cigarettes After Sex*",
  "Bruno Mars - Locked Out Of Heaven*",
  "coldplay - Fix You*",
  "Venere Vai Venus - Anjos*"
)

function Get-OrientedBitmap {
  param([string]$Path)

  $image = [System.Drawing.Image]::FromFile($Path)
  try {
    if ($image.PropertyIdList -contains 0x0112) {
      $orientation = $image.GetPropertyItem(0x0112).Value[0]
      switch ($orientation) {
        2 { $image.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX) }
        3 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
        4 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipX) }
        5 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipX) }
        6 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
        7 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipX) }
        8 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
      }
    }

    $maxSide = 1800
    $scale = [Math]::Min(1.0, ([double]$maxSide / [Math]::Max($image.Width, $image.Height)))
    $width = [Math]::Max(1, [int][Math]::Round($image.Width * $scale))
    $height = [Math]::Max(1, [int][Math]::Round($image.Height * $scale))
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.DrawImage($image, 0, 0, $width, $height)
    }
    finally {
      $graphics.Dispose()
    }
    return $bitmap
  }
  finally {
    $image.Dispose()
  }
}

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq "image/jpeg" }
$qualityEncoder = [System.Drawing.Imaging.Encoder]::Quality
$encoderParameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($qualityEncoder, 84L)

for ($memoryIndex = 0; $memoryIndex -lt $photoGroups.Count; $memoryIndex++) {
  $memoryNumber = $memoryIndex + 1
  for ($photoIndex = 0; $photoIndex -lt $photoGroups[$memoryIndex].Count; $photoIndex++) {
    $sourceFile = Join-Path $photoSource $photoGroups[$memoryIndex][$photoIndex]
    if (-not (Test-Path -LiteralPath $sourceFile)) {
      throw "Photo not found: $sourceFile"
    }

    $targetName = "memory-{0:D2}-{1:D2}.jpg" -f $memoryNumber, ($photoIndex + 1)
    $targetFile = Join-Path $photoOutput $targetName
    $bitmap = Get-OrientedBitmap -Path $sourceFile
    try {
      $bitmap.Save($targetFile, $jpegCodec, $encoderParameters)
    }
    finally {
      $bitmap.Dispose()
    }
  }
}

$encoderParameters.Dispose()

$ffmpeg = $FfmpegPath
if (-not $ffmpeg) {
  $ffmpeg = (Get-Command ffmpeg.exe -ErrorAction SilentlyContinue).Source
}
if (-not $ffmpeg) {
  $winGetLink = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\ffmpeg.exe"
  if (Test-Path -LiteralPath $winGetLink) {
    $ffmpeg = $winGetLink
  }
}
if (-not $ffmpeg) {
  $ffmpeg = Get-ChildItem -LiteralPath (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages") `
    -Filter "ffmpeg.exe" -File -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
}
if (-not $ffmpeg) {
  throw "FFmpeg was not found. Install it before preparing audio files."
}

for ($songIndex = 0; $songIndex -lt $songPatterns.Count; $songIndex++) {
  $matches = Get-ChildItem -LiteralPath $audioSource -File |
    Where-Object { $_.Name -like $songPatterns[$songIndex] }
  if ($matches.Count -ne 1) {
    throw "Expected one song matching '$($songPatterns[$songIndex])', found $($matches.Count)."
  }
  $sourceFile = $matches[0].FullName

  $targetFile = Join-Path $audioOutput ("memory-{0:D2}.mp3" -f ($songIndex + 1))
  & $ffmpeg -hide_banner -loglevel error -y -i $sourceFile -vn -ar 44100 -b:a 128k $targetFile
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to optimize song $sourceFile"
  }
}

Write-Output "Prepared photos: $($photoGroups | ForEach-Object { $_.Count } | Measure-Object -Sum | Select-Object -ExpandProperty Sum)"
Write-Output "Prepared songs: $($songPatterns.Count)"
