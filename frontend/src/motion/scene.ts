// Turns on the `animated:` styles of a scene (see index.css) while its animation runs.
// Returns the cleanup for gsap.matchMedia(), so the plain layout comes back on revert.
export function markAnimated(element: HTMLElement): () => void {
  element.classList.add('scene-animated')
  return () => element.classList.remove('scene-animated')
}
