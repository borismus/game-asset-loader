(function() {
var ROOT_DIR = 'gal';

var onError = function(error) {
  console.error('Filesystem error:', error);
};

/**
 * Helper to create file at path, as well as intermediate directories in the path
 *
 * @return DirectoryEntry to the directory that was just created
 */
var createDir = function(root, folders, callback) {
  // Throw out './' or '/' and move on to prevent something like '/foo/.//bar'.
  if (folders[0] === '.' || folders[0] === '') {
    folders = folders.slice(1);
  }
  if (folders.length === 0) {
    callback(root);
  }
  root.getDirectory(folders[0], {create: true}, function(dirEntry) {
    // Recursively add the new subfolder (if we still have another to create).
    if (folders.length) {
      createDir(dirEntry, folders.slice(1), callback);
    }
  }, onError);
};

dirname = function(path) {
  var match = path.match( /(.*)\// );
  return match && match[1] || "";
};

basename = function(path) {
  return path.replace( /.*\//, "" );
};


/**
 * Adapter for serializing game assets (for GAL) using the filesystem API
 */
var GALFS = function() {
  // Table to store lookups from file path fragment to filesystem URL
  this.lookupTable = {};
};

GALFS.prototype.init = function(callback) {
  // requestFileSystem shim
  window.requestFileSystem  = window.requestFileSystem ||
      window.webkitRequestFileSystem;

  window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder;
  var that = this;
  var quotaCallback = function(granted) {
    console.log('got quota:', granted);
    // Once quota is granted, initialize a filesystem
    window.requestFileSystem(PERSISTENT, granted, onInitFs, onError);
  };
  var errorCallback = function() {console.log('error');};

  // Get quota
  var size = 1024*1024*100;
  webkitStorageInfo.requestQuota(PERSISTENT, size,
    quotaCallback,
    errorCallback);

  // Callback when the filesystem has been initialized
  var onInitFs = function(fs) {
    console.log('opened filesystem');

    // TODO: do we really need a handle to the filesystem?
    that.fs = fs;

    // Create a directory for the root of the gal
    fs.root.getDirectory(ROOT_DIR, {create: true}, function(dirEntry) {
      that.root = dirEntry;
      callback();
    }, onError);
  };
};

/**
 * Saves an asset at the given URL to the filesystem API
 * callback when successfully saved.
 */
GALFS.prototype.saveAsset = function(key, url, callback) {
  var root = this.root;
  var lookupTable = this.lookupTable;

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'arraybuffer';

  xhr.onreadystatechange = function(e) {
    if (this.readyState == 4 && this.status == 200) {
      createDir(root, dirname(key).split('/'), function(dir) {

        dir.getFile(basename(key), {create: true}, function(fileEntry) {
          fileEntry.createWriter(function(writer) {

            writer.onwrite = function(e) {
              // Save this file in the path to URL lookup table.
              lookupTable[key] = fileEntry.toURL();
              callback();
            };
            writer.onerror = function(e) {
              console.error(e);
            };

            var bb = new BlobBuilder();
            bb.append(xhr.response);

            writer.write(bb.getBlob());

          }, onError);
        }, onError);
      });
    }
  };

  xhr.send();
};

/**
 * Gets the filesystem path for the asset stored at the given URL
 */
GALFS.prototype.getAssetUrl = function(key) {
  return this.lookupTable[key];
};

/**
 * Clears everything out of the root directory
 */
GALFS.prototype.clear = function() {
  // Remove the root directory
  this.root.removeRecursively(function() {}, onError);

  var that = this;
  // And then recreate it
  this.fs.root.getDirectory(ROOT_DIR, {create: true}, function(dirEntry) {
    that.root = dirEntry;
  }, onError);
};




if (!GameAssetLoader) {
  throw 'Game asset loader needs to be loaded before loading the fs adapter';
}

GameAssetLoader.adapterClass = GALFS;

}());
