System.register([], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    function DOMComplete() {
        return new Promise(resolve => {
            document.readyState === 'complete' ? resolve() : window.addEventListener('load', () => resolve());
        });
    }
    exports_1("DOMComplete", DOMComplete);
    return {
        setters: [],
        execute: function () {
        }
    };
});
