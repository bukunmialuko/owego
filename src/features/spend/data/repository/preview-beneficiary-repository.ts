import { unknownError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { Beneficiary, RecipientRecord } from '../../domain/entity/beneficiary';
import type { BeneficiaryRepository } from '../../domain/repository/beneficiary-repository';
import { toMerchantBeneficiary } from '../../domain/beneficiary/merchant-beneficiary';
import { toBeneficiary } from '../../domain/beneficiary/to-beneficiary';
import { recipientRecord } from '../../domain/corridor/recipient-record';

const STAMP = '2026-09-01T09:00:00Z';

function saved(id: string, fields: Parameters<typeof recipientRecord>[0]): RecipientRecord {
  return { id, fields: recipientRecord(fields), createdAt: STAMP, updatedAt: STAMP };
}

const RECENT: readonly RecipientRecord[] = [
  saved('p1', {
    bankCountry: 'de',
    bankName: 'Deutsche Bank',
    accountHolder: 'Lena Fischer',
    swiftNumber: 'DEUTDEFF',
    accountNumber: 'DE89370400440532011028',
    paymentMethod: 'SWIFT',
    contact: { country: 'de', city: 'Frankfurt', address: 'Taunusanlage 12', zipCode: '60325' },
  }),
  saved('p2', {
    bankCountry: 'ng',
    bankName: 'Guaranty Trust Bank',
    bankCode: '058',
    accountHolder: 'Jasper Nwosu',
    accountNumber: '0152847803',
  }),
  saved('p3', {
    bankName: 'BASE',
    accountHolder: 'Nina Alvarez',
    accountNumber: '0xb249000000000000000000000000000000003901',
  }),
  saved('p4', {
    bankCountry: 'us',
    bankName: 'Zelle',
    bankCode: 'zelle_individual',
    accountHolder: 'Ethan Brooks',
    accountNumber: 'ethan.brooks@mail.com',
  }),
  saved('p5', {
    bankCountry: 'ke',
    bankName: 'M-Pesa',
    accountHolder: 'Maya Chen',
    accountNumber: '+254712344417',
  }),
];

const SAVED_MERCHANT = toMerchantBeneficiary({
  id: 'm1',
  qrString:
    '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D',
  createdAt: STAMP,
  updatedAt: STAMP,
});

const SAVED: readonly RecipientRecord[] = [
  saved('b1', {
    bankCountry: 'us',
    bankName: 'Zelle',
    bankCode: 'zelle_business',
    accountHolder: 'Precious Jameson',
    accountNumber: 'precious.james@mail.com',
  }),
  saved('b2', {
    bankCountry: 'ph',
    bankName: 'BDO Unibank',
    accountHolder: 'Precious Jameson',
    accountNumber: '004870011028',
  }),
  saved('b3', {
    bankCountry: 'gb',
    bankName: 'Citi bank',
    accountHolder: 'Hannah Nuggest',
    swiftNumber: 'CITIGB2L',
    accountNumber: '031234567890',
    paymentMethod: 'SWIFT',
    contact: {
      country: 'gb',
      state: 'Greater London',
      city: 'London',
      address: '33 Canada Square',
      zipCode: 'E14 5LB',
    },
  }),
  saved('b4', {
    bankCountry: 'ci',
    bankName: 'Wave',
    accountHolder: 'Awa Diallo',
    accountNumber: '+2250712345678',
  }),
  saved('w1', {
    bankName: 'SOL',
    accountHolder: 'Main wallet',
    accountNumber: 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3',
  }),
  saved('w2', {
    bankName: 'BASE',
    accountHolder: 'Business wallet',
    accountNumber: '0xb249111111111111111111111111111111113901',
  }),
  saved('w3', {
    bankName: 'MONAD',
    accountHolder: 'Second wallet',
    accountNumber: '0x7c1e222222222222222222222222222222227d10',
  }),
  saved('w4', {
    bankName: 'ARC',
    accountHolder: "Tunde's wallet",
    accountNumber: '0x3f8a33333333333333333333333333333333a6f5',
  }),
];

export function createPreviewBeneficiaryRepository(): BeneficiaryRepository {
  let beneficiaries: Beneficiary[] = [
    ...RECENT.map(toBeneficiary),
    SAVED_MERCHANT,
    ...SAVED.map(toBeneficiary),
  ];
  const recentIds = [...RECENT.map((record) => record.id), SAVED_MERCHANT.id];
  let created = 0;

  return {
    list: () => Promise.resolve(ok(beneficiaries)),

    getRecent: () =>
      Promise.resolve(
        ok(
          recentIds.flatMap((id) => {
            const beneficiary = beneficiaries.find((candidate) => candidate.id === id);

            return beneficiary === undefined ? [] : [beneficiary];
          }),
        ),
      ),

    get: (id) => {
      const beneficiary = beneficiaries.find((candidate) => candidate.id === id);

      return Promise.resolve(
        beneficiary === undefined
          ? err({ ...unknownError('No such preview beneficiary.'), httpStatus: 404 })
          : ok(beneficiary),
      );
    },

    create: (fields) => {
      created += 1;
      const now = new Date().toISOString();
      beneficiaries = [
        toBeneficiary({ id: `preview-${String(created)}`, fields, createdAt: now, updatedAt: now }),
        ...beneficiaries,
      ];

      return Promise.resolve(ok(undefined));
    },

    remove: (id) => {
      if (!beneficiaries.some((beneficiary) => beneficiary.id === id)) {
        return Promise.resolve(
          err({ ...unknownError('No such preview beneficiary.'), httpStatus: 404 }),
        );
      }

      beneficiaries = beneficiaries.filter((beneficiary) => beneficiary.id !== id);

      return Promise.resolve(ok(undefined));
    },
  };
}
