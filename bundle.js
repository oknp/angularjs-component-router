(function() {
angular.module('app.about', []).component('about', {
  restrict: 'EA',
	template: 'About {{ vm.name }}',
	controller: AboutController,
  controllerAs: 'vm'
});

function AboutController() {
}

AboutController.prototype.$routerOnActivate = function(toRoute, fromRoute) {
	this.name = toRoute.params.name;
}

angular.module('app.admin', []).component('admin', {
	restrict: 'EA',
	templateUrl: 'components/admin/admin.html',
	controller: AdminController,
	$routeConfig: [
	  {
	    path: '/dashboard',
	    component: 'dashboard',
	    name: 'Dashboard'
	  }
	]
});

function AdminController() {
}

angular.module('app.admin.dashboard', []).component('dashboard', {
  restrict: 'EA',
	templateUrl: 'components/dashboard/dashboard.html',
	controller: DashboardController,
	$canActivate: ['Auth', function(Auth) {
		return Auth.check();
	}]
});

function DashboardController() {
}
var app = angular.module('myApp', [
	'ngComponentRouter',
	'app.templates',
	'app.home',
	'app.about',
	'app.login',
	'app.admin',
	'app.admin.dashboard',
	'app.404'
]);

app.directive('app', AppDirective);

function AppDirective() {
	return {
		restrict: 'E',
		templateUrl: 'components/app/app.html',
		controller: ['$router', 'Auth', AppDirectiveController]
	};
}

function AppDirectiveController($router) {
	$router.config([
		{
			path: '/',
			component: 'home',
			name: 'Home'
		},
		{
			path: '/about/:name',
			component: 'about',
			name: 'About'
		},
		{
			path: '/login',
			component: 'login',
			name: 'Login'
		},
		{
			path: '/admin/...',
			component: 'admin',
			name: 'Admin'
		},
		{
			path: '/**',
			component: 'notfound',
			name: 'NotFound'
		}
	]);
}

angular.module('app.home', []).component('home', {
  restrict: 'EA',
	templateUrl: 'components/home/home.html',
	controller: HomeController
});

function HomeController() {

}
angular.module('app.login', ['app.services.auth']).component('login', {
	restrict: 'EA',
	templateUrl: 'components/login/login.html',
	controller: ['Auth', LoginController],
	controllerAs: 'vm'
});

function LoginController(Auth) {
	var _this = this;

	this.Auth = Auth;
	this.Auth.check()
		.then(function(result) {
			_this.authenticated = result;
		});
}

LoginController.prototype.login = function() {
	var _this = this;
	this.Auth.auth(this.username, this.password)
		.then(function(result) {
			_this.authenticated = result;
		});
}

angular.module('app.404', []).component('notfound', {
	template: 'Page Not Found',
	controller: NotFoundController
});

function NotFoundController() {

}

angular.module('app.services.auth', []).service('Auth', ['$q', Auth]);

function Auth($q) {
	this.loggedIn = false;
	this.$q = $q;
}

Auth.prototype.auth = function(username, password) {
	this.loggedIn = true;

	return this.check();
}

Auth.prototype.check = function() {
	var _this = this;
	return this.$q(function(resolve) {
		resolve(_this.loggedIn);
	});
}
}());

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbXBvbmVudHMvYWJvdXQvYWJvdXQuanMiLCJjb21wb25lbnRzL2FkbWluL2FkbWluLmpzIiwiY29tcG9uZW50cy9kYXNoYm9hcmQvZGFzaGJvYXJkLmpzIiwiY29tcG9uZW50cy9hcHAvYXBwLmpzIiwiY29tcG9uZW50cy9ob21lL2hvbWUuanMiLCJjb21wb25lbnRzL2xvZ2luL2xvZ2luLmpzIiwiY29tcG9uZW50cy9ub3Rmb3VuZC9ub3Rmb3VuZC5qcyIsInNlcnZpY2VzL2F1dGgvYXV0aC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoJ2FwcC5hYm91dCcsIFtdKS5jb21wb25lbnQoJ2Fib3V0Jywge1xuICByZXN0cmljdDogJ0VBJyxcblx0dGVtcGxhdGU6ICdBYm91dCB7eyB2bS5uYW1lIH19Jyxcblx0Y29udHJvbGxlcjogQWJvdXRDb250cm9sbGVyLFxuICBjb250cm9sbGVyQXM6ICd2bSdcbn0pO1xuXG5mdW5jdGlvbiBBYm91dENvbnRyb2xsZXIoKSB7XG59XG5cbkFib3V0Q29udHJvbGxlci5wcm90b3R5cGUuJHJvdXRlck9uQWN0aXZhdGUgPSBmdW5jdGlvbih0b1JvdXRlLCBmcm9tUm91dGUpIHtcblx0dGhpcy5uYW1lID0gdG9Sb3V0ZS5wYXJhbXMubmFtZTtcbn1cbiIsImFuZ3VsYXIubW9kdWxlKCdhcHAuYWRtaW4nLCBbXSkuY29tcG9uZW50KCdhZG1pbicsIHtcblx0cmVzdHJpY3Q6ICdFQScsXG5cdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9hZG1pbi9hZG1pbi5odG1sJyxcblx0Y29udHJvbGxlcjogQWRtaW5Db250cm9sbGVyLFxuXHQkcm91dGVDb25maWc6IFtcblx0ICB7XG5cdCAgICBwYXRoOiAnL2Rhc2hib2FyZCcsXG5cdCAgICBjb21wb25lbnQ6ICdkYXNoYm9hcmQnLFxuXHQgICAgbmFtZTogJ0Rhc2hib2FyZCdcblx0ICB9XG5cdF1cbn0pO1xuXG5mdW5jdGlvbiBBZG1pbkNvbnRyb2xsZXIoKSB7XG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmFkbWluLmRhc2hib2FyZCcsIFtdKS5jb21wb25lbnQoJ2Rhc2hib2FyZCcsIHtcbiAgcmVzdHJpY3Q6ICdFQScsXG5cdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9kYXNoYm9hcmQvZGFzaGJvYXJkLmh0bWwnLFxuXHRjb250cm9sbGVyOiBEYXNoYm9hcmRDb250cm9sbGVyLFxuXHQkY2FuQWN0aXZhdGU6IFsnQXV0aCcsIGZ1bmN0aW9uKEF1dGgpIHtcblx0XHRyZXR1cm4gQXV0aC5jaGVjaygpO1xuXHR9XVxufSk7XG5cbmZ1bmN0aW9uIERhc2hib2FyZENvbnRyb2xsZXIoKSB7XG59IiwidmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdteUFwcCcsIFtcblx0J25nQ29tcG9uZW50Um91dGVyJyxcblx0J2FwcC50ZW1wbGF0ZXMnLFxuXHQnYXBwLmhvbWUnLFxuXHQnYXBwLmFib3V0Jyxcblx0J2FwcC5sb2dpbicsXG5cdCdhcHAuYWRtaW4nLFxuXHQnYXBwLmFkbWluLmRhc2hib2FyZCcsXG5cdCdhcHAuNDA0J1xuXSk7XG5cbmFwcC5kaXJlY3RpdmUoJ2FwcCcsIEFwcERpcmVjdGl2ZSk7XG5cbmZ1bmN0aW9uIEFwcERpcmVjdGl2ZSgpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9hcHAvYXBwLmh0bWwnLFxuXHRcdGNvbnRyb2xsZXI6IFsnJHJvdXRlcicsICdBdXRoJywgQXBwRGlyZWN0aXZlQ29udHJvbGxlcl1cblx0fTtcbn1cblxuZnVuY3Rpb24gQXBwRGlyZWN0aXZlQ29udHJvbGxlcigkcm91dGVyKSB7XG5cdCRyb3V0ZXIuY29uZmlnKFtcblx0XHR7XG5cdFx0XHRwYXRoOiAnLycsXG5cdFx0XHRjb21wb25lbnQ6ICdob21lJyxcblx0XHRcdG5hbWU6ICdIb21lJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0cGF0aDogJy9hYm91dC86bmFtZScsXG5cdFx0XHRjb21wb25lbnQ6ICdhYm91dCcsXG5cdFx0XHRuYW1lOiAnQWJvdXQnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRwYXRoOiAnL2xvZ2luJyxcblx0XHRcdGNvbXBvbmVudDogJ2xvZ2luJyxcblx0XHRcdG5hbWU6ICdMb2dpbidcblx0XHR9LFxuXHRcdHtcblx0XHRcdHBhdGg6ICcvYWRtaW4vLi4uJyxcblx0XHRcdGNvbXBvbmVudDogJ2FkbWluJyxcblx0XHRcdG5hbWU6ICdBZG1pbidcblx0XHR9LFxuXHRcdHtcblx0XHRcdHBhdGg6ICcvKionLFxuXHRcdFx0Y29tcG9uZW50OiAnbm90Zm91bmQnLFxuXHRcdFx0bmFtZTogJ05vdEZvdW5kJ1xuXHRcdH1cblx0XSk7XG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmhvbWUnLCBbXSkuY29tcG9uZW50KCdob21lJywge1xuICByZXN0cmljdDogJ0VBJyxcblx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2hvbWUvaG9tZS5odG1sJyxcblx0Y29udHJvbGxlcjogSG9tZUNvbnRyb2xsZXJcbn0pO1xuXG5mdW5jdGlvbiBIb21lQ29udHJvbGxlcigpIHtcblxufSIsImFuZ3VsYXIubW9kdWxlKCdhcHAubG9naW4nLCBbJ2FwcC5zZXJ2aWNlcy5hdXRoJ10pLmNvbXBvbmVudCgnbG9naW4nLCB7XG5cdHJlc3RyaWN0OiAnRUEnLFxuXHR0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvbG9naW4vbG9naW4uaHRtbCcsXG5cdGNvbnRyb2xsZXI6IFsnQXV0aCcsIExvZ2luQ29udHJvbGxlcl0sXG5cdGNvbnRyb2xsZXJBczogJ3ZtJ1xufSk7XG5cbmZ1bmN0aW9uIExvZ2luQ29udHJvbGxlcihBdXRoKSB7XG5cdHZhciBfdGhpcyA9IHRoaXM7XG5cblx0dGhpcy5BdXRoID0gQXV0aDtcblx0dGhpcy5BdXRoLmNoZWNrKClcblx0XHQudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcblx0XHRcdF90aGlzLmF1dGhlbnRpY2F0ZWQgPSByZXN1bHQ7XG5cdFx0fSk7XG59XG5cbkxvZ2luQ29udHJvbGxlci5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbigpIHtcblx0dmFyIF90aGlzID0gdGhpcztcblx0dGhpcy5BdXRoLmF1dGgodGhpcy51c2VybmFtZSwgdGhpcy5wYXNzd29yZClcblx0XHQudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcblx0XHRcdF90aGlzLmF1dGhlbnRpY2F0ZWQgPSByZXN1bHQ7XG5cdFx0fSk7XG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnYXBwLjQwNCcsIFtdKS5jb21wb25lbnQoJ25vdGZvdW5kJywge1xuXHR0ZW1wbGF0ZTogJ1BhZ2UgTm90IEZvdW5kJyxcblx0Y29udHJvbGxlcjogTm90Rm91bmRDb250cm9sbGVyXG59KTtcblxuZnVuY3Rpb24gTm90Rm91bmRDb250cm9sbGVyKCkge1xuXG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnYXBwLnNlcnZpY2VzLmF1dGgnLCBbXSkuc2VydmljZSgnQXV0aCcsIFsnJHEnLCBBdXRoXSk7XG5cbmZ1bmN0aW9uIEF1dGgoJHEpIHtcblx0dGhpcy5sb2dnZWRJbiA9IGZhbHNlO1xuXHR0aGlzLiRxID0gJHE7XG59XG5cbkF1dGgucHJvdG90eXBlLmF1dGggPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpIHtcblx0dGhpcy5sb2dnZWRJbiA9IHRydWU7XG5cblx0cmV0dXJuIHRoaXMuY2hlY2soKTtcbn1cblxuQXV0aC5wcm90b3R5cGUuY2hlY2sgPSBmdW5jdGlvbigpIHtcblx0dmFyIF90aGlzID0gdGhpcztcblx0cmV0dXJuIHRoaXMuJHEoZnVuY3Rpb24ocmVzb2x2ZSkge1xuXHRcdHJlc29sdmUoX3RoaXMubG9nZ2VkSW4pO1xuXHR9KTtcbn1cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
