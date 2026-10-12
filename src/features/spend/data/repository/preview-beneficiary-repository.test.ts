import { BLANK_RECIPIENT_FIELDS } from '../../domain/entity/beneficiary';
import type { Beneficiary } from '../../domain/entity/beneficiary';
import { createPreviewBeneficiaryRepository } from './preview-beneficiary-repository';

const nameOf = (beneficiary: Beneficiary) =>
  beneficiary.kind === 'bank'
    ? beneficiary.name
    : beneficiary.kind === 'wallet'
      ? beneficiary.tag
      : beneficiary.merchantName;

async function listed(repository = createPreviewBeneficiaryRepository()) {
  const result = await repository.list();

  return result.ok ? result.value : [];
}

describe('the preview beneficiaries', () => {
  it('answers the recently paid in the order the home row shows them', async () => {
    const result = await createPreviewBeneficiaryRepository().getRecent();

    expect((result.ok ? result.value : []).map(nameOf)).toEqual([
      'Lena Fischer',
      'Jasper Nwosu',
      'Nina Alvarez',
      'Ethan Brooks',
      'Maya Chen',
      'Fulano de Tal',
    ]);
  });

  it('holds a saved merchant, kept as its code', async () => {
    const merchant = (await listed()).find((beneficiary) => beneficiary.kind === 'merchant');

    expect(merchant).toMatchObject({ merchantName: 'Fulano de Tal', currency: 'BRL' });
  });

  it('lists the people and the wallets the designs draw', async () => {
    const all = await listed();

    expect(all.map(nameOf)).toEqual(
      expect.arrayContaining([
        'Precious Jameson',
        'Hannah Nuggest',
        'Main wallet',
        'Business wallet',
        'Second wallet',
        "Tunde's wallet",
      ]),
    );
  });

  it('holds a payee on every corridor that can be saved', async () => {
    const corridors = (await listed()).flatMap((beneficiary) =>
      beneficiary.kind === 'bank' && beneficiary.corridor !== undefined
        ? [`${beneficiary.corridor.currency}:${beneficiary.corridor.method}`]
        : [],
    );

    expect(new Set(corridors)).toEqual(
      new Set([
        'NGN:bank_transfer',
        'KES:mobile_money',
        'XOF:mobile_money',
        'USD:zelle',
        'USD:swift',
      ]),
    );
  });

  it('keeps a saved beneficiary for the rest of the session', async () => {
    const repository = createPreviewBeneficiaryRepository();

    await repository.create({
      ...BLANK_RECIPIENT_FIELDS,
      bankCountry: 'ng',
      bankName: 'Zenith Bank',
      bankCode: '057',
      accountHolder: 'Tunde Bakare',
      accountNumber: '0987654321',
    });

    expect((await listed(repository)).map(nameOf)).toContain('Tunde Bakare');
  });

  it('forgets a removed beneficiary, in the list and among the recently paid', async () => {
    const repository = createPreviewBeneficiaryRepository();
    const [first] = await listed(repository);
    if (first === undefined) throw new Error('the preview list is empty');

    expect((await repository.remove(first.id)).ok).toBe(true);

    expect((await listed(repository)).map((beneficiary) => beneficiary.id)).not.toContain(first.id);
    const recent = await repository.getRecent();
    expect((recent.ok ? recent.value : []).map((beneficiary) => beneficiary.id)).not.toContain(
      first.id,
    );
  });

  it('refuses to remove someone it does not hold', async () => {
    expect((await createPreviewBeneficiaryRepository().remove('nobody')).ok).toBe(false);
  });

  it('reads one beneficiary, and fails for an id it does not hold', async () => {
    const repository = createPreviewBeneficiaryRepository();
    const [first] = await listed(repository);

    expect((await repository.get(first?.id ?? '')).ok).toBe(true);
    expect((await repository.get('nobody')).ok).toBe(false);
  });

  it('keeps each repository’s list to itself', async () => {
    const changed = createPreviewBeneficiaryRepository();
    const [first] = await listed(changed);
    await changed.remove(first?.id ?? '');

    expect(await listed()).toHaveLength((await listed(changed)).length + 1);
  });
});
