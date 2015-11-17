/* eslint no-var: [0] */

var renderer = require('ipc'),
    assign = require('object-assign');

module.exports = function(settings, browserWindow, evaluate, log, converter, respond) {
  var pageJSisDone = settings.waitForJS ? false : true;

  renderer.once(browserWindow.id + ':waitForJS', function() {
    log('waitForJS signal received..');
    pageJSisDone = true;
  });

  browserWindow.webContents.session.on('will-download', function(ev, downloadedItem) {
    // TODO: test and complete implementation
  });

  browserWindow.webContents.on('did-finish-load', function() {
    log('browser window loaded..');

    evaluate(function() {
      var sPhantomHeader = '#electronHeader',
          sPhantomFooter = '#electronFooter';

      return {
        electronHeader: document.querySelector(sPhantomHeader) ? document.querySelector(sPhantomHeader).innerHTML : null,
        electronFooter: document.querySelector(sPhantomFooter) ? document.querySelector(sPhantomFooter).innerHTML : null
      };
    }, function(err, extraContent) {
      if (err) {
        return respond(err);
      }

      // TODO: ask support for header/footer pdf and numberOfPages in electron
      log('waiting for browser window resolution..');

      setTimeout(function() {
        resolvePage();
      }, settings.delay || 0);

      function resolvePage() {
        if (settings.waitForJS && !pageJSisDone) {
          setTimeout(function() {
            resolvePage();
          }, 100);

          return;
        }

        evaluate(function() {
          return window.document.documentElement.outerHTML;
        }, function(getHtmlErr, html) {
          if (getHtmlErr) {
            return respond(getHtmlErr);
          }

          log('calling converter function..');

          converter(html, assign({}, settings), browserWindow, function(converterErr, data) {
            log('converter function ended..');
            respond(converterErr, data);
          });
        });
      }
    });
  });
};