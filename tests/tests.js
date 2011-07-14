$(function() {

// Helper method to clear the filesystem
GameAssetLoader.prototype.clearFS = function() {
  this.adapter.clear();
};

module('GameAssetLoader');

test('manifest reading', function() {
  var gal = new GameAssetLoader('gal.manifest');
  stop(1000);
  gal.init(function() {
    gal.clearFS();
    start();
    equals(gal.manifest.assetRoot, './media/');
  });
});

test('downloading works', function() {
  var gal = new GameAssetLoader('gal.manifest');
  stop(1000);
  var onDownloaded = function() {
    start();
    ok(true, 'successfully downloaded core bundle');
    var url = gal.get('loading.jpg');
    equals(url, 'filesystem:http://localhost/persistent/gal/loading.jpg');
  };

  gal.init(function() {
    gal.clearFS();
    gal.download('core', onDownloaded);
  });
});

test('progress updates get sent', function() {
  var gal = new GameAssetLoader('gal.manifest');
  stop(1000);
  gal.init(function() {
    gal.clearFS();
    var iter = 1;
    gal.download('core', function() {}, function(current, total) {
      start();
      equals(current, iter);
      iter++;
    });
  });
});

// TODO(smus):
test('ensure that subdir/resources.png load properly', function() {
  var gal = new GameAssetLoader('gal.manifest');
  stop(1000);
  var onDownloaded = function() {
    start();
    ok(true, 'successfully downloaded core bundle');
    var url = gal.get('L1/background.jpg');
    equals(url, 'filesystem:http://localhost/persistent/gal/L1/background.jpg');
  };

  gal.init(function() {
    gal.clearFS();
    gal.download('level1', onDownloaded);
  });
});

test('properly caches files', function() {
  // Run GAL twice on same manifest.
  var gal = new GameAssetLoader('gal.manifest');
  stop(1000);
  gal.init(function() {
    gal.clearFS();
    gal.download('core', onDownloaded);
  });
  // Second time, make sure we don't actually reinsert the files
});

test('knows how to cleanup files', function() {
  // Point first to one manifest, then to another with one fewer file
  // Ensure that the missing file is gone from the FS
});

test('handles large files', function() {
  // Cache a large file
});

test('sample', function() {
});

});
