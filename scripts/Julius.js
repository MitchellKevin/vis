const carousel = document.querySelector('.carousel');
const popover  = document.querySelector('#fish-popover');

function step() {
  const slide = carousel.querySelector('.slide');
  return slide.offsetWidth + parseFloat(getComputedStyle(carousel).gap);
}

document.querySelector('.nav-next').addEventListener('click', () => {
  const atEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 4;
  carousel.scrollTo({ left: atEnd ? 0 : carousel.scrollLeft + step(), behavior: 'smooth' });
});

document.querySelector('.nav-prev').addEventListener('click', () => {
  const atStart = carousel.scrollLeft <= 4;
  carousel.scrollTo({ left: atStart ? carousel.scrollWidth : carousel.scrollLeft - step(), behavior: 'smooth' });
});

document.querySelectorAll('.slide').forEach(s =>
  s.addEventListener('click', () => popover.showPopover())
);

document.querySelectorAll('.acc-item:not(.locked)').forEach(btn => {
  btn.addEventListener('click', () => {
    const acc = btn.dataset.acc;
    const layer = popover.querySelector(`.fish-accessory.acc-${acc}`);
    const isActive = btn.classList.toggle('active');
    layer.classList.toggle('visible', isActive);
  });
});
