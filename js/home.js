// Navigation mobile améliorée progressivement : les liens restent visibles sans JS.
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
if (menuButton && navigation) {
  document.documentElement.classList.add('js');
  menuButton.hidden = false;
  const setMenuOpen = (open) => {
    menuButton.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
    menuButton.querySelector('span').textContent = open ? '−' : '+';
  };
  menuButton.addEventListener('click', () => setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenuOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenuOpen(false);
      menuButton.focus();
    }
  });
  window.matchMedia('(min-width: 721px)').addEventListener('change', () => setMenuOpen(false));
}
