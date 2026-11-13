import { AuthUserSchema } from '@/contracts/auth';

describe('datos del usuario tras autenticarse', () => {
  test('admite los datos de la persona que el backend ya envía', () => {
    const parsed = AuthUserSchema.parse({
      UsrID: 10,
      UsrName: 'supervisor',
      UsrEmail: 'supervisor@nova.com',
      FullName: 'Apellido, Nombre',
      PrsName: 'Nombre',
      PaternalLastName: 'Apellido',
      MaternalLastName: 'Maternal',
      PrsID: 42,
      UsrChangePassword: false,
      PrsDocumentNumber: '12345678',
      TypeDocument: 1,
      TypeDocumentName: 'DNI',
      PrsPhone: '999888777',
      DptName: 'Agricola',
      PrvName: 'Lima',
      DtrName: 'Lima',
      PaiName: 'Peru',
      AreName: 'Tecnico',
      PstName: 'Supervisor',
    });

    expect(parsed.PrsDocumentNumber).toBe('12345678');
    expect(parsed.TypeDocumentName).toBe('DNI');
    expect(parsed.PrsPhone).toBe('999888777');
    expect(parsed.PaiName).toBe('Peru');
  });

  test('descarta los datos sensibles que el backend tambien envia', () => {
    const parsed = AuthUserSchema.parse({
      UsrID: 10,
      UsrName: 'supervisor',
      PrsAddress: 'Calle 123',
      PrsAddressDni: '12345678',
      PrsVerifierCode: 'A1B2',
      TypeBloodGroup: 3,
      PrsEmergencyContact: 'Familiar',
      PrsEmergencyPhone: '999999999',
      PrsMedicalConditions: 'Alergia',
      PrsRuc: '20509876543',
      PrsBirthDay: '1990-01-01T00:00:00.000Z',
      TypeGender: 1,
      TypePayroll: 2,
      TypeSituation: 1,
      TypeWorker: 3,
      TypeContract: 1,
    });

    expect(parsed).not.toHaveProperty('PrsAddress');
    expect(parsed).not.toHaveProperty('PrsEmergencyPhone');
    expect(parsed).not.toHaveProperty('PrsMedicalConditions');
    expect(parsed).not.toHaveProperty('PrsRuc');
    expect(parsed).not.toHaveProperty('TypeGender');
    expect(parsed).not.toHaveProperty('TypePayroll');
  });

  test('acepta una respuesta sin los datos de la persona', () => {
    const parsed = AuthUserSchema.parse({
      UsrID: 10,
      UsrName: 'supervisor',
    });

    expect(parsed.PrsDocumentNumber).toBeUndefined();
    expect(parsed.PrsPhone).toBeUndefined();
  });
});
