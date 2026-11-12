jest.mock('@/lib/api', () => ({
  api: {
    defaults: { baseURL: 'https://api.nova.test' },
    post: jest.fn(),
  },
  postForUser: jest.fn(),
}));
jest.mock('@/database', () => ({ getActiveIdentityKey: () => 'account-a' }));

import { AxiosHeaders } from 'axios';

import { postForUser } from '@/lib/api';
import { uploadManagedFile } from '@/lib/fileService';

const file = {
  uri: 'file:///tmp/image.jpg',
  name: 'image.jpg',
  mimeType: 'image/jpeg',
};

describe('uploadManagedFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects an empty GenParameter before sending the file', async () => {
    await expect(uploadManagedFile(file, '   ', undefined, 11)).rejects.toThrow(
      'genParameter es obligatorio',
    );
    expect(postForUser).not.toHaveBeenCalled();
  });

  test('envía el identificador de carga en el cuerpo multipart', async () => {
    jest.mocked(postForUser).mockResolvedValue({
      headers: {},
      status: 200,
      statusText: 'OK',
      config: { headers: new AxiosHeaders() },
      data: {
        Succeeded: true,
        Message: null,
        Data: {
          FileId: 77,
          OriginalName: 'image.jpg',
          MimeType: 'image/jpeg',
          Size: 10,
          PreviewStatus: 'ready',
          CanDownload: true,
        },
      },
    });

    await uploadManagedFile(file, 'ROUTE_TECHNICAL_VISIT_FILES', 'upload-1', 11);

    const [, form, , requestConfig] = jest.mocked(postForUser).mock.calls[0];
    expect((form as FormData).get('uploadId')).toBe('upload-1');
    // La cabecera Idempotency-Key no se usa en multipart: su huella cambia
    // entre reintentos y el servidor rechazaría la carga con un conflicto.
    expect(
      (requestConfig?.headers as Record<string, string>)['Idempotency-Key'],
    ).toBeUndefined();
  });

  test('el reintento con el mismo identificador devuelve el mismo archivo', async () => {
    jest
      .mocked(postForUser)
      .mockResolvedValueOnce({
        headers: {},
        status: 200,
        statusText: 'OK',
        config: { headers: new AxiosHeaders() },
        data: {
          Succeeded: true,
          Message: null,
          Data: {
            FileId: 77,
            OriginalName: 'image.jpg',
            MimeType: 'image/jpeg',
            Size: 10,
            PreviewStatus: 'ready',
            CanDownload: true,
          },
        },
      })
      .mockResolvedValueOnce({
        headers: {},
        status: 200,
        statusText: 'OK',
        config: { headers: new AxiosHeaders() },
        data: {
          Succeeded: true,
          Message: null,
          Data: {
            FileId: 77,
            OriginalName: 'image.jpg',
            MimeType: 'image/jpeg',
            Size: 10,
            PreviewStatus: 'ready',
            CanDownload: true,
          },
        },
      });

    const first = await uploadManagedFile(
      file,
      'ROUTE_TECHNICAL_VISIT_FILES',
      'upload-1',
      11,
    );
    const second = await uploadManagedFile(
      file,
      'ROUTE_TECHNICAL_VISIT_FILES',
      'upload-1',
      11,
    );

    expect(first.FileId).toBe(77);
    expect(second.FileId).toBe(77);
    const calls = jest.mocked(postForUser).mock.calls;
    expect((calls[0][1] as FormData).get('uploadId')).toBe('upload-1');
    expect((calls[1][1] as FormData).get('uploadId')).toBe('upload-1');
  });
});
