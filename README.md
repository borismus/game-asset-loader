# Manifest format

* assetRoot: contains the root URL under which all of the assets reside
* bundles: an array of objects which describe groups of assets, containing:
    * name: a unique name for the group of assets
    * contents: an array containing relative pathes to each asset in the bundle
* autoDownload: a flag that, if true, will start downloading all of the bundled
  assets in order as soon as GAL inits

Here is an example manifest file:

```javascript
{
   "assetRoot": "url/to/assets",
   "bundles": [
     {
       "name": "unique bundle name",
       "contents": [
         "relative/path/to/asset.jpg",
         "another/asset.mp3"
       ]
     },
     ...
   ],
   "autoDownload": true
}
```

# Sample Usage

Initializing the loader.

```javascript
var gal = new GameAssetLoader("http://path.to/gal.manifest");

// Load the GAL. If manifest indicates autoDownload, this call will
// start loading assets one by one.
gal.init(function() {
   // Called when the library is initialized
});
```

Setup callbacks to check bundle loading completion and downloaded
states.

```javascript
// Set a callback so that whenever bundleName is ready to use,
gal.onLoaded("bundleName", function(info) {
   // This function is called
   // Note: if the bundle is loaded already, callback fires right away
   // info.bundleName contains the bundle that was just loaded
});

// Set a callback whenever a bundle is being loaded
gal.onProgress("bundleName", function(progress) {
   // Calls back with progress.current and progress.total whenever more
   // of the bundle is downloaded.
});

// Set a callback whenever any bundle loading causes an error
gal.onError(function(error) {
   // Error contains some stuff
});
```

Explicitly download a bundle (this only makes sense if autoDownload is
false)

```javascript
// Tell blockName to download
gal.download("blockName");
```

Check that a bundle is already loaded. For example, if you"re about to
launch Level 5, you should ensure that Level 5 assets are loaded.

```javascript
// Synchronous version of onBundleLoaded
gal.checkLoaded("bundleName", function(result) {
   // result.loaded iff successfully loaded
});
```

Get local URLs to downloaded assets.

```javascript
var url = gal.get("image/baz.png");
```
