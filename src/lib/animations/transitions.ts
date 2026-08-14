import anime from "animejs";

export function pulseAlert(el: HTMLElement) {
  return anime({
    targets: el,
    scale: [1, 1.035],
    boxShadow: [
      "0 0 0 0 rgba(255, 92, 92, 0.0)",
      "0 0 0 10px rgba(255, 92, 92, 0.18)",
    ],
    direction: "alternate",
    easing: "easeInOutSine",
    duration: 900,
    loop: true,
  });
}

export function slideRowIn(el: HTMLElement) {
  return anime({
    targets: el,
    translateX: [28, 0],
    opacity: [0, 1],
    easing: "easeOutQuad",
    duration: 420,
  });
}

export function flashApproved(el: HTMLElement) {
  return anime({
    targets: el,
    backgroundColor: [
      "rgba(61, 214, 140, 0.22)",
      "rgba(61, 214, 140, 0.0)",
    ],
    easing: "easeOutQuad",
    duration: 900,
  });
}

export function animateMetric(el: HTMLElement, from: number, to: number) {
  const state = { value: from };
  return anime({
    targets: state,
    value: to,
    round: 1,
    easing: "easeOutExpo",
    duration: 700,
    update: () => {
      el.textContent = String(Math.round(state.value));
    },
  });
}
