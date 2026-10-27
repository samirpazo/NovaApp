import { resolveNButtonVariant } from '@/components/forms/NButton.utils';

describe('NButton', () => {
  it('maps the standard primary variant to the shared primary primitive', () => {
    expect(resolveNButtonVariant('primary')).toBe('default');
    expect(resolveNButtonVariant('outline')).toBe('outline');
  });
});
