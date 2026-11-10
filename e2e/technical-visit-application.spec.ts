import { test, expect } from '@playwright/test';

const baseEntity = (syncId: string) => ({
  SyncId: syncId,
  SyncVersion: '1',
  SecStatus: true,
  CreateUserId: 1,
  UpdateUserId: null,
  DeleteUserId: null,
  CreateDate: '2026-01-01T00:00:00Z',
  UpdateDate: null,
  DeleteDate: null,
});

const emptySnapshot = {
  Visit: {
    TviID: 6,
    TvsID: 8,
    TviPerformedDate: '2026-11-10T08:00:00Z',
    SecStatus: true,
    SyncId: 'ca016e20-7eb5-47cd-a73a-ee924062e6b9',
  },
  Applications: [],
  ApplicationDetails: [],
  Diagnoses: [],
  Phenology: [],
  Activities: [],
  Installations: [],
  Recommendations: [],
  PreviousRecommendations: [],
  RecommendationFollowUps: [],
  CulturalActivities: [],
  PreviousCulturalActivities: [],
  CulturalActivityFollowUps: [],
  Evidences: [],
  PendingSignatureFile: null,
};

const mockSyncChanges = [
  {
    Resource: 'GenDefinition',
    SyncId: '11111111-1111-1111-1111-111111111185',
    Operation: 'C',
    Data: {
      ...baseEntity('11111111-1111-1111-1111-111111111185'),
      DefID: 185,
      DefCode: 'OAG_FIELD_APPLICATION_MODE',
      DefDescription: 'Modalidad de aplicación en campo',
      DefStated: 1,
    },
  },
  {
    Resource: 'GenDefinitionDetail',
    SyncId: '22222222-2222-2222-2222-222222221548',
    Operation: 'C',
    Data: {
      ...baseEntity('22222222-2222-2222-2222-222222221548'),
      DedID: 1548,
      DefID: 185,
      DedCode: 'OAG_FIELD_APPLICATION_MODE',
      DedDescription: 'General',
      DedValue: 1,
      DedAbbreviation: null,
      DedFormat: null,
      DedHelper: null,
      DedHelper2: null,
      DedIcon: null,
      DedColor: null,
      DedGroup: null,
      DedImageFilID: null,
      DedStated: 1,
    },
  },
  {
    Resource: 'GenDefinitionDetail',
    SyncId: '22222222-2222-2222-2222-222222221549',
    Operation: 'C',
    Data: {
      ...baseEntity('22222222-2222-2222-2222-222222221549'),
      DedID: 1549,
      DefID: 185,
      DedCode: 'OAG_FIELD_APPLICATION_MODE',
      DedDescription: 'Focalizada',
      DedValue: 2,
      DedAbbreviation: null,
      DedFormat: null,
      DedHelper: null,
      DedHelper2: null,
      DedIcon: null,
      DedColor: null,
      DedGroup: null,
      DedImageFilID: null,
      DedStated: 1,
    },
  },
  {
    Resource: 'GenDefinitionDetail',
    SyncId: '22222222-2222-2222-2222-222222221501',
    Operation: 'C',
    Data: {
      ...baseEntity('22222222-2222-2222-2222-222222221501'),
      DedID: 1501,
      DefID: 179,
      DedCode: 'OAG_APPLICATION_TYPE',
      DedDescription: 'Foliar',
      DedValue: 1,
      DedAbbreviation: null,
      DedFormat: null,
      DedHelper: null,
      DedHelper2: null,
      DedIcon: null,
      DedColor: null,
      DedGroup: null,
      DedImageFilID: null,
      DedStated: 1,
    },
  },
  {
    Resource: 'GenDefinitionDetail',
    SyncId: '22222222-2222-2222-2222-222222221511',
    Operation: 'C',
    Data: {
      ...baseEntity('22222222-2222-2222-2222-222222221511'),
      DedID: 1511,
      DefID: 172,
      DedCode: 'OAG_DOSE_UNIT',
      DedDescription: 'kg/ha',
      DedValue: 1,
      DedAbbreviation: null,
      DedFormat: null,
      DedHelper: null,
      DedHelper2: null,
      DedIcon: null,
      DedColor: null,
      DedGroup: null,
      DedImageFilID: null,
      DedStated: 1,
    },
  },
  {
    Resource: 'GenDefinitionDetail',
    SyncId: '22222222-2222-2222-2222-222222221521',
    Operation: 'C',
    Data: {
      ...baseEntity('22222222-2222-2222-2222-222222221521'),
      DedID: 1521,
      DefID: 180,
      DedCode: 'OAG_APPLICATION_QUANTITY_UNIT',
      DedDescription: 'kg',
      DedValue: 1,
      DedAbbreviation: null,
      DedFormat: null,
      DedHelper: null,
      DedHelper2: null,
      DedIcon: null,
      DedColor: null,
      DedGroup: null,
      DedImageFilID: null,
      DedStated: 1,
    },
  },
  {
    Resource: 'OagFruitFarm',
    SyncId: '33333333-3333-3333-3333-333333330001',
    Operation: 'C',
    Data: {
      ...baseEntity('33333333-3333-3333-3333-333333330001'),
      FrfID: 1,
      FrfName: 'Fundo San Lorenzo',
      FrfAddress: 'San Lorenzo',
    },
  },
  {
    Resource: 'OagPlotFarm',
    SyncId: '44444444-4444-4444-4444-444444440007',
    Operation: 'C',
    Data: {
      ...baseEntity('44444444-4444-4444-4444-444444440007'),
      PlfID: 7,
      FrfID: 1,
      CltID: 1,
      VrtID: 1,
      TypeCrop: 1,
      PlfName: 'Lote San José Kent',
      PlfCode: 'PLF-07',
      PlfHectares: 14,
    },
  },
  {
    Resource: 'OagCultive',
    SyncId: '55555555-5555-5555-5555-555555550001',
    Operation: 'C',
    Data: {
      ...baseEntity('55555555-5555-5555-5555-555555550001'),
      CltID: 1,
      CltDescription: 'Mango',
      CltAbbreviation: 'MG',
      CltStatus: 1,
    },
  },
  {
    Resource: 'OagTechnicalVisitSchedule',
    SyncId: '66666666-6666-6666-6666-666666660008',
    Operation: 'C',
    Data: {
      ...baseEntity('66666666-6666-6666-6666-666666660008'),
      TvsID: 8,
      PlfID: 7,
      CmpID: null,
      TvsScheduledDate: '2026-11-10T08:00:00Z',
      TvsResponsiblePrsID: 1,
      TvsVisitType: 1,
      TvsObservation: 'Visita programada',
      ResponsibleName: 'Edinson Pascual Santos Vilchez',
      PlfName: 'Lote San José Kent',
      FrfName: 'Fundo San Lorenzo',
      CltDescription: 'Mango',
    },
  },
  {
    Resource: 'OagTechnicalVisit',
    SyncId: 'ca016e20-7eb5-47cd-a73a-ee924062e6b9',
    Operation: 'C',
    Data: {
      ...baseEntity('ca016e20-7eb5-47cd-a73a-ee924062e6b9'),
      TviID: 6,
      TvsID: 8,
      TviPerformedDate: '2026-11-10T08:00:00Z',
      TviDocumentSeries: null,
      TviDocumentNumber: null,
      TviLatitude: null,
      TviLongitude: null,
      TviObservation: 'Visita técnica de prueba',
      TviSignatureFilID: null,
      Snapshot: JSON.stringify(emptySnapshot),
    },
  },
  {
    Resource: 'OagFarmSupplies',
    SyncId: '77777777-7777-7777-7777-777777770001',
    Operation: 'C',
    Data: {
      ...baseEntity('77777777-7777-7777-7777-777777770001'),
      FrsID: 1,
      TypeSupplies: 1,
      FrsDescription: 'Bioinsecticida de neem para manejo integrado',
      FrsCode: 'BIO-001',
      FrsActiveIngredientName: 'Azadiractina',
      FrsStatus: 1,
      TypeApplication: 1,
      TypeAction: 1,
      TypeMeasurement: 1,
      TypeUnit: 1,
      TypeCategory: 1,
      TypeClassification: 1,
    },
  },
  {
    Resource: 'OagObjective',
    SyncId: '88888888-8888-8888-8888-888888880001',
    Operation: 'C',
    Data: {
      ...baseEntity('88888888-8888-8888-8888-888888880001'),
      ObjID: 1,
      ObjDescription: 'Arañita Roja',
      ObjType: 1,
    },
  },
  {
    Resource: 'OagObjectiveCultive',
    SyncId: '88888888-8888-8888-8888-888888880002',
    Operation: 'C',
    Data: {
      ...baseEntity('88888888-8888-8888-8888-888888880002'),
      OjcID: 1,
      ObjID: 1,
      CltID: 1,
    },
  },
  {
    Resource: 'OagFarmSuppliesTarget',
    SyncId: '99999999-9999-9999-9999-999999990001',
    Operation: 'C',
    Data: {
      ...baseEntity('99999999-9999-9999-9999-999999990001'),
      FstID: 1,
      FrsID: 1,
      CltID: 1,
      ObjID: 1,
      FstMinDose: 0.5,
      FstMaxDose: 1.0,
      FstApplicationFrequency: null,
      FstPpplCode: null,
      FstGracePeriodDays: null,
    },
  },
];

test.describe('Visitas Técnicas - Modal de Aplicaciones e Insumos', () => {
  test('debe permitir seleccionar modalidad y auto-seleccionar objetivo al elegir insumo', async ({ page }) => {
    page.on('console', (msg) => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', (err) => console.log(`[BROWSER ERROR] ${err.message}`));

    const user = {
      UsrID: 1,
      UsrName: 'admin',
      UsrEmail: 'admin@nova.com',
      FullName: 'Santos Vilchez, Edinson Pascual',
      PrsID: 1,
    };

    const session = {
      AccessTokenExpiration: new Date(Date.now() + 86400000).toISOString(),
      SsnID: 1,
      User: user,
    };

    // Interceptar llamadas de API para entorno hermético y reproducible
    await page.route(/.*\/Token\/CsrfToken.*/i, (route) =>
      route.fulfill({ json: { Succeeded: true, Message: '', Data: 'test-csrf-token' } })
    );
    await page.route(/.*\/Token\/Refresh.*/i, (route) =>
      route.fulfill({ json: { Succeeded: true, Message: '', Data: session } })
    );
    await page.route(/.*\/SecUser\/MyOptions.*/i, (route) =>
      route.fulfill({ json: { Succeeded: true, Message: '', Data: [] } })
    );
    await page.route(/.*\/sync\/pull.*/i, (route) =>
      route.fulfill({
        json: {
          Succeeded: true,
          Message: '',
          Data: {
            Cursor: 1,
            HasMore: false,
            IsBootstrap: false,
            Changes: mockSyncChanges,
          },
        },
      })
    );
    await page.route(/.*\/sync\/push.*/i, (route) =>
      route.fulfill({
        json: {
          Succeeded: true,
          Message: '',
          Data: {
            Results: [],
            Conflicts: [],
          },
        },
      })
    );

    // 1. Inicializar sesión en /login
    await page.goto('/login');
    await page.evaluate(({ session }) => {
      localStorage.setItem('nova.auth.session', JSON.stringify(session));
      localStorage.setItem(
        'nova.sync.connection',
        JSON.stringify({ BaseUrl: 'http://localhost:9090' })
      );
    }, { session });

    // 2. Navegar a visitas técnicas
    await page.goto('/technical-visits');
    await page.waitForLoadState('networkidle');

    // 3. Ejecutar sincronización para hidratar WatermelonDB
    const syncButton = page.getByRole('button', { name: /Sincronizar ahora|Sincronizar/i }).first();
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(1500);
    }

    // 4. Navegar al detalle de la visita técnica mockeada
    await page.goto('/technical-visit-detail?id=ca016e20-7eb5-47cd-a73a-ee924062e6b9');
    await page.waitForLoadState('networkidle');

    // Si aún aparece "Sincronizar ahora", pulsar para asegurar sync local
    const syncNow = page.getByRole('button', { name: /Sincronizar ahora/i }).first();
    if (await syncNow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await syncNow.click();
      await page.waitForTimeout(1500);
    }

    // 5. Verificar que NSelect en cabecera (Supervisor) esté alineado a la izquierda y en 1 sola línea (36px)
    const addAppButton = page.getByRole('button', { name: /Agregar aplicación/i }).first();
    await expect(addAppButton).toBeVisible({ timeout: 15000 });

    const supervisorTrigger = page.getByRole('button', { name: 'Supervisor' });
    await expect(supervisorTrigger).toBeVisible();
    const supervisorStyles = await supervisorTrigger.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return { height: Math.round(rect.height), textAlign: cs.textAlign, whiteSpace: cs.whiteSpace };
    });
    expect(supervisorStyles.height).toBe(36);
    expect(supervisorStyles.textAlign).toBe('left');
    expect(supervisorStyles.whiteSpace).toBe('nowrap');

    // Abrir modal de Agregar Aplicación
    await addAppButton.click();

    // 6. Verificar que el modal de Nueva Aplicación está visible
    await expect(page.getByText('Nueva aplicación')).toBeVisible();

    // 7. Modalidad de aplicación: debe abrirse sobre el modal (zIndex 999999) y estar alineado a la izquierda
    const modeTrigger = page.getByRole('button', { name: /Modalidad de aplicación/i });
    await expect(modeTrigger).toBeVisible();
    await modeTrigger.click();

    const modeOption = page.getByRole('option', { name: /Focalizada|General/i }).first();
    await expect(modeOption).toBeVisible({ timeout: 5000 });

    const popperZIndex = await page.evaluate(() => {
      const popper = document.querySelector('[data-radix-popper-content-wrapper]');
      return popper ? window.getComputedStyle(popper).zIndex : null;
    });
    expect(popperZIndex).toBe('999999');

    await modeOption.click();

    // 8. Abrir subformulario de nuevo producto aplicado
    const addDetailButton = page.getByRole('button', { name: /Agregar detalle/i });
    await expect(addDetailButton).toBeVisible();
    await addDetailButton.click();

    await expect(page.getByText(/Nuevo producto aplicado/i)).toBeVisible();

    // 9. Seleccionar un insumo
    const supplyTrigger = page.getByRole('button', { name: 'Insumo' }).or(page.getByText('Selecciona un insumo'));
    await expect(supplyTrigger.first()).toBeVisible();
    await supplyTrigger.first().click();

    // Seleccionar 'Bioinsecticida de neem para manejo integrado'
    const supplyOption = page.locator('[role="dialog"]').getByText(/Bioinsecticida/i).first();
    await expect(supplyOption).toBeVisible({ timeout: 5000 });
    await supplyOption.click();

    // 10. VERIFICACIÓN CLAVE: El objetivo 'Arañita Roja' debe auto-seleccionarse automáticamente en el Select de Reusables
    const targetTrigger = page.getByRole('button', { name: /Cultivo \/ objetivo/i });
    await expect(targetTrigger).toBeVisible();
    await expect(targetTrigger).toContainText(/Arañita Roja/i, { timeout: 5000 });

    // 11. Completar Tipo de aplicación, Dosis y Cantidad
    const appTypeTrigger = page.getByRole('button', { name: /Tipo de aplicación/i });
    if (await appTypeTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await appTypeTrigger.click();
      const appTypeOption = page.getByRole('option', { name: /Foliar/i }).first();
      if (await appTypeOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await appTypeOption.click();
      }
    }

    // Llenar dosis y cantidad
    const doseInput = page.getByPlaceholder('Dosis');
    await expect(doseInput).toBeVisible();
    await doseInput.fill('0.75');

    const qtyInput = page.getByPlaceholder('Cantidad');
    await expect(qtyInput).toBeVisible();
    await qtyInput.fill('15');

    // 12. Guardar el detalle de producto en la aplicación
    const saveDetailBtn = page.getByRole('button', { name: /Agregar a la aplicación|Guardar producto/i });
    await expect(saveDetailBtn).toBeVisible();
    await saveDetailBtn.click();

    // 13. Verificar que el detalle aparece en la lista de insumos agregados del modal
    await expect(page.getByText(/0.75/)).toBeVisible();
    await expect(page.getByText(/15/)).toBeVisible();

    // 14. Observación general con NTextarea multilínea
    const generalObs = page.getByPlaceholder(/Observaciones de la aplicación en campo/i);
    await expect(generalObs).toBeVisible();
    await generalObs.fill('Aplicación realizada en horas tempranas.\nCondiciones climáticas favorables.');

    // 15. Guardar la aplicación completa
    const saveAppBtn = page.getByRole('button', { name: /Guardar aplicación/i });
    await expect(saveAppBtn).toBeVisible();
    await saveAppBtn.click();

    // El modal debe cerrarse satisfactoriamente
    await expect(page.getByText('Nueva aplicación')).not.toBeVisible({ timeout: 5000 });
  });
});
