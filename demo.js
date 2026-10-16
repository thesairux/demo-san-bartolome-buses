/**
 * Ajustes de la versión DEMO (estática) del sitio San Bartolomé.
 * En el WordPress real esto lo hace el servidor; aquí se simula.
 */
(function () {
	'use strict';

	// Cambia a false para ocultar la etiqueta "Propuesta de diseño".
	var MOSTRAR_ETIQUETA = true;

	var form = document.querySelector('[data-quote]');

	// 1. Destino precargado desde el enlace (?destino=Pucón).
	try {
		var dest = new URLSearchParams(window.location.search).get('destino');
		if (form && dest) {
			var input = form.querySelector('[name="sb_destino"]');
			if (input) {
				input.value = dest;
				input.dispatchEvent(new Event('input', { bubbles: true }));
			}
		}
	} catch (e) {}

	// 2. "Enviar solicitud": en la demo no hay servidor, se muestra un aviso.
	if (form) {
		form.addEventListener('submit', function (e) {
			if (e.defaultPrevented) { return; } // faltan datos: ya lo marcó el validador
			e.preventDefault();
			var main = form.querySelector('.ticket-form__main');
			var old = form.querySelector('.notice');
			if (old) { old.remove(); }
			var p = document.createElement('p');
			p.className = 'notice notice--ok';
			p.setAttribute('role', 'status');
			p.textContent = '¡Gracias! Esta es una demostración: en el sitio WordPress real, la solicitud queda guardada en el panel (menú Cotizaciones) y llega al correo de ventas.';
			var fields = form.querySelector('.fields');
			if (main && fields) { main.insertBefore(p, fields); } else { form.prepend(p); }
			p.scrollIntoView({ behavior: 'smooth', block: 'center' });
		});
	}

	// 3. Etiqueta discreta de demo.
	var closed = false;
	try { closed = sessionStorage.getItem('sb-demo-badge') === 'off'; } catch (e) {}
	if (MOSTRAR_ETIQUETA && !closed) {
		var b = document.createElement('div');
		b.className = 'demo-badge';
		b.innerHTML = '<span class="demo-badge__dot"></span><span>Propuesta de diseño · Demo</span><button type="button" aria-label="Ocultar">×</button>';
		b.querySelector('button').addEventListener('click', function () {
			b.remove();
			try { sessionStorage.setItem('sb-demo-badge', 'off'); } catch (e) {}
		});
		document.body.appendChild(b);
	}
})();
