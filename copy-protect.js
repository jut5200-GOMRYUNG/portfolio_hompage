(function () {
  /* CSS: 텍스트 선택 & 이미지 드래그 차단 */
  var style = document.createElement('style');
  style.textContent = [
    '* { user-select:none !important; -webkit-user-select:none !important; }',
    'img { pointer-events:none; -webkit-user-drag:none; user-drag:none; }'
  ].join('');
  document.head.appendChild(style);

  /* 우클릭 차단 */
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* 복사 / 잘라내기 차단 */
  document.addEventListener('copy', function (e) { e.preventDefault(); });
  document.addEventListener('cut',  function (e) { e.preventDefault(); });

  /* Ctrl+C / Ctrl+X / Ctrl+A / Ctrl+U 차단 */
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey) {
      var k = e.key.toLowerCase();
      if (k === 'c' || k === 'x' || k === 'a' || k === 'u' || k === 's') {
        e.preventDefault();
      }
    }
  });
})();
