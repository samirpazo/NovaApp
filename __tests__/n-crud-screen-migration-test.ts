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
  const screens = [
    'src/app/(tabs)/definitions.tsx',
    'src/app/(tabs)/definition-details.tsx',
    'src/app/(tabs)/branches.tsx',
    'src/app/(tabs)/tables.tsx',
  ];

  it.each(screens)('%s consumes an NCrudDataSource', (screen) => {
    const source = read(screen);

    expect(source).toMatch(/dataSource=\{/);
    expect(source).not.toMatch(/\brows=\{/);
  });

  it('does not expose superseded draft contracts', () => {
    const contracts = read('src/components/crud/contracts.ts');

    expect(contracts).not.toContain('NCrudColumnDefinition');
    expect(contracts).not.toContain('NCrudSelectionChange');
    expect(contracts).not.toContain('NCrudOfflineCapabilities');
    expect(contracts).not.toContain('NCrudTableConfig');
  });
});
