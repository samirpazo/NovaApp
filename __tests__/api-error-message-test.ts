import { AxiosError, AxiosHeaders } from 'axios';

import { getApiErrorMessage } from '@/lib/api';

describe('getApiErrorMessage', () => {
  it('returns a lower-cased API validation message', () => {
    const error = new AxiosError('Request failed with status code 400');
    error.response = {
      data: { message: 'El lote excede el tamaño permitido.' },
      status: 400,
      statusText: 'Bad Request',
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    };

    expect(getApiErrorMessage(error)).toBe(
      'El lote excede el tamaño permitido.',
    );
  });

  it('returns ASP.NET validation details from the errors array', () => {
    const error = new AxiosError('Request failed with status code 400');
    error.response = {
      data: {
        errors: [
          {
            status: 400,
            title: 'Bad Request',
            detail: 'La firma del productor es obligatoria para validar la visita.',
          },
        ],
      },
      status: 400,
      statusText: 'Bad Request',
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    };

    expect(getApiErrorMessage(error)).toBe(
      'La firma del productor es obligatoria para validar la visita.',
    );
  });
});
