jest.mock('@/lib/api', () => ({
  api: {
    defaults: { baseURL: 'https://api.nova.test' },
    post: jest.fn(),
  },
}));

import { api } from '@/lib/api';
import { uploadManagedFile } from '@/lib/fileService';

describe('uploadManagedFile', () => {
  test('rejects an empty GenParameter before sending the file', async () => {
    await expect(
      uploadManagedFile(
        {
          uri: 'file:///tmp/image.jpg',
          name: 'image.jpg',
          mimeType: 'image/jpeg',
        },
        '   ',
      ),
    ).rejects.toThrow('genParameter es obligatorio');
    expect(api.post).not.toHaveBeenCalled();
  });
});
