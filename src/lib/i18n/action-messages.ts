export type ActionMessageValues = Record<string, number | string>;

export type ActionMessage = {
  key: string;
  values?: ActionMessageValues;
};

type TranslateFunction = (key: string, values?: ActionMessageValues) => string;

export function createActionMessage(
  key: string,
  values?: ActionMessageValues,
): ActionMessage {
  return values ? { key, values } : { key };
}

export function translateActionMessage(
  t: TranslateFunction,
  message: ActionMessage | null,
): string | null {
  if (!message) {
    return null;
  }

  return t(message.key, message.values);
}
