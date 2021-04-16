'use strict';

var regeneratorRuntime = require('regenerator-runtime');

Object.defineProperty(exports, '__esModule', {
  value: true,
});

var DEFAULT_PATH = '/outsmartly-images/';

// We could use encodeURIComponent() but that will encode things
// things that we actually don't need encoded, increasing file
// size and reducing readability. We only care about ? and &
// and if they are using one of the popular services, this isn't
// actually very common in practice.
function encodeSizeChoiceValue(value) {
  var chars = null; // We're not immediately splitting the string as a micro-optimization
  // because it's not actually common for the values to have ? or &
  // and, while the perf difference isn't massive, it is measurable
  // and libraries should be good stewards in perf to give apps headroom.

  for (var i = 0, l = value.length; i < l; i++) {
    switch (value[i]) {
      case '?':
        if (!chars) {
          chars = value.split('');
        }

        chars[i] = '%3F';
        break;

      case '&':
        if (!chars) {
          chars = value.split('');
        }

        chars[i] = '%26';
        break;

      default:
    }
  } // Fast[er] path since it's not common to have ? or &
  // and we can save ourselves the split/join.

  if (!chars) {
    return value;
  }

  return chars.join('');
} // Eventually switch over to use URLSearchParams, but for now
// this is easy enough to do ourselves.
// https://caniuse.com/urlsearchparams

function serializeSizeChoices(sizeChoices) {
  // Object.entries() doesn't have IE11 support and old Safari
  var choices = [];

  for (var key in sizeChoices) {
    var value = encodeSizeChoiceValue(sizeChoices[key]);
    choices.push(''.concat(key, '=').concat(value));
  }

  return choices.join('&');
}

function imageOptimizationFormatter(options) {
  options = Object.assign({}, { path: DEFAULT_PATH }, options);

  if (!options.baseURL) {
    throwError('baseURL is a required option for imageOptimizationFormatter({ baseURL: string })');
  }

  var baseURLEncoded = encodeURIComponent(options.baseURL);

  var path = options.path;
  if (path[path.length - 1] !== '/') {
    path += '/';
  }

  return function (sizeChoices) {
    if (!sizeChoices || !sizeChoices.desktop) {
      throwError("You must provide a value for 'desktop' because it is used as the fallback.");
    }

    if (process.env.NODE_ENV !== 'production') {
      return options.baseURL + sizeChoices.desktop;
    }

    var serialize = options.serialize || serializeSizeChoices;
    var search = serialize(sizeChoices);
    return path + baseURLEncoded + '?' + search;
  };
}

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }
  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
      args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);
      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, 'next', value);
      }
      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, 'throw', err);
      }
      _next(undefined);
    });
  };
}

function throwError(msg) {
  throw new Error('@outsmartly/plugin-image-optimization: ' + msg);
}

function appendUnique(headers, key, value) {
  // Only if they don't already have this value
  var existingValue = headers.get(key);

  if (existingValue !== null && existingValue !== void 0 && existingValue.split(/\s*,\s*/).includes(value)) {
    return;
  }

  headers.append(key, value);
}

function imageOptimizationPlugin(options) {
  options = Object.assign({}, { path: DEFAULT_PATH + '*' }, options);

  var path = options.path;

  if (path[path.length - 1] !== '*' || path[path.length - 2] !== '/') {
    throwError("'path' must end with a wildcard '/*' pattern, e.g. '/images/*'");
  }

  return function (config) {
    var linkPreloadsByRoutePath = new Map(); // This top-level middleware scans HTML documents for <img data-outsmartly-preload>'s
    // and then is able to preload them the next time someone requests that same page.

    config.middleware.push(
      /*#__PURE__*/ (function () {
        var _ref = _asyncToGenerator(
          /*#__PURE__*/ regeneratorRuntime.mark(function _callee(event, next) {
            var _response$headers$get;

            var response, linkPreloads, link;
            return regeneratorRuntime.wrap(function _callee$(_context) {
              while (1) {
                switch ((_context.prev = _context.next)) {
                  case 0:
                    _context.next = 2;
                    return next();

                  case 2:
                    response = _context.sent;

                    if (
                      (_response$headers$get = response.headers.get('content-type')) !== null &&
                      _response$headers$get !== void 0 &&
                      _response$headers$get.match(/^\s*text\/html\s*(?:;.*)?$/)
                    ) {
                      _context.next = 5;
                      break;
                    }

                    return _context.abrupt('return', response);

                  case 5:
                    // If it doesn't exist yet, don't make one, because we don't know whether or not there will
                    // actually be any data-outsmartly-preload's on this page, and there's no reason to waste
                    // that memory--which could be a lot if there are thousands of pages.
                    linkPreloads = linkPreloadsByRoutePath.get(event.url.pathname);

                    if (linkPreloads) {
                      link = Array.from(linkPreloads).join(', ');
                      response.headers.append('link', link);
                    }

                    return _context.abrupt(
                      'return',
                      new __OUTSMARTLY_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_HIRED__.HTMLRewriter()
                        .on('img[data-outsmartly-preload]', {
                          element: function element(_element) {
                            try {
                              if (!linkPreloadsByRoutePath.has(event.url.pathname)) {
                                linkPreloadsByRoutePath.set(event.url.pathname, new Set());
                              }

                              var _linkPreloads = linkPreloadsByRoutePath.get(event.url.pathname);

                              var src = _element.getAttribute('src');

                              if (!src) {
                                throwError(
                                  '<img data-outsmartly-preload> is missing a src, so there is nothing to push.',
                                );
                              }

                              if (!src.startsWith('/')) {
                                throwError(
                                  '<img src="'.concat(
                                    src,
                                    '" data-outsmartly-preload> must be a relative path that starts with a forward slash e.g. <img src="/some-path/image.jpg" data-outsmartly-preload>',
                                  ),
                                );
                              }

                              var decodedSrc = src.replaceAll('&amp;', '&');

                              _linkPreloads.add('<'.concat(decodedSrc, '>; rel=preload; as=image'));
                            } catch (e) {
                              var _e$message;

                              event.error(e);

                              _element.setAttribute(
                                'data-outsmartly-error',
                                String(
                                  (_e$message = e === null || e === void 0 ? void 0 : e.message) !== null &&
                                    _e$message !== void 0
                                    ? _e$message
                                    : e,
                                ),
                              );
                            }
                          },
                        })
                        .transform(response),
                    );

                  case 8:
                  case 'end':
                    return _context.stop();
                }
              }
            }, _callee);
          }),
        );

        return function (_x, _x2) {
          return _ref.apply(this, arguments);
        };
      })(),
    );
    config.routes.unshift({
      path: options.path,
      intercept: function intercept(event) {
        return _asyncToGenerator(
          /*#__PURE__*/ regeneratorRuntime.mark(function _callee2() {
            var _searchParams$get;

            var url, visitor, searchParams, sizeChoice, remoteImageURL, request, response;
            return regeneratorRuntime.wrap(function _callee2$(_context2) {
              while (1) {
                switch ((_context2.prev = _context2.next)) {
                  case 0:
                    (url = event.url), (visitor = event.visitor);
                    searchParams = url.searchParams;
                    sizeChoice =
                      (_searchParams$get = searchParams.get(visitor.deviceType)) !== null &&
                      _searchParams$get !== void 0
                        ? _searchParams$get
                        : searchParams.get('desktop');

                    if (!sizeChoice) {
                      throwError(
                        ''
                          .concat(event.request.url, ' is missing a size for device type ')
                          .concat(visitor.deviceType, " and doesn't have 'desktop' to fallback to."),
                      );
                    }

                    _context2.next = 6;
                    return decodeURIComponent(event.request.outsmartly.params[0]) + sizeChoice;

                  case 6:
                    remoteImageURL = _context2.sent;
                    request = new OutsmartlyRequest(event.request, {
                      outsmartly: {
                        cache: options.cache,
                      },
                    });
                    _context2.next = 10;
                    return fetch(remoteImageURL, request);

                  case 10:
                    response = _context2.sent;
                    // Cache's should only used the cache version for the same user-agents.
                    // e.g. intermediate caches, or even browser switching between mobile
                    // emulating mobile devices during testing.
                    appendUnique(response.headers, 'vary', 'user-agent'); // If there happens to be intermediate proxies between us and the
                    // requesting browser, instruct them not to transform this image.

                    appendUnique(response.headers, 'cache-control', 'no-transform');
                    return _context2.abrupt('return', response);

                  case 14:
                  case 'end':
                    return _context2.stop();
                }
              }
            }, _callee2);
          }),
        )();
      },
    });
  };
}

exports.imageOptimizationFormatter = imageOptimizationFormatter;
exports.imageOptimizationPlugin = imageOptimizationPlugin;
