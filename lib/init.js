/**
 * @ignore
 * init loader, set config
 * @author yiminghe@gmail.com
 */
(function (mx) {
    var doc = mx.Env.host && mx.Env.host.document;
    var defaultComboPrefix = '??';
    var defaultComboSep = ',';
    var Loader = mx.Loader;
    var Utils = Loader.Utils;
    var Status = Loader.Status;
    var createModule = Utils.createModule;
    var ComboLoader = Loader.ComboLoader;

    Utils.mix(mx, {
        // internal usage
        getModule: function (id) {
            return createModule(id);
        },

        // internal usage
        getPackage: function (packageName) {
            return mx.Config.packages[packageName];
        },

        /**
         * Registers a module with the modulex global.
         * @param {String} id module id.
         * it must be set if combine is true in {@link modulex#config}
         * @param {Function} factory module definition function that is used to return
         * exports of this module
         * @param {modulex} factory.mx modulex global instance
         * @param {Object} [cfg] module optional config data
         * @param {String[]} cfg.requires this module's required module name list
         * @member modulex
         *
         *
         *      // dom module's definition
         *      modulex.add('dom', function(mx, xx){
         *          return {css: function(el, name, val){}};
         *      },{
         *          requires:['xx']
         *      });
         */
        add: function (id, factory, cfg) {
            ComboLoader.add(id, factory, cfg, arguments.length);
        },

        /**
         * initialize one or more modules
         * @param {String|String[]} modIds 1-n modules to bind(use comma to separate)
         * @param {Function} success callback function executed
         * when modulex has the required functionality.
         * @param {Function} error callback function executed
         * when modulex has the required functionality.
         * @param {modulex} success.mx modulex instance
         * @param success.x... modules exports
         * @member modulex
         *
         *
         *      // loads and initialize overlay dd and its dependencies
         *      modulex.use(['overlay','dd'], function(mx, Overlay){});
         */
        use: function (modIds, success, error) {
            var loader;
            var tryCount = 0;
            if (typeof modIds === 'string') {
                modIds = modIds.split(/\s*,\s*/);
            }
            if (typeof success === 'object') {
                //noinspection JSUnresolvedVariable
                error = success.error;
                //noinspection JSUnresolvedVariable
                success = success.success;
            }
            var mods = Utils.createModules(modIds);
            var unloadedMods = [];
            Utils.each(mods, function (mod) {
                unloadedMods.push.apply(unloadedMods, mod.getNormalizedModules());
            });
            var normalizedMods = unloadedMods;

            function processError(errorList, action) {
                console.error('modulex: ' + action + ' the following modules error');
                console.error(Utils.map(errorList, function (e) {
                    return e.id;
                }));
                if (error) {
                    if ('@DEBUG@') {
                        error.apply(mx, errorList);
                    } else {
                        try {
                            error.apply(mx, errorList);
                        } catch (e) {
                            /*jshint loopfunc:true*/
                            setTimeout(function () {
                                throw e;
                            }, 0);
                        }
                    }
                }
            }

            var allUnLoadedMods = [];

            function loadReady() {
                ++tryCount;
                var errorList = [];
                // get error from last round of load
                unloadedMods = loader.calculate(unloadedMods, errorList);
                allUnLoadedMods = allUnLoadedMods.concat(unloadedMods);
                var unloadModsLen = unloadedMods.length;
                if (errorList.length) {
                    processError(errorList, 'load');
                } else if (loader.isCompleteLoading()) {
                    var isInitSuccess = Utils.initModules(normalizedMods);
                    if (!isInitSuccess) {
                        errorList = [];
                        Utils.each(allUnLoadedMods, function (m) {
                            if (m.status === Status.ERROR) {
                                errorList.push(m);
                            }
                        });
                        processError(errorList, 'init');
                    } else if (success) {
                        if ('@DEBUG@') {
                            success.apply(mx, Utils.getModulesExports(mods));
                        } else {
                            try {
                                success.apply(mx, Utils.getModulesExports(mods));
                            } catch (e) {
                                /*jshint loopfunc:true*/
                                setTimeout(function () {
                                    throw e;
                                }, 0);
                            }
                        }
                    }
                } else {
                    // in case all of its required mods is loading by other loaders
                    loader.callback = loadReady;
                    if (unloadModsLen) {
                        loader.use(unloadedMods);
                    }
                }
            }

            loader = new ComboLoader(loadReady);
            // in case modules is loaded statically
            // synchronous check
            // but always async for loader
            loadReady();
            return mx;
        },

        /**
         * get module exports from modulex module cache
         * @param {String} id module id
         * @member modulex
         * @return {*} exports of specified module
         */
        require: function (id) {
            return createModule(id).getExports();
        },

        /**
         * undefine a module
         * @param {String} id module id
         * @member modulex
         */
        undef: function (id) {
            var requiresModule = createModule(id);
            var mods = requiresModule.getNormalizedModules();
            Utils.each(mods, function (m) {
                m.undef();
            });
        }
    });

    mx.config({
        comboPrefix: defaultComboPrefix,
        comboSep: defaultComboSep,
        charset: 'utf-8',
        filter: '',
        lang: 'zh-cn'
    });
    mx.config('packages', {
        core: {
            filter: '@DEBUG@' ? 'debug' : '',
            base: '.'
        }
    });
    // ejecta
    if (doc && doc.getElementsByTagName) {
        // will transform base to absolute path
        mx.config(Utils.mix({
            // 2k(2048) uri length
            comboMaxUriLength: 2000,
            // file limit number for a single combo uri
            comboMaxFileNum: 40
        }));
    }
})(modulex);