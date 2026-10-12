export interface LastTransferCurrencyRepository {
  read(): string | undefined;
  remember(currency: string): void;
}
