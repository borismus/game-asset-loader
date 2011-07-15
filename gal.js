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
};

GameAssetLoader.prototype.init = function(callback) {
  if (this.online()) {
    var that = this;
    // Fetch the manifest
    this.helper.fetchJSON(this.manifestUrl, function(data) {
      that.manifest = data;
      // Save the manifest for offline use
      localStorage.setItem(that.manifestUrl, JSON.stringify(data));
      // Prepare the adapter to download assets
      that.helper.initAdapter.call(that, callback);
    });
  } else {
    this.manifest = JSON.parse(localStorage.getItem(this.manifestUrl));
    this.helper.initAdapter.call(this, callback);
  }
};

/**
 * Downloads assets contained in the named bundle.
 *
 * @param {String} bundleName name of single bundle to download
 * @param {Function} callback function to call after requested bundles
 * have been downloaded or if there's an error downloading
 * @param {Function} progressCallback a thing
 */
GameAssetLoader.prototype.download = function(bundleName, callback,
                                              progressCallback) {
  var bundle = this.manifest.bundles[bundleName];
  if (!bundle) {
    callback({success: false});
    return;
  }

  if (!this.online()) {
    // If offline, check for the resources, and if they exist, callback
    this.check(bundleName, function(result) {
      if (result.success) {
        callback({success: true, cached: true});
      }
    });
  }

  var adapter = this.adapter;
  var manifest = this.manifest;

  // Setup a loop via callback chaining
  (function loop(index) {
    // If we've finished loading all of the assets in the bundle
    if (index == bundle.length) {
      callback({success: true});
      return;
    }

    var key = bundle[index];
    // Get the full url to the asset
    var url = manifest.assetRoot + key;
    // Fetch full url and store it locally
    adapter.saveAsset(key, url, function() {
      // Iterate to the next file
      loop(index + 1);
      if (progressCallback) {
        progressCallback(index + 1, bundle.length);
      }
    });

  })(0);
};

/**
 * @param {String} bundleName name of bundle to check
 * @param {Function} callback called with the result
 */
GameAssetLoader.prototype.check = function(bundleName, callback) {
  var bundle = this.manifest.bundles[bundleName];
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

  initAdapter: function(callback) {
    this.adapter = new GameAssetLoader.adapterClass();
    this.adapter.init(function() {
      callback();
    });
  }
};
