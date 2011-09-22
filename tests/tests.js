$(function() {

// Helper method to clear the filesystem.
GameAssetLoader.prototype.clearFS = function() {
  this.adapter.clear();
};

module('basic');

test('manifest reading', function() {
  var gal = new GameAssetLoader('gal.manifest');
  stop(1000);
  gal.init(function() {
    gal.clearFS();
    start();
    equals(gal.manifest.assetRoot, './media/', 'gal manifest loaded success!');
  });
});

test('missing assets', function() {
  var gal = new GameAssetLoader('gal.manifest');
  stop(1000);
  gal.init(function() {
    gal.clearFS();
    start();
    equal(gal.get('foooo.png'), null,
          'path of files not in the cache should be null');
  });
});

test('downloading works', function() {
  var gal = new GameAssetLoader('gal.manifest');
  stop(1000);

  gal.onLoaded('core', function() {
    start();
    ok(true, 'successfully downloaded core bundle');
    var url = gal.get('loading.jpg');
    var pattern = /filesystem:.*\/persistent\/gal\/loading.jpg/;
    ok(url.match(pattern), 'url of loading.jpg is correct');
    stop(1000);
    gal.check('core', function(result) {
      if (result.success) {
        start();
        ok(true, 'checked that core exists!');
      }
    });
  });

  gal.init(function() {
    gal.clearFS();
    gal.download('core');
  });
});

test('checking loaded assets fails if no asset available.', function() {
  var gal = new GameAssetLoader('gal.manifest');
  stop(1000);
  gal.init(function() {
    gal.clearFS();
    gal.check('foooo', function(result) {
      start();
      ok(!result.success, 'foooo not a valid bundle');
      stop(1000);
      gal.check('base', function(result) {
        start();
        ok(!result.success, 'base bundle wasnt loaded yet');
      });
    });
  });
});

// TODO(smus):
test('ensure that subdir/resources.png load properly', function() {
  var gal = new GameAssetLoader('gal.manifest');
  stop(1000);
  gal.onLoaded('level1', function() {
    start();
    ok(true, 'successfully downloaded core bundle');
    var pattern = /filesystem:.*\/persistent\/gal\/L1\/background.jpg/;
    var url = gal.get('L1/background.jpg');
    ok(url.match(pattern), 'url of nested file is correct');
  });

  gal.init(function() {
    gal.clearFS();
    gal.download('level1');
  });
});

test('progress updates get sent', function() {
  var gal = new GameAssetLoader('gal.manifest');
  var iter = 1;
  gal.onProgress('core', function(status) {
    equals(status.current, iter, 'progress counter is accurate');
    iter++;
  });

  gal.onLoaded('core', function() {
    start();
    ok(true, 'core finished loading!');
  });

  stop(1000);
  gal.init(function() {
    gal.clearFS();
    gal.download('core');
  });
});

test('unqualified onLoaded, onError, etc calls work', function() {
  // If no bundle name is specified in gal.onLoaded calls:
  //    gal.onLoaded(function() { /* something */ })
  // Then callback should fire for all bundles.
  var gal = new GameAssetLoader('gal.manifest');
  gal.onLoaded(function(info) {
    start();
    equals(info.bundleName, 'core', 'core bundle loaded');
  });

  stop(1000);
  gal.init(function() {
    gal.clearFS();
    gal.download('core');
  });
});


test('auto downloading', function() {
  var gal = new GameAssetLoader('gal-auto.manifest');
  stop(1000);
  var ord = 0;
  gal.init(function() {
    gal.clearFS();
    gal.onLoaded('core', function() {
      equal(ord, 0, 'core loads first');
      ord++;
    });
    gal.onLoaded('level1', function() {
      start();
      equal(ord, 1, 'level1 loads next');
    });
  });
});



module('offline');

test('offline manifest loading', function() {
  // Clear localStorage so we're not getting cached manifests from prior tests.
  localStorage.clear();

  // Load gal.
  var gal = new GameAssetLoader('gal.manifest');
  stop(1000);
  gal.init(function() {
    gal.clearFS();
    // Load gal again, but in offline mode.
    var gal2 = new GameAssetLoader('gal.manifest');
    // Force gal to think that it's offline.
    gal2.online = function() { return false; };
    gal2.init(function() {
      start();
      ok(gal2.manifest != null, 'offline gal should have a manifest');
      equals(gal.manifest.assetRoot, gal2.manifest.assetRoot,
             'offline and online gal manifests should match');
    });
  });
});

test('assets are still available while offline', function() {
  // Clear localStorage so we're not getting cached manifests from prior tests.
  localStorage.clear();

  // Load gal.
  var gal = new GameAssetLoader('gal.manifest');
  gal.onLoaded('core', function() {
    // Then load gal again, but in offline mode.
    var gal2 = new GameAssetLoader('gal.manifest');
    // Force gal2 to think that it's offline.
    gal2.online = function() { return false; };
    gal2.init(function() {
      gal2.check('core', function(response) {
        start();
        // Ensure that core is loaded in gal2.
        ok(response.success, 'core is loaded though gal2 is offline');
      });
    });
  });

  stop(1000);
  gal.init(function() {
    gal.clearFS();
    // Download the core assets.
    gal.download('core');
  });
});

module('caching');

test('basic caching test', function() {
  var gal = new GameAssetLoader('gal.manifest');
  var startTime = (new Date()).valueOf();
  stop(1000);
  gal.init(function() {
    gal.clearFS();
    gal.download('core', function() {
      var cacheTime = gal.cacheTime('loading.jpg');
      start();
      notEqual(cacheTime, null,
               'cache time cannot be null for a file in the cache');
      ok(cacheTime > startTime);
      equal(gal.cacheTime('fofoofof.jpg'), null,
            'getting the cache time of uncached files should be null');
    });
  });
});

test('properly caches files', function() {
  // Run GAL twice on same manifest.
  var gal = new GameAssetLoader('gal.manifest');
  var cacheTime1;
  var cacheTime2;
  stop(1000);
  gal.init(function() {
    gal.clearFS();
    gal.download('core', function() {
      cacheTime1 = gal.cacheTime('loading.jpg');
    });
  });
  // Second time, make sure we don't actually reinsert the files.
  gal = new GameAssetLoader('gal.manifest');
  gal.init(function() {
    gal.clearFS();
    gal.download('core', function() {
      cacheTime2 = gal.cacheTime('loading.jpg');
      start();
      equal(cacheTime1, cacheTime2, 'previously cached items should stay cached');
    });
  });
});

test('knows how to cleanup files', function() {
  // TODO(smus): implement me.
  // Point first to one manifest, then to another with one fewer file.
  // Ensure that the missing file is gone from the FS.
});

test('handles large files', function() {
  // TODO(smus): implement me.
  // Cache a large file.
});

});
