// Overlay entry from display: none with @starting-style + transition-behavior: allow-discrete.
// The decisive evidence is synchronous: an element leaving display: none has no before-change style, so
// a CSSTransition on opacity or scale exists right after opening only if @starting-style supplied one.
// Completion and exit need a running refresh driver, so the page first counts animation frames.

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function countFrames(ms) {
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    const tick = (now) => {
      frames += 1;
      if (now - start < ms) requestAnimationFrame(tick);
      else resolve(frames);
    };
    requestAnimationFrame(tick);
  });
}

function transitionOf(el, prop) {
  return el.getAnimations().find((a) => a.transitionProperty === prop) ?? null;
}

function fromValue(anim, prop) {
  return anim ? anim.effect.getKeyframes()[0][prop] : null;
}

function near(value, target) {
  return value !== null && Math.abs(Number.parseFloat(value) - target) < 0.001;
}

// Resolves true when every running animation on el has finished, false after 3 s.
function settle(el) {
  const all = Promise.all(el.getAnimations().map((a) => a.finished)).then(() => true);
  return Promise.race([all, delay(3000).then(() => false)]);
}

function openAttr(el) {
  el.setAttribute('data-open', '');
}

function closeAttr(el) {
  el.removeAttribute('data-open');
}

function byId(id) {
  return () => document.getElementById(id);
}

function insertedPopup() {
  const el = document.createElement('div');
  el.className = 'nzf-anim nzf-inserted';
  el.textContent = 'inserted';
  return el;
}

const overlayCases = {
  'native popover': {
    el: byId('case-popover'),
    open: (el) => el.showPopover(),
    close: (el) => el.hidePopover(),
  },
  'native modal dialog': {
    el: byId('case-dialog'),
    open: (el) => el.showModal(),
    close: (el) => el.close(),
  },
  'data-open toggle': { el: byId('case-data'), open: openAttr, close: closeAttr },
  'nested @starting-style': { el: byId('case-nested'), open: openAttr, close: closeAttr },
  'inserted open (portal mount)': {
    el: insertedPopup,
    open: (el) => {
      openAttr(el);
      document.getElementById('fixture').append(el);
    },
    close: closeAttr,
  },
  'control (no @starting-style)': {
    el: byId('case-control'),
    open: openAttr,
    close: closeAttr,
    control: true,
  },
};

function checkFeatures() {
  const spring = getComputedStyle(document.documentElement)
    .getPropertyValue('--nz-easing-spring')
    .trim();
  const rows = {
    'transition-behavior: allow-discrete': [
      CSS.supports('transition-behavior', 'allow-discrete'),
      true,
    ],
    '@starting-style (CSSStartingStyleRule interface)': [
      typeof CSSStartingStyleRule !== 'undefined',
      null,
    ],
    'scale property': [CSS.supports('scale', '0.96'), true],
    '--nz-easing-spring linear() parses': [
      CSS.supports('transition-timing-function', spring),
      true,
    ],
    'overlay property (§12.4 gate 1)': [CSS.supports('overlay', 'auto'), null],
    'popover API': [typeof HTMLElement.prototype.showPopover === 'function', null],
    ':popover-open selector': [CSS.supports('selector(:popover-open)'), null],
  };
  for (const [id, [observed, expected]] of Object.entries(rows)) {
    window.nzFloor.check(
      'features',
      id,
      expected === null ? null : observed === expected,
      observed,
      expected,
    );
  }
}

async function runCase(name, c, framesRun) {
  const { check } = window.nzFloor;
  const el = c.el();
  c.open(el);
  const opacity = transitionOf(el, 'opacity');
  const scale = transitionOf(el, 'scale');
  const display = transitionOf(el, 'display');
  const opacityFrom = fromValue(opacity, 'opacity');
  const scaleFrom = fromValue(scale, 'scale');

  if (c.control) {
    const none = opacity === null && scale === null;
    const observed = { opacity: opacityFrom, scale: scaleFrom };
    check(
      name,
      'no entry transition without @starting-style',
      none,
      observed,
      'no transitions',
      'proves the check can fail',
    );
    c.close(el);
    return;
  }
  check(
    name,
    'entry: opacity transition starts at the @starting-style value',
    near(opacityFrom, 0),
    opacityFrom,
    '0',
  );
  check(
    name,
    'entry: scale transition starts at --nz-scale-enter',
    near(scaleFrom, 0.96),
    scaleFrom,
    '0.96',
  );
  check(name, 'entry: display transition object', null, display !== null);

  const finished = await settle(el);
  const done = {
    finished,
    opacity: getComputedStyle(el).opacity,
    scale: getComputedStyle(el).scale,
  };
  const completed = finished && near(done.opacity, 1) && near(done.scale, 1);
  const want = { finished: true, opacity: '1', scale: '1' };
  if (framesRun) check(name, 'entry runs to opacity 1, scale 1', completed, done, want);
  else
    check(
      name,
      'entry runs to opacity 1, scale 1',
      null,
      done,
      null,
      'no animation frames in this run',
    );

  // Exit is informational: engine-managed overlays exit through data-exiting (§12.2), and native
  // overlays also need the overlay property to stay in the top layer while they fade (§12.4 gate 1).
  c.close(el);
  const exit = {
    displayRightAfterClose: getComputedStyle(el).display,
    opacityTransition: transitionOf(el, 'opacity') !== null,
  };
  await settle(el);
  exit.displayAfterSettle = getComputedStyle(el).display;
  check(name, 'exit (allow-discrete keeps display until the fade ends)', null, exit);
}

// Informational: does an exit that ends in visibility: hidden (not display: none) still fade?
async function checkVisibilityExit() {
  const el = document.getElementById('case-visibility');
  openAttr(el);
  await settle(el);
  closeAttr(el);
  const style = getComputedStyle(el);
  const observed = {
    visibilityRightAfterClose: style.visibility,
    opacityTransition: transitionOf(el, 'opacity') !== null,
  };
  await settle(el);
  observed.visibilityAfterSettle = getComputedStyle(el).visibility;
  window.nzFloor.check('visibility exit', 'exit fades when hidden with visibility', null, observed);
}

async function runOverlayEntry() {
  const frames = await Promise.race([countFrames(300), delay(2000).then(() => 0)]);
  window.nzFloor.meta.animationFramesIn300ms = frames;
  checkFeatures();
  // One case at a time, so no transition overlaps another.
  await Object.entries(overlayCases).reduce(
    (previous, [name, c]) => previous.then(() => runCase(name, c, frames > 1)),
    Promise.resolve(),
  );
  await checkVisibilityExit();
}

runOverlayEntry().then(
  () => window.nzFloor.finish('overlay-entry'),
  (error) => window.nzFloor.finish('overlay-entry', error),
);
