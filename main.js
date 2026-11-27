(function () {
  var root = document.documentElement;
  var body = document.body;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* ── 페이지 이동 (주소 # 뒤 이름으로 페이지를 바꿈, 뒤로 가기 지원) ── */
  var pages = {};
  $$('.page').forEach(function (p) { pages[p.getAttribute('data-page')] = p; });
  var crumbs = $('#crumbs');

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function title(name) { return name === 'intro' ? '강촌' : pages[name].getAttribute('data-title'); }
  function parent(name) { return pages[name].getAttribute('data-parent'); }
  function path(name) {
    var list = [];
    for (var n = name; n; n = parent(n)) list.unshift(n);
    return list;
  }
  function current() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ''));
    return pages[h] ? h : 'intro';
  }
  function setOpen(caret, open) {
    caret.setAttribute('aria-expanded', open ? 'true' : 'false');
    caret.setAttribute('aria-label', caret.getAttribute('aria-label').replace(/(접기|펼치기)$/, open ? '접기' : '펼치기'));
    document.getElementById(caret.getAttribute('aria-controls')).hidden = !open;
  }

  function render(initial) {
    var name = current();
    var trail = path(name);

    Object.keys(pages).forEach(function (k) { pages[k].classList.toggle('on', k === name); });
    $$('.side-item[data-nav]').forEach(function (a) {
      var on = a.getAttribute('data-nav') === name;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    // 지금 페이지의 상위 페이지는 사이드바에서 펼쳐 둔다
    trail.forEach(function (n) {
      var c = $('.caret[aria-controls="sub-' + n + '"]');
      if (c && n !== name) setOpen(c, true);
    });

    crumbs.innerHTML = trail.map(function (n, i) {
      return i === trail.length - 1
        ? '<span class="now">' + esc(title(n)) + '</span>'
        : '<a href="#' + n + '">' + esc(title(n)) + '</a><span class="sep">/</span>';
    }).join('');
    document.title = name === 'intro' ? '강촌' : title(name) + ' · 강촌';

    if (name === 'map') showMap();
    closeSide();
    if (!initial) {
      window.scrollTo(0, 0);
      var h1 = $('h1', pages[name]);
      if (h1) h1.focus({ preventScroll: true });
    }
  }
  window.addEventListener('hashchange', function () { render(false); });

  /* ── 사이드바 ── */
  $$('.caret').forEach(function (b) {
    b.addEventListener('click', function () { setOpen(b, b.getAttribute('aria-expanded') !== 'true'); });
  });
  function openSide() { body.classList.add('side-open'); }
  function closeSide() { body.classList.remove('side-open'); }
  $$('[data-side-open]').forEach(function (b) { b.addEventListener('click', openSide); });
  $$('[data-side-close]').forEach(function (b) { b.addEventListener('click', closeSide); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSide(); });

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
  $$('[data-open-credits]').forEach(function (b) { b.addEventListener('click', function () { closeSide(); openDialog(credits); }); });
  $$('[data-close-credits]').forEach(function (b) { b.addEventListener('click', function () { closeDialog(credits); }); });

  /* 외부 링크 이동 확인 */
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
  var map = null;
  function showMap() {
    if (map) { setTimeout(function () { map.invalidateSize(); }, 0); return; }
    var el = document.getElementById('leaflet');
    if (typeof L === 'undefined') {
      el.innerHTML = '<p class="map-fallback">지도를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해 주세요.</p>';
      return;
    }
    // 좌표: OpenStreetMap(폭포, 마을 연못, 역, 산, 리조트, 레일바이크 하차장), 위키데이터(등선폭포)
    var spots = [
      { t: '구곡폭포', lat: 37.79230, lng: 127.60997, dir: 'right', d: '남산면 강촌구곡길 254', href: '#gugok' },
      { t: '문배마을', lat: 37.79010, lng: 127.60553, dir: 'left', d: '구곡폭포 입구에서 걸어서 40분 안팎', href: '#gugok' },
      { t: '옛 강촌역 일대', lat: 37.81568, lng: 127.63350, dir: 'top', d: '강촌유원지, 출렁다리, 노래비, 물깨말 정원', href: '#oldstation' },
      { t: '등선폭포', lat: 37.82861, lng: 127.65750, dir: 'right', d: '서면 덕두원리 118-2', href: '#deungseon' },
      { t: '삼악산 용화봉', lat: 37.83972, lng: 127.66037, dir: 'right', d: '높이 654m', href: '#deungseon' },
      { t: '엘리시안 강촌', lat: 37.81666, lng: 127.58714, dir: 'left', d: '남산면 북한강변길 688', href: '#elysian' },
      { t: '강촌역', st: true, lat: 37.80572, lng: 127.63412, dir: 'right', d: '수도권 전철 경춘선', href: '#route' },
      { t: '백양리역', st: true, lat: 37.83081, lng: 127.58918, dir: 'top', d: '엘리시안 강촌과 가까운 역', href: '#route' },
      { t: '김유정역 · 레일바이크 탑승장', st: true, lat: 37.81812, lng: 127.71448, dir: 'top', d: '신동면 김유정로 1383', href: '#railpark' }
    ];
    var rail = [[[37.8167,127.71335],[37.81613,127.7128],[37.81557,127.71221],[37.81524,127.71176],[37.81499,127.71132],[37.81485,127.71096],[37.81475,127.71063],[37.81468,127.71038],[37.81461,127.70993],[37.8146,127.70957],[37.81462,127.70915],[37.81467,127.70878],[37.81475,127.70843],[37.81486,127.70811]],[[37.82202,127.68383],[37.82209,127.68367],[37.82264,127.68274],[37.82317,127.6822],[37.82454,127.68093],[37.82461,127.68087]],[[37.82229,127.68708],[37.822,127.68623],[37.82187,127.68575],[37.82182,127.68536]],[[37.82249,127.69297],[37.82262,127.69216]],[[37.82262,127.69216],[37.82278,127.69118],[37.82295,127.69004],[37.82298,127.68927],[37.82291,127.68868],[37.82273,127.68809],[37.82229,127.68708]],[[37.8247,127.6808],[37.8256,127.68004],[37.82637,127.67933],[37.8267,127.67877],[37.8269,127.67821],[37.8271,127.67755],[37.82718,127.67697]],[[37.82648,127.67426],[37.82549,127.67289],[37.82415,127.67097],[37.82407,127.67085],[37.82372,127.67034],[37.82349,127.66985],[37.82334,127.6694],[37.82322,127.66902],[37.82315,127.66869],[37.82307,127.66825],[37.82306,127.66818],[37.82296,127.66693],[37.8229,127.66503],[37.82264,127.66207]],[[37.82718,127.67697],[37.82713,127.6764],[37.827,127.67568],[37.82692,127.67538],[37.82668,127.67461],[37.82648,127.67426]],[[37.82461,127.68087],[37.8247,127.6808]],[[37.82182,127.68536],[37.82182,127.68491],[37.82186,127.68453]],[[37.82186,127.68453],[37.82195,127.68406],[37.82202,127.68383]],[[37.81853,127.70239],[37.81924,127.70081],[37.81953,127.70017],[37.82021,127.6987],[37.82085,127.6973],[37.82209,127.69457],[37.82228,127.69408],[37.82238,127.6937],[37.82249,127.69297]],[[37.81807,127.70345],[37.81853,127.70239]],[[37.81493,127.70792],[37.81512,127.70755],[37.81544,127.70707],[37.81775,127.70398],[37.81807,127.70345]],[[37.81486,127.70811],[37.81493,127.70792]],[[37.82264,127.66207],[37.82256,127.66026],[37.82251,127.65912],[37.82242,127.65768],[37.82226,127.65658],[37.822,127.6545],[37.82193,127.65339],[37.82161,127.65151],[37.82118,127.64988],[37.82017,127.64791],[37.8191,127.64531],[37.81803,127.6435],[37.81783,127.64312]]];

    map = L.map(el, { scrollWheelZoom: false });
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
        color: s.st ? '#37352f' : '#ffffff',
        fillColor: s.st ? '#ffffff' : '#1f5c4f'
      })
        .bindTooltip(s.t, { permanent: true, direction: s.dir, offset: off, className: 'lbl' })
        .bindPopup('<b>' + s.t + '</b>' + s.d + '<br><a href="' + s.href + '">자세히 보기</a>')
        .addTo(map);
      pts.push([s.lat, s.lng]);
    });
    map.fitBounds(pts, { padding: [36, 36] });
    map.on('click', function () { map.scrollWheelZoom.enable(); });
    map.on('mouseout', function () { map.scrollWheelZoom.disable(); });
  }

  render(true);
})();
