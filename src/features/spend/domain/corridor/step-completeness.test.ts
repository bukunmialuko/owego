import type { FieldDescriptor } from '../entity/beneficiary-form';
import { isFieldFilled, isStepComplete } from './step-completeness';

const name: FieldDescriptor = {
  name: 'name',
  labelKey: 'common.name',
  kind: 'text',
  required: true,
};

const state: FieldDescriptor = {
  name: 'state',
  labelKey: 'spend.state',
  kind: 'text',
  required: false,
};

const accountNumber: FieldDescriptor = {
  name: 'accountNumber',
  labelKey: 'common.accountNumber',
  kind: 'text',
  required: true,
  pattern: { regex: '^\\d{10}$', messageKey: 'spend.accountNumberLength' },
};

const accountName: FieldDescriptor = {
  name: 'accountName',
  labelKey: 'common.accountName',
  kind: 'text',
  required: true,
  derived: true,
};

describe('isStepComplete', () => {
  it('is complete once every required field holds something', () => {
    expect(isStepComplete([name, state], { name: 'Hannah' })).toBe(true);
  });

  it('is incomplete while a required field is empty', () => {
    expect(isStepComplete([name], {})).toBe(false);
  });

  it('does not count whitespace as an answer', () => {
    expect(isStepComplete([name], { name: '   ' })).toBe(false);
  });

  it('waits for a pattern to be satisfied', () => {
    expect(isStepComplete([accountNumber], { accountNumber: '01234' })).toBe(false);
    expect(isStepComplete([accountNumber], { accountNumber: '0123456789' })).toBe(true);
  });

  it('holds an optional field to its pattern once something is typed', () => {
    const postal: FieldDescriptor = {
      ...state,
      pattern: { regex: '^\\d+$', messageKey: 'spend.postalCode' },
    };

    expect(isStepComplete([postal], { state: 'abc' })).toBe(false);
    expect(isStepComplete([postal], {})).toBe(true);
  });

  it('never waits on a field the server resolves', () => {
    expect(isStepComplete([accountName], {})).toBe(true);
  });
});

describe('isFieldFilled', () => {
  it('is filled when the value is present and matches its pattern', () => {
    expect(isFieldFilled(accountNumber, '0123456789')).toBe(true);
  });

  it('is not filled by a value the pattern rejects', () => {
    expect(isFieldFilled(accountNumber, '012345')).toBe(false);
  });

  it('is not filled while empty, even when optional', () => {
    expect(isFieldFilled(state, '')).toBe(false);
  });
});
