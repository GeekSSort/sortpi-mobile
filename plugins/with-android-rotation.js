const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

module.exports = function withAndroidRotation(config) {
  return withAndroidManifest(config, (config) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    activity.$['android:screenOrientation'] = 'unspecified';
    return config;
  });
};
