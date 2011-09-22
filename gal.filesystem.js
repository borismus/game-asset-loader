/*
 * Copyright 2011 Google Inc. All Rights Reserved.

 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * @fileoverview The filesystem adapter used by Game Asset Loader.
 * @author smus@google.com (Boris Smus)
 */

(function(gal) {
var ROOT_DIR = 'gal';
var DEFAULT_QUOTA = 1024 * 1024 * 100;

function onError(error) {
  console.error('Filesystem error:', error);
};

/**
 * @private
 * Helper to create file at path, as well as intermediate directories in the
 * path. Behaves roughly like `mkdir -p`
 * @param {DirectoryEntry} root Directory at the root of the gal.
 * @param {array} folders Folder heirarchy to create.
 * @param {function} callback Called when the directory structure is created
 * @return DirectoryEntry to the directory that was just created.
 */
function createDir_(root, folders, callback) {
  // Throw out './' or '/' and move on to prevent something like '/foo/.//bar'.
  if (folders[0] === '.' || folders[0] === '') {
    folders = folders.slice(1);
  }
  if (!folders.length) {
    callback(root);
  }
  root.getDirectory(folders[0], {create: true}, function(dirEntry) {
    // Recursively add the new subfolder (if we still have another to create).
    if (folders.length) {
      createDir_(dirEntry, folders.slice(1), callback);
    }
  }, onError);
};

/**
 * @private
 * Utility tools to emulate UNIX dirname.
 * @param {string} path The path whose basename to get.
 * @return {string} The contents of the path before the file name.
 */
function dirname_(path) {
  var match = path.match(/(.*)\//);
  return match && match[1] || '';
};

/**
 * @private
 * Utility tools to emulate UNIX basename.
 * @param {string} path The path whose basename to get.
 * @return {string} The contents of the path after the file name.
 */
function basename_(path) {
  return path.replace(/.*\//, '');
};


/**
 * Class for serializing game assets (for GAL) using the filesystem API.
 * @constructor
 */
function GALFS() {
  // Table to store lookups from file path fragment to filesystem URL
  this.lookupTable = {};
};

/**
 * Initializes the adapter.
 * @param {function} callback The callback to call once the adapter has been
 *    initialized.
 * @param {string} opt_quota The quota (in bytes) to request (optional).
 */
GALFS.prototype.init = function(callback, opt_quota) {
  // requestFileSystem and storageInfo shims
  var requestFileSystem = window.requestFileSystem ||
      window.webkitRequestFileSystem;
  var storageInfo = window.storageInfo || window.webkitStorageInfo;

  var quota = opt_quota || DEFAULT_QUOTA;

  var that = this;
  // Callback when the filesystem has been initialized
  var onInitFs = function(fs) {
    that.fs = fs;

    // Create a directory for the root of the GAL
    fs.root.getDirectory(ROOT_DIR, {create: true}, function(dirEntry) {
      that.root = dirEntry;
      callback();
    }, onError);
  };

  // Callback when the filesystem API has granted quota
  var quotaCallback = function(grantedBytes) {
    // Save grantedBytes in the adapter
    that.grantedBytes = grantedBytes;
    // Once quota is grantedBytes, initialize a filesystem
    requestFileSystem(window.PERSISTENT, grantedBytes, onInitFs, onError);
  };

  // Get quota
  storageInfo.requestQuota(window.PERSISTENT, quota,
    quotaCallback, onError);
};

/**
 * Saves an asset at the given URL to the filesystem API callback when
 * successfully saved.
 * @param {string} key The key path to use for storing the asset.
 * @param {string} url The URL to the asset.
 * @param {function} callback The function to call when the asset was saved.
 * @param {function} failCallback The function to call when an error occurred.
 */
GALFS.prototype.saveAsset = function(key, url, callback, failCallback) {
  // BlobBuilder shim
  var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder;

  var root = this.root;
  var lookupTable = this.lookupTable;

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'arraybuffer';

  xhr.addEventListener('load', function() {
    createDir_(root, dirname_(key).split('/'), function(dir) {

      dir.getFile(basename_(key), {create: true}, function(fileEntry) {
        fileEntry.createWriter(function(writer) {

          writer.onwrite = function(e) {
            // Save this file in the path to URL lookup table.
            lookupTable[key] = fileEntry.toURL();
            callback();
          };

          writer.onerror = failCallback;

          var bb = new BlobBuilder();
          bb.append(xhr.response);

          writer.write(bb.getBlob());

        }, failCallback);
      }, failCallback);
    });
  });

  xhr.addEventListener('error', failCallback);
  xhr.send();
};

/**
 * Gets the filesystem path for the asset stored at the given URL.
 * @param {string} key The key path to the asset.
 * @return {string} URL to the filesystem.
 */
GALFS.prototype.getAssetUrl = function(key) {
  return this.lookupTable[key];
};

/**
 * Checks if a file with the specified key exists in the filesystem.
 * @param {string} key The key path to the asset.
 * @param {function} callback The callback to call if the file exists.
 * @param {function} failCallback The callback to call if the file
 *    doesn't exist.
 */
GALFS.prototype.checkAsset = function(key, callback, failCallback) {
  var lookupTable = this.lookupTable;
  this.root.getFile(key, {}, function(fileEntry) {
    // Save the file in the lookup table.
    lookupTable[key] = fileEntry.toURL();
    callback();
  }, failCallback);
};

/**
 * Clears everything out of the root directory. Mostly for unit testing.
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

if (!gal) {
  throw 'Game asset loader needs to be loaded before loading the fs adapter';
}

gal.adapterClass = GALFS;

}(GameAssetLoader));
