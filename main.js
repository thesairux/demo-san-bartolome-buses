/**
 * San Bartolomé — interacciones.
 * Sin dependencias. Cada módulo va aislado: si uno falla, el resto sigue.
 */
(function () {
	'use strict';

	var SBC = window.SB || {};
	var doc = document.documentElement;
	doc.classList.add('js');

	var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function safe(fn, name) {
		try { fn(); } catch (e) { if (window.console) { console.warn('[SB] ' + name, e); } }
	}
	function $(sel, ctx) { return (ctx || document).querySelector(sel); }
	function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
	function raf(fn) { var t = false; return function () { if (t) { return; } t = true; requestAnimationFrame(function () { t = false; fn(); }); }; }

	/* ---------- Cabecera y menú ---------- */
	function initHeader() {
		var header = $('[data-header]');
		var toggle = $('[data-nav-toggle]');
		var nav = $('[data-nav]');
		if (header) {
			var onScroll = raf(function () { header.classList.toggle('is-scrolled', window.scrollY > 8); });
			window.addEventListener('scroll', onScroll, { passive: true });
			onScroll();
		}
		if (!toggle || !nav) { return; }
		function setOpen(open) {
			doc.classList.toggle('nav-open', open);
			toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
			var label = toggle.querySelector('.screen-reader-text');
			if (label) { label.textContent = open ? 'Cerrar menú' : 'Abrir menú'; }
		}
		toggle.addEventListener('click', function () { setOpen(!doc.classList.contains('nav-open')); });
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && doc.classList.contains('nav-open')) { setOpen(false); toggle.focus(); } });
		nav.addEventListener('click', function (e) { if (e.target.closest('a')) { setOpen(false); } });
		window.addEventListener('resize', raf(function () { if (window.innerWidth >= 1100) { setOpen(false); } }));
	}

	/* ---------- Aparición al hacer scroll ---------- */
	function initReveal() {
		var items = $$('.reveal');
		if (!items.length) { return; }
		function showAll() { items.forEach(function (el) { el.classList.add('is-in'); }); }
		if (!('IntersectionObserver' in window)) { showAll(); return; }
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (en) {
				if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
			});
		}, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
		items.forEach(function (el) { io.observe(el); });
		// Red de seguridad: nada queda oculto.
		setTimeout(showAll, 5000);
	}

	/* ---------- Tablero de paletas ---------- */
	function initBoard() {
		var board = $('[data-board]');
		if (!board) { return; }
		var data = [];
		try { data = JSON.parse(board.getAttribute('data-board')) || []; } catch (e) { data = []; }
		var rows = $$('.board__row', board);
		if (data.length <= rows.length) { return; }
		var CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

		function setFlaps(box, text) {
			var cells = $$('.flap', box);
			cells.forEach(function (cell, i) {
				var target = text.charAt(i) || ' ';
				var c = cell.firstChild;
				var current = c.textContent === ' ' ? ' ' : c.textContent;
				if (current === target) { return; }
				var steps = reduce ? 1 : 2 + Math.floor(Math.random() * 4);
				var n = 0;
				setTimeout(function tick() {
					n++;
					var ch = n >= steps ? target : CH.charAt(Math.floor(Math.random() * CH.length));
					c.textContent = ch === ' ' ? ' ' : ch;
					cell.classList.remove('is-flip');
					void cell.offsetWidth;
					cell.classList.add('is-flip');
					if (n < steps) { setTimeout(tick, 75); }
				}, reduce ? 0 : i * 28);
			});
		}

		var shown = rows.map(function (r) { var b = r.querySelector('[data-destino]'); return b ? b.getAttribute('data-destino') : ''; });
		var queue = data.filter(function (d) { return shown.indexOf(d.n) === -1; });
		var rowIdx = 0;
		var visible = true;
		var timer = null;

		function step() {
			if (!visible || document.hidden || !queue.length) { return; }
			var row = rows[rowIdx % rows.length];
			var btn = row.querySelector('[data-destino]');
			var old = btn ? btn.getAttribute('data-destino') : '';
			var next = queue.shift();
			var oldItem = data.filter(function (d) { return d.n === old; })[0];
			if (oldItem) { queue.push(oldItem); }
			setFlaps(row.querySelector('.flaps--dest'), next.d);
			setFlaps(row.querySelector('.flaps--zone'), next.z);
			if (btn) { btn.setAttribute('data-destino', next.n); btn.setAttribute('href', next.u); }
			var sr = row.querySelector('[data-sr]');
			if (sr) { sr.textContent = next.n; }
			rowIdx++;
		}
		function start() { if (!timer) { timer = setInterval(step, 2600); } }
		if ('IntersectionObserver' in window) {
			new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(board);
		}
		setTimeout(start, 1800);
	}

	/* ---------- Reloj (hora de Chile) ---------- */
	function initClock() {
		var el = $('[data-clock]');
		if (!el) { return; }
		var fmt;
		try {
			fmt = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: SBC.tz || 'America/Santiago' });
		} catch (e) {
			fmt = { format: function (d) { return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); } };
		}
		function tick() { el.textContent = fmt.format(new Date()); }
		tick();
		setInterval(tick, 15000);
	}

	/* ---------- Franja horizontal de destinos ---------- */
	function initStrip() {
		var wrap = $('[data-strip]');
		if (!wrap) { return; }
		var track = $('.strip__track', wrap);
		var prog = $('[data-strip-progress] .strip-progress__road');
		var prev = $('[data-strip-prev]');
		var next = $('[data-strip-next]');
		function amount() { return Math.max(260, track.clientWidth * 0.75); }
		if (prev) { prev.addEventListener('click', function () { track.scrollBy({ left: -amount(), behavior: 'smooth' }); }); }
		if (next) { next.addEventListener('click', function () { track.scrollBy({ left: amount(), behavior: 'smooth' }); }); }
		var update = raf(function () {
			var max = track.scrollWidth - track.clientWidth;
			var p = max > 0 ? track.scrollLeft / max : 0;
			if (prog) { prog.style.setProperty('--p', p.toFixed(4)); }
			if (prev) { prev.disabled = track.scrollLeft < 4; }
			if (next) { next.disabled = track.scrollLeft > max - 4; }
		});
		track.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		update();

		// Arrastrar con el mouse.
		var down = false, startX = 0, startL = 0, moved = false;
		track.addEventListener('pointerdown', function (e) {
			if (e.pointerType !== 'mouse' || e.button !== 0) { return; }
			down = true; moved = false; startX = e.clientX; startL = track.scrollLeft;
		});
		window.addEventListener('pointermove', function (e) {
			if (!down) { return; }
			var dx = e.clientX - startX;
			if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('is-dragging'); }
			if (moved) { track.scrollLeft = startL - dx; }
		});
		window.addEventListener('pointerup', function () {
			if (!down) { return; }
			down = false;
			setTimeout(function () { track.classList.remove('is-dragging'); }, 0);
		});
		track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
	}

	/* ---------- Recorrido vertical (Turismo nacional) ---------- */
	function initRoute() {
		var route = $('[data-route]');
		if (!route) { return; }
		var rail = $('.route__rail', route);
		var zones = $$('[data-zone]', route);
		var links = $$('[data-zone-link]');
		var update = raf(function () {
			var r = rail.getBoundingClientRect();
			var vh = window.innerHeight;
			var p = (vh * 0.5 - r.top) / Math.max(1, r.height);
			p = Math.min(1, Math.max(0, p));
			rail.style.setProperty('--p', p.toFixed(4));
			var active = '';
			zones.forEach(function (z) { if (z.getBoundingClientRect().top < vh * 0.45) { active = z.getAttribute('data-zone'); } });
			links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-zone-link') === active); });
		});
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		update();
	}

	/* ---------- Formulario de cotización ---------- */
	function initQuote() {
		var form = $('[data-quote]');

		// Enlaces "Cotizar": si el formulario está en la página, se precarga el destino.
		document.addEventListener('click', function (e) {
			var link = e.target.closest('.js-cotizar, [data-scroll-cotiza]');
			if (!link || !form) { return; }
			e.preventDefault();
			var dest = link.getAttribute('data-destino');
			if (dest) {
				var input = form.querySelector('[name="sb_destino"]');
				if (input) { input.value = dest; input.dispatchEvent(new Event('input', { bubbles: true })); }
			}
			var target = document.getElementById('cotiza') || form;
			target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
			setTimeout(function () { var n = form.querySelector('[name="sb_nombre"]'); if (n) { n.focus({ preventScroll: true }); } }, reduce ? 0 : 700);
		});

		if (!form) { return; }

		function fmtDate(v) {
			if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) { return v || ''; }
			var p = v.split('-');
			return p[2] + '-' + p[1] + '-' + p[0];
		}
		function val(name) { var el = form.querySelector('[name="sb_' + name + '"]'); return el ? el.value.trim() : ''; }

		// Talón del boleto en vivo.
		function live() {
			$$('[data-out]', form).forEach(function (o) {
				var k = o.getAttribute('data-out');
				var v = val(k);
				if (k === 'ida') { v = fmtDate(v); }
				o.textContent = v || '—';
			});
		}
		form.addEventListener('input', live);
		form.addEventListener('change', live);
		live();

		var help = form.querySelector('[data-form-help]');
		function validate() {
			var ok = true;
			['nombre', 'telefono'].forEach(function (k) {
				var el = form.querySelector('[name="sb_' + k + '"]');
				var bad = !el || el.value.trim() === '';
				if (el) { el.closest('.field').classList.toggle('is-invalid', bad); }
				if (bad && ok) { ok = false; if (el) { el.focus(); } }
			});
			if (help) { help.hidden = ok; }
			return ok;
		}
		form.addEventListener('input', function (e) {
			var f = e.target.closest('.field');
			if (f && e.target.value.trim()) { f.classList.remove('is-invalid'); }
		});

		form.addEventListener('submit', function (e) { if (!validate()) { e.preventDefault(); } });

		var waBtn = form.querySelector('[data-wa-submit]');
		if (waBtn) {
			waBtn.addEventListener('click', function () {
				if (!validate()) { return; }
				var lines = ['Hola, quiero cotizar un viaje con San Bartolomé.', ''];
				var map = [
					['Nombre', val('nombre')],
					['Teléfono', val('telefono')],
					['Correo', val('email')],
					['Tipo de viaje', val('tipo')],
					['Origen', val('origen')],
					['Destino', val('destino')],
					['Ida', fmtDate(val('ida'))],
					['Regreso', fmtDate(val('vuelta'))],
					['Pasajeros', val('pasajeros')],
					['Comentarios', val('mensaje')]
				];
				map.forEach(function (m) { if (m[1]) { lines.push('• ' + m[0] + ': ' + m[1]); } });
				var url = 'https://wa.me/' + (SBC.wa || '') + '?text=' + encodeURIComponent(lines.join('\n'));
				window.open(url, '_blank', 'noopener');
			});
		}
	}

	function init() {
		safe(initHeader, 'header');
		safe(initReveal, 'reveal');
		safe(initBoard, 'board');
		safe(initClock, 'clock');
		safe(initStrip, 'strip');
		safe(initRoute, 'route');
		safe(initQuote, 'quote');
	}
	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
