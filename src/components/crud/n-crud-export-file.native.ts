import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';

export async function deliverNCrudCsv(
  contents: string,
  fileName: string,
): Promise<void> {
  if (!(await isAvailableAsync())) {
    throw new Error('Este dispositivo no permite compartir archivos.');
  }
  const file = new File(Paths.cache, fileName);
  file.create({ intermediates: true, overwrite: true });
  file.write(contents);
  await shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Exportar datos',
  });
}
