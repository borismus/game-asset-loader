/**
 * Game Asset Loader Library.
 */

/**
 * GAL constructor
 *
 * @param {String} manifestUrl URL to manifest file.
 */
var GameAssetLoader = function(manifestUrl) {
  this.manifestUrl = manifestUrl;
  // Dictionary of arrays of all of the bundles contained in the manifest
  this.bundles = {};
  // Array of bundle names in the order that they appear in the manifest
  this.bundleOrder = [];
  // Table of callbacks, per bundle
  this.loaded = {};
  this.progress = {};
  this.error = {};
};

/**
 * Initializes loader
 *
 * @param {Function} callback called when the library finishes loading the
 * manifest
 */
GameAssetLoader.prototype.init = function(callback) {
  var that = this;
  if (this.online()) {
    // Fetch the manifest
    this.helper.fetchJSON(this.manifestUrl, function(manifest) {
      // Save the manifest for offline use
      localStorage.setItem(that.manifestUrl, JSON.stringify(manifest));
      that.helper.finishInit.call(that, manifest, callback);
    });
  } else {
    var manifest = JSON.parse(localStorage.getItem(this.manifestUrl));
    that.helper.finishInit.call(that, manifest, callback);
  }
};

/**
 * Downloads assets contained in the named bundle.
 *
 * @param {String} bundleName name of single bundle to download
 */
GameAssetLoader.prototype.download = function(bundleName) {
  var bundle = this.bundles[bundleName];
  if (!bundle) {
    // Attempting to download invalid bundle
    throw "Invalid bundle specified";
  }

  if (!this.online()) {
    // If offline, check for downloaded resources, and if they exist, callback
    this.check(bundleName, function(result) {
      if (result.success) {
        // Already downloaded. Success!
        this.helper.fireCallback(this.loaded, bundleName, {
          success: true,
          cached: true,
          bundleName: bundleName
        });
      } else {
        // Otherwise, since we're offline, error out.
        this.helper.fireCallback(this.error, bundleName, {
          error: 'Missing resources cant be downloaded while offline'
        });
      }
    });
  }

  var that = this;

  // Setup a loop via callback chaining
  (function loop(index) {
    // If we've finished loading all of the assets in the bundle
    if (index == bundle.length) {
      that.helper.fireCallback(that.loaded, bundleName, {
        bundleName: bundleName,
        success: true
      });
      return;
    }

    var key = bundle[index];
    // Get the full url to the asset
    var url = that.manifest.assetRoot + key;
    // Fetch full url and store it locally
    that.adapter.saveAsset(key, url, function() {
      that.helper.fireCallback(that.progress, bundleName, {
        current: index + 1,
        total: bundle.length
      });
      // Iterate to the next file
      loop(index + 1);
    });

  })(0);
};

/**
 * Adds a callback to fire when a bundle has been loaded
 *
 * @param {String} bundleName name of bundle to monitor
 * @param {Function} callback function to call after bundle was downloaded
 */
GameAssetLoader.prototype.onLoaded = function(bundleName, callback) {
  this.helper.addCallback(this.loaded, bundleName, callback);
};

/**
 * Adds a callback to fire when a bundle's downloading has progressed
 *
 * @param {String} bundleName name of bundle to monitor
 * @param {Function} callback function to call when bundle download progresses
 */
GameAssetLoader.prototype.onProgress = function(bundleName, callback) {
  this.helper.addCallback(this.progress, bundleName, callback);
};

/**
 * Adds a callback to fire when a bundle's downloading has failed
 *
 * @param {String} bundleName name of bundle to monitor
 * @param {Function} callback function to call when bundle download fails
 */
GameAssetLoader.prototype.onError = function(bundleName, callback) {
  this.helper.addCallback(this.error, bundleName, callback);
};

/**
 * @param {String} bundleName name of bundle to check
 * @param {Function} callback called with the result
 */
GameAssetLoader.prototype.check = function(bundleName, callback) {
  var bundle = this.bundles[bundleName];
  if (!bundle) {
    callback({success: false});
    return;
  }

  var adapter = this.adapter;
  (function loop(index) {
    // If we've finished loading all of the assets in the bundle
    if (index == bundle.length) {
      callback({success: true});
      return;
    }
    var key = bundle[index];
    adapter.checkAsset(key, function() {
      // Iterate to the next file
      loop(index + 1);
    }, function() {
      // Failure
      callback({success: false});
    });

  })(0);
};

/**
 * Gets URL to loaded asset
 *
 * @param {String} assetPath path of the asset relative to the manifest
 * root
 * @return {String} url to the asset in the local filesystem
 * @throws {Exception} if the asset doesn't actually exist
 */
GameAssetLoader.prototype.get = function(assetPath) {
  return this.adapter.getAssetUrl(assetPath) || null;
};

/**
 * Gets the last cached time for an asset at a given path
 *
 * @param {String} assetPath relative path of asset
 * @return {Int} UNIX time of the last time the asset was cached
 */
GameAssetLoader.prototype.cacheTime = function(assetPath) {
  // TODO(smus): implement meeeee!
  return Math.random();
};

/**
 * @return {Boolean} true iff the browser is online
 */
GameAssetLoader.prototype.online = function() {
  return navigator.onLine;
};

/**
 * Helper methods for the old GAL
 */
GameAssetLoader.prototype.helper = {

  /**
   * Fetches JSON at a URL and calls the callback with the parsed object
   */
  fetchJSON: function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function(e) {
      if (this.readyState == 4 && this.status == 200) {
        callback(JSON.parse(xhr.responseText));
      }
    };
    xhr.send();
  },

  /**
   * Initializes the adapter and calls back when that's done.
   */
  initAdapter: function(callback) {
    this.adapter = new GameAssetLoader.adapterClass();
    this.adapter.init(function() {
      callback();
    });
  },

  /**
   * Sets the manifest and parses out bundles and bundle order.
   */
  setManifest: function(manifest) {
    this.manifest = manifest;
    // Set this.bundles object and this.bundleOrder array
    for (var i = 0; i < manifest.bundles.length; i++) {
      var bundle = manifest.bundles[i];
      this.bundles[bundle.name] = bundle.contents;
      this.bundleOrder.push(bundle.name);
    }
  },

  /**
   * Initializes the adapter and assigns the manifest.
   * Starts downloading assets if the manifest is set to autoDownload.
   */
  finishInit: function(manifest, callback) {
    var helper = this.helper;
    var context = this;
    helper.initAdapter.call(context, function() {
      helper.setManifest.call(context, manifest);
      // Optionally, start auto-download
      if (manifest.autoDownload && context.online()) {
        helper.downloadAll.call(context);
      }
      callback();
    });
  },

  /**
   * Adds a callback associated with a bunle name
   * @param {Object} callbacks an object associated with an event type
   *    (ex. bundle loaded, bundle load progress updated, bundle failed)
   * @param {String} bundleName the name of the bundle to monitor. If set
   *    to "*", all bundles will be monitored
   * @param {Function} callback the function to call
   */
  addCallback: function(callbacks, bundleName, callback) {
    if (typeof bundleName == "function") {
      // bundleName is optional, and may be a callback instead.
      callback = bundleName;
      bundleName = '*';
    }
    if (!callbacks[bundleName]) {
      // Add an empty array
      callbacks[bundleName] = [];
    }

    callbacks[bundleName].push(callback);
  },

  /**
   *
   *
   *
   */
  fireCallback: function(object, bundleName, params) {
    this.fireCallbackHelper(object, bundleName, params);
    // Also fire all * callbacks
    this.fireCallbackHelper(object, '*', params);
  },

  fireCallbackHelper: function(object, bundleName, params) {
    var callbacks = object[bundleName];
    if (callbacks) {
      for (var i = 0; i < callbacks.length; i++) {
        callbacks[i](params);
      }
    }
  },

  downloadAll: function() {
    var that = this;
    // Start by downloading the first bundle, then download subsequent ones
    (function loop(bundleIndex) {
      if (bundleIndex == that.bundleOrder.length) {
        // We're done downloading stuff!
        return;
      }
      var bundleName = that.bundleOrder[bundleIndex];
      that.onLoaded(bundleName, function() {
        // Once bundle is loaded, load the next bundle
        loop(bundleIndex + 1);
      });
      that.download(bundleName);
    })(0);
  }
};
