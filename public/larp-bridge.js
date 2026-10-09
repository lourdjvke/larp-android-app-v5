/**
 * LARP Native Runtime Bridge v1.2.0
 * Lightweight App Runtime & Packager
 */
(function(window) {
  'use strict';

  var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var currentThemeColor = "#D97757";
  var currentIcon = "default";
  var isFullscreen = false;

  // Helper to determine if color is dark or light
  function isColorDark(hexColor) {
    if (!hexColor || hexColor.charAt(0) !== '#') return false;
    var hex = hexColor.substring(1);
    if (hex.length === 3) {
      hex = hex.split('').map(function(c) { return c + c; }).join('');
    }
    var num = parseInt(hex, 16);
    var r = (num >> 16) & 255;
    var g = (num >> 8) & 255;
    var b = num & 255;
    var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma < 140;
  }

  var LarpBridge = {
    version: '1.2.0',
    isNative: isNative,
    platform: (window.Capacitor && window.Capacitor.getPlatform) ? window.Capacitor.getPlatform() : 'web',

    /**
     * Set Android / iOS status bar color dynamically
     * @param {string} hexColor - Hex color code, e.g. '#D97757'
     */
    setThemeColor: function(hexColor) {
      if (!hexColor) return;
      currentThemeColor = hexColor;

      // Update in DOM meta if present
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', hexColor);
      } else {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = hexColor;
        document.head.appendChild(meta);
      }

      var dark = isColorDark(hexColor);
      var barStyle = dark ? 'DARK' : 'LIGHT';

      // 1. Direct Native Android Bridge Interface (window.LarpNative)
      if (window.LarpNative && typeof window.LarpNative.setThemeColor === 'function') {
        try {
          window.LarpNative.setThemeColor(hexColor);
        } catch(e) {
          console.warn('[LARP Bridge] LarpNative.setThemeColor error:', e);
        }
      }

      // 2. Capacitor Plugin fallback
      if (isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
        try {
          window.Capacitor.Plugins.StatusBar.setBackgroundColor({ color: hexColor });
          window.Capacitor.Plugins.StatusBar.setStyle({ style: barStyle });
        } catch(e) {
          console.warn('[LARP Bridge] Native StatusBar error:', e);
        }
      }

      // Dispatch custom DOM event so web app can react
      window.dispatchEvent(new CustomEvent('larp:themecolorchange', {
        detail: { color: hexColor, isDark: dark }
      }));
    },

    /**
     * Dynamic App Icon Switching (Duolingo style)
     * On Android: changes active <activity-alias> via window.LarpNative.setIcon
     * On iOS: calls UIApplication.shared.setAlternateIconName
     * @param {string} variantId - 'default', 'streak_fire', 'stealth_dark', etc.
     */
    setIcon: function(variantId) {
      if (!variantId) return Promise.reject(new Error('variantId is required'));
      currentIcon = variantId;
      try {
        localStorage.setItem('larp_active_icon', variantId);
      } catch(e) {}

      // 1. Direct Native Android Bridge Interface (window.LarpNative)
      if (window.LarpNative && typeof window.LarpNative.setIcon === 'function') {
        try {
          window.LarpNative.setIcon(variantId);
          console.info('[LARP Bridge] Triggered LarpNative.setIcon:', variantId);
        } catch(e) {
          console.warn('[LARP Bridge] LarpNative.setIcon error:', e);
        }
      }

      // 2. Capacitor Plugin fallback
      if (isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.LarpDynamicIcons) {
        return window.Capacitor.Plugins.LarpDynamicIcons.setIcon({ icon: variantId });
      }

      console.info('[LARP Bridge] Icon switched to variant:', variantId);
      window.dispatchEvent(new CustomEvent('larp:iconchange', {
        detail: { iconId: variantId }
      }));
      return Promise.resolve({ success: true, icon: variantId });
    },

    /**
     * Get currently active icon variant
     */
    getActiveIcon: function() {
      try {
        var stored = localStorage.getItem('larp_active_icon');
        if (stored) return stored;
      } catch(e) {}
      return currentIcon;
    },

    /**
     * Enable or disable True Fullscreen Mode
     * @param {boolean} enable
     */
    setFullscreen: function(enable) {
      isFullscreen = !!enable;

      if (window.LarpNative && typeof window.LarpNative.setFullscreen === 'function') {
        try {
          window.LarpNative.setFullscreen(isFullscreen);
        } catch(e) {}
      }

      if (isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
        try {
          if (isFullscreen) {
            window.Capacitor.Plugins.StatusBar.hide();
          } else {
            window.Capacitor.Plugins.StatusBar.show();
          }
        } catch(e) {}
      }

      // Set CSS classes on document
      if (isFullscreen) {
        document.documentElement.classList.add('larp-fullscreen');
        document.body.classList.add('larp-fullscreen');
      } else {
        document.documentElement.classList.remove('larp-fullscreen');
        document.body.classList.remove('larp-fullscreen');
      }

      window.dispatchEvent(new CustomEvent('larp:fullscreenchange', {
        detail: { isFullscreen: isFullscreen }
      }));
    },

    /**
     * Hide native splash screen
     */
    hideSplashScreen: function() {
      if (window.LarpNative && typeof window.LarpNative.hideSplashScreen === 'function') {
        try {
          window.LarpNative.hideSplashScreen();
        } catch(e) {}
      }

      if (isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen) {
        try {
          window.Capacitor.Plugins.SplashScreen.hide();
        } catch(e) {}
      }
      var splashEl = document.getElementById('larp-web-splash');
      if (splashEl) {
        splashEl.style.opacity = '0';
        setTimeout(function() {
          if (splashEl.parentNode) splashEl.parentNode.removeChild(splashEl);
        }, 300);
      }
    },

    /**
     * Trigger native haptic feedback
     * @param {'LIGHT'|'MEDIUM'|'HEAVY'} style
     */
    haptic: function(style) {
      if (window.LarpNative && typeof window.LarpNative.haptic === 'function') {
        try {
          window.LarpNative.haptic(style || 'LIGHT');
        } catch(e) {}
      }

      if (isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
        try {
          var impactStyle = (style || 'LIGHT').toUpperCase();
          return window.Capacitor.Plugins.Haptics.impact({ style: impactStyle });
        } catch(e) {}
      }
      // Web vibration fallback
      if (navigator.vibrate) {
        var duration = style === 'HEAVY' ? 40 : (style === 'MEDIUM' ? 25 : 15);
        navigator.vibrate(duration);
      }
      return Promise.resolve();
    },

    /**
     * Native share sheet
     */
    share: function(options) {
      if (isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) {
        return window.Capacitor.Plugins.Share.share(options);
      }
      if (navigator.share) {
        return navigator.share(options);
      }
      return Promise.reject(new Error('Share API not supported on this platform'));
    }
  };

  // 1. Setup Watcher on <meta name="theme-color">
  
  function setupThemeColorObserver() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var initialColor = meta.getAttribute('content');
      if (initialColor) {
        LarpBridge.setThemeColor(initialColor);
      }
    }

    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'content') {
          var newColor = mutation.target.getAttribute('content');
          if (newColor && newColor !== currentThemeColor) {
            LarpBridge.setThemeColor(newColor);
          }
        }
      });
    });

    if (meta) {
      observer.observe(meta, { attributes: true });
    }

    // Also observe additions to <head>
    var headObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        for (var i = 0; i < mutation.addedNodes.length; i++) {
          var node = mutation.addedNodes[i];
          if (node.nodeName === 'META' && node.name === 'theme-color') {
            observer.observe(node, { attributes: true });
            var col = node.getAttribute('content');
            if (col) LarpBridge.setThemeColor(col);
          }
        }
      });
    });
    headObserver.observe(document.head, { childList: true });
  }
  

  // 2. Fullscreen setup
  function setupFullscreen() {
    
  }

  // 3. Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setupFullscreen();
      setupThemeColorObserver();
      setTimeout(function() { LarpBridge.hideSplashScreen(); }, 500);
    });
  } else {
    setupFullscreen();
    setupThemeColorObserver();
    setTimeout(function() { LarpBridge.hideSplashScreen(); }, 500);
  }

  window.LarpBridge = LarpBridge;
})(window);
