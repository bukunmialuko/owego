import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { ok } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { createPreviewInsuranceRepository } from '../data/repository/preview-travel-repository';
import type { InsuranceRepository } from '../domain/repository/insurance-repository';
import { PoliciesScreen } from './policies-screen';

jest.useFakeTimers();

function renderPolicies(insuranceRepository?: InsuranceRepository) {
  return renderWithProviders(<PoliciesScreen />, {
    withNavigation: true,
    container: createTestContainer(
      insuranceRepository === undefined
        ? {}
        : { insuranceRepository: asValue(insuranceRepository) },
    ),
  });
}

describe('PoliciesScreen', () => {
  it('reads as a tab list rather than two buttons', async () => {
    await renderPolicies();

    expect(await screen.findByRole('tab', { name: 'Covers' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'My eSIM' })).not.toBeSelected();
  });

  it('says so when no cover has been bought', async () => {
    await renderPolicies();

    expect(await screen.findByLabelText('No policies yet')).toBeTruthy();
  });

  it('lists a cover once one exists', async () => {
    const repository = createPreviewInsuranceRepository();
    await repository.buyPolicy(
      {
        destinationCode: 'ke',
        destinationName: 'Kenya',
        departure: '2026-08-14',
        returnDate: '2026-08-21',
        travellers: 1,
        tripCostMinor: 80_000,
        currency: 'USD',
      },
      'deluxe',
    );

    await renderPolicies(repository);

    expect(await screen.findByText(/Kenya/)).toBeTruthy();
    expect(screen.getByText(/POL-WGXJUJ/)).toBeTruthy();
  });

  it('shows an installed eSIM and how much data is left', async () => {
    const user = userEvent.setup();
    await renderPolicies();

    await user.press(await screen.findByRole('tab', { name: 'My eSIM' }));

    expect(await screen.findByText('USA')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: '10% used' })).toHaveAccessibilityValue({
      min: 0,
      max: 100,
      now: 10,
    });
  });

  it('says so when no eSIM has been bought', async () => {
    const user = userEvent.setup();
    const empty: InsuranceRepository = {
      ...createPreviewInsuranceRepository(),
      getPolicies: () => Promise.resolve(ok([])),
    };
    await renderWithProviders(<PoliciesScreen />, {
      withNavigation: true,
      container: createTestContainer({
        insuranceRepository: asValue(empty),
        esimRepository: asValue({
          getDestinations: () => Promise.resolve(ok([])),
          getPlans: () => Promise.resolve(ok([])),
          getInstalled: () => Promise.resolve(ok([])),
          purchase: () => Promise.resolve(ok({} as never)),
          install: () => Promise.resolve(ok({} as never)),
        }),
      }),
    });

    await user.press(await screen.findByRole('tab', { name: 'My eSIM' }));

    expect(await screen.findByLabelText('No eSIMs yet')).toBeTruthy();
  });
});
