// Base Component
// --------------

/* global define */

// Define AMD, Require.js, or Contextual Scope
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([
      'stratus',
      'underscore',
      'angular',
      'angular-material'
    ], factory)
  } else {
    factory(root.Stratus, root._, root.angular)
  }
}(this, function (Stratus, _, angular) {
  // This component is just a simple base.
  Stratus.Components.Base = {
    transclude: true,
    bindings: {
      elementId: '@',
      hello: '@'
    },
    controller: function ($scope, $attrs, $log) {
      this.uid = _.uniqueId('base_')
      Stratus.Instances[this.uid] = $scope
      $scope.elementId = $attrs.elementId || this.uid
      Stratus.Internals.CssLoader(Stratus.BaseUrl +
        Stratus.BundlePath + 'components/base' +
        (Stratus.Environment.get('production') ? '.min' : '') + '.css')
      $log.log('component:', this, $scope, $attrs)
    },
    template: '<div id="{{ elementId }}">hello: <span ng-bind="hello"></span></div>',
    templateUrl: Stratus.BaseUrl + Stratus.BundlePath + 'components/base' +
      (Stratus.Environment.get('production') ? '.min' : '') + '.html'
  }
}))
