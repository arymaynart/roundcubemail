/**
 * MartFlow / mARTdesign Runtime Skin Helpers for Roundcube 1.7.7
 *
 * 1. Keeps TinyMCE editor viewport display-only stylesheet synced with Creme (Light)
 *    and Carbono (Dark) modes — NEVER injects inline colors into sent email HTML.
 * 2. Handles Login screen Light/Dark switcher smoothly.
 * 3. Collapses hover-expandable left rail immediately after clicking theme/about.
 * 4. Shortens overly wide pt-BR "Agrupamento por assunto" toolbar label to "Agrupar".
 */
(function () {
	'use strict';

	var root = document.documentElement;

	// Display-only stylesheet injected into TinyMCE iframe <head> (never serialized into sent mail)
	var EDITOR_THEME_CSS = [
		'html, body, body.mce-content-body {',
		'  color-scheme: light;',
		'  background-color: #faf9f5 !important;',
		'  color: #1a1a1a !important;',
		'  caret-color: #1a1a1a !important;',
		'  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;',
		'  padding: 16px 20px;',
		'  margin: 0;',
		'  line-height: 1.65;',
		'}',
		'html.dark-mode, html.dark-mode body, html.dark-mode body.mce-content-body {',
		'  color-scheme: dark;',
		'  background-color: #181818 !important;',
		'  color: #fcf9e0 !important;',
		'  caret-color: #fcf9e0 !important;',
		'}',
		'html.dark-mode body.mce-content-body ::selection {',
		'  background: rgba(245, 71, 31, 0.35);',
		'  color: #fcf9e0;',
		'}',
		'html.dark-mode body.mce-content-body a { color: #ff6a3d; }',
		'html.dark-mode body.mce-content-body blockquote {',
		'  border-left: 3px solid #f5471f;',
		'  color: #a09880;',
		'  background-color: #121212;',
		'}'
	].join('\n');

	function syncDocTheme(doc) {
		if (!doc || !doc.documentElement) {
			return;
		}
		var isDark = root.classList.contains('dark-mode');
		doc.documentElement.classList.toggle('dark-mode', isDark);
		doc.documentElement.setAttribute('data-theme', isDark ? 'carbono' : 'creme');
	}

	function syncEditorFrames() {
		var isDark = root.classList.contains('dark-mode');
		root.setAttribute('data-theme', isDark ? 'carbono' : 'creme');

		// 1. Sync via TinyMCE API (most reliable when multiple/recreated editors exist)
		if (window.tinymce && window.tinymce.editors) {
			for (var t = 0; t < window.tinymce.editors.length; t++) {
				try {
					var ed = window.tinymce.editors[t];
					if (ed && typeof ed.getDoc === 'function') {
						syncDocTheme(ed.getDoc());
					}
				} catch (e) {}
			}
		}

		// 2. Fallback DOM sweep for any TinyMCE editor iframe
		var frames = document.querySelectorAll('.tox-edit-area__iframe');
		for (var i = 0; i < frames.length; i++) {
			try {
				var doc = frames[i].contentDocument || (frames[i].contentWindow && frames[i].contentWindow.document);
				syncDocTheme(doc);
			} catch (e) {}
		}
	}

	// Hook TinyMCE BEFORE initialization so display-only CSS is injected even if embed.css is cached
	if (window.rcmail) {
		rcmail.addEventListener('editor-init', function (o) {
			if (!o || !o.config) {
				return;
			}

			var prevStyle = o.config.content_style || '';
			o.config.content_style = (prevStyle ? prevStyle + '\n' : '') + EDITOR_THEME_CSS;

			if (typeof o.config.content_css === 'string' && o.config.content_css.indexOf('v=22') === -1) {
				o.config.content_css += (o.config.content_css.indexOf('?') > -1 ? '&' : '?') + 'v=22';
			}

			var prevSetup = o.config.setup_callback;
			o.config.setup_callback = function (ed) {
				if (typeof prevSetup === 'function') {
					prevSetup(ed);
				}
				ed.on('init LoadContent', function () {
					try {
						syncDocTheme(ed.getDoc());
					} catch (e) {}
				});
			};
		});

		rcmail.addEventListener('editor-load', function (e) {
			try {
				if (e && e.ref && e.ref.editor && typeof e.ref.editor.getDoc === 'function') {
					syncDocTheme(e.ref.editor.getDoc());
				}
			} catch (err) {}
			syncEditorFrames();
			setTimeout(syncEditorFrames, 120);
		});
	}

	// Observe Light/Dark class toggles on <html>
	if (window.MutationObserver) {
		new MutationObserver(syncEditorFrames).observe(root, {
			attributes: true,
			attributeFilter: ['class']
		});

		// Catch dynamically mounted TinyMCE iframes (e.g. toggling Plain -> HTML mode)
		if (document.body) {
			new MutationObserver(function (mutations) {
				for (var m = 0; m < mutations.length; m++) {
					var nodes = mutations[m].addedNodes;
					for (var n = 0; n < nodes.length; n++) {
						var node = nodes[n];
						if (node && node.nodeType === 1) {
							if (node.classList && node.classList.contains('tox-edit-area__iframe')) {
								node.addEventListener('load', syncEditorFrames);
								syncEditorFrames();
							} else if (node.querySelector) {
								var ifr = node.querySelector('.tox-edit-area__iframe');
								if (ifr) {
									ifr.addEventListener('load', syncEditorFrames);
									syncEditorFrames();
								}
							}
						}
					}
				}
			}).observe(document.body, { childList: true, subtree: true });
		}
	}

	// Collapse left rail immediately on pointer leave after clicking Light/Dark or About
	var railLinks = document.querySelectorAll('#taskmenu a.theme, #taskmenu a.about');
	for (var j = 0; j < railLinks.length; j++) {
		railLinks[j].addEventListener('click', function () {
			this.blur();
			setTimeout(syncEditorFrames, 30);
		});
	}

	// Shorten overly wide pt-BR "Agrupamento por assunto" in list header toolbar (tooltip stays full)
	var threadLabels = document.querySelectorAll('#layout-list > .header a.threads span.inner');
	for (var k = 0; k < threadLabels.length; k++) {
		if ((threadLabels[k].textContent || '').trim().toLowerCase() === 'agrupamento por assunto') {
			threadLabels[k].textContent = 'Agrupar';
		}
	}

	// Login screen Creme/Carbono toggle
	var loginThemeBtn = document.getElementById('md-login-theme-toggle');
	if (loginThemeBtn) {
		var loginThemeLabel = loginThemeBtn.querySelector('.md-theme-label');

		var syncLoginThemeUI = function () {
			var isDark = root.classList.contains('dark-mode');
			root.setAttribute('data-theme', isDark ? 'carbono' : 'creme');
			if (loginThemeLabel) {
				loginThemeLabel.textContent = isDark ? 'Claro' : 'Escuro';
			}
			var logo = document.getElementById('logo');
			if (logo) {
				if (!logo.dataset.mdDefaultSrc) {
					logo.dataset.mdDefaultSrc = logo.getAttribute('src') || '';
				}
				var darkSrc = logo.getAttribute('data-src-dark');
				if (isDark && darkSrc) {
					logo.setAttribute('src', darkSrc);
				} else if (logo.dataset.mdDefaultSrc) {
					logo.setAttribute('src', logo.dataset.mdDefaultSrc);
				}
			}
		};

		syncLoginThemeUI();

		loginThemeBtn.addEventListener('click', function () {
			var nowDark = !root.classList.contains('dark-mode');
			root.classList.toggle('dark-mode', nowDark);
			try {
				document.cookie = 'colorMode=' + (nowDark ? 'dark' : 'light') + '; path=/; SameSite=Lax';
			} catch (e) {}
			syncLoginThemeUI();
		});
	}

	syncEditorFrames();
})();
