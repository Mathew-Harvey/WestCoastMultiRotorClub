# Replace weak/broken part-card links with direct manuals, diagrams and real product pages.
$path = 'members-builds-2026.html'
$html = Get-Content $path -Raw
$before = $html

$pairs = @(
  # ELRS receiver pinout consolidated into one shared picture
  @('./assets/builds/wiring/elrs-ep1-wiring.webp', './assets/builds/wiring/elrs-ep-pinout.webp'),
  @('./assets/builds/wiring/elrs-ep2-wiring.webp', './assets/builds/wiring/elrs-ep-pinout.webp'),
  # real Sequre wiring diagram instead of the bare board shot
  @('./assets/builds/wiring/sequre-blueson-a1-pinout.jpg', './assets/builds/wiring/sequre-blueson-a1-wiring.jpg'),
  # deep links instead of doc/vendor front doors
  @('href="https://www.expresslrs.org/"', 'href="https://www.expresslrs.org/quick-start/getting-started/"'),
  @('href="https://docs.hd-zero.com/"', 'href="https://docs.hd-zero.com/goggles-introduction.html"'),
  @('href="https://docs.hd-zero.com/race-v3"', 'href="https://docs.hd-zero.com/race-v3.html"'),
  @('href="https://www.ovonicshop.com/" target="_blank" rel="noopener"><i class="fas fa-store"></i> Store',
    'href="https://www.ovonicshop.com/pages/faq" target="_blank" rel="noopener"><i class="fas fa-battery-three-quarters"></i> LiPo FAQ'),
  @('href="https://www.rcinpower.com/"', 'href="https://www.rcinpower.com/PRODUCTS/"'),
  @('href="https://store.tmotor.com/" target="_blank" rel="noopener"><i class="fas fa-book"></i> Specs',
    'href="https://buzzfpv.com.au/search?q=velox" target="_blank" rel="noopener"><i class="fas fa-search"></i> AU Stock'),
  @('href="https://iflight.com/" target="_blank" rel="noopener"><i class="fas fa-book"></i> Specs',
    'href="https://buzzfpv.com.au/search?q=xing-e" target="_blank" rel="noopener"><i class="fas fa-search"></i> AU Stock'),
  @('href="https://www.truerc.ca/" target="_blank" rel="noopener"><i class="fas fa-book"></i> Specs',
    'href="https://www.mantisfpv.com.au/?post_type=product&amp;s=truerc" target="_blank" rel="noopener"><i class="fas fa-search"></i> AU Stock'),
  @('href="https://www.foxeer.com/" target="_blank" rel="noopener"><i class="fas fa-book"></i> Specs',
    'href="https://www.foxeer.com/p-g-380" target="_blank" rel="noopener"><i class="fas fa-book"></i> Specs'),
  # Foxeer product IDs that resolved to the wrong products
  @('href="https://www.foxeer.com/foxeer-caesar-v2-pro-hd-5-inch-fpv-frame-g-573" target="_blank" rel="noopener"><i class="fas fa-book"></i> Specs',
    'href="https://www.mantisfpv.com.au/?post_type=product&amp;s=foxeer+caesar" target="_blank" rel="noopener"><i class="fas fa-search"></i> AU Stock'),
  # radios get their real user manuals, hosted locally
  @('href="https://www.radiomasterrc.com/" target="_blank" rel="noopener"><i class="fas fa-book"></i> Manual',
    'href="./assets/builds/wiring/radiomaster-gx12-manual.pdf" target="_blank" rel="noopener"><i class="fas fa-file-pdf"></i> Manual'),
  @('href="https://betafpv.com/" target="_blank" rel="noopener"><i class="fas fa-book"></i> Manual',
    'href="https://betafpv.com/products/air75-ii-brushless-whoop-quadcopter" target="_blank" rel="noopener"><i class="fas fa-book"></i> Specs'),
  @('href="https://betafpv.com/" target="_blank" rel="noopener"><i class="fas fa-book"></i> Specs',
    'href="https://betafpv.com/products/lava-ii-1s-battery" target="_blank" rel="noopener"><i class="fas fa-book"></i> Specs')
)

foreach ($p in $pairs) {
  $n = ([regex]::Matches($html, [regex]::Escape($p[0]))).Count
  if ($n -gt 0) { $html = $html.Replace($p[0], $p[1]) }
  Write-Host ("{0,3}x  {1}" -f $n, $p[0])
}

if ($html -ne $before) {
  Set-Content $path $html -NoNewline
  Write-Host 'written' -ForegroundColor Green
} else {
  Write-Host 'no change' -ForegroundColor Yellow
}
