declare const __dirname: string;
declare function require(name: string): {
  readFileSync?: (path: string, encoding: string) => string;
  resolve?: (...paths: string[]) => string;
  join?: (...paths: string[]) => string;
};

const fs = require('fs') as Required<
  Pick<ReturnType<typeof require>, 'readFileSync'>
>;
const path = require('path') as Required<
  Pick<ReturnType<typeof require>, 'resolve' | 'join'>
>;

const appRoot = path.resolve(__dirname, '..');

const read = (relativePath: string) =>
  fs.readFileSync(path.join(appRoot, relativePath), 'utf8');

describe('NCrud screen migration', () => {
  it('la lista de visitas técnicas usa NCrud en modo offline', () => {
    const source = read('src/app/(tabs)/technical-visits.tsx');

    expect(source).toMatch(/<NCrud\b/);
    expect(source).toMatch(/offline=\{\{ resource:/);
  });

  it('no expone pantallas de edición de definiciones', () => {
    expect(() => read('src/app/(tabs)/definitions.tsx')).toThrow();
    expect(() => read('src/app/(tabs)/definition-details.tsx')).toThrow();
  });

  it('does not expose superseded draft contracts', () => {
    const contracts = read('src/components/crud/contracts.ts');

    expect(contracts).not.toContain('NCrudColumnDefinition');
    expect(contracts).not.toContain('NCrudSelectionChange');
    expect(contracts).not.toContain('NCrudOfflineCapabilities');
    expect(contracts).not.toContain('NCrudTableConfig');
  });
});
