/**
 * Plugin de prebuild: eleva el deployment target de los pods de terceros.
 *
 * Xcode 26+ rechaza los targets de despliegue antiguos que traen algunos pods
 * que Expo no controla (SDWebImage con 9.0, RNSVG con 12.4) y la compilación
 * falla antes de empezar. El mínimo es 16.0 porque expo-router usa
 * UIMenuElement.subtitle, que llegó en iOS 16:
 *
 *   The iOS Simulator deployment target 'IPHONEOS_DEPLOYMENT_TARGET' is set
 *   to 9.0, but the range of supported deployment target versions is 15.0 to 27.2.x.
 *
 * El código se integra dentro del `post_install` que ya declara React Native:
 * CocoaPods no admite más de un hook `post_install` por Podfile. Se ejecuta en
 * cada `expo prebuild`, de modo que la corrección no se pierde al regenerar
 * ios/.
 */
const { withPodfile } = require('expo/config-plugins');

const MIN_DEPLOYMENT_TARGET = '16.0';
const MARKER = 'nova-pod-deployment-target';

const HOOK_BODY = `
    # ${MARKER}: Xcode 26+ no admite los deployment targets antiguos de algunos pods.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || current.to_f < ${Number(MIN_DEPLOYMENT_TARGET)}
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_DEPLOYMENT_TARGET}'
        end
      end
    end
`;

/** Devuelve el índice justo después de la llamada `react_native_post_install(...)`. */
function findReactNativePostInstallEnd(contents) {
  const start = contents.indexOf('react_native_post_install(');
  if (start === -1) return -1;

  let depth = 0;
  for (let index = start + 'react_native_post_install'.length; index < contents.length; index++) {
    const character = contents[index];
    if (character === '(') depth++;
    else if (character === ')') {
      depth--;
      if (depth === 0) return index + 1;
    }
  }
  return -1;
}

module.exports = function withPodDeploymentTarget(config) {
  return withPodfile(config, (podConfig) => {
    const contents = podConfig.modResults.contents;
    if (contents.includes(MARKER)) {
      return podConfig;
    }

    let insertAt = findReactNativePostInstallEnd(contents);

    if (insertAt === -1) {
      // Alternativa: entrar justo después de la apertura del bloque post_install.
      const hookStart = contents.indexOf('post_install do |installer|');
      if (hookStart === -1) {
        throw new Error(
          '[withPodDeploymentTarget] No se encontró el bloque post_install del Podfile.',
        );
      }
      const lineEnd = contents.indexOf('\n', hookStart);
      insertAt = lineEnd === -1 ? contents.length : lineEnd + 1;
    }

    podConfig.modResults.contents =
      contents.slice(0, insertAt) + HOOK_BODY + contents.slice(insertAt);

    return podConfig;
  });
};
