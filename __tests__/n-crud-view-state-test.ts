import {
  createNCrudViewStorageKey,
  parseNCrudViewState,
} from '@/components/crud/n-crud-view-state';

describe('NCrud persisted view state', () => {
  it('namespaces persisted state by CRUD key', () => {
    expect(createNCrudViewStorageKey('definitions')).toBe(
      'nova_app_ncrud_view_definitions',
    );
  });

  it('accepts a complete persisted request', () => {
    const state = {
      request: {
        Page: 2,
        PageSize: 25,
        SearchText: 'uva',
        ColumnSearch: { name: 'red' },
        OrderBy: 'name',
        SortOrder: 'asc',
        Filter: { active: true },
      },
      columnVisibility: { code: false },
    };

    expect(parseNCrudViewState(JSON.stringify(state))).toEqual(state);
  });

  it('rejects malformed or unsafe persisted state', () => {
    expect(parseNCrudViewState('{broken')).toBeNull();
    expect(parseNCrudViewState(JSON.stringify({ request: { Page: 0 } }))).toBe(
      null,
    );
  });
});
