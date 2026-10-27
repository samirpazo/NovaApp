import { signatureExportViewBox } from '@/components/forms/signature-export';

test('exports the signature crop around the strokes with the image aspect ratio', () => {
  const [x, y, width, height] = signatureExportViewBox([
    'M 300 100 L 360 120 L 400 180',
  ])
    .split(' ')
    .map(Number);

  expect(x).toBeLessThan(300);
  expect(y).toBeLessThan(100);
  expect(x + width).toBeGreaterThan(400);
  expect(y + height).toBeGreaterThan(180);
  expect(width / height).toBeCloseTo(720 / 280);
});

test('keeps the full signature canvas when there are no strokes', () => {
  expect(signatureExportViewBox([])).toBe('0 0 720 280');
});
