export type ConsentReader = () => boolean | Promise<boolean>;

export type ConsentState = {
  required: boolean;
  granted: boolean;
};

export function createConsentReader(required: boolean, reader?: ConsentReader): ConsentReader {
  if (!required) return () => true;
  return reader ?? (() => false);
}
