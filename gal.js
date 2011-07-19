(function(exports) {
/**
 * Game Asset Loader Library.
 */

/**
 * GAL constructor
 *
 * @param {String} manifestUrl URL to manifest file.
 */
var GAL = function(manifestUrl) {
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
GAL.prototype.init = function(callback) {
  var that = this;
  if (this.online()) {
    // Fetch the manifest
    fetchJSON(this.manifestUrl, function(manifest) {
      // Save the manifest for offline use
      localStorage.setItem(that.manifestUrl, JSON.stringify(manifest));
      finishInit.call(that, manifest, callback);
    });
  } else {
    var manifest = JSON.parse(localStorage.getItem(this.manifestUrl));
    finishInit.call(that, manifest, callback);
  }
};

/**
 * Downloads assets contained in the named bundle.
 *
 * @param {String} bundleName name of single bundle to download
 */
GAL.prototype.download = function(bundleName) {
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
        fireCallback(this.loaded, bundleName, {
          success: true,
          cached: true,
          bundleName: bundleName
        });
      } else {
        // Otherwise, since we're offline, error out.
        fireCallback(this.error, bundleName, {
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
      fireCallback(that.loaded, bundleName, {
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
      fireCallback(that.progress, bundleName, {
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
GAL.prototype.onLoaded = function(bundleName, callback) {
  addCallback(this.loaded, bundleName, callback);
};

/**
 * Adds a callback to fire when a bundle's downloading has progressed
 *
 * @param {String} bundleName name of bundle to monitor
 * @param {Function} callback function to call when bundle download progresses
 */
GAL.prototype.onProgress = function(bundleName, callback) {
  addCallback(this.progress, bundleName, callback);
};

/**
 * Adds a callback to fire when a bundle's downloading has failed
 *
 * @param {String} bundleName name of bundle to monitor
 * @param {Function} callback function to call when bundle download fails
 */
GAL.prototype.onError = function(bundleName, callback) {
  addCallback(this.error, bundleName, callback);
};

/**
 * @param {String} bundleName name of bundle to check
 * @param {Function} callback called with the result
 */
GAL.prototype.check = function(bundleName, callback) {
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
GAL.prototype.get = function(assetPath) {
  return this.adapter.getAssetUrl(assetPath) || null;
};

/**
 * Gets the last cached time for an asset at a given path
 *
 * @param {String} assetPath relative path of asset
 * @return {Int} UNIX time of the last time the asset was cached
 */
GAL.prototype.cacheTime = function(assetPath) {
  // TODO(smus): implement meeeee!
  return Math.random();
};

/**
 * @return {Boolean} true iff the browser is online
 */
GAL.prototype.online = function() {
  return navigator.onLine;
};



/*********************************************
 * Helper methods for the old GAL
 *********************************************/



/**
 * Initializes the adapter and calls back when that's done.
 */
function fetchJSON(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onreadystatechange = function(e) {
    if (this.readyState == 4 && this.status == 200) {
      callback(JSON.parse(xhr.responseText));
    }
  };
  xhr.send();
}

/**
 * Sets the manifest and parses out bundles and bundle order.
 */
function initAdapter(callback) {
  this.adapter = new GAL.adapterClass();
  this.adapter.init(function() {
    callback();
  });
}

/**
 * Fetches JSON at a URL and calls the callback with the parsed object
 */
function setManifest(manifest) {
  this.manifest = manifest;
  // Set this.bundles object and this.bundleOrder array
  for (var i = 0; i < manifest.bundles.length; i++) {
    var bundle = manifest.bundles[i];
    this.bundles[bundle.name] = bundle.contents;
    this.bundleOrder.push(bundle.name);
  }
}

/**
 * Initializes the adapter and assigns the manifest.
 * Starts downloading assets if the manifest is set to autoDownload.
 */
function finishInit(manifest, callback) {
  var context = this;
  initAdapter.call(context, function() {
    setManifest.call(context, manifest);
    // Optionally, start auto-download
    if (manifest.autoDownload && context.online()) {
      downloadAll.call(context);
    }
    callback();
  });
}

/**
 * Adds a callback associated with a bunle name
 * @param {Object} callbacks an object associated with an event type
 *    (ex. bundle loaded, bundle load progress updated, bundle failed)
 * @param {String} bundleName the name of the bundle to monitor. If set
 *    to "*", all bundles will be monitored
 * @param {Function} callback the function to call
 */
function addCallback(callbacks, bundleName, callback) {
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
}

/**
 * Fires callbacks of a given type for a certain bundle
 *
 * @param {Object} object dictionary of callbacks
 * @param {String} bundleName string with the name of the bundle
 * @param {Object} params to call the callback with
 */
function fireCallback(callbacks, bundleName, params) {
  // Fire the principle callbacks, indexed by given bundleName
  fireCallbackHelper(callbacks, bundleName, params);
  // Also fire all * callbacks
  fireCallbackHelper(callbacks, '*', params);
}

function fireCallbackHelper(object, bundleName, params) {
  var callbacks = object[bundleName];
  if (callbacks) {
    for (var i = 0; i < callbacks.length; i++) {
      callbacks[i](params);
    }
  }
}

function downloadAll() {
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

exports.GameAssetLoader = GAL;

})(window);

