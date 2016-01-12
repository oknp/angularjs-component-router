(function(){
///<reference path="../typings/angularjs/angular.d.ts"/>
/*
 * decorates $compileProvider so that we have access to routing metadata
 */
function compilerProviderDecorator($compileProvider, $$directiveIntrospectorProvider) {
    var directive = $compileProvider.directive;
    $compileProvider.directive = function (name, factory) {
        $$directiveIntrospectorProvider.register(name, factory);
        return directive.apply(this, arguments);
    };
}
/*
 * private service that holds route mappings for each controller
 */
var DirectiveIntrospectorProvider = (function () {
    function DirectiveIntrospectorProvider() {
        this.directiveBuffer = [];
        this.directiveFactoriesByName = {};
        this.onDirectiveRegistered = null;
    }
    DirectiveIntrospectorProvider.prototype.register = function (name, factory) {
        if (angular.isArray(factory)) {
            factory = factory[factory.length - 1];
        }
        this.directiveFactoriesByName[name] = factory;
        if (this.onDirectiveRegistered) {
            this.onDirectiveRegistered(name, factory);
        }
        else {
            this.directiveBuffer.push({ name: name, factory: factory });
        }
    };
    DirectiveIntrospectorProvider.prototype.$get = function () {
        var _this = this;
        var fn = function (newOnControllerRegistered) {
            _this.onDirectiveRegistered = newOnControllerRegistered;
            while (_this.directiveBuffer.length > 0) {
                var directive = _this.directiveBuffer.pop();
                _this.onDirectiveRegistered(directive.name, directive.factory);
            }
        };
        fn.getTypeByName = function (name) { return _this.directiveFactoriesByName[name]; };
        return fn;
    };
    return DirectiveIntrospectorProvider;
})();
/**
 * @name ngOutlet
 *
 * @description
 * An ngOutlet is where resolved content goes.
 *
 * ## Use
 *
 * ```html
 * <div ng-outlet="name"></div>
 * ```
 *
 * The value for the `ngOutlet` attribute is optional.
 */
function ngOutletDirective($animate, $q, $router) {
    var rootRouter = $router;
    return {
        restrict: 'AE',
        transclude: 'element',
        terminal: true,
        priority: 400,
        require: ['?^^ngOutlet', 'ngOutlet'],
        link: outletLink,
        controller: (function () {
            function class_1() {
            }
            return class_1;
        })(),
        controllerAs: '$$ngOutlet'
    };
    function outletLink(scope, element, attrs, ctrls, $transclude) {
        var Outlet = (function () {
            function Outlet(controller, router) {
                this.controller = controller;
                this.router = router;
            }
            Outlet.prototype.cleanupLastView = function () {
                var _this = this;
                if (this.previousLeaveAnimation) {
                    $animate.cancel(this.previousLeaveAnimation);
                    this.previousLeaveAnimation = null;
                }
                if (this.currentScope) {
                    this.currentScope.$destroy();
                    this.currentScope = null;
                }
                if (this.currentElement) {
                    this.previousLeaveAnimation = $animate.leave(this.currentElement);
                    this.previousLeaveAnimation.then(function () { return _this.previousLeaveAnimation = null; });
                    this.currentElement = null;
                }
            };
            Outlet.prototype.reuse = function (instruction) {
                var next = $q.when(true);
                var previousInstruction = this.currentInstruction;
                this.currentInstruction = instruction;
                if (this.currentController && this.currentController.$routerOnReuse) {
                    next = $q.when(this.currentController.$routerOnReuse(this.currentInstruction, previousInstruction));
                }
                return next;
            };
            Outlet.prototype.routerCanReuse = function (nextInstruction) {
                var result;
                if (!this.currentInstruction ||
                    this.currentInstruction.componentType !== nextInstruction.componentType) {
                    result = false;
                }
                else if (this.currentController && this.currentController.$routerCanReuse) {
                    result = this.currentController.$routerCanReuse(nextInstruction, this.currentInstruction);
                }
                else {
                    result = nextInstruction === this.currentInstruction ||
                        angular.equals(nextInstruction.params, this.currentInstruction.params);
                }
                return $q.when(result);
            };
            Outlet.prototype.routerCanDeactivate = function (instruction) {
                if (this.currentController && this.currentController.$routerCanDeactivate) {
                    return $q.when(this.currentController.$routerCanDeactivate(instruction, this.currentInstruction));
                }
                return $q.when(true);
            };
            Outlet.prototype.deactivate = function (instruction) {
                if (this.currentController && this.currentController.$routerOnDeactivate) {
                    return $q.when(this.currentController.$routerOnDeactivate(instruction, this.currentInstruction));
                }
                return $q.when();
            };
            Outlet.prototype.activate = function (instruction) {
                var _this = this;
                var previousInstruction = this.currentInstruction;
                this.currentInstruction = instruction;
                var componentName = this.controller.$$componentName = instruction.componentType;
                if (typeof componentName !== 'string') {
                    throw new Error('Component is not a string for ' + instruction.urlPath);
                }
                this.controller.$$routeParams = instruction.params;
                this.controller.$$template = '<div ' + dashCase(componentName) + '></div>';
                this.controller.$$router = this.router.childRouter(instruction.componentType);
                var newScope = scope.$new();
                var clone = $transclude(newScope, function (clone) {
                    $animate.enter(clone, null, _this.currentElement || element);
                    _this.cleanupLastView();
                });
                this.currentElement = clone;
                this.currentScope = newScope;
                // TODO: prefer the other directive retrieving the controller
                // by debug mode
                this.currentController = this.currentElement.children().eq(0).controller(componentName);
                if (this.currentController && this.currentController.$routerOnActivate) {
                    return this.currentController.$routerOnActivate(instruction, previousInstruction);
                }
                return $q.when();
            };
            return Outlet;
        })();
        var parentCtrl = ctrls[0], myCtrl = ctrls[1], router = (parentCtrl && parentCtrl.$$router) || rootRouter;
        myCtrl.$$currentComponent = null;
        router.registerPrimaryOutlet(new Outlet(myCtrl, router));
    }
}
/**
 * This directive is responsible for compiling the contents of ng-outlet
 */
function ngOutletFillContentDirective($compile) {
    return {
        restrict: 'EA',
        priority: -400,
        require: 'ngOutlet',
        link: function (scope, element, attrs, ctrl) {
            var template = ctrl.$$template;
            element.html(template);
            var link = $compile(element.contents());
            link(scope);
            // TODO: move to primary directive
            var componentInstance = scope[ctrl.$$componentName];
            if (componentInstance) {
                ctrl.$$currentComponent = componentInstance;
                componentInstance.$router = ctrl.$$router;
                componentInstance.$routeParams = ctrl.$$routeParams;
            }
        }
    };
}
/**
 * @name ngLink
 * @description
 * Lets you link to different parts of the app, and automatically generates hrefs.
 *
 * ## Use
 * The directive uses a simple syntax: `ng-link="componentName({ param: paramValue })"`
 *
 * ### Example
 *
 * ```js
 * angular.module('myApp', ['ngComponentRouter'])
 *   .controller('AppController', ['$router', function($router) {
 *     $router.config({ path: '/user/:id', component: 'user' });
 *     this.user = { name: 'Brian', id: 123 };
 *   });
 * ```
 *
 * ```html
 * <div ng-controller="AppController as app">
 *   <a ng-link="user({id: app.user.id})">{{app.user.name}}</a>
 * </div>
 * ```
 */
function ngLinkDirective($router, $parse) {
    var rootRouter = $router;
    return { require: '?^^ngOutlet', restrict: 'A', link: ngLinkDirectiveLinkFn };
    function ngLinkDirectiveLinkFn(scope, element, attrs, ctrl) {
        var router = (ctrl && ctrl.$$router) || rootRouter;
        if (!router) {
            return;
        }
        var instruction = null;
        var link = attrs.ngLink || '';
        function getLink(params) {
            instruction = router.generate(params);
            return './' + angular.stringifyInstruction(instruction);
        }
        var routeParamsGetter = $parse(link);
        // we can avoid adding a watcher if it's a literal
        if (routeParamsGetter.constant) {
            var params = routeParamsGetter();
            element.attr('href', getLink(params));
        }
        else {
            scope.$watch(function () { return routeParamsGetter(scope); }, function (params) { return element.attr('href', getLink(params)); }, true);
        }
        element.on('click', function (event) {
            if (event.which !== 1 || !instruction) {
                return;
            }
            $router.navigateByInstruction(instruction);
            event.preventDefault();
        });
    }
}
function dashCase(str) {
    return str.replace(/[A-Z]/g, function (match) { return '-' + match.toLowerCase(); });
}
/*
 * A module for adding new a routing system Angular 1.
 */
angular.module('ngComponentRouter', [])
    .directive('ngOutlet', ngOutletDirective)
    .directive('ngOutlet', ngOutletFillContentDirective)
    .directive('ngLink', ngLinkDirective);
/*
 * A module for inspecting controller constructors
 */
angular.module('ng')
    .provider('$$directiveIntrospector', DirectiveIntrospectorProvider)
    .config(compilerProviderDecorator);

angular.module('ngComponentRouter').
    value('$route', null). // can be overloaded with ngRouteShim
    // Because Angular 1 has no notion of a root component, we use an object with unique identity
    // to represent this. Can be overloaded with a component name
    value('$routerRootComponent', new Object()).
    factory('$router', ['$q', '$location', '$$directiveIntrospector', '$browser', '$rootScope', '$injector', '$routerRootComponent', routerFactory]);

function routerFactory($q, $location, $$directiveIntrospector, $browser, $rootScope, $injector, $routerRootComponent) {

  // When this file is processed, the line below is replaced with
  // the contents of `../lib/facades.es5`.
  function CONST() {
  return (function(target) {
    return target;
  });
}

function CONST_EXPR(expr) {
  return expr;
}

function isPresent (x) {
  return !!x;
}

function isBlank (x) {
  return !x;
}

function isString(obj) {
  return typeof obj === 'string';
}

function isType (x) {
  return typeof x === 'function';
}

function isStringMap(obj) {
  return typeof obj === 'object' && obj !== null;
}

function isArray(obj) {
  return Array.isArray(obj);
}

function getTypeNameForDebugging (fn) {
  return fn.name || 'Root';
}

var PromiseWrapper = {
  resolve: function (reason) {
    return $q.when(reason);
  },

  reject: function (reason) {
    return $q.reject(reason);
  },

  catchError: function (promise, fn) {
    return promise.then(null, fn);
  },
  all: function (promises) {
    return $q.all(promises);
  }
};

var RegExpWrapper = {
  create: function(regExpStr, flags) {
    flags = flags ? flags.replace(/g/g, '') : '';
    return new RegExp(regExpStr, flags + 'g');
  },
  firstMatch: function(regExp, input) {
    regExp.lastIndex = 0;
    return regExp.exec(input);
  },
  matcher: function (regExp, input) {
    regExp.lastIndex = 0;
    return { re: regExp, input: input };
  }
};

var reflector = {
  annotations: function (fn) {
    //TODO: implement me
    return fn.annotations || [];
  }
};

var MapWrapper = {
  create: function() {
    return new Map();
  },

  get: function(m, k) {
    return m.get(k);
  },

  set: function(m, k, v) {
    return m.set(k, v);
  },

  contains: function (m, k) {
    return m.has(k);
  },

  forEach: function (m, fn) {
    return m.forEach(fn);
  }
};

var StringMapWrapper = {
  create: function () {
    return {};
  },

  set: function (m, k, v) {
    return m[k] = v;
  },

  get: function (m, k) {
    return m.hasOwnProperty(k) ? m[k] : undefined;
  },

  contains: function (m, k) {
    return m.hasOwnProperty(k);
  },

  keys: function(map) {
    return Object.keys(map);
  },

  isEmpty: function(map) {
    for (var prop in map) {
      if (map.hasOwnProperty(prop)) {
        return false;
      }
    }
    return true;
  },

  delete: function(map, key) {
    delete map[key];
  },

  forEach: function (m, fn) {
    for (var prop in m) {
      if (m.hasOwnProperty(prop)) {
        fn(m[prop], prop);
      }
    }
  },

  equals: function (m1, m2) {
    var k1 = Object.keys(m1);
    var k2 = Object.keys(m2);
    if (k1.length != k2.length) {
      return false;
    }
    var key;
    for (var i = 0; i < k1.length; i++) {
      key = k1[i];
      if (m1[key] !== m2[key]) {
        return false;
      }
    }
    return true;
  },

  merge: function(m1, m2) {
    var m = {};
    for (var attr in m1) {
      if (m1.hasOwnProperty(attr)) {
        m[attr] = m1[attr];
      }
    }
    for (var attr in m2) {
      if (m2.hasOwnProperty(attr)) {
        m[attr] = m2[attr];
      }
    }
    return m;
  }
};

var List = Array;
var ListWrapper = {
  clear: function (l) {
    l.length = 0;
  },

  create: function () {
    return [];
  },

  push: function (l, v) {
    return l.push(v);
  },

  forEach: function (l, fn) {
    return l.forEach(fn);
  },

  first: function(array) {
    if (!array)
      return null;
    return array[0];
  },

  last: function(array) {
    return (array && array.length) > 0 ? array[array.length - 1] : null;
  },

  map: function (l, fn) {
    return l.map(fn);
  },

  join: function (l, str) {
    return l.join(str);
  },

  reduce: function(list, fn, init) {
    return list.reduce(fn, init);
  },

  filter: function(array, pred) {
    return array.filter(pred);
  },

  concat: function(a, b) {
    return a.concat(b);
  },

  slice: function(l) {
    var from = arguments[1] !== (void 0) ? arguments[1] : 0;
    var to = arguments[2] !== (void 0) ? arguments[2] : null;
    return l.slice(from, to === null ? undefined : to);
  },

  maximum: function(list, predicate) {
    if (list.length == 0) {
      return null;
    }
    var solution = null;
    var maxValue = -Infinity;
    for (var index = 0; index < list.length; index++) {
      var candidate = list[index];
      if (isBlank(candidate)) {
        continue;
      }
      var candidateValue = predicate(candidate);
      if (candidateValue > maxValue) {
        solution = candidate;
        maxValue = candidateValue;
      }
    }
    return solution;
  }
};

var StringWrapper = {
  equals: function (s1, s2) {
    return s1 === s2;
  },

  split: function(s, re) {
    return s.split(re);
  },

  replaceAll: function(s, from, replace) {
    return s.replace(from, replace);
  },

  replaceAllMapped: function(s, from, cb) {
    return s.replace(from, function(matches) {
      // Remove offset & string from the result array
      matches.splice(-2, 2);
      // The callback receives match, p1, ..., pn
      return cb.apply(null, matches);
    });
  },

  contains: function(s, substr) {
    return s.indexOf(substr) != -1;
  },

  charCodeAt: function(s, l) {
    return s.charCodeAt(s, l);
  }


};

//TODO: implement?
// I think it's too heavy to ask 1.x users to bring in Rx for the router...
function EventEmitter() {}

var BaseException = Error;

var ObservableWrapper = {
  callNext: function(ob, val) {
    ob.fn(val);
  },
  callEmit: function(ob, val) {
    ob.fn(val);
  },

  subscribe: function(ob, fn) {
    ob.fn = fn;
  }
};

// TODO: https://github.com/angular/angular.js/blob/master/src/ng/browser.js#L227-L265
var $__router_47_location__ = {
  Location: Location
};

function Location(){}
Location.prototype.subscribe = function () {
  //TODO: implement
};
Location.prototype.path = function () {
  return $location.path();
};
Location.prototype.go = function (url) {
  return $location.path(url);
};


  var exports = {
    Injectable: function () {},
    OpaqueToken: function () {},
    Inject: function () {}
  };
  var require = function () {return exports;};

  // When this file is processed, the line below is replaced with
  // the contents of the compiled TypeScript classes.
  var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RouteLifecycleHook = (function () {
    function RouteLifecycleHook(name) {
        this.name = name;
    }
    RouteLifecycleHook = __decorate([
        CONST()
    ], RouteLifecycleHook);
    return RouteLifecycleHook;
})();
exports.RouteLifecycleHook = RouteLifecycleHook;
var CanActivate = (function () {
    function CanActivate(fn) {
        this.fn = fn;
    }
    CanActivate = __decorate([
        CONST()
    ], CanActivate);
    return CanActivate;
})();
exports.CanActivate = CanActivate;
exports.routerCanReuse = CONST_EXPR(new RouteLifecycleHook("routerCanReuse"));
exports.routerCanDeactivate = CONST_EXPR(new RouteLifecycleHook("routerCanDeactivate"));
exports.routerOnActivate = CONST_EXPR(new RouteLifecycleHook("routerOnActivate"));
exports.routerOnReuse = CONST_EXPR(new RouteLifecycleHook("routerOnReuse"));
exports.routerOnDeactivate = CONST_EXPR(new RouteLifecycleHook("routerOnDeactivate"));
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/**
 * This class represents a parsed URL
 */
var Url = (function () {
    function Url(path, child, auxiliary, params) {
        if (child === void 0) { child = null; }
        if (auxiliary === void 0) { auxiliary = CONST_EXPR([]); }
        if (params === void 0) { params = null; }
        this.path = path;
        this.child = child;
        this.auxiliary = auxiliary;
        this.params = params;
    }
    Url.prototype.toString = function () {
        return this.path + this._matrixParamsToString() + this._auxToString() + this._childString();
    };
    Url.prototype.segmentToString = function () { return this.path + this._matrixParamsToString(); };
    /** @internal */
    Url.prototype._auxToString = function () {
        return this.auxiliary.length > 0 ?
            ('(' + this.auxiliary.map(function (sibling) { return sibling.toString(); }).join('//') + ')') :
            '';
    };
    Url.prototype._matrixParamsToString = function () {
        if (isBlank(this.params)) {
            return '';
        }
        return ';' + serializeParams(this.params).join(';');
    };
    /** @internal */
    Url.prototype._childString = function () { return isPresent(this.child) ? ('/' + this.child.toString()) : ''; };
    return Url;
})();
exports.Url = Url;
var RootUrl = (function (_super) {
    __extends(RootUrl, _super);
    function RootUrl(path, child, auxiliary, params) {
        if (child === void 0) { child = null; }
        if (auxiliary === void 0) { auxiliary = CONST_EXPR([]); }
        if (params === void 0) { params = null; }
        _super.call(this, path, child, auxiliary, params);
    }
    RootUrl.prototype.toString = function () {
        return this.path + this._auxToString() + this._childString() + this._queryParamsToString();
    };
    RootUrl.prototype.segmentToString = function () { return this.path + this._queryParamsToString(); };
    RootUrl.prototype._queryParamsToString = function () {
        if (isBlank(this.params)) {
            return '';
        }
        return '?' + serializeParams(this.params).join('&');
    };
    return RootUrl;
})(Url);
exports.RootUrl = RootUrl;
function pathSegmentsToUrl(pathSegments) {
    var url = new Url(pathSegments[pathSegments.length - 1]);
    for (var i = pathSegments.length - 2; i >= 0; i -= 1) {
        url = new Url(pathSegments[i], url);
    }
    return url;
}
exports.pathSegmentsToUrl = pathSegmentsToUrl;
var SEGMENT_RE = RegExpWrapper.create('^[^\\/\\(\\)\\?;=&#]+');
function matchUrlSegment(str) {
    var match = RegExpWrapper.firstMatch(SEGMENT_RE, str);
    return isPresent(match) ? match[0] : '';
}
var UrlParser = (function () {
    function UrlParser() {
    }
    UrlParser.prototype.peekStartsWith = function (str) { return this._remaining.startsWith(str); };
    UrlParser.prototype.capture = function (str) {
        if (!this._remaining.startsWith(str)) {
            throw new BaseException("Expected \"" + str + "\".");
        }
        this._remaining = this._remaining.substring(str.length);
    };
    UrlParser.prototype.parse = function (url) {
        this._remaining = url;
        if (url == '' || url == '/') {
            return new Url('');
        }
        return this.parseRoot();
    };
    // segment + (aux segments) + (query params)
    UrlParser.prototype.parseRoot = function () {
        if (this.peekStartsWith('/')) {
            this.capture('/');
        }
        var path = matchUrlSegment(this._remaining);
        this.capture(path);
        var aux = [];
        if (this.peekStartsWith('(')) {
            aux = this.parseAuxiliaryRoutes();
        }
        if (this.peekStartsWith(';')) {
            // TODO: should these params just be dropped?
            this.parseMatrixParams();
        }
        var child = null;
        if (this.peekStartsWith('/') && !this.peekStartsWith('//')) {
            this.capture('/');
            child = this.parseSegment();
        }
        var queryParams = null;
        if (this.peekStartsWith('?')) {
            queryParams = this.parseQueryParams();
        }
        return new RootUrl(path, child, aux, queryParams);
    };
    // segment + (matrix params) + (aux segments)
    UrlParser.prototype.parseSegment = function () {
        if (this._remaining.length == 0) {
            return null;
        }
        if (this.peekStartsWith('/')) {
            this.capture('/');
        }
        var path = matchUrlSegment(this._remaining);
        this.capture(path);
        var matrixParams = null;
        if (this.peekStartsWith(';')) {
            matrixParams = this.parseMatrixParams();
        }
        var aux = [];
        if (this.peekStartsWith('(')) {
            aux = this.parseAuxiliaryRoutes();
        }
        var child = null;
        if (this.peekStartsWith('/') && !this.peekStartsWith('//')) {
            this.capture('/');
            child = this.parseSegment();
        }
        return new Url(path, child, aux, matrixParams);
    };
    UrlParser.prototype.parseQueryParams = function () {
        var params = {};
        this.capture('?');
        this.parseParam(params);
        while (this._remaining.length > 0 && this.peekStartsWith('&')) {
            this.capture('&');
            this.parseParam(params);
        }
        return params;
    };
    UrlParser.prototype.parseMatrixParams = function () {
        var params = {};
        while (this._remaining.length > 0 && this.peekStartsWith(';')) {
            this.capture(';');
            this.parseParam(params);
        }
        return params;
    };
    UrlParser.prototype.parseParam = function (params) {
        var key = matchUrlSegment(this._remaining);
        if (isBlank(key)) {
            return;
        }
        this.capture(key);
        var value = true;
        if (this.peekStartsWith('=')) {
            this.capture('=');
            var valueMatch = matchUrlSegment(this._remaining);
            if (isPresent(valueMatch)) {
                value = valueMatch;
                this.capture(value);
            }
        }
        params[key] = value;
    };
    UrlParser.prototype.parseAuxiliaryRoutes = function () {
        var routes = [];
        this.capture('(');
        while (!this.peekStartsWith(')') && this._remaining.length > 0) {
            routes.push(this.parseSegment());
            if (this.peekStartsWith('//')) {
                this.capture('//');
            }
        }
        this.capture(')');
        return routes;
    };
    return UrlParser;
})();
exports.UrlParser = UrlParser;
exports.parser = new UrlParser();
function serializeParams(paramMap) {
    var params = [];
    if (isPresent(paramMap)) {
        StringMapWrapper.forEach(paramMap, function (value, key) {
            if (value == true) {
                params.push(key);
            }
            else {
                params.push(key + '=' + value);
            }
        });
    }
    return params;
}
exports.serializeParams = serializeParams;
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var instruction_1 = require('./instruction');
var path_recognizer_1 = require('./path_recognizer');
var RouteMatch = (function () {
    function RouteMatch() {
    }
    return RouteMatch;
})();
exports.RouteMatch = RouteMatch;
var PathMatch = (function (_super) {
    __extends(PathMatch, _super);
    function PathMatch(instruction, remaining, remainingAux) {
        _super.call(this);
        this.instruction = instruction;
        this.remaining = remaining;
        this.remainingAux = remainingAux;
    }
    return PathMatch;
})(RouteMatch);
exports.PathMatch = PathMatch;
var RedirectMatch = (function (_super) {
    __extends(RedirectMatch, _super);
    function RedirectMatch(redirectTo, specificity) {
        _super.call(this);
        this.redirectTo = redirectTo;
        this.specificity = specificity;
    }
    return RedirectMatch;
})(RouteMatch);
exports.RedirectMatch = RedirectMatch;
var RedirectRecognizer = (function () {
    function RedirectRecognizer(path, redirectTo) {
        this.path = path;
        this.redirectTo = redirectTo;
        this._pathRecognizer = new path_recognizer_1.PathRecognizer(path);
        this.hash = this._pathRecognizer.hash;
    }
    /**
     * Returns `null` or a `ParsedUrl` representing the new path to match
     */
    RedirectRecognizer.prototype.recognize = function (beginningSegment) {
        var match = null;
        if (isPresent(this._pathRecognizer.recognize(beginningSegment))) {
            match = new RedirectMatch(this.redirectTo, this._pathRecognizer.specificity);
        }
        return PromiseWrapper.resolve(match);
    };
    RedirectRecognizer.prototype.generate = function (params) {
        throw new BaseException("Tried to generate a redirect.");
    };
    return RedirectRecognizer;
})();
exports.RedirectRecognizer = RedirectRecognizer;
// represents something like '/foo/:bar'
var RouteRecognizer = (function () {
    // TODO: cache component instruction instances by params and by ParsedUrl instance
    function RouteRecognizer(path, handler) {
        this.path = path;
        this.handler = handler;
        this.terminal = true;
        this._cache = new Map();
        this._pathRecognizer = new path_recognizer_1.PathRecognizer(path);
        this.specificity = this._pathRecognizer.specificity;
        this.hash = this._pathRecognizer.hash;
        this.terminal = this._pathRecognizer.terminal;
    }
    RouteRecognizer.prototype.recognize = function (beginningSegment) {
        var _this = this;
        var res = this._pathRecognizer.recognize(beginningSegment);
        if (isBlank(res)) {
            return null;
        }
        return this.handler.resolveComponentType().then(function (_) {
            var componentInstruction = _this._getInstruction(res['urlPath'], res['urlParams'], res['allParams']);
            return new PathMatch(componentInstruction, res['nextSegment'], res['auxiliary']);
        });
    };
    RouteRecognizer.prototype.generate = function (params) {
        var generated = this._pathRecognizer.generate(params);
        var urlPath = generated['urlPath'];
        var urlParams = generated['urlParams'];
        return this._getInstruction(urlPath, urlParams, params);
    };
    RouteRecognizer.prototype.generateComponentPathValues = function (params) {
        return this._pathRecognizer.generate(params);
    };
    RouteRecognizer.prototype._getInstruction = function (urlPath, urlParams, params) {
        if (isBlank(this.handler.componentType)) {
            throw new BaseException("Tried to get instruction before the type was loaded.");
        }
        var hashKey = urlPath + '?' + urlParams.join('?');
        if (this._cache.has(hashKey)) {
            return this._cache.get(hashKey);
        }
        var instruction = new instruction_1.ComponentInstruction(urlPath, urlParams, this.handler.data, this.handler.componentType, this.terminal, this.specificity, params);
        this._cache.set(hashKey, instruction);
        return instruction;
    };
    return RouteRecognizer;
})();
exports.RouteRecognizer = RouteRecognizer;
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var route_definition_1 = require('./route_definition');
exports.RouteDefinition = route_definition_1.RouteDefinition;
/**
 * The `RouteConfig` decorator defines routes for a given component.
 *
 * It takes an array of {@link RouteDefinition}s.
 */
var RouteConfig = (function () {
    function RouteConfig(configs) {
        this.configs = configs;
    }
    RouteConfig = __decorate([
        CONST()
    ], RouteConfig);
    return RouteConfig;
})();
exports.RouteConfig = RouteConfig;
/**
 * `Route` is a type of {@link RouteDefinition} used to route a path to a component.
 *
 * It has the following properties:
 * - `path` is a string that uses the route matcher DSL.
 * - `component` a component type.
 * - `name` is an optional `CamelCase` string representing the name of the route.
 * - `data` is an optional property of any type representing arbitrary route metadata for the given
 * route. It is injectable via {@link RouteData}.
 * - `useAsDefault` is a boolean value. If `true`, the child route will be navigated to if no child
 * route is specified during the navigation.
 *
 * ### Example
 * ```
 * import {RouteConfig} from 'angular2/router';
 *
 * @RouteConfig([
 *   {path: '/home', component: HomeCmp, name: 'HomeCmp' }
 * ])
 * class MyApp {}
 * ```
 */
var Route = (function () {
    function Route(_a) {
        var path = _a.path, component = _a.component, name = _a.name, data = _a.data, useAsDefault = _a.useAsDefault;
        // added next three properties to work around https://github.com/Microsoft/TypeScript/issues/4107
        this.aux = null;
        this.loader = null;
        this.redirectTo = null;
        this.path = path;
        this.component = component;
        this.name = name;
        this.data = data;
        this.useAsDefault = useAsDefault;
    }
    Route = __decorate([
        CONST()
    ], Route);
    return Route;
})();
exports.Route = Route;
/**
 * `AuxRoute` is a type of {@link RouteDefinition} used to define an auxiliary route.
 *
 * It takes an object with the following properties:
 * - `path` is a string that uses the route matcher DSL.
 * - `component` a component type.
 * - `name` is an optional `CamelCase` string representing the name of the route.
 * - `data` is an optional property of any type representing arbitrary route metadata for the given
 * route. It is injectable via {@link RouteData}.
 *
 * ### Example
 * ```
 * import {RouteConfig, AuxRoute} from 'angular2/router';
 *
 * @RouteConfig([
 *   new AuxRoute({path: '/home', component: HomeCmp})
 * ])
 * class MyApp {}
 * ```
 */
var AuxRoute = (function () {
    function AuxRoute(_a) {
        var path = _a.path, component = _a.component, name = _a.name;
        this.data = null;
        // added next three properties to work around https://github.com/Microsoft/TypeScript/issues/4107
        this.aux = null;
        this.loader = null;
        this.redirectTo = null;
        this.useAsDefault = false;
        this.path = path;
        this.component = component;
        this.name = name;
    }
    AuxRoute = __decorate([
        CONST()
    ], AuxRoute);
    return AuxRoute;
})();
exports.AuxRoute = AuxRoute;
/**
 * `AsyncRoute` is a type of {@link RouteDefinition} used to route a path to an asynchronously
 * loaded component.
 *
 * It has the following properties:
 * - `path` is a string that uses the route matcher DSL.
 * - `loader` is a function that returns a promise that resolves to a component.
 * - `name` is an optional `CamelCase` string representing the name of the route.
 * - `data` is an optional property of any type representing arbitrary route metadata for the given
 * route. It is injectable via {@link RouteData}.
 * - `useAsDefault` is a boolean value. If `true`, the child route will be navigated to if no child
 * route is specified during the navigation.
 *
 * ### Example
 * ```
 * import {RouteConfig} from 'angular2/router';
 *
 * @RouteConfig([
 *   {path: '/home', loader: () => Promise.resolve(MyLoadedCmp), name: 'MyLoadedCmp'}
 * ])
 * class MyApp {}
 * ```
 */
var AsyncRoute = (function () {
    function AsyncRoute(_a) {
        var path = _a.path, loader = _a.loader, name = _a.name, data = _a.data, useAsDefault = _a.useAsDefault;
        this.aux = null;
        this.path = path;
        this.loader = loader;
        this.name = name;
        this.data = data;
        this.useAsDefault = useAsDefault;
    }
    AsyncRoute = __decorate([
        CONST()
    ], AsyncRoute);
    return AsyncRoute;
})();
exports.AsyncRoute = AsyncRoute;
/**
 * `Redirect` is a type of {@link RouteDefinition} used to route a path to a canonical route.
 *
 * It has the following properties:
 * - `path` is a string that uses the route matcher DSL.
 * - `redirectTo` is an array representing the link DSL.
 *
 * Note that redirects **do not** affect how links are generated. For that, see the `useAsDefault`
 * option.
 *
 * ### Example
 * ```
 * import {RouteConfig} from 'angular2/router';
 *
 * @RouteConfig([
 *   {path: '/', redirectTo: ['/Home'] },
 *   {path: '/home', component: HomeCmp, name: 'Home'}
 * ])
 * class MyApp {}
 * ```
 */
var Redirect = (function () {
    function Redirect(_a) {
        var path = _a.path, redirectTo = _a.redirectTo;
        this.name = null;
        // added next three properties to work around https://github.com/Microsoft/TypeScript/issues/4107
        this.loader = null;
        this.data = null;
        this.aux = null;
        this.useAsDefault = false;
        this.path = path;
        this.redirectTo = redirectTo;
    }
    Redirect = __decorate([
        CONST()
    ], Redirect);
    return Redirect;
})();
exports.Redirect = Redirect;
var instruction_1 = require('./instruction');
var AsyncRouteHandler = (function () {
    function AsyncRouteHandler(_loader, data) {
        if (data === void 0) { data = null; }
        this._loader = _loader;
        /** @internal */
        this._resolvedComponent = null;
        this.data = isPresent(data) ? new instruction_1.RouteData(data) : instruction_1.BLANK_ROUTE_DATA;
    }
    AsyncRouteHandler.prototype.resolveComponentType = function () {
        var _this = this;
        if (isPresent(this._resolvedComponent)) {
            return this._resolvedComponent;
        }
        return this._resolvedComponent = this._loader().then(function (componentType) {
            _this.componentType = componentType;
            return componentType;
        });
    };
    return AsyncRouteHandler;
})();
exports.AsyncRouteHandler = AsyncRouteHandler;
var instruction_1 = require('./instruction');
var SyncRouteHandler = (function () {
    function SyncRouteHandler(componentType, data) {
        this.componentType = componentType;
        /** @internal */
        this._resolvedComponent = null;
        this._resolvedComponent = PromiseWrapper.resolve(componentType);
        this.data = isPresent(data) ? new instruction_1.RouteData(data) : instruction_1.BLANK_ROUTE_DATA;
    }
    SyncRouteHandler.prototype.resolveComponentType = function () { return this._resolvedComponent; };
    return SyncRouteHandler;
})();
exports.SyncRouteHandler = SyncRouteHandler;
var route_recognizer_1 = require('./route_recognizer');
var route_config_impl_1 = require('./route_config_impl');
var async_route_handler_1 = require('./async_route_handler');
var sync_route_handler_1 = require('./sync_route_handler');
/**
 * `ComponentRecognizer` is responsible for recognizing routes for a single component.
 * It is consumed by `RouteRegistry`, which knows how to recognize an entire hierarchy of
 * components.
 */
var ComponentRecognizer = (function () {
    function ComponentRecognizer() {
        this.names = new Map();
        // map from name to recognizer
        this.auxNames = new Map();
        // map from starting path to recognizer
        this.auxRoutes = new Map();
        // TODO: optimize this into a trie
        this.matchers = [];
        this.defaultRoute = null;
    }
    /**
     * returns whether or not the config is terminal
     */
    ComponentRecognizer.prototype.config = function (config) {
        var handler;
        if (isPresent(config.name) && config.name[0].toUpperCase() != config.name[0]) {
            var suggestedName = config.name[0].toUpperCase() + config.name.substring(1);
            throw new BaseException("Route \"" + config.path + "\" with name \"" + config.name + "\" does not begin with an uppercase letter. Route names should be CamelCase like \"" + suggestedName + "\".");
        }
        if (config instanceof route_config_impl_1.AuxRoute) {
            handler = new sync_route_handler_1.SyncRouteHandler(config.component, config.data);
            var path = config.path.startsWith('/') ? config.path.substring(1) : config.path;
            var recognizer = new route_recognizer_1.RouteRecognizer(config.path, handler);
            this.auxRoutes.set(path, recognizer);
            if (isPresent(config.name)) {
                this.auxNames.set(config.name, recognizer);
            }
            return recognizer.terminal;
        }
        var useAsDefault = false;
        if (config instanceof route_config_impl_1.Redirect) {
            var redirector = new route_recognizer_1.RedirectRecognizer(config.path, config.redirectTo);
            this._assertNoHashCollision(redirector.hash, config.path);
            this.matchers.push(redirector);
            return true;
        }
        if (config instanceof route_config_impl_1.Route) {
            handler = new sync_route_handler_1.SyncRouteHandler(config.component, config.data);
            useAsDefault = isPresent(config.useAsDefault) && config.useAsDefault;
        }
        else if (config instanceof route_config_impl_1.AsyncRoute) {
            handler = new async_route_handler_1.AsyncRouteHandler(config.loader, config.data);
            useAsDefault = isPresent(config.useAsDefault) && config.useAsDefault;
        }
        var recognizer = new route_recognizer_1.RouteRecognizer(config.path, handler);
        this._assertNoHashCollision(recognizer.hash, config.path);
        if (useAsDefault) {
            if (isPresent(this.defaultRoute)) {
                throw new BaseException("Only one route can be default");
            }
            this.defaultRoute = recognizer;
        }
        this.matchers.push(recognizer);
        if (isPresent(config.name)) {
            this.names.set(config.name, recognizer);
        }
        return recognizer.terminal;
    };
    ComponentRecognizer.prototype._assertNoHashCollision = function (hash, path) {
        this.matchers.forEach(function (matcher) {
            if (hash == matcher.hash) {
                throw new BaseException("Configuration '" + path + "' conflicts with existing route '" + matcher.path + "'");
            }
        });
    };
    /**
     * Given a URL, returns a list of `RouteMatch`es, which are partial recognitions for some route.
     */
    ComponentRecognizer.prototype.recognize = function (urlParse) {
        var solutions = [];
        this.matchers.forEach(function (routeRecognizer) {
            var pathMatch = routeRecognizer.recognize(urlParse);
            if (isPresent(pathMatch)) {
                solutions.push(pathMatch);
            }
        });
        // handle cases where we are routing just to an aux route
        if (solutions.length == 0 && isPresent(urlParse) && urlParse.auxiliary.length > 0) {
            return [PromiseWrapper.resolve(new route_recognizer_1.PathMatch(null, null, urlParse.auxiliary))];
        }
        return solutions;
    };
    ComponentRecognizer.prototype.recognizeAuxiliary = function (urlParse) {
        var routeRecognizer = this.auxRoutes.get(urlParse.path);
        if (isPresent(routeRecognizer)) {
            return [routeRecognizer.recognize(urlParse)];
        }
        return [PromiseWrapper.resolve(null)];
    };
    ComponentRecognizer.prototype.hasRoute = function (name) { return this.names.has(name); };
    ComponentRecognizer.prototype.componentLoaded = function (name) {
        return this.hasRoute(name) && isPresent(this.names.get(name).handler.componentType);
    };
    ComponentRecognizer.prototype.loadComponent = function (name) {
        return this.names.get(name).handler.resolveComponentType();
    };
    ComponentRecognizer.prototype.generate = function (name, params) {
        var pathRecognizer = this.names.get(name);
        if (isBlank(pathRecognizer)) {
            return null;
        }
        return pathRecognizer.generate(params);
    };
    ComponentRecognizer.prototype.generateAuxiliary = function (name, params) {
        var pathRecognizer = this.auxNames.get(name);
        if (isBlank(pathRecognizer)) {
            return null;
        }
        return pathRecognizer.generate(params);
    };
    return ComponentRecognizer;
})();
exports.ComponentRecognizer = ComponentRecognizer;
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/**
 * `RouteParams` is an immutable map of parameters for the given route
 * based on the url matcher and optional parameters for that route.
 *
 * You can inject `RouteParams` into the constructor of a component to use it.
 *
 * ### Example
 *
 * ```
 * import {Component} from 'angular2/core';
 * import {bootstrap} from 'angular2/platform/browser';
 * import {Router, ROUTER_DIRECTIVES, ROUTER_PROVIDERS, RouteConfig} from 'angular2/router';
 *
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {path: '/user/:id', component: UserCmp, as: 'UserCmp'},
 * ])
 * class AppCmp {}
 *
 * @Component({ template: 'user: {{id}}' })
 * class UserCmp {
 *   id: string;
 *   constructor(params: RouteParams) {
 *     this.id = params.get('id');
 *   }
 * }
 *
 * bootstrap(AppCmp, ROUTER_PROVIDERS);
 * ```
 */
var RouteParams = (function () {
    function RouteParams(params) {
        this.params = params;
    }
    RouteParams.prototype.get = function (param) { return normalizeBlank(StringMapWrapper.get(this.params, param)); };
    return RouteParams;
})();
exports.RouteParams = RouteParams;
/**
 * `RouteData` is an immutable map of additional data you can configure in your {@link Route}.
 *
 * You can inject `RouteData` into the constructor of a component to use it.
 *
 * ### Example
 *
 * ```
 * import {Component, View} from 'angular2/core';
 * import {bootstrap} from 'angular2/platform/browser';
 * import {Router, ROUTER_DIRECTIVES, routerBindings, RouteConfig} from 'angular2/router';
 *
 * @Component({...})
 * @View({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {path: '/user/:id', component: UserCmp, as: 'UserCmp', data: {isAdmin: true}},
 * ])
 * class AppCmp {}
 *
 * @Component({...})
 * @View({ template: 'user: {{isAdmin}}' })
 * class UserCmp {
 *   string: isAdmin;
 *   constructor(data: RouteData) {
 *     this.isAdmin = data.get('isAdmin');
 *   }
 * }
 *
 * bootstrap(AppCmp, routerBindings(AppCmp));
 * ```
 */
var RouteData = (function () {
    function RouteData(data) {
        if (data === void 0) { data = CONST_EXPR({}); }
        this.data = data;
    }
    RouteData.prototype.get = function (key) { return normalizeBlank(StringMapWrapper.get(this.data, key)); };
    return RouteData;
})();
exports.RouteData = RouteData;
exports.BLANK_ROUTE_DATA = new RouteData();
/**
 * `Instruction` is a tree of {@link ComponentInstruction}s with all the information needed
 * to transition each component in the app to a given route, including all auxiliary routes.
 *
 * `Instruction`s can be created using {@link Router#generate}, and can be used to
 * perform route changes with {@link Router#navigateByInstruction}.
 *
 * ### Example
 *
 * ```
 * import {Component} from 'angular2/core';
 * import {bootstrap} from 'angular2/platform/browser';
 * import {Router, ROUTER_DIRECTIVES, ROUTER_PROVIDERS, RouteConfig} from 'angular2/router';
 *
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {...},
 * ])
 * class AppCmp {
 *   constructor(router: Router) {
 *     var instruction = router.generate(['/MyRoute']);
 *     router.navigateByInstruction(instruction);
 *   }
 * }
 *
 * bootstrap(AppCmp, ROUTER_PROVIDERS);
 * ```
 */
var Instruction = (function () {
    function Instruction() {
        this.auxInstruction = {};
    }
    Object.defineProperty(Instruction.prototype, "urlPath", {
        get: function () { return isPresent(this.component) ? this.component.urlPath : ''; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "urlParams", {
        get: function () { return isPresent(this.component) ? this.component.urlParams : []; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "specificity", {
        get: function () {
            var total = '';
            if (isPresent(this.component)) {
                total += this.component.specificity;
            }
            if (isPresent(this.child)) {
                total += this.child.specificity;
            }
            return total;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * converts the instruction into a URL string
     */
    Instruction.prototype.toRootUrl = function () { return this.toUrlPath() + this.toUrlQuery(); };
    /** @internal */
    Instruction.prototype._toNonRootUrl = function () {
        return this._stringifyPathMatrixAuxPrefixed() +
            (isPresent(this.child) ? this.child._toNonRootUrl() : '');
    };
    Instruction.prototype.toUrlQuery = function () { return this.urlParams.length > 0 ? ('?' + this.urlParams.join('&')) : ''; };
    /**
     * Returns a new instruction that shares the state of the existing instruction, but with
     * the given child {@link Instruction} replacing the existing child.
     */
    Instruction.prototype.replaceChild = function (child) {
        return new ResolvedInstruction(this.component, child, this.auxInstruction);
    };
    /**
     * If the final URL for the instruction is ``
     */
    Instruction.prototype.toUrlPath = function () {
        return this.urlPath + this._stringifyAux() +
            (isPresent(this.child) ? this.child._toNonRootUrl() : '');
    };
    // default instructions override these
    Instruction.prototype.toLinkUrl = function () {
        return this.urlPath + this._stringifyAux() +
            (isPresent(this.child) ? this.child._toLinkUrl() : '');
    };
    // this is the non-root version (called recursively)
    /** @internal */
    Instruction.prototype._toLinkUrl = function () {
        return this._stringifyPathMatrixAuxPrefixed() +
            (isPresent(this.child) ? this.child._toLinkUrl() : '');
    };
    /** @internal */
    Instruction.prototype._stringifyPathMatrixAuxPrefixed = function () {
        var primary = this._stringifyPathMatrixAux();
        if (primary.length > 0) {
            primary = '/' + primary;
        }
        return primary;
    };
    /** @internal */
    Instruction.prototype._stringifyMatrixParams = function () {
        return this.urlParams.length > 0 ? (';' + this.urlParams.join(';')) : '';
    };
    /** @internal */
    Instruction.prototype._stringifyPathMatrixAux = function () {
        if (isBlank(this.component)) {
            return '';
        }
        return this.urlPath + this._stringifyMatrixParams() + this._stringifyAux();
    };
    /** @internal */
    Instruction.prototype._stringifyAux = function () {
        var routes = [];
        StringMapWrapper.forEach(this.auxInstruction, function (auxInstruction, _) {
            routes.push(auxInstruction._stringifyPathMatrixAux());
        });
        if (routes.length > 0) {
            return '(' + routes.join('//') + ')';
        }
        return '';
    };
    return Instruction;
})();
exports.Instruction = Instruction;
/**
 * a resolved instruction has an outlet instruction for itself, but maybe not for...
 */
var ResolvedInstruction = (function (_super) {
    __extends(ResolvedInstruction, _super);
    function ResolvedInstruction(component, child, auxInstruction) {
        _super.call(this);
        this.component = component;
        this.child = child;
        this.auxInstruction = auxInstruction;
    }
    ResolvedInstruction.prototype.resolveComponent = function () {
        return PromiseWrapper.resolve(this.component);
    };
    return ResolvedInstruction;
})(Instruction);
exports.ResolvedInstruction = ResolvedInstruction;
/**
 * Represents a resolved default route
 */
var DefaultInstruction = (function (_super) {
    __extends(DefaultInstruction, _super);
    function DefaultInstruction(component, child) {
        _super.call(this);
        this.component = component;
        this.child = child;
    }
    DefaultInstruction.prototype.resolveComponent = function () {
        return PromiseWrapper.resolve(this.component);
    };
    DefaultInstruction.prototype.toLinkUrl = function () { return ''; };
    /** @internal */
    DefaultInstruction.prototype._toLinkUrl = function () { return ''; };
    return DefaultInstruction;
})(Instruction);
exports.DefaultInstruction = DefaultInstruction;
/**
 * Represents a component that may need to do some redirection or lazy loading at a later time.
 */
var UnresolvedInstruction = (function (_super) {
    __extends(UnresolvedInstruction, _super);
    function UnresolvedInstruction(_resolver, _urlPath, _urlParams) {
        if (_urlPath === void 0) { _urlPath = ''; }
        if (_urlParams === void 0) { _urlParams = CONST_EXPR([]); }
        _super.call(this);
        this._resolver = _resolver;
        this._urlPath = _urlPath;
        this._urlParams = _urlParams;
    }
    Object.defineProperty(UnresolvedInstruction.prototype, "urlPath", {
        get: function () {
            if (isPresent(this.component)) {
                return this.component.urlPath;
            }
            if (isPresent(this._urlPath)) {
                return this._urlPath;
            }
            return '';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(UnresolvedInstruction.prototype, "urlParams", {
        get: function () {
            if (isPresent(this.component)) {
                return this.component.urlParams;
            }
            if (isPresent(this._urlParams)) {
                return this._urlParams;
            }
            return [];
        },
        enumerable: true,
        configurable: true
    });
    UnresolvedInstruction.prototype.resolveComponent = function () {
        var _this = this;
        if (isPresent(this.component)) {
            return PromiseWrapper.resolve(this.component);
        }
        return this._resolver().then(function (resolution) {
            _this.child = resolution.child;
            return _this.component = resolution.component;
        });
    };
    return UnresolvedInstruction;
})(Instruction);
exports.UnresolvedInstruction = UnresolvedInstruction;
var RedirectInstruction = (function (_super) {
    __extends(RedirectInstruction, _super);
    function RedirectInstruction(component, child, auxInstruction, _specificity) {
        _super.call(this, component, child, auxInstruction);
        this._specificity = _specificity;
    }
    Object.defineProperty(RedirectInstruction.prototype, "specificity", {
        get: function () { return this._specificity; },
        enumerable: true,
        configurable: true
    });
    return RedirectInstruction;
})(ResolvedInstruction);
exports.RedirectInstruction = RedirectInstruction;
/**
 * A `ComponentInstruction` represents the route state for a single component. An `Instruction` is
 * composed of a tree of these `ComponentInstruction`s.
 *
 * `ComponentInstructions` is a public API. Instances of `ComponentInstruction` are passed
 * to route lifecycle hooks, like {@link CanActivate}.
 *
 * `ComponentInstruction`s are [https://en.wikipedia.org/wiki/Hash_consing](hash consed). You should
 * never construct one yourself with "new." Instead, rely on {@link Router/RouteRecognizer} to
 * construct `ComponentInstruction`s.
 *
 * You should not modify this object. It should be treated as immutable.
 */
var ComponentInstruction = (function () {
    function ComponentInstruction(urlPath, urlParams, data, componentType, terminal, specificity, params) {
        if (params === void 0) { params = null; }
        this.urlPath = urlPath;
        this.urlParams = urlParams;
        this.componentType = componentType;
        this.terminal = terminal;
        this.specificity = specificity;
        this.params = params;
        this.reuse = false;
        this.routeData = isPresent(data) ? data : exports.BLANK_ROUTE_DATA;
    }
    return ComponentInstruction;
})();
exports.ComponentInstruction = ComponentInstruction;
var url_parser_1 = require('./url_parser');
var TouchMap = (function () {
    function TouchMap(map) {
        var _this = this;
        this.map = {};
        this.keys = {};
        if (isPresent(map)) {
            StringMapWrapper.forEach(map, function (value, key) {
                _this.map[key] = isPresent(value) ? value.toString() : null;
                _this.keys[key] = true;
            });
        }
    }
    TouchMap.prototype.get = function (key) {
        StringMapWrapper.delete(this.keys, key);
        return this.map[key];
    };
    TouchMap.prototype.getUnused = function () {
        var _this = this;
        var unused = {};
        var keys = StringMapWrapper.keys(this.keys);
        keys.forEach(function (key) { return unused[key] = StringMapWrapper.get(_this.map, key); });
        return unused;
    };
    return TouchMap;
})();
function normalizeString(obj) {
    if (isBlank(obj)) {
        return null;
    }
    else {
        return obj.toString();
    }
}
var ContinuationSegment = (function () {
    function ContinuationSegment() {
        this.name = '';
    }
    ContinuationSegment.prototype.generate = function (params) { return ''; };
    ContinuationSegment.prototype.match = function (path) { return true; };
    return ContinuationSegment;
})();
var StaticSegment = (function () {
    function StaticSegment(path) {
        this.path = path;
        this.name = '';
    }
    StaticSegment.prototype.match = function (path) { return path == this.path; };
    StaticSegment.prototype.generate = function (params) { return this.path; };
    return StaticSegment;
})();
var DynamicSegment = (function () {
    function DynamicSegment(name) {
        this.name = name;
    }
    DynamicSegment.prototype.match = function (path) { return path.length > 0; };
    DynamicSegment.prototype.generate = function (params) {
        if (!StringMapWrapper.contains(params.map, this.name)) {
            throw new BaseException("Route generator for '" + this.name + "' was not included in parameters passed.");
        }
        return normalizeString(params.get(this.name));
    };
    return DynamicSegment;
})();
var StarSegment = (function () {
    function StarSegment(name) {
        this.name = name;
    }
    StarSegment.prototype.match = function (path) { return true; };
    StarSegment.prototype.generate = function (params) { return normalizeString(params.get(this.name)); };
    return StarSegment;
})();
var paramMatcher = /^:([^\/]+)$/g;
var wildcardMatcher = /^\*([^\/]+)$/g;
function parsePathString(route) {
    // normalize route as not starting with a "/". Recognition will
    // also normalize.
    if (route.startsWith("/")) {
        route = route.substring(1);
    }
    var segments = splitBySlash(route);
    var results = [];
    var specificity = '';
    // a single slash (or "empty segment" is as specific as a static segment
    if (segments.length == 0) {
        specificity += '2';
    }
    // The "specificity" of a path is used to determine which route is used when multiple routes match
    // a URL. Static segments (like "/foo") are the most specific, followed by dynamic segments (like
    // "/:id"). Star segments add no specificity. Segments at the start of the path are more specific
    // than proceeding ones.
    //
    // The code below uses place values to combine the different types of segments into a single
    // string that we can sort later. Each static segment is marked as a specificity of "2," each
    // dynamic segment is worth "1" specificity, and stars are worth "0" specificity.
    var limit = segments.length - 1;
    for (var i = 0; i <= limit; i++) {
        var segment = segments[i], match;
        if (isPresent(match = RegExpWrapper.firstMatch(paramMatcher, segment))) {
            results.push(new DynamicSegment(match[1]));
            specificity += '1';
        }
        else if (isPresent(match = RegExpWrapper.firstMatch(wildcardMatcher, segment))) {
            results.push(new StarSegment(match[1]));
            specificity += '0';
        }
        else if (segment == '...') {
            if (i < limit) {
                throw new BaseException("Unexpected \"...\" before the end of the path for \"" + route + "\".");
            }
            results.push(new ContinuationSegment());
        }
        else {
            results.push(new StaticSegment(segment));
            specificity += '2';
        }
    }
    return { 'segments': results, 'specificity': specificity };
}
// this function is used to determine whether a route config path like `/foo/:id` collides with
// `/foo/:name`
function pathDslHash(segments) {
    return segments.map(function (segment) {
        if (segment instanceof StarSegment) {
            return '*';
        }
        else if (segment instanceof ContinuationSegment) {
            return '...';
        }
        else if (segment instanceof DynamicSegment) {
            return ':';
        }
        else if (segment instanceof StaticSegment) {
            return segment.path;
        }
    })
        .join('/');
}
function splitBySlash(url) {
    return url.split('/');
}
var RESERVED_CHARS = RegExpWrapper.create('//|\\(|\\)|;|\\?|=');
function assertPath(path) {
    if (StringWrapper.contains(path, '#')) {
        throw new BaseException("Path \"" + path + "\" should not include \"#\". Use \"HashLocationStrategy\" instead.");
    }
    var illegalCharacter = RegExpWrapper.firstMatch(RESERVED_CHARS, path);
    if (isPresent(illegalCharacter)) {
        throw new BaseException("Path \"" + path + "\" contains \"" + illegalCharacter[0] + "\" which is not allowed in a route config.");
    }
}
/**
 * Parses a URL string using a given matcher DSL, and generates URLs from param maps
 */
var PathRecognizer = (function () {
    function PathRecognizer(path) {
        this.path = path;
        this.terminal = true;
        assertPath(path);
        var parsed = parsePathString(path);
        this._segments = parsed['segments'];
        this.specificity = parsed['specificity'];
        this.hash = pathDslHash(this._segments);
        var lastSegment = this._segments[this._segments.length - 1];
        this.terminal = !(lastSegment instanceof ContinuationSegment);
    }
    PathRecognizer.prototype.recognize = function (beginningSegment) {
        var nextSegment = beginningSegment;
        var currentSegment;
        var positionalParams = {};
        var captured = [];
        for (var i = 0; i < this._segments.length; i += 1) {
            var segment = this._segments[i];
            currentSegment = nextSegment;
            if (segment instanceof ContinuationSegment) {
                break;
            }
            if (isPresent(currentSegment)) {
                captured.push(currentSegment.path);
                // the star segment consumes all of the remaining URL, including matrix params
                if (segment instanceof StarSegment) {
                    positionalParams[segment.name] = currentSegment.toString();
                    nextSegment = null;
                    break;
                }
                if (segment instanceof DynamicSegment) {
                    positionalParams[segment.name] = currentSegment.path;
                }
                else if (!segment.match(currentSegment.path)) {
                    return null;
                }
                nextSegment = currentSegment.child;
            }
            else if (!segment.match('')) {
                return null;
            }
        }
        if (this.terminal && isPresent(nextSegment)) {
            return null;
        }
        var urlPath = captured.join('/');
        var auxiliary;
        var urlParams;
        var allParams;
        if (isPresent(currentSegment)) {
            // If this is the root component, read query params. Otherwise, read matrix params.
            var paramsSegment = beginningSegment instanceof url_parser_1.RootUrl ? beginningSegment : currentSegment;
            allParams = isPresent(paramsSegment.params) ?
                StringMapWrapper.merge(paramsSegment.params, positionalParams) :
                positionalParams;
            urlParams = url_parser_1.serializeParams(paramsSegment.params);
            auxiliary = currentSegment.auxiliary;
        }
        else {
            allParams = positionalParams;
            auxiliary = [];
            urlParams = [];
        }
        return { urlPath: urlPath, urlParams: urlParams, allParams: allParams, auxiliary: auxiliary, nextSegment: nextSegment };
    };
    PathRecognizer.prototype.generate = function (params) {
        var paramTokens = new TouchMap(params);
        var path = [];
        for (var i = 0; i < this._segments.length; i++) {
            var segment = this._segments[i];
            if (!(segment instanceof ContinuationSegment)) {
                path.push(segment.generate(paramTokens));
            }
        }
        var urlPath = path.join('/');
        var nonPositionalParams = paramTokens.getUnused();
        var urlParams = url_parser_1.serializeParams(nonPositionalParams);
        return { urlPath: urlPath, urlParams: urlParams };
    };
    return PathRecognizer;
})();
exports.PathRecognizer = PathRecognizer;
var route_config_decorator_1 = require('./route_config_decorator');
/**
 * Given a JS Object that represents a route config, returns a corresponding Route, AsyncRoute,
 * AuxRoute or Redirect object.
 *
 * Also wraps an AsyncRoute's loader function to add the loaded component's route config to the
 * `RouteRegistry`.
 */
function normalizeRouteConfig(config, registry) {
    if (config instanceof route_config_decorator_1.AsyncRoute) {
        var wrappedLoader = wrapLoaderToReconfigureRegistry(config.loader, registry);
        return new route_config_decorator_1.AsyncRoute({
            path: config.path,
            loader: wrappedLoader,
            name: config.name,
            data: config.data,
            useAsDefault: config.useAsDefault
        });
    }
    if (config instanceof route_config_decorator_1.Route || config instanceof route_config_decorator_1.Redirect || config instanceof route_config_decorator_1.AuxRoute) {
        return config;
    }
    if ((+!!config.component) + (+!!config.redirectTo) + (+!!config.loader) != 1) {
        throw new BaseException("Route config should contain exactly one \"component\", \"loader\", or \"redirectTo\" property.");
    }
    if (config.as && config.name) {
        throw new BaseException("Route config should contain exactly one \"as\" or \"name\" property.");
    }
    if (config.as) {
        config.name = config.as;
    }
    if (config.loader) {
        var wrappedLoader = wrapLoaderToReconfigureRegistry(config.loader, registry);
        return new route_config_decorator_1.AsyncRoute({
            path: config.path,
            loader: wrappedLoader,
            name: config.name,
            useAsDefault: config.useAsDefault
        });
    }
    if (config.aux) {
        return new route_config_decorator_1.AuxRoute({ path: config.aux, component: config.component, name: config.name });
    }
    if (config.component) {
        if (typeof config.component == 'object') {
            var componentDefinitionObject = config.component;
            if (componentDefinitionObject.type == 'constructor') {
                return new route_config_decorator_1.Route({
                    path: config.path,
                    component: componentDefinitionObject.constructor,
                    name: config.name,
                    data: config.data,
                    useAsDefault: config.useAsDefault
                });
            }
            else if (componentDefinitionObject.type == 'loader') {
                return new route_config_decorator_1.AsyncRoute({
                    path: config.path,
                    loader: componentDefinitionObject.loader,
                    name: config.name,
                    useAsDefault: config.useAsDefault
                });
            }
            else {
                throw new BaseException("Invalid component type \"" + componentDefinitionObject.type + "\". Valid types are \"constructor\" and \"loader\".");
            }
        }
        return new route_config_decorator_1.Route(config);
    }
    if (config.redirectTo) {
        return new route_config_decorator_1.Redirect({ path: config.path, redirectTo: config.redirectTo });
    }
    return config;
}
exports.normalizeRouteConfig = normalizeRouteConfig;
function wrapLoaderToReconfigureRegistry(loader, registry) {
    return function () {
        return loader().then(function (componentType) {
            registry.configFromComponent(componentType);
            return componentType;
        });
    };
}
function assertComponentExists(component, path) {
    if (!isType(component)) {
        throw new BaseException("Component for route \"" + path + "\" is not defined, or is not a class.");
    }
}
exports.assertComponentExists = assertComponentExists;
var lifecycle_annotations_impl_1 = require('./lifecycle_annotations_impl');
function hasLifecycleHook(e, type) {
    if (!(type instanceof Type))
        return false;
    return e.name in type.prototype;
}
exports.hasLifecycleHook = hasLifecycleHook;
function getCanActivateHook(type) {
    var annotations = reflector.annotations(type);
    for (var i = 0; i < annotations.length; i += 1) {
        var annotation = annotations[i];
        if (annotation instanceof lifecycle_annotations_impl_1.CanActivate) {
            return annotation.fn;
        }
    }
    return null;
}
exports.getCanActivateHook = getCanActivateHook;
var core_1 = require('angular2/core');
var route_config_impl_1 = require('./route_config_impl');
var route_recognizer_1 = require('./route_recognizer');
var component_recognizer_1 = require('./component_recognizer');
var instruction_1 = require('./instruction');
var route_config_nomalizer_1 = require('./route_config_nomalizer');
var url_parser_1 = require('./url_parser');
var _resolveToNull = PromiseWrapper.resolve(null);
/**
 * Token used to bind the component with the top-level {@link RouteConfig}s for the
 * application.
 *
 * ### Example ([live demo](http://plnkr.co/edit/iRUP8B5OUbxCWQ3AcIDm))
 *
 * ```
 * import {Component} from 'angular2/core';
 * import {
 *   ROUTER_DIRECTIVES,
 *   ROUTER_PROVIDERS,
 *   RouteConfig
 * } from 'angular2/router';
 *
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {...},
 * ])
 * class AppCmp {
 *   // ...
 * }
 *
 * bootstrap(AppCmp, [ROUTER_PROVIDERS]);
 * ```
 */
exports.ROUTER_PRIMARY_COMPONENT = CONST_EXPR(new core_1.OpaqueToken('RouterPrimaryComponent'));
/**
 * The RouteRegistry holds route configurations for each component in an Angular app.
 * It is responsible for creating Instructions from URLs, and generating URLs based on route and
 * parameters.
 */
var RouteRegistry = (function () {
    function RouteRegistry(_rootComponent) {
        this._rootComponent = _rootComponent;
        this._rules = new Map();
    }
    /**
     * Given a component and a configuration object, add the route to this registry
     */
    RouteRegistry.prototype.config = function (parentComponent, config) {
        config = route_config_nomalizer_1.normalizeRouteConfig(config, this);
        // this is here because Dart type guard reasons
        if (config instanceof route_config_impl_1.Route) {
            route_config_nomalizer_1.assertComponentExists(config.component, config.path);
        }
        else if (config instanceof route_config_impl_1.AuxRoute) {
            route_config_nomalizer_1.assertComponentExists(config.component, config.path);
        }
        var recognizer = this._rules.get(parentComponent);
        if (isBlank(recognizer)) {
            recognizer = new component_recognizer_1.ComponentRecognizer();
            this._rules.set(parentComponent, recognizer);
        }
        var terminal = recognizer.config(config);
        if (config instanceof route_config_impl_1.Route) {
            if (terminal) {
                assertTerminalComponent(config.component, config.path);
            }
            else {
                this.configFromComponent(config.component);
            }
        }
    };
    /**
     * Reads the annotations of a component and configures the registry based on them
     */
    RouteRegistry.prototype.configFromComponent = function (component) {
        var _this = this;
        if (!isType(component)) {
            return;
        }
        // Don't read the annotations from a type more than once –
        // this prevents an infinite loop if a component routes recursively.
        if (this._rules.has(component)) {
            return;
        }
        var annotations = reflector.annotations(component);
        if (isPresent(annotations)) {
            for (var i = 0; i < annotations.length; i++) {
                var annotation = annotations[i];
                if (annotation instanceof route_config_impl_1.RouteConfig) {
                    var routeCfgs = annotation.configs;
                    routeCfgs.forEach(function (config) { return _this.config(component, config); });
                }
            }
        }
    };
    /**
     * Given a URL and a parent component, return the most specific instruction for navigating
     * the application into the state specified by the url
     */
    RouteRegistry.prototype.recognize = function (url, ancestorInstructions) {
        var parsedUrl = url_parser_1.parser.parse(url);
        return this._recognize(parsedUrl, []);
    };
    /**
     * Recognizes all parent-child routes, but creates unresolved auxiliary routes
     */
    RouteRegistry.prototype._recognize = function (parsedUrl, ancestorInstructions, _aux) {
        var _this = this;
        if (_aux === void 0) { _aux = false; }
        var parentInstruction = ListWrapper.last(ancestorInstructions);
        var parentComponent = isPresent(parentInstruction) ? parentInstruction.component.componentType :
            this._rootComponent;
        var componentRecognizer = this._rules.get(parentComponent);
        if (isBlank(componentRecognizer)) {
            return _resolveToNull;
        }
        // Matches some beginning part of the given URL
        var possibleMatches = _aux ? componentRecognizer.recognizeAuxiliary(parsedUrl) :
            componentRecognizer.recognize(parsedUrl);
        var matchPromises = possibleMatches.map(function (candidate) { return candidate.then(function (candidate) {
            if (candidate instanceof route_recognizer_1.PathMatch) {
                var auxParentInstructions = ancestorInstructions.length > 0 ? [ListWrapper.last(ancestorInstructions)] : [];
                var auxInstructions = _this._auxRoutesToUnresolved(candidate.remainingAux, auxParentInstructions);
                var instruction = new instruction_1.ResolvedInstruction(candidate.instruction, null, auxInstructions);
                if (isBlank(candidate.instruction) || candidate.instruction.terminal) {
                    return instruction;
                }
                var newAncestorComponents = ancestorInstructions.concat([instruction]);
                return _this._recognize(candidate.remaining, newAncestorComponents)
                    .then(function (childInstruction) {
                    if (isBlank(childInstruction)) {
                        return null;
                    }
                    // redirect instructions are already absolute
                    if (childInstruction instanceof instruction_1.RedirectInstruction) {
                        return childInstruction;
                    }
                    instruction.child = childInstruction;
                    return instruction;
                });
            }
            if (candidate instanceof route_recognizer_1.RedirectMatch) {
                var instruction = _this.generate(candidate.redirectTo, ancestorInstructions.concat([null]));
                return new instruction_1.RedirectInstruction(instruction.component, instruction.child, instruction.auxInstruction, candidate.specificity);
            }
        }); });
        if ((isBlank(parsedUrl) || parsedUrl.path == '') && possibleMatches.length == 0) {
            return PromiseWrapper.resolve(this.generateDefault(parentComponent));
        }
        return PromiseWrapper.all(matchPromises).then(mostSpecific);
    };
    RouteRegistry.prototype._auxRoutesToUnresolved = function (auxRoutes, parentInstructions) {
        var _this = this;
        var unresolvedAuxInstructions = {};
        auxRoutes.forEach(function (auxUrl) {
            unresolvedAuxInstructions[auxUrl.path] = new instruction_1.UnresolvedInstruction(function () { return _this._recognize(auxUrl, parentInstructions, true); });
        });
        return unresolvedAuxInstructions;
    };
    /**
     * Given a normalized list with component names and params like: `['user', {id: 3 }]`
     * generates a url with a leading slash relative to the provided `parentComponent`.
     *
     * If the optional param `_aux` is `true`, then we generate starting at an auxiliary
     * route boundary.
     */
    RouteRegistry.prototype.generate = function (linkParams, ancestorInstructions, _aux) {
        if (_aux === void 0) { _aux = false; }
        var params = splitAndFlattenLinkParams(linkParams);
        var prevInstruction;
        // The first segment should be either '.' (generate from parent) or '' (generate from root).
        // When we normalize above, we strip all the slashes, './' becomes '.' and '/' becomes ''.
        if (ListWrapper.first(params) == '') {
            params.shift();
            prevInstruction = ListWrapper.first(ancestorInstructions);
            ancestorInstructions = [];
        }
        else {
            prevInstruction = ancestorInstructions.length > 0 ? ancestorInstructions.pop() : null;
            if (ListWrapper.first(params) == '.') {
                params.shift();
            }
            else if (ListWrapper.first(params) == '..') {
                while (ListWrapper.first(params) == '..') {
                    if (ancestorInstructions.length <= 0) {
                        throw new BaseException("Link \"" + ListWrapper.toJSON(linkParams) + "\" has too many \"../\" segments.");
                    }
                    prevInstruction = ancestorInstructions.pop();
                    params = ListWrapper.slice(params, 1);
                }
            }
            else {
                // we must only peak at the link param, and not consume it
                var routeName = ListWrapper.first(params);
                var parentComponentType = this._rootComponent;
                var grandparentComponentType = null;
                if (ancestorInstructions.length > 1) {
                    var parentComponentInstruction = ancestorInstructions[ancestorInstructions.length - 1];
                    var grandComponentInstruction = ancestorInstructions[ancestorInstructions.length - 2];
                    parentComponentType = parentComponentInstruction.component.componentType;
                    grandparentComponentType = grandComponentInstruction.component.componentType;
                }
                else if (ancestorInstructions.length == 1) {
                    parentComponentType = ancestorInstructions[0].component.componentType;
                    grandparentComponentType = this._rootComponent;
                }
                // For a link with no leading `./`, `/`, or `../`, we look for a sibling and child.
                // If both exist, we throw. Otherwise, we prefer whichever exists.
                var childRouteExists = this.hasRoute(routeName, parentComponentType);
                var parentRouteExists = isPresent(grandparentComponentType) &&
                    this.hasRoute(routeName, grandparentComponentType);
                if (parentRouteExists && childRouteExists) {
                    var msg = "Link \"" + ListWrapper.toJSON(linkParams) + "\" is ambiguous, use \"./\" or \"../\" to disambiguate.";
                    throw new BaseException(msg);
                }
                if (parentRouteExists) {
                    prevInstruction = ancestorInstructions.pop();
                }
            }
        }
        if (params[params.length - 1] == '') {
            params.pop();
        }
        if (params.length > 0 && params[0] == '') {
            params.shift();
        }
        if (params.length < 1) {
            var msg = "Link \"" + ListWrapper.toJSON(linkParams) + "\" must include a route name.";
            throw new BaseException(msg);
        }
        var generatedInstruction = this._generate(params, ancestorInstructions, prevInstruction, _aux, linkParams);
        // we don't clone the first (root) element
        for (var i = ancestorInstructions.length - 1; i >= 0; i--) {
            var ancestorInstruction = ancestorInstructions[i];
            if (isBlank(ancestorInstruction)) {
                break;
            }
            generatedInstruction = ancestorInstruction.replaceChild(generatedInstruction);
        }
        return generatedInstruction;
    };
    /*
     * Internal helper that does not make any assertions about the beginning of the link DSL.
     * `ancestorInstructions` are parents that will be cloned.
     * `prevInstruction` is the existing instruction that would be replaced, but which might have
     * aux routes that need to be cloned.
     */
    RouteRegistry.prototype._generate = function (linkParams, ancestorInstructions, prevInstruction, _aux, _originalLink) {
        var _this = this;
        if (_aux === void 0) { _aux = false; }
        var parentComponentType = this._rootComponent;
        var componentInstruction = null;
        var auxInstructions = {};
        var parentInstruction = ListWrapper.last(ancestorInstructions);
        if (isPresent(parentInstruction) && isPresent(parentInstruction.component)) {
            parentComponentType = parentInstruction.component.componentType;
        }
        if (linkParams.length == 0) {
            var defaultInstruction = this.generateDefault(parentComponentType);
            if (isBlank(defaultInstruction)) {
                throw new BaseException("Link \"" + ListWrapper.toJSON(_originalLink) + "\" does not resolve to a terminal instruction.");
            }
            return defaultInstruction;
        }
        // for non-aux routes, we want to reuse the predecessor's existing primary and aux routes
        // and only override routes for which the given link DSL provides
        if (isPresent(prevInstruction) && !_aux) {
            auxInstructions = StringMapWrapper.merge(prevInstruction.auxInstruction, auxInstructions);
            componentInstruction = prevInstruction.component;
        }
        var componentRecognizer = this._rules.get(parentComponentType);
        if (isBlank(componentRecognizer)) {
            throw new BaseException("Component \"" + getTypeNameForDebugging(parentComponentType) + "\" has no route config.");
        }
        var linkParamIndex = 0;
        var routeParams = {};
        // first, recognize the primary route if one is provided
        if (linkParamIndex < linkParams.length && isString(linkParams[linkParamIndex])) {
            var routeName = linkParams[linkParamIndex];
            if (routeName == '' || routeName == '.' || routeName == '..') {
                throw new BaseException("\"" + routeName + "/\" is only allowed at the beginning of a link DSL.");
            }
            linkParamIndex += 1;
            if (linkParamIndex < linkParams.length) {
                var linkParam = linkParams[linkParamIndex];
                if (isStringMap(linkParam) && !isArray(linkParam)) {
                    routeParams = linkParam;
                    linkParamIndex += 1;
                }
            }
            var routeRecognizer = (_aux ? componentRecognizer.auxNames : componentRecognizer.names).get(routeName);
            if (isBlank(routeRecognizer)) {
                throw new BaseException("Component \"" + getTypeNameForDebugging(parentComponentType) + "\" has no route named \"" + routeName + "\".");
            }
            // Create an "unresolved instruction" for async routes
            // we'll figure out the rest of the route when we resolve the instruction and
            // perform a navigation
            if (isBlank(routeRecognizer.handler.componentType)) {
                var compInstruction = routeRecognizer.generateComponentPathValues(routeParams);
                return new instruction_1.UnresolvedInstruction(function () {
                    return routeRecognizer.handler.resolveComponentType().then(function (_) {
                        return _this._generate(linkParams, ancestorInstructions, prevInstruction, _aux, _originalLink);
                    });
                }, compInstruction['urlPath'], compInstruction['urlParams']);
            }
            componentInstruction = _aux ? componentRecognizer.generateAuxiliary(routeName, routeParams) :
                componentRecognizer.generate(routeName, routeParams);
        }
        // Next, recognize auxiliary instructions.
        // If we have an ancestor instruction, we preserve whatever aux routes are active from it.
        while (linkParamIndex < linkParams.length && isArray(linkParams[linkParamIndex])) {
            var auxParentInstruction = [parentInstruction];
            var auxInstruction = this._generate(linkParams[linkParamIndex], auxParentInstruction, null, true, _originalLink);
            // TODO: this will not work for aux routes with parameters or multiple segments
            auxInstructions[auxInstruction.component.urlPath] = auxInstruction;
            linkParamIndex += 1;
        }
        var instruction = new instruction_1.ResolvedInstruction(componentInstruction, null, auxInstructions);
        // If the component is sync, we can generate resolved child route instructions
        // If not, we'll resolve the instructions at navigation time
        if (isPresent(componentInstruction) && isPresent(componentInstruction.componentType)) {
            var childInstruction = null;
            if (componentInstruction.terminal) {
                if (linkParamIndex >= linkParams.length) {
                }
            }
            else {
                var childAncestorComponents = ancestorInstructions.concat([instruction]);
                var remainingLinkParams = linkParams.slice(linkParamIndex);
                childInstruction = this._generate(remainingLinkParams, childAncestorComponents, null, false, _originalLink);
            }
            instruction.child = childInstruction;
        }
        return instruction;
    };
    RouteRegistry.prototype.hasRoute = function (name, parentComponent) {
        var componentRecognizer = this._rules.get(parentComponent);
        if (isBlank(componentRecognizer)) {
            return false;
        }
        return componentRecognizer.hasRoute(name);
    };
    RouteRegistry.prototype.generateDefault = function (componentCursor) {
        var _this = this;
        if (isBlank(componentCursor)) {
            return null;
        }
        var componentRecognizer = this._rules.get(componentCursor);
        if (isBlank(componentRecognizer) || isBlank(componentRecognizer.defaultRoute)) {
            return null;
        }
        var defaultChild = null;
        if (isPresent(componentRecognizer.defaultRoute.handler.componentType)) {
            var componentInstruction = componentRecognizer.defaultRoute.generate({});
            if (!componentRecognizer.defaultRoute.terminal) {
                defaultChild = this.generateDefault(componentRecognizer.defaultRoute.handler.componentType);
            }
            return new instruction_1.DefaultInstruction(componentInstruction, defaultChild);
        }
        return new instruction_1.UnresolvedInstruction(function () {
            return componentRecognizer.defaultRoute.handler.resolveComponentType().then(function (_) { return _this.generateDefault(componentCursor); });
        });
    };
    return RouteRegistry;
})();
exports.RouteRegistry = RouteRegistry;
/*
 * Given: ['/a/b', {c: 2}]
 * Returns: ['', 'a', 'b', {c: 2}]
 */
function splitAndFlattenLinkParams(linkParams) {
    return linkParams.reduce(function (accumulation, item) {
        if (isString(item)) {
            var strItem = item;
            return accumulation.concat(strItem.split('/'));
        }
        accumulation.push(item);
        return accumulation;
    }, []);
}
/*
 * Given a list of instructions, returns the most specific instruction
 */
function mostSpecific(instructions) {
    instructions = instructions.filter(function (instruction) { return isPresent(instruction); });
    if (instructions.length == 0) {
        return null;
    }
    if (instructions.length == 1) {
        return instructions[0];
    }
    var first = instructions[0];
    var rest = instructions.slice(1);
    return rest.reduce(function (instruction, contender) {
        if (compareSpecificityStrings(contender.specificity, instruction.specificity) == -1) {
            return contender;
        }
        return instruction;
    }, first);
}
/*
 * Expects strings to be in the form of "[0-2]+"
 * Returns -1 if string A should be sorted above string B, 1 if it should be sorted after,
 * or 0 if they are the same.
 */
function compareSpecificityStrings(a, b) {
    var l = Math.min(a.length, b.length);
    for (var i = 0; i < l; i += 1) {
        var ai = StringWrapper.charCodeAt(a, i);
        var bi = StringWrapper.charCodeAt(b, i);
        var difference = bi - ai;
        if (difference != 0) {
            return difference;
        }
    }
    return a.length - b.length;
}
function assertTerminalComponent(component, path) {
    if (!isType(component)) {
        return;
    }
    var annotations = reflector.annotations(component);
    if (isPresent(annotations)) {
        for (var i = 0; i < annotations.length; i++) {
            var annotation = annotations[i];
            if (annotation instanceof route_config_impl_1.RouteConfig) {
                throw new BaseException("Child routes are not allowed for \"" + path + "\". Use \"...\" on the parent's route path.");
            }
        }
    }
}
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var route_lifecycle_reflector_1 = require('./route_lifecycle_reflector');
var _resolveToTrue = PromiseWrapper.resolve(true);
var _resolveToFalse = PromiseWrapper.resolve(false);
/**
 * The `Router` is responsible for mapping URLs to components.
 *
 * You can see the state of the router by inspecting the read-only field `router.navigating`.
 * This may be useful for showing a spinner, for instance.
 *
 * ## Concepts
 *
 * Routers and component instances have a 1:1 correspondence.
 *
 * The router holds reference to a number of {@link RouterOutlet}.
 * An outlet is a placeholder that the router dynamically fills in depending on the current URL.
 *
 * When the router navigates from a URL, it must first recognize it and serialize it into an
 * `Instruction`.
 * The router uses the `RouteRegistry` to get an `Instruction`.
 */
var Router = (function () {
    function Router(registry, parent, hostComponent) {
        this.registry = registry;
        this.parent = parent;
        this.hostComponent = hostComponent;
        this.navigating = false;
        this._currentInstruction = null;
        this._currentNavigation = _resolveToTrue;
        this._outlet = null;
        this._auxRouters = new Map();
        this._subject = new EventEmitter();
    }
    /**
     * Constructs a child router. You probably don't need to use this unless you're writing a reusable
     * component.
     */
    Router.prototype.childRouter = function (hostComponent) {
        return this._childRouter = new ChildRouter(this, hostComponent);
    };
    /**
     * Constructs a child router. You probably don't need to use this unless you're writing a reusable
     * component.
     */
    Router.prototype.auxRouter = function (hostComponent) { return new ChildRouter(this, hostComponent); };
    /**
     * Register an outlet to be notified of primary route changes.
     *
     * You probably don't need to use this unless you're writing a reusable component.
     */
    Router.prototype.registerPrimaryOutlet = function (outlet) {
        if (isPresent(outlet.name)) {
            throw new BaseException("registerPrimaryOutlet expects to be called with an unnamed outlet.");
        }
        this._outlet = outlet;
        if (isPresent(this._currentInstruction)) {
            return this.commit(this._currentInstruction, false);
        }
        return _resolveToTrue;
    };
    /**
     * Register an outlet to notified of auxiliary route changes.
     *
     * You probably don't need to use this unless you're writing a reusable component.
     */
    Router.prototype.registerAuxOutlet = function (outlet) {
        var outletName = outlet.name;
        if (isBlank(outletName)) {
            throw new BaseException("registerAuxOutlet expects to be called with an outlet with a name.");
        }
        var router = this.auxRouter(this.hostComponent);
        this._auxRouters.set(outletName, router);
        router._outlet = outlet;
        var auxInstruction;
        if (isPresent(this._currentInstruction) &&
            isPresent(auxInstruction = this._currentInstruction.auxInstruction[outletName])) {
            return router.commit(auxInstruction);
        }
        return _resolveToTrue;
    };
    /**
     * Given an instruction, returns `true` if the instruction is currently active,
     * otherwise `false`.
     */
    Router.prototype.isRouteActive = function (instruction) {
        var router = this;
        while (isPresent(router.parent) && isPresent(instruction.child)) {
            router = router.parent;
            instruction = instruction.child;
        }
        return isPresent(this._currentInstruction) &&
            this._currentInstruction.component == instruction.component;
    };
    /**
     * Dynamically update the routing configuration and trigger a navigation.
     *
     * ### Usage
     *
     * ```
     * router.config([
     *   { 'path': '/', 'component': IndexComp },
     *   { 'path': '/user/:id', 'component': UserComp },
     * ]);
     * ```
     */
    Router.prototype.config = function (definitions) {
        var _this = this;
        definitions.forEach(function (routeDefinition) { _this.registry.config(_this.hostComponent, routeDefinition); });
        return this.renavigate();
    };
    /**
     * Navigate based on the provided Route Link DSL. It's preferred to navigate with this method
     * over `navigateByUrl`.
     *
     * ### Usage
     *
     * This method takes an array representing the Route Link DSL:
     * ```
     * ['./MyCmp', {param: 3}]
     * ```
     * See the {@link RouterLink} directive for more.
     */
    Router.prototype.navigate = function (linkParams) {
        var instruction = this.generate(linkParams);
        return this.navigateByInstruction(instruction, false);
    };
    /**
     * Navigate to a URL. Returns a promise that resolves when navigation is complete.
     * It's preferred to navigate with `navigate` instead of this method, since URLs are more brittle.
     *
     * If the given URL begins with a `/`, router will navigate absolutely.
     * If the given URL does not begin with `/`, the router will navigate relative to this component.
     */
    Router.prototype.navigateByUrl = function (url, _skipLocationChange) {
        var _this = this;
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        return this._currentNavigation = this._currentNavigation.then(function (_) {
            _this.lastNavigationAttempt = url;
            _this._startNavigating();
            return _this._afterPromiseFinishNavigating(_this.recognize(url).then(function (instruction) {
                if (isBlank(instruction)) {
                    return false;
                }
                return _this._navigate(instruction, _skipLocationChange);
            }));
        });
    };
    /**
     * Navigate via the provided instruction. Returns a promise that resolves when navigation is
     * complete.
     */
    Router.prototype.navigateByInstruction = function (instruction, _skipLocationChange) {
        var _this = this;
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        if (isBlank(instruction)) {
            return _resolveToFalse;
        }
        return this._currentNavigation = this._currentNavigation.then(function (_) {
            _this._startNavigating();
            return _this._afterPromiseFinishNavigating(_this._navigate(instruction, _skipLocationChange));
        });
    };
    /** @internal */
    Router.prototype._navigate = function (instruction, _skipLocationChange) {
        var _this = this;
        return this._settleInstruction(instruction)
            .then(function (_) { return _this._routerCanReuse(instruction); })
            .then(function (_) { return _this._canActivate(instruction); })
            .then(function (result) {
            if (!result) {
                return false;
            }
            return _this._routerCanDeactivate(instruction)
                .then(function (result) {
                if (result) {
                    return _this.commit(instruction, _skipLocationChange)
                        .then(function (_) {
                        _this._emitNavigationFinish(instruction.toRootUrl());
                        return true;
                    });
                }
            });
        });
    };
    /** @internal */
    Router.prototype._settleInstruction = function (instruction) {
        var _this = this;
        return instruction.resolveComponent().then(function (_) {
            var unsettledInstructions = [];
            if (isPresent(instruction.component)) {
                instruction.component.reuse = false;
            }
            if (isPresent(instruction.child)) {
                unsettledInstructions.push(_this._settleInstruction(instruction.child));
            }
            StringMapWrapper.forEach(instruction.auxInstruction, function (instruction, _) {
                unsettledInstructions.push(_this._settleInstruction(instruction));
            });
            return PromiseWrapper.all(unsettledInstructions);
        });
    };
    Router.prototype._emitNavigationFinish = function (url) { ObservableWrapper.callEmit(this._subject, url); };
    Router.prototype._afterPromiseFinishNavigating = function (promise) {
        var _this = this;
        return PromiseWrapper.catchError(promise.then(function (_) { return _this._finishNavigating(); }), function (err) {
            _this._finishNavigating();
            throw err;
        });
    };
    /*
     * Recursively set reuse flags
     */
    /** @internal */
    Router.prototype._routerCanReuse = function (instruction) {
        var _this = this;
        if (isBlank(this._outlet)) {
            return _resolveToFalse;
        }
        if (isBlank(instruction.component)) {
            return _resolveToTrue;
        }
        return this._outlet.routerCanReuse(instruction.component)
            .then(function (result) {
            instruction.component.reuse = result;
            if (result && isPresent(_this._childRouter) && isPresent(instruction.child)) {
                return _this._childRouter._routerCanReuse(instruction.child);
            }
        });
    };
    Router.prototype._canActivate = function (nextInstruction) {
        return canActivateOne(nextInstruction, this._currentInstruction);
    };
    Router.prototype._routerCanDeactivate = function (instruction) {
        var _this = this;
        if (isBlank(this._outlet)) {
            return _resolveToTrue;
        }
        var next;
        var childInstruction = null;
        var reuse = false;
        var componentInstruction = null;
        if (isPresent(instruction)) {
            childInstruction = instruction.child;
            componentInstruction = instruction.component;
            reuse = isBlank(instruction.component) || instruction.component.reuse;
        }
        if (reuse) {
            next = _resolveToTrue;
        }
        else {
            next = this._outlet.routerCanDeactivate(componentInstruction);
        }
        // TODO: aux route lifecycle hooks
        return next.then(function (result) {
            if (result == false) {
                return false;
            }
            if (isPresent(_this._childRouter)) {
                return _this._childRouter._routerCanDeactivate(childInstruction);
            }
            return true;
        });
    };
    /**
     * Updates this router and all descendant routers according to the given instruction
     */
    Router.prototype.commit = function (instruction, _skipLocationChange) {
        var _this = this;
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        this._currentInstruction = instruction;
        var next = _resolveToTrue;
        if (isPresent(this._outlet) && isPresent(instruction.component)) {
            var componentInstruction = instruction.component;
            if (componentInstruction.reuse) {
                next = this._outlet.reuse(componentInstruction);
            }
            else {
                next =
                    this.deactivate(instruction).then(function (_) { return _this._outlet.activate(componentInstruction); });
            }
            if (isPresent(instruction.child)) {
                next = next.then(function (_) {
                    if (isPresent(_this._childRouter)) {
                        return _this._childRouter.commit(instruction.child);
                    }
                });
            }
        }
        var promises = [];
        this._auxRouters.forEach(function (router, name) {
            if (isPresent(instruction.auxInstruction[name])) {
                promises.push(router.commit(instruction.auxInstruction[name]));
            }
        });
        return next.then(function (_) { return PromiseWrapper.all(promises); });
    };
    /** @internal */
    Router.prototype._startNavigating = function () { this.navigating = true; };
    /** @internal */
    Router.prototype._finishNavigating = function () { this.navigating = false; };
    /**
     * Subscribe to URL updates from the router
     */
    Router.prototype.subscribe = function (onNext) {
        return ObservableWrapper.subscribe(this._subject, onNext);
    };
    /**
     * Removes the contents of this router's outlet and all descendant outlets
     */
    Router.prototype.deactivate = function (instruction) {
        var _this = this;
        var childInstruction = null;
        var componentInstruction = null;
        if (isPresent(instruction)) {
            childInstruction = instruction.child;
            componentInstruction = instruction.component;
        }
        var next = _resolveToTrue;
        if (isPresent(this._childRouter)) {
            next = this._childRouter.deactivate(childInstruction);
        }
        if (isPresent(this._outlet)) {
            next = next.then(function (_) { return _this._outlet.deactivate(componentInstruction); });
        }
        // TODO: handle aux routes
        return next;
    };
    /**
     * Given a URL, returns an instruction representing the component graph
     */
    Router.prototype.recognize = function (url) {
        var ancestorComponents = this._getAncestorInstructions();
        return this.registry.recognize(url, ancestorComponents);
    };
    Router.prototype._getAncestorInstructions = function () {
        var ancestorInstructions = [this._currentInstruction];
        var ancestorRouter = this;
        while (isPresent(ancestorRouter = ancestorRouter.parent)) {
            ancestorInstructions.unshift(ancestorRouter._currentInstruction);
        }
        return ancestorInstructions;
    };
    /**
     * Navigates to either the last URL successfully navigated to, or the last URL requested if the
     * router has yet to successfully navigate.
     */
    Router.prototype.renavigate = function () {
        if (isBlank(this.lastNavigationAttempt)) {
            return this._currentNavigation;
        }
        return this.navigateByUrl(this.lastNavigationAttempt);
    };
    /**
     * Generate an `Instruction` based on the provided Route Link DSL.
     */
    Router.prototype.generate = function (linkParams) {
        var ancestorInstructions = this._getAncestorInstructions();
        return this.registry.generate(linkParams, ancestorInstructions);
    };
    return Router;
})();
exports.Router = Router;
var RootRouter = (function (_super) {
    __extends(RootRouter, _super);
    function RootRouter(registry, location, primaryComponent) {
        var _this = this;
        _super.call(this, registry, null, primaryComponent);
        this._location = location;
        this._locationSub = this._location.subscribe(function (change) {
            // we call recognize ourselves
            _this.recognize(change['url'])
                .then(function (instruction) {
                _this.navigateByInstruction(instruction, isPresent(change['pop']))
                    .then(function (_) {
                    // this is a popstate event; no need to change the URL
                    if (isPresent(change['pop']) && change['type'] != 'hashchange') {
                        return;
                    }
                    var emitPath = instruction.toUrlPath();
                    var emitQuery = instruction.toUrlQuery();
                    if (emitPath.length > 0) {
                        emitPath = '/' + emitPath;
                    }
                    // Because we've opted to use All hashchange events occur outside Angular.
                    // However, apps that are migrating might have hash links that operate outside
                    // angular to which routing must respond.
                    // To support these cases where we respond to hashchanges and redirect as a
                    // result, we need to replace the top item on the stack.
                    if (change['type'] == 'hashchange') {
                        if (instruction.toRootUrl() != _this._location.path()) {
                            _this._location.replaceState(emitPath, emitQuery);
                        }
                    }
                    else {
                        _this._location.go(emitPath, emitQuery);
                    }
                });
            });
        });
        this.registry.configFromComponent(primaryComponent);
        this.navigateByUrl(location.path());
    }
    RootRouter.prototype.commit = function (instruction, _skipLocationChange) {
        var _this = this;
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        var emitPath = instruction.toUrlPath();
        var emitQuery = instruction.toUrlQuery();
        if (emitPath.length > 0) {
            emitPath = '/' + emitPath;
        }
        var promise = _super.prototype.commit.call(this, instruction);
        if (!_skipLocationChange) {
            promise = promise.then(function (_) { _this._location.go(emitPath, emitQuery); });
        }
        return promise;
    };
    RootRouter.prototype.dispose = function () {
        if (isPresent(this._locationSub)) {
            ObservableWrapper.dispose(this._locationSub);
            this._locationSub = null;
        }
    };
    return RootRouter;
})(Router);
exports.RootRouter = RootRouter;
var ChildRouter = (function (_super) {
    __extends(ChildRouter, _super);
    function ChildRouter(parent, hostComponent) {
        _super.call(this, parent.registry, parent, hostComponent);
        this.parent = parent;
    }
    ChildRouter.prototype.navigateByUrl = function (url, _skipLocationChange) {
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        // Delegate navigation to the root router
        return this.parent.navigateByUrl(url, _skipLocationChange);
    };
    ChildRouter.prototype.navigateByInstruction = function (instruction, _skipLocationChange) {
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        // Delegate navigation to the root router
        return this.parent.navigateByInstruction(instruction, _skipLocationChange);
    };
    return ChildRouter;
})(Router);
function canActivateOne(nextInstruction, prevInstruction) {
    var next = _resolveToTrue;
    if (isBlank(nextInstruction.component)) {
        return next;
    }
    if (isPresent(nextInstruction.child)) {
        next = canActivateOne(nextInstruction.child, isPresent(prevInstruction) ? prevInstruction.child : null);
    }
    return next.then(function (result) {
        if (result == false) {
            return false;
        }
        if (nextInstruction.component.reuse) {
            return true;
        }
        var hook = route_lifecycle_reflector_1.getCanActivateHook(nextInstruction.component.componentType);
        if (isPresent(hook)) {
            return hook(nextInstruction.component, isPresent(prevInstruction) ? prevInstruction.component : null);
        }
        return true;
    });
}


  //TODO: this is a hack to replace the exiting implementation at run-time
  exports.getCanActivateHook = function (directiveName) {
    var factory = $$directiveIntrospector.getTypeByName(directiveName);
    return factory && factory.$canActivate && function (next, prev) {
      return $injector.invoke(factory.$canActivate, null, {
        $nextInstruction: next,
        $prevInstruction: prev
      });
    };
  };

  // This hack removes assertions about the type of the "component"
  // property in a route config
  exports.assertComponentExists = function () {};

  angular.stringifyInstruction = function (instruction) {
    return instruction.toRootUrl();
  };

  var RouteRegistry = exports.RouteRegistry;
  var RootRouter = exports.RootRouter;

  var registry = new RouteRegistry($routerRootComponent);
  var location = new Location();

  $$directiveIntrospector(function (name, factory) {
    if (angular.isArray(factory.$routeConfig)) {
      factory.$routeConfig.forEach(function (config) {
        registry.config(name, config);
      });
    }
  });

  var router = new RootRouter(registry, location, $routerRootComponent);
  $rootScope.$watch(function () { return $location.path(); }, function (path) {
    if (router.lastNavigationAttempt !== path) {
      router.navigateByUrl(path);
    }
  });

  router.subscribe(function () {
    $rootScope.$broadcast('$routeChangeSuccess', {});
  });

  return router;
}

}());

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFuZ3VsYXJfMV9yb3V0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImRlcGVuZGVuY2llcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe1xuLy8vPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwaW5ncy9hbmd1bGFyanMvYW5ndWxhci5kLnRzXCIvPlxuLypcbiAqIGRlY29yYXRlcyAkY29tcGlsZVByb3ZpZGVyIHNvIHRoYXQgd2UgaGF2ZSBhY2Nlc3MgdG8gcm91dGluZyBtZXRhZGF0YVxuICovXG5mdW5jdGlvbiBjb21waWxlclByb3ZpZGVyRGVjb3JhdG9yKCRjb21waWxlUHJvdmlkZXIsICQkZGlyZWN0aXZlSW50cm9zcGVjdG9yUHJvdmlkZXIpIHtcbiAgICB2YXIgZGlyZWN0aXZlID0gJGNvbXBpbGVQcm92aWRlci5kaXJlY3RpdmU7XG4gICAgJGNvbXBpbGVQcm92aWRlci5kaXJlY3RpdmUgPSBmdW5jdGlvbiAobmFtZSwgZmFjdG9yeSkge1xuICAgICAgICAkJGRpcmVjdGl2ZUludHJvc3BlY3RvclByb3ZpZGVyLnJlZ2lzdGVyKG5hbWUsIGZhY3RvcnkpO1xuICAgICAgICByZXR1cm4gZGlyZWN0aXZlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbn1cbi8qXG4gKiBwcml2YXRlIHNlcnZpY2UgdGhhdCBob2xkcyByb3V0ZSBtYXBwaW5ncyBmb3IgZWFjaCBjb250cm9sbGVyXG4gKi9cbnZhciBEaXJlY3RpdmVJbnRyb3NwZWN0b3JQcm92aWRlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRGlyZWN0aXZlSW50cm9zcGVjdG9yUHJvdmlkZXIoKSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aXZlQnVmZmVyID0gW107XG4gICAgICAgIHRoaXMuZGlyZWN0aXZlRmFjdG9yaWVzQnlOYW1lID0ge307XG4gICAgICAgIHRoaXMub25EaXJlY3RpdmVSZWdpc3RlcmVkID0gbnVsbDtcbiAgICB9XG4gICAgRGlyZWN0aXZlSW50cm9zcGVjdG9yUHJvdmlkZXIucHJvdG90eXBlLnJlZ2lzdGVyID0gZnVuY3Rpb24gKG5hbWUsIGZhY3RvcnkpIHtcbiAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShmYWN0b3J5KSkge1xuICAgICAgICAgICAgZmFjdG9yeSA9IGZhY3RvcnlbZmFjdG9yeS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRpcmVjdGl2ZUZhY3Rvcmllc0J5TmFtZVtuYW1lXSA9IGZhY3Rvcnk7XG4gICAgICAgIGlmICh0aGlzLm9uRGlyZWN0aXZlUmVnaXN0ZXJlZCkge1xuICAgICAgICAgICAgdGhpcy5vbkRpcmVjdGl2ZVJlZ2lzdGVyZWQobmFtZSwgZmFjdG9yeSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZUJ1ZmZlci5wdXNoKHsgbmFtZTogbmFtZSwgZmFjdG9yeTogZmFjdG9yeSB9KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgRGlyZWN0aXZlSW50cm9zcGVjdG9yUHJvdmlkZXIucHJvdG90eXBlLiRnZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHZhciBmbiA9IGZ1bmN0aW9uIChuZXdPbkNvbnRyb2xsZXJSZWdpc3RlcmVkKSB7XG4gICAgICAgICAgICBfdGhpcy5vbkRpcmVjdGl2ZVJlZ2lzdGVyZWQgPSBuZXdPbkNvbnRyb2xsZXJSZWdpc3RlcmVkO1xuICAgICAgICAgICAgd2hpbGUgKF90aGlzLmRpcmVjdGl2ZUJ1ZmZlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRpcmVjdGl2ZSA9IF90aGlzLmRpcmVjdGl2ZUJ1ZmZlci5wb3AoKTtcbiAgICAgICAgICAgICAgICBfdGhpcy5vbkRpcmVjdGl2ZVJlZ2lzdGVyZWQoZGlyZWN0aXZlLm5hbWUsIGRpcmVjdGl2ZS5mYWN0b3J5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgZm4uZ2V0VHlwZUJ5TmFtZSA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBfdGhpcy5kaXJlY3RpdmVGYWN0b3JpZXNCeU5hbWVbbmFtZV07IH07XG4gICAgICAgIHJldHVybiBmbjtcbiAgICB9O1xuICAgIHJldHVybiBEaXJlY3RpdmVJbnRyb3NwZWN0b3JQcm92aWRlcjtcbn0pKCk7XG4vKipcbiAqIEBuYW1lIG5nT3V0bGV0XG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBBbiBuZ091dGxldCBpcyB3aGVyZSByZXNvbHZlZCBjb250ZW50IGdvZXMuXG4gKlxuICogIyMgVXNlXG4gKlxuICogYGBgaHRtbFxuICogPGRpdiBuZy1vdXRsZXQ9XCJuYW1lXCI+PC9kaXY+XG4gKiBgYGBcbiAqXG4gKiBUaGUgdmFsdWUgZm9yIHRoZSBgbmdPdXRsZXRgIGF0dHJpYnV0ZSBpcyBvcHRpb25hbC5cbiAqL1xuZnVuY3Rpb24gbmdPdXRsZXREaXJlY3RpdmUoJGFuaW1hdGUsICRxLCAkcm91dGVyKSB7XG4gICAgdmFyIHJvb3RSb3V0ZXIgPSAkcm91dGVyO1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnQUUnLFxuICAgICAgICB0cmFuc2NsdWRlOiAnZWxlbWVudCcsXG4gICAgICAgIHRlcm1pbmFsOiB0cnVlLFxuICAgICAgICBwcmlvcml0eTogNDAwLFxuICAgICAgICByZXF1aXJlOiBbJz9eXm5nT3V0bGV0JywgJ25nT3V0bGV0J10sXG4gICAgICAgIGxpbms6IG91dGxldExpbmssXG4gICAgICAgIGNvbnRyb2xsZXI6IChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmdW5jdGlvbiBjbGFzc18xKCkge1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNsYXNzXzE7XG4gICAgICAgIH0pKCksXG4gICAgICAgIGNvbnRyb2xsZXJBczogJyQkbmdPdXRsZXQnXG4gICAgfTtcbiAgICBmdW5jdGlvbiBvdXRsZXRMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RybHMsICR0cmFuc2NsdWRlKSB7XG4gICAgICAgIHZhciBPdXRsZXQgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZnVuY3Rpb24gT3V0bGV0KGNvbnRyb2xsZXIsIHJvdXRlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuY29udHJvbGxlciA9IGNvbnRyb2xsZXI7XG4gICAgICAgICAgICAgICAgdGhpcy5yb3V0ZXIgPSByb3V0ZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBPdXRsZXQucHJvdG90eXBlLmNsZWFudXBMYXN0VmlldyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnByZXZpb3VzTGVhdmVBbmltYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJGFuaW1hdGUuY2FuY2VsKHRoaXMucHJldmlvdXNMZWF2ZUFuaW1hdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJldmlvdXNMZWF2ZUFuaW1hdGlvbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRTY29wZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTY29wZS4kZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTY29wZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJldmlvdXNMZWF2ZUFuaW1hdGlvbiA9ICRhbmltYXRlLmxlYXZlKHRoaXMuY3VycmVudEVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnByZXZpb3VzTGVhdmVBbmltYXRpb24udGhlbihmdW5jdGlvbiAoKSB7IHJldHVybiBfdGhpcy5wcmV2aW91c0xlYXZlQW5pbWF0aW9uID0gbnVsbDsgfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEVsZW1lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBPdXRsZXQucHJvdG90eXBlLnJldXNlID0gZnVuY3Rpb24gKGluc3RydWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5leHQgPSAkcS53aGVuKHRydWUpO1xuICAgICAgICAgICAgICAgIHZhciBwcmV2aW91c0luc3RydWN0aW9uID0gdGhpcy5jdXJyZW50SW5zdHJ1Y3Rpb247XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50SW5zdHJ1Y3Rpb24gPSBpbnN0cnVjdGlvbjtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50Q29udHJvbGxlciAmJiB0aGlzLmN1cnJlbnRDb250cm9sbGVyLiRyb3V0ZXJPblJldXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHQgPSAkcS53aGVuKHRoaXMuY3VycmVudENvbnRyb2xsZXIuJHJvdXRlck9uUmV1c2UodGhpcy5jdXJyZW50SW5zdHJ1Y3Rpb24sIHByZXZpb3VzSW5zdHJ1Y3Rpb24pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5leHQ7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgT3V0bGV0LnByb3RvdHlwZS5yb3V0ZXJDYW5SZXVzZSA9IGZ1bmN0aW9uIChuZXh0SW5zdHJ1Y3Rpb24pIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5jdXJyZW50SW5zdHJ1Y3Rpb24gfHxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50SW5zdHJ1Y3Rpb24uY29tcG9uZW50VHlwZSAhPT0gbmV4dEluc3RydWN0aW9uLmNvbXBvbmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuY3VycmVudENvbnRyb2xsZXIgJiYgdGhpcy5jdXJyZW50Q29udHJvbGxlci4kcm91dGVyQ2FuUmV1c2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5jdXJyZW50Q29udHJvbGxlci4kcm91dGVyQ2FuUmV1c2UobmV4dEluc3RydWN0aW9uLCB0aGlzLmN1cnJlbnRJbnN0cnVjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBuZXh0SW5zdHJ1Y3Rpb24gPT09IHRoaXMuY3VycmVudEluc3RydWN0aW9uIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmVxdWFscyhuZXh0SW5zdHJ1Y3Rpb24ucGFyYW1zLCB0aGlzLmN1cnJlbnRJbnN0cnVjdGlvbi5wYXJhbXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihyZXN1bHQpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIE91dGxldC5wcm90b3R5cGUucm91dGVyQ2FuRGVhY3RpdmF0ZSA9IGZ1bmN0aW9uIChpbnN0cnVjdGlvbikge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRDb250cm9sbGVyICYmIHRoaXMuY3VycmVudENvbnRyb2xsZXIuJHJvdXRlckNhbkRlYWN0aXZhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4odGhpcy5jdXJyZW50Q29udHJvbGxlci4kcm91dGVyQ2FuRGVhY3RpdmF0ZShpbnN0cnVjdGlvbiwgdGhpcy5jdXJyZW50SW5zdHJ1Y3Rpb24pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4odHJ1ZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgT3V0bGV0LnByb3RvdHlwZS5kZWFjdGl2YXRlID0gZnVuY3Rpb24gKGluc3RydWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudENvbnRyb2xsZXIgJiYgdGhpcy5jdXJyZW50Q29udHJvbGxlci4kcm91dGVyT25EZWFjdGl2YXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKHRoaXMuY3VycmVudENvbnRyb2xsZXIuJHJvdXRlck9uRGVhY3RpdmF0ZShpbnN0cnVjdGlvbiwgdGhpcy5jdXJyZW50SW5zdHJ1Y3Rpb24pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBPdXRsZXQucHJvdG90eXBlLmFjdGl2YXRlID0gZnVuY3Rpb24gKGluc3RydWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgICAgICAgICB2YXIgcHJldmlvdXNJbnN0cnVjdGlvbiA9IHRoaXMuY3VycmVudEluc3RydWN0aW9uO1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEluc3RydWN0aW9uID0gaW5zdHJ1Y3Rpb247XG4gICAgICAgICAgICAgICAgdmFyIGNvbXBvbmVudE5hbWUgPSB0aGlzLmNvbnRyb2xsZXIuJCRjb21wb25lbnROYW1lID0gaW5zdHJ1Y3Rpb24uY29tcG9uZW50VHlwZTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbXBvbmVudE5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29tcG9uZW50IGlzIG5vdCBhIHN0cmluZyBmb3IgJyArIGluc3RydWN0aW9uLnVybFBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRyb2xsZXIuJCRyb3V0ZVBhcmFtcyA9IGluc3RydWN0aW9uLnBhcmFtcztcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRyb2xsZXIuJCR0ZW1wbGF0ZSA9ICc8ZGl2ICcgKyBkYXNoQ2FzZShjb21wb25lbnROYW1lKSArICc+PC9kaXY+JztcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRyb2xsZXIuJCRyb3V0ZXIgPSB0aGlzLnJvdXRlci5jaGlsZFJvdXRlcihpbnN0cnVjdGlvbi5jb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgICAgICB2YXIgbmV3U2NvcGUgPSBzY29wZS4kbmV3KCk7XG4gICAgICAgICAgICAgICAgdmFyIGNsb25lID0gJHRyYW5zY2x1ZGUobmV3U2NvcGUsIGZ1bmN0aW9uIChjbG9uZSkge1xuICAgICAgICAgICAgICAgICAgICAkYW5pbWF0ZS5lbnRlcihjbG9uZSwgbnVsbCwgX3RoaXMuY3VycmVudEVsZW1lbnQgfHwgZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLmNsZWFudXBMYXN0VmlldygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEVsZW1lbnQgPSBjbG9uZTtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTY29wZSA9IG5ld1Njb3BlO1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IHByZWZlciB0aGUgb3RoZXIgZGlyZWN0aXZlIHJldHJpZXZpbmcgdGhlIGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICAvLyBieSBkZWJ1ZyBtb2RlXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29udHJvbGxlciA9IHRoaXMuY3VycmVudEVsZW1lbnQuY2hpbGRyZW4oKS5lcSgwKS5jb250cm9sbGVyKGNvbXBvbmVudE5hbWUpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRDb250cm9sbGVyICYmIHRoaXMuY3VycmVudENvbnRyb2xsZXIuJHJvdXRlck9uQWN0aXZhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3VycmVudENvbnRyb2xsZXIuJHJvdXRlck9uQWN0aXZhdGUoaW5zdHJ1Y3Rpb24sIHByZXZpb3VzSW5zdHJ1Y3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbigpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBPdXRsZXQ7XG4gICAgICAgIH0pKCk7XG4gICAgICAgIHZhciBwYXJlbnRDdHJsID0gY3RybHNbMF0sIG15Q3RybCA9IGN0cmxzWzFdLCByb3V0ZXIgPSAocGFyZW50Q3RybCAmJiBwYXJlbnRDdHJsLiQkcm91dGVyKSB8fCByb290Um91dGVyO1xuICAgICAgICBteUN0cmwuJCRjdXJyZW50Q29tcG9uZW50ID0gbnVsbDtcbiAgICAgICAgcm91dGVyLnJlZ2lzdGVyUHJpbWFyeU91dGxldChuZXcgT3V0bGV0KG15Q3RybCwgcm91dGVyKSk7XG4gICAgfVxufVxuLyoqXG4gKiBUaGlzIGRpcmVjdGl2ZSBpcyByZXNwb25zaWJsZSBmb3IgY29tcGlsaW5nIHRoZSBjb250ZW50cyBvZiBuZy1vdXRsZXRcbiAqL1xuZnVuY3Rpb24gbmdPdXRsZXRGaWxsQ29udGVudERpcmVjdGl2ZSgkY29tcGlsZSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRUEnLFxuICAgICAgICBwcmlvcml0eTogLTQwMCxcbiAgICAgICAgcmVxdWlyZTogJ25nT3V0bGV0JyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RybCkge1xuICAgICAgICAgICAgdmFyIHRlbXBsYXRlID0gY3RybC4kJHRlbXBsYXRlO1xuICAgICAgICAgICAgZWxlbWVudC5odG1sKHRlbXBsYXRlKTtcbiAgICAgICAgICAgIHZhciBsaW5rID0gJGNvbXBpbGUoZWxlbWVudC5jb250ZW50cygpKTtcbiAgICAgICAgICAgIGxpbmsoc2NvcGUpO1xuICAgICAgICAgICAgLy8gVE9ETzogbW92ZSB0byBwcmltYXJ5IGRpcmVjdGl2ZVxuICAgICAgICAgICAgdmFyIGNvbXBvbmVudEluc3RhbmNlID0gc2NvcGVbY3RybC4kJGNvbXBvbmVudE5hbWVdO1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudEluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgY3RybC4kJGN1cnJlbnRDb21wb25lbnQgPSBjb21wb25lbnRJbnN0YW5jZTtcbiAgICAgICAgICAgICAgICBjb21wb25lbnRJbnN0YW5jZS4kcm91dGVyID0gY3RybC4kJHJvdXRlcjtcbiAgICAgICAgICAgICAgICBjb21wb25lbnRJbnN0YW5jZS4kcm91dGVQYXJhbXMgPSBjdHJsLiQkcm91dGVQYXJhbXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuLyoqXG4gKiBAbmFtZSBuZ0xpbmtcbiAqIEBkZXNjcmlwdGlvblxuICogTGV0cyB5b3UgbGluayB0byBkaWZmZXJlbnQgcGFydHMgb2YgdGhlIGFwcCwgYW5kIGF1dG9tYXRpY2FsbHkgZ2VuZXJhdGVzIGhyZWZzLlxuICpcbiAqICMjIFVzZVxuICogVGhlIGRpcmVjdGl2ZSB1c2VzIGEgc2ltcGxlIHN5bnRheDogYG5nLWxpbms9XCJjb21wb25lbnROYW1lKHsgcGFyYW06IHBhcmFtVmFsdWUgfSlcImBcbiAqXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYGpzXG4gKiBhbmd1bGFyLm1vZHVsZSgnbXlBcHAnLCBbJ25nQ29tcG9uZW50Um91dGVyJ10pXG4gKiAgIC5jb250cm9sbGVyKCdBcHBDb250cm9sbGVyJywgWyckcm91dGVyJywgZnVuY3Rpb24oJHJvdXRlcikge1xuICogICAgICRyb3V0ZXIuY29uZmlnKHsgcGF0aDogJy91c2VyLzppZCcsIGNvbXBvbmVudDogJ3VzZXInIH0pO1xuICogICAgIHRoaXMudXNlciA9IHsgbmFtZTogJ0JyaWFuJywgaWQ6IDEyMyB9O1xuICogICB9KTtcbiAqIGBgYFxuICpcbiAqIGBgYGh0bWxcbiAqIDxkaXYgbmctY29udHJvbGxlcj1cIkFwcENvbnRyb2xsZXIgYXMgYXBwXCI+XG4gKiAgIDxhIG5nLWxpbms9XCJ1c2VyKHtpZDogYXBwLnVzZXIuaWR9KVwiPnt7YXBwLnVzZXIubmFtZX19PC9hPlxuICogPC9kaXY+XG4gKiBgYGBcbiAqL1xuZnVuY3Rpb24gbmdMaW5rRGlyZWN0aXZlKCRyb3V0ZXIsICRwYXJzZSkge1xuICAgIHZhciByb290Um91dGVyID0gJHJvdXRlcjtcbiAgICByZXR1cm4geyByZXF1aXJlOiAnP15ebmdPdXRsZXQnLCByZXN0cmljdDogJ0EnLCBsaW5rOiBuZ0xpbmtEaXJlY3RpdmVMaW5rRm4gfTtcbiAgICBmdW5jdGlvbiBuZ0xpbmtEaXJlY3RpdmVMaW5rRm4oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XG4gICAgICAgIHZhciByb3V0ZXIgPSAoY3RybCAmJiBjdHJsLiQkcm91dGVyKSB8fCByb290Um91dGVyO1xuICAgICAgICBpZiAoIXJvdXRlcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpbnN0cnVjdGlvbiA9IG51bGw7XG4gICAgICAgIHZhciBsaW5rID0gYXR0cnMubmdMaW5rIHx8ICcnO1xuICAgICAgICBmdW5jdGlvbiBnZXRMaW5rKHBhcmFtcykge1xuICAgICAgICAgICAgaW5zdHJ1Y3Rpb24gPSByb3V0ZXIuZ2VuZXJhdGUocGFyYW1zKTtcbiAgICAgICAgICAgIHJldHVybiAnLi8nICsgYW5ndWxhci5zdHJpbmdpZnlJbnN0cnVjdGlvbihpbnN0cnVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJvdXRlUGFyYW1zR2V0dGVyID0gJHBhcnNlKGxpbmspO1xuICAgICAgICAvLyB3ZSBjYW4gYXZvaWQgYWRkaW5nIGEgd2F0Y2hlciBpZiBpdCdzIGEgbGl0ZXJhbFxuICAgICAgICBpZiAocm91dGVQYXJhbXNHZXR0ZXIuY29uc3RhbnQpIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSByb3V0ZVBhcmFtc0dldHRlcigpO1xuICAgICAgICAgICAgZWxlbWVudC5hdHRyKCdocmVmJywgZ2V0TGluayhwYXJhbXMpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNjb3BlLiR3YXRjaChmdW5jdGlvbiAoKSB7IHJldHVybiByb3V0ZVBhcmFtc0dldHRlcihzY29wZSk7IH0sIGZ1bmN0aW9uIChwYXJhbXMpIHsgcmV0dXJuIGVsZW1lbnQuYXR0cignaHJlZicsIGdldExpbmsocGFyYW1zKSk7IH0sIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQud2hpY2ggIT09IDEgfHwgIWluc3RydWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHJvdXRlci5uYXZpZ2F0ZUJ5SW5zdHJ1Y3Rpb24oaW5zdHJ1Y3Rpb24pO1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZnVuY3Rpb24gZGFzaENhc2Uoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9bQS1aXS9nLCBmdW5jdGlvbiAobWF0Y2gpIHsgcmV0dXJuICctJyArIG1hdGNoLnRvTG93ZXJDYXNlKCk7IH0pO1xufVxuLypcbiAqIEEgbW9kdWxlIGZvciBhZGRpbmcgbmV3IGEgcm91dGluZyBzeXN0ZW0gQW5ndWxhciAxLlxuICovXG5hbmd1bGFyLm1vZHVsZSgnbmdDb21wb25lbnRSb3V0ZXInLCBbXSlcbiAgICAuZGlyZWN0aXZlKCduZ091dGxldCcsIG5nT3V0bGV0RGlyZWN0aXZlKVxuICAgIC5kaXJlY3RpdmUoJ25nT3V0bGV0JywgbmdPdXRsZXRGaWxsQ29udGVudERpcmVjdGl2ZSlcbiAgICAuZGlyZWN0aXZlKCduZ0xpbmsnLCBuZ0xpbmtEaXJlY3RpdmUpO1xuLypcbiAqIEEgbW9kdWxlIGZvciBpbnNwZWN0aW5nIGNvbnRyb2xsZXIgY29uc3RydWN0b3JzXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCduZycpXG4gICAgLnByb3ZpZGVyKCckJGRpcmVjdGl2ZUludHJvc3BlY3RvcicsIERpcmVjdGl2ZUludHJvc3BlY3RvclByb3ZpZGVyKVxuICAgIC5jb25maWcoY29tcGlsZXJQcm92aWRlckRlY29yYXRvcik7XG5cbmFuZ3VsYXIubW9kdWxlKCduZ0NvbXBvbmVudFJvdXRlcicpLlxuICAgIHZhbHVlKCckcm91dGUnLCBudWxsKS4gLy8gY2FuIGJlIG92ZXJsb2FkZWQgd2l0aCBuZ1JvdXRlU2hpbVxuICAgIC8vIEJlY2F1c2UgQW5ndWxhciAxIGhhcyBubyBub3Rpb24gb2YgYSByb290IGNvbXBvbmVudCwgd2UgdXNlIGFuIG9iamVjdCB3aXRoIHVuaXF1ZSBpZGVudGl0eVxuICAgIC8vIHRvIHJlcHJlc2VudCB0aGlzLiBDYW4gYmUgb3ZlcmxvYWRlZCB3aXRoIGEgY29tcG9uZW50IG5hbWVcbiAgICB2YWx1ZSgnJHJvdXRlclJvb3RDb21wb25lbnQnLCBuZXcgT2JqZWN0KCkpLlxuICAgIGZhY3RvcnkoJyRyb3V0ZXInLCBbJyRxJywgJyRsb2NhdGlvbicsICckJGRpcmVjdGl2ZUludHJvc3BlY3RvcicsICckYnJvd3NlcicsICckcm9vdFNjb3BlJywgJyRpbmplY3RvcicsICckcm91dGVyUm9vdENvbXBvbmVudCcsIHJvdXRlckZhY3RvcnldKTtcblxuZnVuY3Rpb24gcm91dGVyRmFjdG9yeSgkcSwgJGxvY2F0aW9uLCAkJGRpcmVjdGl2ZUludHJvc3BlY3RvciwgJGJyb3dzZXIsICRyb290U2NvcGUsICRpbmplY3RvciwgJHJvdXRlclJvb3RDb21wb25lbnQpIHtcblxuICAvLyBXaGVuIHRoaXMgZmlsZSBpcyBwcm9jZXNzZWQsIHRoZSBsaW5lIGJlbG93IGlzIHJlcGxhY2VkIHdpdGhcbiAgLy8gdGhlIGNvbnRlbnRzIG9mIGAuLi9saWIvZmFjYWRlcy5lczVgLlxuICBmdW5jdGlvbiBDT05TVCgpIHtcbiAgcmV0dXJuIChmdW5jdGlvbih0YXJnZXQpIHtcbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gQ09OU1RfRVhQUihleHByKSB7XG4gIHJldHVybiBleHByO1xufVxuXG5mdW5jdGlvbiBpc1ByZXNlbnQgKHgpIHtcbiAgcmV0dXJuICEheDtcbn1cblxuZnVuY3Rpb24gaXNCbGFuayAoeCkge1xuICByZXR1cm4gIXg7XG59XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKG9iaikge1xuICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ3N0cmluZyc7XG59XG5cbmZ1bmN0aW9uIGlzVHlwZSAoeCkge1xuICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzU3RyaW5nTWFwKG9iaikge1xuICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgb2JqICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5KG9iaikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShvYmopO1xufVxuXG5mdW5jdGlvbiBnZXRUeXBlTmFtZUZvckRlYnVnZ2luZyAoZm4pIHtcbiAgcmV0dXJuIGZuLm5hbWUgfHwgJ1Jvb3QnO1xufVxuXG52YXIgUHJvbWlzZVdyYXBwZXIgPSB7XG4gIHJlc29sdmU6IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICByZXR1cm4gJHEud2hlbihyZWFzb24pO1xuICB9LFxuXG4gIHJlamVjdDogZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHJldHVybiAkcS5yZWplY3QocmVhc29uKTtcbiAgfSxcblxuICBjYXRjaEVycm9yOiBmdW5jdGlvbiAocHJvbWlzZSwgZm4pIHtcbiAgICByZXR1cm4gcHJvbWlzZS50aGVuKG51bGwsIGZuKTtcbiAgfSxcbiAgYWxsOiBmdW5jdGlvbiAocHJvbWlzZXMpIHtcbiAgICByZXR1cm4gJHEuYWxsKHByb21pc2VzKTtcbiAgfVxufTtcblxudmFyIFJlZ0V4cFdyYXBwZXIgPSB7XG4gIGNyZWF0ZTogZnVuY3Rpb24ocmVnRXhwU3RyLCBmbGFncykge1xuICAgIGZsYWdzID0gZmxhZ3MgPyBmbGFncy5yZXBsYWNlKC9nL2csICcnKSA6ICcnO1xuICAgIHJldHVybiBuZXcgUmVnRXhwKHJlZ0V4cFN0ciwgZmxhZ3MgKyAnZycpO1xuICB9LFxuICBmaXJzdE1hdGNoOiBmdW5jdGlvbihyZWdFeHAsIGlucHV0KSB7XG4gICAgcmVnRXhwLmxhc3RJbmRleCA9IDA7XG4gICAgcmV0dXJuIHJlZ0V4cC5leGVjKGlucHV0KTtcbiAgfSxcbiAgbWF0Y2hlcjogZnVuY3Rpb24gKHJlZ0V4cCwgaW5wdXQpIHtcbiAgICByZWdFeHAubGFzdEluZGV4ID0gMDtcbiAgICByZXR1cm4geyByZTogcmVnRXhwLCBpbnB1dDogaW5wdXQgfTtcbiAgfVxufTtcblxudmFyIHJlZmxlY3RvciA9IHtcbiAgYW5ub3RhdGlvbnM6IGZ1bmN0aW9uIChmbikge1xuICAgIC8vVE9ETzogaW1wbGVtZW50IG1lXG4gICAgcmV0dXJuIGZuLmFubm90YXRpb25zIHx8IFtdO1xuICB9XG59O1xuXG52YXIgTWFwV3JhcHBlciA9IHtcbiAgY3JlYXRlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE1hcCgpO1xuICB9LFxuXG4gIGdldDogZnVuY3Rpb24obSwgaykge1xuICAgIHJldHVybiBtLmdldChrKTtcbiAgfSxcblxuICBzZXQ6IGZ1bmN0aW9uKG0sIGssIHYpIHtcbiAgICByZXR1cm4gbS5zZXQoaywgdik7XG4gIH0sXG5cbiAgY29udGFpbnM6IGZ1bmN0aW9uIChtLCBrKSB7XG4gICAgcmV0dXJuIG0uaGFzKGspO1xuICB9LFxuXG4gIGZvckVhY2g6IGZ1bmN0aW9uIChtLCBmbikge1xuICAgIHJldHVybiBtLmZvckVhY2goZm4pO1xuICB9XG59O1xuXG52YXIgU3RyaW5nTWFwV3JhcHBlciA9IHtcbiAgY3JlYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9LFxuXG4gIHNldDogZnVuY3Rpb24gKG0sIGssIHYpIHtcbiAgICByZXR1cm4gbVtrXSA9IHY7XG4gIH0sXG5cbiAgZ2V0OiBmdW5jdGlvbiAobSwgaykge1xuICAgIHJldHVybiBtLmhhc093blByb3BlcnR5KGspID8gbVtrXSA6IHVuZGVmaW5lZDtcbiAgfSxcblxuICBjb250YWluczogZnVuY3Rpb24gKG0sIGspIHtcbiAgICByZXR1cm4gbS5oYXNPd25Qcm9wZXJ0eShrKTtcbiAgfSxcblxuICBrZXlzOiBmdW5jdGlvbihtYXApIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMobWFwKTtcbiAgfSxcblxuICBpc0VtcHR5OiBmdW5jdGlvbihtYXApIHtcbiAgICBmb3IgKHZhciBwcm9wIGluIG1hcCkge1xuICAgICAgaWYgKG1hcC5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIGRlbGV0ZTogZnVuY3Rpb24obWFwLCBrZXkpIHtcbiAgICBkZWxldGUgbWFwW2tleV07XG4gIH0sXG5cbiAgZm9yRWFjaDogZnVuY3Rpb24gKG0sIGZuKSB7XG4gICAgZm9yICh2YXIgcHJvcCBpbiBtKSB7XG4gICAgICBpZiAobS5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICBmbihtW3Byb3BdLCBwcm9wKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgZXF1YWxzOiBmdW5jdGlvbiAobTEsIG0yKSB7XG4gICAgdmFyIGsxID0gT2JqZWN0LmtleXMobTEpO1xuICAgIHZhciBrMiA9IE9iamVjdC5rZXlzKG0yKTtcbiAgICBpZiAoazEubGVuZ3RoICE9IGsyLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIga2V5O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgazEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGtleSA9IGsxW2ldO1xuICAgICAgaWYgKG0xW2tleV0gIT09IG0yW2tleV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICBtZXJnZTogZnVuY3Rpb24obTEsIG0yKSB7XG4gICAgdmFyIG0gPSB7fTtcbiAgICBmb3IgKHZhciBhdHRyIGluIG0xKSB7XG4gICAgICBpZiAobTEuaGFzT3duUHJvcGVydHkoYXR0cikpIHtcbiAgICAgICAgbVthdHRyXSA9IG0xW2F0dHJdO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBhdHRyIGluIG0yKSB7XG4gICAgICBpZiAobTIuaGFzT3duUHJvcGVydHkoYXR0cikpIHtcbiAgICAgICAgbVthdHRyXSA9IG0yW2F0dHJdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbTtcbiAgfVxufTtcblxudmFyIExpc3QgPSBBcnJheTtcbnZhciBMaXN0V3JhcHBlciA9IHtcbiAgY2xlYXI6IGZ1bmN0aW9uIChsKSB7XG4gICAgbC5sZW5ndGggPSAwO1xuICB9LFxuXG4gIGNyZWF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXTtcbiAgfSxcblxuICBwdXNoOiBmdW5jdGlvbiAobCwgdikge1xuICAgIHJldHVybiBsLnB1c2godik7XG4gIH0sXG5cbiAgZm9yRWFjaDogZnVuY3Rpb24gKGwsIGZuKSB7XG4gICAgcmV0dXJuIGwuZm9yRWFjaChmbik7XG4gIH0sXG5cbiAgZmlyc3Q6IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgaWYgKCFhcnJheSlcbiAgICAgIHJldHVybiBudWxsO1xuICAgIHJldHVybiBhcnJheVswXTtcbiAgfSxcblxuICBsYXN0OiBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiAoYXJyYXkgJiYgYXJyYXkubGVuZ3RoKSA+IDAgPyBhcnJheVthcnJheS5sZW5ndGggLSAxXSA6IG51bGw7XG4gIH0sXG5cbiAgbWFwOiBmdW5jdGlvbiAobCwgZm4pIHtcbiAgICByZXR1cm4gbC5tYXAoZm4pO1xuICB9LFxuXG4gIGpvaW46IGZ1bmN0aW9uIChsLCBzdHIpIHtcbiAgICByZXR1cm4gbC5qb2luKHN0cik7XG4gIH0sXG5cbiAgcmVkdWNlOiBmdW5jdGlvbihsaXN0LCBmbiwgaW5pdCkge1xuICAgIHJldHVybiBsaXN0LnJlZHVjZShmbiwgaW5pdCk7XG4gIH0sXG5cbiAgZmlsdGVyOiBmdW5jdGlvbihhcnJheSwgcHJlZCkge1xuICAgIHJldHVybiBhcnJheS5maWx0ZXIocHJlZCk7XG4gIH0sXG5cbiAgY29uY2F0OiBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGEuY29uY2F0KGIpO1xuICB9LFxuXG4gIHNsaWNlOiBmdW5jdGlvbihsKSB7XG4gICAgdmFyIGZyb20gPSBhcmd1bWVudHNbMV0gIT09ICh2b2lkIDApID8gYXJndW1lbnRzWzFdIDogMDtcbiAgICB2YXIgdG8gPSBhcmd1bWVudHNbMl0gIT09ICh2b2lkIDApID8gYXJndW1lbnRzWzJdIDogbnVsbDtcbiAgICByZXR1cm4gbC5zbGljZShmcm9tLCB0byA9PT0gbnVsbCA/IHVuZGVmaW5lZCA6IHRvKTtcbiAgfSxcblxuICBtYXhpbXVtOiBmdW5jdGlvbihsaXN0LCBwcmVkaWNhdGUpIHtcbiAgICBpZiAobGlzdC5sZW5ndGggPT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHZhciBzb2x1dGlvbiA9IG51bGw7XG4gICAgdmFyIG1heFZhbHVlID0gLUluZmluaXR5O1xuICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsaXN0Lmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgdmFyIGNhbmRpZGF0ZSA9IGxpc3RbaW5kZXhdO1xuICAgICAgaWYgKGlzQmxhbmsoY2FuZGlkYXRlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhciBjYW5kaWRhdGVWYWx1ZSA9IHByZWRpY2F0ZShjYW5kaWRhdGUpO1xuICAgICAgaWYgKGNhbmRpZGF0ZVZhbHVlID4gbWF4VmFsdWUpIHtcbiAgICAgICAgc29sdXRpb24gPSBjYW5kaWRhdGU7XG4gICAgICAgIG1heFZhbHVlID0gY2FuZGlkYXRlVmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzb2x1dGlvbjtcbiAgfVxufTtcblxudmFyIFN0cmluZ1dyYXBwZXIgPSB7XG4gIGVxdWFsczogZnVuY3Rpb24gKHMxLCBzMikge1xuICAgIHJldHVybiBzMSA9PT0gczI7XG4gIH0sXG5cbiAgc3BsaXQ6IGZ1bmN0aW9uKHMsIHJlKSB7XG4gICAgcmV0dXJuIHMuc3BsaXQocmUpO1xuICB9LFxuXG4gIHJlcGxhY2VBbGw6IGZ1bmN0aW9uKHMsIGZyb20sIHJlcGxhY2UpIHtcbiAgICByZXR1cm4gcy5yZXBsYWNlKGZyb20sIHJlcGxhY2UpO1xuICB9LFxuXG4gIHJlcGxhY2VBbGxNYXBwZWQ6IGZ1bmN0aW9uKHMsIGZyb20sIGNiKSB7XG4gICAgcmV0dXJuIHMucmVwbGFjZShmcm9tLCBmdW5jdGlvbihtYXRjaGVzKSB7XG4gICAgICAvLyBSZW1vdmUgb2Zmc2V0ICYgc3RyaW5nIGZyb20gdGhlIHJlc3VsdCBhcnJheVxuICAgICAgbWF0Y2hlcy5zcGxpY2UoLTIsIDIpO1xuICAgICAgLy8gVGhlIGNhbGxiYWNrIHJlY2VpdmVzIG1hdGNoLCBwMSwgLi4uLCBwblxuICAgICAgcmV0dXJuIGNiLmFwcGx5KG51bGwsIG1hdGNoZXMpO1xuICAgIH0pO1xuICB9LFxuXG4gIGNvbnRhaW5zOiBmdW5jdGlvbihzLCBzdWJzdHIpIHtcbiAgICByZXR1cm4gcy5pbmRleE9mKHN1YnN0cikgIT0gLTE7XG4gIH0sXG5cbiAgY2hhckNvZGVBdDogZnVuY3Rpb24ocywgbCkge1xuICAgIHJldHVybiBzLmNoYXJDb2RlQXQocywgbCk7XG4gIH1cblxuXG59O1xuXG4vL1RPRE86IGltcGxlbWVudD9cbi8vIEkgdGhpbmsgaXQncyB0b28gaGVhdnkgdG8gYXNrIDEueCB1c2VycyB0byBicmluZyBpbiBSeCBmb3IgdGhlIHJvdXRlci4uLlxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge31cblxudmFyIEJhc2VFeGNlcHRpb24gPSBFcnJvcjtcblxudmFyIE9ic2VydmFibGVXcmFwcGVyID0ge1xuICBjYWxsTmV4dDogZnVuY3Rpb24ob2IsIHZhbCkge1xuICAgIG9iLmZuKHZhbCk7XG4gIH0sXG4gIGNhbGxFbWl0OiBmdW5jdGlvbihvYiwgdmFsKSB7XG4gICAgb2IuZm4odmFsKTtcbiAgfSxcblxuICBzdWJzY3JpYmU6IGZ1bmN0aW9uKG9iLCBmbikge1xuICAgIG9iLmZuID0gZm47XG4gIH1cbn07XG5cbi8vIFRPRE86IGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIuanMvYmxvYi9tYXN0ZXIvc3JjL25nL2Jyb3dzZXIuanMjTDIyNy1MMjY1XG52YXIgJF9fcm91dGVyXzQ3X2xvY2F0aW9uX18gPSB7XG4gIExvY2F0aW9uOiBMb2NhdGlvblxufTtcblxuZnVuY3Rpb24gTG9jYXRpb24oKXt9XG5Mb2NhdGlvbi5wcm90b3R5cGUuc3Vic2NyaWJlID0gZnVuY3Rpb24gKCkge1xuICAvL1RPRE86IGltcGxlbWVudFxufTtcbkxvY2F0aW9uLnByb3RvdHlwZS5wYXRoID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJGxvY2F0aW9uLnBhdGgoKTtcbn07XG5Mb2NhdGlvbi5wcm90b3R5cGUuZ28gPSBmdW5jdGlvbiAodXJsKSB7XG4gIHJldHVybiAkbG9jYXRpb24ucGF0aCh1cmwpO1xufTtcblxuXG4gIHZhciBleHBvcnRzID0ge1xuICAgIEluamVjdGFibGU6IGZ1bmN0aW9uICgpIHt9LFxuICAgIE9wYXF1ZVRva2VuOiBmdW5jdGlvbiAoKSB7fSxcbiAgICBJbmplY3Q6IGZ1bmN0aW9uICgpIHt9XG4gIH07XG4gIHZhciByZXF1aXJlID0gZnVuY3Rpb24gKCkge3JldHVybiBleHBvcnRzO307XG5cbiAgLy8gV2hlbiB0aGlzIGZpbGUgaXMgcHJvY2Vzc2VkLCB0aGUgbGluZSBiZWxvdyBpcyByZXBsYWNlZCB3aXRoXG4gIC8vIHRoZSBjb250ZW50cyBvZiB0aGUgY29tcGlsZWQgVHlwZVNjcmlwdCBjbGFzc2VzLlxuICB2YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcbn07XG52YXIgUm91dGVMaWZlY3ljbGVIb29rID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBSb3V0ZUxpZmVjeWNsZUhvb2sobmFtZSkge1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIH1cbiAgICBSb3V0ZUxpZmVjeWNsZUhvb2sgPSBfX2RlY29yYXRlKFtcbiAgICAgICAgQ09OU1QoKVxuICAgIF0sIFJvdXRlTGlmZWN5Y2xlSG9vayk7XG4gICAgcmV0dXJuIFJvdXRlTGlmZWN5Y2xlSG9vaztcbn0pKCk7XG5leHBvcnRzLlJvdXRlTGlmZWN5Y2xlSG9vayA9IFJvdXRlTGlmZWN5Y2xlSG9vaztcbnZhciBDYW5BY3RpdmF0ZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ2FuQWN0aXZhdGUoZm4pIHtcbiAgICAgICAgdGhpcy5mbiA9IGZuO1xuICAgIH1cbiAgICBDYW5BY3RpdmF0ZSA9IF9fZGVjb3JhdGUoW1xuICAgICAgICBDT05TVCgpXG4gICAgXSwgQ2FuQWN0aXZhdGUpO1xuICAgIHJldHVybiBDYW5BY3RpdmF0ZTtcbn0pKCk7XG5leHBvcnRzLkNhbkFjdGl2YXRlID0gQ2FuQWN0aXZhdGU7XG5leHBvcnRzLnJvdXRlckNhblJldXNlID0gQ09OU1RfRVhQUihuZXcgUm91dGVMaWZlY3ljbGVIb29rKFwicm91dGVyQ2FuUmV1c2VcIikpO1xuZXhwb3J0cy5yb3V0ZXJDYW5EZWFjdGl2YXRlID0gQ09OU1RfRVhQUihuZXcgUm91dGVMaWZlY3ljbGVIb29rKFwicm91dGVyQ2FuRGVhY3RpdmF0ZVwiKSk7XG5leHBvcnRzLnJvdXRlck9uQWN0aXZhdGUgPSBDT05TVF9FWFBSKG5ldyBSb3V0ZUxpZmVjeWNsZUhvb2soXCJyb3V0ZXJPbkFjdGl2YXRlXCIpKTtcbmV4cG9ydHMucm91dGVyT25SZXVzZSA9IENPTlNUX0VYUFIobmV3IFJvdXRlTGlmZWN5Y2xlSG9vayhcInJvdXRlck9uUmV1c2VcIikpO1xuZXhwb3J0cy5yb3V0ZXJPbkRlYWN0aXZhdGUgPSBDT05TVF9FWFBSKG5ldyBSb3V0ZUxpZmVjeWNsZUhvb2soXCJyb3V0ZXJPbkRlYWN0aXZhdGVcIikpO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG4vKipcbiAqIFRoaXMgY2xhc3MgcmVwcmVzZW50cyBhIHBhcnNlZCBVUkxcbiAqL1xudmFyIFVybCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVXJsKHBhdGgsIGNoaWxkLCBhdXhpbGlhcnksIHBhcmFtcykge1xuICAgICAgICBpZiAoY2hpbGQgPT09IHZvaWQgMCkgeyBjaGlsZCA9IG51bGw7IH1cbiAgICAgICAgaWYgKGF1eGlsaWFyeSA9PT0gdm9pZCAwKSB7IGF1eGlsaWFyeSA9IENPTlNUX0VYUFIoW10pOyB9XG4gICAgICAgIGlmIChwYXJhbXMgPT09IHZvaWQgMCkgeyBwYXJhbXMgPSBudWxsOyB9XG4gICAgICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gICAgICAgIHRoaXMuY2hpbGQgPSBjaGlsZDtcbiAgICAgICAgdGhpcy5hdXhpbGlhcnkgPSBhdXhpbGlhcnk7XG4gICAgICAgIHRoaXMucGFyYW1zID0gcGFyYW1zO1xuICAgIH1cbiAgICBVcmwucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXRoICsgdGhpcy5fbWF0cml4UGFyYW1zVG9TdHJpbmcoKSArIHRoaXMuX2F1eFRvU3RyaW5nKCkgKyB0aGlzLl9jaGlsZFN0cmluZygpO1xuICAgIH07XG4gICAgVXJsLnByb3RvdHlwZS5zZWdtZW50VG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLnBhdGggKyB0aGlzLl9tYXRyaXhQYXJhbXNUb1N0cmluZygpOyB9O1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBVcmwucHJvdG90eXBlLl9hdXhUb1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXV4aWxpYXJ5Lmxlbmd0aCA+IDAgP1xuICAgICAgICAgICAgKCcoJyArIHRoaXMuYXV4aWxpYXJ5Lm1hcChmdW5jdGlvbiAoc2libGluZykgeyByZXR1cm4gc2libGluZy50b1N0cmluZygpOyB9KS5qb2luKCcvLycpICsgJyknKSA6XG4gICAgICAgICAgICAnJztcbiAgICB9O1xuICAgIFVybC5wcm90b3R5cGUuX21hdHJpeFBhcmFtc1RvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoaXNCbGFuayh0aGlzLnBhcmFtcykpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJzsnICsgc2VyaWFsaXplUGFyYW1zKHRoaXMucGFyYW1zKS5qb2luKCc7Jyk7XG4gICAgfTtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgVXJsLnByb3RvdHlwZS5fY2hpbGRTdHJpbmcgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBpc1ByZXNlbnQodGhpcy5jaGlsZCkgPyAoJy8nICsgdGhpcy5jaGlsZC50b1N0cmluZygpKSA6ICcnOyB9O1xuICAgIHJldHVybiBVcmw7XG59KSgpO1xuZXhwb3J0cy5VcmwgPSBVcmw7XG52YXIgUm9vdFVybCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFJvb3RVcmwsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gUm9vdFVybChwYXRoLCBjaGlsZCwgYXV4aWxpYXJ5LCBwYXJhbXMpIHtcbiAgICAgICAgaWYgKGNoaWxkID09PSB2b2lkIDApIHsgY2hpbGQgPSBudWxsOyB9XG4gICAgICAgIGlmIChhdXhpbGlhcnkgPT09IHZvaWQgMCkgeyBhdXhpbGlhcnkgPSBDT05TVF9FWFBSKFtdKTsgfVxuICAgICAgICBpZiAocGFyYW1zID09PSB2b2lkIDApIHsgcGFyYW1zID0gbnVsbDsgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBwYXRoLCBjaGlsZCwgYXV4aWxpYXJ5LCBwYXJhbXMpO1xuICAgIH1cbiAgICBSb290VXJsLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGF0aCArIHRoaXMuX2F1eFRvU3RyaW5nKCkgKyB0aGlzLl9jaGlsZFN0cmluZygpICsgdGhpcy5fcXVlcnlQYXJhbXNUb1N0cmluZygpO1xuICAgIH07XG4gICAgUm9vdFVybC5wcm90b3R5cGUuc2VnbWVudFRvU3RyaW5nID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5wYXRoICsgdGhpcy5fcXVlcnlQYXJhbXNUb1N0cmluZygpOyB9O1xuICAgIFJvb3RVcmwucHJvdG90eXBlLl9xdWVyeVBhcmFtc1RvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoaXNCbGFuayh0aGlzLnBhcmFtcykpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJz8nICsgc2VyaWFsaXplUGFyYW1zKHRoaXMucGFyYW1zKS5qb2luKCcmJyk7XG4gICAgfTtcbiAgICByZXR1cm4gUm9vdFVybDtcbn0pKFVybCk7XG5leHBvcnRzLlJvb3RVcmwgPSBSb290VXJsO1xuZnVuY3Rpb24gcGF0aFNlZ21lbnRzVG9VcmwocGF0aFNlZ21lbnRzKSB7XG4gICAgdmFyIHVybCA9IG5ldyBVcmwocGF0aFNlZ21lbnRzW3BhdGhTZWdtZW50cy5sZW5ndGggLSAxXSk7XG4gICAgZm9yICh2YXIgaSA9IHBhdGhTZWdtZW50cy5sZW5ndGggLSAyOyBpID49IDA7IGkgLT0gMSkge1xuICAgICAgICB1cmwgPSBuZXcgVXJsKHBhdGhTZWdtZW50c1tpXSwgdXJsKTtcbiAgICB9XG4gICAgcmV0dXJuIHVybDtcbn1cbmV4cG9ydHMucGF0aFNlZ21lbnRzVG9VcmwgPSBwYXRoU2VnbWVudHNUb1VybDtcbnZhciBTRUdNRU5UX1JFID0gUmVnRXhwV3JhcHBlci5jcmVhdGUoJ15bXlxcXFwvXFxcXChcXFxcKVxcXFw/Oz0mI10rJyk7XG5mdW5jdGlvbiBtYXRjaFVybFNlZ21lbnQoc3RyKSB7XG4gICAgdmFyIG1hdGNoID0gUmVnRXhwV3JhcHBlci5maXJzdE1hdGNoKFNFR01FTlRfUkUsIHN0cik7XG4gICAgcmV0dXJuIGlzUHJlc2VudChtYXRjaCkgPyBtYXRjaFswXSA6ICcnO1xufVxudmFyIFVybFBhcnNlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVXJsUGFyc2VyKCkge1xuICAgIH1cbiAgICBVcmxQYXJzZXIucHJvdG90eXBlLnBlZWtTdGFydHNXaXRoID0gZnVuY3Rpb24gKHN0cikgeyByZXR1cm4gdGhpcy5fcmVtYWluaW5nLnN0YXJ0c1dpdGgoc3RyKTsgfTtcbiAgICBVcmxQYXJzZXIucHJvdG90eXBlLmNhcHR1cmUgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgICAgIGlmICghdGhpcy5fcmVtYWluaW5nLnN0YXJ0c1dpdGgoc3RyKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oXCJFeHBlY3RlZCBcXFwiXCIgKyBzdHIgKyBcIlxcXCIuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZyA9IHRoaXMuX3JlbWFpbmluZy5zdWJzdHJpbmcoc3RyLmxlbmd0aCk7XG4gICAgfTtcbiAgICBVcmxQYXJzZXIucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24gKHVybCkge1xuICAgICAgICB0aGlzLl9yZW1haW5pbmcgPSB1cmw7XG4gICAgICAgIGlmICh1cmwgPT0gJycgfHwgdXJsID09ICcvJykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBVcmwoJycpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnBhcnNlUm9vdCgpO1xuICAgIH07XG4gICAgLy8gc2VnbWVudCArIChhdXggc2VnbWVudHMpICsgKHF1ZXJ5IHBhcmFtcylcbiAgICBVcmxQYXJzZXIucHJvdG90eXBlLnBhcnNlUm9vdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgICAgICAgdGhpcy5jYXB0dXJlKCcvJyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhdGggPSBtYXRjaFVybFNlZ21lbnQodGhpcy5fcmVtYWluaW5nKTtcbiAgICAgICAgdGhpcy5jYXB0dXJlKHBhdGgpO1xuICAgICAgICB2YXIgYXV4ID0gW107XG4gICAgICAgIGlmICh0aGlzLnBlZWtTdGFydHNXaXRoKCcoJykpIHtcbiAgICAgICAgICAgIGF1eCA9IHRoaXMucGFyc2VBdXhpbGlhcnlSb3V0ZXMoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5wZWVrU3RhcnRzV2l0aCgnOycpKSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBzaG91bGQgdGhlc2UgcGFyYW1zIGp1c3QgYmUgZHJvcHBlZD9cbiAgICAgICAgICAgIHRoaXMucGFyc2VNYXRyaXhQYXJhbXMoKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2hpbGQgPSBudWxsO1xuICAgICAgICBpZiAodGhpcy5wZWVrU3RhcnRzV2l0aCgnLycpICYmICF0aGlzLnBlZWtTdGFydHNXaXRoKCcvLycpKSB7XG4gICAgICAgICAgICB0aGlzLmNhcHR1cmUoJy8nKTtcbiAgICAgICAgICAgIGNoaWxkID0gdGhpcy5wYXJzZVNlZ21lbnQoKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSBudWxsO1xuICAgICAgICBpZiAodGhpcy5wZWVrU3RhcnRzV2l0aCgnPycpKSB7XG4gICAgICAgICAgICBxdWVyeVBhcmFtcyA9IHRoaXMucGFyc2VRdWVyeVBhcmFtcygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUm9vdFVybChwYXRoLCBjaGlsZCwgYXV4LCBxdWVyeVBhcmFtcyk7XG4gICAgfTtcbiAgICAvLyBzZWdtZW50ICsgKG1hdHJpeCBwYXJhbXMpICsgKGF1eCBzZWdtZW50cylcbiAgICBVcmxQYXJzZXIucHJvdG90eXBlLnBhcnNlU2VnbWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuX3JlbWFpbmluZy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgICAgICAgdGhpcy5jYXB0dXJlKCcvJyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhdGggPSBtYXRjaFVybFNlZ21lbnQodGhpcy5fcmVtYWluaW5nKTtcbiAgICAgICAgdGhpcy5jYXB0dXJlKHBhdGgpO1xuICAgICAgICB2YXIgbWF0cml4UGFyYW1zID0gbnVsbDtcbiAgICAgICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJzsnKSkge1xuICAgICAgICAgICAgbWF0cml4UGFyYW1zID0gdGhpcy5wYXJzZU1hdHJpeFBhcmFtcygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBhdXggPSBbXTtcbiAgICAgICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJygnKSkge1xuICAgICAgICAgICAgYXV4ID0gdGhpcy5wYXJzZUF1eGlsaWFyeVJvdXRlcygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjaGlsZCA9IG51bGw7XG4gICAgICAgIGlmICh0aGlzLnBlZWtTdGFydHNXaXRoKCcvJykgJiYgIXRoaXMucGVla1N0YXJ0c1dpdGgoJy8vJykpIHtcbiAgICAgICAgICAgIHRoaXMuY2FwdHVyZSgnLycpO1xuICAgICAgICAgICAgY2hpbGQgPSB0aGlzLnBhcnNlU2VnbWVudCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgVXJsKHBhdGgsIGNoaWxkLCBhdXgsIG1hdHJpeFBhcmFtcyk7XG4gICAgfTtcbiAgICBVcmxQYXJzZXIucHJvdG90eXBlLnBhcnNlUXVlcnlQYXJhbXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwYXJhbXMgPSB7fTtcbiAgICAgICAgdGhpcy5jYXB0dXJlKCc/Jyk7XG4gICAgICAgIHRoaXMucGFyc2VQYXJhbShwYXJhbXMpO1xuICAgICAgICB3aGlsZSAodGhpcy5fcmVtYWluaW5nLmxlbmd0aCA+IDAgJiYgdGhpcy5wZWVrU3RhcnRzV2l0aCgnJicpKSB7XG4gICAgICAgICAgICB0aGlzLmNhcHR1cmUoJyYnKTtcbiAgICAgICAgICAgIHRoaXMucGFyc2VQYXJhbShwYXJhbXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXJhbXM7XG4gICAgfTtcbiAgICBVcmxQYXJzZXIucHJvdG90eXBlLnBhcnNlTWF0cml4UGFyYW1zID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcGFyYW1zID0ge307XG4gICAgICAgIHdoaWxlICh0aGlzLl9yZW1haW5pbmcubGVuZ3RoID4gMCAmJiB0aGlzLnBlZWtTdGFydHNXaXRoKCc7JykpIHtcbiAgICAgICAgICAgIHRoaXMuY2FwdHVyZSgnOycpO1xuICAgICAgICAgICAgdGhpcy5wYXJzZVBhcmFtKHBhcmFtcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICB9O1xuICAgIFVybFBhcnNlci5wcm90b3R5cGUucGFyc2VQYXJhbSA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgdmFyIGtleSA9IG1hdGNoVXJsU2VnbWVudCh0aGlzLl9yZW1haW5pbmcpO1xuICAgICAgICBpZiAoaXNCbGFuayhrZXkpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jYXB0dXJlKGtleSk7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRydWU7XG4gICAgICAgIGlmICh0aGlzLnBlZWtTdGFydHNXaXRoKCc9JykpIHtcbiAgICAgICAgICAgIHRoaXMuY2FwdHVyZSgnPScpO1xuICAgICAgICAgICAgdmFyIHZhbHVlTWF0Y2ggPSBtYXRjaFVybFNlZ21lbnQodGhpcy5fcmVtYWluaW5nKTtcbiAgICAgICAgICAgIGlmIChpc1ByZXNlbnQodmFsdWVNYXRjaCkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlTWF0Y2g7XG4gICAgICAgICAgICAgICAgdGhpcy5jYXB0dXJlKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBwYXJhbXNba2V5XSA9IHZhbHVlO1xuICAgIH07XG4gICAgVXJsUGFyc2VyLnByb3RvdHlwZS5wYXJzZUF1eGlsaWFyeVJvdXRlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJvdXRlcyA9IFtdO1xuICAgICAgICB0aGlzLmNhcHR1cmUoJygnKTtcbiAgICAgICAgd2hpbGUgKCF0aGlzLnBlZWtTdGFydHNXaXRoKCcpJykgJiYgdGhpcy5fcmVtYWluaW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJvdXRlcy5wdXNoKHRoaXMucGFyc2VTZWdtZW50KCkpO1xuICAgICAgICAgICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJy8vJykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhcHR1cmUoJy8vJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jYXB0dXJlKCcpJyk7XG4gICAgICAgIHJldHVybiByb3V0ZXM7XG4gICAgfTtcbiAgICByZXR1cm4gVXJsUGFyc2VyO1xufSkoKTtcbmV4cG9ydHMuVXJsUGFyc2VyID0gVXJsUGFyc2VyO1xuZXhwb3J0cy5wYXJzZXIgPSBuZXcgVXJsUGFyc2VyKCk7XG5mdW5jdGlvbiBzZXJpYWxpemVQYXJhbXMocGFyYW1NYXApIHtcbiAgICB2YXIgcGFyYW1zID0gW107XG4gICAgaWYgKGlzUHJlc2VudChwYXJhbU1hcCkpIHtcbiAgICAgICAgU3RyaW5nTWFwV3JhcHBlci5mb3JFYWNoKHBhcmFtTWFwLCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlID09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMucHVzaChrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnB1c2goa2V5ICsgJz0nICsgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcztcbn1cbmV4cG9ydHMuc2VyaWFsaXplUGFyYW1zID0gc2VyaWFsaXplUGFyYW1zO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgaW5zdHJ1Y3Rpb25fMSA9IHJlcXVpcmUoJy4vaW5zdHJ1Y3Rpb24nKTtcbnZhciBwYXRoX3JlY29nbml6ZXJfMSA9IHJlcXVpcmUoJy4vcGF0aF9yZWNvZ25pemVyJyk7XG52YXIgUm91dGVNYXRjaCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gUm91dGVNYXRjaCgpIHtcbiAgICB9XG4gICAgcmV0dXJuIFJvdXRlTWF0Y2g7XG59KSgpO1xuZXhwb3J0cy5Sb3V0ZU1hdGNoID0gUm91dGVNYXRjaDtcbnZhciBQYXRoTWF0Y2ggPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhQYXRoTWF0Y2gsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gUGF0aE1hdGNoKGluc3RydWN0aW9uLCByZW1haW5pbmcsIHJlbWFpbmluZ0F1eCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5pbnN0cnVjdGlvbiA9IGluc3RydWN0aW9uO1xuICAgICAgICB0aGlzLnJlbWFpbmluZyA9IHJlbWFpbmluZztcbiAgICAgICAgdGhpcy5yZW1haW5pbmdBdXggPSByZW1haW5pbmdBdXg7XG4gICAgfVxuICAgIHJldHVybiBQYXRoTWF0Y2g7XG59KShSb3V0ZU1hdGNoKTtcbmV4cG9ydHMuUGF0aE1hdGNoID0gUGF0aE1hdGNoO1xudmFyIFJlZGlyZWN0TWF0Y2ggPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhSZWRpcmVjdE1hdGNoLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFJlZGlyZWN0TWF0Y2gocmVkaXJlY3RUbywgc3BlY2lmaWNpdHkpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMucmVkaXJlY3RUbyA9IHJlZGlyZWN0VG87XG4gICAgICAgIHRoaXMuc3BlY2lmaWNpdHkgPSBzcGVjaWZpY2l0eTtcbiAgICB9XG4gICAgcmV0dXJuIFJlZGlyZWN0TWF0Y2g7XG59KShSb3V0ZU1hdGNoKTtcbmV4cG9ydHMuUmVkaXJlY3RNYXRjaCA9IFJlZGlyZWN0TWF0Y2g7XG52YXIgUmVkaXJlY3RSZWNvZ25pemVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBSZWRpcmVjdFJlY29nbml6ZXIocGF0aCwgcmVkaXJlY3RUbykge1xuICAgICAgICB0aGlzLnBhdGggPSBwYXRoO1xuICAgICAgICB0aGlzLnJlZGlyZWN0VG8gPSByZWRpcmVjdFRvO1xuICAgICAgICB0aGlzLl9wYXRoUmVjb2duaXplciA9IG5ldyBwYXRoX3JlY29nbml6ZXJfMS5QYXRoUmVjb2duaXplcihwYXRoKTtcbiAgICAgICAgdGhpcy5oYXNoID0gdGhpcy5fcGF0aFJlY29nbml6ZXIuaGFzaDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJucyBgbnVsbGAgb3IgYSBgUGFyc2VkVXJsYCByZXByZXNlbnRpbmcgdGhlIG5ldyBwYXRoIHRvIG1hdGNoXG4gICAgICovXG4gICAgUmVkaXJlY3RSZWNvZ25pemVyLnByb3RvdHlwZS5yZWNvZ25pemUgPSBmdW5jdGlvbiAoYmVnaW5uaW5nU2VnbWVudCkge1xuICAgICAgICB2YXIgbWF0Y2ggPSBudWxsO1xuICAgICAgICBpZiAoaXNQcmVzZW50KHRoaXMuX3BhdGhSZWNvZ25pemVyLnJlY29nbml6ZShiZWdpbm5pbmdTZWdtZW50KSkpIHtcbiAgICAgICAgICAgIG1hdGNoID0gbmV3IFJlZGlyZWN0TWF0Y2godGhpcy5yZWRpcmVjdFRvLCB0aGlzLl9wYXRoUmVjb2duaXplci5zcGVjaWZpY2l0eSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFByb21pc2VXcmFwcGVyLnJlc29sdmUobWF0Y2gpO1xuICAgIH07XG4gICAgUmVkaXJlY3RSZWNvZ25pemVyLnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oXCJUcmllZCB0byBnZW5lcmF0ZSBhIHJlZGlyZWN0LlwiKTtcbiAgICB9O1xuICAgIHJldHVybiBSZWRpcmVjdFJlY29nbml6ZXI7XG59KSgpO1xuZXhwb3J0cy5SZWRpcmVjdFJlY29nbml6ZXIgPSBSZWRpcmVjdFJlY29nbml6ZXI7XG4vLyByZXByZXNlbnRzIHNvbWV0aGluZyBsaWtlICcvZm9vLzpiYXInXG52YXIgUm91dGVSZWNvZ25pemVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICAvLyBUT0RPOiBjYWNoZSBjb21wb25lbnQgaW5zdHJ1Y3Rpb24gaW5zdGFuY2VzIGJ5IHBhcmFtcyBhbmQgYnkgUGFyc2VkVXJsIGluc3RhbmNlXG4gICAgZnVuY3Rpb24gUm91dGVSZWNvZ25pemVyKHBhdGgsIGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICAgICAgdGhpcy5oYW5kbGVyID0gaGFuZGxlcjtcbiAgICAgICAgdGhpcy50ZXJtaW5hbCA9IHRydWU7XG4gICAgICAgIHRoaXMuX2NhY2hlID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLl9wYXRoUmVjb2duaXplciA9IG5ldyBwYXRoX3JlY29nbml6ZXJfMS5QYXRoUmVjb2duaXplcihwYXRoKTtcbiAgICAgICAgdGhpcy5zcGVjaWZpY2l0eSA9IHRoaXMuX3BhdGhSZWNvZ25pemVyLnNwZWNpZmljaXR5O1xuICAgICAgICB0aGlzLmhhc2ggPSB0aGlzLl9wYXRoUmVjb2duaXplci5oYXNoO1xuICAgICAgICB0aGlzLnRlcm1pbmFsID0gdGhpcy5fcGF0aFJlY29nbml6ZXIudGVybWluYWw7XG4gICAgfVxuICAgIFJvdXRlUmVjb2duaXplci5wcm90b3R5cGUucmVjb2duaXplID0gZnVuY3Rpb24gKGJlZ2lubmluZ1NlZ21lbnQpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgdmFyIHJlcyA9IHRoaXMuX3BhdGhSZWNvZ25pemVyLnJlY29nbml6ZShiZWdpbm5pbmdTZWdtZW50KTtcbiAgICAgICAgaWYgKGlzQmxhbmsocmVzKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlci5yZXNvbHZlQ29tcG9uZW50VHlwZSgpLnRoZW4oZnVuY3Rpb24gKF8pIHtcbiAgICAgICAgICAgIHZhciBjb21wb25lbnRJbnN0cnVjdGlvbiA9IF90aGlzLl9nZXRJbnN0cnVjdGlvbihyZXNbJ3VybFBhdGgnXSwgcmVzWyd1cmxQYXJhbXMnXSwgcmVzWydhbGxQYXJhbXMnXSk7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFBhdGhNYXRjaChjb21wb25lbnRJbnN0cnVjdGlvbiwgcmVzWyduZXh0U2VnbWVudCddLCByZXNbJ2F1eGlsaWFyeSddKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBSb3V0ZVJlY29nbml6ZXIucHJvdG90eXBlLmdlbmVyYXRlID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICB2YXIgZ2VuZXJhdGVkID0gdGhpcy5fcGF0aFJlY29nbml6ZXIuZ2VuZXJhdGUocGFyYW1zKTtcbiAgICAgICAgdmFyIHVybFBhdGggPSBnZW5lcmF0ZWRbJ3VybFBhdGgnXTtcbiAgICAgICAgdmFyIHVybFBhcmFtcyA9IGdlbmVyYXRlZFsndXJsUGFyYW1zJ107XG4gICAgICAgIHJldHVybiB0aGlzLl9nZXRJbnN0cnVjdGlvbih1cmxQYXRoLCB1cmxQYXJhbXMsIHBhcmFtcyk7XG4gICAgfTtcbiAgICBSb3V0ZVJlY29nbml6ZXIucHJvdG90eXBlLmdlbmVyYXRlQ29tcG9uZW50UGF0aFZhbHVlcyA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdGhSZWNvZ25pemVyLmdlbmVyYXRlKHBhcmFtcyk7XG4gICAgfTtcbiAgICBSb3V0ZVJlY29nbml6ZXIucHJvdG90eXBlLl9nZXRJbnN0cnVjdGlvbiA9IGZ1bmN0aW9uICh1cmxQYXRoLCB1cmxQYXJhbXMsIHBhcmFtcykge1xuICAgICAgICBpZiAoaXNCbGFuayh0aGlzLmhhbmRsZXIuY29tcG9uZW50VHlwZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiVHJpZWQgdG8gZ2V0IGluc3RydWN0aW9uIGJlZm9yZSB0aGUgdHlwZSB3YXMgbG9hZGVkLlwiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaGFzaEtleSA9IHVybFBhdGggKyAnPycgKyB1cmxQYXJhbXMuam9pbignPycpO1xuICAgICAgICBpZiAodGhpcy5fY2FjaGUuaGFzKGhhc2hLZXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY2FjaGUuZ2V0KGhhc2hLZXkpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpbnN0cnVjdGlvbiA9IG5ldyBpbnN0cnVjdGlvbl8xLkNvbXBvbmVudEluc3RydWN0aW9uKHVybFBhdGgsIHVybFBhcmFtcywgdGhpcy5oYW5kbGVyLmRhdGEsIHRoaXMuaGFuZGxlci5jb21wb25lbnRUeXBlLCB0aGlzLnRlcm1pbmFsLCB0aGlzLnNwZWNpZmljaXR5LCBwYXJhbXMpO1xuICAgICAgICB0aGlzLl9jYWNoZS5zZXQoaGFzaEtleSwgaW5zdHJ1Y3Rpb24pO1xuICAgICAgICByZXR1cm4gaW5zdHJ1Y3Rpb247XG4gICAgfTtcbiAgICByZXR1cm4gUm91dGVSZWNvZ25pemVyO1xufSkoKTtcbmV4cG9ydHMuUm91dGVSZWNvZ25pemVyID0gUm91dGVSZWNvZ25pemVyO1xudmFyIF9fZGVjb3JhdGUgPSAodGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUpIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XG59O1xudmFyIHJvdXRlX2RlZmluaXRpb25fMSA9IHJlcXVpcmUoJy4vcm91dGVfZGVmaW5pdGlvbicpO1xuZXhwb3J0cy5Sb3V0ZURlZmluaXRpb24gPSByb3V0ZV9kZWZpbml0aW9uXzEuUm91dGVEZWZpbml0aW9uO1xuLyoqXG4gKiBUaGUgYFJvdXRlQ29uZmlnYCBkZWNvcmF0b3IgZGVmaW5lcyByb3V0ZXMgZm9yIGEgZ2l2ZW4gY29tcG9uZW50LlxuICpcbiAqIEl0IHRha2VzIGFuIGFycmF5IG9mIHtAbGluayBSb3V0ZURlZmluaXRpb259cy5cbiAqL1xudmFyIFJvdXRlQ29uZmlnID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBSb3V0ZUNvbmZpZyhjb25maWdzKSB7XG4gICAgICAgIHRoaXMuY29uZmlncyA9IGNvbmZpZ3M7XG4gICAgfVxuICAgIFJvdXRlQ29uZmlnID0gX19kZWNvcmF0ZShbXG4gICAgICAgIENPTlNUKClcbiAgICBdLCBSb3V0ZUNvbmZpZyk7XG4gICAgcmV0dXJuIFJvdXRlQ29uZmlnO1xufSkoKTtcbmV4cG9ydHMuUm91dGVDb25maWcgPSBSb3V0ZUNvbmZpZztcbi8qKlxuICogYFJvdXRlYCBpcyBhIHR5cGUgb2Yge0BsaW5rIFJvdXRlRGVmaW5pdGlvbn0gdXNlZCB0byByb3V0ZSBhIHBhdGggdG8gYSBjb21wb25lbnQuXG4gKlxuICogSXQgaGFzIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAqIC0gYHBhdGhgIGlzIGEgc3RyaW5nIHRoYXQgdXNlcyB0aGUgcm91dGUgbWF0Y2hlciBEU0wuXG4gKiAtIGBjb21wb25lbnRgIGEgY29tcG9uZW50IHR5cGUuXG4gKiAtIGBuYW1lYCBpcyBhbiBvcHRpb25hbCBgQ2FtZWxDYXNlYCBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBuYW1lIG9mIHRoZSByb3V0ZS5cbiAqIC0gYGRhdGFgIGlzIGFuIG9wdGlvbmFsIHByb3BlcnR5IG9mIGFueSB0eXBlIHJlcHJlc2VudGluZyBhcmJpdHJhcnkgcm91dGUgbWV0YWRhdGEgZm9yIHRoZSBnaXZlblxuICogcm91dGUuIEl0IGlzIGluamVjdGFibGUgdmlhIHtAbGluayBSb3V0ZURhdGF9LlxuICogLSBgdXNlQXNEZWZhdWx0YCBpcyBhIGJvb2xlYW4gdmFsdWUuIElmIGB0cnVlYCwgdGhlIGNoaWxkIHJvdXRlIHdpbGwgYmUgbmF2aWdhdGVkIHRvIGlmIG5vIGNoaWxkXG4gKiByb3V0ZSBpcyBzcGVjaWZpZWQgZHVyaW5nIHRoZSBuYXZpZ2F0aW9uLlxuICpcbiAqICMjIyBFeGFtcGxlXG4gKiBgYGBcbiAqIGltcG9ydCB7Um91dGVDb25maWd9IGZyb20gJ2FuZ3VsYXIyL3JvdXRlcic7XG4gKlxuICogQFJvdXRlQ29uZmlnKFtcbiAqICAge3BhdGg6ICcvaG9tZScsIGNvbXBvbmVudDogSG9tZUNtcCwgbmFtZTogJ0hvbWVDbXAnIH1cbiAqIF0pXG4gKiBjbGFzcyBNeUFwcCB7fVxuICogYGBgXG4gKi9cbnZhciBSb3V0ZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gUm91dGUoX2EpIHtcbiAgICAgICAgdmFyIHBhdGggPSBfYS5wYXRoLCBjb21wb25lbnQgPSBfYS5jb21wb25lbnQsIG5hbWUgPSBfYS5uYW1lLCBkYXRhID0gX2EuZGF0YSwgdXNlQXNEZWZhdWx0ID0gX2EudXNlQXNEZWZhdWx0O1xuICAgICAgICAvLyBhZGRlZCBuZXh0IHRocmVlIHByb3BlcnRpZXMgdG8gd29yayBhcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy80MTA3XG4gICAgICAgIHRoaXMuYXV4ID0gbnVsbDtcbiAgICAgICAgdGhpcy5sb2FkZXIgPSBudWxsO1xuICAgICAgICB0aGlzLnJlZGlyZWN0VG8gPSBudWxsO1xuICAgICAgICB0aGlzLnBhdGggPSBwYXRoO1xuICAgICAgICB0aGlzLmNvbXBvbmVudCA9IGNvbXBvbmVudDtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICAgICAgdGhpcy51c2VBc0RlZmF1bHQgPSB1c2VBc0RlZmF1bHQ7XG4gICAgfVxuICAgIFJvdXRlID0gX19kZWNvcmF0ZShbXG4gICAgICAgIENPTlNUKClcbiAgICBdLCBSb3V0ZSk7XG4gICAgcmV0dXJuIFJvdXRlO1xufSkoKTtcbmV4cG9ydHMuUm91dGUgPSBSb3V0ZTtcbi8qKlxuICogYEF1eFJvdXRlYCBpcyBhIHR5cGUgb2Yge0BsaW5rIFJvdXRlRGVmaW5pdGlvbn0gdXNlZCB0byBkZWZpbmUgYW4gYXV4aWxpYXJ5IHJvdXRlLlxuICpcbiAqIEl0IHRha2VzIGFuIG9iamVjdCB3aXRoIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAqIC0gYHBhdGhgIGlzIGEgc3RyaW5nIHRoYXQgdXNlcyB0aGUgcm91dGUgbWF0Y2hlciBEU0wuXG4gKiAtIGBjb21wb25lbnRgIGEgY29tcG9uZW50IHR5cGUuXG4gKiAtIGBuYW1lYCBpcyBhbiBvcHRpb25hbCBgQ2FtZWxDYXNlYCBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBuYW1lIG9mIHRoZSByb3V0ZS5cbiAqIC0gYGRhdGFgIGlzIGFuIG9wdGlvbmFsIHByb3BlcnR5IG9mIGFueSB0eXBlIHJlcHJlc2VudGluZyBhcmJpdHJhcnkgcm91dGUgbWV0YWRhdGEgZm9yIHRoZSBnaXZlblxuICogcm91dGUuIEl0IGlzIGluamVjdGFibGUgdmlhIHtAbGluayBSb3V0ZURhdGF9LlxuICpcbiAqICMjIyBFeGFtcGxlXG4gKiBgYGBcbiAqIGltcG9ydCB7Um91dGVDb25maWcsIEF1eFJvdXRlfSBmcm9tICdhbmd1bGFyMi9yb3V0ZXInO1xuICpcbiAqIEBSb3V0ZUNvbmZpZyhbXG4gKiAgIG5ldyBBdXhSb3V0ZSh7cGF0aDogJy9ob21lJywgY29tcG9uZW50OiBIb21lQ21wfSlcbiAqIF0pXG4gKiBjbGFzcyBNeUFwcCB7fVxuICogYGBgXG4gKi9cbnZhciBBdXhSb3V0ZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQXV4Um91dGUoX2EpIHtcbiAgICAgICAgdmFyIHBhdGggPSBfYS5wYXRoLCBjb21wb25lbnQgPSBfYS5jb21wb25lbnQsIG5hbWUgPSBfYS5uYW1lO1xuICAgICAgICB0aGlzLmRhdGEgPSBudWxsO1xuICAgICAgICAvLyBhZGRlZCBuZXh0IHRocmVlIHByb3BlcnRpZXMgdG8gd29yayBhcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy80MTA3XG4gICAgICAgIHRoaXMuYXV4ID0gbnVsbDtcbiAgICAgICAgdGhpcy5sb2FkZXIgPSBudWxsO1xuICAgICAgICB0aGlzLnJlZGlyZWN0VG8gPSBudWxsO1xuICAgICAgICB0aGlzLnVzZUFzRGVmYXVsdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnBhdGggPSBwYXRoO1xuICAgICAgICB0aGlzLmNvbXBvbmVudCA9IGNvbXBvbmVudDtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB9XG4gICAgQXV4Um91dGUgPSBfX2RlY29yYXRlKFtcbiAgICAgICAgQ09OU1QoKVxuICAgIF0sIEF1eFJvdXRlKTtcbiAgICByZXR1cm4gQXV4Um91dGU7XG59KSgpO1xuZXhwb3J0cy5BdXhSb3V0ZSA9IEF1eFJvdXRlO1xuLyoqXG4gKiBgQXN5bmNSb3V0ZWAgaXMgYSB0eXBlIG9mIHtAbGluayBSb3V0ZURlZmluaXRpb259IHVzZWQgdG8gcm91dGUgYSBwYXRoIHRvIGFuIGFzeW5jaHJvbm91c2x5XG4gKiBsb2FkZWQgY29tcG9uZW50LlxuICpcbiAqIEl0IGhhcyB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gKiAtIGBwYXRoYCBpcyBhIHN0cmluZyB0aGF0IHVzZXMgdGhlIHJvdXRlIG1hdGNoZXIgRFNMLlxuICogLSBgbG9hZGVyYCBpcyBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHByb21pc2UgdGhhdCByZXNvbHZlcyB0byBhIGNvbXBvbmVudC5cbiAqIC0gYG5hbWVgIGlzIGFuIG9wdGlvbmFsIGBDYW1lbENhc2VgIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIG5hbWUgb2YgdGhlIHJvdXRlLlxuICogLSBgZGF0YWAgaXMgYW4gb3B0aW9uYWwgcHJvcGVydHkgb2YgYW55IHR5cGUgcmVwcmVzZW50aW5nIGFyYml0cmFyeSByb3V0ZSBtZXRhZGF0YSBmb3IgdGhlIGdpdmVuXG4gKiByb3V0ZS4gSXQgaXMgaW5qZWN0YWJsZSB2aWEge0BsaW5rIFJvdXRlRGF0YX0uXG4gKiAtIGB1c2VBc0RlZmF1bHRgIGlzIGEgYm9vbGVhbiB2YWx1ZS4gSWYgYHRydWVgLCB0aGUgY2hpbGQgcm91dGUgd2lsbCBiZSBuYXZpZ2F0ZWQgdG8gaWYgbm8gY2hpbGRcbiAqIHJvdXRlIGlzIHNwZWNpZmllZCBkdXJpbmcgdGhlIG5hdmlnYXRpb24uXG4gKlxuICogIyMjIEV4YW1wbGVcbiAqIGBgYFxuICogaW1wb3J0IHtSb3V0ZUNvbmZpZ30gZnJvbSAnYW5ndWxhcjIvcm91dGVyJztcbiAqXG4gKiBAUm91dGVDb25maWcoW1xuICogICB7cGF0aDogJy9ob21lJywgbG9hZGVyOiAoKSA9PiBQcm9taXNlLnJlc29sdmUoTXlMb2FkZWRDbXApLCBuYW1lOiAnTXlMb2FkZWRDbXAnfVxuICogXSlcbiAqIGNsYXNzIE15QXBwIHt9XG4gKiBgYGBcbiAqL1xudmFyIEFzeW5jUm91dGUgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEFzeW5jUm91dGUoX2EpIHtcbiAgICAgICAgdmFyIHBhdGggPSBfYS5wYXRoLCBsb2FkZXIgPSBfYS5sb2FkZXIsIG5hbWUgPSBfYS5uYW1lLCBkYXRhID0gX2EuZGF0YSwgdXNlQXNEZWZhdWx0ID0gX2EudXNlQXNEZWZhdWx0O1xuICAgICAgICB0aGlzLmF1eCA9IG51bGw7XG4gICAgICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gICAgICAgIHRoaXMubG9hZGVyID0gbG9hZGVyO1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgICAgICB0aGlzLnVzZUFzRGVmYXVsdCA9IHVzZUFzRGVmYXVsdDtcbiAgICB9XG4gICAgQXN5bmNSb3V0ZSA9IF9fZGVjb3JhdGUoW1xuICAgICAgICBDT05TVCgpXG4gICAgXSwgQXN5bmNSb3V0ZSk7XG4gICAgcmV0dXJuIEFzeW5jUm91dGU7XG59KSgpO1xuZXhwb3J0cy5Bc3luY1JvdXRlID0gQXN5bmNSb3V0ZTtcbi8qKlxuICogYFJlZGlyZWN0YCBpcyBhIHR5cGUgb2Yge0BsaW5rIFJvdXRlRGVmaW5pdGlvbn0gdXNlZCB0byByb3V0ZSBhIHBhdGggdG8gYSBjYW5vbmljYWwgcm91dGUuXG4gKlxuICogSXQgaGFzIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAqIC0gYHBhdGhgIGlzIGEgc3RyaW5nIHRoYXQgdXNlcyB0aGUgcm91dGUgbWF0Y2hlciBEU0wuXG4gKiAtIGByZWRpcmVjdFRvYCBpcyBhbiBhcnJheSByZXByZXNlbnRpbmcgdGhlIGxpbmsgRFNMLlxuICpcbiAqIE5vdGUgdGhhdCByZWRpcmVjdHMgKipkbyBub3QqKiBhZmZlY3QgaG93IGxpbmtzIGFyZSBnZW5lcmF0ZWQuIEZvciB0aGF0LCBzZWUgdGhlIGB1c2VBc0RlZmF1bHRgXG4gKiBvcHRpb24uXG4gKlxuICogIyMjIEV4YW1wbGVcbiAqIGBgYFxuICogaW1wb3J0IHtSb3V0ZUNvbmZpZ30gZnJvbSAnYW5ndWxhcjIvcm91dGVyJztcbiAqXG4gKiBAUm91dGVDb25maWcoW1xuICogICB7cGF0aDogJy8nLCByZWRpcmVjdFRvOiBbJy9Ib21lJ10gfSxcbiAqICAge3BhdGg6ICcvaG9tZScsIGNvbXBvbmVudDogSG9tZUNtcCwgbmFtZTogJ0hvbWUnfVxuICogXSlcbiAqIGNsYXNzIE15QXBwIHt9XG4gKiBgYGBcbiAqL1xudmFyIFJlZGlyZWN0ID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBSZWRpcmVjdChfYSkge1xuICAgICAgICB2YXIgcGF0aCA9IF9hLnBhdGgsIHJlZGlyZWN0VG8gPSBfYS5yZWRpcmVjdFRvO1xuICAgICAgICB0aGlzLm5hbWUgPSBudWxsO1xuICAgICAgICAvLyBhZGRlZCBuZXh0IHRocmVlIHByb3BlcnRpZXMgdG8gd29yayBhcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy80MTA3XG4gICAgICAgIHRoaXMubG9hZGVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5kYXRhID0gbnVsbDtcbiAgICAgICAgdGhpcy5hdXggPSBudWxsO1xuICAgICAgICB0aGlzLnVzZUFzRGVmYXVsdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnBhdGggPSBwYXRoO1xuICAgICAgICB0aGlzLnJlZGlyZWN0VG8gPSByZWRpcmVjdFRvO1xuICAgIH1cbiAgICBSZWRpcmVjdCA9IF9fZGVjb3JhdGUoW1xuICAgICAgICBDT05TVCgpXG4gICAgXSwgUmVkaXJlY3QpO1xuICAgIHJldHVybiBSZWRpcmVjdDtcbn0pKCk7XG5leHBvcnRzLlJlZGlyZWN0ID0gUmVkaXJlY3Q7XG52YXIgaW5zdHJ1Y3Rpb25fMSA9IHJlcXVpcmUoJy4vaW5zdHJ1Y3Rpb24nKTtcbnZhciBBc3luY1JvdXRlSGFuZGxlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQXN5bmNSb3V0ZUhhbmRsZXIoX2xvYWRlciwgZGF0YSkge1xuICAgICAgICBpZiAoZGF0YSA9PT0gdm9pZCAwKSB7IGRhdGEgPSBudWxsOyB9XG4gICAgICAgIHRoaXMuX2xvYWRlciA9IF9sb2FkZXI7XG4gICAgICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICAgICAgdGhpcy5fcmVzb2x2ZWRDb21wb25lbnQgPSBudWxsO1xuICAgICAgICB0aGlzLmRhdGEgPSBpc1ByZXNlbnQoZGF0YSkgPyBuZXcgaW5zdHJ1Y3Rpb25fMS5Sb3V0ZURhdGEoZGF0YSkgOiBpbnN0cnVjdGlvbl8xLkJMQU5LX1JPVVRFX0RBVEE7XG4gICAgfVxuICAgIEFzeW5jUm91dGVIYW5kbGVyLnByb3RvdHlwZS5yZXNvbHZlQ29tcG9uZW50VHlwZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgaWYgKGlzUHJlc2VudCh0aGlzLl9yZXNvbHZlZENvbXBvbmVudCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZXNvbHZlZENvbXBvbmVudDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fcmVzb2x2ZWRDb21wb25lbnQgPSB0aGlzLl9sb2FkZXIoKS50aGVuKGZ1bmN0aW9uIChjb21wb25lbnRUeXBlKSB7XG4gICAgICAgICAgICBfdGhpcy5jb21wb25lbnRUeXBlID0gY29tcG9uZW50VHlwZTtcbiAgICAgICAgICAgIHJldHVybiBjb21wb25lbnRUeXBlO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHJldHVybiBBc3luY1JvdXRlSGFuZGxlcjtcbn0pKCk7XG5leHBvcnRzLkFzeW5jUm91dGVIYW5kbGVyID0gQXN5bmNSb3V0ZUhhbmRsZXI7XG52YXIgaW5zdHJ1Y3Rpb25fMSA9IHJlcXVpcmUoJy4vaW5zdHJ1Y3Rpb24nKTtcbnZhciBTeW5jUm91dGVIYW5kbGVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTeW5jUm91dGVIYW5kbGVyKGNvbXBvbmVudFR5cGUsIGRhdGEpIHtcbiAgICAgICAgdGhpcy5jb21wb25lbnRUeXBlID0gY29tcG9uZW50VHlwZTtcbiAgICAgICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgICAgICB0aGlzLl9yZXNvbHZlZENvbXBvbmVudCA9IG51bGw7XG4gICAgICAgIHRoaXMuX3Jlc29sdmVkQ29tcG9uZW50ID0gUHJvbWlzZVdyYXBwZXIucmVzb2x2ZShjb21wb25lbnRUeXBlKTtcbiAgICAgICAgdGhpcy5kYXRhID0gaXNQcmVzZW50KGRhdGEpID8gbmV3IGluc3RydWN0aW9uXzEuUm91dGVEYXRhKGRhdGEpIDogaW5zdHJ1Y3Rpb25fMS5CTEFOS19ST1VURV9EQVRBO1xuICAgIH1cbiAgICBTeW5jUm91dGVIYW5kbGVyLnByb3RvdHlwZS5yZXNvbHZlQ29tcG9uZW50VHlwZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3Jlc29sdmVkQ29tcG9uZW50OyB9O1xuICAgIHJldHVybiBTeW5jUm91dGVIYW5kbGVyO1xufSkoKTtcbmV4cG9ydHMuU3luY1JvdXRlSGFuZGxlciA9IFN5bmNSb3V0ZUhhbmRsZXI7XG52YXIgcm91dGVfcmVjb2duaXplcl8xID0gcmVxdWlyZSgnLi9yb3V0ZV9yZWNvZ25pemVyJyk7XG52YXIgcm91dGVfY29uZmlnX2ltcGxfMSA9IHJlcXVpcmUoJy4vcm91dGVfY29uZmlnX2ltcGwnKTtcbnZhciBhc3luY19yb3V0ZV9oYW5kbGVyXzEgPSByZXF1aXJlKCcuL2FzeW5jX3JvdXRlX2hhbmRsZXInKTtcbnZhciBzeW5jX3JvdXRlX2hhbmRsZXJfMSA9IHJlcXVpcmUoJy4vc3luY19yb3V0ZV9oYW5kbGVyJyk7XG4vKipcbiAqIGBDb21wb25lbnRSZWNvZ25pemVyYCBpcyByZXNwb25zaWJsZSBmb3IgcmVjb2duaXppbmcgcm91dGVzIGZvciBhIHNpbmdsZSBjb21wb25lbnQuXG4gKiBJdCBpcyBjb25zdW1lZCBieSBgUm91dGVSZWdpc3RyeWAsIHdoaWNoIGtub3dzIGhvdyB0byByZWNvZ25pemUgYW4gZW50aXJlIGhpZXJhcmNoeSBvZlxuICogY29tcG9uZW50cy5cbiAqL1xudmFyIENvbXBvbmVudFJlY29nbml6ZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIENvbXBvbmVudFJlY29nbml6ZXIoKSB7XG4gICAgICAgIHRoaXMubmFtZXMgPSBuZXcgTWFwKCk7XG4gICAgICAgIC8vIG1hcCBmcm9tIG5hbWUgdG8gcmVjb2duaXplclxuICAgICAgICB0aGlzLmF1eE5hbWVzID0gbmV3IE1hcCgpO1xuICAgICAgICAvLyBtYXAgZnJvbSBzdGFydGluZyBwYXRoIHRvIHJlY29nbml6ZXJcbiAgICAgICAgdGhpcy5hdXhSb3V0ZXMgPSBuZXcgTWFwKCk7XG4gICAgICAgIC8vIFRPRE86IG9wdGltaXplIHRoaXMgaW50byBhIHRyaWVcbiAgICAgICAgdGhpcy5tYXRjaGVycyA9IFtdO1xuICAgICAgICB0aGlzLmRlZmF1bHRSb3V0ZSA9IG51bGw7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIHJldHVybnMgd2hldGhlciBvciBub3QgdGhlIGNvbmZpZyBpcyB0ZXJtaW5hbFxuICAgICAqL1xuICAgIENvbXBvbmVudFJlY29nbml6ZXIucHJvdG90eXBlLmNvbmZpZyA9IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgdmFyIGhhbmRsZXI7XG4gICAgICAgIGlmIChpc1ByZXNlbnQoY29uZmlnLm5hbWUpICYmIGNvbmZpZy5uYW1lWzBdLnRvVXBwZXJDYXNlKCkgIT0gY29uZmlnLm5hbWVbMF0pIHtcbiAgICAgICAgICAgIHZhciBzdWdnZXN0ZWROYW1lID0gY29uZmlnLm5hbWVbMF0udG9VcHBlckNhc2UoKSArIGNvbmZpZy5uYW1lLnN1YnN0cmluZygxKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiUm91dGUgXFxcIlwiICsgY29uZmlnLnBhdGggKyBcIlxcXCIgd2l0aCBuYW1lIFxcXCJcIiArIGNvbmZpZy5uYW1lICsgXCJcXFwiIGRvZXMgbm90IGJlZ2luIHdpdGggYW4gdXBwZXJjYXNlIGxldHRlci4gUm91dGUgbmFtZXMgc2hvdWxkIGJlIENhbWVsQ2FzZSBsaWtlIFxcXCJcIiArIHN1Z2dlc3RlZE5hbWUgKyBcIlxcXCIuXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25maWcgaW5zdGFuY2VvZiByb3V0ZV9jb25maWdfaW1wbF8xLkF1eFJvdXRlKSB7XG4gICAgICAgICAgICBoYW5kbGVyID0gbmV3IHN5bmNfcm91dGVfaGFuZGxlcl8xLlN5bmNSb3V0ZUhhbmRsZXIoY29uZmlnLmNvbXBvbmVudCwgY29uZmlnLmRhdGEpO1xuICAgICAgICAgICAgdmFyIHBhdGggPSBjb25maWcucGF0aC5zdGFydHNXaXRoKCcvJykgPyBjb25maWcucGF0aC5zdWJzdHJpbmcoMSkgOiBjb25maWcucGF0aDtcbiAgICAgICAgICAgIHZhciByZWNvZ25pemVyID0gbmV3IHJvdXRlX3JlY29nbml6ZXJfMS5Sb3V0ZVJlY29nbml6ZXIoY29uZmlnLnBhdGgsIGhhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5hdXhSb3V0ZXMuc2V0KHBhdGgsIHJlY29nbml6ZXIpO1xuICAgICAgICAgICAgaWYgKGlzUHJlc2VudChjb25maWcubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmF1eE5hbWVzLnNldChjb25maWcubmFtZSwgcmVjb2duaXplcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVjb2duaXplci50ZXJtaW5hbDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdXNlQXNEZWZhdWx0ID0gZmFsc2U7XG4gICAgICAgIGlmIChjb25maWcgaW5zdGFuY2VvZiByb3V0ZV9jb25maWdfaW1wbF8xLlJlZGlyZWN0KSB7XG4gICAgICAgICAgICB2YXIgcmVkaXJlY3RvciA9IG5ldyByb3V0ZV9yZWNvZ25pemVyXzEuUmVkaXJlY3RSZWNvZ25pemVyKGNvbmZpZy5wYXRoLCBjb25maWcucmVkaXJlY3RUbyk7XG4gICAgICAgICAgICB0aGlzLl9hc3NlcnROb0hhc2hDb2xsaXNpb24ocmVkaXJlY3Rvci5oYXNoLCBjb25maWcucGF0aCk7XG4gICAgICAgICAgICB0aGlzLm1hdGNoZXJzLnB1c2gocmVkaXJlY3Rvcik7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29uZmlnIGluc3RhbmNlb2Ygcm91dGVfY29uZmlnX2ltcGxfMS5Sb3V0ZSkge1xuICAgICAgICAgICAgaGFuZGxlciA9IG5ldyBzeW5jX3JvdXRlX2hhbmRsZXJfMS5TeW5jUm91dGVIYW5kbGVyKGNvbmZpZy5jb21wb25lbnQsIGNvbmZpZy5kYXRhKTtcbiAgICAgICAgICAgIHVzZUFzRGVmYXVsdCA9IGlzUHJlc2VudChjb25maWcudXNlQXNEZWZhdWx0KSAmJiBjb25maWcudXNlQXNEZWZhdWx0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGNvbmZpZyBpbnN0YW5jZW9mIHJvdXRlX2NvbmZpZ19pbXBsXzEuQXN5bmNSb3V0ZSkge1xuICAgICAgICAgICAgaGFuZGxlciA9IG5ldyBhc3luY19yb3V0ZV9oYW5kbGVyXzEuQXN5bmNSb3V0ZUhhbmRsZXIoY29uZmlnLmxvYWRlciwgY29uZmlnLmRhdGEpO1xuICAgICAgICAgICAgdXNlQXNEZWZhdWx0ID0gaXNQcmVzZW50KGNvbmZpZy51c2VBc0RlZmF1bHQpICYmIGNvbmZpZy51c2VBc0RlZmF1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlY29nbml6ZXIgPSBuZXcgcm91dGVfcmVjb2duaXplcl8xLlJvdXRlUmVjb2duaXplcihjb25maWcucGF0aCwgaGFuZGxlcik7XG4gICAgICAgIHRoaXMuX2Fzc2VydE5vSGFzaENvbGxpc2lvbihyZWNvZ25pemVyLmhhc2gsIGNvbmZpZy5wYXRoKTtcbiAgICAgICAgaWYgKHVzZUFzRGVmYXVsdCkge1xuICAgICAgICAgICAgaWYgKGlzUHJlc2VudCh0aGlzLmRlZmF1bHRSb3V0ZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcIk9ubHkgb25lIHJvdXRlIGNhbiBiZSBkZWZhdWx0XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5kZWZhdWx0Um91dGUgPSByZWNvZ25pemVyO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubWF0Y2hlcnMucHVzaChyZWNvZ25pemVyKTtcbiAgICAgICAgaWYgKGlzUHJlc2VudChjb25maWcubmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMubmFtZXMuc2V0KGNvbmZpZy5uYW1lLCByZWNvZ25pemVyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVjb2duaXplci50ZXJtaW5hbDtcbiAgICB9O1xuICAgIENvbXBvbmVudFJlY29nbml6ZXIucHJvdG90eXBlLl9hc3NlcnROb0hhc2hDb2xsaXNpb24gPSBmdW5jdGlvbiAoaGFzaCwgcGF0aCkge1xuICAgICAgICB0aGlzLm1hdGNoZXJzLmZvckVhY2goZnVuY3Rpb24gKG1hdGNoZXIpIHtcbiAgICAgICAgICAgIGlmIChoYXNoID09IG1hdGNoZXIuaGFzaCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiQ29uZmlndXJhdGlvbiAnXCIgKyBwYXRoICsgXCInIGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIHJvdXRlICdcIiArIG1hdGNoZXIucGF0aCArIFwiJ1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBHaXZlbiBhIFVSTCwgcmV0dXJucyBhIGxpc3Qgb2YgYFJvdXRlTWF0Y2hgZXMsIHdoaWNoIGFyZSBwYXJ0aWFsIHJlY29nbml0aW9ucyBmb3Igc29tZSByb3V0ZS5cbiAgICAgKi9cbiAgICBDb21wb25lbnRSZWNvZ25pemVyLnByb3RvdHlwZS5yZWNvZ25pemUgPSBmdW5jdGlvbiAodXJsUGFyc2UpIHtcbiAgICAgICAgdmFyIHNvbHV0aW9ucyA9IFtdO1xuICAgICAgICB0aGlzLm1hdGNoZXJzLmZvckVhY2goZnVuY3Rpb24gKHJvdXRlUmVjb2duaXplcikge1xuICAgICAgICAgICAgdmFyIHBhdGhNYXRjaCA9IHJvdXRlUmVjb2duaXplci5yZWNvZ25pemUodXJsUGFyc2UpO1xuICAgICAgICAgICAgaWYgKGlzUHJlc2VudChwYXRoTWF0Y2gpKSB7XG4gICAgICAgICAgICAgICAgc29sdXRpb25zLnB1c2gocGF0aE1hdGNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGhhbmRsZSBjYXNlcyB3aGVyZSB3ZSBhcmUgcm91dGluZyBqdXN0IHRvIGFuIGF1eCByb3V0ZVxuICAgICAgICBpZiAoc29sdXRpb25zLmxlbmd0aCA9PSAwICYmIGlzUHJlc2VudCh1cmxQYXJzZSkgJiYgdXJsUGFyc2UuYXV4aWxpYXJ5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBbUHJvbWlzZVdyYXBwZXIucmVzb2x2ZShuZXcgcm91dGVfcmVjb2duaXplcl8xLlBhdGhNYXRjaChudWxsLCBudWxsLCB1cmxQYXJzZS5hdXhpbGlhcnkpKV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNvbHV0aW9ucztcbiAgICB9O1xuICAgIENvbXBvbmVudFJlY29nbml6ZXIucHJvdG90eXBlLnJlY29nbml6ZUF1eGlsaWFyeSA9IGZ1bmN0aW9uICh1cmxQYXJzZSkge1xuICAgICAgICB2YXIgcm91dGVSZWNvZ25pemVyID0gdGhpcy5hdXhSb3V0ZXMuZ2V0KHVybFBhcnNlLnBhdGgpO1xuICAgICAgICBpZiAoaXNQcmVzZW50KHJvdXRlUmVjb2duaXplcikpIHtcbiAgICAgICAgICAgIHJldHVybiBbcm91dGVSZWNvZ25pemVyLnJlY29nbml6ZSh1cmxQYXJzZSldO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbUHJvbWlzZVdyYXBwZXIucmVzb2x2ZShudWxsKV07XG4gICAgfTtcbiAgICBDb21wb25lbnRSZWNvZ25pemVyLnByb3RvdHlwZS5oYXNSb3V0ZSA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiB0aGlzLm5hbWVzLmhhcyhuYW1lKTsgfTtcbiAgICBDb21wb25lbnRSZWNvZ25pemVyLnByb3RvdHlwZS5jb21wb25lbnRMb2FkZWQgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5oYXNSb3V0ZShuYW1lKSAmJiBpc1ByZXNlbnQodGhpcy5uYW1lcy5nZXQobmFtZSkuaGFuZGxlci5jb21wb25lbnRUeXBlKTtcbiAgICB9O1xuICAgIENvbXBvbmVudFJlY29nbml6ZXIucHJvdG90eXBlLmxvYWRDb21wb25lbnQgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5uYW1lcy5nZXQobmFtZSkuaGFuZGxlci5yZXNvbHZlQ29tcG9uZW50VHlwZSgpO1xuICAgIH07XG4gICAgQ29tcG9uZW50UmVjb2duaXplci5wcm90b3R5cGUuZ2VuZXJhdGUgPSBmdW5jdGlvbiAobmFtZSwgcGFyYW1zKSB7XG4gICAgICAgIHZhciBwYXRoUmVjb2duaXplciA9IHRoaXMubmFtZXMuZ2V0KG5hbWUpO1xuICAgICAgICBpZiAoaXNCbGFuayhwYXRoUmVjb2duaXplcikpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXRoUmVjb2duaXplci5nZW5lcmF0ZShwYXJhbXMpO1xuICAgIH07XG4gICAgQ29tcG9uZW50UmVjb2duaXplci5wcm90b3R5cGUuZ2VuZXJhdGVBdXhpbGlhcnkgPSBmdW5jdGlvbiAobmFtZSwgcGFyYW1zKSB7XG4gICAgICAgIHZhciBwYXRoUmVjb2duaXplciA9IHRoaXMuYXV4TmFtZXMuZ2V0KG5hbWUpO1xuICAgICAgICBpZiAoaXNCbGFuayhwYXRoUmVjb2duaXplcikpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXRoUmVjb2duaXplci5nZW5lcmF0ZShwYXJhbXMpO1xuICAgIH07XG4gICAgcmV0dXJuIENvbXBvbmVudFJlY29nbml6ZXI7XG59KSgpO1xuZXhwb3J0cy5Db21wb25lbnRSZWNvZ25pemVyID0gQ29tcG9uZW50UmVjb2duaXplcjtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xuLyoqXG4gKiBgUm91dGVQYXJhbXNgIGlzIGFuIGltbXV0YWJsZSBtYXAgb2YgcGFyYW1ldGVycyBmb3IgdGhlIGdpdmVuIHJvdXRlXG4gKiBiYXNlZCBvbiB0aGUgdXJsIG1hdGNoZXIgYW5kIG9wdGlvbmFsIHBhcmFtZXRlcnMgZm9yIHRoYXQgcm91dGUuXG4gKlxuICogWW91IGNhbiBpbmplY3QgYFJvdXRlUGFyYW1zYCBpbnRvIHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNvbXBvbmVudCB0byB1c2UgaXQuXG4gKlxuICogIyMjIEV4YW1wbGVcbiAqXG4gKiBgYGBcbiAqIGltcG9ydCB7Q29tcG9uZW50fSBmcm9tICdhbmd1bGFyMi9jb3JlJztcbiAqIGltcG9ydCB7Ym9vdHN0cmFwfSBmcm9tICdhbmd1bGFyMi9wbGF0Zm9ybS9icm93c2VyJztcbiAqIGltcG9ydCB7Um91dGVyLCBST1VURVJfRElSRUNUSVZFUywgUk9VVEVSX1BST1ZJREVSUywgUm91dGVDb25maWd9IGZyb20gJ2FuZ3VsYXIyL3JvdXRlcic7XG4gKlxuICogQENvbXBvbmVudCh7ZGlyZWN0aXZlczogW1JPVVRFUl9ESVJFQ1RJVkVTXX0pXG4gKiBAUm91dGVDb25maWcoW1xuICogIHtwYXRoOiAnL3VzZXIvOmlkJywgY29tcG9uZW50OiBVc2VyQ21wLCBhczogJ1VzZXJDbXAnfSxcbiAqIF0pXG4gKiBjbGFzcyBBcHBDbXAge31cbiAqXG4gKiBAQ29tcG9uZW50KHsgdGVtcGxhdGU6ICd1c2VyOiB7e2lkfX0nIH0pXG4gKiBjbGFzcyBVc2VyQ21wIHtcbiAqICAgaWQ6IHN0cmluZztcbiAqICAgY29uc3RydWN0b3IocGFyYW1zOiBSb3V0ZVBhcmFtcykge1xuICogICAgIHRoaXMuaWQgPSBwYXJhbXMuZ2V0KCdpZCcpO1xuICogICB9XG4gKiB9XG4gKlxuICogYm9vdHN0cmFwKEFwcENtcCwgUk9VVEVSX1BST1ZJREVSUyk7XG4gKiBgYGBcbiAqL1xudmFyIFJvdXRlUGFyYW1zID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBSb3V0ZVBhcmFtcyhwYXJhbXMpIHtcbiAgICAgICAgdGhpcy5wYXJhbXMgPSBwYXJhbXM7XG4gICAgfVxuICAgIFJvdXRlUGFyYW1zLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAocGFyYW0pIHsgcmV0dXJuIG5vcm1hbGl6ZUJsYW5rKFN0cmluZ01hcFdyYXBwZXIuZ2V0KHRoaXMucGFyYW1zLCBwYXJhbSkpOyB9O1xuICAgIHJldHVybiBSb3V0ZVBhcmFtcztcbn0pKCk7XG5leHBvcnRzLlJvdXRlUGFyYW1zID0gUm91dGVQYXJhbXM7XG4vKipcbiAqIGBSb3V0ZURhdGFgIGlzIGFuIGltbXV0YWJsZSBtYXAgb2YgYWRkaXRpb25hbCBkYXRhIHlvdSBjYW4gY29uZmlndXJlIGluIHlvdXIge0BsaW5rIFJvdXRlfS5cbiAqXG4gKiBZb3UgY2FuIGluamVjdCBgUm91dGVEYXRhYCBpbnRvIHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNvbXBvbmVudCB0byB1c2UgaXQuXG4gKlxuICogIyMjIEV4YW1wbGVcbiAqXG4gKiBgYGBcbiAqIGltcG9ydCB7Q29tcG9uZW50LCBWaWV3fSBmcm9tICdhbmd1bGFyMi9jb3JlJztcbiAqIGltcG9ydCB7Ym9vdHN0cmFwfSBmcm9tICdhbmd1bGFyMi9wbGF0Zm9ybS9icm93c2VyJztcbiAqIGltcG9ydCB7Um91dGVyLCBST1VURVJfRElSRUNUSVZFUywgcm91dGVyQmluZGluZ3MsIFJvdXRlQ29uZmlnfSBmcm9tICdhbmd1bGFyMi9yb3V0ZXInO1xuICpcbiAqIEBDb21wb25lbnQoey4uLn0pXG4gKiBAVmlldyh7ZGlyZWN0aXZlczogW1JPVVRFUl9ESVJFQ1RJVkVTXX0pXG4gKiBAUm91dGVDb25maWcoW1xuICogIHtwYXRoOiAnL3VzZXIvOmlkJywgY29tcG9uZW50OiBVc2VyQ21wLCBhczogJ1VzZXJDbXAnLCBkYXRhOiB7aXNBZG1pbjogdHJ1ZX19LFxuICogXSlcbiAqIGNsYXNzIEFwcENtcCB7fVxuICpcbiAqIEBDb21wb25lbnQoey4uLn0pXG4gKiBAVmlldyh7IHRlbXBsYXRlOiAndXNlcjoge3tpc0FkbWlufX0nIH0pXG4gKiBjbGFzcyBVc2VyQ21wIHtcbiAqICAgc3RyaW5nOiBpc0FkbWluO1xuICogICBjb25zdHJ1Y3RvcihkYXRhOiBSb3V0ZURhdGEpIHtcbiAqICAgICB0aGlzLmlzQWRtaW4gPSBkYXRhLmdldCgnaXNBZG1pbicpO1xuICogICB9XG4gKiB9XG4gKlxuICogYm9vdHN0cmFwKEFwcENtcCwgcm91dGVyQmluZGluZ3MoQXBwQ21wKSk7XG4gKiBgYGBcbiAqL1xudmFyIFJvdXRlRGF0YSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gUm91dGVEYXRhKGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEgPT09IHZvaWQgMCkgeyBkYXRhID0gQ09OU1RfRVhQUih7fSk7IH1cbiAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICB9XG4gICAgUm91dGVEYXRhLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7IHJldHVybiBub3JtYWxpemVCbGFuayhTdHJpbmdNYXBXcmFwcGVyLmdldCh0aGlzLmRhdGEsIGtleSkpOyB9O1xuICAgIHJldHVybiBSb3V0ZURhdGE7XG59KSgpO1xuZXhwb3J0cy5Sb3V0ZURhdGEgPSBSb3V0ZURhdGE7XG5leHBvcnRzLkJMQU5LX1JPVVRFX0RBVEEgPSBuZXcgUm91dGVEYXRhKCk7XG4vKipcbiAqIGBJbnN0cnVjdGlvbmAgaXMgYSB0cmVlIG9mIHtAbGluayBDb21wb25lbnRJbnN0cnVjdGlvbn1zIHdpdGggYWxsIHRoZSBpbmZvcm1hdGlvbiBuZWVkZWRcbiAqIHRvIHRyYW5zaXRpb24gZWFjaCBjb21wb25lbnQgaW4gdGhlIGFwcCB0byBhIGdpdmVuIHJvdXRlLCBpbmNsdWRpbmcgYWxsIGF1eGlsaWFyeSByb3V0ZXMuXG4gKlxuICogYEluc3RydWN0aW9uYHMgY2FuIGJlIGNyZWF0ZWQgdXNpbmcge0BsaW5rIFJvdXRlciNnZW5lcmF0ZX0sIGFuZCBjYW4gYmUgdXNlZCB0b1xuICogcGVyZm9ybSByb3V0ZSBjaGFuZ2VzIHdpdGgge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5SW5zdHJ1Y3Rpb259LlxuICpcbiAqICMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBpbXBvcnQge0NvbXBvbmVudH0gZnJvbSAnYW5ndWxhcjIvY29yZSc7XG4gKiBpbXBvcnQge2Jvb3RzdHJhcH0gZnJvbSAnYW5ndWxhcjIvcGxhdGZvcm0vYnJvd3Nlcic7XG4gKiBpbXBvcnQge1JvdXRlciwgUk9VVEVSX0RJUkVDVElWRVMsIFJPVVRFUl9QUk9WSURFUlMsIFJvdXRlQ29uZmlnfSBmcm9tICdhbmd1bGFyMi9yb3V0ZXInO1xuICpcbiAqIEBDb21wb25lbnQoe2RpcmVjdGl2ZXM6IFtST1VURVJfRElSRUNUSVZFU119KVxuICogQFJvdXRlQ29uZmlnKFtcbiAqICB7Li4ufSxcbiAqIF0pXG4gKiBjbGFzcyBBcHBDbXAge1xuICogICBjb25zdHJ1Y3Rvcihyb3V0ZXI6IFJvdXRlcikge1xuICogICAgIHZhciBpbnN0cnVjdGlvbiA9IHJvdXRlci5nZW5lcmF0ZShbJy9NeVJvdXRlJ10pO1xuICogICAgIHJvdXRlci5uYXZpZ2F0ZUJ5SW5zdHJ1Y3Rpb24oaW5zdHJ1Y3Rpb24pO1xuICogICB9XG4gKiB9XG4gKlxuICogYm9vdHN0cmFwKEFwcENtcCwgUk9VVEVSX1BST1ZJREVSUyk7XG4gKiBgYGBcbiAqL1xudmFyIEluc3RydWN0aW9uID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBJbnN0cnVjdGlvbigpIHtcbiAgICAgICAgdGhpcy5hdXhJbnN0cnVjdGlvbiA9IHt9O1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoSW5zdHJ1Y3Rpb24ucHJvdG90eXBlLCBcInVybFBhdGhcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGlzUHJlc2VudCh0aGlzLmNvbXBvbmVudCkgPyB0aGlzLmNvbXBvbmVudC51cmxQYXRoIDogJyc7IH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShJbnN0cnVjdGlvbi5wcm90b3R5cGUsIFwidXJsUGFyYW1zXCIsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBpc1ByZXNlbnQodGhpcy5jb21wb25lbnQpID8gdGhpcy5jb21wb25lbnQudXJsUGFyYW1zIDogW107IH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShJbnN0cnVjdGlvbi5wcm90b3R5cGUsIFwic3BlY2lmaWNpdHlcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB0b3RhbCA9ICcnO1xuICAgICAgICAgICAgaWYgKGlzUHJlc2VudCh0aGlzLmNvbXBvbmVudCkpIHtcbiAgICAgICAgICAgICAgICB0b3RhbCArPSB0aGlzLmNvbXBvbmVudC5zcGVjaWZpY2l0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc1ByZXNlbnQodGhpcy5jaGlsZCkpIHtcbiAgICAgICAgICAgICAgICB0b3RhbCArPSB0aGlzLmNoaWxkLnNwZWNpZmljaXR5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xuICAgICAgICB9LFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbiAgICAvKipcbiAgICAgKiBjb252ZXJ0cyB0aGUgaW5zdHJ1Y3Rpb24gaW50byBhIFVSTCBzdHJpbmdcbiAgICAgKi9cbiAgICBJbnN0cnVjdGlvbi5wcm90b3R5cGUudG9Sb290VXJsID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy50b1VybFBhdGgoKSArIHRoaXMudG9VcmxRdWVyeSgpOyB9O1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBJbnN0cnVjdGlvbi5wcm90b3R5cGUuX3RvTm9uUm9vdFVybCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0cmluZ2lmeVBhdGhNYXRyaXhBdXhQcmVmaXhlZCgpICtcbiAgICAgICAgICAgIChpc1ByZXNlbnQodGhpcy5jaGlsZCkgPyB0aGlzLmNoaWxkLl90b05vblJvb3RVcmwoKSA6ICcnKTtcbiAgICB9O1xuICAgIEluc3RydWN0aW9uLnByb3RvdHlwZS50b1VybFF1ZXJ5ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy51cmxQYXJhbXMubGVuZ3RoID4gMCA/ICgnPycgKyB0aGlzLnVybFBhcmFtcy5qb2luKCcmJykpIDogJyc7IH07XG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIG5ldyBpbnN0cnVjdGlvbiB0aGF0IHNoYXJlcyB0aGUgc3RhdGUgb2YgdGhlIGV4aXN0aW5nIGluc3RydWN0aW9uLCBidXQgd2l0aFxuICAgICAqIHRoZSBnaXZlbiBjaGlsZCB7QGxpbmsgSW5zdHJ1Y3Rpb259IHJlcGxhY2luZyB0aGUgZXhpc3RpbmcgY2hpbGQuXG4gICAgICovXG4gICAgSW5zdHJ1Y3Rpb24ucHJvdG90eXBlLnJlcGxhY2VDaGlsZCA9IGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICByZXR1cm4gbmV3IFJlc29sdmVkSW5zdHJ1Y3Rpb24odGhpcy5jb21wb25lbnQsIGNoaWxkLCB0aGlzLmF1eEluc3RydWN0aW9uKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIElmIHRoZSBmaW5hbCBVUkwgZm9yIHRoZSBpbnN0cnVjdGlvbiBpcyBgYFxuICAgICAqL1xuICAgIEluc3RydWN0aW9uLnByb3RvdHlwZS50b1VybFBhdGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnVybFBhdGggKyB0aGlzLl9zdHJpbmdpZnlBdXgoKSArXG4gICAgICAgICAgICAoaXNQcmVzZW50KHRoaXMuY2hpbGQpID8gdGhpcy5jaGlsZC5fdG9Ob25Sb290VXJsKCkgOiAnJyk7XG4gICAgfTtcbiAgICAvLyBkZWZhdWx0IGluc3RydWN0aW9ucyBvdmVycmlkZSB0aGVzZVxuICAgIEluc3RydWN0aW9uLnByb3RvdHlwZS50b0xpbmtVcmwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnVybFBhdGggKyB0aGlzLl9zdHJpbmdpZnlBdXgoKSArXG4gICAgICAgICAgICAoaXNQcmVzZW50KHRoaXMuY2hpbGQpID8gdGhpcy5jaGlsZC5fdG9MaW5rVXJsKCkgOiAnJyk7XG4gICAgfTtcbiAgICAvLyB0aGlzIGlzIHRoZSBub24tcm9vdCB2ZXJzaW9uIChjYWxsZWQgcmVjdXJzaXZlbHkpXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIEluc3RydWN0aW9uLnByb3RvdHlwZS5fdG9MaW5rVXJsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RyaW5naWZ5UGF0aE1hdHJpeEF1eFByZWZpeGVkKCkgK1xuICAgICAgICAgICAgKGlzUHJlc2VudCh0aGlzLmNoaWxkKSA/IHRoaXMuY2hpbGQuX3RvTGlua1VybCgpIDogJycpO1xuICAgIH07XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIEluc3RydWN0aW9uLnByb3RvdHlwZS5fc3RyaW5naWZ5UGF0aE1hdHJpeEF1eFByZWZpeGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcHJpbWFyeSA9IHRoaXMuX3N0cmluZ2lmeVBhdGhNYXRyaXhBdXgoKTtcbiAgICAgICAgaWYgKHByaW1hcnkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcHJpbWFyeSA9ICcvJyArIHByaW1hcnk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByaW1hcnk7XG4gICAgfTtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgSW5zdHJ1Y3Rpb24ucHJvdG90eXBlLl9zdHJpbmdpZnlNYXRyaXhQYXJhbXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnVybFBhcmFtcy5sZW5ndGggPiAwID8gKCc7JyArIHRoaXMudXJsUGFyYW1zLmpvaW4oJzsnKSkgOiAnJztcbiAgICB9O1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBJbnN0cnVjdGlvbi5wcm90b3R5cGUuX3N0cmluZ2lmeVBhdGhNYXRyaXhBdXggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChpc0JsYW5rKHRoaXMuY29tcG9uZW50KSkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnVybFBhdGggKyB0aGlzLl9zdHJpbmdpZnlNYXRyaXhQYXJhbXMoKSArIHRoaXMuX3N0cmluZ2lmeUF1eCgpO1xuICAgIH07XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIEluc3RydWN0aW9uLnByb3RvdHlwZS5fc3RyaW5naWZ5QXV4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcm91dGVzID0gW107XG4gICAgICAgIFN0cmluZ01hcFdyYXBwZXIuZm9yRWFjaCh0aGlzLmF1eEluc3RydWN0aW9uLCBmdW5jdGlvbiAoYXV4SW5zdHJ1Y3Rpb24sIF8pIHtcbiAgICAgICAgICAgIHJvdXRlcy5wdXNoKGF1eEluc3RydWN0aW9uLl9zdHJpbmdpZnlQYXRoTWF0cml4QXV4KCkpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHJvdXRlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJygnICsgcm91dGVzLmpvaW4oJy8vJykgKyAnKSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH07XG4gICAgcmV0dXJuIEluc3RydWN0aW9uO1xufSkoKTtcbmV4cG9ydHMuSW5zdHJ1Y3Rpb24gPSBJbnN0cnVjdGlvbjtcbi8qKlxuICogYSByZXNvbHZlZCBpbnN0cnVjdGlvbiBoYXMgYW4gb3V0bGV0IGluc3RydWN0aW9uIGZvciBpdHNlbGYsIGJ1dCBtYXliZSBub3QgZm9yLi4uXG4gKi9cbnZhciBSZXNvbHZlZEluc3RydWN0aW9uID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoUmVzb2x2ZWRJbnN0cnVjdGlvbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBSZXNvbHZlZEluc3RydWN0aW9uKGNvbXBvbmVudCwgY2hpbGQsIGF1eEluc3RydWN0aW9uKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLmNvbXBvbmVudCA9IGNvbXBvbmVudDtcbiAgICAgICAgdGhpcy5jaGlsZCA9IGNoaWxkO1xuICAgICAgICB0aGlzLmF1eEluc3RydWN0aW9uID0gYXV4SW5zdHJ1Y3Rpb247XG4gICAgfVxuICAgIFJlc29sdmVkSW5zdHJ1Y3Rpb24ucHJvdG90eXBlLnJlc29sdmVDb21wb25lbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlV3JhcHBlci5yZXNvbHZlKHRoaXMuY29tcG9uZW50KTtcbiAgICB9O1xuICAgIHJldHVybiBSZXNvbHZlZEluc3RydWN0aW9uO1xufSkoSW5zdHJ1Y3Rpb24pO1xuZXhwb3J0cy5SZXNvbHZlZEluc3RydWN0aW9uID0gUmVzb2x2ZWRJbnN0cnVjdGlvbjtcbi8qKlxuICogUmVwcmVzZW50cyBhIHJlc29sdmVkIGRlZmF1bHQgcm91dGVcbiAqL1xudmFyIERlZmF1bHRJbnN0cnVjdGlvbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKERlZmF1bHRJbnN0cnVjdGlvbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBEZWZhdWx0SW5zdHJ1Y3Rpb24oY29tcG9uZW50LCBjaGlsZCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5jb21wb25lbnQgPSBjb21wb25lbnQ7XG4gICAgICAgIHRoaXMuY2hpbGQgPSBjaGlsZDtcbiAgICB9XG4gICAgRGVmYXVsdEluc3RydWN0aW9uLnByb3RvdHlwZS5yZXNvbHZlQ29tcG9uZW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZVdyYXBwZXIucmVzb2x2ZSh0aGlzLmNvbXBvbmVudCk7XG4gICAgfTtcbiAgICBEZWZhdWx0SW5zdHJ1Y3Rpb24ucHJvdG90eXBlLnRvTGlua1VybCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcnOyB9O1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBEZWZhdWx0SW5zdHJ1Y3Rpb24ucHJvdG90eXBlLl90b0xpbmtVcmwgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnJzsgfTtcbiAgICByZXR1cm4gRGVmYXVsdEluc3RydWN0aW9uO1xufSkoSW5zdHJ1Y3Rpb24pO1xuZXhwb3J0cy5EZWZhdWx0SW5zdHJ1Y3Rpb24gPSBEZWZhdWx0SW5zdHJ1Y3Rpb247XG4vKipcbiAqIFJlcHJlc2VudHMgYSBjb21wb25lbnQgdGhhdCBtYXkgbmVlZCB0byBkbyBzb21lIHJlZGlyZWN0aW9uIG9yIGxhenkgbG9hZGluZyBhdCBhIGxhdGVyIHRpbWUuXG4gKi9cbnZhciBVbnJlc29sdmVkSW5zdHJ1Y3Rpb24gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhVbnJlc29sdmVkSW5zdHJ1Y3Rpb24sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gVW5yZXNvbHZlZEluc3RydWN0aW9uKF9yZXNvbHZlciwgX3VybFBhdGgsIF91cmxQYXJhbXMpIHtcbiAgICAgICAgaWYgKF91cmxQYXRoID09PSB2b2lkIDApIHsgX3VybFBhdGggPSAnJzsgfVxuICAgICAgICBpZiAoX3VybFBhcmFtcyA9PT0gdm9pZCAwKSB7IF91cmxQYXJhbXMgPSBDT05TVF9FWFBSKFtdKTsgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5fcmVzb2x2ZXIgPSBfcmVzb2x2ZXI7XG4gICAgICAgIHRoaXMuX3VybFBhdGggPSBfdXJsUGF0aDtcbiAgICAgICAgdGhpcy5fdXJsUGFyYW1zID0gX3VybFBhcmFtcztcbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFVucmVzb2x2ZWRJbnN0cnVjdGlvbi5wcm90b3R5cGUsIFwidXJsUGF0aFwiLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKGlzUHJlc2VudCh0aGlzLmNvbXBvbmVudCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb21wb25lbnQudXJsUGF0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc1ByZXNlbnQodGhpcy5fdXJsUGF0aCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fdXJsUGF0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFVucmVzb2x2ZWRJbnN0cnVjdGlvbi5wcm90b3R5cGUsIFwidXJsUGFyYW1zXCIsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoaXNQcmVzZW50KHRoaXMuY29tcG9uZW50KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBvbmVudC51cmxQYXJhbXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNQcmVzZW50KHRoaXMuX3VybFBhcmFtcykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fdXJsUGFyYW1zO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9LFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbiAgICBVbnJlc29sdmVkSW5zdHJ1Y3Rpb24ucHJvdG90eXBlLnJlc29sdmVDb21wb25lbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmIChpc1ByZXNlbnQodGhpcy5jb21wb25lbnQpKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZVdyYXBwZXIucmVzb2x2ZSh0aGlzLmNvbXBvbmVudCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3Jlc29sdmVyKCkudGhlbihmdW5jdGlvbiAocmVzb2x1dGlvbikge1xuICAgICAgICAgICAgX3RoaXMuY2hpbGQgPSByZXNvbHV0aW9uLmNoaWxkO1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLmNvbXBvbmVudCA9IHJlc29sdXRpb24uY29tcG9uZW50O1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHJldHVybiBVbnJlc29sdmVkSW5zdHJ1Y3Rpb247XG59KShJbnN0cnVjdGlvbik7XG5leHBvcnRzLlVucmVzb2x2ZWRJbnN0cnVjdGlvbiA9IFVucmVzb2x2ZWRJbnN0cnVjdGlvbjtcbnZhciBSZWRpcmVjdEluc3RydWN0aW9uID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoUmVkaXJlY3RJbnN0cnVjdGlvbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBSZWRpcmVjdEluc3RydWN0aW9uKGNvbXBvbmVudCwgY2hpbGQsIGF1eEluc3RydWN0aW9uLCBfc3BlY2lmaWNpdHkpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgY29tcG9uZW50LCBjaGlsZCwgYXV4SW5zdHJ1Y3Rpb24pO1xuICAgICAgICB0aGlzLl9zcGVjaWZpY2l0eSA9IF9zcGVjaWZpY2l0eTtcbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFJlZGlyZWN0SW5zdHJ1Y3Rpb24ucHJvdG90eXBlLCBcInNwZWNpZmljaXR5XCIsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9zcGVjaWZpY2l0eTsgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgcmV0dXJuIFJlZGlyZWN0SW5zdHJ1Y3Rpb247XG59KShSZXNvbHZlZEluc3RydWN0aW9uKTtcbmV4cG9ydHMuUmVkaXJlY3RJbnN0cnVjdGlvbiA9IFJlZGlyZWN0SW5zdHJ1Y3Rpb247XG4vKipcbiAqIEEgYENvbXBvbmVudEluc3RydWN0aW9uYCByZXByZXNlbnRzIHRoZSByb3V0ZSBzdGF0ZSBmb3IgYSBzaW5nbGUgY29tcG9uZW50LiBBbiBgSW5zdHJ1Y3Rpb25gIGlzXG4gKiBjb21wb3NlZCBvZiBhIHRyZWUgb2YgdGhlc2UgYENvbXBvbmVudEluc3RydWN0aW9uYHMuXG4gKlxuICogYENvbXBvbmVudEluc3RydWN0aW9uc2AgaXMgYSBwdWJsaWMgQVBJLiBJbnN0YW5jZXMgb2YgYENvbXBvbmVudEluc3RydWN0aW9uYCBhcmUgcGFzc2VkXG4gKiB0byByb3V0ZSBsaWZlY3ljbGUgaG9va3MsIGxpa2Uge0BsaW5rIENhbkFjdGl2YXRlfS5cbiAqXG4gKiBgQ29tcG9uZW50SW5zdHJ1Y3Rpb25gcyBhcmUgW2h0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0hhc2hfY29uc2luZ10oaGFzaCBjb25zZWQpLiBZb3Ugc2hvdWxkXG4gKiBuZXZlciBjb25zdHJ1Y3Qgb25lIHlvdXJzZWxmIHdpdGggXCJuZXcuXCIgSW5zdGVhZCwgcmVseSBvbiB7QGxpbmsgUm91dGVyL1JvdXRlUmVjb2duaXplcn0gdG9cbiAqIGNvbnN0cnVjdCBgQ29tcG9uZW50SW5zdHJ1Y3Rpb25gcy5cbiAqXG4gKiBZb3Ugc2hvdWxkIG5vdCBtb2RpZnkgdGhpcyBvYmplY3QuIEl0IHNob3VsZCBiZSB0cmVhdGVkIGFzIGltbXV0YWJsZS5cbiAqL1xudmFyIENvbXBvbmVudEluc3RydWN0aW9uID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDb21wb25lbnRJbnN0cnVjdGlvbih1cmxQYXRoLCB1cmxQYXJhbXMsIGRhdGEsIGNvbXBvbmVudFR5cGUsIHRlcm1pbmFsLCBzcGVjaWZpY2l0eSwgcGFyYW1zKSB7XG4gICAgICAgIGlmIChwYXJhbXMgPT09IHZvaWQgMCkgeyBwYXJhbXMgPSBudWxsOyB9XG4gICAgICAgIHRoaXMudXJsUGF0aCA9IHVybFBhdGg7XG4gICAgICAgIHRoaXMudXJsUGFyYW1zID0gdXJsUGFyYW1zO1xuICAgICAgICB0aGlzLmNvbXBvbmVudFR5cGUgPSBjb21wb25lbnRUeXBlO1xuICAgICAgICB0aGlzLnRlcm1pbmFsID0gdGVybWluYWw7XG4gICAgICAgIHRoaXMuc3BlY2lmaWNpdHkgPSBzcGVjaWZpY2l0eTtcbiAgICAgICAgdGhpcy5wYXJhbXMgPSBwYXJhbXM7XG4gICAgICAgIHRoaXMucmV1c2UgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5yb3V0ZURhdGEgPSBpc1ByZXNlbnQoZGF0YSkgPyBkYXRhIDogZXhwb3J0cy5CTEFOS19ST1VURV9EQVRBO1xuICAgIH1cbiAgICByZXR1cm4gQ29tcG9uZW50SW5zdHJ1Y3Rpb247XG59KSgpO1xuZXhwb3J0cy5Db21wb25lbnRJbnN0cnVjdGlvbiA9IENvbXBvbmVudEluc3RydWN0aW9uO1xudmFyIHVybF9wYXJzZXJfMSA9IHJlcXVpcmUoJy4vdXJsX3BhcnNlcicpO1xudmFyIFRvdWNoTWFwID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBUb3VjaE1hcChtYXApIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgdGhpcy5tYXAgPSB7fTtcbiAgICAgICAgdGhpcy5rZXlzID0ge307XG4gICAgICAgIGlmIChpc1ByZXNlbnQobWFwKSkge1xuICAgICAgICAgICAgU3RyaW5nTWFwV3JhcHBlci5mb3JFYWNoKG1hcCwgZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICAgICAgICBfdGhpcy5tYXBba2V5XSA9IGlzUHJlc2VudCh2YWx1ZSkgPyB2YWx1ZS50b1N0cmluZygpIDogbnVsbDtcbiAgICAgICAgICAgICAgICBfdGhpcy5rZXlzW2tleV0gPSB0cnVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgVG91Y2hNYXAucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgU3RyaW5nTWFwV3JhcHBlci5kZWxldGUodGhpcy5rZXlzLCBrZXkpO1xuICAgICAgICByZXR1cm4gdGhpcy5tYXBba2V5XTtcbiAgICB9O1xuICAgIFRvdWNoTWFwLnByb3RvdHlwZS5nZXRVbnVzZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHZhciB1bnVzZWQgPSB7fTtcbiAgICAgICAgdmFyIGtleXMgPSBTdHJpbmdNYXBXcmFwcGVyLmtleXModGhpcy5rZXlzKTtcbiAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHsgcmV0dXJuIHVudXNlZFtrZXldID0gU3RyaW5nTWFwV3JhcHBlci5nZXQoX3RoaXMubWFwLCBrZXkpOyB9KTtcbiAgICAgICAgcmV0dXJuIHVudXNlZDtcbiAgICB9O1xuICAgIHJldHVybiBUb3VjaE1hcDtcbn0pKCk7XG5mdW5jdGlvbiBub3JtYWxpemVTdHJpbmcob2JqKSB7XG4gICAgaWYgKGlzQmxhbmsob2JqKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmoudG9TdHJpbmcoKTtcbiAgICB9XG59XG52YXIgQ29udGludWF0aW9uU2VnbWVudCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ29udGludWF0aW9uU2VnbWVudCgpIHtcbiAgICAgICAgdGhpcy5uYW1lID0gJyc7XG4gICAgfVxuICAgIENvbnRpbnVhdGlvblNlZ21lbnQucHJvdG90eXBlLmdlbmVyYXRlID0gZnVuY3Rpb24gKHBhcmFtcykgeyByZXR1cm4gJyc7IH07XG4gICAgQ29udGludWF0aW9uU2VnbWVudC5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbiAocGF0aCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICByZXR1cm4gQ29udGludWF0aW9uU2VnbWVudDtcbn0pKCk7XG52YXIgU3RhdGljU2VnbWVudCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU3RhdGljU2VnbWVudChwYXRoKSB7XG4gICAgICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gICAgICAgIHRoaXMubmFtZSA9ICcnO1xuICAgIH1cbiAgICBTdGF0aWNTZWdtZW50LnByb3RvdHlwZS5tYXRjaCA9IGZ1bmN0aW9uIChwYXRoKSB7IHJldHVybiBwYXRoID09IHRoaXMucGF0aDsgfTtcbiAgICBTdGF0aWNTZWdtZW50LnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uIChwYXJhbXMpIHsgcmV0dXJuIHRoaXMucGF0aDsgfTtcbiAgICByZXR1cm4gU3RhdGljU2VnbWVudDtcbn0pKCk7XG52YXIgRHluYW1pY1NlZ21lbnQgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIER5bmFtaWNTZWdtZW50KG5hbWUpIHtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB9XG4gICAgRHluYW1pY1NlZ21lbnQucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24gKHBhdGgpIHsgcmV0dXJuIHBhdGgubGVuZ3RoID4gMDsgfTtcbiAgICBEeW5hbWljU2VnbWVudC5wcm90b3R5cGUuZ2VuZXJhdGUgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgIGlmICghU3RyaW5nTWFwV3JhcHBlci5jb250YWlucyhwYXJhbXMubWFwLCB0aGlzLm5hbWUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcIlJvdXRlIGdlbmVyYXRvciBmb3IgJ1wiICsgdGhpcy5uYW1lICsgXCInIHdhcyBub3QgaW5jbHVkZWQgaW4gcGFyYW1ldGVycyBwYXNzZWQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBub3JtYWxpemVTdHJpbmcocGFyYW1zLmdldCh0aGlzLm5hbWUpKTtcbiAgICB9O1xuICAgIHJldHVybiBEeW5hbWljU2VnbWVudDtcbn0pKCk7XG52YXIgU3RhclNlZ21lbnQgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFN0YXJTZWdtZW50KG5hbWUpIHtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB9XG4gICAgU3RhclNlZ21lbnQucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24gKHBhdGgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgU3RhclNlZ21lbnQucHJvdG90eXBlLmdlbmVyYXRlID0gZnVuY3Rpb24gKHBhcmFtcykgeyByZXR1cm4gbm9ybWFsaXplU3RyaW5nKHBhcmFtcy5nZXQodGhpcy5uYW1lKSk7IH07XG4gICAgcmV0dXJuIFN0YXJTZWdtZW50O1xufSkoKTtcbnZhciBwYXJhbU1hdGNoZXIgPSAvXjooW15cXC9dKykkL2c7XG52YXIgd2lsZGNhcmRNYXRjaGVyID0gL15cXCooW15cXC9dKykkL2c7XG5mdW5jdGlvbiBwYXJzZVBhdGhTdHJpbmcocm91dGUpIHtcbiAgICAvLyBub3JtYWxpemUgcm91dGUgYXMgbm90IHN0YXJ0aW5nIHdpdGggYSBcIi9cIi4gUmVjb2duaXRpb24gd2lsbFxuICAgIC8vIGFsc28gbm9ybWFsaXplLlxuICAgIGlmIChyb3V0ZS5zdGFydHNXaXRoKFwiL1wiKSkge1xuICAgICAgICByb3V0ZSA9IHJvdXRlLnN1YnN0cmluZygxKTtcbiAgICB9XG4gICAgdmFyIHNlZ21lbnRzID0gc3BsaXRCeVNsYXNoKHJvdXRlKTtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIHZhciBzcGVjaWZpY2l0eSA9ICcnO1xuICAgIC8vIGEgc2luZ2xlIHNsYXNoIChvciBcImVtcHR5IHNlZ21lbnRcIiBpcyBhcyBzcGVjaWZpYyBhcyBhIHN0YXRpYyBzZWdtZW50XG4gICAgaWYgKHNlZ21lbnRzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIHNwZWNpZmljaXR5ICs9ICcyJztcbiAgICB9XG4gICAgLy8gVGhlIFwic3BlY2lmaWNpdHlcIiBvZiBhIHBhdGggaXMgdXNlZCB0byBkZXRlcm1pbmUgd2hpY2ggcm91dGUgaXMgdXNlZCB3aGVuIG11bHRpcGxlIHJvdXRlcyBtYXRjaFxuICAgIC8vIGEgVVJMLiBTdGF0aWMgc2VnbWVudHMgKGxpa2UgXCIvZm9vXCIpIGFyZSB0aGUgbW9zdCBzcGVjaWZpYywgZm9sbG93ZWQgYnkgZHluYW1pYyBzZWdtZW50cyAobGlrZVxuICAgIC8vIFwiLzppZFwiKS4gU3RhciBzZWdtZW50cyBhZGQgbm8gc3BlY2lmaWNpdHkuIFNlZ21lbnRzIGF0IHRoZSBzdGFydCBvZiB0aGUgcGF0aCBhcmUgbW9yZSBzcGVjaWZpY1xuICAgIC8vIHRoYW4gcHJvY2VlZGluZyBvbmVzLlxuICAgIC8vXG4gICAgLy8gVGhlIGNvZGUgYmVsb3cgdXNlcyBwbGFjZSB2YWx1ZXMgdG8gY29tYmluZSB0aGUgZGlmZmVyZW50IHR5cGVzIG9mIHNlZ21lbnRzIGludG8gYSBzaW5nbGVcbiAgICAvLyBzdHJpbmcgdGhhdCB3ZSBjYW4gc29ydCBsYXRlci4gRWFjaCBzdGF0aWMgc2VnbWVudCBpcyBtYXJrZWQgYXMgYSBzcGVjaWZpY2l0eSBvZiBcIjIsXCIgZWFjaFxuICAgIC8vIGR5bmFtaWMgc2VnbWVudCBpcyB3b3J0aCBcIjFcIiBzcGVjaWZpY2l0eSwgYW5kIHN0YXJzIGFyZSB3b3J0aCBcIjBcIiBzcGVjaWZpY2l0eS5cbiAgICB2YXIgbGltaXQgPSBzZWdtZW50cy5sZW5ndGggLSAxO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDw9IGxpbWl0OyBpKyspIHtcbiAgICAgICAgdmFyIHNlZ21lbnQgPSBzZWdtZW50c1tpXSwgbWF0Y2g7XG4gICAgICAgIGlmIChpc1ByZXNlbnQobWF0Y2ggPSBSZWdFeHBXcmFwcGVyLmZpcnN0TWF0Y2gocGFyYW1NYXRjaGVyLCBzZWdtZW50KSkpIHtcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaChuZXcgRHluYW1pY1NlZ21lbnQobWF0Y2hbMV0pKTtcbiAgICAgICAgICAgIHNwZWNpZmljaXR5ICs9ICcxJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpc1ByZXNlbnQobWF0Y2ggPSBSZWdFeHBXcmFwcGVyLmZpcnN0TWF0Y2god2lsZGNhcmRNYXRjaGVyLCBzZWdtZW50KSkpIHtcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaChuZXcgU3RhclNlZ21lbnQobWF0Y2hbMV0pKTtcbiAgICAgICAgICAgIHNwZWNpZmljaXR5ICs9ICcwJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzZWdtZW50ID09ICcuLi4nKSB7XG4gICAgICAgICAgICBpZiAoaSA8IGxpbWl0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oXCJVbmV4cGVjdGVkIFxcXCIuLi5cXFwiIGJlZm9yZSB0aGUgZW5kIG9mIHRoZSBwYXRoIGZvciBcXFwiXCIgKyByb3V0ZSArIFwiXFxcIi5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHRzLnB1c2gobmV3IENvbnRpbnVhdGlvblNlZ21lbnQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXN1bHRzLnB1c2gobmV3IFN0YXRpY1NlZ21lbnQoc2VnbWVudCkpO1xuICAgICAgICAgICAgc3BlY2lmaWNpdHkgKz0gJzInO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7ICdzZWdtZW50cyc6IHJlc3VsdHMsICdzcGVjaWZpY2l0eSc6IHNwZWNpZmljaXR5IH07XG59XG4vLyB0aGlzIGZ1bmN0aW9uIGlzIHVzZWQgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgYSByb3V0ZSBjb25maWcgcGF0aCBsaWtlIGAvZm9vLzppZGAgY29sbGlkZXMgd2l0aFxuLy8gYC9mb28vOm5hbWVgXG5mdW5jdGlvbiBwYXRoRHNsSGFzaChzZWdtZW50cykge1xuICAgIHJldHVybiBzZWdtZW50cy5tYXAoZnVuY3Rpb24gKHNlZ21lbnQpIHtcbiAgICAgICAgaWYgKHNlZ21lbnQgaW5zdGFuY2VvZiBTdGFyU2VnbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuICcqJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzZWdtZW50IGluc3RhbmNlb2YgQ29udGludWF0aW9uU2VnbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuICcuLi4nO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHNlZ21lbnQgaW5zdGFuY2VvZiBEeW5hbWljU2VnbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuICc6JztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzZWdtZW50IGluc3RhbmNlb2YgU3RhdGljU2VnbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHNlZ21lbnQucGF0aDtcbiAgICAgICAgfVxuICAgIH0pXG4gICAgICAgIC5qb2luKCcvJyk7XG59XG5mdW5jdGlvbiBzcGxpdEJ5U2xhc2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5zcGxpdCgnLycpO1xufVxudmFyIFJFU0VSVkVEX0NIQVJTID0gUmVnRXhwV3JhcHBlci5jcmVhdGUoJy8vfFxcXFwofFxcXFwpfDt8XFxcXD98PScpO1xuZnVuY3Rpb24gYXNzZXJ0UGF0aChwYXRoKSB7XG4gICAgaWYgKFN0cmluZ1dyYXBwZXIuY29udGFpbnMocGF0aCwgJyMnKSkge1xuICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcIlBhdGggXFxcIlwiICsgcGF0aCArIFwiXFxcIiBzaG91bGQgbm90IGluY2x1ZGUgXFxcIiNcXFwiLiBVc2UgXFxcIkhhc2hMb2NhdGlvblN0cmF0ZWd5XFxcIiBpbnN0ZWFkLlwiKTtcbiAgICB9XG4gICAgdmFyIGlsbGVnYWxDaGFyYWN0ZXIgPSBSZWdFeHBXcmFwcGVyLmZpcnN0TWF0Y2goUkVTRVJWRURfQ0hBUlMsIHBhdGgpO1xuICAgIGlmIChpc1ByZXNlbnQoaWxsZWdhbENoYXJhY3RlcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oXCJQYXRoIFxcXCJcIiArIHBhdGggKyBcIlxcXCIgY29udGFpbnMgXFxcIlwiICsgaWxsZWdhbENoYXJhY3RlclswXSArIFwiXFxcIiB3aGljaCBpcyBub3QgYWxsb3dlZCBpbiBhIHJvdXRlIGNvbmZpZy5cIik7XG4gICAgfVxufVxuLyoqXG4gKiBQYXJzZXMgYSBVUkwgc3RyaW5nIHVzaW5nIGEgZ2l2ZW4gbWF0Y2hlciBEU0wsIGFuZCBnZW5lcmF0ZXMgVVJMcyBmcm9tIHBhcmFtIG1hcHNcbiAqL1xudmFyIFBhdGhSZWNvZ25pemVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBQYXRoUmVjb2duaXplcihwYXRoKSB7XG4gICAgICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gICAgICAgIHRoaXMudGVybWluYWwgPSB0cnVlO1xuICAgICAgICBhc3NlcnRQYXRoKHBhdGgpO1xuICAgICAgICB2YXIgcGFyc2VkID0gcGFyc2VQYXRoU3RyaW5nKHBhdGgpO1xuICAgICAgICB0aGlzLl9zZWdtZW50cyA9IHBhcnNlZFsnc2VnbWVudHMnXTtcbiAgICAgICAgdGhpcy5zcGVjaWZpY2l0eSA9IHBhcnNlZFsnc3BlY2lmaWNpdHknXTtcbiAgICAgICAgdGhpcy5oYXNoID0gcGF0aERzbEhhc2godGhpcy5fc2VnbWVudHMpO1xuICAgICAgICB2YXIgbGFzdFNlZ21lbnQgPSB0aGlzLl9zZWdtZW50c1t0aGlzLl9zZWdtZW50cy5sZW5ndGggLSAxXTtcbiAgICAgICAgdGhpcy50ZXJtaW5hbCA9ICEobGFzdFNlZ21lbnQgaW5zdGFuY2VvZiBDb250aW51YXRpb25TZWdtZW50KTtcbiAgICB9XG4gICAgUGF0aFJlY29nbml6ZXIucHJvdG90eXBlLnJlY29nbml6ZSA9IGZ1bmN0aW9uIChiZWdpbm5pbmdTZWdtZW50KSB7XG4gICAgICAgIHZhciBuZXh0U2VnbWVudCA9IGJlZ2lubmluZ1NlZ21lbnQ7XG4gICAgICAgIHZhciBjdXJyZW50U2VnbWVudDtcbiAgICAgICAgdmFyIHBvc2l0aW9uYWxQYXJhbXMgPSB7fTtcbiAgICAgICAgdmFyIGNhcHR1cmVkID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fc2VnbWVudHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIHZhciBzZWdtZW50ID0gdGhpcy5fc2VnbWVudHNbaV07XG4gICAgICAgICAgICBjdXJyZW50U2VnbWVudCA9IG5leHRTZWdtZW50O1xuICAgICAgICAgICAgaWYgKHNlZ21lbnQgaW5zdGFuY2VvZiBDb250aW51YXRpb25TZWdtZW50KSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNQcmVzZW50KGN1cnJlbnRTZWdtZW50KSkge1xuICAgICAgICAgICAgICAgIGNhcHR1cmVkLnB1c2goY3VycmVudFNlZ21lbnQucGF0aCk7XG4gICAgICAgICAgICAgICAgLy8gdGhlIHN0YXIgc2VnbWVudCBjb25zdW1lcyBhbGwgb2YgdGhlIHJlbWFpbmluZyBVUkwsIGluY2x1ZGluZyBtYXRyaXggcGFyYW1zXG4gICAgICAgICAgICAgICAgaWYgKHNlZ21lbnQgaW5zdGFuY2VvZiBTdGFyU2VnbWVudCkge1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbmFsUGFyYW1zW3NlZ21lbnQubmFtZV0gPSBjdXJyZW50U2VnbWVudC50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICBuZXh0U2VnbWVudCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc2VnbWVudCBpbnN0YW5jZW9mIER5bmFtaWNTZWdtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uYWxQYXJhbXNbc2VnbWVudC5uYW1lXSA9IGN1cnJlbnRTZWdtZW50LnBhdGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKCFzZWdtZW50Lm1hdGNoKGN1cnJlbnRTZWdtZW50LnBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBuZXh0U2VnbWVudCA9IGN1cnJlbnRTZWdtZW50LmNoaWxkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoIXNlZ21lbnQubWF0Y2goJycpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMudGVybWluYWwgJiYgaXNQcmVzZW50KG5leHRTZWdtZW50KSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHVybFBhdGggPSBjYXB0dXJlZC5qb2luKCcvJyk7XG4gICAgICAgIHZhciBhdXhpbGlhcnk7XG4gICAgICAgIHZhciB1cmxQYXJhbXM7XG4gICAgICAgIHZhciBhbGxQYXJhbXM7XG4gICAgICAgIGlmIChpc1ByZXNlbnQoY3VycmVudFNlZ21lbnQpKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGlzIGlzIHRoZSByb290IGNvbXBvbmVudCwgcmVhZCBxdWVyeSBwYXJhbXMuIE90aGVyd2lzZSwgcmVhZCBtYXRyaXggcGFyYW1zLlxuICAgICAgICAgICAgdmFyIHBhcmFtc1NlZ21lbnQgPSBiZWdpbm5pbmdTZWdtZW50IGluc3RhbmNlb2YgdXJsX3BhcnNlcl8xLlJvb3RVcmwgPyBiZWdpbm5pbmdTZWdtZW50IDogY3VycmVudFNlZ21lbnQ7XG4gICAgICAgICAgICBhbGxQYXJhbXMgPSBpc1ByZXNlbnQocGFyYW1zU2VnbWVudC5wYXJhbXMpID9cbiAgICAgICAgICAgICAgICBTdHJpbmdNYXBXcmFwcGVyLm1lcmdlKHBhcmFtc1NlZ21lbnQucGFyYW1zLCBwb3NpdGlvbmFsUGFyYW1zKSA6XG4gICAgICAgICAgICAgICAgcG9zaXRpb25hbFBhcmFtcztcbiAgICAgICAgICAgIHVybFBhcmFtcyA9IHVybF9wYXJzZXJfMS5zZXJpYWxpemVQYXJhbXMocGFyYW1zU2VnbWVudC5wYXJhbXMpO1xuICAgICAgICAgICAgYXV4aWxpYXJ5ID0gY3VycmVudFNlZ21lbnQuYXV4aWxpYXJ5O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYWxsUGFyYW1zID0gcG9zaXRpb25hbFBhcmFtcztcbiAgICAgICAgICAgIGF1eGlsaWFyeSA9IFtdO1xuICAgICAgICAgICAgdXJsUGFyYW1zID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgdXJsUGF0aDogdXJsUGF0aCwgdXJsUGFyYW1zOiB1cmxQYXJhbXMsIGFsbFBhcmFtczogYWxsUGFyYW1zLCBhdXhpbGlhcnk6IGF1eGlsaWFyeSwgbmV4dFNlZ21lbnQ6IG5leHRTZWdtZW50IH07XG4gICAgfTtcbiAgICBQYXRoUmVjb2duaXplci5wcm90b3R5cGUuZ2VuZXJhdGUgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgIHZhciBwYXJhbVRva2VucyA9IG5ldyBUb3VjaE1hcChwYXJhbXMpO1xuICAgICAgICB2YXIgcGF0aCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NlZ21lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc2VnbWVudCA9IHRoaXMuX3NlZ21lbnRzW2ldO1xuICAgICAgICAgICAgaWYgKCEoc2VnbWVudCBpbnN0YW5jZW9mIENvbnRpbnVhdGlvblNlZ21lbnQpKSB7XG4gICAgICAgICAgICAgICAgcGF0aC5wdXNoKHNlZ21lbnQuZ2VuZXJhdGUocGFyYW1Ub2tlbnMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgdXJsUGF0aCA9IHBhdGguam9pbignLycpO1xuICAgICAgICB2YXIgbm9uUG9zaXRpb25hbFBhcmFtcyA9IHBhcmFtVG9rZW5zLmdldFVudXNlZCgpO1xuICAgICAgICB2YXIgdXJsUGFyYW1zID0gdXJsX3BhcnNlcl8xLnNlcmlhbGl6ZVBhcmFtcyhub25Qb3NpdGlvbmFsUGFyYW1zKTtcbiAgICAgICAgcmV0dXJuIHsgdXJsUGF0aDogdXJsUGF0aCwgdXJsUGFyYW1zOiB1cmxQYXJhbXMgfTtcbiAgICB9O1xuICAgIHJldHVybiBQYXRoUmVjb2duaXplcjtcbn0pKCk7XG5leHBvcnRzLlBhdGhSZWNvZ25pemVyID0gUGF0aFJlY29nbml6ZXI7XG52YXIgcm91dGVfY29uZmlnX2RlY29yYXRvcl8xID0gcmVxdWlyZSgnLi9yb3V0ZV9jb25maWdfZGVjb3JhdG9yJyk7XG4vKipcbiAqIEdpdmVuIGEgSlMgT2JqZWN0IHRoYXQgcmVwcmVzZW50cyBhIHJvdXRlIGNvbmZpZywgcmV0dXJucyBhIGNvcnJlc3BvbmRpbmcgUm91dGUsIEFzeW5jUm91dGUsXG4gKiBBdXhSb3V0ZSBvciBSZWRpcmVjdCBvYmplY3QuXG4gKlxuICogQWxzbyB3cmFwcyBhbiBBc3luY1JvdXRlJ3MgbG9hZGVyIGZ1bmN0aW9uIHRvIGFkZCB0aGUgbG9hZGVkIGNvbXBvbmVudCdzIHJvdXRlIGNvbmZpZyB0byB0aGVcbiAqIGBSb3V0ZVJlZ2lzdHJ5YC5cbiAqL1xuZnVuY3Rpb24gbm9ybWFsaXplUm91dGVDb25maWcoY29uZmlnLCByZWdpc3RyeSkge1xuICAgIGlmIChjb25maWcgaW5zdGFuY2VvZiByb3V0ZV9jb25maWdfZGVjb3JhdG9yXzEuQXN5bmNSb3V0ZSkge1xuICAgICAgICB2YXIgd3JhcHBlZExvYWRlciA9IHdyYXBMb2FkZXJUb1JlY29uZmlndXJlUmVnaXN0cnkoY29uZmlnLmxvYWRlciwgcmVnaXN0cnkpO1xuICAgICAgICByZXR1cm4gbmV3IHJvdXRlX2NvbmZpZ19kZWNvcmF0b3JfMS5Bc3luY1JvdXRlKHtcbiAgICAgICAgICAgIHBhdGg6IGNvbmZpZy5wYXRoLFxuICAgICAgICAgICAgbG9hZGVyOiB3cmFwcGVkTG9hZGVyLFxuICAgICAgICAgICAgbmFtZTogY29uZmlnLm5hbWUsXG4gICAgICAgICAgICBkYXRhOiBjb25maWcuZGF0YSxcbiAgICAgICAgICAgIHVzZUFzRGVmYXVsdDogY29uZmlnLnVzZUFzRGVmYXVsdFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgaWYgKGNvbmZpZyBpbnN0YW5jZW9mIHJvdXRlX2NvbmZpZ19kZWNvcmF0b3JfMS5Sb3V0ZSB8fCBjb25maWcgaW5zdGFuY2VvZiByb3V0ZV9jb25maWdfZGVjb3JhdG9yXzEuUmVkaXJlY3QgfHwgY29uZmlnIGluc3RhbmNlb2Ygcm91dGVfY29uZmlnX2RlY29yYXRvcl8xLkF1eFJvdXRlKSB7XG4gICAgICAgIHJldHVybiBjb25maWc7XG4gICAgfVxuICAgIGlmICgoKyEhY29uZmlnLmNvbXBvbmVudCkgKyAoKyEhY29uZmlnLnJlZGlyZWN0VG8pICsgKCshIWNvbmZpZy5sb2FkZXIpICE9IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oXCJSb3V0ZSBjb25maWcgc2hvdWxkIGNvbnRhaW4gZXhhY3RseSBvbmUgXFxcImNvbXBvbmVudFxcXCIsIFxcXCJsb2FkZXJcXFwiLCBvciBcXFwicmVkaXJlY3RUb1xcXCIgcHJvcGVydHkuXCIpO1xuICAgIH1cbiAgICBpZiAoY29uZmlnLmFzICYmIGNvbmZpZy5uYW1lKSB7XG4gICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiUm91dGUgY29uZmlnIHNob3VsZCBjb250YWluIGV4YWN0bHkgb25lIFxcXCJhc1xcXCIgb3IgXFxcIm5hbWVcXFwiIHByb3BlcnR5LlwiKTtcbiAgICB9XG4gICAgaWYgKGNvbmZpZy5hcykge1xuICAgICAgICBjb25maWcubmFtZSA9IGNvbmZpZy5hcztcbiAgICB9XG4gICAgaWYgKGNvbmZpZy5sb2FkZXIpIHtcbiAgICAgICAgdmFyIHdyYXBwZWRMb2FkZXIgPSB3cmFwTG9hZGVyVG9SZWNvbmZpZ3VyZVJlZ2lzdHJ5KGNvbmZpZy5sb2FkZXIsIHJlZ2lzdHJ5KTtcbiAgICAgICAgcmV0dXJuIG5ldyByb3V0ZV9jb25maWdfZGVjb3JhdG9yXzEuQXN5bmNSb3V0ZSh7XG4gICAgICAgICAgICBwYXRoOiBjb25maWcucGF0aCxcbiAgICAgICAgICAgIGxvYWRlcjogd3JhcHBlZExvYWRlcixcbiAgICAgICAgICAgIG5hbWU6IGNvbmZpZy5uYW1lLFxuICAgICAgICAgICAgdXNlQXNEZWZhdWx0OiBjb25maWcudXNlQXNEZWZhdWx0XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoY29uZmlnLmF1eCkge1xuICAgICAgICByZXR1cm4gbmV3IHJvdXRlX2NvbmZpZ19kZWNvcmF0b3JfMS5BdXhSb3V0ZSh7IHBhdGg6IGNvbmZpZy5hdXgsIGNvbXBvbmVudDogY29uZmlnLmNvbXBvbmVudCwgbmFtZTogY29uZmlnLm5hbWUgfSk7XG4gICAgfVxuICAgIGlmIChjb25maWcuY29tcG9uZW50KSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLmNvbXBvbmVudCA9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgdmFyIGNvbXBvbmVudERlZmluaXRpb25PYmplY3QgPSBjb25maWcuY29tcG9uZW50O1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudERlZmluaXRpb25PYmplY3QudHlwZSA9PSAnY29uc3RydWN0b3InKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyByb3V0ZV9jb25maWdfZGVjb3JhdG9yXzEuUm91dGUoe1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiBjb25maWcucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50OiBjb21wb25lbnREZWZpbml0aW9uT2JqZWN0LmNvbnN0cnVjdG9yLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBjb25maWcubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogY29uZmlnLmRhdGEsXG4gICAgICAgICAgICAgICAgICAgIHVzZUFzRGVmYXVsdDogY29uZmlnLnVzZUFzRGVmYXVsdFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY29tcG9uZW50RGVmaW5pdGlvbk9iamVjdC50eXBlID09ICdsb2FkZXInKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyByb3V0ZV9jb25maWdfZGVjb3JhdG9yXzEuQXN5bmNSb3V0ZSh7XG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGNvbmZpZy5wYXRoLFxuICAgICAgICAgICAgICAgICAgICBsb2FkZXI6IGNvbXBvbmVudERlZmluaXRpb25PYmplY3QubG9hZGVyLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBjb25maWcubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdXNlQXNEZWZhdWx0OiBjb25maWcudXNlQXNEZWZhdWx0XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcIkludmFsaWQgY29tcG9uZW50IHR5cGUgXFxcIlwiICsgY29tcG9uZW50RGVmaW5pdGlvbk9iamVjdC50eXBlICsgXCJcXFwiLiBWYWxpZCB0eXBlcyBhcmUgXFxcImNvbnN0cnVjdG9yXFxcIiBhbmQgXFxcImxvYWRlclxcXCIuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgcm91dGVfY29uZmlnX2RlY29yYXRvcl8xLlJvdXRlKGNvbmZpZyk7XG4gICAgfVxuICAgIGlmIChjb25maWcucmVkaXJlY3RUbykge1xuICAgICAgICByZXR1cm4gbmV3IHJvdXRlX2NvbmZpZ19kZWNvcmF0b3JfMS5SZWRpcmVjdCh7IHBhdGg6IGNvbmZpZy5wYXRoLCByZWRpcmVjdFRvOiBjb25maWcucmVkaXJlY3RUbyB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbmZpZztcbn1cbmV4cG9ydHMubm9ybWFsaXplUm91dGVDb25maWcgPSBub3JtYWxpemVSb3V0ZUNvbmZpZztcbmZ1bmN0aW9uIHdyYXBMb2FkZXJUb1JlY29uZmlndXJlUmVnaXN0cnkobG9hZGVyLCByZWdpc3RyeSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBsb2FkZXIoKS50aGVuKGZ1bmN0aW9uIChjb21wb25lbnRUeXBlKSB7XG4gICAgICAgICAgICByZWdpc3RyeS5jb25maWdGcm9tQ29tcG9uZW50KGNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgcmV0dXJuIGNvbXBvbmVudFR5cGU7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG5mdW5jdGlvbiBhc3NlcnRDb21wb25lbnRFeGlzdHMoY29tcG9uZW50LCBwYXRoKSB7XG4gICAgaWYgKCFpc1R5cGUoY29tcG9uZW50KSkge1xuICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcIkNvbXBvbmVudCBmb3Igcm91dGUgXFxcIlwiICsgcGF0aCArIFwiXFxcIiBpcyBub3QgZGVmaW5lZCwgb3IgaXMgbm90IGEgY2xhc3MuXCIpO1xuICAgIH1cbn1cbmV4cG9ydHMuYXNzZXJ0Q29tcG9uZW50RXhpc3RzID0gYXNzZXJ0Q29tcG9uZW50RXhpc3RzO1xudmFyIGxpZmVjeWNsZV9hbm5vdGF0aW9uc19pbXBsXzEgPSByZXF1aXJlKCcuL2xpZmVjeWNsZV9hbm5vdGF0aW9uc19pbXBsJyk7XG5mdW5jdGlvbiBoYXNMaWZlY3ljbGVIb29rKGUsIHR5cGUpIHtcbiAgICBpZiAoISh0eXBlIGluc3RhbmNlb2YgVHlwZSkpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gZS5uYW1lIGluIHR5cGUucHJvdG90eXBlO1xufVxuZXhwb3J0cy5oYXNMaWZlY3ljbGVIb29rID0gaGFzTGlmZWN5Y2xlSG9vaztcbmZ1bmN0aW9uIGdldENhbkFjdGl2YXRlSG9vayh0eXBlKSB7XG4gICAgdmFyIGFubm90YXRpb25zID0gcmVmbGVjdG9yLmFubm90YXRpb25zKHR5cGUpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYW5ub3RhdGlvbnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgdmFyIGFubm90YXRpb24gPSBhbm5vdGF0aW9uc1tpXTtcbiAgICAgICAgaWYgKGFubm90YXRpb24gaW5zdGFuY2VvZiBsaWZlY3ljbGVfYW5ub3RhdGlvbnNfaW1wbF8xLkNhbkFjdGl2YXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gYW5ub3RhdGlvbi5mbjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbmV4cG9ydHMuZ2V0Q2FuQWN0aXZhdGVIb29rID0gZ2V0Q2FuQWN0aXZhdGVIb29rO1xudmFyIGNvcmVfMSA9IHJlcXVpcmUoJ2FuZ3VsYXIyL2NvcmUnKTtcbnZhciByb3V0ZV9jb25maWdfaW1wbF8xID0gcmVxdWlyZSgnLi9yb3V0ZV9jb25maWdfaW1wbCcpO1xudmFyIHJvdXRlX3JlY29nbml6ZXJfMSA9IHJlcXVpcmUoJy4vcm91dGVfcmVjb2duaXplcicpO1xudmFyIGNvbXBvbmVudF9yZWNvZ25pemVyXzEgPSByZXF1aXJlKCcuL2NvbXBvbmVudF9yZWNvZ25pemVyJyk7XG52YXIgaW5zdHJ1Y3Rpb25fMSA9IHJlcXVpcmUoJy4vaW5zdHJ1Y3Rpb24nKTtcbnZhciByb3V0ZV9jb25maWdfbm9tYWxpemVyXzEgPSByZXF1aXJlKCcuL3JvdXRlX2NvbmZpZ19ub21hbGl6ZXInKTtcbnZhciB1cmxfcGFyc2VyXzEgPSByZXF1aXJlKCcuL3VybF9wYXJzZXInKTtcbnZhciBfcmVzb2x2ZVRvTnVsbCA9IFByb21pc2VXcmFwcGVyLnJlc29sdmUobnVsbCk7XG4vKipcbiAqIFRva2VuIHVzZWQgdG8gYmluZCB0aGUgY29tcG9uZW50IHdpdGggdGhlIHRvcC1sZXZlbCB7QGxpbmsgUm91dGVDb25maWd9cyBmb3IgdGhlXG4gKiBhcHBsaWNhdGlvbi5cbiAqXG4gKiAjIyMgRXhhbXBsZSAoW2xpdmUgZGVtb10oaHR0cDovL3BsbmtyLmNvL2VkaXQvaVJVUDhCNU9VYnhDV1EzQWNJRG0pKVxuICpcbiAqIGBgYFxuICogaW1wb3J0IHtDb21wb25lbnR9IGZyb20gJ2FuZ3VsYXIyL2NvcmUnO1xuICogaW1wb3J0IHtcbiAqICAgUk9VVEVSX0RJUkVDVElWRVMsXG4gKiAgIFJPVVRFUl9QUk9WSURFUlMsXG4gKiAgIFJvdXRlQ29uZmlnXG4gKiB9IGZyb20gJ2FuZ3VsYXIyL3JvdXRlcic7XG4gKlxuICogQENvbXBvbmVudCh7ZGlyZWN0aXZlczogW1JPVVRFUl9ESVJFQ1RJVkVTXX0pXG4gKiBAUm91dGVDb25maWcoW1xuICogIHsuLi59LFxuICogXSlcbiAqIGNsYXNzIEFwcENtcCB7XG4gKiAgIC8vIC4uLlxuICogfVxuICpcbiAqIGJvb3RzdHJhcChBcHBDbXAsIFtST1VURVJfUFJPVklERVJTXSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0cy5ST1VURVJfUFJJTUFSWV9DT01QT05FTlQgPSBDT05TVF9FWFBSKG5ldyBjb3JlXzEuT3BhcXVlVG9rZW4oJ1JvdXRlclByaW1hcnlDb21wb25lbnQnKSk7XG4vKipcbiAqIFRoZSBSb3V0ZVJlZ2lzdHJ5IGhvbGRzIHJvdXRlIGNvbmZpZ3VyYXRpb25zIGZvciBlYWNoIGNvbXBvbmVudCBpbiBhbiBBbmd1bGFyIGFwcC5cbiAqIEl0IGlzIHJlc3BvbnNpYmxlIGZvciBjcmVhdGluZyBJbnN0cnVjdGlvbnMgZnJvbSBVUkxzLCBhbmQgZ2VuZXJhdGluZyBVUkxzIGJhc2VkIG9uIHJvdXRlIGFuZFxuICogcGFyYW1ldGVycy5cbiAqL1xudmFyIFJvdXRlUmVnaXN0cnkgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFJvdXRlUmVnaXN0cnkoX3Jvb3RDb21wb25lbnQpIHtcbiAgICAgICAgdGhpcy5fcm9vdENvbXBvbmVudCA9IF9yb290Q29tcG9uZW50O1xuICAgICAgICB0aGlzLl9ydWxlcyA9IG5ldyBNYXAoKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2l2ZW4gYSBjb21wb25lbnQgYW5kIGEgY29uZmlndXJhdGlvbiBvYmplY3QsIGFkZCB0aGUgcm91dGUgdG8gdGhpcyByZWdpc3RyeVxuICAgICAqL1xuICAgIFJvdXRlUmVnaXN0cnkucHJvdG90eXBlLmNvbmZpZyA9IGZ1bmN0aW9uIChwYXJlbnRDb21wb25lbnQsIGNvbmZpZykge1xuICAgICAgICBjb25maWcgPSByb3V0ZV9jb25maWdfbm9tYWxpemVyXzEubm9ybWFsaXplUm91dGVDb25maWcoY29uZmlnLCB0aGlzKTtcbiAgICAgICAgLy8gdGhpcyBpcyBoZXJlIGJlY2F1c2UgRGFydCB0eXBlIGd1YXJkIHJlYXNvbnNcbiAgICAgICAgaWYgKGNvbmZpZyBpbnN0YW5jZW9mIHJvdXRlX2NvbmZpZ19pbXBsXzEuUm91dGUpIHtcbiAgICAgICAgICAgIHJvdXRlX2NvbmZpZ19ub21hbGl6ZXJfMS5hc3NlcnRDb21wb25lbnRFeGlzdHMoY29uZmlnLmNvbXBvbmVudCwgY29uZmlnLnBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGNvbmZpZyBpbnN0YW5jZW9mIHJvdXRlX2NvbmZpZ19pbXBsXzEuQXV4Um91dGUpIHtcbiAgICAgICAgICAgIHJvdXRlX2NvbmZpZ19ub21hbGl6ZXJfMS5hc3NlcnRDb21wb25lbnRFeGlzdHMoY29uZmlnLmNvbXBvbmVudCwgY29uZmlnLnBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZWNvZ25pemVyID0gdGhpcy5fcnVsZXMuZ2V0KHBhcmVudENvbXBvbmVudCk7XG4gICAgICAgIGlmIChpc0JsYW5rKHJlY29nbml6ZXIpKSB7XG4gICAgICAgICAgICByZWNvZ25pemVyID0gbmV3IGNvbXBvbmVudF9yZWNvZ25pemVyXzEuQ29tcG9uZW50UmVjb2duaXplcigpO1xuICAgICAgICAgICAgdGhpcy5fcnVsZXMuc2V0KHBhcmVudENvbXBvbmVudCwgcmVjb2duaXplcik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRlcm1pbmFsID0gcmVjb2duaXplci5jb25maWcoY29uZmlnKTtcbiAgICAgICAgaWYgKGNvbmZpZyBpbnN0YW5jZW9mIHJvdXRlX2NvbmZpZ19pbXBsXzEuUm91dGUpIHtcbiAgICAgICAgICAgIGlmICh0ZXJtaW5hbCkge1xuICAgICAgICAgICAgICAgIGFzc2VydFRlcm1pbmFsQ29tcG9uZW50KGNvbmZpZy5jb21wb25lbnQsIGNvbmZpZy5wYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnRnJvbUNvbXBvbmVudChjb25maWcuY29tcG9uZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgLyoqXG4gICAgICogUmVhZHMgdGhlIGFubm90YXRpb25zIG9mIGEgY29tcG9uZW50IGFuZCBjb25maWd1cmVzIHRoZSByZWdpc3RyeSBiYXNlZCBvbiB0aGVtXG4gICAgICovXG4gICAgUm91dGVSZWdpc3RyeS5wcm90b3R5cGUuY29uZmlnRnJvbUNvbXBvbmVudCA9IGZ1bmN0aW9uIChjb21wb25lbnQpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgaWYgKCFpc1R5cGUoY29tcG9uZW50KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIERvbid0IHJlYWQgdGhlIGFubm90YXRpb25zIGZyb20gYSB0eXBlIG1vcmUgdGhhbiBvbmNlIOKAk1xuICAgICAgICAvLyB0aGlzIHByZXZlbnRzIGFuIGluZmluaXRlIGxvb3AgaWYgYSBjb21wb25lbnQgcm91dGVzIHJlY3Vyc2l2ZWx5LlxuICAgICAgICBpZiAodGhpcy5fcnVsZXMuaGFzKGNvbXBvbmVudCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYW5ub3RhdGlvbnMgPSByZWZsZWN0b3IuYW5ub3RhdGlvbnMoY29tcG9uZW50KTtcbiAgICAgICAgaWYgKGlzUHJlc2VudChhbm5vdGF0aW9ucykpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYW5ub3RhdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgYW5ub3RhdGlvbiA9IGFubm90YXRpb25zW2ldO1xuICAgICAgICAgICAgICAgIGlmIChhbm5vdGF0aW9uIGluc3RhbmNlb2Ygcm91dGVfY29uZmlnX2ltcGxfMS5Sb3V0ZUNvbmZpZykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcm91dGVDZmdzID0gYW5ub3RhdGlvbi5jb25maWdzO1xuICAgICAgICAgICAgICAgICAgICByb3V0ZUNmZ3MuZm9yRWFjaChmdW5jdGlvbiAoY29uZmlnKSB7IHJldHVybiBfdGhpcy5jb25maWcoY29tcG9uZW50LCBjb25maWcpOyB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEdpdmVuIGEgVVJMIGFuZCBhIHBhcmVudCBjb21wb25lbnQsIHJldHVybiB0aGUgbW9zdCBzcGVjaWZpYyBpbnN0cnVjdGlvbiBmb3IgbmF2aWdhdGluZ1xuICAgICAqIHRoZSBhcHBsaWNhdGlvbiBpbnRvIHRoZSBzdGF0ZSBzcGVjaWZpZWQgYnkgdGhlIHVybFxuICAgICAqL1xuICAgIFJvdXRlUmVnaXN0cnkucHJvdG90eXBlLnJlY29nbml6ZSA9IGZ1bmN0aW9uICh1cmwsIGFuY2VzdG9ySW5zdHJ1Y3Rpb25zKSB7XG4gICAgICAgIHZhciBwYXJzZWRVcmwgPSB1cmxfcGFyc2VyXzEucGFyc2VyLnBhcnNlKHVybCk7XG4gICAgICAgIHJldHVybiB0aGlzLl9yZWNvZ25pemUocGFyc2VkVXJsLCBbXSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBSZWNvZ25pemVzIGFsbCBwYXJlbnQtY2hpbGQgcm91dGVzLCBidXQgY3JlYXRlcyB1bnJlc29sdmVkIGF1eGlsaWFyeSByb3V0ZXNcbiAgICAgKi9cbiAgICBSb3V0ZVJlZ2lzdHJ5LnByb3RvdHlwZS5fcmVjb2duaXplID0gZnVuY3Rpb24gKHBhcnNlZFVybCwgYW5jZXN0b3JJbnN0cnVjdGlvbnMsIF9hdXgpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgaWYgKF9hdXggPT09IHZvaWQgMCkgeyBfYXV4ID0gZmFsc2U7IH1cbiAgICAgICAgdmFyIHBhcmVudEluc3RydWN0aW9uID0gTGlzdFdyYXBwZXIubGFzdChhbmNlc3Rvckluc3RydWN0aW9ucyk7XG4gICAgICAgIHZhciBwYXJlbnRDb21wb25lbnQgPSBpc1ByZXNlbnQocGFyZW50SW5zdHJ1Y3Rpb24pID8gcGFyZW50SW5zdHJ1Y3Rpb24uY29tcG9uZW50LmNvbXBvbmVudFR5cGUgOlxuICAgICAgICAgICAgdGhpcy5fcm9vdENvbXBvbmVudDtcbiAgICAgICAgdmFyIGNvbXBvbmVudFJlY29nbml6ZXIgPSB0aGlzLl9ydWxlcy5nZXQocGFyZW50Q29tcG9uZW50KTtcbiAgICAgICAgaWYgKGlzQmxhbmsoY29tcG9uZW50UmVjb2duaXplcikpIHtcbiAgICAgICAgICAgIHJldHVybiBfcmVzb2x2ZVRvTnVsbDtcbiAgICAgICAgfVxuICAgICAgICAvLyBNYXRjaGVzIHNvbWUgYmVnaW5uaW5nIHBhcnQgb2YgdGhlIGdpdmVuIFVSTFxuICAgICAgICB2YXIgcG9zc2libGVNYXRjaGVzID0gX2F1eCA/IGNvbXBvbmVudFJlY29nbml6ZXIucmVjb2duaXplQXV4aWxpYXJ5KHBhcnNlZFVybCkgOlxuICAgICAgICAgICAgY29tcG9uZW50UmVjb2duaXplci5yZWNvZ25pemUocGFyc2VkVXJsKTtcbiAgICAgICAgdmFyIG1hdGNoUHJvbWlzZXMgPSBwb3NzaWJsZU1hdGNoZXMubWFwKGZ1bmN0aW9uIChjYW5kaWRhdGUpIHsgcmV0dXJuIGNhbmRpZGF0ZS50aGVuKGZ1bmN0aW9uIChjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgIGlmIChjYW5kaWRhdGUgaW5zdGFuY2VvZiByb3V0ZV9yZWNvZ25pemVyXzEuUGF0aE1hdGNoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGF1eFBhcmVudEluc3RydWN0aW9ucyA9IGFuY2VzdG9ySW5zdHJ1Y3Rpb25zLmxlbmd0aCA+IDAgPyBbTGlzdFdyYXBwZXIubGFzdChhbmNlc3Rvckluc3RydWN0aW9ucyldIDogW107XG4gICAgICAgICAgICAgICAgdmFyIGF1eEluc3RydWN0aW9ucyA9IF90aGlzLl9hdXhSb3V0ZXNUb1VucmVzb2x2ZWQoY2FuZGlkYXRlLnJlbWFpbmluZ0F1eCwgYXV4UGFyZW50SW5zdHJ1Y3Rpb25zKTtcbiAgICAgICAgICAgICAgICB2YXIgaW5zdHJ1Y3Rpb24gPSBuZXcgaW5zdHJ1Y3Rpb25fMS5SZXNvbHZlZEluc3RydWN0aW9uKGNhbmRpZGF0ZS5pbnN0cnVjdGlvbiwgbnVsbCwgYXV4SW5zdHJ1Y3Rpb25zKTtcbiAgICAgICAgICAgICAgICBpZiAoaXNCbGFuayhjYW5kaWRhdGUuaW5zdHJ1Y3Rpb24pIHx8IGNhbmRpZGF0ZS5pbnN0cnVjdGlvbi50ZXJtaW5hbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5zdHJ1Y3Rpb247XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBuZXdBbmNlc3RvckNvbXBvbmVudHMgPSBhbmNlc3Rvckluc3RydWN0aW9ucy5jb25jYXQoW2luc3RydWN0aW9uXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF90aGlzLl9yZWNvZ25pemUoY2FuZGlkYXRlLnJlbWFpbmluZywgbmV3QW5jZXN0b3JDb21wb25lbnRzKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoY2hpbGRJbnN0cnVjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNCbGFuayhjaGlsZEluc3RydWN0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gcmVkaXJlY3QgaW5zdHJ1Y3Rpb25zIGFyZSBhbHJlYWR5IGFic29sdXRlXG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZEluc3RydWN0aW9uIGluc3RhbmNlb2YgaW5zdHJ1Y3Rpb25fMS5SZWRpcmVjdEluc3RydWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRJbnN0cnVjdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbi5jaGlsZCA9IGNoaWxkSW5zdHJ1Y3Rpb247XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbnN0cnVjdGlvbjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjYW5kaWRhdGUgaW5zdGFuY2VvZiByb3V0ZV9yZWNvZ25pemVyXzEuUmVkaXJlY3RNYXRjaCkge1xuICAgICAgICAgICAgICAgIHZhciBpbnN0cnVjdGlvbiA9IF90aGlzLmdlbmVyYXRlKGNhbmRpZGF0ZS5yZWRpcmVjdFRvLCBhbmNlc3Rvckluc3RydWN0aW9ucy5jb25jYXQoW251bGxdKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBpbnN0cnVjdGlvbl8xLlJlZGlyZWN0SW5zdHJ1Y3Rpb24oaW5zdHJ1Y3Rpb24uY29tcG9uZW50LCBpbnN0cnVjdGlvbi5jaGlsZCwgaW5zdHJ1Y3Rpb24uYXV4SW5zdHJ1Y3Rpb24sIGNhbmRpZGF0ZS5zcGVjaWZpY2l0eSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pOyB9KTtcbiAgICAgICAgaWYgKChpc0JsYW5rKHBhcnNlZFVybCkgfHwgcGFyc2VkVXJsLnBhdGggPT0gJycpICYmIHBvc3NpYmxlTWF0Y2hlcy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2VXcmFwcGVyLnJlc29sdmUodGhpcy5nZW5lcmF0ZURlZmF1bHQocGFyZW50Q29tcG9uZW50KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFByb21pc2VXcmFwcGVyLmFsbChtYXRjaFByb21pc2VzKS50aGVuKG1vc3RTcGVjaWZpYyk7XG4gICAgfTtcbiAgICBSb3V0ZVJlZ2lzdHJ5LnByb3RvdHlwZS5fYXV4Um91dGVzVG9VbnJlc29sdmVkID0gZnVuY3Rpb24gKGF1eFJvdXRlcywgcGFyZW50SW5zdHJ1Y3Rpb25zKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHZhciB1bnJlc29sdmVkQXV4SW5zdHJ1Y3Rpb25zID0ge307XG4gICAgICAgIGF1eFJvdXRlcy5mb3JFYWNoKGZ1bmN0aW9uIChhdXhVcmwpIHtcbiAgICAgICAgICAgIHVucmVzb2x2ZWRBdXhJbnN0cnVjdGlvbnNbYXV4VXJsLnBhdGhdID0gbmV3IGluc3RydWN0aW9uXzEuVW5yZXNvbHZlZEluc3RydWN0aW9uKGZ1bmN0aW9uICgpIHsgcmV0dXJuIF90aGlzLl9yZWNvZ25pemUoYXV4VXJsLCBwYXJlbnRJbnN0cnVjdGlvbnMsIHRydWUpOyB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB1bnJlc29sdmVkQXV4SW5zdHJ1Y3Rpb25zO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogR2l2ZW4gYSBub3JtYWxpemVkIGxpc3Qgd2l0aCBjb21wb25lbnQgbmFtZXMgYW5kIHBhcmFtcyBsaWtlOiBgWyd1c2VyJywge2lkOiAzIH1dYFxuICAgICAqIGdlbmVyYXRlcyBhIHVybCB3aXRoIGEgbGVhZGluZyBzbGFzaCByZWxhdGl2ZSB0byB0aGUgcHJvdmlkZWQgYHBhcmVudENvbXBvbmVudGAuXG4gICAgICpcbiAgICAgKiBJZiB0aGUgb3B0aW9uYWwgcGFyYW0gYF9hdXhgIGlzIGB0cnVlYCwgdGhlbiB3ZSBnZW5lcmF0ZSBzdGFydGluZyBhdCBhbiBhdXhpbGlhcnlcbiAgICAgKiByb3V0ZSBib3VuZGFyeS5cbiAgICAgKi9cbiAgICBSb3V0ZVJlZ2lzdHJ5LnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uIChsaW5rUGFyYW1zLCBhbmNlc3Rvckluc3RydWN0aW9ucywgX2F1eCkge1xuICAgICAgICBpZiAoX2F1eCA9PT0gdm9pZCAwKSB7IF9hdXggPSBmYWxzZTsgfVxuICAgICAgICB2YXIgcGFyYW1zID0gc3BsaXRBbmRGbGF0dGVuTGlua1BhcmFtcyhsaW5rUGFyYW1zKTtcbiAgICAgICAgdmFyIHByZXZJbnN0cnVjdGlvbjtcbiAgICAgICAgLy8gVGhlIGZpcnN0IHNlZ21lbnQgc2hvdWxkIGJlIGVpdGhlciAnLicgKGdlbmVyYXRlIGZyb20gcGFyZW50KSBvciAnJyAoZ2VuZXJhdGUgZnJvbSByb290KS5cbiAgICAgICAgLy8gV2hlbiB3ZSBub3JtYWxpemUgYWJvdmUsIHdlIHN0cmlwIGFsbCB0aGUgc2xhc2hlcywgJy4vJyBiZWNvbWVzICcuJyBhbmQgJy8nIGJlY29tZXMgJycuXG4gICAgICAgIGlmIChMaXN0V3JhcHBlci5maXJzdChwYXJhbXMpID09ICcnKSB7XG4gICAgICAgICAgICBwYXJhbXMuc2hpZnQoKTtcbiAgICAgICAgICAgIHByZXZJbnN0cnVjdGlvbiA9IExpc3RXcmFwcGVyLmZpcnN0KGFuY2VzdG9ySW5zdHJ1Y3Rpb25zKTtcbiAgICAgICAgICAgIGFuY2VzdG9ySW5zdHJ1Y3Rpb25zID0gW107XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBwcmV2SW5zdHJ1Y3Rpb24gPSBhbmNlc3Rvckluc3RydWN0aW9ucy5sZW5ndGggPiAwID8gYW5jZXN0b3JJbnN0cnVjdGlvbnMucG9wKCkgOiBudWxsO1xuICAgICAgICAgICAgaWYgKExpc3RXcmFwcGVyLmZpcnN0KHBhcmFtcykgPT0gJy4nKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnNoaWZ0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChMaXN0V3JhcHBlci5maXJzdChwYXJhbXMpID09ICcuLicpIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoTGlzdFdyYXBwZXIuZmlyc3QocGFyYW1zKSA9PSAnLi4nKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmNlc3Rvckluc3RydWN0aW9ucy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oXCJMaW5rIFxcXCJcIiArIExpc3RXcmFwcGVyLnRvSlNPTihsaW5rUGFyYW1zKSArIFwiXFxcIiBoYXMgdG9vIG1hbnkgXFxcIi4uL1xcXCIgc2VnbWVudHMuXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHByZXZJbnN0cnVjdGlvbiA9IGFuY2VzdG9ySW5zdHJ1Y3Rpb25zLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMgPSBMaXN0V3JhcHBlci5zbGljZShwYXJhbXMsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHdlIG11c3Qgb25seSBwZWFrIGF0IHRoZSBsaW5rIHBhcmFtLCBhbmQgbm90IGNvbnN1bWUgaXRcbiAgICAgICAgICAgICAgICB2YXIgcm91dGVOYW1lID0gTGlzdFdyYXBwZXIuZmlyc3QocGFyYW1zKTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyZW50Q29tcG9uZW50VHlwZSA9IHRoaXMuX3Jvb3RDb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgdmFyIGdyYW5kcGFyZW50Q29tcG9uZW50VHlwZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKGFuY2VzdG9ySW5zdHJ1Y3Rpb25zLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmVudENvbXBvbmVudEluc3RydWN0aW9uID0gYW5jZXN0b3JJbnN0cnVjdGlvbnNbYW5jZXN0b3JJbnN0cnVjdGlvbnMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgICAgIHZhciBncmFuZENvbXBvbmVudEluc3RydWN0aW9uID0gYW5jZXN0b3JJbnN0cnVjdGlvbnNbYW5jZXN0b3JJbnN0cnVjdGlvbnMubGVuZ3RoIC0gMl07XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudENvbXBvbmVudFR5cGUgPSBwYXJlbnRDb21wb25lbnRJbnN0cnVjdGlvbi5jb21wb25lbnQuY29tcG9uZW50VHlwZTtcbiAgICAgICAgICAgICAgICAgICAgZ3JhbmRwYXJlbnRDb21wb25lbnRUeXBlID0gZ3JhbmRDb21wb25lbnRJbnN0cnVjdGlvbi5jb21wb25lbnQuY29tcG9uZW50VHlwZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoYW5jZXN0b3JJbnN0cnVjdGlvbnMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50Q29tcG9uZW50VHlwZSA9IGFuY2VzdG9ySW5zdHJ1Y3Rpb25zWzBdLmNvbXBvbmVudC5jb21wb25lbnRUeXBlO1xuICAgICAgICAgICAgICAgICAgICBncmFuZHBhcmVudENvbXBvbmVudFR5cGUgPSB0aGlzLl9yb290Q29tcG9uZW50O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBGb3IgYSBsaW5rIHdpdGggbm8gbGVhZGluZyBgLi9gLCBgL2AsIG9yIGAuLi9gLCB3ZSBsb29rIGZvciBhIHNpYmxpbmcgYW5kIGNoaWxkLlxuICAgICAgICAgICAgICAgIC8vIElmIGJvdGggZXhpc3QsIHdlIHRocm93LiBPdGhlcndpc2UsIHdlIHByZWZlciB3aGljaGV2ZXIgZXhpc3RzLlxuICAgICAgICAgICAgICAgIHZhciBjaGlsZFJvdXRlRXhpc3RzID0gdGhpcy5oYXNSb3V0ZShyb3V0ZU5hbWUsIHBhcmVudENvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgICAgIHZhciBwYXJlbnRSb3V0ZUV4aXN0cyA9IGlzUHJlc2VudChncmFuZHBhcmVudENvbXBvbmVudFR5cGUpICYmXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzUm91dGUocm91dGVOYW1lLCBncmFuZHBhcmVudENvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgICAgIGlmIChwYXJlbnRSb3V0ZUV4aXN0cyAmJiBjaGlsZFJvdXRlRXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtc2cgPSBcIkxpbmsgXFxcIlwiICsgTGlzdFdyYXBwZXIudG9KU09OKGxpbmtQYXJhbXMpICsgXCJcXFwiIGlzIGFtYmlndW91cywgdXNlIFxcXCIuL1xcXCIgb3IgXFxcIi4uL1xcXCIgdG8gZGlzYW1iaWd1YXRlLlwiO1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihtc2cpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocGFyZW50Um91dGVFeGlzdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJldkluc3RydWN0aW9uID0gYW5jZXN0b3JJbnN0cnVjdGlvbnMucG9wKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJhbXNbcGFyYW1zLmxlbmd0aCAtIDFdID09ICcnKSB7XG4gICAgICAgICAgICBwYXJhbXMucG9wKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhcmFtcy5sZW5ndGggPiAwICYmIHBhcmFtc1swXSA9PSAnJykge1xuICAgICAgICAgICAgcGFyYW1zLnNoaWZ0KCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhcmFtcy5sZW5ndGggPCAxKSB7XG4gICAgICAgICAgICB2YXIgbXNnID0gXCJMaW5rIFxcXCJcIiArIExpc3RXcmFwcGVyLnRvSlNPTihsaW5rUGFyYW1zKSArIFwiXFxcIiBtdXN0IGluY2x1ZGUgYSByb3V0ZSBuYW1lLlwiO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24obXNnKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZ2VuZXJhdGVkSW5zdHJ1Y3Rpb24gPSB0aGlzLl9nZW5lcmF0ZShwYXJhbXMsIGFuY2VzdG9ySW5zdHJ1Y3Rpb25zLCBwcmV2SW5zdHJ1Y3Rpb24sIF9hdXgsIGxpbmtQYXJhbXMpO1xuICAgICAgICAvLyB3ZSBkb24ndCBjbG9uZSB0aGUgZmlyc3QgKHJvb3QpIGVsZW1lbnRcbiAgICAgICAgZm9yICh2YXIgaSA9IGFuY2VzdG9ySW5zdHJ1Y3Rpb25zLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICB2YXIgYW5jZXN0b3JJbnN0cnVjdGlvbiA9IGFuY2VzdG9ySW5zdHJ1Y3Rpb25zW2ldO1xuICAgICAgICAgICAgaWYgKGlzQmxhbmsoYW5jZXN0b3JJbnN0cnVjdGlvbikpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGdlbmVyYXRlZEluc3RydWN0aW9uID0gYW5jZXN0b3JJbnN0cnVjdGlvbi5yZXBsYWNlQ2hpbGQoZ2VuZXJhdGVkSW5zdHJ1Y3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBnZW5lcmF0ZWRJbnN0cnVjdGlvbjtcbiAgICB9O1xuICAgIC8qXG4gICAgICogSW50ZXJuYWwgaGVscGVyIHRoYXQgZG9lcyBub3QgbWFrZSBhbnkgYXNzZXJ0aW9ucyBhYm91dCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBsaW5rIERTTC5cbiAgICAgKiBgYW5jZXN0b3JJbnN0cnVjdGlvbnNgIGFyZSBwYXJlbnRzIHRoYXQgd2lsbCBiZSBjbG9uZWQuXG4gICAgICogYHByZXZJbnN0cnVjdGlvbmAgaXMgdGhlIGV4aXN0aW5nIGluc3RydWN0aW9uIHRoYXQgd291bGQgYmUgcmVwbGFjZWQsIGJ1dCB3aGljaCBtaWdodCBoYXZlXG4gICAgICogYXV4IHJvdXRlcyB0aGF0IG5lZWQgdG8gYmUgY2xvbmVkLlxuICAgICAqL1xuICAgIFJvdXRlUmVnaXN0cnkucHJvdG90eXBlLl9nZW5lcmF0ZSA9IGZ1bmN0aW9uIChsaW5rUGFyYW1zLCBhbmNlc3Rvckluc3RydWN0aW9ucywgcHJldkluc3RydWN0aW9uLCBfYXV4LCBfb3JpZ2luYWxMaW5rKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmIChfYXV4ID09PSB2b2lkIDApIHsgX2F1eCA9IGZhbHNlOyB9XG4gICAgICAgIHZhciBwYXJlbnRDb21wb25lbnRUeXBlID0gdGhpcy5fcm9vdENvbXBvbmVudDtcbiAgICAgICAgdmFyIGNvbXBvbmVudEluc3RydWN0aW9uID0gbnVsbDtcbiAgICAgICAgdmFyIGF1eEluc3RydWN0aW9ucyA9IHt9O1xuICAgICAgICB2YXIgcGFyZW50SW5zdHJ1Y3Rpb24gPSBMaXN0V3JhcHBlci5sYXN0KGFuY2VzdG9ySW5zdHJ1Y3Rpb25zKTtcbiAgICAgICAgaWYgKGlzUHJlc2VudChwYXJlbnRJbnN0cnVjdGlvbikgJiYgaXNQcmVzZW50KHBhcmVudEluc3RydWN0aW9uLmNvbXBvbmVudCkpIHtcbiAgICAgICAgICAgIHBhcmVudENvbXBvbmVudFR5cGUgPSBwYXJlbnRJbnN0cnVjdGlvbi5jb21wb25lbnQuY29tcG9uZW50VHlwZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobGlua1BhcmFtcy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgdmFyIGRlZmF1bHRJbnN0cnVjdGlvbiA9IHRoaXMuZ2VuZXJhdGVEZWZhdWx0KHBhcmVudENvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgaWYgKGlzQmxhbmsoZGVmYXVsdEluc3RydWN0aW9uKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiTGluayBcXFwiXCIgKyBMaXN0V3JhcHBlci50b0pTT04oX29yaWdpbmFsTGluaykgKyBcIlxcXCIgZG9lcyBub3QgcmVzb2x2ZSB0byBhIHRlcm1pbmFsIGluc3RydWN0aW9uLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBkZWZhdWx0SW5zdHJ1Y3Rpb247XG4gICAgICAgIH1cbiAgICAgICAgLy8gZm9yIG5vbi1hdXggcm91dGVzLCB3ZSB3YW50IHRvIHJldXNlIHRoZSBwcmVkZWNlc3NvcidzIGV4aXN0aW5nIHByaW1hcnkgYW5kIGF1eCByb3V0ZXNcbiAgICAgICAgLy8gYW5kIG9ubHkgb3ZlcnJpZGUgcm91dGVzIGZvciB3aGljaCB0aGUgZ2l2ZW4gbGluayBEU0wgcHJvdmlkZXNcbiAgICAgICAgaWYgKGlzUHJlc2VudChwcmV2SW5zdHJ1Y3Rpb24pICYmICFfYXV4KSB7XG4gICAgICAgICAgICBhdXhJbnN0cnVjdGlvbnMgPSBTdHJpbmdNYXBXcmFwcGVyLm1lcmdlKHByZXZJbnN0cnVjdGlvbi5hdXhJbnN0cnVjdGlvbiwgYXV4SW5zdHJ1Y3Rpb25zKTtcbiAgICAgICAgICAgIGNvbXBvbmVudEluc3RydWN0aW9uID0gcHJldkluc3RydWN0aW9uLmNvbXBvbmVudDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY29tcG9uZW50UmVjb2duaXplciA9IHRoaXMuX3J1bGVzLmdldChwYXJlbnRDb21wb25lbnRUeXBlKTtcbiAgICAgICAgaWYgKGlzQmxhbmsoY29tcG9uZW50UmVjb2duaXplcikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiQ29tcG9uZW50IFxcXCJcIiArIGdldFR5cGVOYW1lRm9yRGVidWdnaW5nKHBhcmVudENvbXBvbmVudFR5cGUpICsgXCJcXFwiIGhhcyBubyByb3V0ZSBjb25maWcuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBsaW5rUGFyYW1JbmRleCA9IDA7XG4gICAgICAgIHZhciByb3V0ZVBhcmFtcyA9IHt9O1xuICAgICAgICAvLyBmaXJzdCwgcmVjb2duaXplIHRoZSBwcmltYXJ5IHJvdXRlIGlmIG9uZSBpcyBwcm92aWRlZFxuICAgICAgICBpZiAobGlua1BhcmFtSW5kZXggPCBsaW5rUGFyYW1zLmxlbmd0aCAmJiBpc1N0cmluZyhsaW5rUGFyYW1zW2xpbmtQYXJhbUluZGV4XSkpIHtcbiAgICAgICAgICAgIHZhciByb3V0ZU5hbWUgPSBsaW5rUGFyYW1zW2xpbmtQYXJhbUluZGV4XTtcbiAgICAgICAgICAgIGlmIChyb3V0ZU5hbWUgPT0gJycgfHwgcm91dGVOYW1lID09ICcuJyB8fCByb3V0ZU5hbWUgPT0gJy4uJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiXFxcIlwiICsgcm91dGVOYW1lICsgXCIvXFxcIiBpcyBvbmx5IGFsbG93ZWQgYXQgdGhlIGJlZ2lubmluZyBvZiBhIGxpbmsgRFNMLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxpbmtQYXJhbUluZGV4ICs9IDE7XG4gICAgICAgICAgICBpZiAobGlua1BhcmFtSW5kZXggPCBsaW5rUGFyYW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHZhciBsaW5rUGFyYW0gPSBsaW5rUGFyYW1zW2xpbmtQYXJhbUluZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoaXNTdHJpbmdNYXAobGlua1BhcmFtKSAmJiAhaXNBcnJheShsaW5rUGFyYW0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlUGFyYW1zID0gbGlua1BhcmFtO1xuICAgICAgICAgICAgICAgICAgICBsaW5rUGFyYW1JbmRleCArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciByb3V0ZVJlY29nbml6ZXIgPSAoX2F1eCA/IGNvbXBvbmVudFJlY29nbml6ZXIuYXV4TmFtZXMgOiBjb21wb25lbnRSZWNvZ25pemVyLm5hbWVzKS5nZXQocm91dGVOYW1lKTtcbiAgICAgICAgICAgIGlmIChpc0JsYW5rKHJvdXRlUmVjb2duaXplcikpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcIkNvbXBvbmVudCBcXFwiXCIgKyBnZXRUeXBlTmFtZUZvckRlYnVnZ2luZyhwYXJlbnRDb21wb25lbnRUeXBlKSArIFwiXFxcIiBoYXMgbm8gcm91dGUgbmFtZWQgXFxcIlwiICsgcm91dGVOYW1lICsgXCJcXFwiLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIENyZWF0ZSBhbiBcInVucmVzb2x2ZWQgaW5zdHJ1Y3Rpb25cIiBmb3IgYXN5bmMgcm91dGVzXG4gICAgICAgICAgICAvLyB3ZSdsbCBmaWd1cmUgb3V0IHRoZSByZXN0IG9mIHRoZSByb3V0ZSB3aGVuIHdlIHJlc29sdmUgdGhlIGluc3RydWN0aW9uIGFuZFxuICAgICAgICAgICAgLy8gcGVyZm9ybSBhIG5hdmlnYXRpb25cbiAgICAgICAgICAgIGlmIChpc0JsYW5rKHJvdXRlUmVjb2duaXplci5oYW5kbGVyLmNvbXBvbmVudFR5cGUpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbXBJbnN0cnVjdGlvbiA9IHJvdXRlUmVjb2duaXplci5nZW5lcmF0ZUNvbXBvbmVudFBhdGhWYWx1ZXMocm91dGVQYXJhbXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgaW5zdHJ1Y3Rpb25fMS5VbnJlc29sdmVkSW5zdHJ1Y3Rpb24oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcm91dGVSZWNvZ25pemVyLmhhbmRsZXIucmVzb2x2ZUNvbXBvbmVudFR5cGUoKS50aGVuKGZ1bmN0aW9uIChfKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gX3RoaXMuX2dlbmVyYXRlKGxpbmtQYXJhbXMsIGFuY2VzdG9ySW5zdHJ1Y3Rpb25zLCBwcmV2SW5zdHJ1Y3Rpb24sIF9hdXgsIF9vcmlnaW5hbExpbmspO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LCBjb21wSW5zdHJ1Y3Rpb25bJ3VybFBhdGgnXSwgY29tcEluc3RydWN0aW9uWyd1cmxQYXJhbXMnXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21wb25lbnRJbnN0cnVjdGlvbiA9IF9hdXggPyBjb21wb25lbnRSZWNvZ25pemVyLmdlbmVyYXRlQXV4aWxpYXJ5KHJvdXRlTmFtZSwgcm91dGVQYXJhbXMpIDpcbiAgICAgICAgICAgICAgICBjb21wb25lbnRSZWNvZ25pemVyLmdlbmVyYXRlKHJvdXRlTmFtZSwgcm91dGVQYXJhbXMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIE5leHQsIHJlY29nbml6ZSBhdXhpbGlhcnkgaW5zdHJ1Y3Rpb25zLlxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGFuIGFuY2VzdG9yIGluc3RydWN0aW9uLCB3ZSBwcmVzZXJ2ZSB3aGF0ZXZlciBhdXggcm91dGVzIGFyZSBhY3RpdmUgZnJvbSBpdC5cbiAgICAgICAgd2hpbGUgKGxpbmtQYXJhbUluZGV4IDwgbGlua1BhcmFtcy5sZW5ndGggJiYgaXNBcnJheShsaW5rUGFyYW1zW2xpbmtQYXJhbUluZGV4XSkpIHtcbiAgICAgICAgICAgIHZhciBhdXhQYXJlbnRJbnN0cnVjdGlvbiA9IFtwYXJlbnRJbnN0cnVjdGlvbl07XG4gICAgICAgICAgICB2YXIgYXV4SW5zdHJ1Y3Rpb24gPSB0aGlzLl9nZW5lcmF0ZShsaW5rUGFyYW1zW2xpbmtQYXJhbUluZGV4XSwgYXV4UGFyZW50SW5zdHJ1Y3Rpb24sIG51bGwsIHRydWUsIF9vcmlnaW5hbExpbmspO1xuICAgICAgICAgICAgLy8gVE9ETzogdGhpcyB3aWxsIG5vdCB3b3JrIGZvciBhdXggcm91dGVzIHdpdGggcGFyYW1ldGVycyBvciBtdWx0aXBsZSBzZWdtZW50c1xuICAgICAgICAgICAgYXV4SW5zdHJ1Y3Rpb25zW2F1eEluc3RydWN0aW9uLmNvbXBvbmVudC51cmxQYXRoXSA9IGF1eEluc3RydWN0aW9uO1xuICAgICAgICAgICAgbGlua1BhcmFtSW5kZXggKz0gMTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaW5zdHJ1Y3Rpb24gPSBuZXcgaW5zdHJ1Y3Rpb25fMS5SZXNvbHZlZEluc3RydWN0aW9uKGNvbXBvbmVudEluc3RydWN0aW9uLCBudWxsLCBhdXhJbnN0cnVjdGlvbnMpO1xuICAgICAgICAvLyBJZiB0aGUgY29tcG9uZW50IGlzIHN5bmMsIHdlIGNhbiBnZW5lcmF0ZSByZXNvbHZlZCBjaGlsZCByb3V0ZSBpbnN0cnVjdGlvbnNcbiAgICAgICAgLy8gSWYgbm90LCB3ZSdsbCByZXNvbHZlIHRoZSBpbnN0cnVjdGlvbnMgYXQgbmF2aWdhdGlvbiB0aW1lXG4gICAgICAgIGlmIChpc1ByZXNlbnQoY29tcG9uZW50SW5zdHJ1Y3Rpb24pICYmIGlzUHJlc2VudChjb21wb25lbnRJbnN0cnVjdGlvbi5jb21wb25lbnRUeXBlKSkge1xuICAgICAgICAgICAgdmFyIGNoaWxkSW5zdHJ1Y3Rpb24gPSBudWxsO1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudEluc3RydWN0aW9uLnRlcm1pbmFsKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxpbmtQYXJhbUluZGV4ID49IGxpbmtQYXJhbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkQW5jZXN0b3JDb21wb25lbnRzID0gYW5jZXN0b3JJbnN0cnVjdGlvbnMuY29uY2F0KFtpbnN0cnVjdGlvbl0pO1xuICAgICAgICAgICAgICAgIHZhciByZW1haW5pbmdMaW5rUGFyYW1zID0gbGlua1BhcmFtcy5zbGljZShsaW5rUGFyYW1JbmRleCk7XG4gICAgICAgICAgICAgICAgY2hpbGRJbnN0cnVjdGlvbiA9IHRoaXMuX2dlbmVyYXRlKHJlbWFpbmluZ0xpbmtQYXJhbXMsIGNoaWxkQW5jZXN0b3JDb21wb25lbnRzLCBudWxsLCBmYWxzZSwgX29yaWdpbmFsTGluayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpbnN0cnVjdGlvbi5jaGlsZCA9IGNoaWxkSW5zdHJ1Y3Rpb247XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGluc3RydWN0aW9uO1xuICAgIH07XG4gICAgUm91dGVSZWdpc3RyeS5wcm90b3R5cGUuaGFzUm91dGUgPSBmdW5jdGlvbiAobmFtZSwgcGFyZW50Q29tcG9uZW50KSB7XG4gICAgICAgIHZhciBjb21wb25lbnRSZWNvZ25pemVyID0gdGhpcy5fcnVsZXMuZ2V0KHBhcmVudENvbXBvbmVudCk7XG4gICAgICAgIGlmIChpc0JsYW5rKGNvbXBvbmVudFJlY29nbml6ZXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbXBvbmVudFJlY29nbml6ZXIuaGFzUm91dGUobmFtZSk7XG4gICAgfTtcbiAgICBSb3V0ZVJlZ2lzdHJ5LnByb3RvdHlwZS5nZW5lcmF0ZURlZmF1bHQgPSBmdW5jdGlvbiAoY29tcG9uZW50Q3Vyc29yKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmIChpc0JsYW5rKGNvbXBvbmVudEN1cnNvcikpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjb21wb25lbnRSZWNvZ25pemVyID0gdGhpcy5fcnVsZXMuZ2V0KGNvbXBvbmVudEN1cnNvcik7XG4gICAgICAgIGlmIChpc0JsYW5rKGNvbXBvbmVudFJlY29nbml6ZXIpIHx8IGlzQmxhbmsoY29tcG9uZW50UmVjb2duaXplci5kZWZhdWx0Um91dGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZGVmYXVsdENoaWxkID0gbnVsbDtcbiAgICAgICAgaWYgKGlzUHJlc2VudChjb21wb25lbnRSZWNvZ25pemVyLmRlZmF1bHRSb3V0ZS5oYW5kbGVyLmNvbXBvbmVudFR5cGUpKSB7XG4gICAgICAgICAgICB2YXIgY29tcG9uZW50SW5zdHJ1Y3Rpb24gPSBjb21wb25lbnRSZWNvZ25pemVyLmRlZmF1bHRSb3V0ZS5nZW5lcmF0ZSh7fSk7XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudFJlY29nbml6ZXIuZGVmYXVsdFJvdXRlLnRlcm1pbmFsKSB7XG4gICAgICAgICAgICAgICAgZGVmYXVsdENoaWxkID0gdGhpcy5nZW5lcmF0ZURlZmF1bHQoY29tcG9uZW50UmVjb2duaXplci5kZWZhdWx0Um91dGUuaGFuZGxlci5jb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXcgaW5zdHJ1Y3Rpb25fMS5EZWZhdWx0SW5zdHJ1Y3Rpb24oY29tcG9uZW50SW5zdHJ1Y3Rpb24sIGRlZmF1bHRDaGlsZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBpbnN0cnVjdGlvbl8xLlVucmVzb2x2ZWRJbnN0cnVjdGlvbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gY29tcG9uZW50UmVjb2duaXplci5kZWZhdWx0Um91dGUuaGFuZGxlci5yZXNvbHZlQ29tcG9uZW50VHlwZSgpLnRoZW4oZnVuY3Rpb24gKF8pIHsgcmV0dXJuIF90aGlzLmdlbmVyYXRlRGVmYXVsdChjb21wb25lbnRDdXJzb3IpOyB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICByZXR1cm4gUm91dGVSZWdpc3RyeTtcbn0pKCk7XG5leHBvcnRzLlJvdXRlUmVnaXN0cnkgPSBSb3V0ZVJlZ2lzdHJ5O1xuLypcbiAqIEdpdmVuOiBbJy9hL2InLCB7YzogMn1dXG4gKiBSZXR1cm5zOiBbJycsICdhJywgJ2InLCB7YzogMn1dXG4gKi9cbmZ1bmN0aW9uIHNwbGl0QW5kRmxhdHRlbkxpbmtQYXJhbXMobGlua1BhcmFtcykge1xuICAgIHJldHVybiBsaW5rUGFyYW1zLnJlZHVjZShmdW5jdGlvbiAoYWNjdW11bGF0aW9uLCBpdGVtKSB7XG4gICAgICAgIGlmIChpc1N0cmluZyhpdGVtKSkge1xuICAgICAgICAgICAgdmFyIHN0ckl0ZW0gPSBpdGVtO1xuICAgICAgICAgICAgcmV0dXJuIGFjY3VtdWxhdGlvbi5jb25jYXQoc3RySXRlbS5zcGxpdCgnLycpKTtcbiAgICAgICAgfVxuICAgICAgICBhY2N1bXVsYXRpb24ucHVzaChpdGVtKTtcbiAgICAgICAgcmV0dXJuIGFjY3VtdWxhdGlvbjtcbiAgICB9LCBbXSk7XG59XG4vKlxuICogR2l2ZW4gYSBsaXN0IG9mIGluc3RydWN0aW9ucywgcmV0dXJucyB0aGUgbW9zdCBzcGVjaWZpYyBpbnN0cnVjdGlvblxuICovXG5mdW5jdGlvbiBtb3N0U3BlY2lmaWMoaW5zdHJ1Y3Rpb25zKSB7XG4gICAgaW5zdHJ1Y3Rpb25zID0gaW5zdHJ1Y3Rpb25zLmZpbHRlcihmdW5jdGlvbiAoaW5zdHJ1Y3Rpb24pIHsgcmV0dXJuIGlzUHJlc2VudChpbnN0cnVjdGlvbik7IH0pO1xuICAgIGlmIChpbnN0cnVjdGlvbnMubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmIChpbnN0cnVjdGlvbnMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgcmV0dXJuIGluc3RydWN0aW9uc1swXTtcbiAgICB9XG4gICAgdmFyIGZpcnN0ID0gaW5zdHJ1Y3Rpb25zWzBdO1xuICAgIHZhciByZXN0ID0gaW5zdHJ1Y3Rpb25zLnNsaWNlKDEpO1xuICAgIHJldHVybiByZXN0LnJlZHVjZShmdW5jdGlvbiAoaW5zdHJ1Y3Rpb24sIGNvbnRlbmRlcikge1xuICAgICAgICBpZiAoY29tcGFyZVNwZWNpZmljaXR5U3RyaW5ncyhjb250ZW5kZXIuc3BlY2lmaWNpdHksIGluc3RydWN0aW9uLnNwZWNpZmljaXR5KSA9PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbnRlbmRlcjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5zdHJ1Y3Rpb247XG4gICAgfSwgZmlyc3QpO1xufVxuLypcbiAqIEV4cGVjdHMgc3RyaW5ncyB0byBiZSBpbiB0aGUgZm9ybSBvZiBcIlswLTJdK1wiXG4gKiBSZXR1cm5zIC0xIGlmIHN0cmluZyBBIHNob3VsZCBiZSBzb3J0ZWQgYWJvdmUgc3RyaW5nIEIsIDEgaWYgaXQgc2hvdWxkIGJlIHNvcnRlZCBhZnRlcixcbiAqIG9yIDAgaWYgdGhleSBhcmUgdGhlIHNhbWUuXG4gKi9cbmZ1bmN0aW9uIGNvbXBhcmVTcGVjaWZpY2l0eVN0cmluZ3MoYSwgYikge1xuICAgIHZhciBsID0gTWF0aC5taW4oYS5sZW5ndGgsIGIubGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkgKz0gMSkge1xuICAgICAgICB2YXIgYWkgPSBTdHJpbmdXcmFwcGVyLmNoYXJDb2RlQXQoYSwgaSk7XG4gICAgICAgIHZhciBiaSA9IFN0cmluZ1dyYXBwZXIuY2hhckNvZGVBdChiLCBpKTtcbiAgICAgICAgdmFyIGRpZmZlcmVuY2UgPSBiaSAtIGFpO1xuICAgICAgICBpZiAoZGlmZmVyZW5jZSAhPSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gZGlmZmVyZW5jZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYS5sZW5ndGggLSBiLmxlbmd0aDtcbn1cbmZ1bmN0aW9uIGFzc2VydFRlcm1pbmFsQ29tcG9uZW50KGNvbXBvbmVudCwgcGF0aCkge1xuICAgIGlmICghaXNUeXBlKGNvbXBvbmVudCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgYW5ub3RhdGlvbnMgPSByZWZsZWN0b3IuYW5ub3RhdGlvbnMoY29tcG9uZW50KTtcbiAgICBpZiAoaXNQcmVzZW50KGFubm90YXRpb25zKSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFubm90YXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYW5ub3RhdGlvbiA9IGFubm90YXRpb25zW2ldO1xuICAgICAgICAgICAgaWYgKGFubm90YXRpb24gaW5zdGFuY2VvZiByb3V0ZV9jb25maWdfaW1wbF8xLlJvdXRlQ29uZmlnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oXCJDaGlsZCByb3V0ZXMgYXJlIG5vdCBhbGxvd2VkIGZvciBcXFwiXCIgKyBwYXRoICsgXCJcXFwiLiBVc2UgXFxcIi4uLlxcXCIgb24gdGhlIHBhcmVudCdzIHJvdXRlIHBhdGguXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgcm91dGVfbGlmZWN5Y2xlX3JlZmxlY3Rvcl8xID0gcmVxdWlyZSgnLi9yb3V0ZV9saWZlY3ljbGVfcmVmbGVjdG9yJyk7XG52YXIgX3Jlc29sdmVUb1RydWUgPSBQcm9taXNlV3JhcHBlci5yZXNvbHZlKHRydWUpO1xudmFyIF9yZXNvbHZlVG9GYWxzZSA9IFByb21pc2VXcmFwcGVyLnJlc29sdmUoZmFsc2UpO1xuLyoqXG4gKiBUaGUgYFJvdXRlcmAgaXMgcmVzcG9uc2libGUgZm9yIG1hcHBpbmcgVVJMcyB0byBjb21wb25lbnRzLlxuICpcbiAqIFlvdSBjYW4gc2VlIHRoZSBzdGF0ZSBvZiB0aGUgcm91dGVyIGJ5IGluc3BlY3RpbmcgdGhlIHJlYWQtb25seSBmaWVsZCBgcm91dGVyLm5hdmlnYXRpbmdgLlxuICogVGhpcyBtYXkgYmUgdXNlZnVsIGZvciBzaG93aW5nIGEgc3Bpbm5lciwgZm9yIGluc3RhbmNlLlxuICpcbiAqICMjIENvbmNlcHRzXG4gKlxuICogUm91dGVycyBhbmQgY29tcG9uZW50IGluc3RhbmNlcyBoYXZlIGEgMToxIGNvcnJlc3BvbmRlbmNlLlxuICpcbiAqIFRoZSByb3V0ZXIgaG9sZHMgcmVmZXJlbmNlIHRvIGEgbnVtYmVyIG9mIHtAbGluayBSb3V0ZXJPdXRsZXR9LlxuICogQW4gb3V0bGV0IGlzIGEgcGxhY2Vob2xkZXIgdGhhdCB0aGUgcm91dGVyIGR5bmFtaWNhbGx5IGZpbGxzIGluIGRlcGVuZGluZyBvbiB0aGUgY3VycmVudCBVUkwuXG4gKlxuICogV2hlbiB0aGUgcm91dGVyIG5hdmlnYXRlcyBmcm9tIGEgVVJMLCBpdCBtdXN0IGZpcnN0IHJlY29nbml6ZSBpdCBhbmQgc2VyaWFsaXplIGl0IGludG8gYW5cbiAqIGBJbnN0cnVjdGlvbmAuXG4gKiBUaGUgcm91dGVyIHVzZXMgdGhlIGBSb3V0ZVJlZ2lzdHJ5YCB0byBnZXQgYW4gYEluc3RydWN0aW9uYC5cbiAqL1xudmFyIFJvdXRlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gUm91dGVyKHJlZ2lzdHJ5LCBwYXJlbnQsIGhvc3RDb21wb25lbnQpIHtcbiAgICAgICAgdGhpcy5yZWdpc3RyeSA9IHJlZ2lzdHJ5O1xuICAgICAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICAgICAgdGhpcy5ob3N0Q29tcG9uZW50ID0gaG9zdENvbXBvbmVudDtcbiAgICAgICAgdGhpcy5uYXZpZ2F0aW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRJbnN0cnVjdGlvbiA9IG51bGw7XG4gICAgICAgIHRoaXMuX2N1cnJlbnROYXZpZ2F0aW9uID0gX3Jlc29sdmVUb1RydWU7XG4gICAgICAgIHRoaXMuX291dGxldCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2F1eFJvdXRlcnMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuX3N1YmplY3QgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSBjaGlsZCByb3V0ZXIuIFlvdSBwcm9iYWJseSBkb24ndCBuZWVkIHRvIHVzZSB0aGlzIHVubGVzcyB5b3UncmUgd3JpdGluZyBhIHJldXNhYmxlXG4gICAgICogY29tcG9uZW50LlxuICAgICAqL1xuICAgIFJvdXRlci5wcm90b3R5cGUuY2hpbGRSb3V0ZXIgPSBmdW5jdGlvbiAoaG9zdENvbXBvbmVudCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2hpbGRSb3V0ZXIgPSBuZXcgQ2hpbGRSb3V0ZXIodGhpcywgaG9zdENvbXBvbmVudCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgY2hpbGQgcm91dGVyLiBZb3UgcHJvYmFibHkgZG9uJ3QgbmVlZCB0byB1c2UgdGhpcyB1bmxlc3MgeW91J3JlIHdyaXRpbmcgYSByZXVzYWJsZVxuICAgICAqIGNvbXBvbmVudC5cbiAgICAgKi9cbiAgICBSb3V0ZXIucHJvdG90eXBlLmF1eFJvdXRlciA9IGZ1bmN0aW9uIChob3N0Q29tcG9uZW50KSB7IHJldHVybiBuZXcgQ2hpbGRSb3V0ZXIodGhpcywgaG9zdENvbXBvbmVudCk7IH07XG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXIgYW4gb3V0bGV0IHRvIGJlIG5vdGlmaWVkIG9mIHByaW1hcnkgcm91dGUgY2hhbmdlcy5cbiAgICAgKlxuICAgICAqIFlvdSBwcm9iYWJseSBkb24ndCBuZWVkIHRvIHVzZSB0aGlzIHVubGVzcyB5b3UncmUgd3JpdGluZyBhIHJldXNhYmxlIGNvbXBvbmVudC5cbiAgICAgKi9cbiAgICBSb3V0ZXIucHJvdG90eXBlLnJlZ2lzdGVyUHJpbWFyeU91dGxldCA9IGZ1bmN0aW9uIChvdXRsZXQpIHtcbiAgICAgICAgaWYgKGlzUHJlc2VudChvdXRsZXQubmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwicmVnaXN0ZXJQcmltYXJ5T3V0bGV0IGV4cGVjdHMgdG8gYmUgY2FsbGVkIHdpdGggYW4gdW5uYW1lZCBvdXRsZXQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX291dGxldCA9IG91dGxldDtcbiAgICAgICAgaWYgKGlzUHJlc2VudCh0aGlzLl9jdXJyZW50SW5zdHJ1Y3Rpb24pKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb21taXQodGhpcy5fY3VycmVudEluc3RydWN0aW9uLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIF9yZXNvbHZlVG9UcnVlO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXIgYW4gb3V0bGV0IHRvIG5vdGlmaWVkIG9mIGF1eGlsaWFyeSByb3V0ZSBjaGFuZ2VzLlxuICAgICAqXG4gICAgICogWW91IHByb2JhYmx5IGRvbid0IG5lZWQgdG8gdXNlIHRoaXMgdW5sZXNzIHlvdSdyZSB3cml0aW5nIGEgcmV1c2FibGUgY29tcG9uZW50LlxuICAgICAqL1xuICAgIFJvdXRlci5wcm90b3R5cGUucmVnaXN0ZXJBdXhPdXRsZXQgPSBmdW5jdGlvbiAob3V0bGV0KSB7XG4gICAgICAgIHZhciBvdXRsZXROYW1lID0gb3V0bGV0Lm5hbWU7XG4gICAgICAgIGlmIChpc0JsYW5rKG91dGxldE5hbWUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcInJlZ2lzdGVyQXV4T3V0bGV0IGV4cGVjdHMgdG8gYmUgY2FsbGVkIHdpdGggYW4gb3V0bGV0IHdpdGggYSBuYW1lLlwiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcm91dGVyID0gdGhpcy5hdXhSb3V0ZXIodGhpcy5ob3N0Q29tcG9uZW50KTtcbiAgICAgICAgdGhpcy5fYXV4Um91dGVycy5zZXQob3V0bGV0TmFtZSwgcm91dGVyKTtcbiAgICAgICAgcm91dGVyLl9vdXRsZXQgPSBvdXRsZXQ7XG4gICAgICAgIHZhciBhdXhJbnN0cnVjdGlvbjtcbiAgICAgICAgaWYgKGlzUHJlc2VudCh0aGlzLl9jdXJyZW50SW5zdHJ1Y3Rpb24pICYmXG4gICAgICAgICAgICBpc1ByZXNlbnQoYXV4SW5zdHJ1Y3Rpb24gPSB0aGlzLl9jdXJyZW50SW5zdHJ1Y3Rpb24uYXV4SW5zdHJ1Y3Rpb25bb3V0bGV0TmFtZV0pKSB7XG4gICAgICAgICAgICByZXR1cm4gcm91dGVyLmNvbW1pdChhdXhJbnN0cnVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIF9yZXNvbHZlVG9UcnVlO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogR2l2ZW4gYW4gaW5zdHJ1Y3Rpb24sIHJldHVybnMgYHRydWVgIGlmIHRoZSBpbnN0cnVjdGlvbiBpcyBjdXJyZW50bHkgYWN0aXZlLFxuICAgICAqIG90aGVyd2lzZSBgZmFsc2VgLlxuICAgICAqL1xuICAgIFJvdXRlci5wcm90b3R5cGUuaXNSb3V0ZUFjdGl2ZSA9IGZ1bmN0aW9uIChpbnN0cnVjdGlvbikge1xuICAgICAgICB2YXIgcm91dGVyID0gdGhpcztcbiAgICAgICAgd2hpbGUgKGlzUHJlc2VudChyb3V0ZXIucGFyZW50KSAmJiBpc1ByZXNlbnQoaW5zdHJ1Y3Rpb24uY2hpbGQpKSB7XG4gICAgICAgICAgICByb3V0ZXIgPSByb3V0ZXIucGFyZW50O1xuICAgICAgICAgICAgaW5zdHJ1Y3Rpb24gPSBpbnN0cnVjdGlvbi5jaGlsZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaXNQcmVzZW50KHRoaXMuX2N1cnJlbnRJbnN0cnVjdGlvbikgJiZcbiAgICAgICAgICAgIHRoaXMuX2N1cnJlbnRJbnN0cnVjdGlvbi5jb21wb25lbnQgPT0gaW5zdHJ1Y3Rpb24uY29tcG9uZW50O1xuICAgIH07XG4gICAgLyoqXG4gICAgICogRHluYW1pY2FsbHkgdXBkYXRlIHRoZSByb3V0aW5nIGNvbmZpZ3VyYXRpb24gYW5kIHRyaWdnZXIgYSBuYXZpZ2F0aW9uLlxuICAgICAqXG4gICAgICogIyMjIFVzYWdlXG4gICAgICpcbiAgICAgKiBgYGBcbiAgICAgKiByb3V0ZXIuY29uZmlnKFtcbiAgICAgKiAgIHsgJ3BhdGgnOiAnLycsICdjb21wb25lbnQnOiBJbmRleENvbXAgfSxcbiAgICAgKiAgIHsgJ3BhdGgnOiAnL3VzZXIvOmlkJywgJ2NvbXBvbmVudCc6IFVzZXJDb21wIH0sXG4gICAgICogXSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgUm91dGVyLnByb3RvdHlwZS5jb25maWcgPSBmdW5jdGlvbiAoZGVmaW5pdGlvbnMpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgZGVmaW5pdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAocm91dGVEZWZpbml0aW9uKSB7IF90aGlzLnJlZ2lzdHJ5LmNvbmZpZyhfdGhpcy5ob3N0Q29tcG9uZW50LCByb3V0ZURlZmluaXRpb24pOyB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVuYXZpZ2F0ZSgpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogTmF2aWdhdGUgYmFzZWQgb24gdGhlIHByb3ZpZGVkIFJvdXRlIExpbmsgRFNMLiBJdCdzIHByZWZlcnJlZCB0byBuYXZpZ2F0ZSB3aXRoIHRoaXMgbWV0aG9kXG4gICAgICogb3ZlciBgbmF2aWdhdGVCeVVybGAuXG4gICAgICpcbiAgICAgKiAjIyMgVXNhZ2VcbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIHRha2VzIGFuIGFycmF5IHJlcHJlc2VudGluZyB0aGUgUm91dGUgTGluayBEU0w6XG4gICAgICogYGBgXG4gICAgICogWycuL015Q21wJywge3BhcmFtOiAzfV1cbiAgICAgKiBgYGBcbiAgICAgKiBTZWUgdGhlIHtAbGluayBSb3V0ZXJMaW5rfSBkaXJlY3RpdmUgZm9yIG1vcmUuXG4gICAgICovXG4gICAgUm91dGVyLnByb3RvdHlwZS5uYXZpZ2F0ZSA9IGZ1bmN0aW9uIChsaW5rUGFyYW1zKSB7XG4gICAgICAgIHZhciBpbnN0cnVjdGlvbiA9IHRoaXMuZ2VuZXJhdGUobGlua1BhcmFtcyk7XG4gICAgICAgIHJldHVybiB0aGlzLm5hdmlnYXRlQnlJbnN0cnVjdGlvbihpbnN0cnVjdGlvbiwgZmFsc2UpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogTmF2aWdhdGUgdG8gYSBVUkwuIFJldHVybnMgYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiBuYXZpZ2F0aW9uIGlzIGNvbXBsZXRlLlxuICAgICAqIEl0J3MgcHJlZmVycmVkIHRvIG5hdmlnYXRlIHdpdGggYG5hdmlnYXRlYCBpbnN0ZWFkIG9mIHRoaXMgbWV0aG9kLCBzaW5jZSBVUkxzIGFyZSBtb3JlIGJyaXR0bGUuXG4gICAgICpcbiAgICAgKiBJZiB0aGUgZ2l2ZW4gVVJMIGJlZ2lucyB3aXRoIGEgYC9gLCByb3V0ZXIgd2lsbCBuYXZpZ2F0ZSBhYnNvbHV0ZWx5LlxuICAgICAqIElmIHRoZSBnaXZlbiBVUkwgZG9lcyBub3QgYmVnaW4gd2l0aCBgL2AsIHRoZSByb3V0ZXIgd2lsbCBuYXZpZ2F0ZSByZWxhdGl2ZSB0byB0aGlzIGNvbXBvbmVudC5cbiAgICAgKi9cbiAgICBSb3V0ZXIucHJvdG90eXBlLm5hdmlnYXRlQnlVcmwgPSBmdW5jdGlvbiAodXJsLCBfc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmIChfc2tpcExvY2F0aW9uQ2hhbmdlID09PSB2b2lkIDApIHsgX3NraXBMb2NhdGlvbkNoYW5nZSA9IGZhbHNlOyB9XG4gICAgICAgIHJldHVybiB0aGlzLl9jdXJyZW50TmF2aWdhdGlvbiA9IHRoaXMuX2N1cnJlbnROYXZpZ2F0aW9uLnRoZW4oZnVuY3Rpb24gKF8pIHtcbiAgICAgICAgICAgIF90aGlzLmxhc3ROYXZpZ2F0aW9uQXR0ZW1wdCA9IHVybDtcbiAgICAgICAgICAgIF90aGlzLl9zdGFydE5hdmlnYXRpbmcoKTtcbiAgICAgICAgICAgIHJldHVybiBfdGhpcy5fYWZ0ZXJQcm9taXNlRmluaXNoTmF2aWdhdGluZyhfdGhpcy5yZWNvZ25pemUodXJsKS50aGVuKGZ1bmN0aW9uIChpbnN0cnVjdGlvbikge1xuICAgICAgICAgICAgICAgIGlmIChpc0JsYW5rKGluc3RydWN0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcy5fbmF2aWdhdGUoaW5zdHJ1Y3Rpb24sIF9za2lwTG9jYXRpb25DaGFuZ2UpO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIE5hdmlnYXRlIHZpYSB0aGUgcHJvdmlkZWQgaW5zdHJ1Y3Rpb24uIFJldHVybnMgYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiBuYXZpZ2F0aW9uIGlzXG4gICAgICogY29tcGxldGUuXG4gICAgICovXG4gICAgUm91dGVyLnByb3RvdHlwZS5uYXZpZ2F0ZUJ5SW5zdHJ1Y3Rpb24gPSBmdW5jdGlvbiAoaW5zdHJ1Y3Rpb24sIF9za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgaWYgKF9za2lwTG9jYXRpb25DaGFuZ2UgPT09IHZvaWQgMCkgeyBfc2tpcExvY2F0aW9uQ2hhbmdlID0gZmFsc2U7IH1cbiAgICAgICAgaWYgKGlzQmxhbmsoaW5zdHJ1Y3Rpb24pKSB7XG4gICAgICAgICAgICByZXR1cm4gX3Jlc29sdmVUb0ZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9jdXJyZW50TmF2aWdhdGlvbiA9IHRoaXMuX2N1cnJlbnROYXZpZ2F0aW9uLnRoZW4oZnVuY3Rpb24gKF8pIHtcbiAgICAgICAgICAgIF90aGlzLl9zdGFydE5hdmlnYXRpbmcoKTtcbiAgICAgICAgICAgIHJldHVybiBfdGhpcy5fYWZ0ZXJQcm9taXNlRmluaXNoTmF2aWdhdGluZyhfdGhpcy5fbmF2aWdhdGUoaW5zdHJ1Y3Rpb24sIF9za2lwTG9jYXRpb25DaGFuZ2UpKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgUm91dGVyLnByb3RvdHlwZS5fbmF2aWdhdGUgPSBmdW5jdGlvbiAoaW5zdHJ1Y3Rpb24sIF9za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NldHRsZUluc3RydWN0aW9uKGluc3RydWN0aW9uKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKF8pIHsgcmV0dXJuIF90aGlzLl9yb3V0ZXJDYW5SZXVzZShpbnN0cnVjdGlvbik7IH0pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoXykgeyByZXR1cm4gX3RoaXMuX2NhbkFjdGl2YXRlKGluc3RydWN0aW9uKTsgfSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIF90aGlzLl9yb3V0ZXJDYW5EZWFjdGl2YXRlKGluc3RydWN0aW9uKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcy5jb21taXQoaW5zdHJ1Y3Rpb24sIF9za2lwTG9jYXRpb25DaGFuZ2UpXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoXykge1xuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX2VtaXROYXZpZ2F0aW9uRmluaXNoKGluc3RydWN0aW9uLnRvUm9vdFVybCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgUm91dGVyLnByb3RvdHlwZS5fc2V0dGxlSW5zdHJ1Y3Rpb24gPSBmdW5jdGlvbiAoaW5zdHJ1Y3Rpb24pIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgcmV0dXJuIGluc3RydWN0aW9uLnJlc29sdmVDb21wb25lbnQoKS50aGVuKGZ1bmN0aW9uIChfKSB7XG4gICAgICAgICAgICB2YXIgdW5zZXR0bGVkSW5zdHJ1Y3Rpb25zID0gW107XG4gICAgICAgICAgICBpZiAoaXNQcmVzZW50KGluc3RydWN0aW9uLmNvbXBvbmVudCkpIHtcbiAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbi5jb21wb25lbnQucmV1c2UgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc1ByZXNlbnQoaW5zdHJ1Y3Rpb24uY2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgdW5zZXR0bGVkSW5zdHJ1Y3Rpb25zLnB1c2goX3RoaXMuX3NldHRsZUluc3RydWN0aW9uKGluc3RydWN0aW9uLmNoaWxkKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBTdHJpbmdNYXBXcmFwcGVyLmZvckVhY2goaW5zdHJ1Y3Rpb24uYXV4SW5zdHJ1Y3Rpb24sIGZ1bmN0aW9uIChpbnN0cnVjdGlvbiwgXykge1xuICAgICAgICAgICAgICAgIHVuc2V0dGxlZEluc3RydWN0aW9ucy5wdXNoKF90aGlzLl9zZXR0bGVJbnN0cnVjdGlvbihpbnN0cnVjdGlvbikpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZVdyYXBwZXIuYWxsKHVuc2V0dGxlZEluc3RydWN0aW9ucyk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgUm91dGVyLnByb3RvdHlwZS5fZW1pdE5hdmlnYXRpb25GaW5pc2ggPSBmdW5jdGlvbiAodXJsKSB7IE9ic2VydmFibGVXcmFwcGVyLmNhbGxFbWl0KHRoaXMuX3N1YmplY3QsIHVybCk7IH07XG4gICAgUm91dGVyLnByb3RvdHlwZS5fYWZ0ZXJQcm9taXNlRmluaXNoTmF2aWdhdGluZyA9IGZ1bmN0aW9uIChwcm9taXNlKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHJldHVybiBQcm9taXNlV3JhcHBlci5jYXRjaEVycm9yKHByb21pc2UudGhlbihmdW5jdGlvbiAoXykgeyByZXR1cm4gX3RoaXMuX2ZpbmlzaE5hdmlnYXRpbmcoKTsgfSksIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIF90aGlzLl9maW5pc2hOYXZpZ2F0aW5nKCk7XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgLypcbiAgICAgKiBSZWN1cnNpdmVseSBzZXQgcmV1c2UgZmxhZ3NcbiAgICAgKi9cbiAgICAvKiogQGludGVybmFsICovXG4gICAgUm91dGVyLnByb3RvdHlwZS5fcm91dGVyQ2FuUmV1c2UgPSBmdW5jdGlvbiAoaW5zdHJ1Y3Rpb24pIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgaWYgKGlzQmxhbmsodGhpcy5fb3V0bGV0KSkge1xuICAgICAgICAgICAgcmV0dXJuIF9yZXNvbHZlVG9GYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNCbGFuayhpbnN0cnVjdGlvbi5jb21wb25lbnQpKSB7XG4gICAgICAgICAgICByZXR1cm4gX3Jlc29sdmVUb1RydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX291dGxldC5yb3V0ZXJDYW5SZXVzZShpbnN0cnVjdGlvbi5jb21wb25lbnQpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICBpbnN0cnVjdGlvbi5jb21wb25lbnQucmV1c2UgPSByZXN1bHQ7XG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIGlzUHJlc2VudChfdGhpcy5fY2hpbGRSb3V0ZXIpICYmIGlzUHJlc2VudChpbnN0cnVjdGlvbi5jaGlsZCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX3RoaXMuX2NoaWxkUm91dGVyLl9yb3V0ZXJDYW5SZXVzZShpbnN0cnVjdGlvbi5jaGlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgUm91dGVyLnByb3RvdHlwZS5fY2FuQWN0aXZhdGUgPSBmdW5jdGlvbiAobmV4dEluc3RydWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBjYW5BY3RpdmF0ZU9uZShuZXh0SW5zdHJ1Y3Rpb24sIHRoaXMuX2N1cnJlbnRJbnN0cnVjdGlvbik7XG4gICAgfTtcbiAgICBSb3V0ZXIucHJvdG90eXBlLl9yb3V0ZXJDYW5EZWFjdGl2YXRlID0gZnVuY3Rpb24gKGluc3RydWN0aW9uKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmIChpc0JsYW5rKHRoaXMuX291dGxldCkpIHtcbiAgICAgICAgICAgIHJldHVybiBfcmVzb2x2ZVRvVHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbmV4dDtcbiAgICAgICAgdmFyIGNoaWxkSW5zdHJ1Y3Rpb24gPSBudWxsO1xuICAgICAgICB2YXIgcmV1c2UgPSBmYWxzZTtcbiAgICAgICAgdmFyIGNvbXBvbmVudEluc3RydWN0aW9uID0gbnVsbDtcbiAgICAgICAgaWYgKGlzUHJlc2VudChpbnN0cnVjdGlvbikpIHtcbiAgICAgICAgICAgIGNoaWxkSW5zdHJ1Y3Rpb24gPSBpbnN0cnVjdGlvbi5jaGlsZDtcbiAgICAgICAgICAgIGNvbXBvbmVudEluc3RydWN0aW9uID0gaW5zdHJ1Y3Rpb24uY29tcG9uZW50O1xuICAgICAgICAgICAgcmV1c2UgPSBpc0JsYW5rKGluc3RydWN0aW9uLmNvbXBvbmVudCkgfHwgaW5zdHJ1Y3Rpb24uY29tcG9uZW50LnJldXNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXVzZSkge1xuICAgICAgICAgICAgbmV4dCA9IF9yZXNvbHZlVG9UcnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbmV4dCA9IHRoaXMuX291dGxldC5yb3V0ZXJDYW5EZWFjdGl2YXRlKGNvbXBvbmVudEluc3RydWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPOiBhdXggcm91dGUgbGlmZWN5Y2xlIGhvb2tzXG4gICAgICAgIHJldHVybiBuZXh0LnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc1ByZXNlbnQoX3RoaXMuX2NoaWxkUm91dGVyKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcy5fY2hpbGRSb3V0ZXIuX3JvdXRlckNhbkRlYWN0aXZhdGUoY2hpbGRJbnN0cnVjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoaXMgcm91dGVyIGFuZCBhbGwgZGVzY2VuZGFudCByb3V0ZXJzIGFjY29yZGluZyB0byB0aGUgZ2l2ZW4gaW5zdHJ1Y3Rpb25cbiAgICAgKi9cbiAgICBSb3V0ZXIucHJvdG90eXBlLmNvbW1pdCA9IGZ1bmN0aW9uIChpbnN0cnVjdGlvbiwgX3NraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICBpZiAoX3NraXBMb2NhdGlvbkNoYW5nZSA9PT0gdm9pZCAwKSB7IF9za2lwTG9jYXRpb25DaGFuZ2UgPSBmYWxzZTsgfVxuICAgICAgICB0aGlzLl9jdXJyZW50SW5zdHJ1Y3Rpb24gPSBpbnN0cnVjdGlvbjtcbiAgICAgICAgdmFyIG5leHQgPSBfcmVzb2x2ZVRvVHJ1ZTtcbiAgICAgICAgaWYgKGlzUHJlc2VudCh0aGlzLl9vdXRsZXQpICYmIGlzUHJlc2VudChpbnN0cnVjdGlvbi5jb21wb25lbnQpKSB7XG4gICAgICAgICAgICB2YXIgY29tcG9uZW50SW5zdHJ1Y3Rpb24gPSBpbnN0cnVjdGlvbi5jb21wb25lbnQ7XG4gICAgICAgICAgICBpZiAoY29tcG9uZW50SW5zdHJ1Y3Rpb24ucmV1c2UpIHtcbiAgICAgICAgICAgICAgICBuZXh0ID0gdGhpcy5fb3V0bGV0LnJldXNlKGNvbXBvbmVudEluc3RydWN0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG5leHQgPVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlYWN0aXZhdGUoaW5zdHJ1Y3Rpb24pLnRoZW4oZnVuY3Rpb24gKF8pIHsgcmV0dXJuIF90aGlzLl9vdXRsZXQuYWN0aXZhdGUoY29tcG9uZW50SW5zdHJ1Y3Rpb24pOyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc1ByZXNlbnQoaW5zdHJ1Y3Rpb24uY2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgbmV4dCA9IG5leHQudGhlbihmdW5jdGlvbiAoXykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNQcmVzZW50KF90aGlzLl9jaGlsZFJvdXRlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcy5fY2hpbGRSb3V0ZXIuY29tbWl0KGluc3RydWN0aW9uLmNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBwcm9taXNlcyA9IFtdO1xuICAgICAgICB0aGlzLl9hdXhSb3V0ZXJzLmZvckVhY2goZnVuY3Rpb24gKHJvdXRlciwgbmFtZSkge1xuICAgICAgICAgICAgaWYgKGlzUHJlc2VudChpbnN0cnVjdGlvbi5hdXhJbnN0cnVjdGlvbltuYW1lXSkpIHtcbiAgICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKHJvdXRlci5jb21taXQoaW5zdHJ1Y3Rpb24uYXV4SW5zdHJ1Y3Rpb25bbmFtZV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBuZXh0LnRoZW4oZnVuY3Rpb24gKF8pIHsgcmV0dXJuIFByb21pc2VXcmFwcGVyLmFsbChwcm9taXNlcyk7IH0pO1xuICAgIH07XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIFJvdXRlci5wcm90b3R5cGUuX3N0YXJ0TmF2aWdhdGluZyA9IGZ1bmN0aW9uICgpIHsgdGhpcy5uYXZpZ2F0aW5nID0gdHJ1ZTsgfTtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgUm91dGVyLnByb3RvdHlwZS5fZmluaXNoTmF2aWdhdGluZyA9IGZ1bmN0aW9uICgpIHsgdGhpcy5uYXZpZ2F0aW5nID0gZmFsc2U7IH07XG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIFVSTCB1cGRhdGVzIGZyb20gdGhlIHJvdXRlclxuICAgICAqL1xuICAgIFJvdXRlci5wcm90b3R5cGUuc3Vic2NyaWJlID0gZnVuY3Rpb24gKG9uTmV4dCkge1xuICAgICAgICByZXR1cm4gT2JzZXJ2YWJsZVdyYXBwZXIuc3Vic2NyaWJlKHRoaXMuX3N1YmplY3QsIG9uTmV4dCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIHRoZSBjb250ZW50cyBvZiB0aGlzIHJvdXRlcidzIG91dGxldCBhbmQgYWxsIGRlc2NlbmRhbnQgb3V0bGV0c1xuICAgICAqL1xuICAgIFJvdXRlci5wcm90b3R5cGUuZGVhY3RpdmF0ZSA9IGZ1bmN0aW9uIChpbnN0cnVjdGlvbikge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB2YXIgY2hpbGRJbnN0cnVjdGlvbiA9IG51bGw7XG4gICAgICAgIHZhciBjb21wb25lbnRJbnN0cnVjdGlvbiA9IG51bGw7XG4gICAgICAgIGlmIChpc1ByZXNlbnQoaW5zdHJ1Y3Rpb24pKSB7XG4gICAgICAgICAgICBjaGlsZEluc3RydWN0aW9uID0gaW5zdHJ1Y3Rpb24uY2hpbGQ7XG4gICAgICAgICAgICBjb21wb25lbnRJbnN0cnVjdGlvbiA9IGluc3RydWN0aW9uLmNvbXBvbmVudDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbmV4dCA9IF9yZXNvbHZlVG9UcnVlO1xuICAgICAgICBpZiAoaXNQcmVzZW50KHRoaXMuX2NoaWxkUm91dGVyKSkge1xuICAgICAgICAgICAgbmV4dCA9IHRoaXMuX2NoaWxkUm91dGVyLmRlYWN0aXZhdGUoY2hpbGRJbnN0cnVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzUHJlc2VudCh0aGlzLl9vdXRsZXQpKSB7XG4gICAgICAgICAgICBuZXh0ID0gbmV4dC50aGVuKGZ1bmN0aW9uIChfKSB7IHJldHVybiBfdGhpcy5fb3V0bGV0LmRlYWN0aXZhdGUoY29tcG9uZW50SW5zdHJ1Y3Rpb24pOyB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPOiBoYW5kbGUgYXV4IHJvdXRlc1xuICAgICAgICByZXR1cm4gbmV4dDtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEdpdmVuIGEgVVJMLCByZXR1cm5zIGFuIGluc3RydWN0aW9uIHJlcHJlc2VudGluZyB0aGUgY29tcG9uZW50IGdyYXBoXG4gICAgICovXG4gICAgUm91dGVyLnByb3RvdHlwZS5yZWNvZ25pemUgPSBmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgIHZhciBhbmNlc3RvckNvbXBvbmVudHMgPSB0aGlzLl9nZXRBbmNlc3Rvckluc3RydWN0aW9ucygpO1xuICAgICAgICByZXR1cm4gdGhpcy5yZWdpc3RyeS5yZWNvZ25pemUodXJsLCBhbmNlc3RvckNvbXBvbmVudHMpO1xuICAgIH07XG4gICAgUm91dGVyLnByb3RvdHlwZS5fZ2V0QW5jZXN0b3JJbnN0cnVjdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhbmNlc3Rvckluc3RydWN0aW9ucyA9IFt0aGlzLl9jdXJyZW50SW5zdHJ1Y3Rpb25dO1xuICAgICAgICB2YXIgYW5jZXN0b3JSb3V0ZXIgPSB0aGlzO1xuICAgICAgICB3aGlsZSAoaXNQcmVzZW50KGFuY2VzdG9yUm91dGVyID0gYW5jZXN0b3JSb3V0ZXIucGFyZW50KSkge1xuICAgICAgICAgICAgYW5jZXN0b3JJbnN0cnVjdGlvbnMudW5zaGlmdChhbmNlc3RvclJvdXRlci5fY3VycmVudEluc3RydWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYW5jZXN0b3JJbnN0cnVjdGlvbnM7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBOYXZpZ2F0ZXMgdG8gZWl0aGVyIHRoZSBsYXN0IFVSTCBzdWNjZXNzZnVsbHkgbmF2aWdhdGVkIHRvLCBvciB0aGUgbGFzdCBVUkwgcmVxdWVzdGVkIGlmIHRoZVxuICAgICAqIHJvdXRlciBoYXMgeWV0IHRvIHN1Y2Nlc3NmdWxseSBuYXZpZ2F0ZS5cbiAgICAgKi9cbiAgICBSb3V0ZXIucHJvdG90eXBlLnJlbmF2aWdhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChpc0JsYW5rKHRoaXMubGFzdE5hdmlnYXRpb25BdHRlbXB0KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2N1cnJlbnROYXZpZ2F0aW9uO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLm5hdmlnYXRlQnlVcmwodGhpcy5sYXN0TmF2aWdhdGlvbkF0dGVtcHQpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYW4gYEluc3RydWN0aW9uYCBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgUm91dGUgTGluayBEU0wuXG4gICAgICovXG4gICAgUm91dGVyLnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uIChsaW5rUGFyYW1zKSB7XG4gICAgICAgIHZhciBhbmNlc3Rvckluc3RydWN0aW9ucyA9IHRoaXMuX2dldEFuY2VzdG9ySW5zdHJ1Y3Rpb25zKCk7XG4gICAgICAgIHJldHVybiB0aGlzLnJlZ2lzdHJ5LmdlbmVyYXRlKGxpbmtQYXJhbXMsIGFuY2VzdG9ySW5zdHJ1Y3Rpb25zKTtcbiAgICB9O1xuICAgIHJldHVybiBSb3V0ZXI7XG59KSgpO1xuZXhwb3J0cy5Sb3V0ZXIgPSBSb3V0ZXI7XG52YXIgUm9vdFJvdXRlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFJvb3RSb3V0ZXIsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gUm9vdFJvdXRlcihyZWdpc3RyeSwgbG9jYXRpb24sIHByaW1hcnlDb21wb25lbnQpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgcmVnaXN0cnksIG51bGwsIHByaW1hcnlDb21wb25lbnQpO1xuICAgICAgICB0aGlzLl9sb2NhdGlvbiA9IGxvY2F0aW9uO1xuICAgICAgICB0aGlzLl9sb2NhdGlvblN1YiA9IHRoaXMuX2xvY2F0aW9uLnN1YnNjcmliZShmdW5jdGlvbiAoY2hhbmdlKSB7XG4gICAgICAgICAgICAvLyB3ZSBjYWxsIHJlY29nbml6ZSBvdXJzZWx2ZXNcbiAgICAgICAgICAgIF90aGlzLnJlY29nbml6ZShjaGFuZ2VbJ3VybCddKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChpbnN0cnVjdGlvbikge1xuICAgICAgICAgICAgICAgIF90aGlzLm5hdmlnYXRlQnlJbnN0cnVjdGlvbihpbnN0cnVjdGlvbiwgaXNQcmVzZW50KGNoYW5nZVsncG9wJ10pKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoXykge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIGEgcG9wc3RhdGUgZXZlbnQ7IG5vIG5lZWQgdG8gY2hhbmdlIHRoZSBVUkxcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzUHJlc2VudChjaGFuZ2VbJ3BvcCddKSAmJiBjaGFuZ2VbJ3R5cGUnXSAhPSAnaGFzaGNoYW5nZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIgZW1pdFBhdGggPSBpbnN0cnVjdGlvbi50b1VybFBhdGgoKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVtaXRRdWVyeSA9IGluc3RydWN0aW9uLnRvVXJsUXVlcnkoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVtaXRQYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVtaXRQYXRoID0gJy8nICsgZW1pdFBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gQmVjYXVzZSB3ZSd2ZSBvcHRlZCB0byB1c2UgQWxsIGhhc2hjaGFuZ2UgZXZlbnRzIG9jY3VyIG91dHNpZGUgQW5ndWxhci5cbiAgICAgICAgICAgICAgICAgICAgLy8gSG93ZXZlciwgYXBwcyB0aGF0IGFyZSBtaWdyYXRpbmcgbWlnaHQgaGF2ZSBoYXNoIGxpbmtzIHRoYXQgb3BlcmF0ZSBvdXRzaWRlXG4gICAgICAgICAgICAgICAgICAgIC8vIGFuZ3VsYXIgdG8gd2hpY2ggcm91dGluZyBtdXN0IHJlc3BvbmQuXG4gICAgICAgICAgICAgICAgICAgIC8vIFRvIHN1cHBvcnQgdGhlc2UgY2FzZXMgd2hlcmUgd2UgcmVzcG9uZCB0byBoYXNoY2hhbmdlcyBhbmQgcmVkaXJlY3QgYXMgYVxuICAgICAgICAgICAgICAgICAgICAvLyByZXN1bHQsIHdlIG5lZWQgdG8gcmVwbGFjZSB0aGUgdG9wIGl0ZW0gb24gdGhlIHN0YWNrLlxuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhbmdlWyd0eXBlJ10gPT0gJ2hhc2hjaGFuZ2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5zdHJ1Y3Rpb24udG9Sb290VXJsKCkgIT0gX3RoaXMuX2xvY2F0aW9uLnBhdGgoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9sb2NhdGlvbi5yZXBsYWNlU3RhdGUoZW1pdFBhdGgsIGVtaXRRdWVyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fbG9jYXRpb24uZ28oZW1pdFBhdGgsIGVtaXRRdWVyeSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5yZWdpc3RyeS5jb25maWdGcm9tQ29tcG9uZW50KHByaW1hcnlDb21wb25lbnQpO1xuICAgICAgICB0aGlzLm5hdmlnYXRlQnlVcmwobG9jYXRpb24ucGF0aCgpKTtcbiAgICB9XG4gICAgUm9vdFJvdXRlci5wcm90b3R5cGUuY29tbWl0ID0gZnVuY3Rpb24gKGluc3RydWN0aW9uLCBfc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmIChfc2tpcExvY2F0aW9uQ2hhbmdlID09PSB2b2lkIDApIHsgX3NraXBMb2NhdGlvbkNoYW5nZSA9IGZhbHNlOyB9XG4gICAgICAgIHZhciBlbWl0UGF0aCA9IGluc3RydWN0aW9uLnRvVXJsUGF0aCgpO1xuICAgICAgICB2YXIgZW1pdFF1ZXJ5ID0gaW5zdHJ1Y3Rpb24udG9VcmxRdWVyeSgpO1xuICAgICAgICBpZiAoZW1pdFBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZW1pdFBhdGggPSAnLycgKyBlbWl0UGF0aDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcHJvbWlzZSA9IF9zdXBlci5wcm90b3R5cGUuY29tbWl0LmNhbGwodGhpcywgaW5zdHJ1Y3Rpb24pO1xuICAgICAgICBpZiAoIV9za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oZnVuY3Rpb24gKF8pIHsgX3RoaXMuX2xvY2F0aW9uLmdvKGVtaXRQYXRoLCBlbWl0UXVlcnkpOyB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9O1xuICAgIFJvb3RSb3V0ZXIucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChpc1ByZXNlbnQodGhpcy5fbG9jYXRpb25TdWIpKSB7XG4gICAgICAgICAgICBPYnNlcnZhYmxlV3JhcHBlci5kaXNwb3NlKHRoaXMuX2xvY2F0aW9uU3ViKTtcbiAgICAgICAgICAgIHRoaXMuX2xvY2F0aW9uU3ViID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIFJvb3RSb3V0ZXI7XG59KShSb3V0ZXIpO1xuZXhwb3J0cy5Sb290Um91dGVyID0gUm9vdFJvdXRlcjtcbnZhciBDaGlsZFJvdXRlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKENoaWxkUm91dGVyLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIENoaWxkUm91dGVyKHBhcmVudCwgaG9zdENvbXBvbmVudCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBwYXJlbnQucmVnaXN0cnksIHBhcmVudCwgaG9zdENvbXBvbmVudCk7XG4gICAgICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgIH1cbiAgICBDaGlsZFJvdXRlci5wcm90b3R5cGUubmF2aWdhdGVCeVVybCA9IGZ1bmN0aW9uICh1cmwsIF9za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgaWYgKF9za2lwTG9jYXRpb25DaGFuZ2UgPT09IHZvaWQgMCkgeyBfc2tpcExvY2F0aW9uQ2hhbmdlID0gZmFsc2U7IH1cbiAgICAgICAgLy8gRGVsZWdhdGUgbmF2aWdhdGlvbiB0byB0aGUgcm9vdCByb3V0ZXJcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm5hdmlnYXRlQnlVcmwodXJsLCBfc2tpcExvY2F0aW9uQ2hhbmdlKTtcbiAgICB9O1xuICAgIENoaWxkUm91dGVyLnByb3RvdHlwZS5uYXZpZ2F0ZUJ5SW5zdHJ1Y3Rpb24gPSBmdW5jdGlvbiAoaW5zdHJ1Y3Rpb24sIF9za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgaWYgKF9za2lwTG9jYXRpb25DaGFuZ2UgPT09IHZvaWQgMCkgeyBfc2tpcExvY2F0aW9uQ2hhbmdlID0gZmFsc2U7IH1cbiAgICAgICAgLy8gRGVsZWdhdGUgbmF2aWdhdGlvbiB0byB0aGUgcm9vdCByb3V0ZXJcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm5hdmlnYXRlQnlJbnN0cnVjdGlvbihpbnN0cnVjdGlvbiwgX3NraXBMb2NhdGlvbkNoYW5nZSk7XG4gICAgfTtcbiAgICByZXR1cm4gQ2hpbGRSb3V0ZXI7XG59KShSb3V0ZXIpO1xuZnVuY3Rpb24gY2FuQWN0aXZhdGVPbmUobmV4dEluc3RydWN0aW9uLCBwcmV2SW5zdHJ1Y3Rpb24pIHtcbiAgICB2YXIgbmV4dCA9IF9yZXNvbHZlVG9UcnVlO1xuICAgIGlmIChpc0JsYW5rKG5leHRJbnN0cnVjdGlvbi5jb21wb25lbnQpKSB7XG4gICAgICAgIHJldHVybiBuZXh0O1xuICAgIH1cbiAgICBpZiAoaXNQcmVzZW50KG5leHRJbnN0cnVjdGlvbi5jaGlsZCkpIHtcbiAgICAgICAgbmV4dCA9IGNhbkFjdGl2YXRlT25lKG5leHRJbnN0cnVjdGlvbi5jaGlsZCwgaXNQcmVzZW50KHByZXZJbnN0cnVjdGlvbikgPyBwcmV2SW5zdHJ1Y3Rpb24uY2hpbGQgOiBudWxsKTtcbiAgICB9XG4gICAgcmV0dXJuIG5leHQudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgIGlmIChyZXN1bHQgPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobmV4dEluc3RydWN0aW9uLmNvbXBvbmVudC5yZXVzZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGhvb2sgPSByb3V0ZV9saWZlY3ljbGVfcmVmbGVjdG9yXzEuZ2V0Q2FuQWN0aXZhdGVIb29rKG5leHRJbnN0cnVjdGlvbi5jb21wb25lbnQuY29tcG9uZW50VHlwZSk7XG4gICAgICAgIGlmIChpc1ByZXNlbnQoaG9vaykpIHtcbiAgICAgICAgICAgIHJldHVybiBob29rKG5leHRJbnN0cnVjdGlvbi5jb21wb25lbnQsIGlzUHJlc2VudChwcmV2SW5zdHJ1Y3Rpb24pID8gcHJldkluc3RydWN0aW9uLmNvbXBvbmVudCA6IG51bGwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xufVxuXG5cbiAgLy9UT0RPOiB0aGlzIGlzIGEgaGFjayB0byByZXBsYWNlIHRoZSBleGl0aW5nIGltcGxlbWVudGF0aW9uIGF0IHJ1bi10aW1lXG4gIGV4cG9ydHMuZ2V0Q2FuQWN0aXZhdGVIb29rID0gZnVuY3Rpb24gKGRpcmVjdGl2ZU5hbWUpIHtcbiAgICB2YXIgZmFjdG9yeSA9ICQkZGlyZWN0aXZlSW50cm9zcGVjdG9yLmdldFR5cGVCeU5hbWUoZGlyZWN0aXZlTmFtZSk7XG4gICAgcmV0dXJuIGZhY3RvcnkgJiYgZmFjdG9yeS4kY2FuQWN0aXZhdGUgJiYgZnVuY3Rpb24gKG5leHQsIHByZXYpIHtcbiAgICAgIHJldHVybiAkaW5qZWN0b3IuaW52b2tlKGZhY3RvcnkuJGNhbkFjdGl2YXRlLCBudWxsLCB7XG4gICAgICAgICRuZXh0SW5zdHJ1Y3Rpb246IG5leHQsXG4gICAgICAgICRwcmV2SW5zdHJ1Y3Rpb246IHByZXZcbiAgICAgIH0pO1xuICAgIH07XG4gIH07XG5cbiAgLy8gVGhpcyBoYWNrIHJlbW92ZXMgYXNzZXJ0aW9ucyBhYm91dCB0aGUgdHlwZSBvZiB0aGUgXCJjb21wb25lbnRcIlxuICAvLyBwcm9wZXJ0eSBpbiBhIHJvdXRlIGNvbmZpZ1xuICBleHBvcnRzLmFzc2VydENvbXBvbmVudEV4aXN0cyA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gIGFuZ3VsYXIuc3RyaW5naWZ5SW5zdHJ1Y3Rpb24gPSBmdW5jdGlvbiAoaW5zdHJ1Y3Rpb24pIHtcbiAgICByZXR1cm4gaW5zdHJ1Y3Rpb24udG9Sb290VXJsKCk7XG4gIH07XG5cbiAgdmFyIFJvdXRlUmVnaXN0cnkgPSBleHBvcnRzLlJvdXRlUmVnaXN0cnk7XG4gIHZhciBSb290Um91dGVyID0gZXhwb3J0cy5Sb290Um91dGVyO1xuXG4gIHZhciByZWdpc3RyeSA9IG5ldyBSb3V0ZVJlZ2lzdHJ5KCRyb3V0ZXJSb290Q29tcG9uZW50KTtcbiAgdmFyIGxvY2F0aW9uID0gbmV3IExvY2F0aW9uKCk7XG5cbiAgJCRkaXJlY3RpdmVJbnRyb3NwZWN0b3IoZnVuY3Rpb24gKG5hbWUsIGZhY3RvcnkpIHtcbiAgICBpZiAoYW5ndWxhci5pc0FycmF5KGZhY3RvcnkuJHJvdXRlQ29uZmlnKSkge1xuICAgICAgZmFjdG9yeS4kcm91dGVDb25maWcuZm9yRWFjaChmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgICAgIHJlZ2lzdHJ5LmNvbmZpZyhuYW1lLCBjb25maWcpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICB2YXIgcm91dGVyID0gbmV3IFJvb3RSb3V0ZXIocmVnaXN0cnksIGxvY2F0aW9uLCAkcm91dGVyUm9vdENvbXBvbmVudCk7XG4gICRyb290U2NvcGUuJHdhdGNoKGZ1bmN0aW9uICgpIHsgcmV0dXJuICRsb2NhdGlvbi5wYXRoKCk7IH0sIGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgaWYgKHJvdXRlci5sYXN0TmF2aWdhdGlvbkF0dGVtcHQgIT09IHBhdGgpIHtcbiAgICAgIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKHBhdGgpO1xuICAgIH1cbiAgfSk7XG5cbiAgcm91dGVyLnN1YnNjcmliZShmdW5jdGlvbiAoKSB7XG4gICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCckcm91dGVDaGFuZ2VTdWNjZXNzJywge30pO1xuICB9KTtcblxuICByZXR1cm4gcm91dGVyO1xufVxuXG59KCkpO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
