/**
 * The scrub bar, mounted only when ?debug is present. A range input drives the
 * scroll through setP, a readout shows t, and a counter shows fps. The styling
 * lives in styles.css under #debug.
 */

export function mountDebug(getP: () => number, setP: (p: number) => void): void {
  const bar = document.createElement('div');
  bar.id = 'debug';

  const range = document.createElement('input');
  range.type = 'range';
  range.min = '0';
  range.max = '1';
  range.step = '0.0001';
  range.value = getP().toFixed(4);

  const readout = document.createElement('span');
  readout.className = 't';

  const fps = document.createElement('span');
  fps.className = 't';

  bar.append(range, readout, fps);
  document.body.appendChild(bar);

  range.addEventListener('input', () => setP(parseFloat(range.value)));

  let frames = 0;
  let last = performance.now();
  let fpsVal = 0;

  function tick(now: number): void {
    frames++;
    if (now - last >= 500) {
      fpsVal = Math.round((frames * 1000) / (now - last));
      frames = 0;
      last = now;
    }
    const p = getP();
    // Do not fight the pointer while the user is dragging the slider.
    if (document.activeElement !== range) range.value = p.toFixed(4);
    readout.textContent = 't ' + p.toFixed(3);
    fps.textContent = fpsVal + ' fps';
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
