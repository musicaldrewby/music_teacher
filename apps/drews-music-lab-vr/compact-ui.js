// Keep transport available while secondary song controls stay out of the room.
const toggle = document.getElementById('song-tools-toggle');
const tools = document.getElementById('song-tools');
function showSongTools(open) {
  tools.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.querySelector('span').textContent = open ? '⌄' : '⌃';
  window.dispatchEvent(new Event('resize'));
}
toggle.addEventListener('click', () => showSongTools(tools.hidden));
document.getElementById('go-song-station').addEventListener('click', () => showSongTools(true));
