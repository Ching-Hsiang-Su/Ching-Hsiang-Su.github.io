(function () {
    'use strict';

    var storageKey = 'chinghsiang-theme';
    var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    var savedTheme = null;

    try {
        savedTheme = window.localStorage.getItem(storageKey);
    } catch (error) {
        savedTheme = null;
    }

    function systemTheme() {
        return mediaQuery.matches ? 'dark' : 'light';
    }

    function validTheme(theme) {
        return theme === 'dark' || theme === 'light';
    }

    function updateControls(theme) {
        var isDark = theme === 'dark';
        var actionLabel = isDark ? '切換為淺色模式' : '切換為深色模式';

        document.querySelectorAll('.theme-toggle').forEach(function (button) {
            button.setAttribute('aria-pressed', String(isDark));
            button.setAttribute('aria-label', actionLabel);

            var label = button.querySelector('.theme-toggle-label');
            if (label) {
                label.textContent = isDark ? '淺色模式' : '深色模式';
            }
        });

        var themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) {
            themeColor.setAttribute('content', isDark ? '#111315' : '#43d9b8');
        }
    }

    function applyTheme(theme) {
        var nextTheme = validTheme(theme) ? theme : systemTheme();
        document.documentElement.dataset.theme = nextTheme;
        document.documentElement.style.colorScheme = nextTheme;

        if (document.readyState !== 'loading') {
            updateControls(nextTheme);
        }
    }

    function saveTheme(theme) {
        try {
            window.localStorage.setItem(storageKey, theme);
            savedTheme = theme;
        } catch (error) {
            savedTheme = theme;
        }
    }

    applyTheme(savedTheme);

    document.addEventListener('DOMContentLoaded', function () {
        updateControls(document.documentElement.dataset.theme || systemTheme());

        document.querySelectorAll('.theme-toggle').forEach(function (button) {
            button.addEventListener('click', function () {
                var nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
                saveTheme(nextTheme);
                applyTheme(nextTheme);
            });
        });
    });

    function handleSystemChange() {
        if (!validTheme(savedTheme)) {
            applyTheme(systemTheme());
        }
    }

    if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleSystemChange);
    } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleSystemChange);
    }
}());
