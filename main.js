(function () {
  var root = document.documentElement;
  var body = document.body;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* ── 목차: 지금 보고 있는 곳을 파란 글씨로 표시 ── */
  var links = $$('.toc-panel a');
  var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var tocBtn = $('.toc-btn');
  var ticking = false;

  function markCurrent() {
    ticking = false;
    var line = parseFloat(getComputedStyle(root).scrollPaddingTop) || 76;
    var idx = 0;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i] && targets[i].getBoundingClientRect().top - line <= 8) idx = i;
    }
    // 맨 아래까지 내려오면 마지막 항목
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) idx = targets.length - 1;
    links.forEach(function (a, i) {
      a.classList.toggle('on', i === idx);
      if (i === idx) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(markCurrent); }
  }, { passive: true });
  window.addEventListener('resize', markCurrent);
  markCurrent();

  // 휴대폰: 목차 버튼으로 열고 닫기
  function setToc(open) {
    body.classList.toggle('toc-open', open);
    tocBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  tocBtn.addEventListener('click', function (e) { e.stopPropagation(); setToc(!body.classList.contains('toc-open')); });
  links.forEach(function (a) { a.addEventListener('click', function () { setToc(false); }); });
  document.addEventListener('click', function (e) {
    if (body.classList.contains('toc-open') && !e.target.closest('.toc')) setToc(false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setToc(false); });

  /* ── 대화상자 ── */
  function openDialog(d) {
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    root.classList.add('lock');
  }
  function closeDialog(d) {
    if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
    root.classList.remove('lock');
  }
  $$('dialog').forEach(function (d) {
    d.addEventListener('close', function () { root.classList.remove('lock'); });
    d.addEventListener('click', function (e) { if (e.target === d) closeDialog(d); });
  });

  var credits = $('#credits');
  $$('[data-open-credits]').forEach(function (b) { b.addEventListener('click', function () { setToc(false); openDialog(credits); }); });
  $$('[data-close-credits]').forEach(function (b) { b.addEventListener('click', function () { closeDialog(credits); }); });

  // 외부 링크: 이동할지 먼저 묻기
  var leave = $('#leave');
  var leaveUrl = '';
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-leave]');
    if (!a) return;
    e.preventDefault();
    leaveUrl = a.href;
    if (typeof leave.showModal !== 'function') {
      if (window.confirm('외부 사이트로 이동할까요?\n' + leaveUrl)) window.open(leaveUrl, '_blank', 'noopener');
      return;
    }
    $('#leave-url').textContent = leaveUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    openDialog(leave);
  });
  $('[data-leave-cancel]').addEventListener('click', function () { closeDialog(leave); });
  $('[data-leave-go]').addEventListener('click', function () {
    closeDialog(leave);
    window.open(leaveUrl, '_blank', 'noopener');
  });

  /* ── 지도 ── */
  var el = document.getElementById('leaflet');
  if (!el) return;
  if (typeof L === 'undefined') {
    el.innerHTML = '<p class="map-fallback">지도를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해 주세요.</p>';
    return;
  }
  // 좌표: OpenStreetMap(폭포, 마을 연못, 역, 산, 리조트, 레일바이크 하차장), 위키데이터(등선폭포)
  var spots = [
    { t: '구곡폭포', lat: 37.79230, lng: 127.60997, dir: 'right', d: '남산면 강촌구곡길 254' },
    { t: '문배마을', lat: 37.79010, lng: 127.60553, dir: 'left', d: '구곡폭포 입구에서 걸어서 40분 안팎' },
    { t: '옛 강촌역 일대', lat: 37.81568, lng: 127.63350, dir: 'top', d: '강촌유원지, 출렁다리, 노래비, 물깨말 정원' },
    { t: '등선폭포', lat: 37.82861, lng: 127.65750, dir: 'right', d: '서면 덕두원리 118-2' },
    { t: '삼악산 용화봉', lat: 37.83972, lng: 127.66037, dir: 'right', d: '높이 654m' },
    { t: '엘리시안 강촌', lat: 37.81666, lng: 127.58714, dir: 'left', d: '남산면 북한강변길 688' },
    { t: '강촌역', st: true, lat: 37.80572, lng: 127.63412, dir: 'right', d: '수도권 전철 경춘선' },
    { t: '백양리역', st: true, lat: 37.83081, lng: 127.58918, dir: 'top', d: '엘리시안 강촌과 가까운 역' },
    { t: '김유정역 (레일바이크 탑승장)', st: true, lat: 37.81812, lng: 127.71448, dir: 'top', d: '신동면 김유정로 1383' }
  ];
  var rail = [[[37.8167,127.71335],[37.81613,127.7128],[37.81557,127.71221],[37.81524,127.71176],[37.81499,127.71132],[37.81485,127.71096],[37.81475,127.71063],[37.81468,127.71038],[37.81461,127.70993],[37.8146,127.70957],[37.81462,127.70915],[37.81467,127.70878],[37.81475,127.70843],[37.81486,127.70811]],[[37.82202,127.68383],[37.82209,127.68367],[37.82264,127.68274],[37.82317,127.6822],[37.82454,127.68093],[37.82461,127.68087]],[[37.82229,127.68708],[37.822,127.68623],[37.82187,127.68575],[37.82182,127.68536]],[[37.82249,127.69297],[37.82262,127.69216]],[[37.82262,127.69216],[37.82278,127.69118],[37.82295,127.69004],[37.82298,127.68927],[37.82291,127.68868],[37.82273,127.68809],[37.82229,127.68708]],[[37.8247,127.6808],[37.8256,127.68004],[37.82637,127.67933],[37.8267,127.67877],[37.8269,127.67821],[37.8271,127.67755],[37.82718,127.67697]],[[37.82648,127.67426],[37.82549,127.67289],[37.82415,127.67097],[37.82407,127.67085],[37.82372,127.67034],[37.82349,127.66985],[37.82334,127.6694],[37.82322,127.66902],[37.82315,127.66869],[37.82307,127.66825],[37.82306,127.66818],[37.82296,127.66693],[37.8229,127.66503],[37.82264,127.66207]],[[37.82718,127.67697],[37.82713,127.6764],[37.827,127.67568],[37.82692,127.67538],[37.82668,127.67461],[37.82648,127.67426]],[[37.82461,127.68087],[37.8247,127.6808]],[[37.82182,127.68536],[37.82182,127.68491],[37.82186,127.68453]],[[37.82186,127.68453],[37.82195,127.68406],[37.82202,127.68383]],[[37.81853,127.70239],[37.81924,127.70081],[37.81953,127.70017],[37.82021,127.6987],[37.82085,127.6973],[37.82209,127.69457],[37.82228,127.69408],[37.82238,127.6937],[37.82249,127.69297]],[[37.81807,127.70345],[37.81853,127.70239]],[[37.81493,127.70792],[37.81512,127.70755],[37.81544,127.70707],[37.81775,127.70398],[37.81807,127.70345]],[[37.81486,127.70811],[37.81493,127.70792]],[[37.82264,127.66207],[37.82256,127.66026],[37.82251,127.65912],[37.82242,127.65768],[37.82226,127.65658],[37.822,127.6545],[37.82193,127.65339],[37.82161,127.65151],[37.82118,127.64988],[37.82017,127.64791],[37.8191,127.64531],[37.81803,127.6435],[37.81783,127.64312]]];

  var map = L.map(el, { scrollWheelZoom: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 기여자'
  }).addTo(map);
  L.polyline(rail, { color: '#b4471f', weight: 4, opacity: .9, dashArray: '7 6' })
    .bindPopup('<b>레일바이크 철길</b>옛 경춘선 철길')
    .addTo(map);

  var pts = [];
  spots.forEach(function (s) {
    var off = s.dir === 'left' ? [-8, 0] : s.dir === 'top' ? [0, -8] : [8, 0];
    L.circleMarker([s.lat, s.lng], {
      radius: s.st ? 6 : 7, weight: 2, fillOpacity: 1,
      color: s.st ? '#1b1e22' : '#ffffff',
      fillColor: s.st ? '#ffffff' : '#2a64c5'
    })
      .bindTooltip(s.t, { permanent: true, direction: s.dir, offset: off, className: 'lbl' })
      .bindPopup('<b>' + s.t + '</b>' + s.d)
      .addTo(map);
    pts.push([s.lat, s.lng]);
  });
  map.fitBounds(pts, { padding: [36, 36] });
  map.on('click', function () { map.scrollWheelZoom.enable(); });
  map.on('mouseout', function () { map.scrollWheelZoom.disable(); });
})();
