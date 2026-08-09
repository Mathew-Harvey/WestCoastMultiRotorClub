param(
    [string]$Page = 'index.html',
    [string]$Prefix = '.sec',
    [int]$Width = 1440,
    [int]$Height = 1400,
    [string[]]$Sections = @('#live-streams', '#events', '#membership', '#gallery', '#sponsors', '#resources', 'footer')
)

foreach ($s in $Sections) {
    $name = ($s -replace '[^a-zA-Z0-9]', '')
    $out = "$Prefix-$name.png"
    & powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\preview.ps1" -Page $Page -Out '.preview.html' -Only $s | Out-Null
    & powershell -NoProfile -ExecutionPolicy Bypass -Command "& '$PSScriptRoot\shot.ps1' -Url 'file:///C:/Users/mathe/dev/WestCoastMultiRotorClub/.preview.html' -Out '$out' -Width $Width -Height $Height -Scale 1 -Budget 10000"
}
