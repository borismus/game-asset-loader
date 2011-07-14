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
  // Fetch the manifest
  var that = this;
  this.helper.fetchJSON(this.manifestUrl, function(data) {
    that.manifest = data;
    // Prepare the adapter to download assets
    that.adapter = new GameAssetLoader.adapterClass();
    that.adapter.init(function() {
      callback();
    });

  });
};

/**
 * Downloads assets contained in the named bundle.
 *
 * @param {String/Array} bundleName name of single bundle, or array of
 * bundle names to download
 * @param {Function} downloadCallback function to call after requested bundles
 * have been downloaded
 * @param {Function} progressCallback a thing
 */
GameAssetLoader.prototype.download = function(bundleName, downloadCallback,
                                              progressCallback) {
  var adapter = this.adapter;
  var manifest = this.manifest;
  var bundle = manifest.bundles[bundleName];

  // Setup a loop via callback chaining
  (function loop(index) {
    // If we've finished loading all of the assets in the bundle
    if (index == bundle.length) {
      downloadCallback();
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
 * Gets URL to loaded asset
 *
 * @param {String} assetPath path of the asset relative to the manifest
 * root
 * @return {String} url to the asset in the local filesystem
 */
GameAssetLoader.prototype.get = function(assetPath) {
  return this.adapter.getAssetUrl(assetPath);
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
  }
};
