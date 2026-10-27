const WIDTH = 720;
const HEIGHT = 280;

export function signatureExportViewBox(paths: string[]): string {
  const points = paths.flatMap((path) => {
    const values = [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map(Number);
    return Array.from({ length: Math.floor(values.length / 2) }, (_, index) => ({
      x: values[index * 2],
      y: values[index * 2 + 1],
    }));
  });
  if (!points.length) return `0 0 ${WIDTH} ${HEIGHT}`;

  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const padding = Math.max(right - left, bottom - top) * 0.12 + 8;
  const aspectRatio = WIDTH / HEIGHT;
  let cropWidth = right - left + padding * 2;
  let cropHeight = bottom - top + padding * 2;
  if (cropWidth / cropHeight < aspectRatio) cropWidth = cropHeight * aspectRatio;
  else cropHeight = cropWidth / aspectRatio;

  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  return `${centerX - cropWidth / 2} ${centerY - cropHeight / 2} ${cropWidth} ${cropHeight}`;
}
