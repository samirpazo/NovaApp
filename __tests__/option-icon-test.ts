import { ClipboardCheck, FileText, Folder } from 'lucide-react-native';

import { optionIcon } from '@/lib/optionIcon';

jest.mock('lucide-react-native', () => ({
  ClipboardCheck: () => null,
  FileText: () => null,
  Folder: () => null,
}));

describe('iconos dinámicos de opciones', () => {
  it('resuelve nombres Lucide guardados por Nova Web', () => {
    expect(optionIcon('clipboard-check', false)).toBe(ClipboardCheck);
  });

  it('usa un icono genérico si el nombre no existe', () => {
    expect(optionIcon('icono-inexistente', true)).toBe(Folder);
    expect(optionIcon('', false)).toBe(FileText);
  });
});
