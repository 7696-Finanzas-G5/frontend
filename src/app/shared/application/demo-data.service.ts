/** Puerto para restablecer los datos de demostración. */
export abstract class DemoDataService {
  abstract reset(): Promise<void>;
}
